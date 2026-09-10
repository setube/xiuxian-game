/* eslint-disable no-console -- 种子要打印出来，不然红了没法复现 */
/**
 * 门禁脚本的第一行：`import './lib/seeded'`。
 *
 * 它做一件事：装种子。放在第一个 import 的位置是有意的——ESM 按出现顺序求值，
 * 这一行在 `../src/content/*` 之前跑完，内容模块加载期若有随机（掷名字、洗牌），
 * 也已经在种子之下。
 *
 * 打印的那一行是给人看的：单跑红了，把 `SEED=…` 抄回去就能复现。
 * `gates.ts` 里跑的那些，复现命令由它统一打印。
 *
 * ## 只装一次
 *
 * worker 线程里先由 `worker.ts` 装上**派生**种子（`主种子/调用序/分片序`），再加载任务模块；
 * 而任务模块引 `scripts/origin.ts`（`beOf`），它的第一行也是本文件——从前这里无条件重装
 * `SEED` 环境变量那一颗，**把派生种子盖掉了，于是每一片跑的都是同一批世界**。
 * `ruin.ts` 的报数「杳 11，殁·老病 11」正是十一个一模一样的分片；
 * `owed.ts` 掷一千三百二十世一世也没走到丧事那一卷，而单线程两百世里有五世——
 * 一千三百二十世其实只是一百二十世重复了十一遍。装过的就不再装，也不再印。
 */
import { currentSeed, installSeed, seedFromEnv } from './seed'

/**
 * ## 这一行为什么带上 pid 和时刻
 *
 * 用户 2026-09-10 定的：**「哪个进程属于哪次验证」不该靠人脑追。**
 *
 * 那天两个人在同一件事上各错一次：
 *
 *     我   说「跑完了」，而说完之后又跑了两次打断验，没宣告
 *     17   查到一个 `bun scripts/lifelong.ts` 进程，推断是我说的那一次
 *
 * **两边都没说错**——那个 pid 确实是我的，只是不是我说的那一次。
 * 一天里同一支门禁会跑好几轮（初测 → 打断验 → 还原 → 同种子复跑），
 * 而输出里除了种子没有任何东西能把它们分开：**同一颗种子重跑两遍，
 * 两份输出一模一样。**
 *
 * 现在这一行印三样：种子（复现用）、pid（对得上进程表）、时刻（分得开轮次）。
 * 跨会话报红时把这一整行抄过去，对方就不用问「你说的是哪一次」。
 */
if (currentSeed() === undefined) {
  const seed = installSeed(seedFromEnv())
  const at = new Date()
  const hh = String(at.getHours()).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')
  const ss = String(at.getSeconds()).padStart(2, '0')
  console.log(`种子 ${seed}　pid ${process.pid}　${hh}:${mm}:${ss}`)
}
