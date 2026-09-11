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
 * 现在这一行印五样，**用户 2026-09-10 列的那张清单**（run id / seed /
 * gate / command / pid / start time）里除 shard 之外的全部——
 * shard 不印是因为分片在 worker 里，主线程这一行只印一次（印 N 遍
 * 就是种子被重装了 N 次，那是另一个坑）。
 *
 *     ◆ keeping  种子 ccvo9yrxlhbq  pid 1132  17:11:11  run 1711-ccvo
 *       ↑ 哪一支    ↑ 复现用          ↑ 进程表  ↑ 分轮次   ↑ 整轮的号
 *
 * ⚠️ **开头那个符号是 `◆` 不是 `▶`**：pinia 的警告用 `├▶` / `╰▶`，
 * 而 `lifelong` 那种跑几百世的会刷出成千上万条——**`grep "▶"` 会被淹掉**
 * （实测数出五千多万行）。取证的 grep 一旦被污染，
 * 「找不到那一行」跟「那一行不存在」长得一模一样。
 *
 * **`run` 那一段是给「同一支跑了好几轮」用的**：它由时刻和种子拼成，
 * 同一次运行里的每一行都一样，跨轮次必然不同。跨会话报红时抄这一整行，
 * 对方不用再问「你说的是哪一次」。
 */
if (currentSeed() === undefined) {
  const seed = installSeed(seedFromEnv())
  const at = new Date()
  const hh = String(at.getHours()).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')
  const ss = String(at.getSeconds()).padStart(2, '0')
  /*
   * 哪一支门禁。`process.argv[1]` 单跑时是脚本路径（`scripts/keeping.ts`），
   * 取文件名去掉后缀就是它的名字——**不写死一张表**，
   * 新写一支丢进 `scripts/` 自动就对（跟 `gates.ts` 扫目录同一条纪律）。
   */
  const entry = process.argv[1] ?? ''
  const gate = entry.split(/[\\/]/).pop()?.replace(/\.ts$/, '') ?? '?'
  // 整轮的号：同一次运行每行都一样，跨轮次必不同
  const run = `${hh}${mm}-${String(seed).slice(0, 4)}`
  console.log(`◆ ${gate}　种子 ${seed}　pid ${process.pid}　${hh}:${mm}:${ss}　run ${run}`)
}
