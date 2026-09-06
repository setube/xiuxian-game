/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 认知画像走查。
 *
 * 前一支（observe.ts）验的是「一次观察算得对不对」，
 * 这一支验的是**跑完一整世之后，玩家攒下的那幅自我认知长什么样**。
 *
 * 要看的是三件事：
 *
 * 1. 玩家听到的那些话，跟他的真实数据对不对得上（对不上才是对的）。
 * 2. 「学识」栏和「修行」栏里的话，会不会互相打架。
 * 3. 有多少人一辈子没被任何修士看过——那些人到死都不知道自己是什么料。
 *
 * 跑法：bun scripts/portrait.ts
 */
import './lib/seeded'

import type { AspectKey } from '../src/types/game'
import { mapShards } from './lib/parallel'
// 本地仍叫 Character：这一支通篇都这么称呼它，改名只会让 diff 变大
import type { Portrait as Character } from './tasks/portrait-lives'

/**
 * 走查跑多少世。
 *
 * ## 照最稀的那一格定，而最稀的不是那个显眼的
 *
 * 一眼看去这支最稀的是「资质其实很好，却一辈子没人告诉过他」——
 * 那一格是这支走查存在的理由。可它三成上下，不缺样本。
 * 真正稀的是**听过修士评价**：半个点上下，肯开口的修士本来就是稀客。
 *
 * 从前这一支三百世，那一格期望三个人，一批里落空的概率约 5%——
 * 二十批响一次假警报。而第一节另起一个一百五十世的循环去捞同一种人，
 * 落空率 22%，**五批响一次**。两处叠起来，三成的批次会红。
 *
 * ## 而那 1% 本身就是噪音
 *
 * 三百世报出来的是 1.0%——三个人。照它算，七百世该有七个，够了。
 * 真跑七百世，是 0.4%。**拿三个人量出来的比例去推该跑几世，
 * 推出来的那个数本身就带着三倍的误差。**
 *
 * 一千二百世把期望顶到六个人上下，落空率降到千分之二。
 * 这一支于是成了全套里最慢的一支，将近两分钟。慢有慢的道理：
 * 它守的三条里有两条挂在这半个点上，而**一支五批响一次的门禁
 * 比没有门禁更坏——它教人把红灯当噪音**。
 */
const RUNS = 1200

/**
 * 把一个人这辈子听过的话印出来。
 *
 * 从前这一节自己另跑一百五十世去捞样本。删了：**同一批人生跑两遍，
 * 第二遍还跑得更少**。现在从统计那一轮里顺手留下头一个符合的人，
 * 一世也不多跑，而样本从一百五十世里挑变成七百世里挑。
 */
function printPortrait(character: Character): void {
  const a = character.attributes
  console.log('  真实数据（玩家永远看不到）：')
  console.log(
    `    记性 ${a.memory}  悟性 ${a.insight}  体魄 ${a.body}  ` +
      `心性 ${a.will}  资质 ${a.root}  神魂 ${a.spirit}\n`,
  )
  console.log('  他这辈子听过的话：\n')
  for (const [key, aspect] of Object.entries(character.aspects) as [
    AspectKey,
    Character['aspects'][AspectKey],
  ][]) {
    if (aspect.claims.length === 0 && aspect.self === null) continue
    console.log(`  【${key}】`)
    if (aspect.self) console.log(`    自述：${aspect.self}`)
    for (const claim of aspect.claims) {
      console.log(`    ${claim.source}：「${claim.text}」`)
      if (claim.doubt) console.log(`        └ ${claim.doubt}`)
    }
    console.log()
  }
}

// —— 统计：多少人一辈子没被修士看过 ——
// 标题里的世数从常量取。从前这里写死「六千世统计」，而 RUNS 是 300——
// **数字一个没错，只是分母比它自己宣称的少了一半**
let heardMortal = 0
let heardAdept = 0
let bothLearningAndCultivation = 0
let goodRootNeverKnew = 0
const claimCounts: number[] = []
// 头一个听过修士评价的人生，留着给第一节印。那种人生才看得出落差
let sample: Character | null = null

const lives = (
  await mapShards<Character[]>({ task: 'scripts/tasks/portrait-lives.ts', runs: RUNS })
).flat()

for (const character of lives) {
  const learning = character.aspects.learning.claims.length
  const cultivation = character.aspects.cultivation.claims.length
  const root = character.aspects.root.claims.length

  if (learning > 0 || character.aspects.body.claims.length > 0) heardMortal += 1
  if (cultivation > 0 || root > 0) heardAdept += 1
  if (learning > 0 && cultivation > 0) bothLearningAndCultivation += 1
  // 资质其实很好，却一辈子没人告诉过他
  if (character.attributes.root >= 70 && cultivation === 0 && root === 0) goodRootNeverKnew += 1
  if (!sample && cultivation > 0) sample = character

  claimCounts.push(
    Object.values(character.aspects).reduce((sum, aspect) => sum + aspect.claims.length, 0),
  )
}

console.log('\n=== 一个人的十六年，他最后知道自己什么 ===\n')
if (sample) printPortrait(sample)
else console.log(`  （${RUNS} 世里没有一个听过修士评价的）\n`)

console.log(`=== ${RUNS} 世统计 ===\n`)

const pct = (n: number) => `${((n / RUNS) * 100).toFixed(1)}%`
console.log(`  听过凡人评价（记性/身子骨）        ${pct(heardMortal)}`)
console.log(`  听过修行方面的评价（悟性/资质）    ${pct(heardAdept)}`)
console.log(`  两样都听过（会撞上认知落差）        ${pct(bothLearningAndCultivation)}`)
console.log(`  资质其实很好，却一辈子没人告诉他    ${pct(goodRootNeverKnew)}`)

const sorted = [...claimCounts].sort((a, b) => a - b)
console.log(
  `\n  一生听过几句评价：最少 ${sorted[0]}  中位 ${sorted[Math.floor(sorted.length / 2)]}  最多 ${sorted[sorted.length - 1]}`,
)

/**
 * 门禁。
 *
 * 这一支从前**一道门禁也没有**——它印完两节就 exit 0。
 * 可它开头列的那三件要看的事，三件全都验得动，
 * 而且每一件坏掉的样子都不像坏了：
 *
 * - 「没人被修士看过」印出来是 0.0%，读着像「世道就是这样」；
 * - 「两样都听过」是 0.0%，读着像「认知落差本来就少见」；
 * - 「资质好却没人告诉他」是 0.0%，读着像**好事**。
 *
 * **一支没有门禁的走查，它报出来的每一个 0 都会被读成世界设定。**
 *
 * 后来又拆掉一条：第一节从前捞不到样本就判红，而它跟底下
 * 「一个人也没听过修行方面的评价」判的是同一件事，只是用了个更小的样本。
 * **同一件事判两遍，先响的一定是粗的那一遍。**
 * 取样是取样，判据是判据——捞不到样本只该少印一段，不该红。
 */
console.log()
{
  let bad = 0

  // 一、得有人听过修行方面的评价，否则「他到底是不是那块料」这条线根本没落地
  if (heardAdept === 0) {
    console.log('  ✗ 一个人也没听过悟性或资质的评价——没有人被看过，也就没有人被看错。')
    bad += 1
  } else if (heardAdept / RUNS > 0.5) {
    console.log('  ✗ 一半以上的人都被修士看过——那修士就不是稀客，是发牌员。')
    bad += 1
  }

  // 二、得有人两样都听过。**认知落差是这一支的正题**：
  // 只听过一边的人不会撞上「他们说的不是一回事」
  if (bothLearningAndCultivation === 0) {
    console.log('  ✗ 没有一个人既听过凡人的评价又听过修士的评价——那两栏永远不会打架。')
    bad += 1
  }

  /**
   * 三、得有人资质其实很好，却一辈子没人告诉过他。
   *
   * **这一格是这支走查存在的理由。** 它要是空的，
   * 就意味着凡是有资质的人最后都被认出来了——
   * 那不是「机缘」，那是发牌：世界替玩家兜了底。
   */
  if (goodRootNeverKnew === 0) {
    console.log('  ✗ 资质好的人全都被认出来了——那就没有人「到死也不知道自己是什么料」。')
    bad += 1
  }

  console.log()
  if (bad > 0) {
    console.log(`  ✗ ${bad} 项不成立。\n`)
    process.exitCode = 1
  } else {
    console.log('  被看过的是少数，两样都听过的更少，而资质好却没人告诉他的一直都有。')
    console.log('  **他听到的话，和他真是什么料，本来就不是一回事。**\n')
  }
}
