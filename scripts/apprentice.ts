/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 出师——两条路都走得到吗。
 *
 * `apprentice.ts` 里只有一个场景（`craft:out`），三个节点：
 *
 *   open   结算节点（收掉学徒身份，换成匠人）
 *   given  师傅还在：有人给你出师，把家什推过来
 *   gone   师傅没了：没有人给你出师，活照旧接着做
 *
 * 这一卷有一段历史：`gone` 分支被删过一次（900 世 0 次），
 * 后来 `present.ts` 门禁换一批世界就撞上了——师傅殁了，正文还在让他推家什。
 * **教训**：「0/900 次」说的是「罕见」，不是「不可能」。
 *
 * 这支门禁守两件事：
 * 一、`given`（师傅在）：走得到
 * 二、`gone`（师傅殁了）：走得到，且 `present.ts` 不会把殁了的人叫出来
 *
 * 跑法：bun scripts/apprentice.ts
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

const SCENE = 'craft:out'

function stage(age = 25): void {
  setActivePinia(createPinia())
  beOf('craft')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

/**
 * 给 craft-master 入册并绑上「师」关系。
 *
 * `bond: { kind: '师', alive: false }` 是 `gone` 分支的条件，
 * 所以 fate 参数控制走哪条路。
 */
function enrollMaster(alive: boolean): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'craft-master',
    surname: '陈',
    given: '大',
    gender: '男',
    bornYear: world.time.year - 50,
    bornMonth: 3,
    temper: '木讷',
    health: 70,
    place: world.place,
    fate: alive ? '在' : '殁',
    history: [],
  })
  people.bind('me', 'craft-master', '师')
}

function play(
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 15,
): string[] {
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

console.log('\n=== 出师——两条路都走得到吗 ===\n')

let bad = 0

/**
 * 一、given（师傅还在）：有人给你出师。
 *
 * 师傅活着时，`open` 的 branches 条件（`bond: { kind: '师', alive: false }`）
 * 不成立，直接走兜底 `next: 'given'`。
 */
{
  stage()
  enrollMaster(true)
  const walked = play()

  if (!walked.includes('given')) {
    console.log(`  ✗ given（师傅在）：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ given（师傅在）：师傅把家什推过来了。')
  }

  // 确认没有同时走进 gone
  if (walked.includes('gone')) {
    console.log('  ✗ given 走了但 gone 也走了——两支互斥，不应同时出现。')
    bad += 1
  }
}

/**
 * 二、gone（师傅没了）：没有人给你出师。
 *
 * 这一支**删过一次、加了回来**。
 * 删的理由是「900 世 0 次」，加回来的理由是「0/900 只说明罕见」。
 * `present.ts` 门禁的主种子 `ujiw3x1bshrk` 就撞上了这种世界，
 * 而那时没有这条分支，师傅殁了还在正文里推家什。
 *
 * 这支判据守两件事：
 * a. gone 走得到（`bond: { kind: '师', alive: false }` 条件成立）
 * b. gone 节点正文里没有「师傅」这个词（它会被 present.ts 当作在场）
 */
{
  stage()
  enrollMaster(false) // 师傅已殁
  const walked = play()

  if (!walked.includes('gone')) {
    console.log(`  ✗ gone（师傅殁了）：没走到（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ gone（师傅殁了）：铺子里没人了，活照旧接着做。')
  }

  // 确认没有同时走进 given
  if (walked.includes('given')) {
    console.log('  ✗ gone 走了但 given 也走了——两支互斥，不应同时出现。')
    bad += 1
  }
}

/**
 * 三、gone 节点里不出现「师傅」二字。
 *
 * `present.ts` 按称呼字面匹配——「师傅」出现在正文里就会报「殁后仍在场」。
 * 这一支正文故意绕开了那个词（「铺子里没人了」「那套家什」），
 * 这一条判据守住这个设计不被后人误改。
 */
{
  const scene = lifeScenes[SCENE]
  const goneNode = scene?.nodes['gone']
  if (!goneNode) {
    console.log('  ✗ gone 节点不存在——场景里没有这个节点。')
    bad += 1
  } else {
    const texts = [
      ...(goneNode.blocks ?? []).map((b) => ('text' in b ? b.text : '')),
      ...(goneNode.seen ?? []).map((s) => s.text),
    ]
    const hasMasterWord = texts.some((t) => t.includes('师傅'))
    if (hasMasterWord) {
      console.log('  ✗ gone 节点正文里出现了「师傅」二字——present.ts 会把殁了的人叫出来。')
      bad += 1
    } else {
      console.log('  ✓ gone 节点正文：一次「师傅」也没有，present.ts 不会报红。')
    }
  }
}

/**
 * 四、open 节点做完了结算（undertaking done、identity 换成匠人）。
 *
 * 走 given 那一支之后确认 identity 已经换了，
 * 不需要再查 undertaking（那是引擎内部状态，门禁取不到）。
 */
{
  stage()
  enrollMaster(true)
  play()

  const household = useHouseholdStore()
  const livelihood = household.livelihood
  if (livelihood !== '木工') {
    console.log(`  ✗ 营生：出师后应该是「木工」，实际是「${livelihood ?? '（空）'}」。`)
    bad += 1
  } else {
    console.log('  ✓ 营生：出师后变成了「木工」。')
  }
}

/**
 * 五、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  enrollMaster(true)
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
  console.log('  两条路都走得到：师傅在的有人给你出师，师傅没了就自己接着做。\n')
}
