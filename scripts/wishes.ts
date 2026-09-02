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
import { branch } from '../src/engine/leanings'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { Trade } from '../src/types/game'

const RUNS = 2000

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
    // 把愿望推到分岔的门槛
    leaning.stir('live-long', 14, { at: world.time, text: '……' }, world.time)
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
    if (leaning.peakOf('live-long') < 12) continue
    wished += 1
    if (!world.hasFlag('branched:live-long')) {
      where.set('还没长到分岔', (where.get('还没长到分岔') ?? 0) + 1)
      continue
    }
    branched += 1
    const into = world.getFlag('branched-into') as string | undefined
    const key = into ? (LEANINGS.find((one) => one.id === into)?.says ?? into) : '什么也没通向'
    where.set(key, (where.get(key) ?? 0) + 1)
  }

  console.log(`  ${RUNS} 世里，${wished} 世的「想活久一点」攒到过分岔的门槛。\n`)
  for (const [key, n] of [...where.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(((n / Math.max(1, wished)) * 100).toFixed(1)).padStart(5)}%  ${key}`)
  }

  console.log()
  const shares = [...where.values()]
  const top = Math.max(...shares, 0)
  if (wished === 0) {
    console.log('  ✗ 一个人也没攒到——这个愿望在真实人生里长不起来。')
    failed += 1
  } else if (where.size < 3) {
    console.log('  ✗ 只通向了不到三个地方——那还是一条主线。')
    failed += 1
  } else if (top / wished > 0.7) {
    console.log('  ✗ 七成以上都走了同一条路——那条路就是系统偷偷安排的主线。')
    failed += 1
  } else {
    console.log('  它通向了好几个地方，而没有哪一条占了压倒性的多数。')
    console.log(`  （其中真的分岔出去的 ${branched} 世，其余的攒着但还没找到路）`)
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
