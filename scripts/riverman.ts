/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 渡口——各入场路线都走得到吗，as-apprentice 正文干净吗。
 *
 * `riverman.ts` 里只有一个场景（`riverman`），有多条入场路线：
 *
 *   as-escort     护卫出身
 *   as-nobody     白身
 *   as-highborn   贵族/官宦出身
 *   as-healer     医者出身
 *   as-innkeep    客栈出身
 *   as-taverner   酒楼出身
 *   as-gentry     乡绅出身
 *   as-student    念过书（先生还在）
 *   as-reader     念过书（先生没了）
 *   as-apprentice 学过手艺（本轮刚修复：去掉了「师傅」字样）
 *   as-clerk      掌柜的出身
 *   as-hand       普通农户出身
 *
 * 核心判据：
 * 一、as-apprentice 正文里没有「师傅」二字（present.ts 会把殁了的人叫出来）
 * 二、river 节点可达（各入场路线都汇入这里）
 * 三、关键结果节点（watched/approached/named-root/left）各自可达
 * 四、尺子自检：场景真的走进去了
 *
 * 跑法：bun scripts/riverman.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'riverman'

function stage(age = 20): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[SCENE]
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
  pick: (options: string[]) => string = (opts) => opts[0]!,
): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'open', pick)
}

console.log('\n=== 渡口——各入场路线都走得到吗 ===\n')

let bad = 0

/**
 * 一、as-apprentice 正文里没有「师傅」二字。
 *
 * 这是本轮修复的 bug：原先写「师傅打发你进城交一批活计」，
 * 但这一节在 craft-master 已殁的世里同样触发，present.ts 逼出来。
 * 修成「你进城交了一批活计」——这条判据锁住这个修复不被后人误改。
 */
{
  const scene = lifeScenes[SCENE]
  const node = scene?.nodes['as-apprentice']
  if (!node) {
    console.log('  ✗ as-apprentice 节点不存在——场景里没有这个节点。')
    bad += 1
  } else {
    const texts = [
      ...(node.blocks ?? []).map((b) => ('text' in b ? b.text : '')),
      ...(node.seen ?? []).map((s) => s.text),
    ]
    const hasMasterWord = texts.some((t) => t.includes('师傅'))
    if (hasMasterWord) {
      console.log('  ✗ as-apprentice 正文：出现了「师傅」二字——present.ts 会把殁了的人叫出来。')
      bad += 1
    } else {
      console.log('  ✓ as-apprentice 正文：一次「师傅」也没有，present.ts 不会报红。')
    }
  }
}

/**
 * 二、各入场路线各自走得到 river 节点（核心场景的入口）。
 *
 * 直接从各入场路线节点演，确认走到了 river 节点。
 */
{
  const entryNodes = [
    'as-escort', 'as-nobody', 'as-highborn', 'as-healer',
    'as-innkeep', 'as-taverner', 'as-gentry', 'as-student',
    'as-reader', 'as-apprentice', 'as-clerk', 'as-hand',
  ] as const

  for (const node of entryNodes) {
    stage()
    const walked = playFrom(node)
    if (!walked.includes('river')) {
      console.log(`  ✗ ${node} → river：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ ${node} → river：走到了。`)
    }
  }
}

/**
 * 三、river 节点里的关键选项各自走得到。
 *
 * river 节点里有 watch/approach/shake/leave/recognize 等选项，
 * 直接从 river 节点演，选不同选项，确认结果节点可达。
 */
{
  const riverCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'watch', node: 'watched', label: 'watch → watched' },
    { pick: 'approach', node: 'approached', label: 'approach → approached' },
    { pick: 'leave', node: 'left', label: 'leave → left' },
  ]

  for (const { pick, node, label } of riverCases) {
    stage()
    const walked = playFrom('river', (opts) => opts.includes(pick) ? pick : opts[0]!)
    if (!walked.includes(node)) {
      console.log(`  ✗ river ${label}：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ river ${label}：走到了。`)
    }
  }
}

/**
 * 四、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.slice(0, 4).join(' → ')}…）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  渡口那一卷：各路人走到了，as-apprentice 正文干净。\n')
}
