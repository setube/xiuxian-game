/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 青年时代——三卷各自走得到吗。
 *
 * `youth.ts` 里三个场景：
 *
 *   youth:exam        考试（go→去考/stay→不去）
 *   youth:apprentice  拜师学艺（craft/shop/farm/tenant 四条出身路）
 *   youth:river       渡口（stand/ask-boatman/leave 三条路）
 *
 * 核心判据：
 * 一、youth:exam 两条路（go→result / stay→stayed）各自走得到
 * 二、youth:apprentice 四条出身路（craft/shop/farm/tenant → done）各自走得到
 * 三、youth:river 三条路（stand/ask-boatman/leave → done）各自走得到
 * 四、尺子自检：三卷各自都走进去了
 *
 * 跑法：bun scripts/youth.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(age = 15): void {
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

console.log('\n=== 青年时代——三卷各自走得到吗 ===\n')

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
 * 一、youth:exam（考试）。
 *
 * go（去考）→ result，stay（不去）→ stayed。
 */
{
  const SCENE = 'youth:exam'

  stage()
  const goWalked = play(SCENE, (opts) => (opts.includes('go') ? 'go' : opts[0]!))
  check('exam go → result', goWalked, 'result')

  stage()
  const stayWalked = play(SCENE, (opts) => (opts.includes('stay') ? 'stay' : opts[0]!))
  check('exam stay → stayed', stayWalked, 'stayed')
}

/**
 * 二、youth:apprentice（拜师学艺）。
 *
 * open 里有四个选项：craft/shop/farm/tenant，都通过 effects 处理后走到 done。
 * 直接从 open 演，选不同选项，确认走到 done。
 */
{
  const SCENE = 'youth:apprentice'

  for (const pick of ['craft', 'shop', 'farm', 'tenant'] as const) {
    stage()
    const walked = play(SCENE, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    if (!walked.includes('done') && walked.length === 0) {
      console.log(`  ✗ apprentice ${pick}：走了零步——选项不存在或节点有问题。`)
      bad += 1
    } else {
      console.log(`  ✓ apprentice ${pick}：走到了 ${walked[walked.length - 1]}。`)
    }
  }
}

/**
 * 三、youth:river（渡口）。
 *
 * 三条路：stand（站着看）/ask-boatman（问船家）/leave（走开）→ done。
 */
{
  const SCENE = 'youth:river'

  for (const pick of ['stand', 'ask-boatman', 'leave'] as const) {
    stage()
    const walked = play(SCENE, (opts) => (opts.includes(pick) ? pick : opts[0]!))
    if (!walked.includes('done') && walked.length === 0) {
      console.log(`  ✗ river ${pick}：走了零步——节点有问题。`)
      bad += 1
    } else {
      console.log(`  ✓ river ${pick}：走到了 ${walked[walked.length - 1]}。`)
    }
  }
}

/**
 * 四、尺子自检：三卷各自都走进去了。
 */
{
  const scenes = ['youth:exam', 'youth:apprentice', 'youth:river'] as const
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
 * 条件层：**那些带条件的选项，真的在区分人吗**。
 *
 * 上面那几条问的是「选了这个选项走到那个节点了吗」——`next` 写死在内容里，
 * **`meetsAll` 恒真它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这几卷的条件层在**选项**上，那是「选项一个也不多给」那条纪律的落点：
 * 自耕农家的孩子和佃户家的孩子看见的不是同一组路。
 *
 * 判法跟 `routine` 那支一样——逐条手摆摆不完，所以反过来
 * **摆一排差别很大的局**，数每条带条件的选项在几个局下露面：
 *
 *     全都可见     条件形同虚设（恒真那一族）
 *     全都不可见   在我摆的局里一次也没露面（恒假那一族的嫌疑）
 *     有见有不见   ✓ 它在区分人
 *
 * 判红的是**整卷**：一卷里一条「有见有不见」的都没有，条件层整个是死的。
 *
 * ⚠️「全都不可见」只报数不判红——**我摆的局摆不全**。
 * 零次要紧，而要紧的是让人看见，不是让门禁替我断定它坏了。
 */
{
  const stages: Array<{ name: string; put: () => void }> = [
    {
      name: '自耕农家',
      put: () => {
        stage(15)
        useHouseholdStore().tenure = '自耕'
      },
    },
    {
      name: '佃户家',
      put: () => {
        stage(15)
        useHouseholdStore().tenure = '佃'
      },
    },
    {
      name: '拜过师学手艺的',
      put: () => {
        stage(17)
        const people = usePeopleStore()
        const world = useWorldStore()
        people.enroll({
          id: 'craft-master',
          surname: '陈',
          given: '师',
          gender: '男',
          bornYear: world.time.year - 45,
          bornMonth: 3,
          temper: '木讷',
          health: 70,
          place: world.place,
          fate: '在',
          history: [],
        })
        people.bind('me', 'craft-master', '师')
        world.setFlag('has-craft', true)
      },
    },
    {
      name: '念过书的',
      put: () => {
        stage(17)
        useWorldStore().setFlag('schooled', true)
      },
    },
    { name: '二十五岁', put: () => stage(25) },
  ]

  const volumes = ['youth:apprentice', 'youth:exam', 'youth:river'] as const
  for (const scene of volumes) {
    const s = lifeScenes[scene]
    const gated = Object.values(s?.nodes ?? {})
      .flatMap((node) => node.choices ?? [])
      .filter((one) => (one.requires?.length ?? 0) > 0)

    if (gated.length === 0) {
      console.log(`  ·  ${scene}：这一卷没有带条件的选项，条件层无从验起。`)
      continue
    }

    const seen = new Map<string, number>()
    for (const { put } of stages) {
      put()
      for (const one of gated) {
        if (meetsAll(one.requires)) seen.set(one.id, (seen.get(one.id) ?? 0) + 1)
      }
    }

    const always = gated.filter((one) => (seen.get(one.id) ?? 0) === stages.length)
    const never = gated.filter((one) => (seen.get(one.id) ?? 0) === 0)
    const telling = gated.length - always.length - never.length

    if (telling === 0) {
      console.log(
        `  ✗ ${scene} 条件层：${gated.length} 条带条件的选项，` +
          `没有一条在这 ${stages.length} 个局之间区分出人来` +
          `（恒可见 ${always.length}、一次没露面 ${never.length}）。`,
      )
      bad += 1
    } else {
      console.log(
        `  ✓ ${scene} 条件层：${gated.length} 条里 ${telling} 条在区分人` +
          `（恒可见 ${always.length}、一次没露面 ${never.length}）。`,
      )
    }
    for (const one of never) {
      console.log(`      ·  「${one.label}」在这 ${stages.length} 个局里一次也没露面`)
    }
  }

  /*
   * ⚠️ 上面那一圈只数**选项**上的条件，而这几卷的条件层还有一半在**入场**上
   * ——`youth:exam` 要「先生还在」，`youth:apprentice` 要 `working` 那面旗。
   *
   * 两类是两回事：选项条件问「这个人看得见这条路吗」，
   * 入场条件问「这一卷会不会落在他头上」。只数前一类，
   * 报表会印「这一卷没有带条件的选项」——**读着像这一卷没有条件层**，
   * 而它其实有，只是在另一个地方。
   *
   * 判法是 `trades` 那个：同一个前提摆两次局，成立的进得去、不成立的进不去。
   */
  const gates: Array<{ event: string; hold: () => void }> = [
    {
      event: 'youth-exam',
      /*
       * ⚠️ 三条一起摆：念过书 + 是男孩 + 先生还在。
       * 头一版只摆了第三条，报「前提成立却进不去」——**摆局缺一格**，
       * 而那句报错读着像这一卷在真世里演不到。
       *
       * 内容里那段注释说的正是这条判据该守的东西：
       * 「这一节开口的是先生，他得还在。旗标不会因为一个人死了就变」。
       */
      hold: () => {
        stage(15)
        const household = useHouseholdStore()
        household.gender = '男'
        const people = usePeopleStore()
        const world = useWorldStore()
        people.enroll({
          id: 'teacher',
          surname: '周',
          given: '先生',
          gender: '男',
          bornYear: world.time.year - 50,
          bornMonth: 3,
          temper: '谨慎',
          health: 70,
          place: world.place,
          fate: '在',
          history: [],
        })
        people.amend('teacher', { place: world.place, fate: '在' })
        people.bind('me', 'teacher', '师')
        world.setFlag('schooled', true)
      },
    },
    {
      event: 'youth-apprentice',
      hold: () => {
        stage(15)
        useWorldStore().setFlag('working', true)
      },
    },
  ]

  for (const { event, hold } of gates) {
    const found = lifeEvents.find((one) => one.id === event)
    const requires = found?.requires ?? []
    if (found === undefined || requires.length === 0) {
      console.log(`  ✗ 尺子自检：${event} 取不到入场条件——id 打错或条件改了。`)
      bad += 1
      continue
    }

    // 前提不成立：进不去
    stage(15)
    const bare = meetsAll(requires)
    // 前提成立：进得去
    hold()
    const held = meetsAll(requires)

    if (bare) {
      console.log(`  ✗ ${event} 入场：前提不成立也进得去——那条入场条件没在管事。`)
      bad += 1
    } else if (!held) {
      console.log(`  ✗ ${event} 入场：前提成立却进不去——这一卷在真世里演不到。`)
      bad += 1
    } else {
      console.log(`  ✓ ${event} 入场：前提不成立进不去，成立了才进得去。`)
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  青年时代那几年，各条路各自有人走过了。\n')
}
