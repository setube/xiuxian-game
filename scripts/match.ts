/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一门亲事，中间那段时间在不在。
 *
 * 这一支量的是 `content/life/match.ts` 那一册——「过程中状态」的第一个真实使用者。
 * 它要证明的不是「婚姻做完了」，是一件更基础的事：
 *
 * > **一门亲事从有人提起到成或不成，中间那段时间真的存在过。**
 *
 * ## 为什么不能靠随机跑
 *
 * 议亲是散事件，掷不到就是没人来提；而它还压着三条 `requires`
 * （没成过家、没有正在议的、家境过得去）。三百世随机跑下来，
 * 走到「成亲」那一步的可能只有个位数，**而个位数量不出分布**。
 *
 * 所以照 `apart.ts` / `kindred.ts` 那一套：**摆好局，一节一节演下去**。
 * 出生、推到二十岁、把那一卷从头走到底，条件用真的 `meetsAll` 判、
 * 效果用真的 `applyEffects` 结。
 *
 * ## 这一支替 apart 量那两处
 *
 * `apart.ts` 有一张「会改变谁在你身边」的清单，`match:offer#wife` 和
 * `#husband` 在里头（成亲要领人进门）。可那一支是摆局跑的，走不到这一卷。
 * 它那张表的规矩写得很清楚：
 *
 * > **移交不是豁免。** 在一张覆盖率表上，「没人量过」和「另有人量过」
 * > 长得一模一样。
 *
 * 所以那两处移交到这里，而这里真的走。
 *
 * 跑法：bun scripts/match.ts
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
import type { Choice, Gender, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'match:offer'
const BETROTHAL = 'betrothal'

/**
 * 摆一局：一个农家出身、二十岁、家境过得去的人。
 *
 * 二十岁是这一卷 `window` 里最常见的年纪；农户是全库权重最高的出身。
 * 摆局不是为了挑一个好走的世界，是为了**每次都摆同一个**——
 * 判据要量的是那一卷本身，不是掷骰。
 *
 * `withElders` 决定走哪一条：这一卷在头一节按「爹娘在不在」分岔，
 * **两条都得量**。头一版忘了立爹娘，于是三条判据全从 `alone` 那条走，
 * 「长辈打听、你想先见一面」那一整条一次也没演过——
 * 而第四条自检印出来的 `open → alone → …` 正是它露的馅。
 */
function stage(gender: Gender, withElders: boolean): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  household.gender = gender
  household.standing = 50
  useWorldStore().advanceTime({ years: 20 })
  void character.age

  if (withElders) {
    const world = useWorldStore()
    const year = world.time.year
    people.enroll({
      id: 'father',
      surname: '江',
      given: '大',
      gender: '男',
      bornYear: year - 48,
      bornMonth: 3,
      temper: '木讷',
      health: 70,
      // `isPresent` 比的是 `person.place === world.place`（`engine/presence.ts`），
      // 所以这里必须取世界当下那个值，不能写字面量「{home}」——
      // 写字面量的话人立起来了却不在场，这一卷会安安静静地走「没有长辈」那条路
      place: world.place,
      fate: '在',
      history: [],
    })
    people.bind('me', 'father', '生父')
  }
}

/**
 * 从某一节起把这一卷演下去，回报走过的节点 id。`pick` 决定岔路口选哪一条。
 *
 * `stopAfter` 是给「中途取样」用的：要问「议亲开始之后、了局之前那段时间在不在」，
 * 就不能一路演到底再问——那时候它已经封口了。
 */
function play(from: string, pick: (options: string[]) => string, stopAfter = 20): string[] {
  const scene = lifeScenes[SCENE]
  if (!scene) return []
  const walked: string[] = []
  let at: string | undefined = from

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

console.log('\n=== 一门亲事，中间那段时间在不在 ===\n')

let bad = 0

/**
 * 一、议亲这件事真的开始了，而且没有当场结束。
 *
 * 这一条是这一册存在的全部理由：从前成家是一步跳过去的
 * （选一下 → 一年过去 → 屋里多个人），现在中间有一段时间，
 * 而那段时间里 `undertakings` 上挂着一条没封口的记录。
 */
{
  stage('男', true)
  const character = useCharacterStore()
  /*
   * 只走头一节，不往下演。
   *
   * 头一版这里 `play('open', …)` 一路走到底，而底下 `settled` 那一节
   * 会把议亲封口——于是判据取样时它已经完了，红得莫名其妙。
   * **要问「中间那段时间在不在」，就得在中间取样**，不能等演完再问。
   */
  play('open', () => 'ask', 1)
  const ongoing = character.undertakings.filter((one) => one.until === null)
  const betrothal = ongoing.find((one) => one.id === BETROTHAL)

  if (betrothal === undefined) {
    console.log('  ✗ 走进这一卷之后，议亲那件事没有开始——中间那段时间不存在。')
    bad += 1
  } else {
    console.log(`  ✓ 议亲从第 ${betrothal.since} 年起开着，往下几节里它一直没了局。`)
  }
}

/**
 * 二、成了的那一路：人进门，而议亲那件事封了口。
 *
 * 两件事都要验。只验前者的话，`undertake done` 那一笔漏写也不会红——
 * **而漏写的后果是这个人一辈子「正在议亲」，媒人再也不上门**
 * （`match-offer` 的 requires 里写着 `not: betrothal`）。
 */
{
  for (const gender of ['男', '女'] as const) {
    stage(gender, false)
    const character = useCharacterStore()
    const people = usePeopleStore()
    const walked = play('open', () => 'agree')

    const spouse = people.kinOf('配偶')
    const stillOpen = character.undertakings.some(
      (one) => one.id === BETROTHAL && one.until === null,
    )
    const wed = walked.includes(gender === '男' ? 'wife' : 'husband')

    if (!wed) {
      console.log(`  ✗ ${gender}：一路答应下来却没走到成亲那一节（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else if (spouse.length === 0) {
      console.log(`  ✗ ${gender}：拜了堂，可关系网上没有配偶那条边。`)
      bad += 1
    } else if (stillOpen) {
      console.log(`  ✗ ${gender}：人都进门了，议亲那件事还开着——媒人此后不会再上门。`)
      bad += 1
    } else {
      console.log(`  ✓ ${gender}：人进了门，议亲那件事也封了口。`)
    }
  }
}

/**
 * 三、没成的那一路：也封口，也留痕。
 *
 * 「没成」跟「成了」是同一层的两个结局，不是失败分支。
 * 封口是为了让媒人日后还能上门；留痕是因为**这个人一生里
 * 真的有过这么一门亲事**——日后再提亲时两家都记得上一回。
 */
{
  stage('男', true)
  const character = useCharacterStore()
  const people = usePeopleStore()
  const walked = play('open', () => 'refuse')

  const record = character.undertakings.find((one) => one.id === BETROTHAL)
  const refused = walked.includes('refused')

  if (!refused) {
    console.log(`  ✗ 一路拒下来却没走到退亲那一节（走过 ${walked.join(' → ')}）。`)
    bad += 1
  } else if (record === undefined) {
    console.log('  ✗ 退了亲，而 undertakings 上一条记录也没留——这门亲事等于没发生过。')
    bad += 1
  } else if (record.until === null) {
    console.log('  ✗ 退了亲，议亲那件事却还开着。')
    bad += 1
  } else if (people.kinOf('配偶').length > 0) {
    console.log('  ✗ 退了亲，却多出一个配偶。')
    bad += 1
  } else {
    console.log(`  ✓ 没成：那一条从第 ${record.since} 年记到第 ${record.until} 年，封了口，留着。`)
  }
}

/**
 * 四、尺子自检：中间那段时间是真的量到了，不是摆出来的。
 *
 * 前三条都绿时，这一支说的是「这一册工作正常」。可它有两种成因：
 * 判据管用，或者**`play()` 根本没走进任何一节**（scene id 打错、
 * 节点改名、库里没挂上，都会让它安安静静地走零步）。
 *
 * 所以这一条问一句最笨的：那三次到底走了几节。
 */
{
  stage('男', true)
  const walked = play('open', () => 'agree')
  if (walked.length < 4) {
    console.log(`  ✗ 尺子自检：一路答应只走了 ${walked.length} 节，这一卷没有真被演过。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：一路答应走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  说亲要说几个月，成不成都是这一生里真发生过的事。\n')
}
