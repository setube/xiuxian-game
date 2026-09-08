/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 兼业与租佃：一家不止靠一样过活；租的地是谁的，得是一个人。
 *
 * 4.md／11.md 要的两件事，从前都写不出来：`Livelihood` 一格一值，「父亲种田，农闲进镇
 * 做木工」说不了；`tenure` 有了「佃」，可「租谁的地」没有格，田主不是人，于是
 * 「没田、租地、欠租、遇旱就借粮的佃户」「欺压佃户的田主」全是空话。
 * 2026-09-08 查证时的结论是「等第一个使用者」；用户拍板做完，那就把使用者写出来：
 *
 *     佃户一行出身（`tenant`）　　　立基时立田主：人口册上的真人，有性情，会老会死
 *     家境两格　　　　　　　　　　　`landlord`（租谁的地）、`sideline`（还靠什么贴补）——
 *                                   两格不是第二个「业」，业是外人叫这家什么
 *     荒年那一卷　　　　　　　　　　佃户家压着租子，去求他缓一年，缓不缓从性情里出；
 *                                   农家靠第二样进项撑过去：爹挑柴进镇去卖、娘接针线活
 *     读者　　　　　　　　　　　　　六问那段话、人物面板、成年那一卷、地抵了债那一卷（债主成了田主）
 *
 *   一、佃户家：生下来田是租的、田主在册、叫「田主」、他有自己的一户；六问说得出「种着王家的地」；
 *       荒年先过租子那一关（不挂家境档——进卷那一刻佃户家家境中位 57、四分位 49–63，挂「有得选」那一档没人走到）：
 *       温和的缓一年（簿上一笔欠租，欠的是当家的那个人）、木讷的照收、刚硬的量走，过了这一关接着分档；
 *       他没了那一关就不过；自耕的农家看不见租子。
 *   二、兼业：农家四成生下来娘就接着针线活（出身表那一格；这样的人家荒年没有「接针线」那条路，
 *       娘没了活还在、灯下换了人）；荒年挑柴、接针线各落一格；六问、成年那一卷读得到；
 *       开铺子的人家生下来没有贴补、荒年也没有这两条路。
 *   三、地抵了债：债主成了田主——`landlord` 落了、他入了册、六问说他的姓。
 *   四、随机人生只报数：佃户出身占几成；生在佃户家的田主都在册；`landlord` 非空必是「佃」；
 *       兼业只落在务农的人家；生下来的贴补只落在出身表填了那一格的人家、几成对得上；
 *       六问那段话跟两格对得上；掷到求过缓租、人生里添了贴补各至少一世为止。
 */
import './lib/seeded'

import { lifeScenes } from '../src/content/life'
import { ORIGINS } from '../src/content/origins'
import { meetsAll } from '../src/engine/conditions'
import { pathWords, pathsNow } from '../src/engine/lotpath'
import { useHouseholdStore } from '../src/stores/household'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import type { Policy, TenancyLife, TenancyPayload } from './tasks/tenancy-lives'
import type { Temper } from '../src/types/game'

const LIVES = 300

let bad = 0

/** 佃户家，十岁，爹娘和田主都在 */
function tenantChild(): Staged | null {
  const s = born('tenant', 10, ['father', 'mother', 'landlord'])
  // 租子那一关只压家底不到宽裕（≤61）的人家；佃户家十岁时家境四分位 41–60，四世里一世越过去。钉在中间
  if (s) s.household.standing = 45
  return s
}

function withTemper(s: Staged, temper: Temper): void {
  s.people.amend('landlord', { temper })
}

/**
 * 荒年那一节里某条路此刻开不开。
 *
 * `play()` 是按 id 直接演那一条，不看它的 `requires`——它演的是「假如走了这条路」。
 * 「这条路开不开」得另问：引擎里锁选项的是 `toOptions`，问的正是这几条 `requires`。
 */
function choiceOpen(nodeId: string, choiceId: string): boolean {
  const node = lifeScenes['dearth:price']?.nodes[nodeId]
  const choice = node?.choices?.find((one) => one.id === choiceId)
  if (!choice) throw new Error(`荒年 ${nodeId} 那一节没有 ${choiceId} 这条路`)
  return meetsAll(choice.requires)
}

/** 租子那一关此刻过不过：开场那条分流的条件（佃、田主活着、家底不到宽裕） */
function rentDue(): boolean {
  const branch = lifeScenes['dearth:price']?.nodes['open']?.branches?.find(
    (one) => one.next === 'rent-due',
  )
  if (!branch) throw new Error('荒年开场没有分给佃户的那一条')
  return meetsAll(branch.requires)
}

// ============================================================
// 一、佃户家：田主是人，缓不缓从性情里出
// ============================================================
{
  const wrong: string[] = []
  const s = tenantChild()
  if (!s) wrong.push('掷不出局')
  else {
    const household = useHouseholdStore()
    if (household.tenure !== '佃') wrong.push(`生在佃户家，田那一格却是「${household.tenure}」`)
    if (household.landlord !== 'landlord') wrong.push(`租谁的地没落：${household.landlord}`)
    const owner = s.people.personOf('landlord')
    if (!owner) wrong.push('田主不在人口册上')
    else {
      if (s.people.callOf('landlord') !== '田主')
        wrong.push(`叫他「${s.people.callOf('landlord')}」`)
      if (!s.people.houses['landlord']) wrong.push('田主没有自己的一户')
      if (s.people.houseOf('landlord')?.id === 'home') wrong.push('田主进了你家这一户')
      const said = pathWords(pathsNow())
      if (!said.some((line) => line.includes(`种着${owner.surname}家的地`)))
        wrong.push(`六问该说出田主的姓：${said.join(' / ')}`)
    }
    // 荒年：温和的缓一年
    withTemper(s, '温和')
    if (!rentDue()) wrong.push('佃户家、田主活着、家底不宽裕，荒年却没先过租子那一关')
    household.standing = 70
    if (rentDue()) wrong.push('家底宽裕的佃户家（≥62）交得起租，不该被租子压着')
    household.standing = 45
    const texts = play('dearth:price', 'beg-rent', 'rent-due')
    if (!texts.some((line) => line.includes('说的是租子')))
      wrong.push(`佃户家的荒年该有租子那一句：${texts.slice(0, 3).join(' / ')}`)
    if (!texts.some((line) => line.includes('缓一年')))
      wrong.push(`温和的田主该缓一年：${texts.join(' / ')}`)
    const TIERS = ['粥比往常稀', '米撑不到开春', '家里没有米了', '家里照常开饭']
    if (!texts.some((line) => TIERS.some((mark) => line.includes(mark))))
      wrong.push(`过了租子那一关荒年还在，该接着分档：${texts.slice(-3).join(' / ')}`)
    const rent = s.people.ious.find((one) => one.creditor === 'landlord')
    if (!rent) wrong.push('缓了一年，簿上没记欠租')
    else {
      if (rent.debtor !== 'father') wrong.push(`欠租的该是当家的爹，簿上写的是 ${rent.debtor}`)
      if (rent.settled !== null) wrong.push('刚欠下的租子簿上已经了结了')
      if (!meetsAll([{ owed: { debtor: 'father', creditor: 'landlord', settled: false } }]))
        wrong.push('owed 条件读不到这笔欠租')
    }
  }
  // 木讷的照收、刚硬的量走
  for (const [temper, want, iou] of [
    ['木讷', '一升也没有少量', false],
    ['刚硬', '量走了一半', false],
  ] as const) {
    const t = tenantChild()
    if (!t) {
      wrong.push('掷不出局')
      continue
    }
    withTemper(t, temper)
    const texts = play('dearth:price', 'beg-rent', 'rent-due')
    if (!texts.some((line) => line.includes(want)))
      wrong.push(`${temper}的田主该「${want}」：${texts.slice(-3).join(' / ')}`)
    if (t.people.ious.some((one) => one.creditor === 'landlord') !== iou)
      wrong.push(`${temper}的田主${iou ? '该' : '不该'}让簿上多一笔`)
  }
  // 他没了：那一句和那条路都不出
  {
    const t = tenantChild()
    if (!t) wrong.push('掷不出局')
    else {
      if (!rentDue()) wrong.push('田主活着，租子那一关却不过')
      t.people.die('landlord', '老病')
      if (rentDue()) wrong.push('田主没了，租子那一关还在')
      const texts = play('dearth:price', 'sell')
      if (texts.some((line) => line.includes('租子'))) wrong.push('田主没了，荒年里还提租子')
    }
  }
  // 自耕的农家看不见租子
  {
    const f = born('farm', 10, ['father', 'mother'])
    if (!f) wrong.push('掷不出农家')
    else {
      const household = useHouseholdStore()
      if (household.landlord !== null) wrong.push(`自耕的农家不该有田主：${household.landlord}`)
      if (rentDue()) wrong.push('自耕的农家也要过租子那一关')
      const texts = play('dearth:price', 'sell')
      if (texts.some((line) => line.includes('租子'))) wrong.push('自耕的农家荒年里出现了租子')
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、佃户家：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、生在佃户家：田主是册上的真人，有自己的一户；六问说得出他的姓；荒年温和的缓一年（簿上一笔欠租）、木讷的照收、刚硬的量走；他没了那条路就不出；自耕的农家看不见租子。',
    )
}

// ============================================================
// 二、兼业：一格，不是第二个业
// ============================================================
{
  const wrong: string[] = []
  const s = born('farm', 10, ['father', 'mother'])
  if (!s) wrong.push('掷不出局')
  else {
    const household = useHouseholdStore()
    // 这一局要的是「还没有贴补」的农家：四成人家生下来娘就接着针线活（出身表那一格），先归零
    household.sideline = null
    if (!choiceOpen('choose', 'peddle') || !choiceOpen('choose', 'needle'))
      wrong.push('务农的人家，挑柴、针线两条路该开着')
    if (!choiceOpen('tighten', 'peddle') || !choiceOpen('tighten', 'needle'))
      wrong.push('紧一年那一档也该开着这两条路——进卷那一刻农家多半落在这一档')
    const texts = play('dearth:price', 'peddle', 'choose')
    if (!texts.some((line) => line.includes('半升米')))
      wrong.push(`挑柴那一节：${texts.join(' / ')}`)
    if (household.sideline !== '挑柴') wrong.push(`该落「挑柴」，落的是「${household.sideline}」`)
    if (household.livelihood !== '务农') wrong.push('多了一样贴补，业却变了')
    if (!meetsAll([{ sideline: '挑柴' }])) wrong.push('sideline 条件读不到')
    if (meetsAll([{ sideline: '针线' }])) wrong.push('sideline 条件把挑柴认成了针线')
    const said = pathWords(pathsNow())
    if (!said.some((line) => line.includes('挑柴进镇')))
      wrong.push(`六问该说贴补：${said.join(' / ')}`)
    if (!said.some((line) => line.includes('务农'))) wrong.push('多了贴补，六问不再说务农了')
    const adult = play('routine:adult')
    if (!adult.some((line) => line.includes('挑柴进镇那一趟如今是你去')))
      wrong.push(`成年那一卷该读到那副担子：${adult.slice(0, 4).join(' / ')}`)
  }
  {
    const t = born('farm', 10, ['father', 'mother'])
    if (!t) wrong.push('掷不出第二局')
    else {
      play('dearth:price', 'needle', 'choose')
      if (useHouseholdStore().sideline !== '针线') wrong.push('针线那条路没落格')
    }
  }
  // 开铺子的人家：没有这两条路
  {
    const c = born('cloth', 10, ['father', 'mother'])
    if (!c) wrong.push('掷不出商户')
    else {
      if (useHouseholdStore().sideline !== null)
        wrong.push(`开布庄的人家生下来就有贴补：${useHouseholdStore().sideline}`)
      if (
        choiceOpen('choose', 'peddle') ||
        choiceOpen('choose', 'needle') ||
        choiceOpen('tighten', 'peddle')
      )
        wrong.push('开布庄的人家也能挑柴、接针线')
    }
  }
  // 生下来娘就接着针线活的那一类农家（出身表那一格，四成）：掷到一户为止
  {
    let t: Staged | null = null
    for (let tries = 0; tries < 60 && !t; tries += 1) {
      const got = born('farm', 10, ['father', 'mother'])
      if (got && useHouseholdStore().sideline === '针线') t = got
    }
    if (!t) wrong.push('六十局农家没有一户生下来就接针线活——出身表那一格没落到 household 上')
    else {
      if (choiceOpen('choose', 'needle')) wrong.push('家里本来就接着针线活，荒年却还能「接邻家的针线活」')
      if (!choiceOpen('choose', 'peddle')) wrong.push('家里接着针线活，爹挑柴那条路不该关')
      // 那一样在荒年里撑得更狠：紧一年那一档读得到
      const lean = play('dearth:price', 'endure', 'tighten')
      if (!lean.some((line) => line.includes('针线活那年接得比往常多')))
        wrong.push(`本来就接着针线活的人家，荒年该读到它撑着：${lean.slice(0, 4).join(' / ')}`)
      const said = pathWords(pathsNow())
      if (!said.some((line) => line.includes('针线'))) wrong.push(`六问该说出针线：${said.join(' / ')}`)
      const adult = play('routine:adult')
      if (!adult.some((line) => line.includes('家里还接着针线活')))
        wrong.push(`成年那一卷该读到针线：${adult.slice(0, 4).join(' / ')}`)
      // 娘不在了，活还在，灯下换了人
      t.people.die('mother', '老病')
      const later = play('routine:adult')
      if (!later.some((line) => line.includes('灯下那点活计换了人')))
        wrong.push(`娘没了，成年那一卷该说灯下换了人：${later.slice(0, 4).join(' / ')}`)
    }
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、兼业：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 二、四成农家生下来娘就接着针线活（这样的人家荒年没有「接针线」那条路，娘没了灯下换了人）；荒年挑柴、接针线各落一格，业还是务农；六问、成年那一卷读得到；开布庄的人家生下来没有贴补、荒年也没有这两条路。',
    )
}

// ============================================================
// 三、地抵了债：债主成了田主
// ============================================================
{
  const wrong: string[] = []
  const s = born('farm', 12, ['mother'])
  if (!s) wrong.push('掷不出局')
  else {
    const household = useHouseholdStore()
    play('debt:fields', undefined, 'signed')
    if (household.tenure !== '佃') wrong.push('地抵了债，田那一格没变')
    if (household.landlord !== 'landlord') wrong.push(`债主没成田主：${household.landlord}`)
    const owner = s.people.personOf('landlord')
    if (!owner) wrong.push('田主没入册')
    else if (!pathWords(pathsNow()).some((line) => line.includes(`种着${owner.surname}家的地`)))
      wrong.push('六问没说出田主的姓')
    if (s.people.callOf('landlord') !== '田主') wrong.push(`叫他「${s.people.callOf('landlord')}」`)
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、地抵了债：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else console.log('  ✓ 三、地抵了债：债主入了册、成了田主，六问说他的姓。')
}

// ============================================================
// 四、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  const CAP = LIVES * 10
  const batch = (policy: Policy, runs: number) =>
    mapShards<TenancyLife[], TenancyPayload>({
      task: 'scripts/tasks/tenancy-lives.ts',
      runs,
      payload: { policy },
    }).then((all) => all.flat())
  /*
   * 分布那一批随机选；存在性那一批用有心人（荒年里那三条路开着就走）——
   * 随便走的人求缓租要「生在佃户家 × 荒年掷中 × 紧巴那一档 × 六选一 × 田主活着」，
   * 头一版随机补掷到上限 3000 世才见 1 世，慢，而且掷不到就红在样本上不在内容上。
   * 存在性问的是「这条路在真世里走不走得到」，有心人走到了就够。
   */
  const first = await batch('random', LIVES)
  let lives = first
  /** 人生里添的贴补：跟生下来那一样不同才算（生下来就接针线的人家，一辈子没添也不算） */
  const tookUp = (one: TenancyLife) => one.sideline !== null && one.sideline !== one.bornSideline
  const enough = (all: TenancyLife[]) =>
    all.some((one) => one.rentAnswer !== null) && all.some(tookUp)
  while (!enough(lives) && lives.length < CAP) lives = [...lives, ...(await batch('keen', LIVES))]

  const n = first.length
  const tenants = first.filter((one) => one.origin === 'tenant')
  const want =
    (ORIGINS.find((one) => one.id === 'tenant')?.weight ?? 0) /
    ORIGINS.reduce((s, o) => s + o.weight, 0)
  const answered = lives.filter((one) => one.rentAnswer !== null)
  const byAnswer = ['缓', '照收', '量走']
    .map((a) => `${a} ${answered.filter((one) => one.rentAnswer === a).length}`)
    .join('、')
  const sidelined = lives.filter(tookUp)
  const bornWith = first.filter((one) => one.bornSideline !== null)
  console.log(
    `  · ${n} 世：生在佃户家 ${tenants.length}（${((tenants.length / n) * 100).toFixed(1)}%，权重说 ${(want * 100).toFixed(1)}%）；` +
      `荒年求过缓租 ${answered.length} 世（${byAnswer}），簿上欠着租的 ${lives.filter((one) => one.rentOwed).length}；` +
      `生下来就有贴补 ${bornWith.length} 世；人生里添了贴补 ${sidelined.length} 世（挑柴 ${sidelined.filter((one) => one.sideline === '挑柴').length}、针线 ${sidelined.filter((one) => one.sideline === '针线').length}）；` +
      `地抵了债成佃户的 ${lives.filter((one) => one.origin !== 'tenant' && one.landlord !== null).length}` +
      (lives.length > n ? `；补掷到 ${lives.length} 世` : ''),
  )
  if (tenants.length === 0) wrong.push(`${n} 世里没有一世生在佃户家`)
  else if (tenants.length / n < want * 0.6 || tenants.length / n > want * 1.6)
    wrong.push(
      `佃户占 ${((tenants.length / n) * 100).toFixed(1)}%，权重说该占 ${(want * 100).toFixed(1)}%`,
    )
  for (const one of tenants) {
    if (one.bornTenure !== '佃') wrong.push('生在佃户家，田那一格不是「佃」')
    if (one.bornLandlord === null || !one.landlordEnrolled) wrong.push('生在佃户家，田主没立起来')
  }
  // 他会老会死，不判红；报个数——头一版立起来就五十来岁，十世里一世在孩子五岁前就没了
  const diedYoung = tenants.filter((one) => one.landlordDiedYoung).length
  console.log(`  · 生在佃户家的 ${tenants.length} 世里，田主在孩子十六岁前就没了的 ${diedYoung} 世`)
  // 生下来的贴补只落在出身表填了那一格的人家，落的是表上那一样；几成对得上表上的数
  for (const row of ORIGINS) {
    const ofRow = first.filter((one) => one.origin === row.id)
    const withOne = ofRow.filter((one) => one.bornSideline !== null)
    if (row.sideline === undefined) {
      if (withOne.length > 0) wrong.push(`${row.id} 出身表没填贴补，却有 ${withOne.length} 世生下来就有`)
      continue
    }
    for (const one of withOne)
      if (one.bornSideline !== row.sideline.of)
        wrong.push(`${row.id} 表上写的是${row.sideline.of}，生下来落的是${one.bornSideline}`)
    // 样本够四十世才判几成：农家三百世里九十来世，四成就是三十七，一半到一倍半之间不会误报
    if (ofRow.length >= 40) {
      const rate = withOne.length / ofRow.length
      if (rate < row.sideline.chance * 0.5 || rate > row.sideline.chance * 1.5)
        wrong.push(
          `${row.id} 表上说 ${(row.sideline.chance * 100).toFixed(0)}% 生下来有贴补，${ofRow.length} 世里实际 ${(rate * 100).toFixed(0)}%`,
        )
    }
  }
  for (const one of lives) {
    if (one.landlord !== null && one.tenure !== '佃')
      wrong.push(`租着谁的地却不是佃户：${one.origin}`)
    if (one.sideline !== null && one.livelihood !== '务农')
      wrong.push(`贴补落在了不务农的人家：${one.livelihood}`)
    if (one.rentOwed && one.rentAnswer !== '缓') wrong.push('簿上欠着租，可田主没说过缓')
    // 六问那段话跟两格对得上
    const saysOwner = one.said.find((line) => /种着.家的地/.test(line))
    if (saysOwner !== undefined && (one.landlord === null || one.landlordSurname === null))
      wrong.push(`六问说了「${saysOwner}」，可这一户不租谁的地`)
    if (
      one.landlord !== null &&
      one.landlordSurname !== null &&
      one.tenure === '佃' &&
      saysOwner === undefined &&
      one.said.some((line) => line.includes('别人的地'))
    )
      wrong.push('租着谁的地说得出姓，六问却说「别人的地」')
    const saysSideline = one.said.some((line) => line.includes('挑柴') || line.includes('针线'))
    if (saysSideline !== (one.sideline !== null) && one.said.some((line) => line.includes('务农')))
      wrong.push(`六问的贴补那一句跟 sideline 对不上：${one.said.join(' / ')}`)
  }
  if (!lives.some((one) => one.rentAnswer !== null))
    wrong.push(`${lives.length} 世里没有一世荒年求过缓租——那条路在真世里走不到`)
  if (!lives.some(tookUp))
    wrong.push(`${lives.length} 世里没有一世在人生里添了贴补——那条路在真世里走不到`)
  if (wrong.length > 0) {
    console.log(`\n  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 四、${lives.length} 世：佃户占比对得上权重；生在佃户家的田主都在册；租着谁的地必是佃、贴补只落在务农的人家；生下来的贴补只落在表上填了的人家、几成对得上；六问跟两格对得上；求缓租、添贴补各至少一世。`,
    )
}

if (bad > 0) {
  console.log(`\n${bad} 条红。`)
  process.exitCode = 1
} else console.log('\n兼业与租佃：四条全绿。')
