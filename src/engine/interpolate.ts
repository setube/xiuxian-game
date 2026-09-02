import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import type { NarrativeBlock } from '@/types/game'

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
 */
const TOKENS = /\{(name|home|province|prefecture|here|trade|elder|elders)\}/g

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
 */
function elderCall(): string {
  const people = usePeopleStore()
  for (const bond of ['生父', '抚养', '生母'] as const) {
    for (const id of people.kinOf(bond)) {
      if (people.isAlive(id)) return people.known[id]?.calls ?? '家里的大人'
    }
  }
  return '家里的大人'
}

/** 「爹娘」这种合称。家里只剩一个人的时候，说「爹和娘」就是穿帮 */
function eldersCall(): string {
  const people = usePeopleStore()
  const names: string[] = []
  for (const bond of ['生父', '生母', '抚养'] as const) {
    for (const id of people.kinOf(bond)) {
      if (!people.isAlive(id)) continue
      const calls = people.known[id]?.calls
      if (calls && !names.includes(calls)) names.push(calls)
    }
  }
  if (names.length === 0) return '家里的大人'
  if (names.length === 1) return names[0]!
  return names.slice(0, 2).join('和')
}

/** 把一句话里的占位符换成这一世的实情。没有占位符的原样返回。 */
export function fillString(text: string): string {
  if (!text.includes('{')) return text

  const character = useCharacterStore()
  const household = useHouseholdStore()

  return text.replace(TOKENS, (_, token: string) => {
    if (token === 'elder') return elderCall()
    if (token === 'elders') return eldersCall()
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
