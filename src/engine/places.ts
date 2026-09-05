import type { Place, PlaceKind, ResidenceKind, SettlementKind } from '@/types/game'

/**
 * 地域：一处地方挂在哪一级底下，脚下这一处归哪一级聚落。
 *
 * 这里只有纯函数，不碰仓库。仓库（`stores/world.ts`）存 `places`，
 * 这里替它算。两棵树的规矩见 `types/game.ts` 的 `Place`。
 */

/**
 * 哪一级能挂在哪一级底下。
 *
 * 两棵树的全部规矩就是这张表：京师那棵和府域那棵各走各的，
 * 「村」不能挂在「京师」下，「坊」不能挂在「府」下。
 * `scripts/dwelling.ts` 拿它查每一世的树。
 */
export const PLACE_PARENTS: Readonly<Record<PlaceKind, readonly PlaceKind[]>> = {
  京师: [],
  皇城: ['京师'],
  宫城: ['皇城'],
  坊: ['京师'],
  府: [],
  县: ['府'],
  城: ['县'],
  镇: ['县'],
  村: ['镇'],
  街: ['城', '坊'],
  宅: ['街', '村'],
  寺: ['街', '村', '城'],
  王府: ['城'],
  宫: ['宫城'],
}

/** 哪几级算「聚落」——人归在哪儿、多久见一次外乡人，看这一级 */
export const SETTLEMENT_KINDS: readonly SettlementKind[] = ['村', '镇', '城', '京师']

/** 从脚下这一处一路往上到顶。断了链、绕了圈都在这儿停 */
export function chainOf(places: Readonly<Record<string, Place>>, id: string): Place[] {
  const chain: Place[] = []
  const seen = new Set<string>()
  let cursor: string | null = id
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const place: Place | undefined = places[cursor]
    if (!place) break
    chain.push(place)
    cursor = place.within
  }
  return chain
}

/** 这一处归在哪一级聚落。宅归村，街归城，宫归京师 */
export function settlementOf(places: Readonly<Record<string, Place>>, id: string): Place | null {
  return (
    chainOf(places, id).find((place) => SETTLEMENT_KINDS.includes(place.kind as SettlementKind)) ??
    null
  )
}

/** 脚下这一处是什么样的地方。没有居所（讨饭、逃难）就是「无」 */
export function residenceKindOf(place: Place | null | undefined): ResidenceKind {
  if (!place) return '无'
  if (place.kind === '宅' || place.kind === '寺' || place.kind === '王府' || place.kind === '宫') {
    return place.kind
  }
  return '无'
}

/** 同一级底下的别的地方：邻村是同一个镇底下的别的村 */
export function siblingsOf(
  places: Readonly<Record<string, Place>>,
  id: string,
  kind: PlaceKind,
): Place[] {
  const self = places[id]
  if (!self) return []
  return Object.values(places).filter(
    (place) => place.id !== id && place.kind === kind && place.within === self.within,
  )
}

/**
 * 这棵树立得对不对。
 *
 * 三样：每一处的上一级得是表里允许的；顶上只能是京师或府；不许绕圈。
 * 这一支是给走查用的，也给自检用——喂一棵「村挂在京师下」的树，它得说话。
 */
export function faultsOfTree(places: Readonly<Record<string, Place>>): string[] {
  const faults: string[] = []
  for (const place of Object.values(places)) {
    if (place.within === null) {
      if (place.kind !== '京师' && place.kind !== '府') {
        faults.push(`「${place.name}」（${place.kind}）没有上一级，可它不是京师也不是府`)
      }
      continue
    }
    const parent = places[place.within]
    if (!parent) {
      faults.push(`「${place.name}」（${place.kind}）挂在一处不存在的 ${place.within} 下`)
      continue
    }
    if (!PLACE_PARENTS[place.kind].includes(parent.kind)) {
      faults.push(
        `「${place.name}」（${place.kind}）挂在「${parent.name}」（${parent.kind}）下——两棵树串了`,
      )
    }
    const chain = chainOf(places, place.id)
    if (chain[chain.length - 1]?.within !== null) {
      faults.push(`「${place.name}」往上走到不了顶——断了链或者绕了圈`)
    }
  }
  return faults
}
