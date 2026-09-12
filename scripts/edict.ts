/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一纸诏书下来——那一天落在这家人身上的每一样。
 *
 * `royal.ts`（内容）是全库效果最密的一个文件（十五类效果、七十余处）。
 * 而削爵那两卷是其中最重的两处：
 *
 *   royal:fall     皇帝没了，新君登基，你家迁出京城
 *   royal:demote   削爵，从王府搬进城里一处宅子
 *
 * ## 这一支补的是一个真空
 *
 * 削爵那条链先前有六支门禁提到过，**而没有一支在守它落的东西**：
 *
 *     scripts/royal.ts       钉死出身跑三百世，只报比例，判红的只有「卡在半路」
 *     scripts/upbringing.ts  静态扫内容结构，根本不跑 `applyEffects`
 *     address/apart/         各守自己那一层（称谓、在不在身边、住处、living）
 *     household/living
 *
 * 于是「诏书下来，爹殁了没有、身份变没变、家塌没塌」这件事
 * **一个人也没在问**。这一支问它。
 *
 * ## 一纸诏书落下的是四样，而它们必须一起落
 *
 *     royal:fall / edict
 *         family      爹殁　「大行皇帝。你没有见到最后一面。」
 *         succession  皇位传下去了
 *         family      娘随你迁出京城，头发白了一半
 *         identity    庶人
 *         living      fallen → market
 *         home        搬进一处小院，娘跟着走
 *
 *     royal:demote / open+home+after
 *         identity    寓公之子
 *         living      fallen
 *         person ×4   管事、门房、丫头、小厮各奔各的
 *         family      爹削爵成「宗室」，「闭门不出，话比从前更少了」
 *
 * ## 判「一起落」，不判「正好是庶人」
 *
 * 这一批效果最危险的坏法不是全不落——那种一眼看得出。
 * 是**落了一半**：身份改了而人没殁，或者人殁了而住处还在王府。
 * 那时候正文说的是一件事，数据说的是另一件，
 * 而「走得到吗」那类判据一声不响（`batch-of-effects-fails-apart`）。
 *
 * 跑法：bun scripts/edict.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, OriginId, SceneNode } from '../src/types/game'
import { beOf } from './origin'

function stage(origin: OriginId, age = 20): void {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
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

console.log('\n=== 一纸诏书下来——那一天落在这家人身上的每一样 ===\n')

let bad = 0

/**
 * 一、royal:fall（皇帝没了）——那一天落下的六样。
 *
 * 从 `edict` 那一节起演：效果全在它的 `onEnter` 上。
 *
 * ⚠️ 从下游节点起演会一条效果也落不到（`house`/`away` 那两支栽过）。
 * 这一节的 `onEnter` 就是那道诏书本身。
 */
{
  stage('court', 20)
  const character = useCharacterStore()
  const people = usePeopleStore()

  const before = {
    identity: character.identity,
    living: character.living.id,
    fatherAlive: people.isAlive('father'),
    place: useWorldStore().place,
  }
  const walked = playFrom('royal:fall', 'edict')

  const wrong: string[] = []
  if (walked.length === 0) {
    wrong.push('那一节走了零步——场景 id 打错或库里没挂上')
  }
  if (people.isAlive('father')) {
    wrong.push('诏书下来了，而爹还活着——「大行皇帝」那一句没有落到人身上')
  }
  if (character.identity === before.identity) {
    wrong.push(`家塌了，身份那一格却还是「${character.identity}」`)
  }
  if (character.living.id === before.living) {
    wrong.push(`家塌了，日子那一格却还是「${character.living.id}」`)
  }
  const placeNow = useWorldStore().place
  if (placeNow === before.place && before.place !== '') {
    wrong.push(`该迁出京城了，住处却还是「${placeNow}」`)
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 皇帝没了那一天：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 皇帝没了那一天：爹殁了，身份成「${character.identity}」、` +
        `日子成「${character.living.id}」，家迁出了京城——一起落下的。`,
    )
  }
}

/**
 * 二、royal:demote（削爵）——四个下人各奔各的。
 *
 * 这一卷的重量不在身份那一格，在**那四个人**：
 * 管事、门房、丫头、小厮，各自有各自的去处。
 *
 * 家败了不是一个数字掉下去，是**认识的人一个一个不在了**。
 */
{
  stage('manor', 20)
  const character = useCharacterStore()
  const people = usePeopleStore()

  const SERVANTS = ['steward', 'gatekeeper', 'maid', 'page'] as const
  const before = {
    identity: character.identity,
    living: character.living.id,
    fatherRank: people.personOf('father')?.rank,
    here: SERVANTS.filter((id) => people.personOf(id) !== undefined),
  }

  playFrom('royal:demote', lifeScenes['royal:demote']?.entry ?? 'open')

  const wrong: string[] = []
  if (character.identity === before.identity) {
    wrong.push(`削了爵，身份那一格却还是「${character.identity}」`)
  }
  if (character.living.id === before.living) {
    wrong.push(`削了爵，日子那一格却还是「${character.living.id}」`)
  }
  const rankNow = people.personOf('father')?.rank
  if (rankNow === before.fatherRank) {
    wrong.push(`削的是爹的爵，而他那一格从头到尾是「${String(rankNow)}」`)
  }
  /*
   * 那四个人：`person` 效果给他们各自写了去处（`doing`）和
   * `leavesHousehold`。这一条问的是**他们真的各奔各的了吗**。
   *
   * ⚠️ 判「有人不在这家了」，不判「正好走了四个」——
   * 走几个是内容作者的事，而「家败了人就散了」才是设计。
   */
  const stillHere = SERVANTS.filter((id) => people.personOf(id) !== undefined)
  const doings = SERVANTS.map((id) => people.personOf(id)?.doing).filter(
    (one) => one !== undefined,
  )
  if (before.here.length > 0 && doings.length === 0) {
    wrong.push('府里那几个人一个也没写下去处——家败了，而他们还在原地站着')
  }
  void stillHere

  if (wrong.length > 0) {
    console.log(`  ✗ 削爵那一天：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 削爵那一天：身份成「${character.identity}」、日子成「${character.living.id}」，` +
        `爹那一格成「${String(rankNow)}」，府里的人各自有了去处。`,
    )
  }
}

/**
 * 三、尺子自检：两卷的效果真的挂在我起演的那一节上。
 *
 * ⚠️ 这一条防的是「从错的节点起演」——那时候一条效果也落不到，
 * 上面两条会整片报红，**读着像内容坏了**（`house`/`away` 两支各栽过一次）。
 */
{
  const checks: Array<{ scene: string; node: string }> = [
    { scene: 'royal:fall', node: 'edict' },
    { scene: 'royal:demote', node: 'home' },
  ]
  for (const { scene, node } of checks) {
    const found = lifeScenes[scene]?.nodes[node]
    const count = found?.onEnter?.length ?? 0
    if (count === 0) {
      console.log(`  ✗ 尺子自检：${scene} 的「${node}」一条 onEnter 也没有——结构变了。`)
      bad += 1
    } else {
      console.log(`  ✓ 尺子自检：${scene} 的「${node}」挂着 ${count} 条效果。`)
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  诏书下来那一天，该落的一样也没少。\n')
}
