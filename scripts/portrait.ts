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

const RUNS = 600

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
{
  let shown = false
  for (let i = 0; i < 200 && !shown; i += 1) {
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
  if (!shown) console.log('  （两百世里没有一个听过修士评价的，这本身就是个问题）\n')
}

// —— 二、统计：多少人一辈子没被修士看过 ——
console.log('=== 六百世统计 ===\n')
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
console.log()
