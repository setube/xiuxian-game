/**
 * worker 线程的入口。
 *
 * 它只做两件事：开生产模式，把这一片的活干完报回去。
 *
 * ## 为什么这个文件短到不像样
 *
 * 从前它不是这样。用 Node 跑的时候，这里还得先 `module.register()` 装一套
 * 解析钩子，替 Node 补两件它不会的事——认 `@/` 这个别名，和给省略了
 * 扩展名的相对 import 补上 `.ts`；再用 `stripTypeScriptTypes` 把类型抹掉。
 * 换成 Bun 之后那一整套全没了：**它本来就直接跑 `.ts`，
 * `@/` 也照根 `tsconfig.json` 的 `paths` 解析**。
 *
 * ## 那句 NODE_ENV 不能挪到静态 import 上头以外的任何地方
 *
 * ESM 的静态 import 会被提升到所有语句之前执行。只要这里写一句
 * `import { createPinia } from 'pinia'`，pinia 就会在底下那句
 * `process.env.NODE_ENV = 'production'` 之前被求值——那一句就白写了。
 * 所以任务模块走底下的动态 `import()`，时序上它一定排在设环境变量之后。
 *
 * 这一句省下的不是零头：pinia 和 vue 都是单一入口、运行时读 `NODE_ENV`
 * 分出开发版和生产版。开发版每次 `useStore()` 都要备一份警告文案、
 * 挂一次 devtools 埋点，而 `useStore` 正是这套模拟里最热的那个函数
 * （CPU 采样占三成六）。实测 `attention` 一支：27.2 秒对 18.6 秒。
 */
import { parentPort, workerData } from 'node:worker_threads'

process.env.NODE_ENV = 'production'

interface WorkerInput {
  task: string
  runs: number
  payload: unknown
  index: number
}

const { task, runs, payload, index } = workerData as WorkerInput

const module = (await import(task)) as {
  runShard?: (runs: number, payload: unknown, index: number) => unknown
}
if (typeof module.runShard !== 'function') {
  throw new Error(`任务模块没有导出 runShard：${task}`)
}

parentPort?.postMessage(module.runShard(runs, payload, index))
// 报完就把口子关上，否则线程会挂着等下一条消息，主线程的 Promise.all 永远不落地
parentPort?.close()
