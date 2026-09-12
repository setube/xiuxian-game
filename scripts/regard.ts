/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 情义——regard:homecoming 走得到吗。
 *
 * `regard.ts` 里只有一个场景（`regard:homecoming`），是回到村子里
 * 被邻居迎面碰上的那一刻：东邻主妇（east-wife）或东邻主事（east-head）
 * 会在 seen 块里出现（有活人检查守着）。
 *
 * 关键节点：
 *   open         → gate-east-wife / gate-east-head / indoors（按条件分流）
 *   gate-east-wife  东邻主妇
 *   gate-east-head  东邻主事
 *   indoors      没有遇到东邻
 *   greeted      被人打招呼
 *   empty        空的（人都散了）
 *   after        结束
 *
 * 核心判据：
 * 一、indoors（没遇到东邻）可达
 * 二、greeted（被人打招呼）可达
 * 三、after（结束）可达
 * 四、尺子自检：场景 id 打对了，真的走进去了
 *
 * 跑法：bun scripts/regard.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'regard:homecoming'

function stage(age = 28): void {
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

function play(pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'open', pick)
}

console.log('\n=== 情义——regard:homecoming 走得到吗 ===\n')

let bad = 0

/**
 * 一、indoors（没遇到东邻）→ 继续走。
 */
{
  stage()
  const walked = playFrom('indoors')
  if (walked.length === 0) {
    console.log('  ✗ indoors：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ indoors：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 二、greeted（被人打招呼）可达。
 */
{
  stage()
  const walked = playFrom('greeted')
  if (walked.length === 0) {
    console.log('  ✗ greeted：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ greeted：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、after（结束）可达。
 */
{
  stage()
  const walked = playFrom('after')
  if (walked.length === 0) {
    console.log('  ✗ after：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ after：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、条件层：**回到家门口，迎着你的是谁**。
 *
 * 上面几条问的是「这个节点有内容吗」——`meetsAll` 恒真它们纹丝不动。
 *
 * 入口那一节按**谁还在**分三档，而**顺序是从远到近**：
 *
 *     east-wife 还在   → gate-east-wife    邻家的妇人
 *     east-head 还在   → gate-east-head    她男人
 *     （都不在）        → indoors           只有家里人
 *
 * 内容里那段注释写着为什么远的排前面：**这一卷要看的恰恰是
 * 「不相干的人怎么叫你」**——那是身份真正落地的地方。
 * 两条对调，这一卷的立意就没了，而「走得到吗」那类判据一声不响。
 *
 * ## 摆局要走真出生流程
 *
 * 邻居是 `birth.ts` 在出生流程里立的，`beOf` 只摆户籍五格不立人
 * （2026-09-12 在 `routine` 的王府局上栽过一次：`beOf('manor')` 之后
 * 人口册里一个乳母也没有）。所以掷到东邻那一户真的有人为止，
 * 再按要验的那一档把人送走。
 */
{
  /** 掷一世东邻齐全的，回报摆成功没有 */
  function stageWithNeighbours(): boolean {
    for (let n = 0; n < 300; n += 1) {
      setActivePinia(createPinia())
      useCharacterStore()
      useHouseholdStore()
      const people = usePeopleStore()
      useNarrativeStore()
      const story = useStory(lifeScenes, {
        events: lifeEvents,
        routine: lifeRoutine,
        finale: lifeFinale,
      })
      story.begin()
      if (people.personOf('east-wife') === undefined) continue
      if (people.personOf('east-head') === undefined) continue
      useWorldStore().advanceTime({ years: 28 })
      // 推了二十八年，人可能已经殁了——这一档要的是两个都还在
      if (!people.isAlive('east-wife') || !people.isAlive('east-head')) continue
      return true
    }
    return false
  }

  const cases: Array<{ label: string; gone: readonly string[]; to: string }> = [
    { label: '邻家的妇人还在', gone: [], to: 'gate-east-wife' },
    { label: '她没了，她男人还在', gone: ['east-wife'], to: 'gate-east-head' },
    { label: '两个都不在了', gone: ['east-wife', 'east-head'], to: 'indoors' },
  ]

  const entry = lifeScenes[SCENE]?.entry ?? 'open'
  /**
   * 走到的**第一个**分流目标是哪一个。
   *
   * ⚠️ 不能用 `walked.includes(to)`——**那三个目标在路径上是串着的**：
   * `gate-east-wife` 演完接 `indoors`，于是「该去 indoors」那一档
   * 在条件层整个失效时**照样成立**（路径确实流过了 indoors）。
   *
   * A 刀实测证实了这一点：三档里只有中间那一档红，
   * 头一档因为排在最前面、末一档因为路径流经，两头都逃掉了。
   *
   * 所以问的是**第一个落点**，不是「路过没路过」。
   */
  const targets = ['gate-east-wife', 'gate-east-head', 'indoors'] as const
  function landedOn(walked: readonly string[]): string | undefined {
    return walked.find((one) => (targets as readonly string[]).includes(one))
  }

  let checked = 0
  for (const { label, gone, to } of cases) {
    if (!stageWithNeighbours()) {
      console.log('  ✗ 摆局：300 次也没掷出东邻两口子都在的一世——这一条什么也没量。')
      bad += 1
      break
    }
    const people = usePeopleStore()
    for (const id of gone) people.die(id, '病')
    checked += 1
    const walked = playFrom(entry)
    const landed = landedOn(walked)
    if (landed !== to) {
      console.log(
        `  ✗ 门口分流〔${label}〕：该落在 ${to}，实际落在 ${landed ?? '哪儿也没落'}` +
          `（走过 ${walked.join('→')}）。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ 门口分流〔${label}〕：落在 ${to}。`)
    }
  }
  if (checked === 0) {
    console.log('  ✗ 门口分流：一档也没验到。')
    bad += 1
  }
}

/**
 * 五、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  情义那一卷，各条路各自有人走过了。\n')
}
