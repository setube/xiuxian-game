/**
 * 把一批互不相干的模拟摊到多个线程上跑。
 *
 * ## 为什么这些门禁能并行
 *
 * 这套走查脚本的重头戏都是同一个形状：跑 N 世互不相干的人生，
 * 每一世往几个计数器上加一笔，最后拿总数去比判据。
 * 每一世自己 `createPinia()`，状态完全隔离，**世与世之间没有任何一条边**——
 * 这正是可以拆开跑的全部理由。
 *
 * 拆开之后有一件事变了：原先各世往同一组计数器上累加，
 * 现在每个线程只看得见自己那一片。所以任务这一侧要改成
 * **返回自己那片的小计**，由主线程加起来。加法是可结合的，
 * 拆几片、每片多少世，都不影响总数——除了比例的分母要用总世数，
 * 别拿分片的世数去除。
 *
 * ## 随机数要播种，而且每一片一颗
 *
 * 每个 worker 是一个独立的 V8 isolate，`Math.random` 各有各的种子——从前这儿写着
 * 「不需要额外播种」，那是对的，直到全套偶尔一支红、单跑又绿开始出现。
 * 现在主线程那颗种子（`lib/seeded`）派生出每一片的种子（`deriveSeed(主, 第几次调用, 片序号)`），
 * 由 `worker.ts` 在加载任务之前装上：同一颗主种子、同样的片数，每一片长出同一批人生。
 * 片数是复现的一部分——`gates.ts` 打印复现命令时连 `GATE_SHARDS` 一起写。
 *
 * ## 这里只提供「摊开再收回」这一种模式
 *
 * 没有做「谁先撞上就叫停其余」的赛跑模式。用得上它的只有
 * `seeking.ts` 那个零回补跑的分支，而那个分支按注释里的算法
 * 是四百分之一才会走到的岔路——**为一条几乎不走的路加一套提前终止，
 * 复杂度花在了看不见的地方**。那条路照样摊开跑，跑满为止。
 */
import { cpus } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'

import { currentSeed, deriveSeed, installSeed, seedFromEnv } from './seed'

/**
 * 默认开几个线程。
 *
 * 留一个核给主线程和这台机器上别的事。跑满所有核会让整机在这十几分钟里
 * 卡得动不了，而门禁是人在旁边等着看结果的东西，不是夜里跑的批处理。
 *
 * `GATE_SHARDS` 是给外面留的手闸：`scripts/gates.ts` 把四十支脚本
 * 摊在多个进程上跑的时候，脚本内部再各开十一个线程就成了几十倍的超订。
 * 那种时候把它压到一两个，让并行发生在进程那一层。
 */
const DEFAULT_WORKERS = (() => {
  const asked = Number(process.env.GATE_SHARDS)
  if (Number.isInteger(asked) && asked > 0) return asked
  return Math.max(1, cpus().length - 1)
})()

/**
 * 把若干片小计加成一份总计。
 *
 * ## 为什么能一把梳子梳到底
 *
 * 这些走查攒的东西翻来覆去只有四种：**计数（number）、样本（array）、
 * 按键计数（Map）、出现过哪些（Set）**。四种各自的合并都是可结合的，
 * 所以摊成几片、每片多少世，加出来都是同一个总数。
 *
 * 一把梳子梳到底，是为了让每支脚本的改造只剩「把模拟搬出去」这一件事——
 * 十三支各写一份合并逻辑，写错一处不会有任何机器提醒，
 * 而错法是最坏的那一种：**总数悄悄少算，判据照样是绿的**。
 *
 * ## 有一格必须由任务那边负责
 *
 * 形如 `runs: RUNS` 的那一格。任务里要写 `runs: runs`——写成这一片实际跑的世数，
 * 加起来才是总世数。原样抄 `RUNS` 的话，十一片各报一次全量，
 * **分母会翻十一倍，而每一格比例都跟着缩水十一倍**。
 */
/**
 * 这一格是不是「按键计数」的普通对象（`Record<string, number>`）。
 *
 * `Map` 一眼认得出，可有些走查的计数攒在普通对象上（`royal.ts` 的
 * `identities` / `genders` / `endings` 就是）。两者语义一样，都该按键相加。
 *
 * ## 判据要看所有分片，不能只看头一片
 *
 * 一个 `{}` 分不出它是「这一片还没记过东西的计数表」还是「各片都一样的常量」。
 * 只看头一片的话，恰好那一片空着就会把整格当成常量——**后面十片记的数
 * 全部丢掉，而报表上那一行只是变小，不会有任何东西喊**。
 * 所以只要**任何一片**在这一格上是非空的数字表，整格就按计数合并。
 */
function isCountRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value) || value instanceof Map || value instanceof Set) return false
  const entries = Object.values(value)
  return entries.length > 0 && entries.every((one) => typeof one === 'number')
}

export function sumTallies<T extends object>(shards: readonly T[]): T {
  const first = shards[0]
  if (!first) throw new Error('没有可合并的分片')

  // `interface` 没有隐式索引签名，所以约束只能写到 `object`，
  // 取值这一步再收口成一次 cast——本文件仅此一处
  const rows = shards as readonly Record<string, unknown>[]
  const total: Record<string, unknown> = {}

  for (const [key, sample] of Object.entries(first)) {
    if (typeof sample === 'number') {
      let sum = 0
      for (const row of rows) sum += row[key] as number
      total[key] = sum
    } else if (Array.isArray(sample)) {
      const joined: unknown[] = []
      for (const row of rows) joined.push(...(row[key] as unknown[]))
      total[key] = joined
    } else if (sample instanceof Map) {
      const merged = new Map<unknown, number>()
      for (const row of rows) {
        for (const [at, n] of row[key] as Map<unknown, number>) {
          merged.set(at, (merged.get(at) ?? 0) + n)
        }
      }
      total[key] = merged
    } else if (sample instanceof Set) {
      const union = new Set<unknown>()
      for (const row of rows) for (const one of row[key] as Set<unknown>) union.add(one)
      total[key] = union
    } else if (rows.some((row) => isCountRecord(row[key]))) {
      const merged: Record<string, number> = {}
      for (const row of rows) {
        for (const [at, n] of Object.entries(row[key] as Record<string, number>)) {
          merged[at] = (merged[at] ?? 0) + n
        }
      }
      total[key] = merged
    } else {
      // 别的一律取头一片的。这类格子是各片都一样的常量，不是攒出来的数
      total[key] = sample
    }
  }
  return total as T
}

export interface ShardOptions<Payload> {
  /** 任务模块路径，相对仓库根，形如 `scripts/tasks/seeking-lives.ts` */
  task: string
  /** 一共要跑多少次 */
  runs: number
  /** 开几个线程，不写就按核心数减一 */
  workers?: number
  /** 原样转交给任务的参数，必须是能结构化克隆的东西 */
  payload?: Payload
}

/**
 * 把 runs 摊成每片多少。
 *
 * 除不尽的余数摊给前几片，不是一股脑塞给最后一片——
 * 后者会让最后那个线程比别人多跑一批，而整批的耗时是按最慢的那片算的。
 */
function splitRuns(runs: number, workers: number): number[] {
  const each = Math.floor(runs / workers)
  const extra = runs % workers
  return Array.from({ length: workers }, (_, i) => each + (i < extra ? 1 : 0)).filter((n) => n > 0)
}

/** 这一批会摊成几片。报数的时候要用，所以单独露出来 */
export function shardsOf(runs: number, workers = DEFAULT_WORKERS): number[] {
  return splitRuns(runs, workers)
}

/**
 * 摊开跑，收回每一片的小计。
 *
 * 任务模块要导出 `runShard(runs, payload, index)`，返回值必须能结构化克隆
 * （数字、字符串、数组、普通对象、`Map`、`Set` 都行；函数和类实例不行）。
 */
/** 这个进程第几次摊开。同一支门禁摊两回，两回的片种子不能一样 */
let calls = 0

export async function mapShards<Shard, Payload = undefined>(
  options: ShardOptions<Payload>,
): Promise<Shard[]> {
  const workerFile = new URL('./worker.ts', import.meta.url)
  const task = pathToFileURL(resolve(process.cwd(), options.task)).href
  const chunks = splitRuns(options.runs, options.workers ?? DEFAULT_WORKERS)
  // 没装过种子的调用方（该在第一行 `import './lib/seeded'`）这儿补装，至少让分片可复现
  const seed = currentSeed() ?? installSeed(seedFromEnv())
  const call = calls
  calls += 1

  /**
   * 只给采样用的旁路：在主线程里直接跑，不开 worker。
   *
   * ## 为什么需要它
   *
   * `bun --cpu-prof` 只采主线程。而摊开跑之后，重活全在 worker 里，
   * 主线程剩下的是事件循环空转——实测 `leaving` 采出来
   * 95% 是 `processTicksAndRejections` / `shift` / `isEmpty`，
   * **一帧游戏逻辑也看不见**。要给全套门禁画热点图，就得有一条不进 worker 的路。
   *
   * ## 它不能用来跑门禁
   *
   * worker 那条路每片装的是从主种子**派生**出来的种子，这里装的是主线程自己那颗。
   * 随机流不同，判据的抽样结果就可能不同——**同一份内容，两条路可能一红一绿**。
   * 所以这个开关只用于「时间花在哪儿」，绝不用于「判据成不成立」。
   */
  if (process.env.GATE_INLINE === '1') {
    const module = (await import(task)) as {
      runShard: (runs: number, payload: unknown, index: number) => Shard
    }
    return chunks.map((runs, index) => module.runShard(runs, options.payload, index))
  }

  return Promise.all(
    chunks.map(
      (runs, index) =>
        new Promise<Shard>((fulfil, reject) => {
          const worker = new Worker(workerFile, {
            workerData: {
              task,
              runs,
              payload: options.payload,
              index,
              seed: deriveSeed(seed, call, index),
            },
          })
          let reported = false
          worker.once('message', (shard: Shard) => {
            reported = true
            fulfil(shard)
          })
          worker.once('error', reject)
          // 没报数就退了，说明那一片是崩着结束的，不能当成跑完了
          worker.once('exit', (code) => {
            if (!reported) reject(new Error(`第 ${index} 片没有报数就退了，退出码 ${code}`))
          })
        }),
    ),
  )
}
