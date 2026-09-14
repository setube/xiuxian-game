/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 同一年：两家的老人一块儿修过河堤，这件事还成立吗。
 *
 * 跑法：`bun scripts/samelevy.ts`
 *
 * ## 这一卷的入场是【两个人的交集】，那种条件最容易悄悄变成恒假
 *
 * ```ts
 * { past: { id: 'father',    chapter: 'soldiered' } }
 * { past: { id: 'east-head', chapter: 'soldiered' } }
 * ```
 *
 * 两条并排是「并且」——**两个人身上都得有这一件**。
 * 而这种条件的分母是两个独立概率的乘积，**上游任何一处动一下它就塌**：
 *
 * ```
 * ELDER_PAST 多加两件            两人共有的概率跟着降
 * 邻家户主那一笔 rollPast 被撤掉  分母直接回零
 * soldiered 改了 id 或权重        同上
 * ```
 *
 * ⚠️ 而它塌下来的样子是**「这一卷一次也没演到」**，
 * 跟「稀有」在报表上一模一样。所以这一支先印分母，再印到达率。
 *
 * ## 它问四件事
 *
 * ```
 * 一  分母还在吗            两家老人共有 soldiered 的世数
 * 二  到达率还在吗          分母非零而演到零＝入场还有别的东西卡着
 * 三  两笔 recall 都落下吗   少一笔就只翻开一半，这一卷的意思全在后半句
 * 四  邻家老人真有往事吗     上游那一笔（birth.ts 的 rollPast）还在吗
 * ```
 *
 * 第四条是**上游的断路器**：它一红，前三条的解释就变了
 * ——不是这一卷坏了，是它依赖的那一笔被撤了。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { flagKey } from '../src/engine/facts'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

const SCENE = 'neighbour:same-levy'
const EVENT = 'neighbour-same-levy'
let bad = 0

console.log(`\n=== 同一年：两家的老人一块儿修过河堤 ===\n`)

/*
 * 尺子自检：那一卷和它问的那件往事，都还在。
 *
 * ⚠️ 往事 id 【从入场条件现取】，不写死在判据里——
 * 内容里把 soldiered 换成别的，这一支得跟着变，
 * 而不是继续量一件没人问的往事。
 */
const event = lifeEvents.find((one) => one.id === EVENT)
const chapters = (event?.requires ?? []).map((one) => one.past).filter((one) => one !== undefined)
if (lifeScenes[SCENE] === undefined || event === undefined || chapters.length < 2) {
  console.log(`  ✗ 尺子自检：找不到那一卷，或入场不再问两个人的往事了——结构变了。`)
  process.exitCode = 1
  process.exit(1)
}
const who = chapters.map((one) => one.id)
const what = chapters[0]!.chapter
console.log(`  ✓ 尺子自检：入场问的是 ${who.join(' 和 ')} 都有「${what}」。`)

const RUNS = 400
let bothHave = 0
let eastHasAny = 0
let fired = 0
let halfOnly = 0
let bothOpen = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  const historyOf = (id: string) => people.personOf(id)?.history ?? []
  if (historyOf('east-head').length > 0) eastHasAny += 1
  if (who.every((id) => historyOf(id).some((one) => one.id === what))) bothHave += 1

  let turns = 0
  while (!narrative.ended && turns < 240) {
    const open = narrative.options.filter((one) => !one.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  if (!world.hasFlag(flagKey('event', EVENT))) continue
  fired += 1
  const opened = who.filter((id) =>
    historyOf(id).some((one) => one.id === what && one.known),
  ).length
  if (opened === who.length) bothOpen += 1
  else halfOnly += 1
}

console.log(`  ·  ${RUNS} 世：邻家老人有往事的 ${eastHasAny} 世`)
console.log(`  ·  两家老人都有「${what}」的 ${bothHave} 世　← 这一卷的分母`)
console.log(`  ·  这一卷演过 ${fired} 世`)

// —— 四、上游那一笔还在吗（断路器，先判）——
if (eastHasAny === 0) {
  console.log(`  ✗ 邻家老人一件往事也没有——上游那一笔（birth.ts 给邻家户主 rollPast）被撤了。`)
  console.log(`      ⚠️ 这一条红了，底下三条的解释就变了：不是这一卷坏了，是它的地基没了。`)
  bad += 1
} else {
  console.log(`  ✓ 上游还在：邻家老人 ${eastHasAny}/${RUNS} 世有往事。`)
}

// —— 一、分母还在吗 ——
if (bothHave === 0) {
  console.log(`  ✗ 分母是零：${RUNS} 世里没有一世两家老人都有「${what}」。`)
  console.log(`      ⚠️ 这是【两个独立概率的乘积】，上游任何一处动一下它就塌：`)
  console.log(`      ELDER_PAST 加了几件 / 权重改了 / 掷的件数少了，都会。`)
  bad += 1
} else {
  console.log(`  ✓ 分母还在：${bothHave} 世（${((bothHave / RUNS) * 100).toFixed(1)}%）。`)
}

// —— 二、到达率 ——
if (bothHave > 0 && fired === 0) {
  console.log(`  ✗ 分母 ${bothHave} 世而一次也没演到——入场还有别的东西卡着。`)
  console.log(`      ⚠️ 逐条问入场那几条，别整体问：整体只知道「不成立」。`)
  bad += 1
} else if (fired > 0) {
  console.log(`  ✓ 到达率 ${fired}/${bothHave}（${((fired / bothHave) * 100).toFixed(0)}%）。`)
}

// —— 三、两笔 recall 都落下 ——
if (fired === 0) {
  console.log(`  ⚠️ 零次演出，第三条没验成——这一行不是「通过」。`)
} else if (halfOnly > 0) {
  console.log(`  ✗ ${halfOnly}/${fired} 世只翻开了一半的往事。`)
  console.log(`      ——少一笔 recall，玩家只知道「爹修过河堤」而不知道「东边那个也去了」，`)
  console.log(`      而这一卷的意思全在后半句。`)
  bad += 1
} else {
  console.log(`  ✓ 演到的 ${bothOpen} 世里，两笔往事都翻开了。`)
}

console.log(bad === 0 ? `\n  ✓ 这一卷四件事都对。\n` : `\n  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
