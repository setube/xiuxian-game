/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 日常例行——六卷各自走得到吗。
 *
 * `routine.ts` 是按年龄段分的六卷日常生活，库里频率最高的内容文件之一：
 *
 *   routine:child   孩童时代的日常
 *   routine:youth   少年时代的日常
 *   routine:teen    青少年时代的日常
 *   routine:adult   成年时代的日常
 *   routine:prime   壮年时代的日常
 *   routine:old     老年时代的日常
 *
 * 核心判据：
 * 一、六卷各自走进去了（尺子自检）
 * 二、**条件层**：那 38 条带条件的选项，真的在区分人吗　← A 刀要红的
 *
 * ⚠️ 第一条问的是「走得进去吗」，而六卷入口都没有条件——
 * `meetsAll` 改成恒真它纹丝不动。第二条是 2026-09-12 补的。
 *
 * 跑法：bun scripts/routine.ts
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

function stage(age: number): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function play(
  scene: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[scene]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = s.entry

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

console.log('\n=== 日常例行——六卷各自走得到吗 ===\n')

let bad = 0

const ageCases: Array<{ scene: string; age: number; label: string }> = [
  { scene: 'routine:child', age: 8, label: '孩童（8岁）' },
  { scene: 'routine:youth', age: 13, label: '少年（13岁）' },
  { scene: 'routine:teen', age: 17, label: '青少年（17岁）' },
  { scene: 'routine:adult', age: 25, label: '成年（25岁）' },
  { scene: 'routine:prime', age: 40, label: '壮年（40岁）' },
  { scene: 'routine:old', age: 65, label: '老年（65岁）' },
]

for (const { scene, age, label } of ageCases) {
  stage(age)
  const walked = play(scene)
  if (walked.length === 0) {
    console.log(`  ✗ ${label}（${scene}）：走了零步——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(
      `  ✓ ${label}（${scene}）：走进去了，走了 ${walked.length} 步（…${walked[walked.length - 1]}）。`,
    )
  }
}

/**
 * 二、条件层：**那些带条件的选项，真的在区分人吗**。
 *
 * ## 上面那一条没碰到条件层
 *
 * 它问「这一卷走得进去吗」，而六卷的入口都没有条件——
 * 把 `meetsAll` 整个改成恒真，**它纹丝不动**（2026-09-12 打断实测）。
 *
 * 这一卷是全库条件最密的内容文件之一（38 处 `requires`），而几乎全在
 * **选项**上，不在分流上。那是「选项一个也不多给」那条纪律的落点：
 * 娘不在了就没有「陪娘说话」这一项，不识字就没有「翻两页书」这一项。
 *
 * ## 判法：摆一排局，看每条选项在哪些局下露面
 *
 * 逐条手摆是摆不完的（38 条，每条的条件各不相同）。所以反过来——
 * **摆一排差别很大的局**，数每条带条件的选项在几个局下可见：
 *
 *     全都可见     这条件形同虚设，谁都看得见（恒真那一族）
 *     全都不可见   这一项在我摆的局里一次也没露面（恒假那一族的嫌疑）
 *     有见有不见   ✓ 它在区分人
 *
 * 判红的是**整卷**：一卷里一条「有见有不见」的都没有，
 * 说明这一卷的条件层整个是死的。
 *
 * ⚠️ 「全都不可见」只报数不判红——**我摆的局摆不全**，
 * 一个要「守孝期间」「刚从外地回来」的选项本来就不该在这几个局里露面。
 * 零次要紧，但要紧的是**让人看见**，不是让门禁替我断定它坏了
 * （`anomaly-may-be-known-and-intended` 那条）。
 */
{
  /** 摆一排差别尽量大的局。每个局只动一两处，别处照默认 */
  const stages: Array<{ name: string; put: () => void }> = [
    { name: '农家八岁', put: () => stage(8) },
    { name: '农家十七', put: () => stage(17) },
    { name: '农家二十五', put: () => stage(25) },
    { name: '农家六十五', put: () => stage(65) },
    {
      name: '识字的',
      put: () => {
        stage(25)
        // `at` 是必填：「他什么时候知道的」是这一格的一半，不能省
        useCharacterStore().learn({
          id: 'literacy',
          title: '识字',
          summary: '你认得字。',
          contact: '亲历',
          category: '世事',
          at: useWorldStore().time,
        })
      },
    },
    {
      /*
       * ⚠️ 王府那个局要**掷到真的生在王府为止**，`beOf('manor')` 摆不出来。
       *
       * 两版都试过，两版都错：
       *
       *     liveAs('manor')   只换了 living，家里一个人也没变
       *     beOf('manor')     只摆户籍五格——**人口册里立的是默认那一套人**
       *                       （实测：father、mother、东西邻，一个乳母也没有）
       *
       * `beOf` 自己的文档头一句就写着「它只摆那五格」。拿它摆王府局，
       * 得到的是**户籍写着王府、家里人却是农家那一套**的杂交局，
       * 而「整日跟着乳母」要的 `family: { id: 'nurse', alive: true }`
       * 是 `birth.ts` 在**出生流程**里给王府/宫里的孩子立的真人。
       *
       * 所以走真出生流程，掷到出身是王府为止。掷不出来要说话——
       * 不说的话这个局会安静地退化成又一个农家局，而报表上看不出来。
       */
      name: '王府里的',
      put: () => {
        for (let n = 0; n < 400; n += 1) {
          setActivePinia(createPinia())
          useCharacterStore()
          useHouseholdStore()
          usePeopleStore()
          useNarrativeStore()
          const story = useStory(lifeScenes, {
            events: lifeEvents,
            routine: lifeRoutine,
            finale: lifeFinale,
          })
          story.begin()
          if (useHouseholdStore().origin !== 'manor') continue
          useWorldStore().advanceTime({ years: 8 })
          return
        }
        console.log('  ✗ 摆局：400 次也没掷出生在王府的一世——「王府里的」那个局是空的。')
        bad += 1
      },
    },
    {
      name: '上过学的',
      put: () => {
        stage(13)
        useWorldStore().setFlag('schooled', true)
      },
    },
    {
      name: '成了家的',
      put: () => {
        stage(25)
        const people = usePeopleStore()
        const world = useWorldStore()
        people.enroll({
          id: 'wife',
          surname: '柳',
          given: '巧云',
          gender: '女',
          bornYear: world.time.year - 22,
          bornMonth: 8,
          temper: '温和',
          health: 74,
          place: world.place,
          fate: '在',
          history: [],
        })
        people.bind('me', 'wife', '配偶')
      },
    },
    {
      name: '爹娘都不在了',
      put: () => {
        stage(40)
        const people = usePeopleStore()
        for (const id of Object.keys(people.roster)) {
          if (people.personOf(id)?.fate === '在') people.die(id, '病')
        }
      },
    },
  ]

  for (const { scene, label } of ageCases) {
    const s = lifeScenes[scene]
    /** 这一卷里所有带条件的选项 */
    const gated = Object.values(s?.nodes ?? {})
      .flatMap((node) => node.choices ?? [])
      .filter((one) => (one.requires?.length ?? 0) > 0)

    if (gated.length === 0) {
      console.log(`  ·  ${label}：这一卷没有带条件的选项，条件层无从验起。`)
      continue
    }

    // 每条选项在几个局下可见
    const seen = new Map<string, number>()
    for (const { put } of stages) {
      put()
      for (const one of gated) {
        if (meetsAll(one.requires)) seen.set(one.id, (seen.get(one.id) ?? 0) + 1)
      }
    }

    const always = gated.filter((one) => (seen.get(one.id) ?? 0) === stages.length)
    const never = gated.filter((one) => (seen.get(one.id) ?? 0) === 0)
    const discriminating = gated.length - always.length - never.length

    if (discriminating === 0) {
      console.log(
        `  ✗ ${label} 条件层：${gated.length} 条带条件的选项，` +
          `没有一条在这 ${stages.length} 个局之间区分出人来` +
          `（恒可见 ${always.length}、一次没露面 ${never.length}）。`,
      )
      bad += 1
    } else {
      console.log(
        `  ✓ ${label} 条件层：${gated.length} 条带条件的选项，${discriminating} 条在区分人` +
          `（恒可见 ${always.length}、一次没露面 ${never.length}）。`,
      )
    }
    // 一次没露面的逐条印出来——零次要紧，而要紧的是让人看见
    for (const one of never) console.log(`      ·  「${one.label}」在这 ${stages.length} 个局里一次也没露面`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  日常例行六卷，各年龄段各自有人走过了，那些选项也各自挑着人。\n')
}
