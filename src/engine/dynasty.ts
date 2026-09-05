import type { GameTime, Reign } from '@/types/game'

import { pick, randomBetween } from './random'

/**
 * 王朝史。
 *
 * ## 这一层是从三处已经在等的地方长出来的
 *
 * 1. 每一节标题印的是「人间 · 第十六年 · 三月初七」。**一个明代人不会这么说时间。**
 *    那是界面上出现最频繁的一行字，也是最像「顶部 UI 标签」的一行。
 * 2. `royal.ts`「父皇大行。你的一位兄长即了位。」——皇帝更替从前是宫里那一支的
 *    **私事**：世界层不知道换了皇帝，别的出身的人生里这件事根本不存在。
 * 3. 编年记的是绝对年。
 *
 * ## 随机的是什么，不随机的是什么
 *
 * 随机：皇帝几岁即位、活到几岁、崩在哪个月、年号叫什么。
 * 不随机：**制度、频率、时序、纪年方式**——这几样照明代来。
 *
 * - **一帝一元。** 明制自洪武起一帝一元（英宗正统／天顺是复辟造成的例外，这里不做）。
 * - **逾年改元。** 皇帝崩那年仍用旧年号，次年正月改元。隆庆六年五月穆宗崩，
 *   那一年到底都还是隆庆六年，次年才是万历元年。
 * - **即位当年就没了的，年号追称。** 光宗即位一月而崩，熹宗诏以那年八月以后为
 *   泰昌元年，次年才改天启。这里照做：死在即位那年的，元年从即位那个月起算。
 *
 * ## 皇帝先是一个人，在位年数是推出来的
 *
 * 头一版直接抽「在位几年」。用户不要那个：那是一个没有依据的随机分布，
 * 几年之后会露出游戏数学。现在的次序是——
 *
 *     先帝崩时几岁 → 继任者几岁即位（儿子小十八到三十岁；弟弟、堂弟小一到十五岁）
 *     → 这个人活到几岁（照明代十五帝的寿数抽）→ 在位年数 = 寿数 − 即位年龄
 *
 * 于是寿数、即位年龄、在位年数天然关联：九岁登基的孩子可能坐四十多年，
 * 四十六岁才接位的多半只有几年。宫里那一支的父亲到十六岁还没崩，替他定剩下的日子
 * 也走同一条路（`yearsLeft`）：问他此刻几岁、还能活多久，不是抽「还在位几年」。
 *
 * ## 绝对年留着，年号是它上面的一层
 *
 * `world.time.year` 一个字不动，所有判定照旧读它。年号只管**给人看和给人说**：
 * 标题、编年、老人口中的「那是承和年间的事了」。
 *
 * ## 这里不 import 内容
 *
 * 年号词库在 `content/eras.ts`，由调用方（`stores/world.ts`）传进来。
 * engine → content 是反向依赖，那道门不开（`conditions.ts` 那段注释说的同一件事）。
 *
 * ## 不做
 *
 * 不做朝政。皇帝只有生涯和年号，没有属性，不上朝。禅位、被废、复辟、幼主临朝，
 * 等内容真要写到再加——先只有「崩 → 继任者即位 → 逾年改元」这一条。
 */

export interface YearMonth {
  year: number
  month: number
}

/**
 * 明代皇帝各活了多少岁。
 *
 * 洪武 70、永乐 64、洪熙 47、宣德 36、英宗 37、景泰 29、成化 40、弘治 35、正德 30、
 * 嘉靖 59、隆庆 35、万历 57、泰昌 38、天启 22、崇祯 33。
 * 建文失踪不计；英宗两次在位算一个人。**中位三十七——明代皇帝死得早**，
 * 在位年数的形状（中位十几年）直接来自这一条。
 *
 * 【史料·待核原文，《明史·本纪》】数字是通识，没有逐个对过实录。
 */
export const MING_DEATH_AGES: readonly number[] = [
  70, 64, 47, 36, 37, 29, 40, 35, 30, 59, 35, 57, 38, 22, 33,
]

/** 年月先后。日子不参与——改元、即位、崩，史书都只记到月 */
export function isBefore(a: YearMonth, b: YearMonth): boolean {
  return a.year < b.year || (a.year === b.year && a.month < b.month)
}

function monthIndex(t: YearMonth): number {
  return t.year * 12 + (t.month - 1)
}

/** 绝对年可以是负数（王朝在玩家出生前一两百年就立了），取模要防负 */
function fromMonthIndex(i: number): YearMonth {
  return { year: Math.floor(i / 12), month: ((i % 12) + 12) % 12 + 1 }
}

/** 抽一个人的寿数。抖三年，最少十六——这是「他会活到几岁」，还没问他几岁即位 */
export function rollDeathAge(): number {
  const base = pick(MING_DEATH_AGES) ?? 40
  return Math.max(16, base + randomBetween(-3, 3))
}

/**
 * 这个人此刻几岁、还能活多久。
 *
 * 抽到的寿数比他现在的岁数还小，说明他已经活过了多数皇帝死的年纪——
 * 剩下的日子不多：零到六年，零就是今年之内。这一格不另抽一个分布，
 * 它是「寿数分布已经跑完了」这件事本身。
 */
export function yearsLeft(born: number, now: YearMonth): number {
  const age = now.year - born
  const deathAge = rollDeathAge()
  return deathAge > age ? deathAge - age : randomBetween(0, 6)
}

/** 从「还能活几年」定下崩在哪一年哪一月。零年：从这一刻起一到十一个月内 */
export function deathAfter(from: YearMonth, years: number): YearMonth {
  if (years === 0) return fromMonthIndex(monthIndex(from) + randomBetween(1, 11))
  return { year: from.year + years, month: randomBetween(1, 12) }
}

/** 改元在哪一月：即位当年就没了的追称到即位那月，其余逾年正月 */
function eraFromFor(accession: YearMonth, death: YearMonth): YearMonth {
  return death.year === accession.year ? { ...accession } : { year: accession.year + 1, month: 1 }
}

/** 从词库里挑一个没用过的年号。一个王朝用完整张表的情形不会出现，真出现就允许重用 */
function pickEra(names: readonly string[], used: ReadonlySet<string>): string {
  const free = names.filter((name) => !used.has(name))
  return pick(free.length > 0 ? free : names) ?? '承平'
}

/**
 * 前一位崩了，下一位怎么接。
 *
 * 即位就在前一位崩的那个月。先定**他是谁**：
 * - 先帝有成年的儿子（活过了二十六），八成是儿子接——父亲十八到三十岁上生的，
 *   所以儿子比先帝崩时的年纪小十八到三十岁，可能是个幼主。
 * - 先帝不到二十六就没了，或者别的缘故（兄终弟及、藩王入继——十七帝里这类占三四成），
 *   接位的是同一辈的人：弟弟、堂弟、侄子，小一到十五岁。
 *
 * 然后才问他能活到几岁，在位年数由此推出，不另抽。
 */
export function successor(prev: Reign, names: readonly string[], used: ReadonlySet<string>): Reign {
  if (!prev.death) throw new Error('在位的皇帝没有继任者')
  const accession = { ...prev.death }
  const prevDeathAge = prev.death.year - prev.born
  const collateral = prevDeathAge < 26 || Math.random() < 0.2
  const accessionAge = collateral
    ? Math.max(6, prevDeathAge - randomBetween(1, 15))
    : Math.max(1, prevDeathAge - randomBetween(18, 30))
  const born = accession.year - accessionAge
  const death = deathAfter(accession, yearsLeft(born, accession))
  return { era: pickEra(names, used), born, accession, eraFrom: eraFromFor(accession, death), death }
}

/**
 * 顺着最后一位往后生成，直到有人活过 `until` 那一年。
 *
 * 最后一位若 `death` 是 null（宫里那一支的在位皇帝，他什么时候崩由 `royal.ts` 定），
 * 什么也不做——他没崩，就没有下一位。
 */
export function extendReigns(
  reigns: readonly Reign[],
  until: number,
  names: readonly string[],
): Reign[] {
  const out = [...reigns]
  const used = new Set(out.map((r) => r.era))
  let last = out[out.length - 1]
  if (!last) throw new Error('没有开国皇帝')
  while (last.death && last.death.year <= until) {
    const next = successor(last, names, used)
    used.add(next.era)
    out.push(next)
    last = next
  }
  return out
}

/**
 * 立一个王朝。
 *
 * 开国的多半是壮年人（二十五到四十五岁），当年建元，不逾年——他没有先帝可以守。
 * 在位至少五年：开国即崩的王朝写起来是另一卷书，这里不掷它。
 */
export function foundDynasty(founding: number, until: number, names: readonly string[]): Reign[] {
  const accession = { year: founding, month: 1 }
  const born = founding - randomBetween(25, 45)
  const death = deathAfter(accession, Math.max(5, yearsLeft(born, accession)))
  const first: Reign = {
    era: pickEra(names, new Set()),
    born,
    accession,
    eraFrom: { ...accession },
    death,
  }
  return extendReigns([first], until, names)
}

/**
 * 那一刻用的是哪个年号、第几年。
 *
 * 取最后一个 `eraFrom` 不晚于那一刻的。王朝立国之前的日子返回 null——
 * 立国在玩家出生前一两百年，正常不会碰到。
 */
export function eraAt(reigns: readonly Reign[], at: YearMonth): { name: string; year: number } | null {
  let current: Reign | null = null
  for (const reign of reigns) {
    if (isBefore(at, reign.eraFrom)) break
    current = reign
  }
  return current ? { name: current.era, year: at.year - current.eraFrom.year + 1 } : null
}

/**
 * 那一刻坐在龙椅上的是第几位。
 *
 * 跟 `eraAt` 不是一回事：崩了之后到改元之前的那几个月，年号还是他的，
 * 龙椅上已经是他儿子了。
 */
export function reigningAt(reigns: readonly Reign[], at: YearMonth): number {
  let index = -1
  reigns.forEach((reign, i) => {
    if (isBefore(at, reign.accession)) return
    if (reign.death && !isBefore(at, reign.death)) return
    index = i
  })
  return index
}

/**
 * 在位的这一位此刻崩了。
 *
 * 宫里那一支的「父皇大行」从这儿接进王朝史：他的死由内容定，不由掷定。
 * 他之后原本生成好的那几位作废，从这一刻重新往后生成。
 */
export function endReign(
  reigns: readonly Reign[],
  at: YearMonth,
  until: number,
  names: readonly string[],
): Reign[] {
  const i = reigningAt(reigns, at)
  if (i < 0) return [...reigns]
  const ended: Reign = { ...reigns[i]!, death: { year: at.year, month: at.month } }
  return extendReigns([...reigns.slice(0, i), ended], until, names)
}

/** `GameTime` 直接当 `YearMonth` 用的地方，收口成一个函数，免得到处 `{ year, month }` */
export function yearMonth(time: GameTime): YearMonth {
  return { year: time.year, month: time.month }
}
