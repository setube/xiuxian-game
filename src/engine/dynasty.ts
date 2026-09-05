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
 * 随机：皇帝在位多少年、崩在哪个月、年号叫什么。
 * 不随机：**制度、频率、时序、纪年方式**——这几样照明代来。
 *
 * - **一帝一元。** 明制自洪武起一帝一元（英宗正统／天顺是复辟造成的例外，这里不做）。
 * - **逾年改元。** 皇帝崩那年仍用旧年号，次年正月改元。隆庆六年五月穆宗崩，
 *   那一年到底都还是隆庆六年，次年才是万历元年。
 * - **在位年数不是均匀的。** 照明代十七帝的实际年数抽（见 `MING_REIGN_YEARS`），
 *   中位十几年，长尾到四十多年，也有不满一年的。
 * - **即位当年就没了的，年号追称。** 光宗即位一月而崩，熹宗诏以那年八月以后为
 *   泰昌元年，次年才改天启。这里照做：死在即位那年的，元年从即位那个月起算。
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
 * 等内容真要写到再加——先只有「崩 → 太子即位 → 逾年改元」这一条。
 */

export interface YearMonth {
  year: number
  month: number
}

/**
 * 明代十七帝各在位多少年。
 *
 * 洪武 建文 永乐 洪熙 宣德 正统 景泰 天顺 成化 弘治 正德 嘉靖 隆庆 万历 泰昌 天启 崇祯。
 * 泰昌那一位是一个月，记作 0——**它不是数据缺失，是一种真实存在的在位长度**。
 * 抽这张表再抖两年，抽出来的分布就是明代的形状：中位十几年，两头都有。
 *
 * 【史料·待核原文，《明史·本纪》】数字是通识，没有逐个对过实录。
 */
export const MING_REIGN_YEARS: readonly number[] = [
  31, 4, 22, 1, 10, 14, 8, 8, 23, 18, 16, 45, 6, 48, 0, 7, 17,
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

/** 抽一个在位年数。0 表示即位当年就没了 */
export function rollReignYears(): number {
  const base = pick(MING_REIGN_YEARS) ?? 14
  return Math.max(0, base + randomBetween(-2, 2))
}

/** 从词库里挑一个没用过的年号。一个王朝用完整张表的情形不会出现，真出现就允许重用 */
function pickEra(names: readonly string[], used: ReadonlySet<string>): string {
  const free = names.filter((name) => !used.has(name))
  return pick(free.length > 0 ? free : names) ?? '承平'
}

/**
 * 前一位崩了，下一位怎么接。
 *
 * 即位就在前一位崩的那个月。改元看两种情形：
 * - 正常：次年正月（逾年改元）。
 * - 即位当年就没了：元年从即位那个月起算（追称），次一位再逾年改元。
 */
export function successor(prev: Reign, names: readonly string[], used: ReadonlySet<string>): Reign {
  if (!prev.death) throw new Error('在位的皇帝没有继任者')
  const accession = { ...prev.death }
  const years = rollReignYears()

  if (years === 0) {
    const death = fromMonthIndex(monthIndex(accession) + randomBetween(1, 11))
    const eraFrom =
      death.year === accession.year ? { ...accession } : { year: accession.year + 1, month: 1 }
    return { era: pickEra(names, used), accession, eraFrom, death }
  }

  return {
    era: pickEra(names, used),
    accession,
    eraFrom: { year: accession.year + 1, month: 1 },
    death: { year: accession.year + years, month: randomBetween(1, 12) },
  }
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
 * 开国那一位当年建元，不逾年——他没有先帝可以守。在位至少五年：
 * 开国即崩的王朝写起来是另一卷书，这里不掷它。
 */
export function foundDynasty(founding: number, until: number, names: readonly string[]): Reign[] {
  const first: Reign = {
    era: pickEra(names, new Set()),
    accession: { year: founding, month: 1 },
    eraFrom: { year: founding, month: 1 },
    death: { year: founding + Math.max(5, rollReignYears()), month: randomBetween(1, 12) },
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
