/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 寻访：一个凡人第一次主动去找修士。
 *
 * ## 这一章不做「修仙搜索系统」
 *
 * 它做的是一条链：**念头 → 寻找 → 得到线索 → 判断线索 → 再行动**。
 * 没有功法，没有灵根，没有境界，没有宗门——
 * 甚至这一章里的人多半不会成功，而那正是要验的东西之一。
 *
 * ## 要验的五件事，一件一节
 *
 *   一　念头真的会改变他主动去找什么
 *   二　寻找会消耗真实时间，并且世界跟着往前走
 *   三　找不到是正常结果
 *   四　线索可以是真的，也可以是他自己的错误解释
 *   五　找到入口以后，他也没有因此获得一个「修仙系统」
 *
 * 第六节单独走那一条完整的链：
 *
 *     寻找 → 错误认知 → 行动 → 失败 → 日录 → 多年以后重新理解
 *
 * ## 前两节静态判，后四节量分布
 *
 * 「有念头的人多出几个去处」是可以静态判的——切一个旗标，
 * 数一数 `errandsNow()` 返回几条，不掷一次随机数。
 * **能静态判的别拿模拟去判**，模拟是用来量分布的，不是用来判存在的。
 *
 * 跑法：bun scripts/errand.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { ERRANDS } from '../src/content/errands'
import { HINDSIGHTS } from '../src/content/hindsight'
import { PLACES } from '../src/content/leads'
import { DAMPERS } from '../src/content/leanings'
import { seekingScenes } from '../src/content/life/seeking'
import { reconsider } from '../src/engine/diary'
import { applyEffects } from '../src/engine/effects'
import { errandsNow, goOn, GAVE_UP_AT } from '../src/engine/errand'
import { dampen } from '../src/engine/leanings'
import { follow } from '../src/engine/seeking'
import { useCharacterStore } from '../src/stores/character'
import { useDiaryStore } from '../src/stores/diary'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import { useWorldStore } from '../src/stores/world'
import type { Choice, Effect } from '../src/types/game'

/**
 * 量分布跑多少趟。
 *
 * 最稀的一格是镇上那个老人（12/100，而镇上那一趟又只是四分之一），
 * 三千趟里期望九十回上下。要看清它，两千打底——跑完不到两秒。
 */
const RUNS = 3000

let failed = 0

/**
 * 一个刚起了念头的十二岁孩子，四条路都走得成。
 *
 * ## 顺序不能反
 *
 * 年纪不是一格可以写的数，它是 `world.time.year - world.bornYear` 算出来的——
 * **所以「让他十二岁」的唯一办法是让世界走十二年**，这跟游戏里一样。
 *
 * 而 `bornYear` 是在**人物 store 被创建那一刻**钉住的：建起来就是出生。
 * 先推时间再让他出生，他就会永远零岁——这一版最早就是那么写的，
 * 于是十二岁的孩子看不见渡口和镇上那两条要满十一岁的路，
 * 第一节当场报红。**初始化期的依赖看的是「谁先读了谁已有的值」，
 * 不是谁调用了谁。**
 */
function seeker(age = 12): void {
  setActivePinia(createPinia())
  useHouseholdStore()
  const world = useWorldStore()
  useCharacterStore() // 先出生，再让世界往前走
  world.advanceTime({ years: age })
  world.setFlag('leaning:know', true)
  world.setFlag('schooled', true)
  world.setFlag('trader-here', true)
}

// ============================================================
// 一、念头改变的是他看得见几条路
// ============================================================
/**
 * 这一节是整章立论的地基，所以它一次随机数也不掷。
 *
 * 同一天，同一个村子，同一个外乡商旅。**世界一寸没变**——
 * 变的只有他心里存不存着那个念头。
 */
console.log('\n=== 一、同一个村口，他看得见几条路 ===\n')
{
  seeker()
  const world = useWorldStore()

  world.setFlag('leaning:know', false)
  const blank = errandsNow()

  world.setFlag('leaning:know', true)
  const stirred = errandsNow()

  console.log(`  没起过这个心思的人：${blank.length} 条路`)
  console.log(`  心里存着那件事的人：${stirred.length} 条路\n`)
  for (const errand of stirred) {
    console.log(`      ${errand.label}　　耗 ${errand.days} 日`)
  }
  console.log()
  console.log('  中间只差一个旗标。年纪、家境、私塾、村口那个商旅，一样也没动——')
  console.log('  **他多出来的不是运气，是去处。**')

  if (blank.length !== 0) {
    console.log(`\n  ✗ 没有念头的人也看得见 ${blank.length} 条路——那念头就没有改变什么。`)
    failed += 1
  }
  if (stirred.length !== ERRANDS.length) {
    console.log(`\n  ✗ 有念头也只看得见 ${stirred.length} 条，库里有 ${ERRANDS.length} 条。`)
    failed += 1
  }

  /**
   * 门槛写在去处上，不写在事件上。
   *
   * 一个没念过书的人看不见「找先生问一句」，一个十岁的孩子
   * 去不了渡口——**这些不该拦住整件事的发生**，
   * 它们只该各自拦住自己那一条。
   */
  seeker(9)
  const w = useWorldStore()
  w.setFlag('schooled', false)
  w.setFlag('trader-here', false)
  const narrow = errandsNow()
  console.log(`\n  换一个九岁、没念过书、商旅已经走了的孩子：${narrow.length} 条路`)
  console.log('  他心里一样存着那件事。可这四条路各有各的门槛，')
  console.log('  而门槛写在去处上——**事件本身照发生，他只是无处可去**。')
  if (narrow.length !== 0) {
    console.log(`\n  ✗ 那四条路的门槛没拦住他：还剩 ${narrow.map((one) => one.id).join('、')}`)
    failed += 1
  }
}

// ============================================================
// 二、跑一趟真的花掉时间
// ============================================================
/**
 * 两件事一起验：**天数只有一处真相**，和**一批效果是一个时刻**。
 *
 * 后者要紧在哪儿：`time` 是上下文相，先跑；`errand` 是事实相，后跑。
 * 于是这一趟落进认知的时间戳是**他回到家那一刻**，不是动身那一刻。
 * 顺序反过来，他会在出门前就记住了路上听见的话。
 */
console.log('\n=== 二、寻找花掉的是真时间 ===\n')
{
  const scene = seekingScenes['seek:errand']!
  const trips = new Map<string, Choice>()
  for (const node of Object.values(scene.nodes)) {
    for (const choice of node.choices ?? []) {
      if (choice.effects?.some((one) => one.type === 'errand')) trips.set(choice.id, choice)
    }
  }

  console.log(`  剧本里跑一趟的选项：${trips.size} 个\n`)
  for (const [id, choice] of trips) {
    const errand = ERRANDS.find((one) => one.id === id)
    const time = choice.effects?.find(
      (one): one is Extract<Effect, { type: 'time' }> => one.type === 'time',
    )
    const ok = errand && time?.days === errand.days
    console.log(
      `  ${(choice.label ?? id).padEnd(12, '　')}　剧本推 ${time?.days ?? '—'} 日　数据写 ${errand?.days ?? '—'} 日　${ok ? '' : '　✗'}`,
    )
    if (!ok) failed += 1
  }
  if (trips.size !== ERRANDS.length) {
    console.log(`\n  ✗ 库里 ${ERRANDS.length} 趟，剧本只摆出 ${trips.size} 个选项。`)
    failed += 1
  }

  /**
   * 两种写法跑同一趟：剧本原样的，和把效果顺序倒过来的。
   *
   * ## 只跑原样那一份，等于什么也没验
   *
   * 剧本里 `time` 本来就写在 `errand` 前头。**照着数组顺序挨个执行，
   * 结果跟两相结算一模一样**——于是那条判据看着在守两相结算，
   * 其实一次也没碰过它。这一版最早就是那么写的：
   * 尺子自检把 `time` 从上下文相挪进事实相，第二节一声不吭。
   *
   * 分相的实质是**顺序不该说了算**。所以倒过来再跑一份：
   * 先落寻访、后推时间，认知的时间戳仍然必须是他回到家那一刻。
   * 真按数组顺序执行的话，他会在出门之前就记住路上听见的话。
   */
  const orders: readonly { name: string; flip: boolean }[] = [
    { name: '剧本原样（先推时间，后落寻访）', flip: false },
    { name: '倒过来写（先落寻访，后推时间）', flip: true },
  ]
  console.log()
  for (const order of orders) {
    let checked = 0
    let wrongStamp = 0
    let stuck = false
    for (let i = 0; i < 400 && checked < 60; i += 1) {
      seeker()
      const world = useWorldStore()
      const character = useCharacterStore()
      const choice = [...trips.values()][i % trips.size]!
      const effects = order.flip ? [...(choice.effects ?? [])].reverse() : choice.effects
      const before = { ...world.time }
      applyEffects(effects)
      const after = world.time
      if (after.year === before.year && after.month === before.month && after.day === before.day) {
        stuck = true
        break
      }
      const latest = character.knowledge.at(-1)
      if (!latest) continue
      checked += 1
      if (latest.learnedAt.day !== after.day || latest.learnedAt.month !== after.month) {
        wrongStamp += 1
      }
    }
    if (stuck) {
      console.log(`  ✗ ${order.name}：跑了一趟，世界一天也没走。`)
      failed += 1
      continue
    }
    console.log(
      `  ${order.name}　抽 ${checked} 趟　记在回家那一刻的 ${checked - wrongStamp}　记在动身那天的 ${wrongStamp}`,
    )
    if (wrongStamp > 0) {
      console.log(`\n  ✗ 有 ${wrongStamp} 趟的时间戳停在动身那天。两相结算破了。`)
      failed += 1
    }
  }
  console.log('\n  时间是上下文相，先跑；事实相后跑。**一批效果是一个时刻**——')
  console.log('  而这件事跟它们在数组里排第几没有关系。倒着写，落点还在同一天。')

  /**
   * 已知缺口，明写在这儿。
   *
   * 「认准一处地方跑一趟」那个选项手写着八日，可他认准的那处
   * 可能远得多（云台二十日），也可能近得多（城隍庙三日）。
   * **剧本静态写不出他会去哪儿**，而 `follow` 是事实相，
   * 让它自己推时间就破了上面刚验过的那条不变量。
   *
   * 这一格不判红：它不是这一章引进来的（`seek:crossed` 那十二日
   * 早就在），修它要动远行那一层的分相，不在这一章的范围里。
   * 印出来，是为了它别在某次改动里悄悄变成一个谁也说不清的数。
   */
  console.log('\n  ——已知缺口：远行那一趟的天数是手写的，跟那处地方的路程对不上——\n')
  for (const place of PLACES) {
    const gap = place.days - 8
    console.log(
      `    ${place.calls.padEnd(10, '　')}　实际 ${String(place.days).padStart(2)} 日　剧本推 8 日　${gap === 0 ? '正好' : gap > 0 ? `少推 ${gap} 日` : `多推 ${-gap} 日`}`,
    )
  }
  console.log('\n  他认准的是哪一处，剧本静态不知道。修它要动远行那一层的分相，')
  console.log('  不在这一章里。**写在这儿是为了它别悄悄变成一个谁也说不清的数。**')
}

// ============================================================
// 三、找不到是正常结果
// ============================================================
console.log('\n=== 三、一趟一趟地去，一趟一趟地空 ===\n')
{
  /**
   * 「一定白跑」是可以静态算的：**那一格没有任何一条产出通路**——
   * 不问人、不听见、不记下什么。而带产出通路的那些也常常空手
   * （两道闸拦住、话头绕到别处去了），所以这是个下界。
   */
  console.log('  静态下界（那一格根本没有产出通路）：\n')
  let deadWeight = 0
  let allWeight = 0
  for (const errand of ERRANDS) {
    const total = errand.turnouts.reduce((sum, one) => sum + one.weight, 0)
    const dead = errand.turnouts
      .filter((one) => !one.ask && !one.hears && !one.takes)
      .reduce((sum, one) => sum + one.weight, 0)
    deadWeight += dead
    allWeight += total
    const share = dead / total
    console.log(
      `    ${errand.label.padEnd(12, '　')}　${((share * 100).toFixed(0) + '%').padStart(4)}  ${'█'.repeat(Math.round(share * 30))}`,
    )
    if (share < 0.4) {
      console.log(`      ✗ 这一趟白跑不到四成——它成了一条可靠的路。`)
      failed += 1
    }
  }
  const floor = deadWeight / allWeight
  console.log(`\n  四趟合起来的下界：${(floor * 100).toFixed(0)}%`)
  if (floor < 0.5) {
    console.log('\n  ✗ 一定白跑的不到一半。找不到就不再是常态了。')
    failed += 1
  }

  // 实测：带产出通路的那些也常常空手
  const kinds = new Map<string, number>()
  let empty = 0
  for (let i = 0; i < RUNS; i += 1) {
    seeker()
    const errand = ERRANDS[i % ERRANDS.length]!
    const visit = goOn(errand.id)
    if (!visit) continue
    kinds.set(visit.turnout.kind, (kinds.get(visit.turnout.kind) ?? 0) + 1)
    if (!visit.got) empty += 1
  }
  console.log(`\n  实测 ${RUNS} 趟，空着手回来的：${((empty / RUNS) * 100).toFixed(0)}%\n`)
  for (const [kind, n] of [...kinds.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(
      `    ${kind}　${((n / RUNS) * 100).toFixed(0).padStart(3)}%  ${'█'.repeat(Math.round((n / RUNS) * 40))}`,
    )
  }
  console.log()
  console.log('  实测比下界还高，因为「问着了人」也过不了那两道闸——')
  console.log('  他找着了人，那人不知道，或者知道而不肯说。')
  if (empty / RUNS < floor) {
    console.log('\n  ✗ 实测白跑率低于静态下界。有一条产出通路给得太松了。')
    failed += 1
  }
}

// ============================================================
// 四、线索可以是真的，也可以是他自己听出来的
// ============================================================
/**
 * 三种错法，各有各的来历：
 *
 *   别人说错了　　商旅那句「北边山里有个不下山的」——他自己也信
 *   他找错了人　　渡口那个道装的，其实是去府城做法事的
 *   他自己听出来的　对方摆摆手说不清楚，而他读出了「他知道，只是不肯说」
 *
 * 最后一种最要紧：**那不是别人骗他，是他自己听出来的**，
 * 而且它只在心里存着念头的人身上发生。
 */
console.log('\n=== 四、他记下的东西里，有真有假 ===\n')
{
  const kinds = new Map<string, number>()
  const misheard = new Set<string>()
  let learned = 0
  for (let i = 0; i < RUNS; i += 1) {
    seeker()
    goOn(ERRANDS[i % ERRANDS.length]!.id)
    for (const one of useCharacterStore().knowledge) {
      learned += 1
      const key = one.mistaken ? `错在${one.mistaken}` : '没错'
      kinds.set(key, (kinds.get(key) ?? 0) + 1)
      if (one.mistaken) misheard.add(one.id)
    }
  }
  console.log(`  ${RUNS} 趟里记下 ${learned} 条。其中：\n`)
  for (const [kind, n] of [...kinds.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(
      `    ${kind.padEnd(6, '　')}　${((n / learned) * 100).toFixed(0).padStart(3)}%  ${'█'.repeat(Math.round((n / learned) * 40))}`,
    )
  }
  console.log('\n  错的那些，玩家一条也看不出来——认知层里它们跟对的长得一模一样。')
  console.log(`\n  他记岔的那几条：${[...misheard].join('、')}`)

  if (!kinds.has('没错') || !kinds.has('错在事实')) {
    console.log('\n  ✗ 真的假的没有同时出现。「线索可真可假」这句话就落空了。')
    failed += 1
  }
  if (!misheard.has('someone-who-knows')) {
    console.log('\n  ✗ 没有一次「你以为他知道」——越问越远那条路是断的。')
    failed += 1
  }

  /**
   * 而这一条只长在心里存着念头的人身上。
   *
   * 同一句「不清楚」，一个没装着这件事的人转身就忘了。
   * 所以把念头那个旗标切掉再跑一遍——**它必须一次也不出现**。
   */
  let withoutLeaning = 0
  for (let i = 0; i < RUNS; i += 1) {
    seeker()
    useWorldStore().setFlag('leaning:know', false)
    goOn(ERRANDS[i % ERRANDS.length]!.id)
    if (useCharacterStore().knows('someone-who-knows')) withoutLeaning += 1
  }
  console.log(`\n  同样 ${RUNS} 趟，把那个念头切掉：「你以为他知道」出现 ${withoutLeaning} 回`)
  console.log('  同一句「不清楚」，一个心里没装着这件事的人，转身就忘了。')
  if (withoutLeaning > 0) {
    console.log('\n  ✗ 没有念头的人也会听出这句话来。那它就不是他自己听出来的了。')
    failed += 1
  }
}

// ============================================================
// 五、找了这些年一件也对不上，念头就退下去了
// ============================================================
/**
 * **「他放弃了」不是玩家点了「算了」那一下。**
 *
 * 点「算了」是他做的一个决定；空手回来四趟是世界一遍一遍
 * 告诉他没有这回事。这一节验的是后一种——
 * 那条完整的、也是最常见的一生：
 *
 *     想弄明白修士 → 找了三年 → 什么都没找到
 *     → 觉得这些只是传说 → 念头退下去了
 */
console.log('\n=== 五、什么也没找到，于是那件事淡了 ===\n')
{
  const tries = new Map<number, number>()
  let never = 0
  for (let i = 0; i < 600; i += 1) {
    seeker()
    const world = useWorldStore()
    let n = 0
    while (n < 40 && !world.hasFlag('came-up-empty')) {
      goOn(ERRANDS[n % ERRANDS.length]!.id)
      n += 1
    }
    if (world.hasFlag('came-up-empty')) tries.set(n, (tries.get(n) ?? 0) + 1)
    else never += 1
  }
  const counts = [...tries.entries()].sort((a, b) => a[0] - b[0])
  const median = counts.length > 0 ? counts[Math.floor(counts.length / 2)]![0] : -1
  console.log(`  白跑 ${GAVE_UP_AT} 趟才算「什么也没找到」。跑到那一步用了几趟：\n`)
  for (const [n, times] of counts.slice(0, 10)) {
    console.log(`    ${String(n).padStart(2)} 趟　${String(times).padStart(3)} 人`)
  }
  console.log(`\n  中位数 ${median} 趟。四十趟也没攒够的：${never} 人`)
  if (never > 60) {
    console.log(`\n  ✗ 六百人里有 ${never} 个跑了四十趟还没死心——那道闸太松了。`)
    failed += 1
  }

  // 攒够了以后，念头真的会退
  const damper = DAMPERS.find((one) => one.id === 'came-up-empty')!
  seeker()
  const leaning = useLeaningStore()
  const world = useWorldStore()
  const at = { ...world.time }
  leaning.stir('know', 24, { at, text: '他想弄明白。' }, at)
  const before = leaning.weightOf('know')
  const beforeSettle = leaning.weightOf('settle')
  world.setFlag('came-up-empty', true)
  const said = dampen([])
  const after = leaning.weightOf('know')
  const afterSettle = leaning.weightOf('settle')

  console.log(`\n  「想弄明白」　${before} → ${after}`)
  console.log(`  「过日子」　　${beforeSettle} → ${afterSettle}`)
  for (const line of said) console.log(`\n      ${line}`)
  console.log()
  console.log('  他没有失败，他只是长大了。**这条人生完全合法，甚至是最常见的一条。**')
  if (after >= before) {
    console.log('\n  ✗ 什么也没找到，念头却没有退。')
    failed += 1
  }
  if (afterSettle <= beforeSettle) {
    console.log('\n  ✗ 念头退下去，顶上来的却是一片空白。')
    failed += 1
  }
  if (!said.some((line) => line === damper.text)) {
    console.log('\n  ✗ 那句话没有说出来。')
    failed += 1
  }
}

// ============================================================
// 六、寻找 → 错误认知 → 行动 → 失败 → 日录 → 多年以后
// ============================================================
/**
 * 这一节走那条完整的链，一步也不替它作弊。
 *
 * 镇上那个老人说的**方向从头到尾就是对的**——南山那一带
 * 早年确实住过那样一个人。他只错在年头上：那位早不在了。
 *
 * 于是玩家跑了八天，见着一个会劈柴的道士，回来时确信这件事到此为止。
 * **而那句「不过如此」是错的**，只是要等三年才有人告诉他。
 */
console.log('\n=== 六、南山那一趟，和三年以后 ===\n')
{
  // 一、跑镇上，直到撞见茶楼后头那个老人
  let n = 0
  seeker()
  const world = useWorldStore()
  while (n < 500 && !world.hasFlag('sure-of')) {
    goOn('go-to-town')
    n += 1
  }
  const character = useCharacterStore()
  console.log(`  跑了 ${n} 趟镇上，才撞见茶楼后头那个老人。`)
  console.log(`  他认准的地方：${String(world.getFlag('sure-of'))}`)
  const took = character.knowledge.find((one) => one.id === 'the-daoist-in-nanshan')
  console.log(
    `  他记下的那条：「${took?.title}」　解释：${took?.interpretation}　错了吗：${took?.mistaken ?? '没错'}`,
  )
  console.log()
  console.log('  **这条没有 mistaken，因为老人说的方向本来就是对的。**')
  console.log('  错的是他自己接下来那一步：他以为那人现在还在。')

  if (!world.hasFlag('sure-of')) {
    console.log('\n  ✗ 五百趟也没撞见那个老人。这条链的头一环是断的。')
    failed += 1
  }
  if (!took) {
    console.log('\n  ✗ 撞见了，可他什么也没记下。')
    failed += 1
  }

  // 二、跑一趟南山。八天，白跑
  const trip = follow('南山')
  console.log(`\n  他跑了一趟。回来时的结论：${trip.outcome}\n`)
  for (const block of trip.blocks) {
    if ('text' in block) console.log(`      ${block.text}`)
  }
  if (trip.outcome === '对上了') {
    console.log('\n  ✗ 南山不该是真的。')
    failed += 1
  }

  // 三、这一天要落进日录，而且要带着「南山」
  const diary = useDiaryStore()
  const day = diary.closeDay(world.time)
  console.log(`\n  这一天进了日录：${day ? '进了' : '没进'}　标记：${day?.tags.join('、') ?? '—'}`)
  if (!day?.tags.includes('南山')) {
    console.log('\n  ✗ 这一天没有沾上「南山」。三年以后就没有地方可以落脚了。')
    failed += 1
  }

  // 四、当场不该点亮。当场就明白的不叫「多年以后」
  const rule = HINDSIGHTS.find((one) => one.id === 'who-lived-near-there')!
  const nowLit = reconsider()
  console.log(`\n  当天回看：点亮 ${nowLit} 天（`)
  console.log(`  　那一条要隔 ${rule.after} 年才说得出口——当场就明白的不叫「多年以后」）`)
  if (nowLit > 0) {
    console.log('\n  ✗ 当天就点亮了。那这句话只是延迟发奖，不是回忆。')
    failed += 1
  }

  // 五、三年以后
  world.advanceTime({ years: rule.after })
  const lit = reconsider()
  const relit = diary.days.find((one) => one.id === day?.id)
  console.log(`\n  过了 ${rule.after} 年再回看：点亮 ${lit} 天\n`)
  for (const note of relit?.hindsight ?? []) console.log(`      ${note.text}`)
  console.log()
  console.log('  **一个字也没有改历史。** 那一趟仍然是白跑的，那八天仍然没有回来——')
  console.log('  变的只是他今天怎么看那八天。')
  if (lit === 0 || !relit?.hindsight?.length) {
    console.log('\n  ✗ 三年过去了，那一天还是没有被翻回来。这一条规则永远点不亮。')
    failed += 1
  }
}

// ============================================================
// 七、走到门口，不等于拿到一个修仙系统
// ============================================================
/**
 * 用户那句话是这一章真正的落点：
 *
 *   我们要做的不是「找到修士 → 获得修炼资格」，
 *   而是「找到修士 → 第一次站在一个自己完全不了解的世界门口」。
 *
 * 所以这一节数的是**他手里到底多了什么**。答案应该是：
 * 几条他自己也分不出真假的消息，一处他认准了的地方，
 * 和几十天再也回不来的时间。境界没动，身份没动，功法一个字也没有。
 */
console.log('\n=== 七、他手里到底多了什么 ===\n')
{
  seeker()
  const character = useCharacterStore()
  const world = useWorldStore()
  const realmBefore = character.realm
  const identityBefore = character.identity

  for (let i = 0; i < 40; i += 1) goOn(ERRANDS[i % ERRANDS.length]!.id)
  follow(String(world.getFlag('following') ?? '南山'))

  console.log(`  跑了四十趟，外加一次远行。他现在：\n`)
  console.log(`    境界　　${realmBefore} → ${character.realm}`)
  console.log(`    身份　　${identityBefore} → ${character.identity}`)
  console.log(
    `    认知　　${character.knowledge.length} 条，其中记岔的 ${character.knowledge.filter((one) => one.mistaken).length} 条`,
  )
  console.log(`    日录　　攒着 ${useDiaryStore().pending.lines.length} 句还没落下`)
  console.log()
  console.log('  境界和身份一动没动。**他跑了四十趟，什么也没有得到，**')
  console.log('  除了几条自己分不出真假的消息，和几十天再也回不来的时间。')

  if (character.realm !== realmBefore) {
    console.log('\n  ✗ 打听了几趟就涨了境界。那这一章就变成修炼系统的前置任务了。')
    failed += 1
  }
  if (character.identity !== identityBefore) {
    console.log('\n  ✗ 打听了几趟身份就变了。')
    failed += 1
  }

  /**
   * 那扇门在别处，而且它只给一个身份，不给一套系统。
   *
   * `seek:door` 的 `taken` 那一节 `onEnter` 只有两件事：
   * 记一句编年，和 `identity: '门下'`。**没有功法，没有境界，
   * 没有任何一格数值。** 此后的事是另一段人生——
   * 而那一段还没有写。
   */
  const taken = seekingScenes['seek:door']!.nodes.taken!
  console.log('\n  而那扇门真开了的时候，落在他身上的是：\n')
  for (const effect of taken.onEnter ?? []) {
    console.log(`    ${effect.type}${effect.type === 'identity' ? `　→　${effect.identity}` : ''}`)
  }
  console.log()
  console.log('  一个身份，一句编年。**没有功法，没有境界，没有任何一格数值**——')
  console.log('  他只是第一次站在一个自己完全不了解的世界门口。')

  const forbidden = ['attribute', 'realm', 'aspect', 'item']
  const leaked = (taken.onEnter ?? []).filter((one) => forbidden.includes(one.type))
  if (leaked.length > 0) {
    console.log(`\n  ✗ 那扇门后面直接发了东西：${leaked.map((one) => one.type).join('、')}`)
    failed += 1
  }
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  念头改的是他看得见几条路，不是他去了会碰上什么。')
  console.log('  他跑了很多趟，多半空手回来；记下的那几条自己分不出真假；')
  console.log('  找了几年一件也对不上，那件事就慢慢淡了——**而这是最常见的一生**。')
  console.log('  少数人认准一处地方跑了八天，见着一个会劈柴的道士，')
  console.log('  三年以后才有人告诉他：那儿真住过那样一个人，不是你见的那个。\n')
}
