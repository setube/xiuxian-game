/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 地域三层的走查。
 *
 * ## 这一层是从两处使用者逼出来的
 *
 * `birth.ts` 从前有一把 `residenceKind` 的临时尺子，从出身和境况里猜住处；
 * `encounters` 五处「邻村」说的是一个世界里不存在的地方。现在**我住在哪里**是一件
 * 真实的事，这一支守它不走样：
 *
 *   一、树立得对——两棵树各走各的（`PLACE_PARENTS`），不串、不断、不绕圈
 *   二、住处对得上人——宫里的孩子住在宫，藩王的在王府，寺里的在寺，讨饭的没有居所，
 *       其余的住在宅；谁都归一级聚落
 *   三、邻村是真的——住村里的有一两个邻村，名字不跟自己村重；住城里的没有邻村，
 *       正文里那句「去{nearbyVillage}」落纸是一个村名
 *   四、征象看住处不看日子——住在府城的木匠看得见粮铺，看不见村口；
 *       住村里的反过来；宫、王府、寺里的两样都看不见
 *   五、搬了家居所跟着搬——宫里坠落之后住进府城的宅，原来那处宫还在册上
 *
 * 跑法：bun scripts/dwelling.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { SIGNS } from '../src/content/signs'
import { meetsAll } from '../src/engine/conditions'
import { fillString } from '../src/engine/interpolate'
import { faultsOfTree } from '../src/engine/places'
import { useStory } from '../src/engine/story'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Place, ResidenceKind } from '../src/types/game'

/** 只立基不活下去。六百次把十一种出身、十种境况都掷到 */
const BIRTHS = 600
/** 宫里坠落要掷到几世。理由同 `scripts/neighbours.ts`：掷到够数的坠落，不是够数的宫里人生 */
const COURT_FALLS = 3

/** 「村口」那一组和「街面」那一组各挑一条来问 */
const VILLAGE_SIGN = SIGNS.find((s) => s.id === 'order-watch')!
const STREET_SIGN = SIGNS.find((s) => s.id === 'calm-market')!

console.log(`\n=== 地域三层（立基 ${BIRTHS} 次 / 宫里坠落 ${COURT_FALLS} 世）===\n`)

let bad = 0

interface Born {
  origin: string
  expected: ResidenceKind
  kind: ResidenceKind
  settlement: string | null
  nearby: string[]
  own: string | null
  villageFill: string
  countyFill: string
  seesVillage: boolean
  seesStreet: boolean
  tree: string[]
}

const births: Born[] = []
for (let i = 0; i < BIRTHS; i += 1) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  useNarrativeStore()
  useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()

  // 该住在哪儿：从出身和抚养人认。抚养人的 id 是境况表里写死的
  const guardians = people.guardians
  // 抚养人压过出身：生在王府却被寺里收留、被人捡去的孩子，住的是寺、是街上——
  // 跟别的人家一样。宫里那一支例外，它在 `settlePlaces` 里也是先于境况返回的
  const expected: ResidenceKind = household.capital
    ? '宫'
    : guardians.includes('monk')
      ? '寺'
      : guardians.includes('beggar') || guardians.includes('keeper')
        ? '无'
        : household.station === '宗室'
          ? '王府'
          : '宅'

  births.push({
    origin: household.origin,
    expected,
    kind: world.residenceKind(),
    settlement: world.settlementKind(),
    nearby: world.nearbyVillages().map((p: Place) => p.name),
    own: world.settlement ? (world.placeOf(world.settlement)?.name ?? null) : null,
    villageFill: fillString('去{nearbyVillage}'),
    countyFill: fillString('去{nearbyCounty}'),
    seesVillage: meetsAll(VILLAGE_SIGN.who),
    seesStreet: meetsAll(STREET_SIGN.who),
    tree: faultsOfTree(world.places),
  })
}

// 一、树
{
  const faults = births.flatMap((b) => b.tree)
  if (faults.length > 0) {
    console.log(`  ✗ 一、树立得不对，${faults.length} 处，例如：`)
    for (const one of [...new Set(faults)].slice(0, 4)) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(`  ✓ 一、${BIRTHS} 棵树，京师那棵和府域那棵各走各的，不串、不断、不绕圈。`)
  }
}

// 二、住处对得上人
{
  const byKind = new Map<ResidenceKind, number>()
  for (const b of births) byKind.set(b.expected, (byKind.get(b.expected) ?? 0) + 1)
  console.log(`  住处：${[...byKind.entries()].map(([k, n]) => `${k} ${n}`).join('　')}`)
  const missing = (['宅', '宫', '王府', '寺', '无'] as const).filter((k) => !byKind.has(k))
  const wrongKind = births.filter((b) => b.kind !== b.expected)
  const noSettlement = births.filter((b) => b.settlement === null)
  if (missing.length > 0) {
    console.log(`  ✗ 二、${BIRTHS} 次立基没掷到 ${missing.join('、')}，这一条没验全。`)
    bad += 1
  } else if (wrongKind.length > 0) {
    const one = wrongKind[0]!
    console.log(
      `  ✗ 二、${wrongKind.length} 世住错了地方，例如 ${one.origin} 该住「${one.expected}」，立的是「${one.kind}」。`,
    )
    bad += 1
  } else if (noSettlement.length > 0) {
    console.log(`  ✗ 二、${noSettlement.length} 世不归任何聚落——讨饭的也得知道自己在哪个镇上讨。`)
    bad += 1
  } else {
    console.log(
      `  ✓ 二、宫里的住宫，藩王住王府，寺里的住寺，讨饭的没有居所，其余住宅；人人归一级聚落。`,
    )
  }
}

// 三、邻村
{
  const villagers = births.filter((b) => b.settlement === '村')
  const townsfolk = births.filter((b) => b.settlement !== '村')
  const noNearby = villagers.filter((b) => b.nearby.length === 0)
  const sameName = villagers.filter((b) => b.nearby.includes(b.own ?? ''))
  const townHasNearby = townsfolk.filter((b) => b.nearby.length > 0)
  const rawFill = villagers.filter((b) => b.villageFill === '去邻村' || /[{}]/.test(b.villageFill))
  const townFill = townsfolk.filter((b) => b.villageFill !== '去邻村')
  const countyRaw = births.filter((b) => /[{}]/.test(b.countyFill))
  const sample = villagers[0]

  console.log(
    `  邻村：住村里的 ${villagers.length} 世，住城里的 ${townsfolk.length} 世` +
      (sample
        ? `；例如住在${sample.own}的人，邻村是 ${sample.nearby.join('、')}，正文落纸「${sample.villageFill}」`
        : ''),
  )
  if (villagers.length === 0) {
    console.log(`  ✗ 三、没有一世住在村里，邻村没验到。`)
    bad += 1
  } else if (noNearby.length > 0 || sameName.length > 0) {
    console.log(
      `  ✗ 三、${noNearby.length} 世住村里却没有邻村，${sameName.length} 世的邻村跟自己村同名。`,
    )
    bad += 1
  } else if (townHasNearby.length > 0) {
    console.log(`  ✗ 三、${townHasNearby.length} 世住在城里却有邻村——城里没有邻村这回事。`)
    bad += 1
  } else if (rawFill.length > 0 || townFill.length > 0 || countyRaw.length > 0) {
    console.log(
      `  ✗ 三、记号没换干净：村里 ${rawFill.length} 世落纸还是「邻村」或带括号，` +
        `城里 ${townFill.length} 世反而换成了村名，邻县 ${countyRaw.length} 世带括号。`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 三、住村里的有一两个邻村，名字不跟自己村重；住城里的没有；正文里那句落纸是村名。`,
    )
  }
}

// 四、征象看住处不看日子
{
  // 只看住在宅里或没有居所的木匠：生在木匠家却被寺里收留的孩子住在寺，看不见街是对的
  const craftsmen = births.filter(
    (b) => b.origin === 'craft' && (b.kind === '宅' || b.kind === '无'),
  )
  const farmers = births.filter((b) => b.origin === 'farm' && b.kind === '宅')
  const walled = births.filter((b) => b.kind === '宫' || b.kind === '王府' || b.kind === '寺')
  const craftWrong = craftsmen.filter((b) => b.seesVillage || !b.seesStreet)
  const farmWrong = farmers.filter((b) => !b.seesVillage || b.seesStreet)
  const walledWrong = walled.filter((b) => b.seesVillage || b.seesStreet)
  console.log(
    `  征象：木匠 ${craftsmen.length} 世，农户 ${farmers.length} 世，高墙里的 ${walled.length} 世`,
  )
  if (craftsmen.length === 0 || farmers.length === 0 || walled.length === 0) {
    console.log(`  ✗ 四、三种人没掷全，这一条没验到。`)
    bad += 1
  } else if (craftWrong.length > 0) {
    console.log(`  ✗ 四、${craftWrong.length} 个住在府城的木匠被算成了村里人——这正是从前那个毛病。`)
    bad += 1
  } else if (farmWrong.length > 0) {
    console.log(`  ✗ 四、${farmWrong.length} 个农户看不见村口，或者看见了粮铺。`)
    bad += 1
  } else if (walledWrong.length > 0) {
    console.log(`  ✗ 四、${walledWrong.length} 个宫、王府、寺里的人看见了村口或粮铺。`)
    bad += 1
  } else {
    console.log(
      `  ✓ 四、木匠看得见粮铺看不见村口，农户反过来，高墙里的两样都看不见——征象看的是住处。`,
    )
  }
}

// 五、搬家
{
  let fell = 0
  let unmoved = 0
  let lostOld = 0
  for (let tries = 0; tries < 20000 && fell < COURT_FALLS; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    if (household.origin !== 'court') continue
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    let turns = 0
    while (!narrative.ended && turns < 200 && !world.hasFlag('the-fall')) {
      const open = narrative.options.filter((o) => !o.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
    if (!world.hasFlag('the-fall')) continue
    fell += 1
    if (world.residenceKind() !== '宅' || world.settlementKind() !== '城') unmoved += 1
    if (!world.placeOf('home') || world.placeOf('home')?.kind !== '宫') lostOld += 1
  }
  if (fell < COURT_FALLS) {
    console.log(`  ✗ 五、两万次只掷到 ${fell} 世宫里坠落，搬家没验够。`)
    bad += 1
  } else if (unmoved > 0) {
    console.log(`  ✗ 五、${unmoved} 世迁出京城之后居所还没搬——门牌换了，人还住在宫里。`)
    bad += 1
  } else if (lostOld > 0) {
    console.log(
      `  ✗ 五、${lostOld} 世搬走之后原来那处宫从册上消失了——他从那儿搬走了，那地方没有消失。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 五、宫里坠落的 ${fell} 世都住进了府城的宅，原来那处宫还在册上。`)
  }
}

// 六、尺子自检
{
  const crossed: Record<string, Place> = {
    capital: { id: 'capital', name: '京师', kind: '京师', within: null },
    village: { id: 'village', name: '柳溪村', kind: '村', within: 'capital' },
  }
  const looped: Record<string, Place> = {
    a: { id: 'a', name: '甲', kind: '县', within: 'b' },
    b: { id: 'b', name: '乙', kind: '府', within: 'a' },
  }
  const caughtCross = faultsOfTree(crossed).length > 0
  const caughtLoop = faultsOfTree(looped).length > 0
  if (!caughtCross || !caughtLoop) {
    console.log(
      `  ✗ 尺子自检没通过：村挂在京师下${caughtCross ? '抓到了' : '没抓到'}，绕圈${caughtLoop ? '抓到了' : '没抓到'}。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：村挂在京师下、府县互为上级，两样掰坏的树都红。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  我住在哪里是一件真实的事：宫、王府、寺、宅，或者没有；邻村是真的另一个村。')
  console.log('  **生活方式不是空间位置。**\n')
}
