/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 去投奔——那四档是不是真的都走得到。
 *
 * 这一支量的是 `content/life/refuge.ts` 那一册：
 *
 * > **一个走投无路的人去找师傅，而师傅自己也有一种处境。**
 *
 * 四档：gone（扑空）、lean（他也在难处）、taken（收留）、never-went（算了）。
 *
 * ## 为什么要摆局跑
 *
 * 入场要求苛刻（拜过师、家底 ≤22），随机跑命中率极低，
 * 三档分叉还各自依赖 craft-master 的生死、身子骨、年纪——
 * 三样都是只在摆局时才能精确控制的东西。
 *
 * 所以照 `match.ts` / `bearing.ts` 那一套：**摆好局，演到底，
 * 用真的 `meetsAll` 判、真的 `applyEffects` 结**。
 *
 * ## 三档守的两件事
 *
 * 一、**走得到**。任何一档断了，这一卷就有一段内容从没被任何读者看见。
 *
 * 二、**只走一档**。三档互斥：同一个局走进了 gone 就不该再走 lean，
 *     只验能走到还不够——还要验有没有多走一条。
 *
 * 跑法：bun scripts/refuge.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { usePeopleStore } from '../src/stores/people'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'refuge:master'

/**
 * 摆一局：木工出身、家底已经跌破门槛。
 *
 * `standing` 固定 18——在「家底 ≤22」门槛之内，
 * 但不要太低（避免与其他测局条件冲突）。
 *
 * craft-master 的生死、年纪、身子骨由调用方各自设定。
 */
function stage(standing = 18): void {
  setActivePinia(createPinia())
  beOf('craft')
  const household = useHouseholdStore()
  household.standing = standing
  useWorldStore().advanceTime({ years: 35 })
}

/**
 * 立 craft-master，并绑关系。
 *
 * `health` 决定走 lean 还是 taken：
 *   health ≤ 60 → lean（身子垮了）
 *   health > 60 && age < 60 → taken（收留）
 *
 * `fate` 决定走不走 gone：
 *   fate === '殁' → gone（扑空）
 */
function enrollMaster(opts: { health: number; age: number; fate?: '在' | '殁' }): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  const bornYear = world.time.year - opts.age
  people.enroll({
    id: 'craft-master',
    surname: '刘',
    given: '有财',
    gender: '男',
    bornYear,
    bornMonth: 3,
    temper: '木讷',
    health: opts.health,
    place: world.place,
    fate: opts.fate ?? '在',
    history: [],
  })
  people.bind('me', 'craft-master', '师傅')
}

/**
 * 从 open 节点把这一卷演到底，回报走过的节点 id。
 */
function play(pick: (options: string[]) => string, stopAfter = 15): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = scene.entry

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = scene.nodes[at]
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

console.log('\n=== 去投奔——四档分叉都走得到吗 ===\n')

let bad = 0

/**
 * 一、gone：扑空。师傅殁了，铺子换了招牌。
 *
 * 入场那一刻 craft-master 已经殁——`arrive` 的第一条 branch 命中，走 gone。
 */
{
  stage()
  enrollMaster({ health: 70, age: 50, fate: '殁' })
  const walked = play(() => 'go')

  if (!walked.includes('gone')) {
    console.log(`  ✗ gone：师傅殁了却没走到「扑空」那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else if (walked.includes('lean') || walked.includes('taken')) {
    console.log('  ✗ gone：走进了扑空，但同时也走进了另一档——三档本该互斥。')
    bad += 1
  } else {
    console.log('  ✓ gone（扑空）：走到了，而且没有同时走进其他档。')
  }
}

/**
 * 二、lean：他也在难处。身子垮了（health ≤ 60）接不了细活。
 *
 * 师傅活着但 health = 40——`arrive` 里第二条 branch 命中，走 lean。
 */
{
  stage()
  enrollMaster({ health: 40, age: 45 })
  const walked = play(() => 'go')

  if (!walked.includes('lean')) {
    console.log(`  ✗ lean：师傅身子垮了却没走到「难处」那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else if (walked.includes('gone') || walked.includes('taken')) {
    console.log('  ✗ lean：走进了难处，但同时也走进了另一档——三档本该互斥。')
    bad += 1
  } else {
    console.log('  ✓ lean（他也在难处）：走到了，而且没有同时走进其他档。')
  }
}

/**
 * 三、lean（年纪档）：年岁到了（age ≥ 60）接不了细活。
 *
 * 这条跟 health 档指向同一节，但判据不同——两条都要守。
 */
{
  stage()
  enrollMaster({ health: 80, age: 65 })
  const walked = play(() => 'go')

  if (!walked.includes('lean')) {
    console.log(`  ✗ lean（年纪）：师傅 65 岁却没走到「难处」那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ lean（年纪档）：65 岁的师傅走到了难处。')
  }
}

/**
 * 四、taken：收留。师傅活着、身子还行、年纪不太大。
 *
 * health = 80，age = 45——三条 branch 都不命中，走 taken（兜底 next）。
 */
{
  stage()
  enrollMaster({ health: 80, age: 45 })
  const walked = play(() => 'go')

  if (!walked.includes('taken')) {
    console.log(`  ✗ taken：师傅身体好却没走到「收留」那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else if (walked.includes('gone') || walked.includes('lean')) {
    console.log('  ✗ taken：走进了收留，但同时也走进了另一档——三档本该互斥。')
    bad += 1
  } else {
    console.log('  ✓ taken（收留）：走到了，而且没有同时走进其他档。')
  }
}

/**
 * 五、never-went：算了。选择不去。
 *
 * 这一档守的是「拉不下脸这件事是真实的，而且是一条正经的路」——
 * 不是「跳过这个事件」，它有自己的一节正文，year 要往前走。
 */
{
  stage()
  enrollMaster({ health: 80, age: 45 })
  const world = useWorldStore()
  // 记录月份总数而非年份，因为 onEnter 走的是 months: 3，不足一年
  const monthsBefore = world.time.year * 12 + world.time.month
  const walked = play(() => 'not')
  const monthsAfter = world.time.year * 12 + world.time.month

  if (!walked.includes('never-went')) {
    console.log(`  ✗ never-went：选了「算了」却没走到那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else if (monthsAfter <= monthsBefore) {
    console.log('  ✗ never-went：走到了，但时间没有往前走——它有自己的 onEnter，不是空节点。')
    bad += 1
  } else {
    console.log(`  ✓ never-went（算了）：走到了，时间过了 ${monthsAfter - monthsBefore} 个月。`)
  }
}

/**
 * 六、尺子自检：这一卷真的走了不止一节。
 *
 * 场景 id 打错、卷没注册，会让 play() 安静地走零步，全部绿也是假的。
 */
{
  stage()
  enrollMaster({ health: 80, age: 45 })
  const walked = play(() => 'go')
  if (walked.length < 3) {
    console.log(`  ✗ 尺子自检：一路走了 ${walked.length} 节，这一卷没有真被演过（${walked.join(' → ')}）。`)
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
  console.log('  走投无路才上那条街，而那条街上的人有自己的处境。\n')
}
