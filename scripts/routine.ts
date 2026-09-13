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
    {
      /*
       * ⚠️ 这两个局是 2026-09-12 补的，补的是**判据的局覆盖不全**。
       *
       * 老年卷那两条选项要「有活着的子」和「身子骨 ≥45」，
       * 而原来那七个局里没有一个有孩子、没有一个特意摆过身子骨
       * ——于是整卷「一条都不区分人」，判据判红。
       *
       * **而它先前一直绿**：流位置恰好让某个局掷出了够硬的身子骨。
       * 一改 `beOf` 里那行的顺序就红了——**判据的局覆盖不全时，
       * 它的绿取决于随机流**，那不是绿，是碰上了。
       *
       * 所以补局，不是放宽判据：放宽等于把这一卷的条件层弄瞎。
       */
      name: '有儿女的',
      put: () => {
        stage(65)
        const people = usePeopleStore()
        const world = useWorldStore()
        people.enroll({
          id: 'son',
          surname: '江',
          given: '小',
          gender: '男',
          bornYear: world.time.year - 30,
          bornMonth: 4,
          temper: '木讷',
          health: 72,
          place: world.place,
          fate: '在',
          history: [],
        })
        people.amend('son', { place: world.place, fate: '在' })
        people.bind('me', 'son', '子')
      },
    },
    {
      name: '身子骨还硬朗的',
      put: () => {
        stage(65)
        // 那两条门槛里最高的是 45，加满够得着（`adjustAttribute` 自己 clamp）
        useCharacterStore().adjustAttribute('body', 100)
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
    for (const one of never)
      console.log(`      ·  「${one.label}」在这 ${stages.length} 个局里一次也没露面`)
  }
}

/**
 * 效果层：**同一个孩子，一天怎么过决定他长成什么样**。
 *
 * 上面那两条验的是「走得进去」和「选项在区分人」——
 * **把 `applyEffects` 整个改成空转，它们纹丝不动**（2026-09-12 B 刀实测）。
 * 那两条问的是「他看得见哪几条路」，这一条问的是「走完之后他身上多了什么」。
 *
 * `routine:child` 四条各长不同的东西：
 *
 *     follow-mother  见识 +2          跟着娘，看她怎么应付人
 *     run            体魄 +3、运气 +1  跑出去疯一天
 *     nurse          见识 +1、心志 +1  跟着乳母（只有王府那一档有）
 *     alone          心志 +3、见识 +1  一个人待着
 *
 * ## 这一卷的分量在「日常也在塑人」
 *
 * 它不是过场：跑出去的孩子身子骨好，一个人待着的孩子心里沉。
 * **一天一天累起来，人就长成了不一样的人**——
 * 而这几点属性是那件事唯一的落点。
 *
 * 判「三条各长不同的」不判「run 正好 +3」。
 *
 * ## ⚠️ 「跟着娘」要娘还活着，而这一段跑在条件层那十个局之后
 *
 * 写第一版时这一条红着：见识 +0，而且跟 `run` 长出一模一样的东西。
 * 探针单独跑同一颗种子却是 +2——**差别是随机流的位置**。
 * 条件层那一段掷掉几十个局之后，`beOf` 摆出的这一世里娘已经殁了，
 * 于是「整日跟着娘」不在选项里，`pick` 静默落空点了 `run`，
 * 报出来的话是「跟着娘该长见识，实际 0」——**读着像内容坏了**。
 *
 * 所以两件事一起做：**把娘按活**，再**让落空出声**。
 * 光按活不够——下一个往这一卷加条件的人会再撞一次，
 * 而那时候没人记得这段注释。
 */
{
  interface Grew {
    insight: number
    will: number
    body: number
  }

  const missed: string[] = []

  function grewBy(pick: string): Grew {
    /*
     * ⚠️ **掷到娘在册为止**——`amend` 造不出人。
     *
     * `beOf('farm')` 有概率掷出一个**没有娘**的世界，而
     * `people.amend` 对不在册的人是**静默返回**（`people.ts:642`
     * `if (!person) return`）。于是那一局里：
     *
     * ```
     * 娘不在册 → follow-mother 的 requires 不成立 → 那一条根本不在选项里
     *          → pick 落空 → 判据报「摆局没摆出 follow-mother」
     * ```
     *
     * 2026-09-13 插探针印出来的真相（同一次运行的三次调用）：
     *
     * ```
     * pick=follow-mother   娘在册=false   ← 头一次就掷到了没娘的世界
     * pick=run             娘在册=true
     * pick=alone           娘在册=true
     * ```
     *
     * 判据报的话没错（那一条确实没摆出来），**而它读着像内容坏了**
     * ——实际是这一局根本没有娘。这是「摆局不干净」那一族里的
     * 「beOf 不立人」：`amend` 只改得了已有的人。
     */
    let tries = 0
    do {
      stage(8)
      // 「整日跟着娘」要 `family: { id: 'mother', alive: true }`——按死这一格
      usePeopleStore().amend('mother', { fate: '在' })
      tries += 1
    } while (usePeopleStore().personOf('mother') === undefined && tries < 60)

    if (usePeopleStore().personOf('mother') === undefined) {
      // 掷六十次都没有娘：那不是内容的账，是这一支的摆局立不起来
      console.log('  ✗ 摆局立不起来：掷了 60 局，一局也没有娘——底下那几问问不出东西。')
      missed.push(`${pick}（摆局无娘）`)
    }

    const character = useCharacterStore()
    const before = { ...character.attributes }
    /*
     * ⚠️ 落空要整趟看，不能逐节点看：`pick` 在每一节都被问一次，
     * 而下游那些节点本来就没有我要的那条。问的是
     * 「整趟走下来，我要的那条一次也没点到吗」。
     */
    let hit = false
    play('routine:child', (opts) => {
      if (opts.includes(pick)) {
        hit = true
        return pick
      }
      return opts[0]!
    })
    // 落空不许安静过去：一次也没点到时，判据报的是另一条路的账
    if (!hit) missed.push(pick)
    return {
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
      body: character.attributes.body - before.body,
    }
  }

  const follow = grewBy('follow-mother')
  const run = grewBy('run')
  const alone = grewBy('alone')

  const wrong: string[] = []
  for (const one of missed) wrong.push(`摆局没摆出「${one}」这一条——底下那几句问的是别条路的账`)
  if (follow.insight <= 0) wrong.push(`跟着娘该长见识，实际 ${follow.insight}`)
  if (run.body <= 0) wrong.push(`跑出去疯一天该长身子骨，实际 ${run.body}`)
  if (alone.will <= 0) wrong.push(`一个人待着该长心志，实际 ${alone.will}`)
  if (run.body === follow.body && run.insight === follow.insight) {
    wrong.push('跟着娘和跑出去长的是同样的东西——那一节几条路没有分别')
  }
  if (alone.will === follow.will && alone.insight === follow.insight) {
    wrong.push('一个人待着和跟着娘长的是同样的东西')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ child 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ child 效果层：跟着娘 +${follow.insight} 见识、跑出去 +${run.body} 身子骨、` +
        `一个人待着 +${alone.will} 心志——一天一天累起来，长成不一样的人。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  日常例行六卷，各年龄段各自有人走过了，那些选项也各自挑着人、各自长着人。\n')
}
