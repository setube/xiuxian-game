/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 结算顺序走查。
 *
 * ## 时间不是一个普通效果
 *
 * 三十七种 `Effect` 里，三十六种在陈述**一件事发生了**：拿到什么、认识谁、
 * 学会哪一条、旗立起来。只有 `time` 不陈述事实——**它改变其余所有事实的解释上下文**。
 *
 * 所以同一批 effects 里，`time` 写在前还是写在后，会改变别的效果落下时读到的「今天」。
 * 认知记 `learnedAt`、纪事记年份、日记记日期——全都读世界时间。写法一挪，
 * 同一段剧情的时间戳能差出四百天，而没有任何东西会报错。
 *
 * ## 修法不是立规矩，是分相
 *
 * 立一条「`time` 必须写在第一位」的规矩会禁掉本来合法的写法：
 * `[{ 受伤 }, { time: 养了半个月 }]` 读起来就该是这个次序——先挨那一下，再养半个月。
 * 作者按叙述顺序写是对的，不该为了引擎的方便改成倒着写。
 *
 * 所以 `effects.ts` 改成两相结算：上下文相先走完，事实相再按原序落下。
 * 顺序不是被检查掉的，是**无从影响结果**。
 *
 * ## 这一支查的是分相有没有真的生效
 *
 * 拿全库每一批含 `time` 的 effects，正着跑一遍、把 `time` 挪到末尾再跑一遍，
 * 比对五个 store 的完整快照。一致才算分相是真的。
 *
 * 随机被钉死（`Math.random` 换成定种线性同余），否则世界起点是随机掷的，
 * `roll` 也是随机的，两遍跑出来必然不同——**那样这支脚本永远红，而且红得没有意义**。
 * 第一版就栽在这儿：三个时间值互不相同，看着像分相失败，其实是尺子在抖。
 *
 * 跑法：npx vite-node scripts/settle.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { applyEffects } from '../src/engine/effects'
import { lifeScenes } from '../src/content/life'
import { useCharacterStore } from '../src/stores/character'
import { useDiaryStore } from '../src/stores/diary'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Effect, SceneNode } from '../src/types/game'

/**
 * 定种随机。两遍跑必须掷出同一串数，否则比对的是噪声不是顺序。
 *
 * 用最朴素的线性同余——这里不需要统计学意义上的好随机，
 * 只需要「同样的种子给同样的序列」。
 */
function seedRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

/**
 * 第二个噪声源：`id.ts` 用 `crypto.randomUUID()` 给关系、纪事编号，
 * 它不走 `Math.random`，钉死一个漏掉另一个，快照照样两遍不同。
 *
 * 换成计数器：同样的调用序列给同样的编号。
 * 若分相之后调用序列真的不变，编号自然也不变——这一项本身就是在查顺序。
 */
let counter = 0
const countedUuid = (): `${string}-${string}-${string}-${string}-${string}` => {
  counter += 1
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
}

/** 五个 store 的完整快照。顺序敏感会在这里显形 */
function snapshot(): string {
  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const people = usePeopleStore()
  const diary = useDiaryStore()
  return JSON.stringify([
    world.$state,
    character.$state,
    household.$state,
    people.$state,
    diary.$state,
  ])
}

/** 跑一批 effects，返回结算后的世界快照。每次都是全新的 pinia、全新的定种随机、全新的编号 */
function run(effects: readonly Effect[]): string {
  Math.random = seedRandom(20260904)
  counter = 0
  crypto.randomUUID = countedUuid
  setActivePinia(createPinia())
  applyEffects(effects)
  return snapshot()
}

/** 把这一批里的 `time` 全挪到末尾。分相若生效，挪了也一样 */
function timeLast(effects: readonly Effect[]): Effect[] {
  return [
    ...effects.filter((effect) => effect.type !== 'time'),
    ...effects.filter((effect) => effect.type === 'time'),
  ]
}

/** 全库每一批 effects。`onEnter` 是一批，每个 `choice.effects` 各是一批 */
function batches(): { where: string; effects: readonly Effect[] }[] {
  const found: { where: string; effects: readonly Effect[] }[] = []
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const node of Object.values(scene.nodes) as SceneNode[]) {
      if (node.onEnter?.length)
        found.push({ where: `${sceneId}#${node.id}`, effects: node.onEnter })
      for (const choice of node.choices ?? []) {
        if (choice.effects?.length) {
          found.push({ where: `${sceneId}#${node.id}:${choice.id}`, effects: choice.effects })
        }
      }
    }
  }
  return found
}

const realRandom = Math.random
const realUuid = crypto.randomUUID

/** 尺子自检：造一批必然顺序敏感的 effects，确认这套比对抓得住 */
function selfCheck(): boolean {
  const learn: Effect = {
    type: 'knowledge',
    id: 'ruler',
    title: '尺子',
    summary: '量一量',
    category: '世事',
  }
  const wait: Effect = { type: 'time', days: 400 }

  // 分相之下，这两种写法必须一致
  const sound = run([wait, learn]) === run([learn, wait])
  console.log(`  ${sound ? '√' : '✗'}　认知 + 推进四百天，两种写法结果一致`)

  // 定种随机自己也得准：掷骰子那一批跑两遍必须一模一样
  const dice: Effect = {
    type: 'roll',
    key: 'ruler-roll',
    among: [
      { value: '甲', weight: 1 },
      { value: '乙', weight: 1 },
      { value: '丙', weight: 1 },
    ],
  }
  const stable = run([dice]) === run([dice])
  console.log(`  ${stable ? '√' : '✗'}　定种随机稳定（掷骰子跑两遍完全相同）`)

  return sound && stable
}

console.log('=== 尺子自检 ===')
const sound = selfCheck()
console.log(sound ? '  尺子是准的。' : '  尺子坏了——底下那个数字不作数。')

console.log('\n=== 全库结算顺序 ===')
const all = batches()
const withTime = all.filter((batch) => batch.effects.some((effect) => effect.type === 'time'))
let differ = 0
for (const { where, effects } of withTime) {
  if (run(effects) === run(timeLast(effects))) continue
  differ += 1
  console.log(`  ✗ ${where}　把 time 挪到末尾，结果变了`)
}
Math.random = realRandom
crypto.randomUUID = realUuid

console.log(`  ${all.length} 批效果，其中 ${withTime.length} 批含 time。`)
if (differ === 0) {
  console.log('    没有一批会因为 time 写在哪儿而改变结果。')
  console.log('    · 顺序不是被检查掉的，是分相之后无从影响结果')
} else {
  console.log(`    其中 ${differ} 批换了写法就换了结果——分相没有覆盖到。`)
}
