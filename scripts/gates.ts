/* eslint-disable no-console -- 这是一支运行器，标准输出就是它的产物；它不进构建 */
/**
 * 一条命令跑完全部门禁。
 *
 * 跑法：
 *   bun scripts/gates.ts                # 全部
 *   bun scripts/gates.ts leaving seen   # 只跑指定几支
 *   GATE_JOBS=4 bun scripts/gates.ts    # 手动定并发数
 *
 * 不必为了机器卡顿去调小 `GATE_JOBS`：门禁进程一律跑在低优先级上
 * （见 `runGate`），空闲算力吃满，你一动手它立刻让路。
 * 调小它只在一种时候有用——你要把核留给另一件正经算力活。
 *
 * ## 它替掉的是「分九批、一批一批等」
 *
 * 从前是九条命令顺着敲，每批五支、支支串行，跑法是 `npx vite-node`。
 * 四十支实测合计 67.6 分钟，而那还只是纯计算——中间等人看一眼
 * 再敲下一条的时间不算在内。
 *
 * 慢法是**极度偏斜**的：前五支（seeking、wishes、portrait、probe、leaving）
 * 占掉六成一，末尾二十七支每支不到十五秒。串行跑，那二十七支在干等着；
 * 摊开跑，它们躲在长的那几支背后就跑完了。
 *
 * 三件事一起做：
 *
 *   1. **换 Bun**。vite-node 每支要先拉起一台 Vite server（约三秒），
 *      而且它按自己那套条件解析，**给多少 NODE_ENV 都还是开发版**。
 *      Bun 直接跑 `.ts`，启动只要几百毫秒。实测 `attention` 一支：
 *      vite-node 63.7 秒 → 原生 Node 46.5 秒 → Bun 18.6 秒。
 *   2. **进程池**。每支脚本是一个独立进程，互不相干，天然可以同时跑。
 *   3. **长的先跑**。上一次的耗时记在 `node_modules/.tmp/` 下，
 *      这一次按它从长到短排。最长的那支决定整批的下限，
 *      让它第一个上路，后面的短支才填得满空隙。
 *      没有记录时按给定顺序跑——头一次会慢一点，跑完就有数了。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { constants, cpus, setPriority } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const TIMES = join(ROOT, 'node_modules', '.tmp', 'gate-times.json')

/**
 * 要跑的那四十支。
 *
 * 这张名单是照着从前那九批一字不差抄下来的，好让改造前后跑的是同一批东西。
 * `scripts/` 下还有 refs、simulate、verify、note、savefile 五支不在此列——
 * 它们本来就不在那九批里。**要不要一起跑是另一个问题**，
 * 这里只负责把原来那批跑得快一点，不顺手改变跑的范围。
 */
const GATES = [
  'address',
  'apart',
  'attention',
  'book',
  'circumstance',
  'day',
  'diary',
  'errand',
  'founding',
  'grasp',
  'household',
  'inquire',
  'kept',
  'leanings',
  'leaving',
  'lifelong',
  'living',
  'mastery',
  'meeting',
  'merchant',
  'observe',
  'origin',
  'origins',
  'people',
  'perceive',
  'places',
  'portrait',
  'probe',
  'royal',
  'seeking',
  'seen',
  'settle',
  'shadow',
  'standing',
  'tokens',
  'tutelage',
  'upbringing',
  'wishes',
  'world',
  'wounded',
]

/**
 * 同时跑几支。
 *
 * ## 为什么不是「核心数减一」
 *
 * 一开始是那么写的，实测下来是个错的默认值。**十三支重的门禁如今各自
 * 还要开十一个 worker 线程**（见 `lib/parallel.ts`），十一个进程一起上，
 * 十二个核上就挤了一百多个可运行体。
 *
 * 同一批门禁，两个设置各跑一遍：
 *
 *     并发 11　　墙上 4.0 分钟　　四十支加起来 39.6 分钟
 *     并发 4 　　墙上 4.0 分钟　　四十支加起来 16.1 分钟
 *
 * **墙上时间一样，烧掉的算力差了六成。** 那多出来的二十三分钟没换到任何
 * 东西，全花在互相抢核上了。墙上时间之所以不动，是因为它由最长那一支
 * （`lifelong`，独占时 78 秒）加上收尾的排队决定，跟前面挤不挤没关系。
 *
 * 所以默认取核心数的三分之一：够把小支填满空隙，又不至于让摊开的那几支
 * 互相踩。核少的机器至少给两个。
 */
const JOBS = ((): number => {
  const asked = Number(process.env.GATE_JOBS)
  if (Number.isInteger(asked) && asked > 0) return asked
  return Math.max(2, Math.round(cpus().length / 3))
})()

interface Result {
  name: string
  code: number
  out: string
  ms: number
}

function loadTimes(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(TIMES, 'utf8')) as Record<string, number>
  } catch {
    return {}
  }
}

function saveTimes(times: Record<string, number>): void {
  try {
    mkdirSync(dirname(TIMES), { recursive: true })
    writeFileSync(TIMES, JSON.stringify(times, null, 2))
  } catch {
    // 记不下来只是下次排序退回按给定顺序，不值得为它中断一整批门禁
  }
}

function runGate(name: string): Promise<Result> {
  return new Promise((fulfil) => {
    const started = Date.now()
    // `process.execPath` 就是当前这个 bun，不必把 'bun' 写死在这儿
    const child = spawn(process.execPath, [join(ROOT, 'scripts', `${name}.ts`)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      // 生产版构建。pinia 和 vue 都是运行时读这一格分开发/生产版的
      env: { ...process.env, NODE_ENV: 'production' },
    })

    /**
     * 把门禁降到低优先级。
     *
     * 十一个进程一起跑必然把十二个核占满，那期间这台机器会卡得动不了——
     * 而门禁是人在旁边等着看结果的东西。
     *
     * 少开几个核也能让机器留有余地，可那是**白扔吞吐**：空着的核并没有
     * 被谁用上，只是空着。降优先级两头都要：空闲算力照吃满，
     * 你一动手，编辑器和浏览器立刻抢在门禁前头，操作系统的调度器
     * 比我们手工留核准得多。
     *
     * worker 线程继承进程的优先级，所以设在进程这一层就够了，
     * `lib/parallel.ts` 那边不必再管。
     */
    if (child.pid !== undefined) {
      try {
        setPriority(child.pid, constants.priority.PRIORITY_BELOW_NORMAL)
      } catch {
        // 设不上照跑，只是机器会卡一点。不该为它中断一整批门禁
      }
    }

    let out = ''
    child.stdout.on('data', (chunk: Buffer) => (out += chunk))
    child.stderr.on('data', (chunk: Buffer) => (out += chunk))
    child.on('close', (code) => fulfil({ name, code: code ?? 1, out, ms: Date.now() - started }))
  })
}

const asked = process.argv.slice(2)
const wanted = asked.length > 0 ? asked : GATES
const missing = wanted.filter((name) => !existsSync(join(ROOT, 'scripts', `${name}.ts`)))
if (missing.length > 0) {
  console.error(`找不到这几支：${missing.join('、')}`)
  process.exit(2)
}

// 长的先跑：最长那支决定整批的下限，它必须第一个上路
const times = loadTimes()
const queue = [...wanted].sort((a, b) => (times[b] ?? 0) - (times[a] ?? 0))

console.log(`\n${queue.length} 支门禁，${JOBS} 个同时跑${asked.length > 0 ? '（指定）' : ''}\n`)

const started = Date.now()
const done: Result[] = []
let next = 0

async function worker(): Promise<void> {
  while (next < queue.length) {
    const name = queue[next]!
    next += 1
    const result = await runGate(name)
    done.push(result)
    times[name] = result.ms
    const mark = result.code === 0 ? '✓' : '✗'
    const secs = (result.ms / 1000).toFixed(1).padStart(6)
    console.log(
      `  ${mark} ${secs}s  ${name}${result.code === 0 ? '' : `  ← 退出码 ${result.code}`}`,
    )
  }
}

await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, worker))
saveTimes(times)

const failed = done.filter((one) => one.code !== 0)
const wall = (Date.now() - started) / 1000
const cpuTime = done.reduce((sum, one) => sum + one.ms, 0) / 1000

console.log(
  `\n墙上时间 ${(wall / 60).toFixed(1)} 分钟；` +
    `${done.length} 支加起来 ${(cpuTime / 60).toFixed(1)} 分钟的活，摊开快了 ${(cpuTime / wall).toFixed(1)} 倍\n`,
)

if (failed.length > 0) {
  for (const one of failed) {
    console.log(`\n${'─'.repeat(60)}\n✗ ${one.name}\n${'─'.repeat(60)}`)
    // 只印尾巴：判据不成立的那几行都落在末尾，整篇打出来会把别的失败冲掉
    console.log(one.out.split('\n').slice(-25).join('\n'))
  }
  console.log(`\n${failed.length} 支不成立：${failed.map((one) => one.name).join('、')}\n`)
  process.exit(1)
}

console.log('全部通过。\n')
