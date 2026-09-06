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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { constants, cpus, setPriority } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { deriveSeed, freshSeed } from './lib/seed'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const TIMES = join(ROOT, 'node_modules', '.tmp', 'gate-times.json')

/**
 * 要跑哪几支：`scripts/` 下的 `.ts`，减掉底下这张排除表。
 *
 * ## 从前这里是一张手写的四十行名单
 *
 * 那张名单是照着改造前那九批一字不差抄下来的，好让前后跑的是同一批东西。
 * 用意是对的，代价是**新写的门禁不会自己进来**：`verify`、`note`、
 * `savefile` 三支判定型的当时不在那九批里，于是 `bun scripts/gates.ts`
 * 跑完印一句「全部通过」，而它们一支也没跑。
 *
 * 这跟门禁自己那条纪律是同一件事：**没查到和查过了长得一模一样。**
 * 所以改成扫目录——写一支新的丢进 `scripts/`，它自动进这一批。
 *
 * ## 扫目录自带一个坑，而它一声不响
 *
 * `gates.ts` 自己也在 `scripts/` 底下。头一版忘了排除它，
 * 于是这一支把自己当成一支门禁又跑了一遍，那一遍又跑一遍——
 * **进程数按指数涨，而输出是空的**：运行器要等全部跑完才打印，
 * 于是它看起来只是「有点慢」，二十五分钟后还是一个字也没有。
 *
 * 排除表里第一行就是它自己，别删。
 */
const NOT_A_GATE: Readonly<Record<string, string>> = {
  gates: '就是这一支自己——不排除掉它会递归着把自己再跑一遍',
  refs: '库，不是门禁——别的支从它这儿取引用',
  origin: '库，被 upbringing / living 等支取用（它自己也判几条，所以仍然跑）',
  simulate: '观察型：印一千世的统计给人看，不判成败',
}

/** 这些虽然列在排除表里，但它自己也判据，照跑 */
const STILL_RUN = new Set(['origin'])

const GATES = readdirSync(join(ROOT, 'scripts'))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.slice(0, -3))
  .filter((name) => STILL_RUN.has(name) || NOT_A_GATE[name] === undefined)
  .sort()

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

/**
 * 主种子。`SEED=…` 指定就用指定的，不然现掷一颗——**掷出来的那颗会打印在最前面**。
 * 每一支门禁拿到的是从它派生的一颗（主种子 + 门禁名），所以：
 *
 *     SEED=<主种子> bun scripts/gates.ts                          整套复现
 *     SEED=<门禁种子> GATE_SHARDS=<n> bun scripts/<name>.ts      单支复现（红了的那支下面会打印这一行）
 *
 * 分片数也是复现的一部分（片数变了，每一片拿到的种子就变了），所以这儿把它钉死在环境里传下去。
 */
const MASTER_SEED =
  process.env.SEED !== undefined && process.env.SEED !== '' ? process.env.SEED : freshSeed()
/**
 * 每个门禁进程内部开几个 worker 线程。
 *
 * ## 默认值让「进程数 × 线程数」等于核数
 *
 * 从前默认是「核心数减一」，跟 `JOBS` 各算各的，于是四个进程各开十一个线程，
 * 十二个核上挤了四十四个可运行体。**代价是量得出来的**：同一批门禁，
 * `lifelong` 单独跑 48 秒，在那种池子里要 205 秒——四倍，全花在互相抢核上。
 *
 * 三组配置各跑一遍（52 支，12 核）：
 *
 *     JOBS=4  SHARDS=11　　墙上 5.3 分钟　　合计 21.4 分钟　　四十四个线程抢十二个核
 *     JOBS=11 SHARDS=1 　　墙上 5.8 分钟　　合计 37.6 分钟　　最长那支退回单线程，尾巴拖长
 *     JOBS=4  SHARDS=3 　　墙上 4.7 分钟　　合计 18.7 分钟　　乘积正好等于核数
 *     JOBS=2  SHARDS=6 　　墙上 4.8 分钟　　合计 9.6 分钟　 　同上，且更省算力
 *
 * 两个乘积等于核数的配置墙上时间基本打平，而两个不配平的都更慢。
 * 所以这里不再独立取值，改成跟着 `JOBS` 算——**人只需要挑 `JOBS`，
 * 乘积由这一行保证**。显式给了 `GATE_SHARDS` 仍然优先，复现红灯要用它。
 */
const SHARDS =
  process.env.GATE_SHARDS !== undefined && process.env.GATE_SHARDS !== ''
    ? process.env.GATE_SHARDS
    : String(Math.max(1, Math.round(cpus().length / JOBS)))

function seedOf(name: string): string {
  return deriveSeed(MASTER_SEED, name)
}

function replayCommand(name: string): string {
  return `SEED=${seedOf(name)} GATE_SHARDS=${SHARDS} bun scripts/${name}.ts`
}

function runGate(name: string): Promise<Result> {
  return new Promise((fulfil) => {
    const started = Date.now()
    // `process.execPath` 就是当前这个 bun，不必把 'bun' 写死在这儿
    const child = spawn(process.execPath, [join(ROOT, 'scripts', `${name}.ts`)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      // 生产版构建。pinia 和 vue 都是运行时读这一格分开发/生产版的
      env: { ...process.env, NODE_ENV: 'production', SEED: seedOf(name), GATE_SHARDS: SHARDS },
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
if (asked.length === 0) {
  // 跳过了谁、为什么，要印出来。不印的话「没跑」和「跑过了」长得一样
  const skipped = Object.entries(NOT_A_GATE).filter(([name]) => !STILL_RUN.has(name))
  if (skipped.length > 0) {
    console.log(
      `不跑：${skipped.map(([name, why]) => `${name}（${why}）`).join('；')}
`,
    )
  }
}
const missing = wanted.filter((name) => !existsSync(join(ROOT, 'scripts', `${name}.ts`)))
if (missing.length > 0) {
  console.error(`找不到这几支：${missing.join('、')}`)
  process.exit(2)
}

// 长的先跑：最长那支决定整批的下限，它必须第一个上路
const times = loadTimes()
const queue = [...wanted].sort((a, b) => (times[b] ?? 0) - (times[a] ?? 0))

console.log(`
${queue.length} 支门禁，${JOBS} 个同时跑${asked.length > 0 ? '（指定）' : ''}`)
console.log(
  `主种子 ${MASTER_SEED}（整套复现：SEED=${MASTER_SEED} GATE_SHARDS=${SHARDS} bun scripts/gates.ts）
`,
)

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
    console.log(`
  复现：${replayCommand(one.name)}`)
  }
  console.log(`
${failed.length} 支不成立：${failed.map((one) => one.name).join('、')}`)
  console.log(`主种子 ${MASTER_SEED}；修完拿同一颗种子重跑，绿了才算修好。
`)
  process.exit(1)
}

console.log('全部通过。\n')
