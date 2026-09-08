/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 丧事之后（24.md 剩下的两件：幸存者的反应做内容；死因有了第一个读者）。
 *
 * 一、一批效果说的是同一刻的人。「他没能熬过去」那一批先殁了爹，后一条编年写 `{elder}`——
 *     从前落到娘身上，编年记下「娘那年入冬没能熬过去」，而娘活得好好的；守孝那一笔记的是
 *     「elder」两个字母，不是人。现在角色在一批开头认一次（`snapshotRoles`）。
 * 二、守孝记的是人：病没在家的、死在外地的、老屋娘没了的，各自开一份孝，媒人三年不上门；
 *     服满那一卷收掉它，按死因分话——死在外地的没有坟可上。这是 `death.cause` 的第一个读者。
 * 三、同一场丧事，各人各是一种反应：你自己的看你那阵子做了什么，娘的看娘的性情，哥的看哥的性情。
 *     不是「关系越亲越悲伤」——每一句都反着验：人不在、性情不对，那句话就不许出现。
 * 四、死亡改变往后的选择，而且不是所有人同一个方向：问过坟在哪的记着那个地名（想走），
 *     没问的再没提过出门（想守着）。同一个死讯，两条相反的去向，分的是你做过什么。
 * 五、随机人生只报数：谁没了、怎么没的、编年那句记的是不是没了的那个人、
 *     守孝记录上没有活人、没有角色名。
 */
import './lib/seeded'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { dampen, kindle } from '../src/engine/leanings'
import { useCharacterStore } from '../src/stores/character'
import { useLeaningStore } from '../src/stores/leanings'
import type { Temper } from '../src/types/game'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import type { MournedLife } from './tasks/mourning-lives'

const LIVES = 120

const eventOf = (id: string) => lifeEvents.find((one) => one.id === id)

let bad = 0

/** 农户人家的孩子十岁，爹娘都在。哥在不在看掷出来的境况 */
const child = (): Staged | null => born('farm', 10, ['father', 'mother'])

/** 爹病没了：直接演「没了」那一节（前头那一掷不由人） */
function fatherDiesOfIllness(choice: 'watch' | 'herbs' | 'work'): string[] {
  const scene = lifeScenes['need:illness']!
  const picked = scene.nodes['open']!.choices!.find((one) => one.id === choice)!
  applyEffects(picked.effects)
  return play('need:illness', undefined, 'died')
}

/** 爹客死：借债、出门、消息 */
function fatherDiesAway(s: Staged, ask: boolean): string[] {
  play('debt:drought')
  play('debt:borrow', 'sit')
  play('debt:leave', 'follow')
  applyEffects([{ type: 'flag', key: 'father-fate', value: '亡' }])
  const texts = play('debt:death', ask ? 'ask-where' : 'silent')
  if (s.people.isAlive('father')) throw new Error('摆局：客死那一卷演完父亲还活着')
  return texts
}

// ============================================================
// 一、一批效果说的是同一刻的人
// ============================================================
{
  const wrong: string[] = []
  const s = child()
  if (!s) wrong.push('掷不出局')
  else {
    const character = useCharacterStore()
    // 没人殁的一批：{elder} 照旧是爹
    applyEffects([{ type: 'chronicle', text: '{elder}在檐下坐了一会儿。' }])
    const calm = s.world.chronicle[s.world.chronicle.length - 1]?.text ?? ''
    if (!calm.startsWith('爹')) wrong.push(`没人殁的一批，{elder} 该是爹，写的是「${calm}」`)
    // 爹殁的那一批：前一条殁了他，后一条说的还是他
    fatherDiesOfIllness('watch')
    const line = s.world.chronicle.find((one) => one.text.includes('没能熬过去'))?.text ?? ''
    if (!line.startsWith('爹'))
      wrong.push(`爹殁了那一批，编年该写「爹那年入冬没能熬过去」，写的是「${line}」`)
    if (!s.people.isAlive('mother')) wrong.push('摆局：娘不该殁')
    const record = character.undertakings.find((one) => one.id === 'mourning' && one.until === null)
    if (!record) wrong.push('爹殁了，没有守孝这件事')
    else if (record.who !== 'father')
      wrong.push(`守孝记的该是爹（father），记的是「${record.who}」`)
    // 爹殁了之后的下一批：{elder} 落到娘身上——快照只管一批，不是把人钉死
    applyEffects([{ type: 'chronicle', text: '{elder}在檐下坐了一会儿。' }])
    const after = s.world.chronicle[s.world.chronicle.length - 1]?.text ?? ''
    if (!after.startsWith('娘')) wrong.push(`爹殁了之后的一批，{elder} 该是娘，写的是「${after}」`)
    // 身边没有这样的人：那一条效果不落，不造幽灵
    applyEffects([{ type: 'person', id: 'mother', fate: '殁', cause: '病' }])
    const before = character.undertakings.length
    applyEffects([{ type: 'undertake', undertaking: 'mourning', who: 'elder' }])
    if (character.undertakings.length !== before)
      wrong.push('爹娘都不在了，undertake who: elder 却落了一条')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、同一刻的人：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、一批效果说的是同一刻的人：爹殁了那一批编年写的是爹，守孝记的是爹；下一批 {elder} 才落到娘身上；没有这样的人那一条不落。',
    )
}

// ============================================================
// 二、守孝记的是人；服满按死因分话（死因的第一个读者）
// ============================================================
{
  const wrong: string[] = []
  const notMourning = [{ undertaking: { not: 'mourning' } }] as const
  // 病没在家：守孝；服满去了坟上
  const a = child()
  if (!a) wrong.push('掷不出局')
  else {
    const character = useCharacterStore()
    if (!meetsAll(notMourning)) wrong.push('还没死人就在守孝')
    fatherDiesOfIllness('work')
    if (meetsAll(notMourning)) wrong.push('爹病没了，「没在守孝」却仍成立——媒人照样上门')
    if (!meetsAll([{ family: { id: 'father', alive: false, cause: ['病'] } }]))
      wrong.push('爹是病没的，cause 条件却问不出来')
    if (meetsAll([{ family: { id: 'father', alive: false, cause: ['客死'] } }]))
      wrong.push('爹是病没的，却答成客死')
    const over = play('mourning:over')
    if (!over.some((line) => line.includes('去了一趟坟上')))
      wrong.push(`病没在家的，服满该去坟上：${over.join(' / ')}`)
    if (over.some((line) => line.includes('二百里外')))
      wrong.push('病没在家的，服满却说坟在二百里外')
    if (!meetsAll(notMourning)) wrong.push('服满了，守孝还没收掉')
    if (!character.undertakings.some((one) => one.id === 'mourning' && one.until !== null))
      wrong.push('服满了，记录该封口不该删')
  }
  // 客死：也守孝；服满没有坟可上
  const b = child()
  if (!b) wrong.push('掷不出第二局')
  else {
    fatherDiesAway(b, false)
    if (meetsAll(notMourning)) wrong.push('爹死在外地，「没在守孝」却仍成立——死在外地也是丁忧')
    if (!meetsAll([{ family: { id: 'father', alive: false, cause: ['客死'] } }]))
      wrong.push('爹是客死的，cause 条件却问不出来')
    const over = play('mourning:over')
    if (!over.some((line) => line.includes('二百里外')))
      wrong.push(`死在外地的，服满该说坟在二百里外：${over.join(' / ')}`)
    if (over.some((line) => line.includes('去了一趟坟上')))
      wrong.push('死在外地的，服满却去了一趟坟上')
    if (!over.some((line) => line.startsWith('爹的坟')))
      wrong.push('那句话该说「爹的坟」，说的是别人')
    if (!meetsAll(notMourning)) wrong.push('服满了，守孝还没收掉')
  }
  // 活着的人问不出死因
  const c = child()
  if (!c) wrong.push('掷不出第三局')
  else if (meetsAll([{ family: { id: 'father', cause: ['病', '客死', '老病'] } }]))
    wrong.push('爹活着，死因条件却成立')
  // 媒人那一卷真的问了这一格
  const offer = eventOf('match-offer')
  if (!offer?.requires?.some((one) => one.undertaking?.not === 'mourning'))
    wrong.push('媒人上门那一卷没问「没在守孝」，守孝挡不住谁')
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、守孝与死因：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 二、病没的、客死的都守孝，服满收掉；死在外地的没有坟可上——死因有了读者，活人问不出死因。',
    )
}

// ============================================================
// 三、同一场丧事，各人各是一种反应
// ============================================================
{
  const wrong: string[] = []
  type Case = { who: 'mother' | 'brother'; temper: Temper; want: string; forbid: string }
  const cases: Case[] = [
    { who: 'mother', temper: '刚硬', want: '一滴泪没掉', forbid: '哭了好几夜' },
    { who: 'mother', temper: '温和', want: '哭了好几夜', forbid: '一滴泪没掉' },
    { who: 'mother', temper: '精明', want: '药方', forbid: '哭了好几夜' },
    { who: 'mother', temper: '木讷', want: '不到十句', forbid: '药方' },
    { who: 'brother', temper: '暴躁', want: '把郎中骂了一顿', forbid: '一句话也没说' },
    { who: 'brother', temper: '温和', want: '留下的活全接了过去', forbid: '把郎中骂了一顿' },
  ]
  for (const one of cases) {
    const s = one.who === 'brother' ? born('farm', 10, ['father', 'mother', 'brother']) : child()
    if (!s) {
      wrong.push(`${one.who} ${one.temper}：掷不出局`)
      continue
    }
    s.people.amend(one.who, { temper: one.temper })
    const texts = fatherDiesOfIllness('work')
    if (!texts.some((line) => line.includes(one.want)))
      wrong.push(`${one.who} ${one.temper} 该说「${one.want}」：${texts.slice(-4).join(' / ')}`)
    if (texts.some((line) => line.includes(one.forbid)))
      wrong.push(`${one.who} ${one.temper} 不该说「${one.forbid}」`)
  }
  // 人不在：娘先没了，她那一句一句也不许有
  const gone = child()
  if (!gone) wrong.push('掷不出局')
  else {
    gone.people.amend('mother', { temper: '温和' })
    applyEffects([{ type: 'person', id: 'mother', fate: '殁', cause: '病' }])
    const texts = fatherDiesOfIllness('work')
    if (texts.some((line) => line.startsWith('娘')))
      wrong.push(`娘不在了，丧事之后却有娘的反应：${texts.find((l) => l.startsWith('娘'))}`)
  }
  // 哥不在场：哥去了外县，他那一句不许有
  const away = born('farm', 10, ['father', 'mother', 'brother'])
  if (!away) wrong.push('掷不出局')
  else {
    away.people.amend('brother', { temper: '暴躁', place: '邻县 · 河堤工地' })
    const texts = fatherDiesOfIllness('work')
    if (texts.some((line) => line.includes('把郎中骂了一顿')))
      wrong.push('哥在外县，丧事上却把郎中骂了一顿')
  }
  // 你自己的那一句看你那阵子做了什么
  for (const [choice, want, forbid] of [
    ['watch', '有一回醒了', '那半个月你在外头干活'],
    ['herbs', '一副也没喝完', '有一回醒了'],
    ['work', '那半个月你在外头干活', '一副也没喝完'],
  ] as const) {
    const s = child()
    if (!s) {
      wrong.push(`${choice}：掷不出局`)
      continue
    }
    const texts = fatherDiesOfIllness(choice)
    if (!texts.some((line) => line.includes(want)))
      wrong.push(`${choice} 该说「${want}」：${texts.slice(-4).join(' / ')}`)
    if (texts.some((line) => line.includes(forbid))) wrong.push(`${choice} 不该说「${forbid}」`)
  }
  /**
   * 客死那一卷：娘的反应看性情，哥要去算账。
   *
   * 这条链从旱到消息推了三年上下，娘也在老：health 掷得低的那几局，她在链尾已经老病没了
   * （种子 1b60fk51lmc9：娘四十四岁、health 41，第三年殁，`{dam}` 落成「家里的大人」）。
   * 那一句没有是对的——人不在了。摆局掷到她还在为止，不是让她不死：那是引擎的事，不是尺子的。
   */
  const awayWith = (
    who: 'mother' | 'brother',
    temper: Temper,
  ): { texts: string[]; here: boolean } | null => {
    for (let tries = 0; tries < 12; tries += 1) {
      const s = who === 'brother' ? born('farm', 10, ['father', 'mother', 'brother']) : child()
      if (!s) continue
      s.people.amend(who, { temper })
      const texts = fatherDiesAway(s, false)
      if (s.people.isAlive(who)) return { texts, here: true }
    }
    return null
  }
  for (const [temper, want] of [
    ['暴躁', '骂了半夜'],
    ['刚硬', '一滴泪没掉'],
    ['温和', '多摆了一副碗筷'],
    ['谨慎', '不许你跟人出去做工'],
  ] as const) {
    const got = awayWith('mother', temper)
    if (!got) {
      wrong.push(`客死 ${temper}：十二局里娘没有一局活到链尾，摆不出局`)
      continue
    }
    if (!got.texts.some((line) => line.includes(want)))
      wrong.push(`客死，娘 ${temper} 该说「${want}」：${got.texts.slice(-4).join(' / ')}`)
  }
  {
    const got = awayWith('brother', '暴躁')
    if (!got) wrong.push('客死，暴躁的哥：摆不出局')
    else if (!got.texts.some((line) => line.includes('算账')))
      wrong.push(`客死，暴躁的哥该要去算账：${got.texts.slice(-4).join(' / ')}`)
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、各人各是一种反应：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 三、同一场丧事：你的那句看你做了什么，娘的看娘的性情，哥的看哥的性情；人不在、不在场，那句话就没有。',
    )
}

// ============================================================
// 四、死亡改变往后的选择，而且不是同一个方向
// ============================================================
{
  const wrong: string[] = []
  // 没问坟在哪：想走的念头被压下去，想守着的顶上来
  const a = child()
  if (!a) wrong.push('掷不出局')
  else {
    const leaning = useLeaningStore()
    fatherDiesAway(a, false)
    leaning.stir('leave', 6, { at: { ...a.world.time }, text: '摆局' }, a.world.time)
    const leaveBefore = leaning.weightOf('leave')
    const settleBefore = leaning.weightOf('settle')
    const lines = dampen([])
    if (!lines.some((line) => line.includes('出门这两个字')))
      wrong.push(`爹死在外地、没问坟在哪，该压下想走的念头：${lines.join(' / ')}`)
    if (leaning.weightOf('leave') >= leaveBefore) wrong.push('压了，想走的念头却没轻')
    if (leaning.weightOf('settle') <= settleBefore) wrong.push('压了想走，想守着的却没顶上来')
    kindle([])
    if (leaning.weightOf('leave') > leaveBefore - 4)
      wrong.push('没问坟在哪，「记着那个地名」却点着了')
  }
  // 问了坟在哪：记着那个地名，想走的念头点起来
  const b = child()
  if (!b) wrong.push('掷不出第二局')
  else {
    const leaning = useLeaningStore()
    fatherDiesAway(b, true)
    const before = leaning.weightOf('leave')
    kindle([])
    if (leaning.weightOf('leave') <= before)
      wrong.push('问了坟在哪，「记着那个地名」却没点着想走的念头')
  }
  // 病没在家：不压（他没死在路上）
  const c = child()
  if (!c) wrong.push('掷不出第三局')
  else {
    const leaning = useLeaningStore()
    fatherDiesOfIllness('work')
    leaning.stir('leave', 6, { at: { ...c.world.time }, text: '摆局' }, c.world.time)
    const lines = dampen([])
    if (lines.some((line) => line.includes('出门这两个字')))
      wrong.push('爹病没在家里，却按「死在外地」压了想走的念头')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 四、往后的选择：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 四、同一个死讯两个方向：没问坟在哪的再没提过出门，问了的记着那个地名；病没在家的不压。',
    )
}

// ============================================================
// 五、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  const lives = (
    await mapShards<MournedLife[]>({ task: 'scripts/tasks/mourning-lives.ts', runs: LIVES })
  ).flat()
  const deaths = lives.flatMap((one) => one.deaths)
  const ways = new Map<string, number>()
  for (const one of deaths) ways.set(one.cause, (ways.get(one.cause) ?? 0) + 1)
  console.log(
    `\n  ${lives.length} 世农户到十六岁：家里没了 ${deaths.length} 个人（${[...ways].map(([k, n]) => `${k} ${n}`).join('，') || '一个也没有'}）；` +
      `守过孝 ${lives.filter((one) => one.mourned > 0).length} 世，服满 ${lives.filter((one) => one.over > 0).length} 世`,
  )
  for (const one of lives) {
    for (const line of one.misnamed) wrong.push(`编年说没了的不是没了的那个人：「${line}」`)
    for (const who of one.mourningLiving) wrong.push(`给活人守孝：${who}`)
    for (const who of one.mourningRole) wrong.push(`守孝记的是角色名不是人：${who}`)
  }
  if (deaths.length === 0) console.log('  · 这一把没有一世死过人，第五条没有可判的')
  if (wrong.length > 0) {
    console.log(`  ✗ 五、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log('  ✓ 五、编年里没了的都是真没了的人；守孝记录上没有活人、没有角色名。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log(
    '  丧事之后：一批效果说的是同一刻的人；守孝记的是人，服满按死因分话；各人各是一种反应——五条全部成立。\n',
  )
}
