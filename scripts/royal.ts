/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 宗室那两条线的加压走查。
 *
 * 生在宫里那一行四千世里只掷出三十来次，样本太薄，看不出坠落链有没有真的走完。
 * 这里绕开权重，直接把出身钉死，各跑一千世。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

import { beOf } from './origin'

const RUNS = 300

function probe(id: OriginId, label: string): void {
  const tally = {
    n: 0,
    fell: 0,
    walkedOut: 0,
    observatory: 0,
    entered: 0,
    guarded: 0,
    slipped: 0,
    knew: 0,
    identities: {} as Record<string, number>,
    genders: {} as Record<string, number>,
    endings: {} as Record<string, number>,
  }

  for (let i = 0; i < RUNS; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const character = useCharacterStore()
    const household = useHouseholdStore()
    // 绕开权重：这一支太稀有，按权重掷根本攒不出样本。
    // 钉的是主键——王府与宫里那五格完全相同，只有主键分得开这两支
    beOf(id)
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

    tally.n += 1
    if (world.hasFlag('the-fall')) tally.fell += 1
    if (world.hasFlag('walked-out')) tally.walkedOut += 1
    if (world.hasFlag('event:royal-observatory')) tally.observatory += 1
    if (world.hasFlag('entered-observatory')) tally.entered += 1
    if (world.hasFlag('guarded')) tally.guarded += 1
    if (world.hasFlag('slipped-the-guards')) tally.slipped += 1
    if (character.knows('cultivators-exist')) tally.knew += 1
    tally.identities[character.identity] = (tally.identities[character.identity] ?? 0) + 1
    tally.genders[household.gender] = (tally.genders[household.gender] ?? 0) + 1
    const ending = narrative.nodeId ?? '(未收尾)'
    tally.endings[ending] = (tally.endings[ending] ?? 0) + 1
  }

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

probe('court', '生在宫里')
probe('manor', '生在王府')
console.log()
