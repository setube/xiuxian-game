/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 重逢——三卷各自走得到吗。
 *
 * `reunion.ts` 里三个场景，都是「走了几年回来了」的那一刻：
 *
 *   reunion:apprentice   学徒生涯结束回来（go/stay 两条路）
 *   reunion:homecoming   外出打工回来（stay-home/back-to-town 两条路）
 *   reunion:emptied      家里已经空了（stay-and-settle/back-to-town 两条路）
 *
 * 核心判据：
 * 一、reunion:apprentice go→away / stay→stayed 两条路各自可达
 * 二、reunion:homecoming stay-home→stayed / back-to-town→left 两条路各自可达
 * 三、reunion:emptied stay-and-settle→stayed / back-to-town→left 两条路各自可达
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/reunion.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 25): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
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

console.log('\n=== 重逢——三卷各自走得到吗 ===\n')

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
 * 一、reunion:apprentice（学徒生涯结束回来）。
 *
 * go（走了）→ away，stay（留下来）→ stayed。
 */
{
  const SCENE = 'reunion:apprentice'

  stage()
  const goWalked = play(SCENE, (opts) => (opts.includes('go') ? 'go' : opts[0]!))
  check('apprentice go → away', goWalked, 'away')

  stage()
  const stayWalked = play(SCENE, (opts) => (opts.includes('stay') ? 'stay' : opts[0]!))
  check('apprentice stay → stayed', stayWalked, 'stayed')
}

/**
 * 二、reunion:homecoming（外出打工回来）。
 *
 * stay-home（留家里）→ stayed，back-to-town（回城里）→ left。
 */
{
  const SCENE = 'reunion:homecoming'

  stage()
  const stayHomeWalked = play(SCENE, (opts) =>
    opts.includes('stay-home') ? 'stay-home' : opts[0]!,
  )
  check('homecoming stay-home → stayed', stayHomeWalked, 'stayed')

  stage()
  const backWalked = play(SCENE, (opts) =>
    opts.includes('back-to-town') ? 'back-to-town' : opts[0]!,
  )
  check('homecoming back-to-town → left', backWalked, 'left')
}

/**
 * 三、reunion:emptied（家里已经空了）。
 *
 * stay-and-settle（留下来安家）→ stayed，back-to-town（回城里）→ left。
 */
{
  const SCENE = 'reunion:emptied'

  stage()
  const settleWalked = play(SCENE, (opts) =>
    opts.includes('stay-and-settle') ? 'stay-and-settle' : opts[0]!,
  )
  check('emptied stay-and-settle → stayed', settleWalked, 'stayed')

  stage()
  const backWalked = play(SCENE, (opts) =>
    opts.includes('back-to-town') ? 'back-to-town' : opts[0]!,
  )
  check('emptied back-to-town → left', backWalked, 'left')
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['reunion:apprentice', 'reunion:homecoming', 'reunion:emptied'] as const
  let allIn = true
  for (const scene of scenes) {
    stage()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：三卷各自都走进去了。')
}

/**
 * 条件层：**这三卷各自落在什么样的人身上**。
 *
 * 上面那几条问的是「选了这个选项走到那个节点了吗」——`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这三卷的条件层全在**入场**上，而后两条尤其要紧——**同一面旗，不同的人**：
 *
 *     reunion-apprentice  offered-shopwork
 *     reunion-homecoming  went-to-town + 养育你的人还在（牵够八年）
 *     reunion-emptied     went-to-town + 养育你的人不在了
 *
 * 后两条互斥：回来那天他还在，是「回家」；他不在了，是「屋空了」。
 * 两条的旗是同一面，**分开它们的只有那个人的死活**——
 * 而「走得到吗」那类判据对这两卷一视同仁。
 *
 * ⚠️ `years: { atLeast: 8 }` 那一格要关系牵够八年：**先 `bind` 再推时间**。
 * `bind` 记的 `since` 是当时的年份，顺序反了就牵不够年头。
 */
{
  /**
   * 摆一个「养育你的人」，`alive` 决定他还在不在。
   *
   * ⚠️ **那条边上不能有第二个人。** `bond` 那一格问的是
   * 「这层关系里**有没有**一个满足的人」（`some`），而立基已经把
   * 父母挂在「抚养」边上了（实测 `kinOf('抚养')` → father、mother）。
   * 我再加一个 `foster`，`alive: true` 有活的父母就成立、
   * `alive: false` 要「一个活的都没有」也过不去——**两条互斥的入场
   * 条件同时失灵，而报出来的话一条说「不成立也进得去」、
   * 一条说「摆齐了却进不去」，看着像两个独立的内容 bug。**
   *
   * 所以先把别人从那条边上摘干净，只留我摆的这一个。
   */
  function raisedBy(alive: boolean): void {
    setActivePinia(createPinia())
    beOf('farm')
    useHouseholdStore().standing = 40
    const people = usePeopleStore()
    const world = useWorldStore()
    world.advanceTime({ years: 10 })
    // 立基挂上的父母先摘掉：这一局里「抚养」只该有一个人
    for (const id of people.kinOf('抚养')) people.unbind(id, '抚养')
    people.enroll({
      id: 'foster',
      surname: '孙',
      given: '婶',
      gender: '女',
      bornYear: world.time.year - 40,
      bornMonth: 3,
      temper: '温和',
      health: 70,
      place: world.place,
      fate: '在',
      history: [],
    })
    people.amend('foster', { place: world.place, fate: '在' })
    people.bind('me', 'foster', '抚养')
    // 先牵上再推时间：`bind` 记的 since 是此刻，推完才够八年
    world.advanceTime({ years: 15 })
    world.setFlag('went-to-town', true)
    if (!alive) people.die('foster', '病')
  }

  const cases: Array<{ event: string; hold: () => void; drop: () => void }> = [
    {
      event: 'reunion-apprentice',
      hold: () => {
        stage(25)
        useWorldStore().setFlag('offered-shopwork', true)
      },
      drop: () => stage(25),
    },
    {
      event: 'reunion-homecoming',
      hold: () => raisedBy(true),
      drop: () => raisedBy(false), // 只改死活这一处
    },
    {
      event: 'reunion-emptied',
      hold: () => raisedBy(false),
      drop: () => raisedBy(true),
    },
  ]

  for (const { event, hold, drop } of cases) {
    const found = lifeEvents.find((one) => one.id === event)
    const requires = found?.requires ?? []
    if (found === undefined || requires.length === 0) {
      console.log(`  ✗ 尺子自检：${event} 取不到入场条件——id 打错或条件改了。`)
      bad += 1
      continue
    }

    hold()
    const held = meetsAll(requires)
    drop()
    const dropped = meetsAll(requires)

    if (!held) {
      console.log(`  ✗ ${event} 入场：前提摆齐了却进不去——这一卷在真世里演不到。`)
      bad += 1
    } else if (dropped) {
      console.log(`  ✗ ${event} 入场：前提不成立也进得去——那条入场条件没在管事。`)
      bad += 1
    } else {
      console.log(`  ✓ ${event} 入场：前提齐了进得去，差一处就进不去。`)
    }
  }
}

/**
 * 效果层：**去还是留，落的是相反的旗**。
 *
 * 上面那几条验的是「两条路各自走得到」和入场条件——
 * **把 `applyEffects` 整个改成空转，它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * 三卷各落各的：
 *
 *     apprentice  go 落「去了镇上」+ 体魄 3、见识 4、心志 3
 *                 stay 落「回了那份工」
 *     homecoming  stay-home 落「回来了」+ 心志 2
 *     emptied     stay-and-settle 心志 3
 *
 * ## 那两面旗是相反的，而且各标一个未来
 *
 * `went-to-town` 是 `homecoming` 和 `emptied` 两卷的入场条件——
 * **去了镇上的人才有「回来」这件事**。而 `turned-down-shopwork`
 * 记的是他没去。两面旗都不落，后头两卷一个人也读不到。
 *
 * 判「两条路落相反的旗」不判「go 正好 +4 见识」。
 */
{
  interface Marked {
    went: boolean
    turned: boolean
    insight: number
    will: number
  }

  function markedBy(scene: string, pick: string): Marked {
    stage()
    // 学徒那一卷要「有人给过这份工」才进得来
    const world = useWorldStore()
    world.setFlag('offered-shopwork', true)
    const character = useCharacterStore()
    const before = { ...character.attributes }
    play(scene, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    return {
      went: world.getFlag('went-to-town') === true,
      turned: world.getFlag('turned-down-shopwork') === true,
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
    }
  }

  const went = markedBy('reunion:apprentice', 'go')
  const stayed = markedBy('reunion:apprentice', 'stay')

  const wrong: string[] = []
  if (!went.went) {
    wrong.push('去了镇上，却没落「去了镇上」那面旗——后头两卷的入场就此关死')
  }
  if (went.turned) wrong.push('去了镇上，却记成「回了那份工」')
  if (!stayed.turned) wrong.push('回了那份工，却没落下那面旗')
  if (stayed.went) wrong.push('留下了，却记成「去了镇上」')
  if (went.insight <= 0) wrong.push(`出去闯那几年该长见识，实际 ${went.insight}`)
  if (went.insight === stayed.insight && went.will === stayed.will) {
    wrong.push('去了和留下落的是同样的东西——那一节两条路没有分别')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 重逢效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 重逢效果层：去了落「去了镇上」旗、见识 +${went.insight}；` +
        `留下落「回了那份工」旗——两面旗相反，各标一个未来。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  重逢那几卷，各条路各自有人走过了，去还是留也各标各的。\n')
}
