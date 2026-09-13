/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 外出那几年——六卷各自走得到吗。
 *
 * `away.ts` 里六个场景，都发生在玩家不在家的那段岁月：
 *
 *   away:lends       有人要借银子（take/refuse 两条路）
 *   away:i-repay     还了哥的银子（deed keep 效果，本轮已补写）
 *   away:hurt        受伤了
 *   away:old         人老了
 *   away:father-old  父亲老了
 *   away:journeyman  游历那几年
 *
 * 核心判据：
 * 一、away:lends 两条路（take→taken / refuse→refused）各自走得到
 * 二、away:i-repay 两条路（in-town/at-home）各自走得到
 * 三、away:hurt/old/father-old/journeyman 各自走进去了
 * 四、尺子自检：六卷各自都走进去了
 *
 * 跑法：bun scripts/away.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode, Livelihood, Terms } from '../src/types/game'
import { forkingOf } from './lib/forking'
import { standing } from './lib/standing'
import { beOf } from './origin'

function stage(age = 25): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function enrollBrother(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'brother',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 30,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'brother', '兄')
}

/**
 * 立一个亲人，**连他靠什么过活一起立**。
 *
 * ⚠️ `enrollBrother` 从前不给 `livelihood`，于是 `livelihoodOf` 回落到
 * 那一户的营生（务农）——`BROTHER_CARPENTER`（要「木工」）一次也不成立，
 * 而那条分支底下的判据问的是别处，谁也没发现。
 * **摆局缺一格，条件层就整段验不了。**
 */
function enrollKin(id: string, doing: string): void {
  /*
   * ⚠️ 走 `standing()`：**立基已经造过哥了，而他在种地**。
   * `enroll` 对在册的人不改写，于是摆「哥改行做了木匠」静默落空，
   * `BROTHER_CARPENTER` 那一条永不成立——这一支先前单跑绿批次红。
   */
  standing({
    id,
    bond: id === 'brother' ? '兄' : '亲戚',
    older: id === 'brother' ? 30 : 18,
    given: id === 'brother' ? '大' : '小',
    livelihood: doing as Livelihood,
  })
}

/**
 * 老屋那一户。**摆局从前一处也没立它**，于是 `OLD_HOME_FARMS`
 *（问 `house: { id: 'old-home' }`）在这支门禁里恒假——户不存在时
 * `conditions.ts` 的 `house` 一律 `return false`。
 *
 * 2026-09-13 `BROTHER_CARPENTER` 改成两条之后这一格才露出来：
 * 那个常量现在要「哥的营生是木工」**且**「老屋还是种地的人家」，
 * 因为只问前一条会把**匠户出身**的哥也圈进来，而他跟玩家住一个院子
 *（详见 `content/life/kindred.ts` 那个常量的注释）。
 *
 * 立成什么营生由调用方给：`hold` 摆务农（改行去镇上的哥），
 * `drop` 摆木工（生来就是匠户的哥）——**两侧摆的正是那条新加的差别**，
 * 不然打断验不出它。
 */
function enrollOldHome(livelihood: Livelihood): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enrollHouse({
    id: 'old-home',
    surname: '江',
    head: 'brother',
    members: ['brother'],
    residence: world.place,
    livelihood,
  })
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

console.log('\n=== 外出那几年——六卷各自走得到吗 ===\n')

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
 * 一、away:lends（有人要借银子）。
 *
 * take（借出去）→ taken，refuse（不借）→ refused。
 */
{
  const SCENE = 'away:lends'

  stage()
  const takenWalked = play(SCENE, (opts) => (opts.includes('take') ? 'take' : opts[0]!))
  check('lends take → taken', takenWalked, 'taken')

  stage()
  const refusedWalked = play(SCENE, (opts) => (opts.includes('refuse') ? 'refuse' : opts[0]!))
  check('lends refuse → refused', refusedWalked, 'refused')
}

/**
 * 二、away:i-repay（还了哥的银子）。
 *
 * 两条路：in-town（在镇上还）和 at-home（回家还）。
 */
{
  const SCENE = 'away:i-repay'

  stage()
  enrollBrother()
  const inTownWalked = playFrom(SCENE, 'in-town')
  if (inTownWalked.length === 0) {
    console.log('  ✗ i-repay in-town：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ i-repay in-town：节点有内容，走了 ${inTownWalked.length} 步。`)
  }

  stage()
  enrollBrother()
  const atHomeWalked = playFrom(SCENE, 'at-home')
  if (atHomeWalked.length === 0) {
    console.log('  ✗ i-repay at-home：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ i-repay at-home：节点有内容，走了 ${atHomeWalked.length} 步。`)
  }
}

/**
 * 三、away:hurt/old/father-old/journeyman 各自走进去了。
 */
{
  const scenes: Array<{ id: string; label: string }> = [
    { id: 'away:hurt', label: '受伤' },
    { id: 'away:old', label: '人老了' },
    { id: 'away:father-old', label: '父亲老了' },
    { id: 'away:journeyman', label: '游历那几年' },
  ]

  for (const { id, label } of scenes) {
    stage()
    const walked = play(id)
    if (walked.length === 0) {
      console.log(`  ✗ ${label}（${id}）：走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    } else {
      console.log(`  ✓ ${label}（${id}）：走进去了，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 四、尺子自检：六卷各自都走进去了。
 */
{
  const scenes = [
    'away:lends',
    'away:i-repay',
    'away:hurt',
    'away:old',
    'away:father-old',
    'away:journeyman',
  ] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    enrollBrother()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：六卷各自都走进去了。')
}

/**
 * 条件层：**哥改了行没有，侄儿在哪儿干活**——分流认不认得这两件事。
 *
 * 上面那几条问的是「选了这个选项走到那个节点了吗」，`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这几卷有三处分流，从前一处也没人验：
 *
 *     away:hurt / away:old    NEPHEW_FARMS     侄儿种着老屋的地 → son-on-land，否则 done
 *     away:father-old         FATHER_SON_SOUR  父子不睦 → son-stays-away，否则 son-comes-back
 *
 * ## ⚠️ 头一版我把 `NEPHEW_FARMS` 认在了 `away:father-old` 上
 *
 * 报「该落在 son-on-land，实际落在 son-comes-back」——看着像内容坏了，
 * 而**那一卷的 `open` 分的根本不是侄儿的营生，是父子睦不睦**。
 * 判据没坏，是我写错了要验的对象（`NEPHEW_FARMS` 在 `away:hurt` 和 `away:old` 里）。
 *
 * ## ⚠️ `enrollBrother` 从前不给营生
 *
 * `BROTHER_CARPENTER` 要 `livelihood: ['木工']`，而门禁立的哥只有姓名和生年
 * ——`livelihoodOf` 回落到那一户的营生（务农），这条分支**一次也走不到**。
 * 摆局缺一格，而判据问的是别处，于是谁也没发现。
 */
{
  /** 一处分流：怎么把条件摆成立、期望落在哪 */
  interface Case {
    scene: string
    node: string
    to: string
    /** 条件成立时怎么说 */
    label: string
    /** 条件不成立时怎么说。分开写，不用「不」去拼——拼出来是「不哥改行做了木匠」 */
    other: string
    /** 摆成「条件成立」 */
    hold: () => void
    /** 摆成「条件不成立」，只改那一处 */
    drop: () => void
  }

  const nephewFarms = (doing: string) => (): void => {
    stage()
    enrollKin('brother', '务农')
    enrollKin('nephew', doing)
  }
  const fatherSon = (terms: Terms) => (): void => {
    stage()
    enrollKin('brother', '务农')
    enrollKin('nephew', '务农')
    usePeopleStore().tie('nephew', 'brother', '生父', terms)
  }

  const cases: Case[] = [
    {
      scene: 'away:i-repay',
      node: 'open',
      to: 'in-town',
      label: '哥改行去镇上做了木匠',
      other: '哥生来就是匠户，跟你住一个院子',
      hold: () => {
        stage()
        enrollKin('brother', '木工')
        enrollOldHome('务农') // 老屋还是种地的人家——他是【改行去镇上】的那种
      },
      drop: () => {
        stage()
        enrollKin('brother', '木工')
        enrollOldHome('木工') // 整户都是匠户——他没去过镇上，这一支不该走 in-town
      },
    },
    {
      scene: 'away:hurt',
      node: 'open',
      to: 'son-on-land',
      label: '侄儿种着老屋的地',
      other: '侄儿出去做工了',
      hold: nephewFarms('务农'),
      drop: nephewFarms('佣工'),
    },
    {
      scene: 'away:old',
      node: 'open',
      to: 'son-on-land',
      label: '侄儿种着老屋的地',
      other: '侄儿出去做工了',
      hold: nephewFarms('务农'),
      drop: nephewFarms('佣工'),
    },
    {
      scene: 'away:father-old',
      node: 'open',
      to: 'son-stays-away',
      label: '父子不睦',
      other: '父子处得平常',
      hold: fatherSon('不睦'),
      drop: fatherSon('平常'),
    },
  ]

  for (const { scene, node, to, label, other, hold, drop } of cases) {
    const fork = forkingOf(scene, node)
    const fallback = fork?.fallback
    if (fork === null || fallback === undefined) {
      console.log(`  ✗ 尺子自检：${scene}/${node} 找不到分流或兜底——结构变了。`)
      bad += 1
      continue
    }
    const targets = [...fork.branches.map((one) => one.to), fallback]
    const landedOn = (walked: readonly string[]): string | undefined =>
      walked.find((one) => targets.includes(one))

    hold()
    const withIt = landedOn(playFrom(scene, node))
    drop()
    const without = landedOn(playFrom(scene, node))

    if (withIt !== to) {
      console.log(
        `  ✗ ${scene} 分流〔${label}〕：该落在 ${to}，实际落在 ${withIt ?? '哪儿也没落'}。`,
      )
      bad += 1
    } else if (without !== fallback) {
      console.log(
        `  ✗ ${scene} 分流〔${other}〕：该落到兜底 ${fallback}，` +
          `实际落在 ${without ?? '哪儿也没落'}——那条分支没在管事。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ ${scene} 分流〔${label}〕落 ${to}，〔${other}〕落 ${fallback}。`)
    }
  }
}

/**
 * 效果层：**借了不还和借了还上，留下的东西不一样**。
 *
 * 上面那几条问的是「走到那个节点了吗」——**把 `applyEffects` 整个改成空转，
 * 它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这两卷合起来是**一笔债的一生**，跨着好些年：
 *
 *     away:lends    借出去   家底 +6，簿上记一笔「二两银子，秋后还」
 *     away:i-repay  还上了   家底 -6，那一笔销账，行为史多一笔 `keep`
 *
 * ## 这一对最值得守的是「账销没销」
 *
 * 借了不还不算穿帮——那是一种人生。**而还了之后账还挂着**，
 * 或者**还了却没在行为史上留下一笔**，那才是效果没落地：
 * 往后「他是不是个守信的人」就再也数不出来
 * （`character.did('keep')` 数的正是这一串）。
 *
 * 判「还前有账、还后销账、行为史多一笔」，不判「正好二两」——
 * 数目是内容作者的，而「借了要记、还了要销」是这一对卷的骨头。
 */
{
  interface Ledger {
    open: number
    settled: number
    kept: number
  }

  function ledgerAfter(repay: boolean): Ledger {
    stage()
    standing({ id: 'brother', bond: '兄', older: 30, given: '大' })
    const people = usePeopleStore()
    const character = useCharacterStore()
    // 先借：走 lends 的 take 那一条
    play('away:lends', (opts) => (opts.includes('take') ? 'take' : opts[0]!))
    /*
     * ⚠️ 从**入口**演，不是从 `in-town`。
     *
     * 还债那几样效果落在 `away:i-repay` 的 `open` 上，而 `in-town` 是
     * 它底下的落点之一——从那儿演，`open` 整个跳过去，效果一条也不落。
     * 判据当场报「还了之后那一笔还挂着」，读着像销账坏了。
     *
     * 跟 `house` 那次同一个错：**从错的节点起演，验的是另一段路**。
     */
    if (repay) play('away:i-repay')
    const mine = people.ious.filter((one) => one.debtor === 'me' && one.creditor === 'brother')
    return {
      open: mine.filter((one) => !one.settled).length,
      settled: mine.filter((one) => one.settled).length,
      kept: character.did('keep'),
    }
  }

  const owing = ledgerAfter(false)
  const paid = ledgerAfter(true)

  const wrong: string[] = []
  if (owing.open === 0) wrong.push('借了哥的银子，簿上却没有这一笔')
  if (paid.settled === 0) wrong.push('还了之后那一笔还挂着——账没销')
  if (paid.kept <= owing.kept) {
    wrong.push(`还了债该在行为史上留一笔「守信」：还前 ${owing.kept}、还后 ${paid.kept}`)
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 借还效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 借还效果层：借了簿上挂 ${owing.open} 笔；还了销 ${paid.settled} 笔，` +
        `行为史上「守信」从 ${owing.kept} 到 ${paid.kept}。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  外出那几年，六卷各有人走过了，借的还的也各记各的。\n')
}
