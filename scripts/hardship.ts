/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 债和难处——八卷各自走得到吗。
 *
 * `hardship.ts` 里八个场景，都围绕「父亲借了债」这条线：
 *
 *   debt:drought   旱年，父亲出去借了粮
 *   debt:borrow    父亲去借银子，带没带你去（sit/sleep 两条）
 *   debt:leave     哥出去做工，去不去（follow/stay 两条）
 *   debt:return    哥回来了（father 选项）
 *   debt:silence   债主来了，不说（silence 节点）
 *   debt:death     父亲没在路上回来（几条分叉）
 *   debt:fields    地要出去了（listen/fields 两条）
 *   debt:quit      退学（accept/beg 两条）
 *
 * 核心判据：每一卷入口可达，关键选项分叉各自走得到。
 *
 * 跑法：bun scripts/hardship.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(standing: number, age = 15): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = standing
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

/** 给父亲入册并绑上关系 */
function enrollFather(alive = true): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'father',
    surname: '江',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 45,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'father', '生父')
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

console.log('\n=== 债和难处——八卷各自走得到吗 ===\n')

let bad = 0

// 统一的测试辅助函数
function check(label: string, walked: string[], expected: string): void {
  if (!walked.includes(expected)) {
    console.log(`  ✗ ${label}：没走到 ${expected}（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log(`  ✓ ${label}：走到了 ${expected}。`)
  }
}

/**
 * 一、debt:drought（旱年借粮）。
 */
{
  stage(20)
  enrollFather()
  const walked = play('debt:drought')
  if (walked.length === 0) {
    console.log('  ✗ drought：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ drought：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 二、debt:borrow（父亲去借银子，带没带你）。
 *
 * sit（跟着坐在外面）和 sleep（留在家里睡）两条。
 */
{
  const SCENE = 'debt:borrow'

  stage(20)
  enrollFather()
  const sitWalked = play(SCENE, (opts) => (opts.includes('sit') ? 'sit' : opts[0]!))
  check('borrow sit（跟着坐在外面）→ sat', sitWalked, 'sat')

  stage(20)
  enrollFather()
  const sleepWalked = play(SCENE, (opts) => (opts.includes('sleep') ? 'sleep' : opts[0]!))
  check('borrow sleep（留在家里睡）→ slept', sleepWalked, 'slept')
}

/**
 * 三、debt:leave（哥出去做工）。
 *
 * follow（跟哥去）和 stay（留家里）两条。
 */
{
  const SCENE = 'debt:leave'

  stage(20)
  const world = useWorldStore()
  const people = usePeopleStore()
  // 立哥
  people.enroll({
    id: 'brother',
    surname: '江',
    given: '二',
    gender: '男',
    bornYear: world.time.year - 20,
    bornMonth: 5,
    temper: '木讷',
    health: 72,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'brother', '兄')

  const followWalked = play(SCENE, (opts) => (opts.includes('follow') ? 'follow' : opts[0]!))
  check('leave follow（跟哥去）→ followed', followWalked, 'followed')

  stage(20)
  const w2 = useWorldStore()
  const p2 = usePeopleStore()
  p2.enroll({
    id: 'brother',
    surname: '江',
    given: '二',
    gender: '男',
    bornYear: w2.time.year - 20,
    bornMonth: 5,
    temper: '木讷',
    health: 72,
    place: w2.place,
    fate: '在',
    history: [],
  })
  p2.bind('me', 'brother', '兄')
  const stayWalked = play(SCENE, (opts) => (opts.includes('stay') ? 'stay' : opts[0]!))
  check('leave stay（留家里）→ stayed', stayWalked, 'stayed')
}

/**
 * 四、debt:return（哥回来了）。
 */
{
  stage(20)
  const walked = play('debt:return')
  if (walked.length === 0) {
    console.log('  ✗ return：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ return：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 五、debt:silence（债主来了，不说）。
 */
{
  stage(20)
  const walked = play('debt:silence')
  if (walked.length === 0) {
    console.log('  ✗ silence：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ silence：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 六、debt:death（父亲没在路上回来）。
 *
 * after 节点是核心，还有 ask-where/father-grave/silent 等分叉。
 */
{
  stage(20)
  enrollFather(false) // 父亲已殁
  const walked = play('debt:death')
  if (!walked.includes('after')) {
    console.log(`  ✗ death after：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ death after（父亲没回来）：走到了。')
  }
}

/**
 * 七、debt:fields（地要出去了）。
 *
 * listen（听大人说话）和 fields（去地里）两条。
 */
{
  const SCENE = 'debt:fields'

  stage(20)
  const listenWalked = play(SCENE, (opts) => (opts.includes('listen') ? 'listen' : opts[0]!))
  check('fields listen（听大人说话）→ heard', listenWalked, 'heard')

  stage(20)
  const fieldsWalked = play(SCENE, (opts) => (opts.includes('fields') ? 'fields' : opts[0]!))
  check('fields fields（去地里）→ went', fieldsWalked, 'went')
}

/**
 * 八、debt:quit（退学）。
 *
 * accept（接受退学）和 beg（去求先生）两条。
 */
{
  const SCENE = 'debt:quit'

  stage(20)
  const acceptWalked = play(SCENE, (opts) => (opts.includes('accept') ? 'accept' : opts[0]!))
  check('quit accept（接受退学）→ leave-school', acceptWalked, 'leave-school')

  stage(20)
  const begWalked = play(SCENE, (opts) => (opts.includes('beg') ? 'beg' : opts[0]!))
  check('quit beg（去求先生）→ begged', begWalked, 'begged')
}

/**
 * 九、尺子自检：八卷各自都走进去了。
 */
{
  const scenes = [
    'debt:drought',
    'debt:borrow',
    'debt:leave',
    'debt:return',
    'debt:silence',
    'debt:death',
    'debt:fields',
    'debt:quit',
  ] as const
  let allIn = true
  for (const scene of scenes) {
    stage(20)
    enrollFather()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：八卷各自都走进去了。')
}

/**
 * 九、父亲的三种结局，各自只该选中一条事件。
 *
 * ## 为什么补这一条
 *
 * 2026-09-12 把 `meetsAll` 改成恒真跑全套（打断地基），这一支**一条也没红**——
 * 而它上头八条验的全是「这一卷走得通吗」：从 `open` 选 `press`，断言走到 `told`。
 * 那个 `next` 是写死在内容里的，**条件层废不废它都走得到**。
 *
 * 而这一册最要紧的岔口恰恰全在条件层：父亲出门做工那一刻掷 `father-fate`
 * （归 62 / 亡 24 / 杳 14），三个值各把关一条事件——
 *
 *     father-fate 归  →  debt-return    他回来了，人瘦了，债还了一半
 *     father-fate 亡  →  debt-death     他没在路上回来
 *     father-fate 杳  →  debt-silence   再也没有消息
 *
 * **上头八条一次也没设过这面旗。** 三条路的入口条件全废掉，那八条照样全绿。
 *
 * 判据的形状是有讲究的，这是打断实验教出来的：
 *
 *     抓不住条件层   断言「这条路走得通」       从 open 选 press 走到 told
 *     抓得住条件层   断言「不同情形去不同地方」  归走到 return、亡走到 death
 *
 * 所以这一条问的不是「三条各自走得到吗」，是「**三个值选出来的是三条不同的事件吗**」。
 * 条件层一坏——不论是恒真、写错 id、还是三条 `equals` 抄成同一个值——
 * 这一条立刻红，而上头八条一动不动。
 *
 * ⚠️ `alive: true` 不是笔误也不是恒假：父亲走时只标「在外」（`father-away`），
 * 人还在册上活着；这三条事件是**送信**的，殁在事件里头发生。
 * 条件问的是「消息还没送到」，不是「他还好好的」。
 *
 * ## 摆局会自己把父亲摆死，所以要掷到他还在为止
 *
 * 头一版写完当场红一条：「结局〔归〕选中 0 条」。四颗种子复跑全绿，只有那一颗红——
 * 低频。抄回那颗种子逐步二分，印出来是这样：
 *
 *     enroll 后          在
 *     bind 后            在
 *     applyEffects 后    殁      ← 就这一步
 *
 * 而 `case 'flag'` 只有一行 `world.setFlag`，杀不了人。决定性的一测是**换一面无关的旗**：
 *
 *     旗〔father-away〕      在 → 在
 *     旗〔zzz-irrelevant〕   在 → 殁     ← 无关的旗照样杀
 *     旗〔father-away〕      在 → 在
 *
 * **杀人的不是旗，是这是第几次调用**——`applyEffects` 走 `snapshotRoles()` 时掷骰，
 * 摆局里的人会跟着老死（项目记忆 `staged-people-die` 那一条，这是它的第 N 次现身）。
 *
 * 所以这一条掷到「父亲还在」为止。**而重掷必须留「掷不出来也报红」那一手**：
 * 不留的话，哪天父亲变成必死，这一条会安静地一次也不判，报表上跟绿一模一样。
 */
{
  console.log('\n=== 九、父亲的三种结局，各自只该选中一条事件 ===\n')
  const fates = ['归', '亡', '杳'] as const
  const expected: Record<(typeof fates)[number], string> = {
    归: 'debt-return',
    亡: 'debt-death',
    杳: 'debt-silence',
  }
  /** 只看这三条，别的事件不参与——它们各有各的入口，混进来会把这一问变成「年表排程对不对」 */
  const theThree = lifeEvents.filter((one) => Object.values(expected).includes(one.id))

  if (theThree.length !== 3) {
    console.log(`  ✗ 尺子自检：库里只找到 ${theThree.length} 条，不是三条——事件 id 改过了。`)
    bad += 1
  } else {
    for (const fate of fates) {
      /** 掷到父亲还活着为止。上限不是保险丝，是判据：掷不出来本身就是一条红 */
      let tries = 0
      let stood = false
      while (tries < 40 && !stood) {
        tries += 1
        stage(20)
        enrollFather()
        applyEffects([
          { type: 'flag', key: 'father-away', value: true },
          { type: 'flag', key: 'father-fate', value: fate },
        ])
        stood = useHouseholdStore().isAlive('father')
      }
      if (!stood) {
        console.log(`  ✗ 结局〔${fate}〕：摆了 ${tries} 次，父亲每次都在摆局途中殁了——局立不住。`)
        bad += 1
        continue
      }
      const picked = theThree.filter((one) => meetsAll(one.requires)).map((one) => one.id)
      if (picked.length === 1 && picked[0] === expected[fate]) {
        console.log(
          `  ✓ 结局〔${fate}〕→ ${expected[fate]}${tries > 1 ? `（摆了 ${tries} 次）` : ''}`,
        )
      } else {
        console.log(
          `  ✗ 结局〔${fate}〕该只选中 ${expected[fate]}，实际选中 ${picked.length} 条` +
            `${picked.length > 0 ? `（${picked.join('、')}）` : '（一条也没有）'}。`,
        )
        bad += 1
      }
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  债和难处，八卷各有人走过了。\n')
}
