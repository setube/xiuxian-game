/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 宗室那两条线的加压走查。
 *
 * 生在宫里那一行四千世里只掷出三十来次，样本太薄，看不出坠落链有没有真的走完。
 * 这里绕开权重，直接把出身钉死，各跑一千世。
 */
import './lib/seeded'

import type { OriginId } from '../src/types/game'

import { mapShards, sumTallies } from './lib/parallel'
import { type RoyalTally } from './tasks/royal-lives'

const RUNS = 300

async function probe(id: OriginId, label: string): Promise<void> {
  // 这一段原样搬去了 tasks/royal-lives.ts，走法一步没动；
  // 摊开跑的理由跟别支一样：世与世之间没有边，每一世自己 createPinia()
  const tally = sumTallies(
    await mapShards<RoyalTally, OriginId>({
      task: 'scripts/tasks/royal-lives.ts',
      runs: RUNS,
      payload: id,
    }),
  )

  const p = (v: number) => `${((v / tally.n) * 100).toFixed(0)}%`
  console.log(`\n=== ${label}（${RUNS} 世，出身钉死）===`)
  console.log(`  墙塌了          ${p(tally.fell)}`)
  if (id === 'court') {
    console.log(`  塌了以后走出门  ${p(tally.walkedOut)}`)
    console.log(`  撞上钦天监      ${p(tally.observatory)}`)
    console.log(`  溜进去了        ${p(tally.entered)}`)
  }
  console.log(`  渡口带着随从    ${p(tally.guarded)}`)
  console.log(`  支开随从走上前  ${p(tally.slipped)}`)
  console.log(`  知道有修士      ${p(tally.knew)}`)
  console.log(
    `  性别            ${Object.entries(tally.genders)
      .map(([k, v]) => `${k} ${p(v)}`)
      .join('  ')}`,
  )
  console.log(
    `  收尾身份        ${Object.entries(tally.identities)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${p(v)}`)
      .join('  ')}`,
  )
  /**
   * ## 这儿从前印的是「渡口落点」
   *
   * 那一行读 `narrative.nodeId`——一世走完停在哪一节。旧结构里那是渡口，
   * 宗室两条路各自落在不同的出口上，看得出「墙塌过的人到渡口是另一副样子」。
   *
   * 人生模拟那一轮之后它恒等于 `gone 100%`：人生不再在渡口收尾，
   * 人人走到落幕那一节。**一行永远是 100% 的数印出来只会骗人。**
   *
   * 同一格采集换个问法就还有用：不问停在哪一节，问**停没停下来**。
   * 宗室那几卷是全库最长的链，一处跳转写错就会把人卡在半路，
   * 而这一支是唯一钉死这两种出身跑三百世的地方。
   */
  const stuck = tally.endings['(未收尾)'] ?? 0
  console.log(
    `  走得完一生      ${p(tally.n - stuck)}${stuck > 0 ? `　✗ ${stuck} 个卡在半路` : ''}`,
  )
}

await probe('court', '生在宫里')
await probe('manor', '生在王府')
console.log()
