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
import { spawnSync } from 'node:child_process'
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

function run(name: string, seed: string, shards: string): { out: string; code: number } {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', `${name}.ts`)], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', SEED: seed, GATE_SHARDS: shards },
    maxBuffer: 64 * 1024 * 1024,
  })
  return { out: result.stdout ?? '', code: result.status ?? 1 }
}

let failed = 0
const mine = currentSeed() ?? 'replay'

console.log('\n=== 一、同一颗种子，两回逐字节一样；换一颗，输出得变 ===\n')
for (const pair of PAIRS) {
  const seedA = deriveSeed(mine, pair.name, 'a')
  const seedB = deriveSeed(mine, pair.name, 'b')
  const first = run(pair.name, seedA, pair.shards)
  const second = run(pair.name, seedA, pair.shards)
  const other = run(pair.name, seedB, pair.shards)
  const label = `${pair.name}（${pair.shards === '1' ? '不分片' : `${pair.shards} 片`}，${first.out.split('\n').length} 行）`
  if (first.out !== second.out) {
    const a = first.out.split('\n')
    const b = second.out.split('\n')
    const at = a.findIndex((line, i) => line !== b[i])
    console.log(`  ✗ ${label}：同种子两回不一样，第 ${at + 1} 行起分岔：`)
    console.log(`      甲：${a[at] ?? '（无）'}`)
    console.log(`      乙：${b[at] ?? '（无）'}`)
    failed += 1
  } else if (first.out === other.out) {
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
          if (/\b(Date\.now|performance\.now)\s*\(|new Date\s*\(/.test(line)) clocks.push(`${rel}:${i + 1}`)
        }
      }
    }
  }
  walk('src')
  if (clocks.length > 0) {
    console.log(`  ✗ ${clocks.length} 处读了挂钟——种子钉不住它：${clocks.join('、')}`)
    failed += 1
  } else console.log('  ✓ src 里没有 Date.now / new Date / performance.now（id.ts 的降级路径除外）。')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  同一颗种子，同一段人生。红了把种子抄回去，修完拿同一颗种子重跑。\n')
}
