import { parentPort, workerData } from 'node:worker_threads'

import { installSeed } from './seed'

process.env.NODE_ENV = 'production'

interface WorkerInput {
  task: string
  runs: number
  payload: unknown
  index: number
  /** 这一片的种子。主线程从自己那颗派生，见 `parallel.ts` */
  seed: string
}

const { task, runs, payload, index, seed } = workerData as WorkerInput

// 先装种子再加载任务：任务模块引的内容层若在加载期掷过骰子，也在种子之下
installSeed(seed)

const module = (await import(task)) as {
  runShard?: (runs: number, payload: unknown, index: number) => unknown
}
if (typeof module.runShard !== 'function') {
  throw new Error(`任务模块没有导出 runShard：${task}`)
}

parentPort?.postMessage(module.runShard(runs, payload, index))
parentPort?.close()
