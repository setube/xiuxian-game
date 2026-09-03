/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 欲求 → 念头：一个愿望能不能通向好几个地方。
 *
 * ## 需求、愿望、念头是三样东西
 *
 *     需求　有对象，有期限，会过去。而且它逼着你做事
 *           家里有人病重，要救命
 *
 *     愿望　没有对象，也没有方向。**它只是一种模糊的想要**
 *           想活久一点
 *
 *     念头　有方向。它改变你注意什么、愿意试什么
 *           想学看病 / 想弄明白 / 想守着家
 *
 * 这个区分是有代价才立起来的：从前「想活久一点」被当成一个念头，
 * 于是它得有 `echoes`——可一个只是「怕死」的人在山上、在镇上、
 * 在家里到底会多做什么？答不上来。**因为它根本不指向任何行动。**
 *
 * ## 这一支最要紧的一条
 *
 * **同一个愿望不能只通向一个地方。** 若一个愿望必然长成某个念头，
 * 那个念头就是系统偷偷安排的主线——而这里，「想活久一点」
 * 通向五个地方，其中一个是「什么也没通向」。
 *
 * 跑法：npx vite-node scripts/wishes.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { LEANINGS } from '../src/content/leanings'
import { WISHES, WISH_SPARKS } from '../src/content/wishes'
import { BRANCH_AT, branch } from '../src/engine/leanings'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { Trade } from '../src/types/game'

/**
 * ## 世数按最稀的那一格定——可有一格是买不来的
 *
 * 第四节的分母是「攒到过分岔门槛的人生」，约占总数的三成。
 * 四百世的时候合格样本才一百出头，中间那两档连跑三批分别落在
 * 19 / 29 / 23 和 19 / 10 / 13——**摆动一倍，读起来像有人改过内容。**
 * 提到一千五百世，合格样本四百六，两档收到 22.6 和 13.5。
 *
 * 但最稀的那一格买不来。「不想再被人按住」要求这辈子被邪修
 * 抓过腕子（`lift-wicked`，三百世里八个人），还得在分岔那一掷里
 * 压过另外几条——一千五百世下一个也没出现，再翻一倍多半还是零。
 *
 * 所以那一格不靠世数交代，靠另外两处：第三节把那个旗标直接设进去，
 * 证明这条路是通的；第四节报「抽到几种，一共几种」，让没抽到的
 * 那一种自己报名。**加世数买得到「常见的那几档稳下来」，
 * 买不到「罕见的那一档出现」——后者得换个法子问。**
 */
const RUNS = 1500

/** 这一条没有 leaning：他就是怕，而且不知道能怎么办 */
const NOWHERE = '什么也没通向'

let failed = 0

// —— 一、愿望没有方向，所以它没有 echoes ——
console.log('\n=== 一、愿望和念头差的那一层 ===\n')
{
  console.log(`  念头 ${LEANINGS.length} 种，各自都有 echoes——它们指向具体的行动：`)
  for (const item of LEANINGS.slice(0, 3)) {
    console.log(`      ${item.says.padEnd(18)} ${item.echoes.length} 句回响`)
  }
  console.log()
  console.log(`  愿望 ${WISHES.length} 种，一句 echoes 也没有：`)
  for (const wish of WISHES) {
    console.log(`      ${wish.says.padEnd(18)} 分岔去 ${wish.branches.length} 处`)
  }
  console.log()
  console.log('  一个「想活久一点」的人在山上会多做什么？**答不上来。**')
  console.log('  因为它根本不指向任何行动——这就是愿望和念头差的那一层。')

  const wishHasEcho = WISHES.some((wish) => 'echoes' in wish)
  if (wishHasEcho) {
    console.log('\n  ✗ 愿望长出了 echoes——那它就是个念头了。')
    failed += 1
  }
}

// —— 二、多来源汇聚 ——
console.log('\n=== 二、「想活久一点」是从哪些事上长出来的 ===\n')
{
  const kinds = new Map<string, number>()
  for (const spark of WISH_SPARKS) {
    const kind = spark.tags
      ? '日常里一点一点'
      : spark.requires?.some((c) => c.bond)
        ? '家里没了人'
        : spark.requires?.some((c) => c.knowledge)
          ? '听来的事'
          : '身上发生过的事'
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1)
    console.log(`  ${String(spark.weight).padStart(2)}　${spark.text}`)
  }
  console.log()
  console.log('  来源分四类：')
  for (const [kind, n] of kinds) console.log(`      ${kind}　${n} 条`)
  console.log('\n  没有一条是「你产生了想活久一点的念头」——**每一条都是他做过、')
  console.log('  见过、听过的一件具体的事。**')
}

// —— 三、同一个愿望，分岔去哪儿 ——
console.log('\n=== 三、同一个愿望，五个人走向五个地方 ===\n')
{
  /** 手边有什么，就往哪儿走 */
  const CASES: [string, () => void][] = [
    [
      '给家里抓过药的孩子',
      () => {
        const world = useWorldStore()
        const character = useCharacterStore()
        character.learn({
          id: 'what-medicine-costs',
          title: '药钱',
          summary: '两副药去了半吊钱。',
          category: '世事',
          at: world.time,
          contact: '亲历',
        })
      },
    ],
    [
      '家里开药铺的孩子',
      () => {
        useHouseholdStore().trade = '药铺' as Trade
      },
    ],
    [
      '听说过山里那种人的孩子',
      () => {
        const world = useWorldStore()
        useCharacterStore().learn({
          id: 'cultivators-exist',
          title: '修士',
          summary: '有人说这世上有那种人。',
          category: '修行',
          at: world.time,
          contact: '听说',
        })
      },
    ],
    [
      '家里那个人一直没缓过来',
      () => {
        useWorldStore().setFlag('illness-lingers', true)
      },
    ],
    [
      '被那只凉手抓过腕子的孩子',
      () => {
        useWorldStore().setFlag('wounded-outcome', 'lift-wicked')
      },
    ],
    ['什么也没接触过的孩子', () => {}],
  ]

  for (const [label, setup] of CASES) {
    setActivePinia(createPinia())
    useHouseholdStore()
    useCharacterStore()
    const world = useWorldStore()
    const leaning = useLeaningStore()
    setup()
    // 把愿望推到分岔的门槛。加一，是为了刚好越过去而不是压在线上
    leaning.stir('live-long', BRANCH_AT + 1, { at: world.time, text: '……' }, world.time)
    /**
     * 反复掷，直到他想通为止。
     *
     * 这一节要看的是**手边有什么就往哪儿走**，不是「他今天想不想得通」——
     * 后者在第四节里量。混在一起的话，这张表每次跑出来都不一样，
     * 而它本该是一张确定的对照表。
     */
    let found = branch()
    let guard = 0
    while (found && found.into === null && guard < 300) {
      world.setFlag('branched:live-long', false)
      found = branch()
      guard += 1
    }
    const to = found?.into
      ? (LEANINGS.find((one) => one.id === found.into)?.says ?? found.into)
      : '什么也没通向'

    console.log(`  【${label}】`)
    console.log(`      ${found?.text ?? '（什么也没发生）'}`)
    console.log(`      → ${to}`)
    console.log()
  }

  console.log('  同一个「想活久一点」，五个人走向五个地方——')
  console.log('  而最后那一个哪儿也没去。**愿望不必通向任何地方。**')
}

// —— 四、真实人生里的分布 ——
console.log('\n=== 四、真实人生里，这个愿望通向了哪儿 ===\n')
{
  /**
   * 这个愿望一共能通向几个地方，是**数出来的**，不是抽出来的。
   *
   * 七条分岔落在四个念头上，加上「什么也没通向」那一条，一共五种落点——
   * 这个数从 `WISHES` 里直接数得出来，跟跑多少世没有关系。
   *
   * 所以底下报的是「抽到几种，一共几种」：**前一个数掉了是抽样的事，
   * 后一个数掉了是内容的事。** 从前只报前一个，于是四百世下
   * 「不想再被人按住」那一格没抽到的那两批，表上写的是「通向四个地方」，
   * 读起来跟「这条路还没写」一模一样。
   */
  const branches = WISHES.find((wish) => wish.id === 'live-long')?.branches ?? []
  const EVERY_WHERE = new Set(branches.map((one) => one.leaning ?? NOWHERE))

  /** 落点 id → 人数。key 用 id 不用 `says`，这样才对得上上面那个集合 */
  const where = new Map<string, number>()
  let wished = 0
  let branched = 0

  for (let i = 0; i < RUNS; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    let turns = 0
    while (!narrative.ended && turns < 500) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }
    const leaning = useLeaningStore()
    const world = useWorldStore()
    if (leaning.peakOf('live-long') < BRANCH_AT) continue
    wished += 1
    // 攒到了门槛却还没分岔的，不算一种落点——**它是还没走到，不是走到了没处去**
    if (!world.hasFlag('branched:live-long')) continue
    branched += 1
    const into = (world.getFlag('branched-into') as string | undefined) ?? NOWHERE
    where.set(into, (where.get(into) ?? 0) + 1)
  }

  const saysOf = (id: string) =>
    id === NOWHERE ? NOWHERE : (LEANINGS.find((one) => one.id === id)?.says ?? id)

  console.log(`  ${RUNS} 世里，${wished} 世的「想活久一点」攒到过分岔的门槛。\n`)
  for (const [id, n] of [...where.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(
      `  ${String(((n / Math.max(1, wished)) * 100).toFixed(1)).padStart(5)}%  ${saysOf(id)}`,
    )
  }

  const missing = [...EVERY_WHERE].filter((id) => !where.has(id))
  console.log(`\n  不重样的去处    抽到 ${where.size} 种，一共 ${EVERY_WHERE.size} 种`)
  if (missing.length > 0) {
    console.log(`  （这一批没抽到：${missing.map(saysOf).join('、')}——它们进得去，只是稀）`)
  }

  console.log()
  const top = Math.max(...where.values(), 0)
  if (wished === 0) {
    console.log('  ✗ 一个人也没攒到——这个愿望在真实人生里长不起来。')
    failed += 1
  } else if (EVERY_WHERE.size < 3) {
    /**
     * 这一条查的是内容，不是这一批的运气。
     *
     * 它跟底下那条「抽到不到三种」看着像，其实是两回事：
     * 分岔写少了会红在这里，而且**跑一世还是跑一万世，它都一样红**。
     */
    console.log(`  ✗ 这个愿望一共只通向 ${EVERY_WHERE.size} 个地方——那还是一条主线。`)
    failed += 1
  } else if (where.size < 3) {
    console.log(`  ✗ ${RUNS} 世里只抽到 ${where.size} 种去处——要么世数不够，要么有几条根本进不去。`)
    failed += 1
  } else if (top / wished > 0.7) {
    console.log('  ✗ 七成以上都走了同一条路——那条路就是系统偷偷安排的主线。')
    failed += 1
  } else {
    console.log('  它通向了好几个地方，而没有哪一条占了压倒性的多数。')
    /**
     * 这一句从前无条件印「其余的攒着但还没找到路」——
     * 可实测攒到门槛的人**全都**分岔了，那个「其余」是零个人，
     * 而一句写死的话不会因为它说的是零就闭嘴。
     *
     * 攒够就一定分岔，这本身是条该报的结论（分岔那一步不再筛人，
     * 筛人的是分岔**通向哪里**——那一档里「什么也没通向」占了大半）。
     * **一个空档和一句轻描淡写的补充，读起来是一回事。**
     */
    const waiting = wished - branched
    if (waiting > 0) {
      console.log(`  （其中真的分岔出去的 ${branched} 世，另有 ${waiting} 世攒着但还没找到路）`)
    } else {
      console.log('  （攒到门槛的全都分岔了——筛人的不是分岔这一步，是它通向哪里）')
    }
  }
}

// —— 五、需求、愿望、念头，三层各管一头 ——
console.log('\n=== 五、三层各管一头 ===\n')
{
  console.log('  需求　家里有人病重　　有对象、有期限、会过去，而且逼着你做事')
  console.log('  愿望　想活久一点　　　没对象、没方向，只是一种模糊的想要')
  console.log('  念头　想学看病　　　　有方向，改变你注意什么、愿意试什么')
  console.log()
  console.log('  需求这一层不新建数据结构——旗标和世界事件承载它就够了。')
  console.log('  它真正的价值在于**它是愿望的来源**，不在于它自己被记住。')
  console.log()
  console.log('  而「我要修仙」将来会在念头那一层再往前长一步。')
  console.log('  它不该凭空生成——**它得是这几层一路汇聚出来的。**')
}

console.log()
if (failed > 0) {
  console.log(`  ✗ ${failed} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  需求逼出愿望，愿望攒够了才分岔成念头，而分岔往哪儿走取决于他手边有什么。')
  console.log('  同一个愿望通向好几个地方，其中一个是哪儿也没去。\n')
}
