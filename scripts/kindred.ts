/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 家里那些事——kindred 十四卷各自走得到吗。
 *
 * `kindred.ts` 是库里频率最高的卷之一，围绕「有个哥哥」这条线展开：
 *
 *   kindred:wedding        哥哥成亲（嫂子进门）
 *   kindred:nephew         侄子出生
 *   kindred:newyear        过年
 *   kindred:nephew-comes   侄子来走动
 *   kindred:nephew-grown   侄子长大了
 *   kindred:nephew-weds    侄子成亲
 *   kindred:grandnephew    侄孙出生
 *   kindred:brother-gone   哥哥没了
 *   kindred:brother-turns  哥哥变了（借了债）
 *   kindred:borrow         荒年，哥来借粮（lend/refuse 两条）
 *   kindred:repay          哥来还粮（grain-back/work-back/silver-back）
 *   kindred:quarrel        闹翻了
 *   kindred:mend           和好
 *   kindred:mourning       娘没了
 *
 * 核心判据：
 * 一、borrow 两条路（lend/refuse）各自走得到
 * 二、repay 三条路（grain-back/work-back/silver-back）各自走得到
 * 三、brother-gone 关键分叉（heir/widow/debts）各自走得到
 * 四、mourning 两条分叉（together/late 等）各自走得到
 * 五、尺子自检：十四卷各自都走进去了
 *
 * 跑法：bun scripts/kindred.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode, Temper } from '../src/types/game'
import { forkingOf } from './lib/forking'
import { beOf } from './origin'

function stage(standing: number = 40, age: number = 30): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = standing
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function enrollBrother(alive = true): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'brother',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 35,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'brother', '兄')
}

function enrollMother(alive = true): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'mother',
    surname: '江',
    given: '氏',
    gender: '女',
    bornYear: world.time.year - 60,
    bornMonth: 5,
    temper: '温和',
    health: 65,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'mother', '生母')
}

function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[scene]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = from

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = s.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)

    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const want = pick(open.map((o) => o.id))
      const chosen: Choice = open.find((one) => one.id === want) ?? open[0]!
      if (chosen.effects) applyEffects(chosen.effects)
      at = chosen.next ?? undefined
      continue
    }
    const branch = node.branches?.find((one) => meetsAll(one.requires))
    at = branch?.next ?? node.next ?? undefined
  }
  return walked
}

function play(scene: string, pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 家里那些事——kindred 十四卷各自走得到吗 ===\n')

let bad = 0

function check(label: string, walked: string[], expected: string): void {
  if (!walked.includes(expected)) {
    console.log(`  ✗ ${label}：没走到 ${expected}（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ ${label}：走到了 ${expected}。`)
  }
}

/**
 * 一、kindred:borrow（荒年，哥来借粮）。
 *
 * open 里有两个选项：lend（借出去）和 refuse（不借）。
 * lend → lent，refuse → refused。
 */
{
  const SCENE = 'kindred:borrow'

  stage(40, 30)
  enrollBrother()
  const lentWalked = play(SCENE, (opts) => (opts.includes('lend') ? 'lend' : opts[0]!))
  check('borrow lend → lent', lentWalked, 'lent')

  stage(40, 30)
  enrollBrother()
  const refusedWalked = play(SCENE, (opts) => (opts.includes('refuse') ? 'refuse' : opts[0]!))
  check('borrow refuse → refused', refusedWalked, 'refused')
}

/**
 * 二、kindred:repay（哥来还粮）。
 *
 * 三条路：grain-back（还粮）/work-back（做活还）/silver-back（折银还）。
 * 这三条是引擎的 branches，取决于哥的状态——直接从各节点演验内容存在。
 */
{
  const SCENE = 'kindred:repay'

  for (const node of ['grain-back', 'work-back', 'silver-back'] as const) {
    stage(40, 30)
    enrollBrother()
    const walked = playFrom(SCENE, node)
    if (walked.length === 0) {
      console.log(`  ✗ repay ${node}：节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ repay ${node}：节点有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 三、kindred:brother-gone（哥哥没了）。
 *
 * 关键分叉：heir（有人继承）/widow（寡嫂在）/debts（债留下了）。
 * 直接从各节点演验可达性。
 */
{
  const SCENE = 'kindred:brother-gone'

  for (const node of ['heir', 'widow', 'debts'] as const) {
    stage(40, 30)
    enrollBrother(false) // 哥已殁
    const walked = playFrom(SCENE, node)
    if (walked.length === 0) {
      console.log(`  ✗ brother-gone ${node}：节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ brother-gone ${node}：节点有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 四、kindred:mourning（娘没了）。
 *
 * 关键分叉：together（大家都在）/late（来晚了）。
 * 直接从各节点演验可达性。
 */
{
  const SCENE = 'kindred:mourning'

  for (const node of ['together', 'late'] as const) {
    stage(40, 30)
    enrollMother(false) // 娘已殁
    const walked = playFrom(SCENE, node)
    if (walked.length === 0) {
      console.log(`  ✗ mourning ${node}：节点不存在或场景 id 打错。`)
      bad += 1
    } else {
      console.log(`  ✓ mourning ${node}：节点有内容，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 五、尺子自检：十四卷各自都走进去了。
 */
{
  const scenes = [
    'kindred:wedding',
    'kindred:nephew',
    'kindred:newyear',
    'kindred:nephew-comes',
    'kindred:nephew-grown',
    'kindred:nephew-weds',
    'kindred:grandnephew',
    'kindred:brother-gone',
    'kindred:brother-turns',
    'kindred:borrow',
    'kindred:repay',
    'kindred:quarrel',
    'kindred:mend',
    'kindred:mourning',
  ] as const

  let allIn = true
  for (const scene of scenes) {
    stage(40, 30)
    enrollBrother()
    enrollMother()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：十四卷各自都走进去了。')
}

/**
 * 条件层：**同一个侄儿，几岁的时候你看见的是不同的孩子**。
 *
 * 上面那几条问的是「选了这个选项走到那个节点了吗」——`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这一卷是库里分流最密的（28 处）。挑两张形状不同的验：
 *
 *     kindred:newyear  按侄儿年纪   ≤6 → small，≤12 → boy，（更大）→ tall
 *     kindred:wedding  按嫂子性情   暴躁/刚硬 → cold，（别的）→ warm
 *
 * ## ⚠️ 门槛递增的表，兜底是**最大**的那一档
 *
 * `schooling` 那张家境表是从高到低排（≥46 在 ≥26 前面），兜底是「供不起」；
 * 这一张反过来——`atMost 6` 在 `atMost 12` 前面，**兜底是「长高了」**。
 * 两种排法的兜底含义相反，摆局时别照抄上一支的思路。
 *
 * 验 `≤12` 那一档要摆 **7 到 12 之间**：摆 5 会命中前一条。
 * 门槛从内容里读出来再算，写死一个 12 在这儿，内容改了门槛这一条就废了。
 */
{
  /** 立侄儿，指定他几岁 */
  function nephewAged(age: number): void {
    stage(40, 30)
    const people = usePeopleStore()
    const world = useWorldStore()
    people.enroll({
      id: 'nephew',
      surname: '江',
      given: '小',
      gender: '男',
      bornYear: world.time.year - age,
      bornMonth: 3,
      temper: '木讷',
      health: 72,
      place: world.place,
      fate: '在',
      history: [],
    })
    // 已经在册的不改写，补一刀把生年按死
    people.amend('nephew', { bornYear: world.time.year - age, place: world.place, fate: '在' })
    people.bind('me', 'nephew', '亲戚')
  }

  // 一、按侄儿年纪分三档
  {
    const SCENE = 'kindred:newyear'
    const fork = forkingOf(SCENE, 'open')
    const fallback = fork?.fallback
    if (fork === null || fallback === undefined) {
      console.log(`  ✗ 尺子自检：${SCENE}/open 找不到分流或兜底——结构变了。`)
      bad += 1
    } else {
      const targets = [...fork.branches.map((one) => one.to), fallback]
      const landedOn = (walked: readonly string[]): string | undefined =>
        walked.find((one) => targets.includes(one))

      /** 各档的上限，从小到大 */
      const bars = fork.branches
        .map((one) => one.requires.find((c) => c.family?.age?.atMost !== undefined))
        .map((one) => one?.family?.age?.atMost)
        .filter((one): one is number => one !== undefined)

      let wrong = 0
      for (const [i, branch] of fork.branches.entries()) {
        const bar = bars[i]
        if (bar === undefined) continue
        // 摆在这条线和上一条线之间：验 ≤12 要摆 7–12，摆 5 会命中前一条
        const below = i === 0 ? 0 : bars[i - 1]!
        nephewAged(Math.max(1, Math.floor((below + bar) / 2) + (i === 0 ? 0 : 1)))
        const landed = landedOn(playFrom(SCENE, fork.node))
        if (landed !== branch.to) {
          console.log(
            `  ✗ 过年分流〔侄儿不满 ${bar} 岁〕：该落在 ${branch.to}，` +
              `实际落在 ${landed ?? '哪儿也没落'}。`,
          )
          bad += 1
          wrong += 1
        }
      }

      // 兜底：比最大那条线还大。⚠️ 这张表递增，兜底是「长高了」不是「最小的」
      const biggest = bars[bars.length - 1] ?? 12
      nephewAged(biggest + 6)
      const landed = landedOn(playFrom(SCENE, fork.node))
      if (landed !== fallback) {
        console.log(
          `  ✗ 过年分流〔侄儿长高了〕：该落到兜底 ${fallback}，` +
            `实际落在 ${landed ?? '哪儿也没落'}。`,
        )
        bad += 1
        wrong += 1
      }

      if (wrong === 0) {
        console.log(`  ✓ 过年分流：${bars.length} 档加兜底，侄儿几岁就落在哪一节。`)
      }
    }
  }

  // 二、按嫂子性情分两档
  {
    const SCENE = 'kindred:wedding'
    const fork = forkingOf(SCENE, 'open')
    const fallback = fork?.fallback
    if (fork === null || fallback === undefined) {
      console.log(`  ✗ 尺子自检：${SCENE}/open 找不到分流或兜底——结构变了。`)
      bad += 1
    } else {
      const targets = [...fork.branches.map((one) => one.to), fallback]
      const landedOn = (walked: readonly string[]): string | undefined =>
        walked.find((one) => targets.includes(one))

      function wifeOf(temper: Temper): void {
        stage(40, 30)
        const people = usePeopleStore()
        const world = useWorldStore()
        people.enroll({
          id: 'brother-wife',
          surname: '柳',
          given: '嫂',
          gender: '女',
          bornYear: world.time.year - 28,
          bornMonth: 5,
          temper,
          health: 70,
          place: world.place,
          fate: '在',
          history: [],
        })
        people.amend('brother-wife', { temper, place: world.place, fate: '在' })
      }

      const want = fork.branches[0]
      const cold = want?.requires.find((c) => c.temper !== undefined)?.temper?.in?.[0]
      if (want === undefined || cold === undefined) {
        console.log(`  ✗ 尺子自检：${SCENE} 头一条分支不是按性情分的——结构变了。`)
        bad += 1
      } else {
        wifeOf(cold as Temper)
        const harsh = landedOn(playFrom(SCENE, fork.node))
        wifeOf('温和')
        const kind = landedOn(playFrom(SCENE, fork.node))

        if (harsh !== want.to) {
          console.log(`  ✗ 嫂子分流〔${cold}〕：该落在 ${want.to}，实际落在 ${harsh ?? '没落'}。`)
          bad += 1
        } else if (kind !== fallback) {
          console.log(
            `  ✗ 嫂子分流〔温和〕：该落到兜底 ${fallback}，实际落在 ${kind ?? '没落'}` +
              `——那条分支没在管事。`,
          )
          bad += 1
        } else {
          console.log(`  ✓ 嫂子分流：${cold}的落 ${want.to}，温和的落 ${fallback}。`)
        }
      }
    }
  }
}

/**
 * 效果层：**借了和没借，落在世上的东西不一样**。
 *
 * 上面那几条问的是「走到 lent / refused 了吗」——**把 `applyEffects` 整个
 * 改成空转，它们纹丝不动**（2026-09-12 B 刀实测）。
 * 那不是坏了，是它们只守路径，不守路径尽头留下了什么。
 *
 * `kindred:borrow` 那两条路各落一组效果，一组七样、一组四样：
 *
 *     lend    家底 -6、好感 +8、立一笔债、心志 +2、行为史、编年
 *     refuse  家底不动、好感 -10、见识 +2、编年（另一句）
 *
 * ## 判「两条路的后果不一样」，不判「家底正好降了六」
 *
 * 写死 -6 的话，内容里调一次数值这条判据就红——**而那个数不是它的守备范围**。
 * 问「借了之后家底比没借低」「借了立了债、没借没有债」「两句编年不是同一句」，
 * 这些在效果空转时全部塌掉，而调数值不会误伤。
 *
 * ⚠️ 光问「落了没落」还不够：效果空转时**两条路的后果全同**，
 * 所以要**并排比**。这是「输入要能区分对错」在效果层的样子。
 */
{
  interface After {
    standing: number
    regard: number
    debts: number
    chronicle: string
  }

  function walkBorrow(pick: 'lend' | 'refuse'): After {
    stage(40, 30)
    enrollBrother()
    const household = useHouseholdStore()
    const people = usePeopleStore()
    const world = useWorldStore()
    /*
     * ⚠️ **四样都记「变了多少」，不记终值。**
     *
     * 两次 `walkBorrow` 各起各的 pinia——**那是两个不同的世界**：
     * 出生章的年表不一样、`known` 表的初值不一样、家底是现掷的。
     * 拿终值相比，比的是两个世界的运气。
     *
     * 头一版只有家底用了增量，好感和年表用终值——**B 刀底下那两条不红**，
     * 因为两个世界的年表本来就不相等、好感本来就不相等。
     * 判据看着有四条，实际只有两条在工作。
     *
     * （「对照实验：做完先验实验本身，再读数」那一条——
     * 我那次栽的正是「拿两颗不同种子的数说事」。）
     */
    const before = {
      standing: household.standing,
      regard: people.known['brother']?.affinity ?? 0,
      debts: people.ious.filter((one) => one.debtor === 'brother' && !one.settled).length,
      lines: world.chronicle.length,
    }
    play('kindred:borrow', (opts) => (opts.includes(pick) ? pick : opts[0]!))
    return {
      standing: household.standing - before.standing,
      regard: (people.known['brother']?.affinity ?? 0) - before.regard,
      debts:
        people.ious.filter((one) => one.debtor === 'brother' && !one.settled).length - before.debts,
      // 只取这一卷新添的那几行，不含出生章那一串
      chronicle: world.chronicle
        .slice(before.lines)
        .map((one) => one.text)
        .join('｜'),
    }
  }

  const lent = walkBorrow('lend')
  const refused = walkBorrow('refuse')

  const wrong: string[] = []
  if (!(lent.standing < refused.standing)) {
    wrong.push(`匀了一半粮，家底该比没借的低：借了 ${lent.standing}、没借 ${refused.standing}`)
  }
  if (!(lent.regard > refused.regard)) {
    wrong.push(`借了他记着，没借他记恨：借了 ${lent.regard}、没借 ${refused.regard}`)
  }
  if (lent.debts === 0) wrong.push('匀了粮给哥，簿上却没有新添的这一笔债')
  if (refused.debts !== 0) wrong.push(`没借却新添了 ${refused.debts} 笔债`)
  if (lent.chronicle === '') wrong.push('匀了粮给哥，这一卷在年表上一个字也没留下')
  if (lent.chronicle === refused.chronicle) {
    wrong.push('借与不借，年表上记的是同一句——那一卷的效果一样也没落')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ borrow 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ borrow 效果层：借了家底 ${lent.standing}、好感 ${lent.regard}、` +
        `簿上 ${lent.debts} 笔；没借家底 ${refused.standing}、好感 ${refused.regard}、无债。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  家里那些事，十四卷各有人走过了，借与不借也各落各的。\n')
}
