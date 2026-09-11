/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
import './lib/seeded'

/**
 * 种子真的钉住了人生吗。
 *
 * 跑法：bun scripts/replay.ts
 *
 * ## 为什么要有这一支
 *
 * 四十八支门禁跑的是随机人生。全套偶尔一支红、单跑又绿，从前只能记一句「既有闪红」——
 * 状态空间越大这种红越多，查不到的红会训练人无视门禁。所以每一支门禁第一行装种子
 * （`lib/seeded`），红了把种子抄回去就能复现。
 *
 * 可「装了种子」和「种子钉住了人生」是两件事。中间会漏的地方：
 * 分片 worker 各有各的随机源（`lib/parallel.ts` 派生的那颗没传到位）、
 * 哪个模块在加载期掷了骰子而加载先于装种子、哪里悄悄读了挂钟。
 * 这一支不看代码，看结果：**同一颗种子，两回输出逐字节一样。**
 *
 * ## 尺子自检
 *
 * 「两回一样」单独成立不了——种子压根没装上，两回也可能一样（比如那支门禁根本不掷骰子）。
 * 所以每一对旁边都放一组异种子：**换一颗种子，输出得变**。变不了，说明这把尺子量的不是种子。
 */
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { currentSeed, deriveSeed } from './lib/seed'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

/** 不分片的一支和分片的一支各验一对。挑快的：这一支自己不该比被它验的慢 */
const PAIRS: readonly { name: string; shards: string }[] = [
  { name: 'kept', shards: '1' },
  { name: 'seen', shards: '3' },
]

/** 不装种子的两支：运行器自己，和被别的支取用的库 */
const UNSEEDED = new Set(['gates', 'refs'])

/** `src` 里允许读挂钟的地方：`createId` 的降级路径，没有 `crypto.randomUUID` 时才走到 */
const CLOCK_ALLOWED = new Set(['src/engine/id.ts'])

/**
 * 跑一支子门禁。
 *
 * ## 这里是 `spawn` 不是 `spawnSync`，为的是六次能并发
 *
 * 这一支要跑六次子门禁（两对 × 三回：同种子两回加异种子一回）。从前用
 * `spawnSync` 一次一次等，六次串行——而 `seen` 一支就要六秒多，
 * 光它三回就是十九秒，这一支自己实测三十四秒。
 *
 * 六次之间**没有任何依赖**：各自独立进程、各自的种子、各自的输出，
 * 比对是全部跑完之后的事。所以改成一起放出去、`Promise.all` 收。
 *
 * 注意这跟被它验的那件事无关：它验的是「同一颗种子两回输出一样」，
 * 而两回本来就是两个互不相干的进程——**并发不会让它们互相影响**，
 * 各自的随机流由各自的 `SEED` 钉着。真要是并发之后就不一样了，
 * 那正是这一支该报的红。
 */
function run(name: string, seed: string, shards: string): Promise<{ out: string; code: number }> {
  return new Promise((fulfil) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts', `${name}.ts`)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', SEED: seed, GATE_SHARDS: shards },
    })
    let out = ''
    child.stdout.on('data', (chunk: Buffer) => (out += chunk))
    /*
     * stderr 也要收。从前 `spawnSync` 只取 `stdout`，stderr 直接落到终端上；
     * 改成 `spawn` 之后若把它设成 `ignore`，**子门禁崩了就一个字也看不见**——
     * 而「同种子两回不一样」正可能是崩溃造成的（比如一回崩在半路）。
     * 收进同一个字符串，比对时它就是输出的一部分：崩了两回崩得一样也算一样，
     * 崩得不一样这一条就该红。
     */
    child.stderr.on('data', (chunk: Buffer) => (out += chunk))
    child.on('close', (code) => fulfil({ out, code: code ?? 1 }))
  })
}

let failed = 0
const mine = currentSeed() ?? 'replay'

console.log('\n=== 一、同一颗种子，两回逐字节一样；换一颗，输出得变 ===\n')
// 六次一起放出去。两对之间、三回之间都没有依赖，等它们各自跑完再比
const rounds = await Promise.all(
  PAIRS.map(async (pair) => {
    const seedA = deriveSeed(mine, pair.name, 'a')
    const seedB = deriveSeed(mine, pair.name, 'b')
    const [first, second, other] = await Promise.all([
      run(pair.name, seedA, pair.shards),
      run(pair.name, seedA, pair.shards),
      run(pair.name, seedB, pair.shards),
    ])
    return { pair, first, second, other }
  }),
)

/**
 * 门禁那一行印的东西里，有几样每一回都不同，而这一支比的是整份输出逐字节一样。
 *
 *     ◆ keeping　种子 ccvo9yrxlhbq　pid 1132　17:11:11　run 1711-ccvo
 *       ↑ 哪一支   ↑ 种子            ↑ 每回变  ↑ 每回变  ↑ 每回变
 *
 * 加 pid 那一笔（`2a37e3f`）查过「没有判据在解析这一行」（grep `startsWith('种子')` 全空），
 * 漏了这一支：它不解析那一行，它比整份——**一个不读那一行内容、只比两回输出是否相等的判据，
 * 任何 grep 都找不到它**。标准「有没有人读这一行」本身画窄了，replay 在它射程外（e2 的话）。
 *
 * ⚠️ 而这条正则**第二次被同一件事打红**（`917d425` 往行首加了 `◆ <门禁名>`、行尾加了 `run`）。
 * 头一版锚在 `^(种子 ...)...$`，两头一变就一个字符也抹不掉，同种子两回从第 1 行起分岔。
 * 所以现在不锚整行，只把「每回都变的那几样」摘掉，行首行尾将来再加什么都不影响：
 * pid、时刻、run 各自独立替换。**改了那一行的格式，就要跑一次这一支**——
 * 它是唯一会被格式变动打红的判据，而它不会在任何 grep 里出现。
 *
 * 只抹这三样：门禁名和种子留着（它们变了照样该红，那正是这一支要抓的）；
 * 别处印了 pid 或挂钟也照样该红。不改成印到 stderr：这一支有意把 stderr 也收进来比
 * （崩溃也要两回一样），印到 stderr 一样得抹。
 * 验收两头：抹掉之后同种子两回相同；异种子仍不同（别把「变」也抹没了）。
 */
const withoutRunMarks = (out: string): string =>
  out
    .replace(/　pid \d+/g, '')
    .replace(/　\d\d:\d\d:\d\d/g, '')
    .replace(/　run [0-9a-z-]+/g, '')

for (const { pair, first, second, other } of rounds) {
  const firstOut = withoutRunMarks(first.out)
  const secondOut = withoutRunMarks(second.out)
  const otherOut = withoutRunMarks(other.out)
  const label = `${pair.name}（${pair.shards === '1' ? '不分片' : `${pair.shards} 片`}，${firstOut.split('\n').length} 行）`
  if (firstOut !== secondOut) {
    const a = firstOut.split('\n')
    const b = secondOut.split('\n')
    const at = a.findIndex((line, i) => line !== b[i])
    console.log(`  ✗ ${label}：同种子两回不一样，第 ${at + 1} 行起分岔：`)
    console.log(`      甲：${a[at] ?? '（无）'}`)
    console.log(`      乙：${b[at] ?? '（无）'}`)
    failed += 1
  } else if (firstOut === otherOut) {
    console.log(`  ✗ ${label}：换了种子输出没变——这把尺子量的不是种子。`)
    failed += 1
  } else if (first.code !== second.code) {
    console.log(`  ✗ ${label}：同种子两回退出码不同（${first.code} / ${second.code}）。`)
    failed += 1
  } else {
    console.log(`  ✓ ${label}：同种子逐字节一样，异种子不同。`)
  }
}

console.log('\n=== 二、每一支门禁第一件事是装种子 ===\n')
{
  const gates = readdirSync(join(ROOT, 'scripts'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.slice(0, -3))
    .filter((name) => !UNSEEDED.has(name))
  const unseeded: string[] = []
  for (const name of gates) {
    const text = readFileSync(join(ROOT, 'scripts', `${name}.ts`), 'utf8')
    const first = text.split(/\r?\n/).find((line) => line.startsWith('import '))
    if (first !== "import './lib/seeded'") unseeded.push(name)
  }
  if (unseeded.length > 0) {
    console.log(`  ✗ ${unseeded.length} 支第一个 import 不是 ./lib/seeded：${unseeded.join('、')}`)
    console.log('    种子装晚了，装之前掷的骰子就不在种子之下。')
    failed += 1
  } else console.log(`  ✓ ${gates.length} 支门禁，第一个 import 都是 ./lib/seeded。`)
}

console.log('\n=== 三、正文和引擎里没有挂钟 ===\n')
{
  const clocks: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.(ts|vue)$/.test(entry.name) && !CLOCK_ALLOWED.has(rel)) {
        const text = readFileSync(join(ROOT, rel), 'utf8')
        for (const [i, line] of text.split(/\r?\n/).entries()) {
          if (/^\s*(\/\/|\*)/.test(line)) continue
          if (/\b(Date\.now|performance\.now)\s*\(|new Date\s*\(/.test(line))
            clocks.push(`${rel}:${i + 1}`)
        }
      }
    }
  }
  walk('src')
  if (clocks.length > 0) {
    console.log(`  ✗ ${clocks.length} 处读了挂钟——种子钉不住它：${clocks.join('、')}`)
    failed += 1
  } else
    console.log('  ✓ src 里没有 Date.now / new Date / performance.now（id.ts 的降级路径除外）。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  同一颗种子，同一段人生。红了把种子抄回去，修完拿同一颗种子重跑。\n')
}
