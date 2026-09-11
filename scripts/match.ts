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
function stage(gender: Gender, withElders: boolean, standing = 50): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  household.gender = gender
  household.standing = standing
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
      /*
       * 男女在这一节分岔，而分岔的不只是称呼。
       *
       * **男的是娶进来，女的是嫁出去**——从前这两条走的是同一套簿记，
       * 于是女玩家成亲之后世界里唯一变的是屋里多了个丈夫：
       * 她还在娘家户里，户主还是她爹。
       *
       * 所以这里男女问的是**相反**的两件事：
       *   男　你还是这一户的人（`home` 里有你）
       *   女　你已经不是了（`home` 里没有你，夫家那一户里有你）
       *
       * 只问一头会漏：一个「谁成亲都不动户口」的实现能过男方那一半，
       * 一个「谁成亲都迁走」的实现能过女方那一半。
       */
      const home = people.houses['home']
      const inHome = home?.members.includes('me') ?? false
      const inLaw = Object.values(people.houses).find(
        (h) => h.id !== 'home' && h.members.includes('me'),
      )

      if (gender === '男' && !inHome) {
        console.log(`  ✗ 男：娶了亲反倒从自己家里迁出去了（现在归 ${inLaw?.id ?? '无'}）。`)
        bad += 1
      } else if (gender === '女' && inHome) {
        console.log('  ✗ 女：嫁过去了，人还在娘家户里——户主还是她爹。')
        console.log('    从前这一节只多一个丈夫，别的什么也没变。')
        bad += 1
      } else if (gender === '女' && inLaw === undefined) {
        console.log('  ✗ 女：从娘家出去了，可是没进任何一户——她成了没有户的人。')
        bad += 1
      } else if (gender === '女' && inLaw?.head === 'me') {
        console.log('  ✗ 女：嫁进去当了家。出嫁是进一户已经在那儿的人家，那一户的当家不是你。')
        bad += 1
      } else {
        const where =
          gender === '男' ? '还是这一户的人' : `归了 ${inLaw?.id}，当家的是 ${inLaw?.head}`
        console.log(`  ✓ ${gender}：人进了门，议亲那件事也封了口；${where}。`)
      }
    }
  }
}

/**
 * 二点五、入赘那一路：户口反着走，处境不一样。
 *
 * 这一条守两件事：
 *
 * 一、**它真的走得到**。`branches` 是从上往下第一条成立的算数，
 *     入赘那条要是排在娶妻后面，它一次也走不到——而**走不到的内容
 *     跟没写一模一样，并且没有任何机器会说**。
 *
 * 二、**穷才走得到**。摆两个局：家境 20 的走进去，家境 50 的走不进去。
 *     只验一头会漏——一个「谁都入赘」的实现能过前一半，
 *     一个「谁都不入赘」的实现能过后一半。
 */
{
  /*
   * 摆局要立个哥——入赘那条问的是「有哥的次子分不到什么」。
   *
   * **头一版没立**，于是「穷的走得到」那一半永远不成立，
   * 判据报的是「一路答应下来也没走到那一节」，
   * 看上去像内容写错了，其实是局摆得不对。
   */
  stage('男', false, 20)
  {
    const people = usePeopleStore()
    const world = useWorldStore()
    people.enroll({
      id: 'brother',
      surname: '江',
      given: '二',
      gender: '男',
      bornYear: world.time.year - 26,
      bornMonth: 5,
      temper: '木讷',
      health: 72,
      place: world.place,
      fate: '在',
      history: [],
    })
    people.bind('me', 'brother', '兄')
  }
  const poor = play('open', () => 'agree')
  const people = usePeopleStore()
  const inLaw = Object.values(people.houses).find(
    (h) => h.id !== 'home' && h.members.includes('me'),
  )
  const poorWent = poor.includes('uxorial')

  // 不穷的那一头：同样立个哥，只有家境不同——**只有一个变量在动**
  stage('男', false, 50)
  {
    const people = usePeopleStore()
    const world = useWorldStore()
    people.enroll({
      id: 'brother',
      surname: '江',
      given: '二',
      gender: '男',
      bornYear: world.time.year - 26,
      bornMonth: 5,
      temper: '木讷',
      health: 72,
      place: world.place,
      fate: '在',
      history: [],
    })
    people.bind('me', 'brother', '兄')
  }
  const rich = play('open', () => 'agree')
  const richWent = rich.includes('uxorial')

  if (!poorWent) {
    console.log(`  ✗ 入赘：家境 20 的男子一路答应下来也没走到那一节（走过 ${poor.join(' → ')}）。`)
    bad += 1
  } else if (richWent) {
    console.log('  ✗ 入赘：家境 50 的也入赘了——有田有兄弟的男丁不会去做赘婿。')
    bad += 1
  } else if (inLaw === undefined || inLaw.head === 'me') {
    console.log('  ✗ 入赘：进了妻家，当家的却是自己——赘婿不当家，那正是这件事的分量所在。')
    bad += 1
  } else {
    console.log(`  ✓ 入赘：穷的走得到、不穷的走不到；归了 ${inLaw.id}，当家的是 ${inLaw.head}。`)
  }
}

/**
 * 二点六、配偶身份分档：有产户走 wife-rich，贫户走 wife-poor，中间兜底走 wife。
 *
 * 这条守两件事：
 *
 * 一、**两端各自走得到**。摆两个局：有产户（standing 80）和贫户（standing 20），
 *     分别验终点节点。
 *
 * 二、**中间兜底不会被吃掉**。standing 50 的局仍走 wife，不走两端任意一条。
 *
 * 为什么要量中间这一头：只验两端，一个「standing≥71 走 wife-rich」的实现能过
 * 前一半，一个「所有人都走 wife-rich」的实现也能过——中间那档全部被吃了也不红。
 */
{
  // 有产户——standing 80，走 wife-rich
  stage('男', false, 80)
  const richWalked = play('open', () => 'agree')
  const richNode = richWalked.includes('wife-rich')

  // 贫户——standing 28，高于入赘阈值（≤26）和 their-verdict 阈值（≤22），仍属贫户档（≤30）
  // ⚠️ 不能低于 27：≤26 会命中入赘条件（即便没有哥也可能因状态泄漏触发）
  stage('男', false, 28)
  const poorWalked = play('open', () => 'agree')
  const poorNode = poorWalked.includes('wife-poor')

  // 中间档——standing 50，走普通 wife
  stage('男', false, 50)
  const midWalked = play('open', () => 'agree')
  const midNode = midWalked.includes('wife') && !midWalked.includes('wife-rich') && !midWalked.includes('wife-poor')

  if (!richNode) {
    console.log(`  ✗ 配偶分档：有产户（standing 80）没走到 wife-rich（走过 ${richWalked.join(' → ')}）。`)
    bad += 1
  } else if (!poorNode) {
    console.log(`  ✗ 配偶分档：贫户（standing 20）没走到 wife-poor（走过 ${poorWalked.join(' → ')}）。`)
    bad += 1
  } else if (!midNode) {
    console.log(`  ✗ 配偶分档：中间档（standing 50）没落到普通 wife（走过 ${midWalked.join(' → ')}）。`)
    bad += 1
  } else {
    console.log('  ✓ 配偶分档：有产走 wife-rich，贫户走 wife-poor，中间兜底走 wife。')
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
