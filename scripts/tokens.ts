/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 占位符走查。
 *
 * 起因是一个真实的 bug：点完选项，状态栏上写着 `{home}`。
 * 根子在于占位符只替换正文，而 effect 的参数、选项上的字都绕过了那一道加工。
 *
 * 这里跑完一整世之后，把所有会上界面的字符串翻一遍，
 * 只要还剩一个 `{`，就是漏了一处出口。
 */
import './lib/seeded'

import { ORIGINS } from '../src/content/origins'

import { mapShards, shardsOf, sumTallies } from './lib/parallel'
import { type TokensShard } from './tasks/tokens-lives'

const RUNS = 400

// 这一段原样搬去了 tasks/tokens-lives.ts，走法一步没动。
// 判据留在这儿——「什么算漏」和「十一种出身扫全了没有」是这支门禁要说的话
const sizes = shardsOf(RUNS)
const tally = sumTallies(
  await mapShards<TokensShard, readonly number[]>({
    task: 'scripts/tasks/tokens-lives.ts',
    runs: RUNS,
    payload: sizes,
  }),
)
const leaks = tally.leaks

console.log(`\n=== 占位符走查（${RUNS} 世，${ORIGINS.length} 种出身轮流钉死）===\n`)
let bad = 0

/**
 * 一、会上界面的字里没有漏网的占位符。
 */
if (leaks.length === 0) {
  console.log('  ✓ 一、没有漏网的占位符。')
} else {
  const unique = [...new Set(leaks)]
  console.log(`  ✗ 一、漏了 ${leaks.length} 处（去重后 ${unique.length} 种）：\n`)
  for (const leak of unique.slice(0, 40)) console.log(`    ${leak}`)
  bad += 1
}

/**
 * 二、尺子自检：每种出身扫到的世数是匀的。
 *
 * ## 这一条是摊开跑之后才需要的，而且我头一版问错了问题
 *
 * 原来出身按循环变量轮（`ORIGINS[i % ORIGINS.length]`），一个循环从头数到尾，
 * 每种必然轮匀。摊开之后**每一片的 `i` 都从 0 重来**——各片都从第一种开始轮，
 * 靠前的出身被多扫、靠后的被少扫。
 *
 * 头一版这一条问的是「每种出身都扫到了没有」，然后我把偏移改回片内序号
 * 去打断它——**判据没红**。因为 400 世分三片、每片一百三十多世，
 * `133 % 12` 早绕完好几圈，每片自己就能扫全十二种。
 * 「有没有扫到」在这个世数下是个**不会失败的问题**。
 *
 * 真正会坏的是**每种各扫多少世**。十二种出身的内容厚薄差得远
 * （`court` 那一册比 `farm` 长得多），分布一偏，某几册的占位符就查得比别册稀，
 * 而报表照样干净。所以判据量的是最多与最少之差。
 *
 * 门槛取「相差不超过一轮」：轮转法本来就可能让前几种多扫一世（400 除以 12
 * 除不尽），但**只可能差一世**。差到两世以上，那就不是除不尽，是偏移错了。
 */
{
  const counts = ORIGINS.map((one) => tally.origins.get(one.id) ?? 0)
  const most = Math.max(...counts)
  const least = Math.min(...counts)
  if (most - least > 1) {
    const worst = ORIGINS.map((one, i) => `${one.id} ${counts[i]}`).join('、')
    console.log(`  ✗ 二、各出身扫到的世数不匀（最多 ${most}，最少 ${least}）：${worst}`)
    bad += 1
  } else {
    console.log(
      `  ✓ 二、尺子自检：${ORIGINS.length} 种出身各扫 ${least}–${most} 世，分布没因为分片而偏。`,
    )
  }
}

/**
 * 三、尺子自检：跑满了这么多世。
 *
 * 分片合并最容易错的地方是分母——某一片没报数、或者 `runs` 抄成了全量，
 * 都会让实际跑的世数跟报表上那个数对不上，而**两种都不报错**。
 */
{
  if (tally.runs !== RUNS) {
    console.log(`  ✗ 三、报表说 ${RUNS} 世，各片加起来却是 ${tally.runs} 世。`)
    bad += 1
  } else {
    console.log(`  ✓ 三、尺子自检：各片世数加起来正好 ${tally.runs} 世。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  上界面的字都过了那一道加工。\n')
}
