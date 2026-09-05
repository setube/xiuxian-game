/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 年号与王朝史的走查。
 *
 * ## 这一支守的是「随机，但在一个真实可行的制度里随机」
 *
 * 年号系统的规格是：皇帝生涯随机 + 改元时机随机 + 年号文本随机，
 * **制度、频率、时序、纪年方式必须符合时代逻辑**。随机那一半没什么可查的，
 * 这一支查的全是不随机的那一半：
 *
 *   一、逾年改元——崩那年仍用旧年号，次年正月改元；即位当年就没了的追称
 *   二、年号文本——出自那张人工筛过的表，一个王朝里不重，明代的一个不许有
 *   三、在位年数——中位十几年，长尾到四十多年，也有不满一年的；不是均匀的
 *   四、纪年连续——每个月都有年号，正月加一，改元归元年，永远不出「〇年」
 *   五、真人生——每一世出生那一刻就有年号；跨过皇帝的死会记一笔；
 *       宫里那一支的「父皇大行」和世界的改元对得上，且编年上不挨着两行
 *   六、皇帝是人——即位时至少一岁，崩时不比即位时小，继任者比先帝年轻；
 *       寿数的形状是明代的（多半死在三四十岁上下）
 *
 * ## 跟别的走查不一样的地方
 *
 * 前四条不跑人生，直接立三百个王朝量结构——一个王朝几十毫秒，
 * 三百个王朝把在位分布的形状量出来绰绰有余。第五条才跑真人生，
 * 而宫里那一支一百世里只有一世，得单独掷到够数为止。
 *
 * 跑法：bun scripts/dynasty.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { ERA_NAMES, NOT_ERA_CHARS, REAL_MING_ERAS } from '../src/content/eras'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { describeEra } from '../src/engine/describe'
import { eraAt, foundDynasty, isBefore } from '../src/engine/dynasty'
import { useStory } from '../src/engine/story'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { Reign } from '../src/types/game'

const DYNASTIES = 300
const LIVES = 120
/**
 * 宫里那一支要掷到几世**真的坠落**。
 *
 * 不是掷到几世宫里的。掷出「倾」的只有四成多，坠落那一卷窗口只有三年，
 * 八世宫里的一世也没坠是三分之一的事——头一版固定掷八世再判「零世坠落」，
 * 这条门禁十次里会无故红一次，而那正是这套走查最忌讳的事：
 * 红的原因是抽样不是内容。要验的是「坠落和王朝史接不接得上」，
 * 那就一直掷到有这么多世真的坠了。
 */
const COURT_FALLS = 4

const NAMES = ERA_NAMES.map((one) => one.text)

// ============================================================
// 判据本体。写成函数，是为了第六条能拿坏数据喂它们
// ============================================================

/**
 * 一、逾年改元。
 *
 * 开国那一位当年建元（他没有先帝可守）。往后每一位：
 * 即位当年就没了的，元年从即位那个月起算（追称）；其余次年正月改元。
 */
function faultsOfSuccession(reigns: readonly Reign[]): string[] {
  const faults: string[] = []
  reigns.forEach((reign, i) => {
    const { accession, eraFrom, death } = reign
    if (i === 0) {
      if (eraFrom.year !== accession.year || eraFrom.month !== accession.month) {
        faults.push(`开国的${reign.era}没有当年建元`)
      }
      return
    }
    const shortLived = death !== null && death.year === accession.year
    if (shortLived) {
      if (eraFrom.year !== accession.year || eraFrom.month !== accession.month) {
        faults.push(`${reign.era}即位当年就没了，年号却没有追称到即位那个月`)
      }
      return
    }
    if (eraFrom.year !== accession.year + 1 || eraFrom.month !== 1) {
      faults.push(
        `${reign.era}即位在 ${accession.year} 年 ${accession.month} 月，` +
          `改元却在 ${eraFrom.year} 年 ${eraFrom.month} 月——不是逾年正月`,
      )
    }
    const prev = reigns[i - 1]!
    if (!prev.death || prev.death.year !== accession.year || prev.death.month !== accession.month) {
      faults.push(`${reign.era}的即位不在前一位崩的那个月`)
    }
  })
  return faults
}

/** 二、年号文本 */
function faultsOfNames(names: readonly string[], forbidden: readonly string[]): string[] {
  const faults: string[] = []
  const seen = new Set<string>()
  for (const name of names) {
    if (name.length !== 2) faults.push(`「${name}」不是两个字`)
    if (seen.has(name)) faults.push(`「${name}」重了`)
    seen.add(name)
    if (forbidden.includes(name)) faults.push(`「${name}」是明代的年号`)
    for (const ch of NOT_ERA_CHARS) {
      if (name.includes(ch)) faults.push(`「${name}」里有「${ch}」——一看就是游戏里的字`)
    }
  }
  return faults
}

/**
 * 四、纪年连续。逐月走一遍：每个月都得有年号；同一年号里正月加一；
 * 换年号那个月归元年；年数永远大于零。
 *
 * `lookup` 能换，是为了第六条能拿一个算错了的查法喂它——
 * 这一条守的是查法的算术和「eraFrom 单调」这个前提，数据掰坏了归第一条管。
 */
function faultsOfContinuity(
  reigns: readonly Reign[],
  from: number,
  to: number,
  lookup: typeof eraAt = eraAt,
): string[] {
  const faults: string[] = []
  let last: { name: string; year: number } | null = null
  for (let year = from; year <= to && faults.length < 5; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const era = lookup(reigns, { year, month })
      if (!era) {
        faults.push(`${year} 年 ${month} 月没有年号`)
        continue
      }
      if (era.year < 1) faults.push(`${year} 年 ${month} 月算出 ${describeEra(era)}——年数小于一`)
      if (last) {
        if (era.name === last.name) {
          const expected = month === 1 ? last.year + 1 : last.year
          if (era.year !== expected) {
            faults.push(`${era.name}在 ${year} 年 ${month} 月从${last.year}跳到${era.year}`)
          }
        } else if (era.year !== 1) {
          faults.push(`改元${era.name}那个月不是元年，是第 ${era.year} 年`)
        }
      }
      last = era
    }
  }
  return faults
}

/** 在位年数：崩的那年减即位那年。即位当年就没了的算 0 */
function reignYears(reign: Reign): number | null {
  return reign.death ? reign.death.year - reign.accession.year : null
}

/**
 * 六、皇帝是人。
 *
 * 在位年数不是抽的，是寿数减即位年龄推出来的（用户定的模型）。那么三件事必须成立：
 * 即位时至少一岁；崩时不比即位时小；**继任者比先帝年轻**——儿子、弟弟、堂弟、侄子，
 * 没有一种接法会让一个比死去的皇帝还老的人坐上去。
 */
function faultsOfPersons(reigns: readonly Reign[]): string[] {
  const faults: string[] = []
  reigns.forEach((reign, i) => {
    const accessionAge = reign.accession.year - reign.born
    if (accessionAge < 1) faults.push(`${reign.era}即位时 ${accessionAge} 岁`)
    if (reign.death) {
      const deathAge = reign.death.year - reign.born
      if (deathAge < accessionAge) faults.push(`${reign.era}崩时 ${deathAge} 岁，比即位时还小`)
      if (deathAge > 95) faults.push(`${reign.era}活到 ${deathAge} 岁`)
    }
    if (i > 0) {
      const prev = reigns[i - 1]!
      if (reign.born <= prev.born) {
        faults.push(`${reign.era}生于 ${reign.born}，比先帝${prev.era}（生于 ${prev.born}）还年长`)
      }
    }
  })
  return faults
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

// ============================================================
// 一到四：三百个王朝
// ============================================================
console.log(
  `\n=== 年号与王朝史（${DYNASTIES} 个王朝 / ${LIVES} 世 / 宫里坠落 ${COURT_FALLS} 世）===\n`,
)

let bad = 0
const lengths: number[] = []
const accessionAges: number[] = []
const deathAges: number[] = []
const structural: string[] = []
const nameFaults: string[] = []
const continuityFaults: string[] = []
const personFaults: string[] = []
let reignsSeen = 0

for (let i = 0; i < DYNASTIES; i += 1) {
  const founding = -150
  const reigns = foundDynasty(founding, 200, NAMES)
  reignsSeen += reigns.length
  structural.push(...faultsOfSuccession(reigns))
  personFaults.push(...faultsOfPersons(reigns))
  nameFaults.push(
    ...faultsOfNames(
      reigns.map((r) => r.era),
      REAL_MING_ERAS,
    ),
  )
  if (i < 30) continuityFaults.push(...faultsOfContinuity(reigns, founding, 200))
  for (const reign of reigns) {
    const years = reignYears(reign)
    if (years !== null) lengths.push(years)
    accessionAges.push(reign.accession.year - reign.born)
    if (reign.death) deathAges.push(reign.death.year - reign.born)
  }
}

// 词库本身也过一遍：表里就有明代年号，掷出来当然有
nameFaults.push(...faultsOfNames(NAMES, REAL_MING_ERAS))

if (structural.length > 0) {
  console.log(`  ✗ 一、逾年改元不成立，${structural.length} 处，例如：`)
  for (const one of structural.slice(0, 4)) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(
    `  ✓ 一、${reignsSeen} 位皇帝，即位在先帝崩的那个月，改元在次年正月；即位当年就没了的追称。`,
  )
}

if (nameFaults.length > 0) {
  console.log(`  ✗ 二、年号文本不成立，${nameFaults.length} 处，例如：`)
  for (const one of [...new Set(nameFaults)].slice(0, 4)) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(`  ✓ 二、词库 ${NAMES.length} 个年号，两个字、不重、没有明代的、没有游戏里的字。`)
}

/**
 * 三、在位年数的形状。
 *
 * 阈值不是照实测数定的，是照明代那张表的形状定的：中位十几年、
 * 有四十多年的、有不满一年的。三样缺一样，抽出来的就不是明代的形状。
 */
{
  const mid = median(lengths)
  const longest = Math.max(...lengths)
  const short = lengths.filter((y) => y <= 0).length
  const shortRate = short / lengths.length
  console.log(
    `  在位年数：${lengths.length} 位，中位 ${mid} 年，最长 ${longest} 年，` +
      `即位当年就没了的 ${short} 位（${(shortRate * 100).toFixed(1)}%）`,
  )
  if (mid < 8 || mid > 25) {
    console.log(`  ✗ 三、中位 ${mid} 年——明代十七帝的中位是十几年。`)
    bad += 1
  } else if (longest < 40) {
    console.log(`  ✗ 三、最长只有 ${longest} 年——嘉靖四十五、万历四十八，这个尾巴没长出来。`)
    bad += 1
  } else if (shortRate === 0 || shortRate > 0.12) {
    console.log(
      `  ✗ 三、即位当年就没了的占 ${(shortRate * 100).toFixed(1)}%——泰昌那种要有，但不能常有。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 三、中位十几年、长尾过四十、偶有不满一年——是明代那张表的形状。`)
  }
}

if (continuityFaults.length > 0) {
  console.log(`  ✗ 四、纪年不连续，例如：`)
  for (const one of continuityFaults.slice(0, 4)) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(`  ✓ 四、逐月走了 30 个王朝各 350 年，每个月都有年号，正月加一，改元归元年。`)
}

/**
 * 六、皇帝是人。
 *
 * 三条硬的（`faultsOfPersons`），加两条形状的：即位年龄和寿数的中位。
 * 阈值照明代那两张表的形状定——即位多在少年到壮年（中位二十上下），
 * 寿数多半三四十岁（中位三十七）——不照实测数定。
 */
{
  const accMid = median(accessionAges)
  const deathMid = median(deathAges)
  console.log(
    `  皇帝其人：即位年龄中位 ${accMid} 岁，寿数中位 ${deathMid} 岁，` +
      `幼主（十岁以下即位）${accessionAges.filter((a) => a <= 10).length} 位`,
  )
  if (personFaults.length > 0) {
    console.log(`  ✗ 六、皇帝不像一个人，${personFaults.length} 处，例如：`)
    for (const one of personFaults.slice(0, 4)) console.log(`      ${one}`)
    bad += 1
  } else if (accMid < 8 || accMid > 35) {
    console.log(`  ✗ 六、即位年龄中位 ${accMid} 岁——明代十七帝多在少年到壮年之间接位。`)
    bad += 1
  } else if (deathMid < 28 || deathMid > 55) {
    console.log(`  ✗ 六、寿数中位 ${deathMid} 岁——明代皇帝多半死在三四十岁上下。`)
    bad += 1
  } else {
    console.log(
      `  ✓ 六、即位至少一岁，崩不早于即位，继任者比先帝年轻；即位年龄和寿数是明代的形状。`,
    )
  }
}

// ============================================================
// 五：真人生
// ============================================================
interface Lived {
  origin: string
  bornEra: string | null
  successions: number
  /** 同一年里既有「父皇大行」又有「先帝崩」——编年上挨着两行 */
  doubled: boolean
  /** 宫里那一支：父皇大行那年之后一年，年号换了没有 */
  fallLinked: boolean | null
}

function live(): Lived {
  const narrative = useNarrativeStore()
  const household = useHouseholdStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  const bornEra =
    world.eraOf({ year: world.bornYear, month: world.bornMonth, day: 1 })?.name ?? null

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  const deaths = world.chronicle.filter((e) => e.text.startsWith('先帝崩'))
  const fall = world.chronicle.find((e) => e.text.startsWith('父皇大行'))
  const doubled = fall !== undefined && deaths.some((e) => e.time.year === fall.time.year)

  let fallLinked: boolean | null = null
  if (fall) {
    const before = world.eraOf(fall.time)?.name
    const after = world.eraOf({ year: fall.time.year + 1, month: 1, day: 1 })?.name
    fallLinked = before !== undefined && after !== undefined && before !== after
  }

  return { origin: household.origin, bornEra, successions: deaths.length, doubled, fallLinked }
}

const lives: Lived[] = []
for (let i = 0; i < LIVES; i += 1) {
  setActivePinia(createPinia())
  lives.push(live())
}

// 宫里那一支：掷到够数的**坠落**为止（理由见 COURT_FALLS）
let courtSeen = 0
let fellSeen = 0
for (let tries = 0; tries < 20000 && fellSeen < COURT_FALLS; tries += 1) {
  setActivePinia(createPinia())
  if (useHouseholdStore().origin !== 'court') continue
  const one = live()
  lives.push(one)
  courtSeen += 1
  if (one.fallLinked !== null) fellSeen += 1
}

{
  const noEra = lives.filter((l) => l.bornEra === null)
  const withDeath = lives.filter((l) => l.successions > 0)
  const court = lives.filter((l) => l.origin === 'court')
  const fell = court.filter((l) => l.fallLinked !== null)
  const unlinked = fell.filter((l) => l.fallLinked === false)
  const doubled = lives.filter((l) => l.doubled)

  console.log(
    `\n  覆盖：${lives.length} 世（宫里 ${court.length} 世，其中父皇大行的 ${fell.length} 世）/ ` +
      `跨过皇帝的死的 ${withDeath.length} 世`,
  )

  if (noEra.length > 0) {
    console.log(`  ✗ 五、${noEra.length} 世出生那一刻没有年号——标题会退回「第 N 年」。`)
    bad += 1
  } else if (withDeath.length === 0) {
    console.log(`  ✗ 五、${lives.length} 世里没有一世跨过皇帝的死——「先帝崩」那一笔从来没记过。`)
    bad += 1
  } else if (doubled.length > 0) {
    console.log(
      `  ✗ 五、${doubled.length} 世的编年上「父皇大行」和「先帝崩」挨在同一年——一件事记了两笔。`,
    )
    bad += 1
  } else if (fell.length < COURT_FALLS) {
    console.log(
      `  ✗ 五、两万次掷到 ${court.length} 世宫里的，只有 ${fell.length} 世父皇大行——` +
        `坠落那一卷是不是坏了？这条链和王朝史对不对得上，没验够。`,
    )
    bad += 1
  } else if (unlinked.length > 0) {
    console.log(
      `  ✗ 五、${unlinked.length} 世父皇大行之后第二年年号没换——royal.ts 和王朝史各说各的。`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 五、每一世生下来就有年号；跨过皇帝的死记一笔；` +
        `宫里 ${fell.length} 世父皇大行之后次年改元，编年上不重记。`,
    )
  }
}

// ============================================================
// 六：尺子自检
// ============================================================
{
  const sample = foundDynasty(-150, 100, NAMES)
  // 把第二位改成「即位当年就改元」——第一条必须红
  const broken: Reign[] = sample.map((r, i) =>
    i === 1 && r.death && r.death.year !== r.accession.year
      ? { ...r, eraFrom: { ...r.accession } }
      : r,
  )
  const caughtOne = faultsOfSuccession(broken).length > 0
  // 词库里塞一个「万历」——第二条必须红
  const caughtTwo = faultsOfNames([...NAMES, '万历'], REAL_MING_ERAS).length > 0
  // 查法算错一年（元年算成〇年）——第四条必须红。
  // 头一版掰的是数据（把某位的 eraFrom 挪后一年），结果只是让前一个年号多管一年，
  // 纪年照样连续——那不是断档，是第一条管的事。第四条守的是查法本身
  const offByOne: typeof eraAt = (r, at) => {
    const era = eraAt(r, at)
    return era ? { ...era, year: era.year - 1 } : null
  }
  const caughtFour = faultsOfContinuity(sample, -150, 100, offByOne).length > 0
  // 让第三位比先帝还年长（生年挪到先帝之前）——第六条必须红
  const elder: Reign[] = sample.map((r, i) => (i === 2 ? { ...r, born: sample[1]!.born - 5 } : r))
  const caughtSix = faultsOfPersons(elder).length > 0

  if (!caughtOne || !caughtTwo || !caughtFour || !caughtSix) {
    console.log(
      `  ✗ 尺子自检没通过：当年改元${caughtOne ? '抓到了' : '没抓到'}，` +
        `明代年号${caughtTwo ? '抓到了' : '没抓到'}，元年算成〇年${caughtFour ? '抓到了' : '没抓到'}，` +
        `继任者比先帝老${caughtSix ? '抓到了' : '没抓到'}。`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 尺子自检：当年改元、词库混进万历、元年算成〇年、继任者比先帝老，四样掰坏的都红在该红的那一条。`,
    )
  }
}

// 印几个样子给人看：随机出来的王朝长什么样
{
  const sample = foundDynasty(-150, 60, NAMES)
  console.log(`\n  一个随机王朝的样子（立国于绝对年 -150）：`)
  for (const r of sample.slice(0, 8)) {
    const years = reignYears(r)
    const deathAge = r.death ? r.death.year - r.born : null
    console.log(
      `    ${r.era}　${r.accession.year - r.born} 岁即位（${r.accession.year}·${r.accession.month}）　` +
        `元年 ${r.eraFrom.year}·${r.eraFrom.month}　` +
        `在位 ${years === null ? '—' : years === 0 ? '不满一年' : `${years} 年`}` +
        `${deathAge === null ? '' : `，${deathAge} 岁崩`}`,
    )
  }
  const now = { year: 0, month: 6 }
  const era = eraAt(sample, now)
  console.log(`    绝对年 0 年六月印出来是：${era ? describeEra(era) : '（无）'}`)
  console.log(
    `    先后：${isBefore({ year: -1, month: 12 }, now) ? '去年腊月在今年六月之前' : '？'}`,
  )
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  皇帝生涯随机、改元时机随机、年号随机，而一帝一元、逾年改元、纪年连续一样不随机。')
  console.log('  **年号是世界真实发生过的东西，不是顶上一个标签。**\n')
}
