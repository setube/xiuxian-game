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

if (currentSeed() === undefined) {
  const seed = installSeed(seedFromEnv())
  console.log(`种子 ${seed}`)
}
