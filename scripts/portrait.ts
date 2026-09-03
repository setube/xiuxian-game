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
 * 跑法：npx vite-node scripts/portrait.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import type { AspectKey } from '../src/types/game'

/**
 * 走查跑多少世。
 *
 * ## 这一支最稀的一格是「资质其实很好，却一辈子没人告诉过他」
 *
 * 那一格是这支走查存在的理由——**到死都不知道自己是什么料的人**——
 * 而它是两件事叠出来的：资质掷得高，且一辈子没撞上肯开口的修士。
 * 三百世里是几十个人，量得住「在不在」，量不住小数点后那一位。
 *
 * 底下的门禁只查在不在，所以三百世够；而它印出来的那几个百分比
 * 各有两三个点的晃动，读的时候要当约数读。
 */
const RUNS = 300

/**
 * 第一节最多翻多少世去找一个听过修士评价的人。
 *
 * 提成常量是因为底下那句话要引它。从前那里写死「两百世里没有一个」，
 * 而循环上限一直是 150——**一句只在出错时才印的话，
 * 没有人会在正常的一天里发现它在撒谎。**
 */
const HUNT = 150

function live() {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
  return character
}

// —— 一、随便挑一世，把画像整个印出来 ——
console.log('\n=== 一个人的十六年，他最后知道自己什么 ===\n')
let noOneWasSeen = false
{
  let shown = false
  for (let i = 0; i < HUNT && !shown; i += 1) {
    const character = live()
    // 挑一个听过修士评价的，那种人生才看得出落差
    if (character.aspects.cultivation.claims.length === 0) continue
    shown = true

    const a = character.attributes
    console.log('  真实数据（玩家永远看不到）：')
    console.log(
      `    记性 ${a.memory}  悟性 ${a.insight}  体魄 ${a.body}  ` +
        `心性 ${a.will}  资质 ${a.root}  神魂 ${a.spirit}\n`,
    )
    console.log('  他这辈子听过的话：\n')
    for (const [key, aspect] of Object.entries(character.aspects) as [
      AspectKey,
      (typeof character.aspects)[AspectKey],
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
  if (!shown) {
    // 世数从常量取。从前这里写死「两百世」，而上限一直是 150——
    // **一句只在出错时才印的话，没有人会在正常的一天里发现它在撒谎**
    console.log(`  （${HUNT} 世里没有一个听过修士评价的，这本身就是个问题）\n`)
    noOneWasSeen = true
  }
}

// —— 二、统计：多少人一辈子没被修士看过 ——
// 标题里的世数从常量取。从前这里写死「六百世统计」，而 RUNS 是 300——
// **数字一个没错，只是分母比它自己宣称的少了一半**
console.log(`=== ${RUNS} 世统计 ===\n`)
let heardMortal = 0
let heardAdept = 0
let bothLearningAndCultivation = 0
let goodRootNeverKnew = 0
const claimCounts: number[] = []

for (let i = 0; i < RUNS; i += 1) {
  const character = live()
  const learning = character.aspects.learning.claims.length
  const cultivation = character.aspects.cultivation.claims.length
  const root = character.aspects.root.claims.length

  if (learning > 0 || character.aspects.body.claims.length > 0) heardMortal += 1
  if (cultivation > 0 || root > 0) heardAdept += 1
  if (learning > 0 && cultivation > 0) bothLearningAndCultivation += 1
  // 资质其实很好，却一辈子没人告诉过他
  if (character.attributes.root >= 70 && cultivation === 0 && root === 0) goodRootNeverKnew += 1

  claimCounts.push(
    Object.values(character.aspects).reduce((sum, aspect) => sum + aspect.claims.length, 0),
  )
}

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
 */
console.log()
{
  let bad = 0

  if (noOneWasSeen) {
    console.log('  ✗ 第一节翻遍了也没找到一个听过修士评价的人生。')
    bad += 1
  }

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
