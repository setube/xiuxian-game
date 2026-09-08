/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 落第不是失败分支。
 *
 * ## 这一支要拦的是一件写起来很自然的事
 *
 * 「读书 → 中举 → 做官」是一条太顺手的阶梯，而它是**最不像那个时代的一件事**。
 * 明代生员定额有限，一个县三年取十几二十个，应试的以百计——
 * **绝大多数人考不中，而且一辈子在考。**
 *
 * 这一册要立的是：没中跟中了是同一层的两个结局。
 * 可**「落第不是失败分支」写成内容容易，写成能被门禁抓住的东西难**
 * （这句是 xiuxian-game-a8 说的，它在 `repetition.ts` 上用过这个手法）。
 *
 * 问「有没有写落第的内容」永远绿。所以这一支问的是**引擎自己数得出来的量**：
 * 每一路的正文行数、每一路真正被走到的次数。
 *
 * ## 为什么厚度这条要反着定门槛
 *
 * 别的地方量厚度是「不许差太多」，这一支不一样：
 * **落第那一路必须不比中了那一路薄**——八成的人落在那儿，
 * 它是这一册的正文，不是它的阴影。
 *
 * 跑法：bun scripts/exam.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { examScenes } from '../src/content/life/exam'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

import { beOf } from './origin'

console.log('\n=== 落第不是失败分支 ===\n')

let bad = 0

/** 一节有几句正文 */
function lines(scene: string, node: string): number {
  return (examScenes[scene]?.nodes[node]?.blocks ?? []).length
}

/**
 * 一、落第那一路不比中了那一路薄。
 *
 * **反着定门槛**：别处量厚度是「不许差太多」，这一支要求落第 ≥ 中了。
 * 八成的人落在没中那一路，它是这一册的正文。
 */
{
  const pairs: { win: [string, string]; lose: [string, string]; what: string }[] = [
    { win: ['exam:first', 'passed'], lose: ['exam:first', 'failed'], what: '头一回' },
    { win: ['exam:again', 'xiucai'], lose: ['exam:again', 'again-failed'], what: '往上考' },
  ]

  const thin: string[] = []
  console.log('  中了 / 没中，各有几句正文：')
  for (const one of pairs) {
    const win = lines(...one.win)
    const lose = lines(...one.lose)
    console.log(`      ${one.what.padEnd(6)} 中了 ${win} 句　没中 ${lose} 句`)
    if (lose < win) thin.push(`${one.what}（中了 ${win} 句，没中才 ${lose} 句）`)
  }

  if (thin.length > 0) {
    console.log(`\n  ✗ ${thin.length} 处落第写得比中了薄：${thin.join('、')}`)
    console.log('    八成的人落在没中那一路——它是这一册的正文，不是它的阴影。')
    bad += 1
  } else {
    console.log('\n  ✓ 两处落第都不比中了薄。')
  }
}

/**
 * 二、三条路都真的走得到，而且没中的占多数。
 *
 * 摆局跑：识字、先生还在，一路答应下来，看落在哪儿。
 * **这一条不光要「都走得到」，还要「比例对得上」**——
 * 头一回两成中、往上考一成中，是这一册的立场，不是配平参数。
 */
const RUNS = 500
{
  const ends = new Map<string, number>()

  for (let i = 0; i < RUNS; i += 1) {
    setActivePinia(createPinia())
    beOf('farm')
    const world = useWorldStore()
    const character = useCharacterStore()
    useHouseholdStore()
    usePeopleStore()
    world.bornYear = world.time.year - 16
    void character.age

    const scene = examScenes['exam:first']!
    let at = scene.entry
    const guard = new Set<string>()
    while (at && !guard.has(at)) {
      guard.add(at)
      const node = scene.nodes[at]
      if (!node) break
      if (node.onEnter) applyEffects(node.onEnter)

      // 一路答应：有 choices 就走头一条（「你说好」）
      const choice = node.choices?.[0]
      if (choice) {
        if (choice.effects) applyEffects(choice.effects)
        at = choice.next ?? ''
        continue
      }
      const branch = node.branches?.find((one) =>
        (one.requires ?? []).every((c) =>
          c.flag === undefined ? true : world.getFlag(c.flag.key) === c.flag.equals,
        ),
      )
      const next = branch?.next ?? node.next
      if (!next) break
      at = next
    }
    ends.set(at, (ends.get(at) ?? 0) + 1)
  }

  console.log(`\n  ${RUNS} 次头一场考试落在哪儿：`)
  for (const [end, n] of [...ends].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${end.padEnd(8)} ${n.toString().padStart(3)}　${((n / RUNS) * 100).toFixed(1)}%`)
  }

  const passed = ends.get('passed') ?? 0
  const failed = ends.get('failed') ?? 0

  if (passed === 0 || failed === 0) {
    console.log(`\n  ✗ 有一路走不到（中了 ${passed} 次，没中 ${failed} 次）。`)
    bad += 1
  } else if (passed >= failed) {
    console.log(`\n  ✗ 中的比没中的多（${passed} : ${failed}）——这就成了「读书→做官」的阶梯。`)
    console.log('    明代一个县三年取十几二十个童生，而应试的以百计。')
    bad += 1
  } else {
    console.log(`\n  ✓ 没中的是多数（${failed} : ${passed}，中了 ${((passed / RUNS) * 100).toFixed(1)}%）。`)
  }
}

/**
 * 三、身份那一格有下家。
 *
 * **学徒那一格的教训**：`youth.ts` 落 `identity: '学徒'` 而全库没有一处改掉它，
 * 一个人六十岁咽气那天面板上还写着「学徒」（xiuxian-game-79 查出来的）。
 *
 * 这一册落两次 `identity`（童生、生员），**而它们各自都有下家**：
 * 童生往上考中了就换成生员。至于生员——**它本来就该跟着人一辈子**，
 * 中了秀才这件事不会失效，所以它不需要下家。
 *
 * 这一条判的是：**凡是落了 `identity` 的节点，要么有下家，要么写明为什么不需要。**
 */
{
  const src = examScenes
  const setters: string[] = []
  for (const [sceneId, scene] of Object.entries(src)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      if ((node.onEnter ?? []).some((e) => e.type === 'identity')) {
        setters.push(`${sceneId}#${nodeId}`)
      }
    }
  }

  // 童生要有下家：往上考那一卷的 `xiucai` 会把它换掉
  const tongsheng = setters.some((one) => one.endsWith('#passed'))
  const xiucai = setters.some((one) => one.endsWith('#xiucai'))

  if (setters.length === 0) {
    console.log('\n  ✗ 尺子自己坏了：这一册一处 `identity` 也没找到。')
    bad += 1
  } else if (!tongsheng || !xiucai) {
    console.log(`\n  ✗ 身份那两格没都落下（找到 ${setters.join('、')}）。`)
    bad += 1
  } else {
    console.log(`\n  ✓ 身份落了 ${setters.length} 处，童生有下家（生员），生员跟人一辈子。`)
  }
}

/**
 * 四、这一册挂进了库，而且事件前提对得上。
 *
 * 头一卷必须问 `knowledge: 'literacy'`——**不识字的人不会被先生劝去考**。
 * 少了这一问，一个从没念过书的农家子会收到「开春县里考童生」。
 */
{
  const missing = ['exam:first', 'exam:again', 'exam:done'].filter(
    (id) => lifeScenes[id] === undefined,
  )
  const events = lifeEvents.filter((e) => e.id.startsWith('exam-'))
  const first = events.find((e) => e.id === 'exam-first')
  const guarded = (first?.requires ?? []).some((c) => c.knowledge === 'literacy')

  if (missing.length > 0) {
    console.log(`\n  ✗ ${missing.length} 卷没挂进库：${missing.join('、')}`)
    bad += 1
  } else if (events.length !== 3) {
    console.log(`\n  ✗ 这一册该有三件事，库里找到 ${events.length} 件。`)
    bad += 1
  } else if (!guarded) {
    console.log('\n  ✗ 头一卷没问「念过书没有」——不识字的人也会被先生劝去考。')
    bad += 1
  } else {
    console.log('\n  ✓ 三卷都挂进了库，头一卷问了「念过书没有」。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  念了十年书，多半什么也不是——而那不是失败，是那个时代的常态。\n')
}
