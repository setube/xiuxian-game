import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import type { Bond, NarrativeBlock } from '@/types/game'

import { kinCall, titleNow } from './address'
import { isNearby } from './nearby'

/**
 * 正文里的占位符。
 *
 * 剧本是静态数据，可这一世的姓名、家乡、行当都是出生那一刻掷出来的。
 * 绝大多数正文不该提名字——名字常驻在人物面板上，不必在文中反复念。
 * 但有几处非提不可：老先生提笔写下的那两个字，多年以后有人第一次叫你。
 * 那几处写 `{name}`，落纸之前在这里换掉。
 *
 * 地名分四级，各有各的用处：
 *
 * - `{home}` 完整门牌（云州 · 临江府 · 柳溪村），给状态栏那种地方
 * - `{province}` 州（云州）
 * - `{prefecture}` 府（临江府）
 * - `{here}` 街巷村名（柳溪村）——正文里说「你生在……」时，
 *   一个人不会把整条行政区划念一遍
 *
 * 生在京城的皇室，`{province}` 与 `{prefecture}` 指的是他日后被贬去的府。
 * 在旨意下来之前，那两个字不该出现在他的正文里。
 *
 * `{elder}` 与 `{elders}` 是另一类：它们问的不是家世，是**关系网**。
 * 详见下面两个函数——那是「不能假定每个人都有爹娘」在正文层的落点。
 *
 * `{chore}` 与 `{putsAway}` 是第三类，问的是**这家人过的是什么日子**。
 * 它们补的正是下面那段警告里说的那个洞：`{elder}` 换得掉主语，
 * 换不掉「一把锄头」。见 `content/living.ts`。
 *
 * `{title}` 是第四类，也是唯一一个**方向反过来**的：上面那些问的都是
 * 他怎么称呼世界，这一个问的是**世界怎么称呼他**。两个方向的来源
 * 不一样，所以会脱节——见 `engine/address.ts`。
 */
const TOKENS =
  /\{(name|home|province|prefecture|here|trade|elder|elders|dam|chore|putsAway|title)\}/g

/**
 * 挑一个还在身边的关系人，按给定的优先次序。
 *
 * 这是 `{elder}` / `{dam}` 共用的那一步：**先问关系网，再落笔**。
 *
 * 问的是「在不在身边」而不是「还活不活着」，而这两问的分别是被削爵那一卷
 * 逼出来的：迁出京城以后，即位的兄长仍然活着、那条边也仍然在，
 * 可他不在这个院子里。只问死活的话，「{elder}把那身蟒袍收进箱子」
 * 会由一个远在千里之外的人来做。
 *
 * 死了的自然也不在身边（见 `engine/nearby.ts`），所以这一改只收紧不放宽。
 *
 * 找着人之后还有一步：**管他叫什么，得看这个人是在哪儿学会说话的。**
 * `kinCall` 答得上来就用那个字（宫里长大的孩子管爹叫「爹爹」），
 * 答不上来才落回 `calls`——境况表里那个「爹」。回落不是兜底失败，
 * 那就是寻常人家那一套本身，十来种营生的人家在这一格上没有分别。
 */
function callByBond(order: readonly Bond[]): string {
  const people = usePeopleStore()
  for (const bond of order) {
    for (const id of people.kinOf(bond)) {
      if (isNearby(id)) return kinCall(bond) ?? people.known[id]?.calls ?? '家里的大人'
    }
  }
  return '家里的大人'
}

/**
 * 「管这个家的大人」此刻是谁。
 *
 * 剧本里大量的「父亲说」「跟着父亲下地」，对生下来就没爹的人是穿帮。
 * 但逐句改写要动几百行正文，而且改完还是死的——
 * 爹活着时叫爹，爹死在外地之后呢？
 *
 * 所以正文写 `{elder}`，落纸时问关系网：有爹叫爹，没爹就叫养你的那个人，
 * 一个都没有就是「家里的大人」。同一句正文，对谁都成立，
 * 而且会跟着这个人的境遇一起变。
 *
 * ⚠️ **这是过渡方案，不是终局。**
 *
 * `{elder}` 只解决「谁在做这件事」，解决不了「他为什么会做这件事」。
 * 老乞丐、长姐、寺里的师父、亲爹，不可能共享同一套生活内容——
 * 「每天傍晚去地里站一会儿」这种句子，换个主语仍然是错的，
 * 因为讨饭的人没有地。
 *
 * 所以往后写新正文的规矩是：
 *
 * 1. 只写谁都可能做的事：`{elder}每天傍晚都会出去一趟。`
 * 2. 真要写只有某种人才做的事，就给那一卷加 requires 把关系锁住，
 *    然后正文里放心写「父亲」。
 *
 * 不要让 `{elder}` 变成祖传抽象。它是拆硬编码用的撬棍，不是地基。
 *
 * ✅ **上面那个洞后来补上了一半**，见 `{chore}` / `{putsAway}`：
 * 「他在做什么」这一类由 `household.living` 回答，
 * 而只有一件活可摆弄的人家才配用那两个记号——宫里的 `chore` 是 null，
 * 于是那一整卷对皇室不成立，靠的是 `requires: [{ living: ... }]`，
 * 不是换个物件接着演。第 2 条规矩因此有了机器守着的形式。
 */
function elderCall(): string {
  return callByBond(['生父', '抚养', '生母'])
}

/**
 * 「娘」这个位置上此刻是谁。
 *
 * 跟 `{elder}` 分开是必须的：一个由长姐拉扯大的孩子，
 * 「娘把你放在田埂上」是穿帮，但「姐把你放在田埂上」成立。
 * 同理，生母难产而亡、爹一个人把他带大的，这个位置就是爹。
 */
function damCall(): string {
  return callByBond(['生母', '抚养', '生父'])
}

/**
 * 「爹娘」这种合称。家里只剩一个人的时候，说「爹和娘」就是穿帮。
 *
 * 跟 `callByBond` 同一条线：数的是**此刻在这个家里的**那几个人，
 * 不是名册上还活着的那几个。爹在外县修河堤的那两年，
 * 「爹和娘一起坐在灯下」不该成立。
 */
function eldersCall(): string {
  const people = usePeopleStore()
  const names: string[] = []
  for (const bond of ['生父', '生母', '抚养'] as const) {
    for (const id of people.kinOf(bond)) {
      if (!isNearby(id)) continue
      const calls = kinCall(bond) ?? people.known[id]?.calls
      if (calls && !names.includes(calls)) names.push(calls)
    }
  }
  if (names.length === 0) return '家里的大人'
  if (names.length === 1) return names[0]!
  return names.slice(0, 2).join('和')
}

/**
 * 手上那件活。
 *
 * 问的是 `character.living`——三级链解析完的那一格，不是 `household.living`。
 * 这个分别在削爵那一卷之后才看得出来：迁出京城以后，
 * 家里的营生还是「皇室」，而他手上那件活得由他现在过的日子说了算。
 *
 * 兜底那句「手里的东西」是给**写漏了 requires 的那一卷**准备的：
 * 宫里没有这样一件活（`chore` 是 null），正文本不该走到这儿。
 * 兜底不是补救，是让穿帮变成一句读得出来的怪话，
 * 而不是一个静默的 `undefined`——真正拦它的是 `scripts/upbringing.ts`。
 */
function choreCall(): string {
  return useCharacterStore().living.chore?.holds ?? '手里的东西'
}

/** 收工时是怎么收的。同上，宫里没有这一格 */
function putsAwayCall(): string {
  return useCharacterStore().living.chore?.putsAway ?? '把手里的东西放下'
}

/** 把一句话里的占位符换成这一世的实情。没有占位符的原样返回。 */
export function fillString(text: string): string {
  if (!text.includes('{')) return text

  const character = useCharacterStore()
  const household = useHouseholdStore()

  return text.replace(TOKENS, (_, token: string) => {
    if (token === 'elder') return elderCall()
    if (token === 'dam') return damCall()
    if (token === 'elders') return eldersCall()
    if (token === 'chore') return choreCall()
    if (token === 'putsAway') return putsAwayCall()
    if (token === 'title') return titleNow()
    if (token === 'name') return character.name
    if (token === 'home') return household.home
    if (token === 'province') return household.province
    if (token === 'prefecture') return household.prefecture
    if (token === 'here') return household.locale
    return household.trade
  })
}

/** 把一段正文里的占位符换成这一世的实情。没有占位符的原样返回。 */
export function fill(blocks: readonly NarrativeBlock[]): NarrativeBlock[] {
  return blocks.map((block) => {
    if (block.kind === 'divider') return block
    if (block.kind === 'heading') return { ...block, title: fillString(block.title) }
    if (block.kind === 'dialogue' && block.speaker) {
      return { ...block, speaker: fillString(block.speaker), text: fillString(block.text) }
    }
    return { ...block, text: fillString(block.text) }
  })
}
