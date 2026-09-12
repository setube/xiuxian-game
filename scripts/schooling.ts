/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 私塾——四卷各自走得到吗。
 *
 * `schooling.ts` 里四个场景：
 *
 *   school:threshold  入学那年，能不能去、去不去（含贫困路线：没去/窗外偷听）
 *   school:praise     先生夸了你
 *   school:strength   你有个强项（算学/记忆/书法）
 *   school:fair       庙会/集市上（说书/耍杂/糖人三条路）
 *
 * 核心判据：
 * 一、threshold 两条路（进私塾 vs 没去）各自走得到
 * 二、lessons 三档（diligent/ordinary/skip）各自走得到
 * 三、无法入学时（cannot）：work 和 peek（窗外偷听）各自走得到
 * 四、fair 三条路（storyteller/acrobat/candy）各自走得到
 * 五、尺子自检：四卷各自都走进去了
 *
 * 跑法：bun scripts/schooling.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { ORIGINS } from '../src/content/origins'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode, OriginId } from '../src/types/game'
import { forkingOf } from './lib/forking'
import { beOf } from './origin'

function stage(standing: number, age = 7): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = standing
  const world = useWorldStore()
  world.advanceTime({ years: age })
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

console.log('\n=== 私塾——四卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、school:threshold 入学那年。
 *
 * open 里有选项：hall（去私塾）、study（在家读）、cannot（去不了）。
 * lessons 节点按行为分三档：diligent/ordinary/skip。
 * cannot 分两条：work（去做活）和 peek（窗外偷听）。
 */
{
  const SCENE = 'school:threshold'

  // lessons 三档：从 lessons 节点演，选不同选项
  const lessonsCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'diligent', node: 'first-year', label: '用功（diligent）' },
    { pick: 'ordinary', node: 'first-year', label: '普通（ordinary）' },
    { pick: 'skip', node: 'first-year', label: '逃课（skip）' },
  ]

  for (const { pick, node, label } of lessonsCases) {
    stage(50)
    const walked = playFrom(SCENE, 'lessons', (opts) => (opts.includes(pick) ? pick : opts[0]!))
    if (!walked.includes(node) && walked.length === 0) {
      console.log(`  ✗ threshold lessons ${label}：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ threshold lessons ${label}：走到了（${walked.join(' → ')}）。`)
    }
  }

  // cannot 两条路
  stage(20)
  const workWalked = playFrom(SCENE, 'cannot', (opts) =>
    opts.includes('work') ? 'work' : opts[0]!,
  )
  if (!workWalked.includes('worked')) {
    console.log(`  ✗ threshold cannot→work：没走到 worked（走过 ${workWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ threshold cannot→work（家境不够去做活）：走到了。')
  }

  stage(20)
  const peekWalked = playFrom(SCENE, 'cannot', (opts) =>
    opts.includes('peek') ? 'peek' : opts[0]!,
  )
  if (!peekWalked.includes('peeked')) {
    console.log(`  ✗ threshold cannot→peek：没走到 peeked（走过 ${peekWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ threshold cannot→peek（窗外偷听）：走到了。')
  }
}

/**
 * 二、school:praise（先生夸了）。
 */
{
  const SCENE = 'school:praise'
  stage(50, 10)
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ praise：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ praise（先生夸了）：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、school:strength（强项）。
 *
 * 有 after 节点（强项被认出来了）。
 */
{
  const SCENE = 'school:strength'
  stage(50, 10)
  const walked = play(SCENE)
  if (!walked.includes('after')) {
    console.log(`  ✗ strength after：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ strength after（强项被认出来了）：走到了。')
  }
}

/**
 * 四、school:fair 庙会/集市三条路。
 *
 * 选项：storyteller（听说书）/acrobat（看杂耍）/candy（买糖人）。
 * 各自走到对应节点。
 */
{
  const SCENE = 'school:fair'

  const fairCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'storyteller', node: 'tale', label: '听说书（storyteller）' },
    { pick: 'acrobat', node: 'acrobat', label: '看杂耍（acrobat）' },
    { pick: 'candy', node: 'candy', label: '买糖人（candy）' },
  ]

  for (const { pick, node, label } of fairCases) {
    stage(50, 10)
    const walked = play(SCENE, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    if (!walked.includes(node)) {
      console.log(`  ✗ fair ${label}：没走到 ${node}（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ fair ${label}：走到了。`)
    }
  }
}

/**
 * 五、尺子自检：四卷各自都走进去了。
 */
{
  const scenes = ['school:threshold', 'school:praise', 'school:strength', 'school:fair'] as const
  for (const scene of scenes) {
    stage(50, 10)
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    }
  }
  console.log('  ✓ 尺子自检：四卷各自都走进去了。')
}

/**
 * 六、条件层：**这个孩子念不念得起书，念的是哪一种**。
 *
 * 上面那几条问的是「走得到吗」——`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * `school:threshold` 的入口那一节按**家世和家境**分五档，
 * 顺序从高到低，一档比一档窄：
 *
 *     origin court    → hall      皇子由翰林侍讲
 *     origin manor    → study     世子有王府西席
 *     station 仕宦    → tutor     官宦人家请西席
 *     standing ≥ 46   → afford    供得起
 *     standing ≥ 26   → strain    紧一紧也供得起
 *     （都够不着）     → 兜底      供不起
 *
 * **顺序即含义**：`≥46` 排在 `≥26` 前面，两条对调的话
 * 富户会走「紧一紧」那一节，而「走得到吗」那类判据一声不响。
 *
 * ⚠️ 家境那两档要**摆在两条门槛之间**才分得开：验 `≥26` 那一档得摆
 * 26 到 45 之间的数，摆 50 会命中前一条。门槛从内容里读，
 * 写死一个 46 在这儿，内容改了门槛这一条就废了。
 */
{
  const SCENE = 'school:threshold'
  const fork = forkingOf(SCENE, lifeScenes[SCENE]?.entry ?? 'open')
  const fallback = fork?.fallback

  if (fork === null || fallback === undefined) {
    console.log(`  ✗ 尺子自检：${SCENE} 找不到分流或兜底——结构变了。`)
    bad += 1
  } else {
    const targets = [...fork.branches.map((one) => one.to), fallback]
    const landedOn = (walked: readonly string[]): string | undefined =>
      walked.find((one) => targets.includes(one))

    /** 家境那几档的门槛，从高到低——用来算「摆在哪两条线之间」 */
    const bars = fork.branches
      .map((one) => one.requires.find((c) => c.standing?.atLeast !== undefined)?.standing?.atLeast)
      .filter((one): one is number => one !== undefined)
      .sort((a, b) => b - a)

    let checked = 0
    let wrong = 0
    for (const branch of fork.branches) {
      const origin = branch.requires.find((c) => c.origin !== undefined)?.origin
      const station = branch.requires.find((c) => c.station !== undefined)?.station
      const bar = branch.requires.find((c) => c.standing?.atLeast !== undefined)?.standing?.atLeast

      if (origin !== undefined) {
        setActivePinia(createPinia())
        beOf(origin)
        useWorldStore().advanceTime({ years: 7 })
      } else if (station !== undefined) {
        // 家世那一格：找一行出身是这个家世的，照它摆
        const row = ORIGINS.find((one) => one.station === station)
        if (row === undefined) {
          console.log(`  ·  家世〔${station}〕在出身表里找不到对应的一行，这一档没验。`)
          continue
        }
        setActivePinia(createPinia())
        beOf(row.id)
        useWorldStore().advanceTime({ years: 7 })
      } else if (bar !== undefined) {
        // 摆在这条线和上一条线之间，才分得开两档家境
        const above = bars.find((one) => one > bar)
        stage(above === undefined ? bar + 10 : Math.floor((bar + above) / 2), 7)
      } else {
        console.log(`  ·  该去 ${branch.to} 的那一档我不会摆，没验。`)
        continue
      }

      checked += 1
      const landed = landedOn(playFrom(SCENE, fork.node))
      if (landed !== branch.to) {
        const how = origin ?? station ?? `家境 ≥${bar}`
        console.log(
          `  ✗ 入学分流〔${how}〕：该落在 ${branch.to}，实际落在 ${landed ?? '哪儿也没落'}。`,
        )
        bad += 1
        wrong += 1
      }
    }

    // 兜底：家境低于最低那条线，出身也不沾边
    const lowest = bars[bars.length - 1]
    stage(lowest === undefined ? 10 : Math.max(0, lowest - 10), 7)
    const landed = landedOn(playFrom(SCENE, fork.node))
    checked += 1
    if (landed !== fallback) {
      console.log(
        `  ✗ 入学分流〔供不起〕：该落到兜底 ${fallback}，实际落在 ${landed ?? '哪儿也没落'}。`,
      )
      bad += 1
      wrong += 1
    }

    if (checked === 0) {
      console.log('  ✗ 入学分流：一档也没验到——这一条什么也没量。')
      bad += 1
    } else if (wrong === 0) {
      console.log(`  ✓ 入学分流：验了 ${checked} 档（含兜底），各自落在对的那一节。`)
    }
  }
}

/**
 * 效果层：**两组梯度——家世定起点，用功定收成**。
 *
 * 上面那条六档分流验的是「落在哪一节」——**把 `applyEffects` 整个改成空转，
 * 它纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 这一卷落下的是两组见识梯度，加一面分身份的旗：
 *
 *     家世那一组   hall +6  study +5  tutor +4     皇子、世子、官宦请的西席
 *     用功那一组   用功 +8  普通 +4   逃课 +1       同一间私塾，三种念法
 *     窗外那一档   cannot +4                       念不起书，在窗外听
 *     royal-schooling 旗   只有宗室那两档落
 *
 * **这一卷最动人的一处是 `cannot` +4**：念不起书的孩子在窗外听，
 * 也长见识——比逃课的（+1）多，比用功的（+8）少。
 * 那不是补偿，是「他确实听见了什么」。
 *
 * ## 判「梯度有高下」，不判「hall 正好 +6」
 *
 * 数值随时会调；**「皇子比世子多、世子比官宦多」「用功比逃课多」
 * 才是这两组的设计**。写死 +6 的话调一次判据就红。
 *
 * 旗那一条判的是**分身份**：宗室落 `royal-schooling`，平民不落。
 * 效果空转时两边都不落，这一条当场塌。
 */
{
  const SCENE = 'school:threshold'

  /**
   * @param pick 走到有选项那一节时点哪一条
   *
   * ⚠️ 窗外那一档的见识 +4 **落在 `peek` 那条选项上**，不在 `cannot` 节点的
   * `onEnter` 里。不指定 `pick` 就默认点第一条（`work`，出去做活），
   * 判据当场报「在窗外听也该长见识，实际 0」——**而他根本没去听**。
   *
   * 「从错的节点起演」的近亲：**从对的节点起演，却点了另一条路**。
   */
  function insightBy(
    put: () => void,
    from: string,
    pick?: string,
  ): { gained: number; royal: boolean } {
    put()
    const character = useCharacterStore()
    const world = useWorldStore()
    const before = character.attributes.insight
    playFrom(SCENE, from, (opts) => (pick !== undefined && opts.includes(pick) ? pick : opts[0]!))
    return {
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      gained: character.attributes.insight - before,
      royal: world.getFlag('royal-schooling') === true,
    }
  }

  const byOrigin = (origin: OriginId) => (): void => {
    setActivePinia(createPinia())
    beOf(origin)
    useWorldStore().advanceTime({ years: 7 })
  }

  const hall = insightBy(byOrigin('court'), 'hall')
  const study = insightBy(byOrigin('manor'), 'study')
  const tutor = insightBy(byOrigin('office'), 'tutor')
  const diligent = insightBy(() => stage(50, 10), 'lessons')
  const peeked = insightBy(() => stage(20, 10), 'cannot', 'peek')

  const wrong: string[] = []
  if (!(hall.gained > study.gained && study.gained > tutor.gained)) {
    wrong.push(
      `家世那一组该有高下：皇子 +${hall.gained}、世子 +${study.gained}、官宦 +${tutor.gained}`,
    )
  }
  if (diligent.gained <= 0) wrong.push(`进了私塾念书，见识却是 ${diligent.gained}`)
  if (peeked.gained <= 0) {
    wrong.push(`念不起书的孩子在窗外听，也该长见识，实际 ${peeked.gained}`)
  }
  if (!hall.royal) wrong.push('皇子开蒙，却没落下「宗室念的书」那一面旗')
  if (diligent.royal) wrong.push('平民进私塾，却落了「宗室念的书」那一面旗')

  if (wrong.length > 0) {
    console.log(`  ✗ threshold 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ threshold 效果层：皇子 +${hall.gained}、世子 +${study.gained}、官宦 +${tutor.gained}；` +
        `进私塾 +${diligent.gained}、窗外听 +${peeked.gained}；宗室那面旗只落在宗室身上。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  私塾那几年，各条路各自有人走过了，念下来的东西也各有多少。\n')
}
