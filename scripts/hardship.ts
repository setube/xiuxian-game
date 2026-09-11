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

import { lifeScenes } from '../src/content/life'
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

function play(
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
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
  const sitWalked = play(SCENE, (opts) => opts.includes('sit') ? 'sit' : opts[0]!)
  check('borrow sit（跟着坐在外面）→ sat', sitWalked, 'sat')

  stage(20)
  enrollFather()
  const sleepWalked = play(SCENE, (opts) => opts.includes('sleep') ? 'sleep' : opts[0]!)
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

  const followWalked = play(SCENE, (opts) => opts.includes('follow') ? 'follow' : opts[0]!)
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
  const stayWalked = play(SCENE, (opts) => opts.includes('stay') ? 'stay' : opts[0]!)
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
  const listenWalked = play(SCENE, (opts) => opts.includes('listen') ? 'listen' : opts[0]!)
  check('fields listen（听大人说话）→ heard', listenWalked, 'heard')

  stage(20)
  const fieldsWalked = play(SCENE, (opts) => opts.includes('fields') ? 'fields' : opts[0]!)
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
  const acceptWalked = play(SCENE, (opts) => opts.includes('accept') ? 'accept' : opts[0]!)
  check('quit accept（接受退学）→ leave-school', acceptWalked, 'leave-school')

  stage(20)
  const begWalked = play(SCENE, (opts) => opts.includes('beg') ? 'beg' : opts[0]!)
  check('quit beg（去求先生）→ begged', begWalked, 'begged')
}

/**
 * 九、尺子自检：八卷各自都走进去了。
 */
{
  const scenes = [
    'debt:drought', 'debt:borrow', 'debt:leave', 'debt:return',
    'debt:silence', 'debt:death', 'debt:fields', 'debt:quit',
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

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  债和难处，八卷各有人走过了。\n')
}
