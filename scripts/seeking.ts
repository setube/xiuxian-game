/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 找：一个凡人怎么从「听说有仙人」走到「站在修仙门前」。
 *
 * ## 修行的第一关不是学不会，是不知道去哪找
 *
 * 这一支刻意不碰功法、炼气、境界——**那些是门里的事**。
 * 这里要验的是门外那一段，而绝大多数人一辈子也没走到门口。
 *
 * 五种结果：
 *
 *   A　找到真线索
 *   B　找到假线索
 *   C　什么也没找到　　← 最常见的一种
 *   D　找到入口但自己放弃
 *   E　找到入口但没有资格
 *
 * ## 前六节量引擎，第七节量人生
 *
 * 前六节把 `askAround` / `follow` / `knock` 当纯函数直接调，
 * 手里替他掷「他问了几年」。那量的是**这套规则本身是什么形状**。
 *
 * 可玩家不是这么碰到它的。他得先有「想弄明白」这个念头，
 * 先听说过世上有修士，还得那一年的年表刚好抽中问人那一卷。
 * 第七节走完整人生，量的是**那条路他有没有机会走上去**——
 * 两个数字差了一个数量级，而**差的那部分正是这一册要说的话**。
 *
 * 跑法：bun scripts/seeking.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { LEADS, PLACES } from '../src/content/leads'
import { askAround, crossed, follow, knock, leadsHeard } from '../src/engine/seeking'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { mapShards, shardsOf } from './lib/parallel'
import { mergeShards, type SeekingShard } from './tasks/seeking-lives'

/**
 * 走查跑多少世。
 *
 * ## 换算到玩家的尺度，跟量得够准，是两件事
 *
 * 「没有人会玩八千世」是对的，可它是一句关于**报什么**的话，
 * 不是一句关于**量多少**的话。这两件事从前混在一起，代价挺大：
 *
 * 头一版跑八千世，报的是「A 占 1.1%」——那个小数点后一位
 * 谁也不会经历。正确的答复是最后一节：把每一格换算成
 * 「玩十世的人有多大概率见过一次」。**那一节现在就在。**
 *
 * 可当时还顺手把世数从八千砍到四百，理由是「四百世够看清形状了」。
 * 不够。A、D、E 各占一个点上下，四百世里各是四五个人，
 * 抽多抽少能差出一倍——于是第六节那张表跟着一起晃：
 * 同一份代码连跑两批，「玩十世能见到 A 一次」一次报 5%，一次报 14%。
 *
 * **砍样本量毁掉的，恰恰是那张要给玩家看的表。**
 *
 * 所以按老规矩重定：世数照最稀那一格定。A 大约百分之一，
 * 要把它量到 ±0.3 个点，得四千世上下——跑完七秒，不值当省。
 * 而报出来的，仍然只报十世尺度上的那一张。
 */
const RUNS = 4000

/** 一个人大概会玩几世。所有分布最后都要换算到这个尺度上 */
const A_PLAYER_PLAYS = 10

let failed = 0

function fresh(insight = 50, root = 50) {
  setActivePinia(createPinia())
  useHouseholdStore()
  const character = useCharacterStore()
  character.attributes = { ...character.attributes, insight, root }
  return { character, world: useWorldStore() }
}

// —— 一、假的比真的多得多 ——
console.log('\n=== 一、他听到的东西里，假的占大头 ===\n')
{
  const byTruth = new Map<string, number>()
  for (const lead of LEADS) {
    byTruth.set(lead.truth, (byTruth.get(lead.truth) ?? 0) + lead.weight)
  }
  const total = [...byTruth.values()].reduce((a, b) => a + b, 0)
  for (const truth of ['假', '半真', '真']) {
    const n = byTruth.get(truth) ?? 0
    console.log(
      `  ${truth}　${String(((n / total) * 100).toFixed(0)).padStart(3)}%  ${'█'.repeat(Math.round((n / total) * 40))}`,
    )
  }
  console.log()
  console.log('  而他分不出来。手里唯一的工具有两样：跑一趟看看，')
  console.log('  或者听第二个人说同一件事——两样都要花时间，都可能白花。')
  console.log()
  console.log('  最要紧的是**假的讲得比真的还清楚**：')
  const fake = LEADS.find((lead) => lead.id === 'the-storyteller')!
  const real = LEADS.find((lead) => lead.id === 'the-march-climb')!
  console.log(`      〔假〕${fake.says}`)
  console.log(`      〔真〕${real.says}`)
  console.log()
  console.log('  编的人不需要顾忌事实，所以他有名有姓有年份。')
  console.log('  而真的那一句，说话的人自己都不知道那是什么。')

  const fakeShare = (byTruth.get('假') ?? 0) / total
  if (fakeShare < 0.4) {
    console.log('\n  ✗ 假消息不到四成——那打听就成了一条可靠的路。')
    failed += 1
  }
}

// —— 二、打听多半什么也听不着 ——
console.log('\n=== 二、问一回，多半什么也听不着 ===\n')
{
  for (const insight of [30, 50, 70]) {
    let got = 0
    for (let i = 0; i < 300; i += 1) {
      fresh(insight)
      if (askAround()) got += 1
    }
    console.log(`  心思 ${insight}　问一回听着东西的：${((got / 300) * 100).toFixed(0)}%`)
  }
  console.log()
  console.log('  心思细的人问得多、问得对——**可这一条帮不了他分辨真假**。')
  console.log('  它只让他听到更多消息，而消息里假的仍然占大头。')
}

// —— 三、跑一趟 ——
console.log('\n=== 三、跟着一条线索跑一趟 ===\n')
{
  for (const place of PLACES) {
    const tally = new Map<string, number>()
    for (let i = 0; i < 200; i += 1) {
      fresh(55)
      const outcome = follow(place.id).outcome
      tally.set(outcome, (tally.get(outcome) ?? 0) + 1)
    }
    const parts = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} ${Math.round((n / 200) * 100)}%`)
    console.log(
      `  ${place.calls.padEnd(12)} ${place.real ? '（真的）' : '（没有）'}　${parts.join('　')}`,
    )
  }
  console.log()
  console.log('  世界怎么回应，只看那地方到底是什么，不看他多想找到。')
  console.log('  而**真地方也未必看得出来**——它没有牌子，也没有人迎出来。')
}

// —— 四、门前 ——
console.log('\n=== 四、站在门前，他永远不知道人家凭什么 ===\n')
{
  for (const root of [30, 55, 75, 90]) {
    let taken = 0
    for (let i = 0; i < 200; i += 1) {
      fresh(50, root)
      if (knock(true).outcome === '收下了') taken += 1
    }
    console.log(`  资质 ${String(root).padStart(2)}　收下的：${((taken / 200) * 100).toFixed(0)}%`)
  }
  console.log()
  fresh(50, 40)
  const turned = knock(true)
  for (const block of turned.blocks) {
    if ('text' in block) console.log(`      ${block.text}`)
  }
  console.log()
  console.log('  那个数在他出生那一刻就定了，跟出身、跟努力、跟他有多想都没关系。')
  console.log('  **而他到死也不知道那两根指头摸的是什么。**')
}

// —— 五、五种结果 ——
console.log('\n=== 五、五种结果 ===\n')

const LABELS: Record<string, string> = {
  A: '找到真线索（其中极少数进了门）',
  B: '找到的全是假的，或者跑空了',
  C: '什么也没找到',
  D: '找到入口，自己没进',
  E: '找到入口，人家没收',
}

/** 一个人找了一辈子，最后落在哪一格 */
function oneLife(): { key: string; line: string; heard: number } {
  /**
   * 每个变量各掷各的。
   *
   * 头一版全从 i 派生，结果「他问了几年」和「他到门前进不进」
   * 悄悄相关了——问得少的人恰好也是不进门的那一批，
   * 于是 D 那一格永远是空的。**走查里的变量必须互相独立。**
   */
  const insight = 30 + Math.floor(Math.random() * 50)
  const root = 20 + Math.floor(Math.random() * 75)
  fresh(insight, root)

  /**
   * 他问了几年。
   *
   * **大多数人问一两年就不问了**——场景那一层由「算了」那个选项承载，
   * 这里按同样的形状模拟：一半的人只问一两回，少数人问上五六年。
   */
  const rounds =
    Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 6)
  for (let n = 0; n < rounds; n += 1) askAround()

  const heard = leadsHeard()
  const where = crossed()

  /**
   * 哪儿也去不了。
   *
   * **手里有几句话，跟找到线索是两回事。** 没有两条撞在一起，
   * 他就没有任何理由动身——那些话只是攒在心里，
   * 跟一句也没听着的人比，他多的只是几件说不清的事。
   */
  if (!where) {
    return {
      key: 'C',
      heard: heard.length,
      line:
        heard.length === 0
          ? '问了几年，一句也没问着。'
          : `听着 ${heard.length} 件事，没有两件对得上。哪儿也没去。`,
    }
  }

  const trip = follow(where)
  if (!trip.closer) {
    return { key: 'B', heard: heard.length, line: `两条对上了，跑了一趟——${trip.outcome}。` }
  }

  // 走到门前了。进不进是他自己的事
  const door = knock(Math.random() < 0.8)
  if (door.outcome === '没进去')
    return { key: 'D', heard: heard.length, line: '走到了门前，说自己只是路过。' }
  if (door.outcome === '收下了')
    return { key: 'A', heard: heard.length, line: '走到了门前，人家让他跟上。' }
  return { key: 'E', heard: heard.length, line: '走到了门前，人家摸了摸他的腕子，说不成。' }
}

const shapes: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
{
  const samples: Record<string, string> = {}
  /** C 里头听到过东西的有几个。**这一格 README 引着，所以它得有个出处** */
  let heardSomethingButStuck = 0
  for (let i = 0; i < RUNS; i += 1) {
    const { key, line, heard } = oneLife()
    shapes[key] = (shapes[key] ?? 0) + 1
    if (key === 'C' && heard > 0) heardSomethingButStuck += 1
    if (!samples[key]) samples[key] = line
  }

  for (const key of ['C', 'B', 'E', 'A', 'D']) {
    const n = shapes[key] ?? 0
    console.log(
      `  ${key}　${LABELS[key]!.padEnd(30)} ${String(((n / RUNS) * 100).toFixed(1)).padStart(5)}%`,
    )
  }

  /**
   * C 不是一种人，是两种。
   *
   * 「一句也没问着」和「攒了五件事，没有两件对得上」落在同一格里，
   * 可这两个人夜里想的完全不是一回事。README 里写着
   * 「C 里头有一大半人其实听到过东西」——**那句话从前是照着
   * 十世样本用眼睛估的，走查根本不报这个数**，正是「文档自己
   * 犯了自己写的规矩」那一条。这一行让它有个出处。
   */
  const cTotal = shapes.C ?? 0
  const heardShare = cTotal > 0 ? heardSomethingButStuck / cTotal : 0
  console.log(
    `\n  其中 C 那一格里，听到过东西却哪儿也去不了的占 ${(heardShare * 100).toFixed(0)}%——`,
  )
  console.log('  剩下的是问了几年一句也没问着。**这两种人夜里想的不是一回事。**')

  console.log('\n  各举一例：\n')
  for (const key of ['C', 'B', 'A', 'D', 'E']) {
    if (samples[key]) console.log(`  ${key}　${samples[key]}`)
  }

  console.log()
  const atTheDoor = ((shapes.A ?? 0) + (shapes.D ?? 0) + (shapes.E ?? 0)) / RUNS
  if ((shapes.C ?? 0) / RUNS < 0.5) {
    console.log('  ✗ 一半以上的人都找着了什么——那打听就成了一条可靠的路。')
    failed += 1
  } else if (atTheDoor > 0.2) {
    console.log('  ✗ 两成以上的人都走到了门前——那这条路太好走了。')
    failed += 1
  } else {
    console.log(`  走到门前的一共 ${(atTheDoor * 100).toFixed(1)}%。`)
    console.log('  **修行的第一关不是学不会，是不知道去哪找。**')
  }
}

// —— 六、一个玩十世的人看得到什么 ——
/**
 * ## 分布不是玩家会经历的东西
 *
 * 上面那张表是四千世量出来的，可**玩家一辈子玩不了那么多**。
 * 1% 那一格在四千世里是四十个人，在十世里通常一个也没有——
 * 也就是说，**那件事对绝大多数玩家等于不存在**。
 *
 * 所以真正该看的不是「占比多少」，是「玩十世的人有多大概率见过一次」。
 * 这一节把上面每一格都换算到那个尺度上，再跑十世给人读。
 *
 * 换算不能替上一节把数量得准：这一节报的每一个百分数，
 * 精度都是上一节那张表给的。上面晃，这里就跟着晃。
 */
console.log(`\n=== 六、一个玩 ${A_PLAYER_PLAYS} 世的人看得到什么 ===\n`)
{
  for (const key of ['C', 'B', 'E', 'A', 'D']) {
    const p = (shapes[key] ?? 0) / RUNS
    const seen = 1 - (1 - p) ** A_PLAYER_PLAYS
    const bar = '█'.repeat(Math.round(seen * 30))
    console.log(
      `  ${key}　${LABELS[key]!.padEnd(30)} ${String(Math.round(seen * 100)).padStart(3)}%  ${bar}`,
    )
  }
  console.log(`\n  「至少见过一次」的概率。**这才是玩家会经历的那张表。**`)

  const doorOnce =
    1 - (1 - ((shapes.A ?? 0) + (shapes.D ?? 0) + (shapes.E ?? 0)) / RUNS) ** A_PLAYER_PLAYS
  console.log(`\n  玩 ${A_PLAYER_PLAYS} 世，至少站到过一次门前：${Math.round(doorOnce * 100)}%`)
  console.log(`  也就是说有 ${Math.round((1 - doorOnce) * 100)}% 的人玩完十世，连门口都没见过。`)

  console.log(`\n  那 ${A_PLAYER_PLAYS} 世具体是什么样：\n`)
  for (let i = 0; i < A_PLAYER_PLAYS; i += 1) {
    const { key, line } = oneLife()
    console.log(`    ${String(i + 1).padStart(2)}　〔${key}〕${line}`)
  }
  console.log('\n  十世里多半整整齐齐全是 C。**而那正是这一册要的样子**——')
  console.log('  一个人打听了一辈子什么也没打听着，是常态，不是失败。')
}

// —— 七、可观测路径：真人生里，他有没有机会走上这条路 ——
/**
 * 上面六节量的是规则的形状，这一节量的是**玩家够不够得着**。
 *
 * ## 这一节是被一份门禁逼出来的
 *
 * `verify.ts` 第五道会把「三百世里没人走到的节点」印成名单。
 * 第一次跑，`seek:crossed` 和 `seek:door` 两卷九个节点整整齐齐
 * 一个人也没走到——而 seeking 是刚加的一册。看着像新内容接错了线。
 *
 * 查下来不是。链条完好，只是**每一环都在乘**。某一批两千世实测：
 *
 *     心里生出「想弄明白」这个念头　　　　　　 2.6%
 *     还得先听说过世上有修士　　　　　　　　　 37%
 *     两样都占上　　　　　　　　　　　　　　　 1.6%
 *     那几年的年表抽中了问人那一卷　　　　　　 2.8%
 *     真问着了东西（多半什么也问不着）　　　　 2.2%
 *     攒到两条不相干的消息指向同一处　　　　　 0.2%
 *
 * **这几个数每批都在晃，写在这儿是给人读形状的，不是准数。**
 * 最后那一格连跑几批是 0.2% 上下，而它自己就能晃一倍。
 * 判据千万别照着这张表里的某个数去定——下面 `LIVES` 那一段
 * 记着一次现成的教训：照着一个没人复核的数定判据，数漂走了，
 * 门禁就开始无故红灯，而内容一个字也没坏。
 *
 * 三百世乘出来是一个人上下，
 * **一个期望值在一附近的格子印出零来不是内容坏了，是三百世不够。**
 * 这一节跑两千世，所以它有资格替那两卷作证。
 *
 * ## 顺带查出一件本来看不见的事
 *
 * 「两条对上了」的人里，绝大多数是**十五岁那年**才对上的，
 * 而用得上它的那一卷窗口是十三到十六。也就是说这条路
 * 十有八九只赶得上最后一年——**旗标设上的时候，那扇窗快关了。**
 * 它现在还通，可再往前挪一岁窗口就会当场断掉，
 * 而断掉的样子跟今天一模一样：名单上多两卷，谁也说不清为什么。
 */
console.log('\n=== 七、可观测路径：真人生里走得到吗 ===\n')
{
  /**
   * 世数按最稀那一格定，跟第五节是同一条规矩。
   *
   * 头一版这里写着「实测千分之三点七——两千世里七回上下，掷出零的概率
   * 不到千分之一」。那个数后来掉下去了：连跑五批是 0、2、3、1、3 回，
   * **千分之一上下，两千世的期望只剩两回**。判据却一直是「零回就红」，
   * 于是它每七八次跑就无故红一次，而内容一个字也没坏——
   * 这正是下面 `enteredDoor` 那段明写着不判红的理由，
   * 只是这一格的期望是后来才掉下去的，判据没跟着复核。
   *
   * 掉下去不是哪一章挤的：摘掉最近新写的那一章再跑三批是 3、1、3 回，
   * 跟带着它跑的 0、2 回是同一个量级。**注释里那个「七回」从写下那天起
   * 就没人再复核过**，而它是这道判据成不成立的全部依据。
   *
   * 修法见 `RETRY`：零回时才追加一批，不把世数一口气抬上去——
   * 这一支是要跟另外三十七支一起跑的，平常那八成七的跑法不该跟着变慢。
   */
  const LIVES = 2000

  /** 一批没撞上时追加多少世。累计六千世，期望两回的话掷出全零是四百分之一的事 */
  const RETRY = 4000

  /**
   * 这两千世摊到多个线程上同时跑。
   *
   * 单世模拟整个搬去了 `tasks/seeking-lives.ts`，走法一步没动——
   * 同一套年表、同样两百回合上限、同样把钩子挂在 `locate` 上。
   * 改的只是记账方式：原先各世往这里几个计数器上直接 `+= 1`，
   * 现在每片各攒各的，跑完由 `mergeShards` 加起来。
   * **加法可结合，所以摊成几片都不影响总数**——只有比例的分母要当心，
   * 那个得用 `LIVES`，不能拿某一片的世数去除。
   *
   * ## 为什么动的是这一节
   *
   * 这一支原先要跑十三分半，是四十支门禁里最慢的一支，而慢处全在这一节：
   * **两千世 × 每世一百多个回合**，前面六节加起来不到十秒。
   * 这个乘积不是哪一处写坏了，没得修；能拆的地方只有一个——
   * 世与世之间没有任何一条边，每一世自己 `createPinia()`，
   * 它们本来就可以同时跑。
   *
   * 顺带捡了第二份便宜：worker 那一侧是原生 Node 起的，认 `NODE_ENV=production`，
   * 于是 pinia 和 vue 都走生产版构建。开发版每次 `useStore()` 都要备一份警告
   * 文案、挂一次 devtools 埋点，而 `useStore` 正是这套模拟里最热的那个函数
   * （CPU 采样占三成六）。光这一项，单世就从 477 毫秒掉到 180 毫秒。
   * 主线程吃不到这份便宜——它是 vite-node 起的，按自己那套条件解析，
   * 给多少 NODE_ENV 都还是开发版，实测只从 63.7 秒动到 61.4 秒。
   */
  const spread = shardsOf(LIVES)
  console.log(`  ${LIVES} 世摊成 ${spread.length} 片同时跑，每片 ${spread[0]} 世上下……\n`)

  const { funnel, enteredCrossed, enteredDoor, ages } = mergeShards(
    await mapShards<SeekingShard>({ task: 'scripts/tasks/seeking-lives.ts', runs: LIVES }),
  )

  console.log(`  ${LIVES} 世完整人生。每一环都在乘：\n`)
  for (const [label, n] of Object.entries(funnel)) {
    console.log(
      `  ${label.padEnd(16)} ${String(n).padStart(5)}   ${((n / LIVES) * 100).toFixed(1).padStart(5)}%`,
    )
  }

  console.log(`\n  走进「两条对上了」那一卷：${enteredCrossed} 回`)
  console.log(`  走进「门前」那一卷：　　  ${enteredDoor} 回`)

  console.log('\n  他是在几岁对上的（而用得上它的那一卷窗口是 13–16）：')
  for (const [age, n] of [...ages.entries()].sort((a, b) => a[0] - b[0])) {
    const late = age >= 15 ? '　← 只剩最后一两年' : ''
    console.log(`    ${age} 岁　${n} 世${late}`)
  }

  console.log()
  console.log('  三百世乘出来是一个人上下，所以 verify 第五道会把那两卷印进名单。')
  console.log('  **那不是内容坏了，是三百世不够。** 这一节替它作证。')

  if (enteredCrossed === 0) {
    /**
     * 一批没撞上，先别急着说路断了。
     *
     * 追加一批，撞上一回就够了——**这一节要证的是路通着，不是路有多宽**。
     * 累计六千世还是零回，那才是内容问题：期望若真是两回，
     * 六千世掷出全零是四百分之一的事。
     *
     * 判据一格没松：路真断了，追加多少世也撞不上，照红。松掉的只是抽样。
     *
     * ## 摊开跑之后，这里不再是「撞上就停」
     *
     * 原先是一世一世往下跑，撞见头一回就收手，所以能报「第几世上撞见的」。
     * 摊到多个线程之后那个序号没有意义了——十二片同时在跑，
     * 谁先撞上取决于线程调度，**报出来的数会一次一个样**。
     * 所以这里改成跑满四千世，报的是「四千世里撞见几回」。
     *
     * 代价是这条岔路比从前多跑几世。不心疼：按上面那个算法，
     * 四百分之一才会走到这里，而摊开之后跑满四千世也就三十来秒。
     * **为一条几乎不走的路加一套提前终止，复杂度花在了看不见的地方。**
     */
    const extra = mergeShards(
      await mapShards<SeekingShard>({ task: 'scripts/tasks/seeking-lives.ts', runs: RETRY }),
    )
    if (extra.enteredCrossed > 0) {
      console.log(
        `\n  这一批 ${LIVES} 世没人走进那一卷，追加的 ${RETRY} 世里撞见 ${extra.enteredCrossed} 回——` +
          '路是通的，只是比这个批次量还稀。',
      )
    } else {
      console.log(`\n  ✗ ${LIVES + RETRY} 世里没有一个人走进那一卷——这条路是断的，不是稀的。`)
      failed += 1
    }
  }
  /**
   * 门前那一卷只印，不判红。
   *
   * 它是上一格的严格子集，三千世实测三回——**两千世期望两回，
   * 掷出零来是七分之一的事**。把它写成门禁，红灯的原因会是抽样
   * 而不是内容，而那正是这一整套走查最忌讳的一件事。
   *
   * 这条链有 `enteredCrossed` 守着；门前那一段本身归第四节交代，
   * 那一节直接调 `knock`，两百次一格，稳得多。
   */
  if (enteredDoor === 0) {
    console.log('\n  （门前那一卷这一批没人走到。它是上一格的子集，期望本就在两回上下——')
    console.log('  　这一格不判红：红起来多半是抽样，不是内容。那一段归第四节量。）')
  }
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  他听到的多半是假的，跑一趟多半白跑，而走到门前的是极少数——')
  console.log('  其中还有一部分自己没进去，另一部分被人摸了摸腕子打发回来。\n')
}
