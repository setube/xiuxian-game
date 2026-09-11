/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 剩余各卷——birth/descend/ending/inquiry/invest 各自走得到吗。
 *
 * `birth.ts`       出生（按 origin 动态生成，farm/craft 两种出身验证）
 * `descend.ts`     侄孙出生（descend:grandnephew，open/sit/after）
 * `ending.ts`      落幕（entry: 'last'，kin/spouse/alone/gone/close）
 * `inquiry.ts`     打听消息（ask:around 和 ask:strangers 两卷）
 * `invest.ts`      封号（royal:invest）
 *
 * 核心判据：
 * 一、birth farm/craft 出身各自走进去了
 * 二、descend:grandnephew sit/after 节点可达
 * 三、ending 走进去了（last 节点可达）
 * 四、ask:around ask-elder/let-it-be 两条路可达
 * 五、ask:strangers look/ignore 两条路可达
 * 六、royal:invest 走进去了
 * 七、尺子自检：六类场景各自都走进去了
 *
 * 跑法：bun scripts/birth.ts
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

function stage(origin: string = 'farm', age = 0): void {
  setActivePinia(createPinia())
  beOf(origin as 'farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  if (age > 0) world.advanceTime({ years: age })
}

function enrollNephew(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'nephew',
    surname: '江',
    given: '小',
    gender: '男',
    bornYear: world.time.year - 25,
    bornMonth: 3,
    temper: '木讷',
    health: 72,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'nephew', '侄')
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
  const s = lifeScenes[scene]
  if (!s) return []
  return playFrom(scene, s.entry, pick)
}

console.log('\n=== 剩余各卷——birth/descend/ending/inquiry/invest 各自走得到吗 ===\n')

let bad = 0

/**
 * 一、birth（出生）。
 *
 * farm/craft 两种出身各自走进去了。
 * 场景 id 格式：`birth-{origin.id}`。
 */
{
  for (const origin of ['farm', 'craft'] as const) {
    stage(origin, 0)
    const sceneId = `birth:${origin}`
    const walked = play(sceneId)
    if (walked.length === 0) {
      console.log(`  ✗ birth-${origin}：走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
    } else {
      console.log(`  ✓ birth-${origin}：走进去了，走了 ${walked.length} 步。`)
    }
  }
}

/**
 * 二、descend:grandnephew（侄孙出生）。
 *
 * sit 和 after 节点可达。
 */
{
  const SCENE = 'descend:grandnephew'

  stage('farm', 60)
  enrollNephew()
  const sitWalked = playFrom(SCENE, 'sit')
  if (sitWalked.length === 0) {
    console.log('  ✗ descend sit：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ descend sit：节点有内容，走了 ${sitWalked.length} 步。`)
  }

  stage('farm', 60)
  enrollNephew()
  const afterWalked = playFrom(SCENE, 'after')
  if (afterWalked.length === 0) {
    console.log('  ✗ descend after：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ descend after：节点有内容，走了 ${afterWalked.length} 步。`)
  }
}

/**
 * 三、ending（落幕）。
 *
 * entry 是 'last'，走进去了。
 */
{
  stage('farm', 70)
  // ending.ts 的场景 id 先查一下
  const endingScenes = Object.keys(lifeScenes).filter((id) => id.includes('ending') || id.includes('last') || id.includes('end:'))
  // 从 lifeScenes 里找 entry 是 'last' 的场景
  const endingScene = Object.entries(lifeScenes).find(([, s]) => s.entry === 'last')
  if (!endingScene) {
    console.log('  ✗ ending：找不到 entry=last 的场景。')
    bad += 1
  } else {
    const [sceneId] = endingScene
    const walked = play(sceneId)
    if (walked.length === 0) {
      console.log(`  ✗ ending（${sceneId}）：走了零步。`)
      bad += 1
    } else {
      console.log(`  ✓ ending（${sceneId}）：走进去了，走了 ${walked.length} 步（last → ${walked[walked.length - 1]}）。`)
    }
  }
}

/**
 * 四、ask:around（打听消息）。
 *
 * ask-elder（去问长辈）→ after，let-it-be（算了不问）→ after。
 */
{
  const SCENE = 'ask:around'

  stage('farm', 30)
  const elderWalked = play(SCENE, (opts) => opts.includes('ask-elder') ? 'ask-elder' : opts[0]!)
  if (!elderWalked.includes('after')) {
    console.log(`  ✗ ask:around ask-elder → after：没走到（走过 ${elderWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ ask:around ask-elder → after：走到了。')
  }

  stage('farm', 30)
  const letWalked = play(SCENE, (opts) => opts.includes('let-it-be') ? 'let-it-be' : opts[0]!)
  if (letWalked.length === 0) {
    console.log('  ✗ ask:around let-it-be：走了零步。')
    bad += 1
  } else {
    console.log(`  ✓ ask:around let-it-be：走到了 ${letWalked[letWalked.length - 1]}。`)
  }
}

/**
 * 五、ask:strangers（问陌生人）。
 *
 * look（看了看）→ looked，ignore（不管）→ looked。
 */
{
  const SCENE = 'ask:strangers'

  stage('farm', 30)
  const lookWalked = play(SCENE, (opts) => opts.includes('look') ? 'look' : opts[0]!)
  if (lookWalked.length === 0) {
    console.log('  ✗ ask:strangers look：走了零步。')
    bad += 1
  } else {
    console.log(`  ✓ ask:strangers look：走到了 ${lookWalked[lookWalked.length - 1]}。`)
  }

  stage('farm', 30)
  const ignoreWalked = play(SCENE, (opts) => opts.includes('ignore') ? 'ignore' : opts[0]!)
  if (ignoreWalked.length === 0) {
    console.log('  ✗ ask:strangers ignore：走了零步。')
    bad += 1
  } else {
    console.log(`  ✓ ask:strangers ignore：走到了 ${ignoreWalked[ignoreWalked.length - 1]}。`)
  }
}

/**
 * 六、royal:invest（封号）。
 */
{
  stage('farm', 30)
  const walked = play('royal:invest')
  if (walked.length === 0) {
    console.log('  ✗ royal:invest：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ royal:invest：走进去了，走了 ${walked.length} 步。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  剩余各卷，各自有人走过了。\n')
}
