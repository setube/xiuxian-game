/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 念头走查：人为什么会开始主动追求某件事。
 *
 * ## 验收标准不是「多少人获得了目标」
 *
 * 那是任务系统的问法。这一支要看的是**方向的分布形状**：
 *
 *     多少人生自然长出了方向
 *     多少人生始终没有明确方向
 *
 * 后者必须占大头。绝大多数人就是好好过日子、养家、把孩子拉扯大、
 * 平平安安走完——**那不是失败路线**。如果每个人最后都长出一个
 * 「我要改变命运」，凡人生活就失去了真实性，
 * 而后来那一句「我要修仙」也就没有分量了。
 *
 * ## 三个阶段，中间那一层是关键
 *
 *     埋着　什么也不显示，只在日录里留下痕迹
 *     反复　带某些标记的日子里，正文多出一句
 *     明白　他自己说出来了
 *
 * 念头一冒出来就变成「【任务：成为郎中】」，那是任务系统，
 * 不是一个人的一生。
 *
 * 跑法：npx vite-node scripts/leanings.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { LEANINGS, SPARKS } from '../src/content/leanings'
import { echoesOn, leaningById, selfSense } from '../src/engine/leanings'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useLeaningStore } from '../src/stores/leanings'
import { useNarrativeStore } from '../src/stores/narrative'

const RUNS = 600

interface Lived {
  named: string[]
  stirring: string[]
  age: number
  trace: { at: number; text: string }[]
}

/** 随机走完一世，看他心里长出了什么 */
function liveALife(): Lived {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  let turns = 0
  while (!narrative.ended && turns < 500) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
  const leaning = useLeaningStore()
  return {
    named: leaning.named.map((item) => item.id),
    stirring: leaning
      .atLeast('反复')
      .filter((item) => item.namedAt === null)
      .map((item) => item.id),
    age: useCharacterStore().age,
    trace: leaning.growing
      .flatMap((item) => item.moments)
      .map((moment) => ({ at: moment.at.year, text: moment.text })),
  }
}

let failed = 0

// —— 一、内容里一个数字也不给玩家 ——
console.log('\n=== 一、他对自己的说法里，没有一个数字 ===\n')
{
  console.log('  七种念头，各自的两句话：\n')
  for (const item of LEANINGS) {
    console.log(`  【${item.id}】`)
    console.log(`      反复：${item.stirring}`)
    console.log(`      明白：${item.says}`)
  }
  const hasDigit = LEANINGS.some((item) => /\d/.test(item.says) || /\d/.test(item.stirring))
  console.log()
  if (hasDigit) {
    console.log('  ✗ 有数字混进了给玩家看的话里。')
    failed += 1
  } else {
    console.log('  一个数字也没有。「勇敢 72 / 好奇 81」那种东西不在这里。')
  }
}

// —— 二、方向的分布形状 ——
console.log('\n=== 二、一生走完，他心里长出了什么 ===\n')
const lives: Lived[] = []
for (let i = 0; i < RUNS; i += 1) lives.push(liveALife())
{
  const none = lives.filter((life) => life.named.length === 0 && life.stirring.length === 0)
  const vague = lives.filter((life) => life.named.length === 0 && life.stirring.length > 0)
  const clear = lives.filter((life) => life.named.length > 0)

  const bar = (n: number) => '█'.repeat(Math.max(1, Math.round(((n / RUNS) * 100) / 2)))
  const pct = (n: number) => ((n / RUNS) * 100).toFixed(1).padStart(5)

  console.log(`  始终没有方向　${pct(none.length)}%  ${bar(none.length)}`)
  console.log(`  有个说不清的　${pct(vague.length)}%  ${bar(vague.length)}`)
  console.log(`  说出来了　　　${pct(clear.length)}%  ${bar(clear.length)}`)

  console.log()
  if (clear.length / RUNS > 0.5) {
    console.log('  ✗ 一半以上的人都长出了明确的目标——凡人生活失去了真实性。')
    console.log('    每个人最后都「我要改变命运」，那后来那句「我要修仙」就没有分量了。')
    failed += 1
  } else if (clear.length === 0) {
    console.log('  ✗ 一个人也没有——那这一层等于没做。')
    failed += 1
  } else if (vague.length === 0) {
    console.log('  ✗ 没有「说不清」那一档——念头一冒出来就变成了目标，那是任务系统。')
    failed += 1
  } else {
    console.log('  绝大多数人一辈子没有明确的方向。**那不是失败路线，那是大多数人。**')
  }
}

// —— 三、说出来的都是些什么 ——
console.log('\n=== 三、那些说出来了的人，说的是什么 ===\n')
{
  const tally = new Map<string, number>()
  for (const life of lives) {
    for (const id of life.named) tally.set(id, (tally.get(id) ?? 0) + 1)
  }
  for (const [id, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    const says = leaningById(id)?.says ?? id
    console.log(`  ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%  ${says}`)
  }
  const settleShare =
    (tally.get('settle') ?? 0) /
    Math.max(
      1,
      [...tally.values()].reduce((a, b) => a + b, 0),
    )
  console.log()
  console.log(`  「把日子过安稳」占了说出口的人里的 ${(settleShare * 100).toFixed(0)}%。`)
  console.log('  这一条是有意的：**它不是「没有目标」的委婉说法，是一个真正的方向。**')
}

// —— 四、念头是从人生里长出来的 ——
console.log('\n=== 四、一个人是怎么变成这样的 ===\n')
{
  // 找一个说出口了、而且路走得最长的人生
  const best = lives
    .filter((life) => life.named.length > 0)
    .sort((a, b) => b.trace.length - a.trace.length)[0]
  if (!best) {
    console.log('  （这一批里没有人说出口过）')
  } else {
    const says = best.named.map((id) => leaningById(id)?.says ?? id)
    for (const moment of best.trace.slice(0, 12)) {
      console.log(`  第 ${String(moment.at).padStart(2)} 年　${moment.text}`)
    }
    if (best.trace.length > 12) console.log(`  ……另有 ${best.trace.length - 12} 件`)
    console.log()
    for (const line of says) console.log(`  ${best.age} 岁：${line}`)
    console.log('\n  这一句不是系统贴的标签，是上面那一串攒出来的。')
    console.log('  **「我好像总是这样做」得让玩家自己读出来。**')
  }
}

// —— 五、反复那一层：不加选项，只多一句话 ——
console.log('\n=== 五、念头怎么在后面的日子里反复出现 ===\n')
{
  setActivePinia(createPinia())
  const leaning = useLeaningStore()
  useCharacterStore()

  // 手动把「想离开」推到「反复」这一档。门槛是 15，所以得推够
  for (let i = 0; i < 8; i += 1) {
    leaning.stir(
      'leave',
      2,
      { at: { year: 10 + i, month: 3, day: 1 }, text: '你往山那边走了走。' },
      { year: 10 + i, month: 3, day: 1 },
    )
  }
  console.log(`  「想离开」此刻在【${leaning.stageOf('leave')}】这一档。`)
  console.log(`  他自己的说法：${selfSense().join('　') || '（还说不出什么）'}\n`)

  for (const tags of [['山那边'], ['镇上'], ['在家'], ['私塾']]) {
    const lines = echoesOn(tags)
    console.log(`  这一天在【${tags[0]}】　→　${lines[0] ?? '（什么也没多出来）'}`)
  }

  console.log()
  console.log('  没有新选项，没有任务条，只是他本来就会做的事上多了一句。')
  console.log('  玩家会先觉得这句话眼熟，很久以后才反应过来自己一直在这么干。')

  if (leaning.stageOf('leave') !== '反复' || echoesOn(['山那边']).length === 0) {
    console.log('\n  ✗ 「反复」这一层没有落地。')
    failed += 1
  }
}

// —— 六、火种不许自带剧情 ——
console.log('\n=== 六、火种寄生在已经发生过的事上 ===\n')
{
  const kinds = { 旗标: 0, 知识: 0, 日录标记: 0, 出身: 0, 关系: 0 }
  for (const spark of SPARKS) {
    if (spark.tags) kinds.日录标记 += 1
    for (const condition of spark.requires ?? []) {
      if (condition.flag) kinds.旗标 += 1
      if (condition.knowledge) kinds.知识 += 1
      if (condition.trade) kinds.出身 += 1
      if (condition.bond) kinds.关系 += 1
    }
  }
  console.log(`  一共 ${SPARKS.length} 个火种，它们认的东西：`)
  for (const [kind, n] of Object.entries(kinds)) {
    if (n > 0) console.log(`      ${kind}　${n}`)
  }
  const heavy = SPARKS.filter((spark) => spark.weight > 6)
  console.log()
  if (heavy.length > 0) {
    console.log(`  ✗ ${heavy.length} 个火种权重超过 6——一件事点不着一个念头。`)
    console.log(`    ${heavy.map((s) => s.id).join('、')}`)
    failed += 1
  } else {
    console.log('  没有一个火种自带剧情，全都寄生在已经发生过的事上。')
    console.log('  权重也都很小——**一个人的方向是几十件小事磨出来的。**')
  }
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  念头从人生里长出来，在日子里反复出现，很久以后他才说得出口。')
  console.log('  而绝大多数人一辈子说不出口——正因为如此，说出口的那一句才有分量。\n')
}
