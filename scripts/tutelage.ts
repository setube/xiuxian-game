/* eslint-disable no-console -- 这是一支命令行门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 他为什么愿意教你。
 *
 * ## 这一支要证的那句话
 *
 *     「能不能修仙」和「有没有人愿意教你」是两件事，
 *     而玩家分不出自己是哪一种。
 *
 * 上一支（`scripts/meeting.ts`）验的是两个人互相打量了一回。
 * 这一支验的是那之后：他拿量到的那个数**决定拿你怎么办**。
 *
 * ## 四种人生必须同时成立
 *
 *     资质很好 · 修士没看出来 　　　　　　　　　→ 不教
 *     资质普通 · 修士判断很准 · 觉得你适合某事 → 教一点
 *     资质很好 · 修士看出来了 · 可他有自己的事 → 仍旧不教
 *     资质普通 · 修士看错了 · 收下了 　　　　　→ 后来才发现不合适
 *
 * 少一种，这一章就塌回「资质决定一切」——只是把开关从 `root >= 72`
 * 换成了 `regard >= 72`，绕一圈回到原地。
 *
 * ## 八道判据
 *
 *     一　四象限　　　四种人生真的都跑得出来，不是理论可能
 *     二　两件事　　　资质高低跟「有没有人教」无关。**这一道最容易写成空判据**
 *     三　一次一格　　哪怕第一眼就量到满分，头一回也只到「搭话」
 *     四　硬顶　　　　卡住秦守拙的是他自己的事，不是你不够好
 *     五　几层　　　　听过 ≠ 记住 ≠ 明白 ≠ 身上有反应，每一层都有人停在那儿
 *     六　补不了　　　碰着那个地方那一关，练一回和练五十回一模一样
 *     七　看不见　　　「明白」那一关的成败，玩家读到的是同一段话
 *     八　什么也没多　走到最后属性一格没动，也没有谁变成谁的师父
 *
 * ## 这一支不验「走岔」
 *
 * 教法对不对得上、走没走岔，是下一章的事，单验在 `scripts/mastery.ts`。
 * 这一支只把它钉住不让它进来搅局——见 `fresh()` 里那一行。
 *
 * ## 判据本身也会说谎，所以每一道都带对照组
 *
 * 「资质跟有没有人教无关」这句话，在一个 `footing` 恒等于「不理会」的
 * 死实现下同样成立——**判据会绿，而机制是死的**。
 * 所以第二道旁边站着「肯不肯守着大有关系」，第六道旁边站着
 * 「背书那一关练得多真的能过」。守「X 不影响结果」，
 * 必须真的把 X 变一遍，而且要有一个「X 应该影响结果」的对照组在旁边。
 *
 * 跑法：bun scripts/tutelage.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import {
  THE_ONE_AT_THE_HERB_SHED,
  THE_ONE_AT_THE_TEMPLE,
  THE_ONE_ON_THE_PATH,
  type Cultivator,
} from '../src/content/cultivators'
import { GRASPS, QUIET_BREATH, type Grasp, type Hold } from '../src/content/rites'
import { footingWith, graspOf, holdOf, practise, teach, weighUp } from '../src/engine/tutelage'
import { useCharacterStore } from '../src/stores/character'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import { FOOTINGS, type Attributes, type Footing } from '../src/types/game'

import { beOf } from './origin'

/** 每一节各跑多少世。三百是让底下那些比例站得住的最小体面数目 */
const RUNS = 300

/** 剧本里那一章给到几回叩门的机会——「教一点」那一格是可反复的，所以给得起 */
const KNOCKS = 12

// ────────────────────────────────────────────────────────────
// 四份数据。这一支全部的区分力都在这四行上
// ────────────────────────────────────────────────────────────

/**
 * 万里挑一的胚子，可他一刻也坐不住。
 *
 * root 91 而 will 26——**这份数据是第一、第三象限的全部凭据**。
 * 换成一份处处优秀的数据，「他没看出来」和「他看出来了也不教」
 * 就都退化成「他教了」，四象限当场塌成一象限。
 */
const GIFTED_RESTLESS: Attributes = {
  memory: 62,
  insight: 55,
  body: 44,
  will: 26,
  fortune: 50,
  root: 91,
  spirit: 78,
}

/**
 * 资质平平，可他坐得住。
 *
 * root 41 / spirit 38 —— `finding`（碰得着）那一关要 55，`by` 是 root 六成神魂四成，
 * 合起来 39.8。**他这辈子碰不着那个地方，而这跟他有多用功一点关系也没有。**
 *
 * 而 will 94 / body 86 让药庐那位量到八十几：他看得很准，
 * 这孩子确实沉得住气。他只是把「沉得住」连到了「学得会」上。
 *
 * ## 这两个数调过一次，而调它的理由值得记下来
 *
 * 起先写的是 will 88 / body 76，算下来「他该教」——可实测只有 45.7% 教了。
 * 差在 `blur()` 里那一句**往中间拉**：耐性那把尺子量到真值 84.4，
 * 可他准头 88 也还是把它拉到 81.9；身子骨那把准头只有 71，
 * 真值 77.2 拉完剩 72.5。合起来 77.2，而「教一点」要 82。
 *
 * 也就是说：**照真值算他早该教了，照他实际看到的数算，他多半不教。**
 * 那正是这一整套东西想说的话，只是当时说到了不该说的地方——
 * 一份「他应该会教」的样本，一半的世里没被教，
 * 后面五道判据全跟着塌。样本要立得住，得按他看到的数来配，不是按真值。
 */
const PLAIN_STEADY: Attributes = {
  memory: 58,
  insight: 61,
  body: 86,
  will: 94,
  fortune: 50,
  root: 41,
  spirit: 38,
}

/**
 * 根骨好，悟性也好，而且坐得住——观里那位一眼就看穿的那种孩子。
 *
 * 这一份是第三象限的凭据，也是这一支里最锋利的一处对照：
 * **同一个孩子，观里那位看得清清楚楚却只肯带一段，药庐那位一路教到底。**
 *
 * 跟 `GIFTED_RESTLESS` 分成两份，是因为它们证的不是同一件事：
 * 那一份证「他没看出来」（root 91 摆在跟前，姜不换连提都提不出来），
 * 这一份证「他看出来了也不教」——**得先看得出来，才谈得上不教**。
 * 混成一份的话，「不教」到底是没看见还是不肯，判据分不出来。
 */
const GIFTED_SEEN: Attributes = {
  memory: 70,
  insight: 86,
  body: 86,
  will: 94,
  fortune: 50,
  root: 90,
  spirit: 74,
}

/**
 * 又坐得住，根骨也够。第二象限里真的学成了的那一种。
 *
 * 有它才知道「碰不着」不是所有人的结局——**没有这一份对照，
 * 「碰得着」那一关就可能是一道谁也过不去的死门，而判据分不出来。**
 */
const PLAIN_STEADY_ROOTED: Attributes = { ...PLAIN_STEADY, root: 72, spirit: 66 }

/** 记性极差的孩子。脑子里那条轴上「停在听过」那一格要用它 */
const FORGETFUL: Attributes = { ...PLAIN_STEADY, memory: 12, insight: 20 }

/**
 * 记性差，但差得没那么绝的孩子。
 *
 * `FORGETFUL` 记性 12，加满六回的 `helps` 也才 42，够不着 44——
 * **他练一回和练四十回落在同一层**，于是拿他做「笨办法磨得过去」的
 * 对照组，那一行永远绿不了。
 *
 * 这一份记性 26：练一回 31 还差着，练够六回 56 就过了背书那一关，
 * 然后卡在悟性那一关（20.6 + 18 = 38.6，要 46）。
 * 一份数据同时说明两件事——**次数在这一关有用，在下一关不够用**。
 */
const SLOW: Attributes = { ...PLAIN_STEADY, memory: 26, insight: 20 }

/**
 * 开一世。
 *
 * **先 `useCharacterStore()` 再动别的**：创建那一刻等于出生，
 * 它把 `bornYear` 钉在当时的 `time.year` 上。顺序反了，人就凭空老了几岁。
 *
 * ## 那一行出身是有意钉死的
 *
 * 出身本来是随机掷的，而它此刻决定 `handsKnow()`——也就决定这个人
 * 会不会被陶仲的教法送岔。不钉死的话，同一份属性跑两回可以落在两条路上，
 * 底下每一道判据都要跟着抖。
 *
 * 钉成药铺那一行是钉在**不走岔**那一侧：这一支验的是上一章那八件事，
 * 走岔进来只会把它们搅浑。走岔单验在 `scripts/mastery.ts`，
 * 那一支反过来把出身当成主要的区分力用。
 *
 * `beOf('herb')` 摆的是那一整行五格，而 `handsKnow()` 只读其中的**产**
 * （柜台上那副药）。摆整行不是多余：少摆一格的话，
 * 这个人会是个「开药铺但户籍是宗室」的怪物，而怪物走查出来的结论不算数。
 */
function fresh(attributes: Attributes): void {
  setActivePinia(createPinia())
  useCharacterStore().attributes = { ...attributes }
  beOf('herb')
}

/**
 * 一趟一趟地去，去到他肯为止。
 *
 * 剧本里就是这么走的：前三格去一回挪一格，「教一点」那一格
 * 可以反复叩门（`tutor-words` 是 `repeatable`）。这里照着走一遍，
 * 返回最后站在哪一格。
 */
function knockUntil(cultivatorId: string, times: number = KNOCKS): Footing {
  for (let i = 0; i < times; i += 1) weighUp(cultivatorId)
  return footingWith(cultivatorId)
}

/**
 * 走到底之后他站在哪儿。
 *
 * 两条轴各报各的，**不许合成一个数**——脑子里到了哪一层和身上到了哪一步
 * 之间没有换算关系，合起来就等于又把它们当成一条阶梯了。
 */
interface Ending {
  grasp: Grasp | null
  hold: Hold
}

/** 走到底：叩门到他肯教，教了，再自己练到练不动为止 */
function goAllTheWay(attributes: Attributes, times: number = KNOCKS): Ending {
  fresh(attributes)
  knockUntil(THE_ONE_AT_THE_HERB_SHED.id, times)
  teach(THE_ONE_AT_THE_HERB_SHED.id, QUIET_BREATH.id)
  // 认知那条轴最多两关，多练几回是给 helps 那两关留出磨的余地
  for (let i = 0; i < 20; i += 1) practise(QUIET_BREATH.id)
  return { grasp: graspOf(QUIET_BREATH.id), hold: holdOf(QUIET_BREATH.id) }
}

/**
 * 临时改一格，跑完还回去，把跑出来的结果带出来。
 *
 * 尺子自检要的就是这个：**把机制存心改坏，判据必须当场红。**
 * 不还回去的话，后面那几道验的就不是真正的内容了。
 *
 * 结果由这个函数往外送，而不是让调用处先声明一个变量再在回调里赋值——
 * 那样写 TypeScript 会把那个变量窄化成初值的字面量类型，
 * 后面拿它去比对就成了「这两个类型没有重叠」的死比较。
 */
function borrow<T, K extends keyof T, R>(target: T, key: K, value: T[K], run: () => R): R {
  const kept = target[key]
  target[key] = value
  try {
    return run()
  } finally {
    target[key] = kept
  }
}

let failed = 0
const judge = (ok: boolean, line: string): void => {
  console.log(`  ${ok ? '√' : '✗'}　${line}`)
  if (!ok) failed += 1
}

const pct = (n: number, of: number = RUNS): string => `${((n / of) * 100).toFixed(1)}%`

/** 这一份数据跑 RUNS 世，有多少世走到了「教一点」 */
function taughtRate(cultivator: Cultivator, attributes: Attributes): number {
  let taught = 0
  for (let i = 0; i < RUNS; i += 1) {
    fresh(attributes)
    if (knockUntil(cultivator.id) === '教一点') taught += 1
  }
  return taught
}

/**
 * 他头一眼量到的那个数，跑 RUNS 世取个均值。
 *
 * 比「教不教」灵敏得多，而且没有天花板。单次的抖动大约六分，
 * 三百次的均值标准误只剩 0.4 分左右——**一样东西只要沾上一点权重，
 * 就会在这个数上露出来**，哪怕它还不足以改变教不教的结论。
 */
function meanRegard(cultivator: Cultivator, attributes: Attributes): number {
  let sum = 0
  for (let i = 0; i < RUNS; i += 1) {
    fresh(attributes)
    sum += weighUp(cultivator.id)?.regard ?? 0
  }
  return sum / RUNS
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 尺子自检（存心改坏的必须红）===\n')

/**
 * 第一把：`ceiling` 真的是那道硬顶吗。
 *
 * 「秦守拙不教」这件事，在一个 `regard` 恒等于零的坏实现下同样成立。
 * 所以把他的顶临时抬到「教一点」——**同一个孩子必须当场就被教**。
 * 抬了还不教，说明卡住他的根本不是那道顶，第四道就白写了。
 *
 * 用 `GIFTED_SEEN` 不用 `GIFTED_RESTLESS`：后者在他那把尺子上只量到 69.4，
 * 抬了顶也还差着「教一点」要的 86 分——**那样这一把量的就成了「够不够分」，
 * 而不是「顶在不在」**，尺子自己先失了准头。
 */
{
  const before = taughtRate(THE_ONE_AT_THE_TEMPLE, GIFTED_SEEN)
  // 顶抬起来了，可 steps 里没有那两格台词——挪得动就够了，这里不看正文
  const after = borrow(THE_ONE_AT_THE_TEMPLE.stance, 'ceiling', '教一点' as Footing, () =>
    taughtRate(THE_ONE_AT_THE_TEMPLE, GIFTED_SEEN),
  )
  console.log(`  观里那位　原样 ${before}/${RUNS} 教　把顶抬到「教一点」之后 ${after}/${RUNS} 教`)
  judge(before === 0, '原样：他一世也没教（这是第四道要的结论）')
  judge(after > RUNS * 0.5, '抬了顶就教了——卡住他的确实是那道顶，不是分数')
}

/**
 * 第二把：`helps: 0` 真的是「练多少回都一样」吗。
 *
 * 「碰不着那个地方」，在一个门槛高到谁也过不去的实现下同样成立。
 * 所以把 `finding.helps` 临时改成 9——**同一个孩子必须练几回就碰着**。
 * 改了还碰不着，说明挡住他的是门槛不是 `helps`，第六道就白写了。
 */
{
  const before = goAllTheWay(PLAIN_STEADY)
  const after = borrow(QUIET_BREATH.finding, 'helps', 9, () => goAllTheWay(PLAIN_STEADY).hold)
  console.log(
    `  资质平平那个　原样身上停在「${before.hold}」　把 helps 改成 9 之后停在「${after}」`,
  )
  judge(before.hold === '照着做', '原样：他照着做了一辈子，身上什么也没有')
  judge(after === '摸着了', 'helps 一给就碰着了——挡住他的确实是那个 0')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 一　四种人生同时成立 ===\n')

{
  console.log('  一　资质很好，他没看出来\n')
  const restlessOnPath = taughtRate(THE_ONE_ON_THE_PATH, GIFTED_RESTLESS)
  let sawRoot = 0
  for (let i = 0; i < RUNS; i += 1) {
    fresh(GIFTED_RESTLESS)
    const character = useCharacterStore()
    weighUp(THE_ONE_ON_THE_PATH.id)
    if (character.aspects.root.claims.length > 0) sawRoot += 1
  }
  console.log(`    山道上那个（炼气，看不见资质）：${restlessOnPath}/${RUNS} 教`)
  console.log(`    这 ${RUNS} 世里他提过一次资质的：${sawRoot} 次`)
  judge(restlessOnPath === 0, 'root 91 的孩子站在他跟前，他一世也没教')
  judge(sawRoot === 0, '他连一句资质的话也说不出来——他没有那双眼睛')

  console.log('\n  二　资质普通，他判断很准，他教了一点\n')
  const steady = taughtRate(THE_ONE_AT_THE_HERB_SHED, PLAIN_STEADY)
  console.log(`    药庐那位（量的是肯不肯守着）：${steady}/${RUNS} 教　${pct(steady)}`)
  judge(steady > RUNS * 0.5, `root 41 的孩子，多数世里他真的教了`)

  console.log('\n  三　资质很好，他看出来了，他仍旧不教\n')
  let regardSum = 0
  let cappedTimes = 0
  for (let i = 0; i < RUNS; i += 1) {
    fresh(GIFTED_SEEN)
    const weighing = weighUp(THE_ONE_AT_THE_TEMPLE.id)
    regardSum += weighing?.regard ?? 0
    if (weighing?.capped) cappedTimes += 1
  }
  const templeTaught = taughtRate(THE_ONE_AT_THE_TEMPLE, GIFTED_SEEN)
  /**
   * 同一个孩子，换一个人。
   *
   * 这一行是整节最锋利的一处：**药庐那位一路教到底，观里那位一世也不教**。
   * 少了它，「他不教」还可以解释成这孩子本身有什么问题；
   * 有了它，那句解释就没地方站了——问题不在孩子身上。
   */
  const shedTaught = taughtRate(THE_ONE_AT_THE_HERB_SHED, GIFTED_SEEN)
  console.log(`    观里那位（筑基，看得见资质）：量到 ${(regardSum / RUNS).toFixed(1)} 分`)
  console.log(`    这个分让他肯到顶：${cappedTimes}/${RUNS}　可他教的是 ${templeTaught}/${RUNS}`)
  console.log(`    同一个孩子走到药庐那头：${shedTaught}/${RUNS} 教　${pct(shedTaught)}`)
  judge(regardSum / RUNS > THE_ONE_AT_THE_TEMPLE.opensAt, '他量到的分远在门槛之上——他确实看出来了')
  judge(cappedTimes > RUNS * 0.5, '多数世里他肯到自己的顶为止')
  judge(templeTaught === 0, '而他一世也没有教——那道顶是他自己的事，跟这孩子无关')
  judge(shedTaught > RUNS * 0.5, '同一个孩子，药庐那位教了——不教的理由不在孩子身上（对照组）')

  console.log('\n  四　资质普通，他看错了，收下了，后来才发现不合适\n')
  const stuck = goAllTheWay(PLAIN_STEADY)
  const made = goAllTheWay(PLAIN_STEADY_ROOTED)
  console.log(`    他教的那个（root 41）：想到「${stuck.grasp}」，身上停在「${stuck.hold}」`)
  console.log(`    换一个根骨够的（root 72）：想到「${made.grasp}」，身上停在「${made.hold}」`)
  judge(
    stuck.grasp === '明白' && stuck.hold === '照着做',
    '他收下的那个孩子，背下来了、也自以为懂了，做得一点不差，就是身上什么也没有',
  )
  judge(made.hold === '摸着了', '根骨够的碰得着（对照组：那一关不是谁也过不去的死门）')
  console.log('\n    他挑人挑得对——那孩子确实沉得住气。')
  console.log('    他错在把「沉得住」连到了「学得会」上，而这两件事量的不是同一样东西。')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 二　「能不能修仙」和「有没有人愿意教你」是两件事 ===\n')
console.log('  两组人，root 一组钉 12 一组钉 94，其余六项完全相同。')
console.log('  药庐那位教不教，必须**无差**——他压根没量那一样东西。\n')

{
  const withRoot = (root: number): Attributes => ({ ...PLAIN_STEADY, root })
  const withWill = (will: number): Attributes => ({ ...PLAIN_STEADY, will })

  const rootLow = taughtRate(THE_ONE_AT_THE_HERB_SHED, withRoot(12))
  const rootHigh = taughtRate(THE_ONE_AT_THE_HERB_SHED, withRoot(94))
  const willLow = taughtRate(THE_ONE_AT_THE_HERB_SHED, withWill(24))
  const willHigh = taughtRate(THE_ONE_AT_THE_HERB_SHED, withWill(94))

  console.log(`  root=12　教 ${rootLow}/${RUNS}　${pct(rootLow)}`)
  console.log(`  root=94　教 ${rootHigh}/${RUNS}　${pct(rootHigh)}`)
  console.log(`  相差 ${pct(Math.abs(rootHigh - rootLow))}\n`)
  console.log(`  will=24　教 ${willLow}/${RUNS}　${pct(willLow)}`)
  console.log(`  will=94　教 ${willHigh}/${RUNS}　${pct(willHigh)}`)
  console.log(`  相差 ${pct(Math.abs(willHigh - willLow))}\n`)

  judge(Math.abs(rootHigh - rootLow) < RUNS * 0.05, '资质高低不影响他教不教（差在噪声里）')
  /**
   * 这一行才是上一行有没有意义的凭据。
   *
   * 一个 `footing` 恒等于「不理会」的死实现能让上一行绿——**这一行会当场红**。
   */
  judge(willHigh - willLow > RUNS * 0.5, '肯不肯守着大有关系（对照组：判据不是空的）')

  /**
   * 再拿一把更细的尺子量同一件事。
   *
   * 「教不教」是玩家读得到的那个结论，可它顶在天花板上：
   * 十二回叩门里只要够着一回就算教了，于是**资质哪怕真漏进那把尺子一点点，
   * 两边也照样都是 300**——上面那一行看不出来。
   *
   * `regard` 没有天花板。单次抖动六分上下，三百次的均值标准误只剩 0.4 分，
   * 资质只要沾上一分权重就藏不住。
   */
  const regardRootLow = meanRegard(THE_ONE_AT_THE_HERB_SHED, withRoot(12))
  const regardRootHigh = meanRegard(THE_ONE_AT_THE_HERB_SHED, withRoot(94))
  const regardWillLow = meanRegard(THE_ONE_AT_THE_HERB_SHED, withWill(24))
  const regardWillHigh = meanRegard(THE_ONE_AT_THE_HERB_SHED, withWill(94))
  console.log(
    `  他心里量到的分：root=12 是 ${regardRootLow.toFixed(1)}，` +
      `root=94 是 ${regardRootHigh.toFixed(1)}，差 ${Math.abs(regardRootHigh - regardRootLow).toFixed(1)}`,
  )
  console.log(
    `  　　　　　　　　will=24 是 ${regardWillLow.toFixed(1)}，` +
      `will=94 是 ${regardWillHigh.toFixed(1)}，差 ${Math.abs(regardWillHigh - regardWillLow).toFixed(1)}\n`,
  )
  judge(
    Math.abs(regardRootHigh - regardRootLow) < 1.5,
    '连他心里那个数都不动——资质没有偷偷漏进那把尺子',
  )
  judge(regardWillHigh - regardWillLow > 10, '而心志一动那个数就跟着动（对照组：这把尺子是活的）')

  /**
   * 反过来也得成立：换一个真的量资质的人，root 必须显著有别。
   *
   * 不然「资质无关」这句话可能只是因为**这一整套里没有任何人看得见资质**，
   * 那就不是「两件事分开了」，是「资质这一样东西根本没接上线」。
   */
  const opened = (attributes: Attributes): number => {
    let n = 0
    for (let i = 0; i < RUNS; i += 1) {
      fresh(attributes)
      if ((weighUp(THE_ONE_AT_THE_TEMPLE.id)?.to ?? '不理会') !== '不理会') n += 1
    }
    return n
  }
  const templeLow = opened(withRoot(12))
  const templeHigh = opened(withRoot(94))
  console.log(`  同一份数据换观里那位（他看得见资质）：root=12 搭上话 ${templeLow}/${RUNS}，`)
  console.log(`  root=94 搭上话 ${templeHigh}/${RUNS}\n`)
  judge(templeHigh - templeLow > RUNS * 0.5, '资质在别人眼里是有分量的（对照组：它没有断线）')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 三　一次只挪一格 ===\n')
console.log('  一个药庐那位一眼就量到八十几的孩子。头一回也只到「搭话」。\n')

{
  fresh({ ...PLAIN_STEADY, will: 99, body: 99 })
  const walk: string[] = []
  let jumped = 0
  let willingHigh = 0
  let previous: Footing = '不理会'
  for (let i = 0; i < 6; i += 1) {
    const weighing = weighUp(THE_ONE_AT_THE_HERB_SHED.id)
    if (!weighing) break
    const step = FOOTINGS.indexOf(weighing.to) - FOOTINGS.indexOf(weighing.from)
    if (step > 1) jumped += 1
    if (FOOTINGS.indexOf(weighing.willing) > FOOTINGS.indexOf(weighing.to)) willingHigh += 1
    walk.push(
      `    第 ${i + 1} 回：量到 ${weighing.regard.toFixed(1)}　` +
        `${weighing.from} → ${weighing.to}　（他心里肯到「${weighing.willing}」）`,
    )
    previous = weighing.to
  }
  for (const line of walk) console.log(line)
  console.log()

  judge(jumped === 0, '六回里没有一回跳格')
  /**
   * 这一行是上一行的对照组。
   *
   * 「没跳格」在一个 `footing` 永远不动的死实现下也成立。
   * `willing` 高于 `to` 说明**他心里早就肯了，是关系还没长到那儿**——
   * 于是「一次一格」是一条真的规矩，不是一堵墙。
   */
  judge(willingHigh > 0, '他心里肯的比实际给的高——挡住的是关系的长度，不是他的意思')
  judge(previous === '教一点', `一趟一趟去，最后走到了「${previous}」`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 四　那道顶是他自己的事 ===\n')

{
  for (const cultivator of [THE_ONE_ON_THE_PATH, THE_ONE_AT_THE_TEMPLE, THE_ONE_AT_THE_HERB_SHED]) {
    const reachable = FOOTINGS.slice(1, FOOTINGS.indexOf(cultivator.stance.ceiling) + 1)
    const missing = reachable.filter((footing) => !cultivator.steps[footing])
    console.log(`  ${cultivator.calls.padEnd(8)}顶在「${cultivator.stance.ceiling}」`)
    console.log(`    他压着的事：${cultivator.stance.bound ?? '（没有）'}`)
    console.log(`    他要的人：　${cultivator.stance.wants ?? '（他没在挑人）'}`)
    judge(missing.length === 0, `　　顶以下每一格都有台词，没有哑巴台阶`)
  }
  console.log()

  /**
   * 会教人的只有一个。
   *
   * 这一条静态就判得出来——**能静态判的别拿模拟去判**。
   * 三个人里只有陶仲有 `teaches`，而这一格正是「愿意」跟「看得见」
   * 彻底分开之后剩下的那件事。
   */
  const teachers = [THE_ONE_ON_THE_PATH, THE_ONE_AT_THE_TEMPLE, THE_ONE_AT_THE_HERB_SHED].filter(
    (one) => one.teaches,
  )
  judge(teachers.length === 1, `三个人里只有一个会教人：${teachers[0]?.calls}`)
  judge(
    teachers[0]?.stance.ceiling === '教一点',
    '而他的顶正好在「教一点」——顶和肯教是同一件事的两面',
  )
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 五　听过 ≠ 记住 ≠ 明白 ≠ 身上有反应 ===\n')
console.log('  四份数据，各卡在一处。每一处都得有人停在那儿——')
console.log('  少一处，这几关就是同一关换了几个名字。\n')

{
  const cases: readonly [string, Attributes, Grasp, Hold][] = [
    ['记性极差', FORGETFUL, '听过', '照着做'],
    ['背得下来，想不通', { ...PLAIN_STEADY, memory: 88, insight: 14 }, '记住', '照着做'],
    ['都懂，就是碰不着', { ...PLAIN_STEADY, memory: 88, insight: 90 }, '明白', '照着做'],
    ['碰着了', PLAIN_STEADY_ROOTED, '明白', '摸着了'],
  ]
  const stops = new Set<Grasp>()
  const rests = new Set<Hold>()
  for (const [label, attributes, expectedGrasp, expectedHold] of cases) {
    const got = goAllTheWay(attributes)
    if (got.grasp) stops.add(got.grasp)
    rests.add(got.hold)
    console.log(`  ${label.padEnd(16)}想到「${got.grasp}」，身上「${got.hold}」`)
    judge(
      got.grasp === expectedGrasp && got.hold === expectedHold,
      `　　该是「${expectedGrasp}」/「${expectedHold}」`,
    )
  }
  console.log()
  judge(stops.size === GRASPS.length, `脑子里三层都有人停在那儿：${[...stops].join('、')}`)
  /**
   * 第三、第四份数据是这一节的要害。
   *
   * 两个人都想到了「明白」——**同一层，身上却不是一回事**。
   * 少了这一对，「明白」和「碰着了」还可以解释成一条阶梯上的两级；
   * 有了它，那条阶梯就断在这儿：想通了不会让你碰着，碰着了也不必想通。
   */
  judge(rests.size > 1, `而同样想到了「明白」的人，身上分成了几路：${[...rests].join('、')}`)

  /**
   * 几关看的不是同一样东西——静态查一遍。
   *
   * 几个 `by` 若共用同一批属性，上面那四行仍然可能全绿
   * （门槛不同也能把人分开），**而那就不是几件事，是一件事的几道刻度**。
   */
  const keysOf = (gate: { by: Record<string, number | undefined> }): string[] =>
    Object.keys(gate.by)
  const remembering = keysOf(QUIET_BREATH.remembering)
  const grasping = keysOf(QUIET_BREATH.grasping)
  const finding = keysOf(QUIET_BREATH.finding)
  const steadying = keysOf(QUIET_BREATH.steadying)
  console.log(`  背下来看：${remembering.join('、')}`)
  console.log(`  想明白看：${grasping.join('、')}`)
  console.log(`  碰得着看：${finding.join('、')}`)
  console.log(`  稳得住看：${steadying.join('、')}\n`)
  const inTheHead = [...remembering, ...grasping]
  judge(
    [...finding, ...steadying].every((key) => !inTheHead.includes(key)),
    '身上那条轴看的东西，跟脑子里那条一样也不沾',
  )
  /**
   * 身上那两关彼此也不许重。
   *
   * 「碰得着」看资质，「稳得住」看身子骨和心志。合成同一批属性的话，
   * **「碰着了却稳不住」这种人生就跑不出来了**——碰得着的人必然稳得住，
   * 那两格就又成了一格。
   */
  judge(
    finding.every((key) => !steadying.includes(key)),
    '碰得着和稳得住看的也不是同一样东西',
  )
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 六　有些事努力管用，有些事努力不管用 ===\n')

{
  /** 练 `times` 回，最后落在哪儿 */
  const after = (attributes: Attributes, times: number): Ending => {
    fresh(attributes)
    knockUntil(THE_ONE_AT_THE_HERB_SHED.id)
    teach(THE_ONE_AT_THE_HERB_SHED.id, QUIET_BREATH.id)
    for (let i = 0; i < times; i += 1) practise(QUIET_BREATH.id)
    return { grasp: graspOf(QUIET_BREATH.id), hold: holdOf(QUIET_BREATH.id) }
  }

  const rootless = { ...PLAIN_STEADY, memory: 88, insight: 90 }
  const once = after(rootless, 3)
  const forever = after(rootless, 80)
  console.log(`  根骨不够的那个：练 3 回身上在「${once.hold}」，练 80 回在「${forever.hold}」`)
  judge(once.hold === forever.hold, '练一辈子跟练三回，身上落在同一处')

  /**
   * 对照组：背书那一关，练得多真的能过。
   *
   * 少了这一行，上一行在「所有关口都过不去」的坏实现下照样绿。
   *
   * 用 `SLOW` 不用 `FORGETFUL`：后者记性 12，`helps` 加满六回也才 42，
   * 够不着 44——**他练一回和练四十回本来就落在同一层**，
   * 拿他做对照，这一行永远绿不了，而红的原因不是机制坏了，是样本选错了。
   */
  const slowOnce = after(SLOW, 1)
  const slowLater = after(SLOW, 40)
  console.log(
    `  记性差的那个：练 1 回想到「${slowOnce.grasp}」，练 40 回想到「${slowLater.grasp}」`,
  )
  judge(
    GRASPS.indexOf(slowLater.grasp ?? '听过') > GRASPS.indexOf(slowOnce.grasp ?? '听过'),
    '而背书那一关，笨办法真的磨得过去（对照组：判据不是空的）',
  )
  console.log()
  console.log(`  碰得着那一关 helps=${QUIET_BREATH.finding.helps}，`)
  console.log(`  稳得住那一关 helps=${QUIET_BREATH.steadying.helps}，`)
  console.log(`  背下来那一关 helps=${QUIET_BREATH.remembering.helps}，`)
  console.log(`  想明白那一关 helps=${QUIET_BREATH.grasping.helps}。`)
  console.log('  而这个人分不出自己碰上的是哪一种——他只知道自己又练了一夜。')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 七　中间那一层，玩家看不见 ===\n')

{
  const sight = QUIET_BREATH.sights['明白']
  const same = JSON.stringify(sight.passed) === JSON.stringify(sight.failed)
  judge(same, '「明白」这一关，过了和没过写的是同一段话')

  /**
   * 对照组：别的关口必须不一样。
   *
   * 一份「所有关口正文都相同」的坏数据能让上一行绿，
   * **而那是内容没写完，不是设计**。
   *
   * 「记住」是脑子里那条轴上的，「摸着了」是身上那条轴上的——
   * 两条轴各取一格，免得这个对照只在其中一条轴上站得住。
   */
  const others = [
    ['记住', QUIET_BREATH.sights['记住']],
    ['摸着了', QUIET_BREATH.holds['摸着了']],
  ] as const
  for (const [name, other] of others) {
    judge(
      JSON.stringify(other.passed) !== JSON.stringify(other.failed),
      `「${name}」这一格，到没到是看得出来的（对照组）`,
    )
  }

  /**
   * 实跑一遍。静态相同不等于玩家读到的相同——
   * `practise` 完全可以在别处多塞一句「你还是没懂」。
   */
  const linesOf = (attributes: Attributes): string[] => {
    fresh(attributes)
    knockUntil(THE_ONE_AT_THE_HERB_SHED.id)
    teach(THE_ONE_AT_THE_HERB_SHED.id, QUIET_BREATH.id)
    practise(QUIET_BREATH.id) // 记住
    const practice = practise(QUIET_BREATH.id) // 明白
    return (practice?.blocks ?? []).map((block) => ('text' in block ? block.text : ''))
  }
  const sharp = linesOf({ ...PLAIN_STEADY, memory: 88, insight: 90 })
  const dull = linesOf({ ...PLAIN_STEADY, memory: 88, insight: 14 })
  console.log('\n  真懂了的那个读到的：')
  for (const line of sharp) console.log(`    ${line}`)
  console.log('  没懂的那个读到的：')
  for (const line of dull) console.log(`    ${line}`)
  console.log()
  judge(
    JSON.stringify(sharp) === JSON.stringify(dull),
    '实跑：两个人读到的一字不差——他自己分不出自己是哪一个',
  )
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 八　走到最后，什么也没多 ===\n')

{
  fresh(PLAIN_STEADY_ROOTED)
  const character = useCharacterStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const before = { ...character.attributes }
  const realmBefore = character.realm
  const identityBefore = character.identity
  const itemsBefore = character.inventory.length

  knockUntil(THE_ONE_AT_THE_HERB_SHED.id)
  teach(THE_ONE_AT_THE_HERB_SHED.id, QUIET_BREATH.id)
  // 教完那一刻先取一次。往后他会把那五句想通，那一格就跟着改了
  const justTaught = character.knowledge.find(
    (one) => one.id === `rite:${QUIET_BREATH.id}`,
  )?.interpretation
  for (let i = 0; i < 20; i += 1) practise(QUIET_BREATH.id)

  const attrSame = (Object.keys(before) as (keyof Attributes)[]).every(
    (key) => character.attributes[key] === before[key],
  )
  judge(attrSame, '走完全程，真实属性一格没动')
  judge(character.realm === realmBefore, `境界还是「${character.realm}」`)
  judge(character.identity === identityBefore, `身份还是「${character.identity}」`)
  judge(character.inventory.length === itemsBefore, '一件东西也没拿到')

  /**
   * 走到最后他仍旧不是你师父。
   *
   * 这是用户点名的那一条：界面上不许跳出【师父：陶仲】。
   * 关系只长在 `footing` 那个旗标上，人口册里那一条跟见过一面的人没有区别。
   *
   * ## 这一行原先是句空话，而且看着一点毛病也没有
   *
   * 从前写的是 `people.personOf(...)?.bond`——**`Person` 上根本没有 `bond` 这个字段**。
   * 它恒等于 `undefined`，于是这一行永远绿：就算哪天 `teach()` 顺手
   * 认了个师父，它照样打勾。`vite-node` 不做类型检查，所以门禁跑绿跑了一路，
   * 直到 `vue-tsc` 才把它揪出来。
   *
   * 关系不在人身上，在边上——得问 `bondsWith`。这一节最后还站着一段尺子自检：
   * 存心认一个师父，这条判据必须当场读得出来。不红的话，它又成了一句空话。
   */
  const bonds = people.bondsWith(THE_ONE_AT_THE_HERB_SHED.id)
  judge(bonds.length === 0, `他在人口册里的关系是「${bonds.join('、') || '（没有）'}」——不是师父`)
  console.log(`    他此刻的处境：footing =「${footingWith(THE_ONE_AT_THE_HERB_SHED.id)}」`)
  console.log(`    他此刻的层数：grasp   =「${graspOf(QUIET_BREATH.id)}」`)

  const learned = character.knowledge.find((one) => one.id === `rite:${QUIET_BREATH.id}`)
  judge(learned !== undefined, '他拿到的是一条见闻，不是一件功法')
  judge(learned?.contact === '亲历', `接触档是「${learned?.contact}」——有人当面对他说的`)

  /**
   * 理解档这一格是会动的，所以得分两次问。
   *
   * `teach()` 落下去写的是 `未理解`——**他听见了，他不懂**，这两件事同时成立。
   * 而这个孩子（悟性 61）练着练着就把那五句想通了，那一格随之改成 `确信`。
   *
   * 只问最后那一次的话，这一行会红得莫名其妙；只问头一次的话，
   * 「他想通了」这件事就没落在任何看得见的地方。**两次都问，才是这一格的全貌。**
   * 走岔了的人过不了「明白」那一关，于是他那条见闻上一辈子写着 `未理解`——
   * 那一头由 `scripts/mastery.ts` 第七道守着。
   */
  judge(justTaught === '未理解', `他听见那一刻，理解档是「${justTaught}」`)
  judge(learned?.interpretation === '确信', `想通之后才改口，如今是「${learned?.interpretation}」`)

  /**
   * 最不该漏出去的那样东西：他到底过没过。
   *
   * `passed` 只在引擎里活着。玩家若能读到「明白这一关你没过」，
   * 第七道那一整节就成了假话——而正文照样好看，什么也不会吭声。
   */
  const leaked = character.knowledge.filter((one) => 'passed' in one || 'tries' in one)
  judge(leaked.length === 0, '落进见闻里的那一条，不带「你过没过」的标记')

  /**
   * 练了几回是记着的，可它只在旗标里，不在玩家读得到的地方。
   *
   * 记着是必须的——`helps` 那两关靠它。这一行只是把它钉在
   * 「引擎的账本」那一侧，免得哪天有人顺手把它渲染出来。
   */
  const tries = world.getFlag(`rite:${QUIET_BREATH.id}:tries`)
  judge(typeof tries === 'number' && tries > 0, `练过的回数记在旗标里：${String(tries)} 回`)

  /**
   * 尺子自检：上面那句「他不是你师父」，读得出真假吗。
   *
   * 存心往人口册里认一个师父，`bondsWith` 必须当场看得见。
   * 看不见就说明那一行读的是个永远为空的地方——正是它上一版的毛病。
   *
   * 放在这一节最末，是因为这一笔认下去就赖着了：`bondsWith` 不看 `until`，
   * `unbind` 只封口不删边，撤不干净。所以让它做完最后一件事就散场。
   */
  people.bind('me', THE_ONE_AT_THE_HERB_SHED.id, '师')
  const forged = people.bondsWith(THE_ONE_AT_THE_HERB_SHED.id)
  judge(forged.includes('师'), `尺子自检：硬认一个师父，这条判据看得见（「${forged.join('、')}」）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 这一支没有验到的 ===\n')
console.log('  · 「同一个修士第二次教得多一点」——现在靠的是 footing 一格一格往上挪，')
console.log('    而不是「他记得上回教过你什么」。前者够用了，后者要等功法系统。')
console.log('  · 「玩家可能利用他、依赖他、离开他」——离开验到了（footing 改回「不理会」，')
console.log('    四个事件的条件当场落空）。利用和依赖是剧本里的态度，不是机制。')
console.log('  · 「看错而没收的永远不会被纠正」——这一句在代码里是**没有东西**：')
console.log('    姜不换那一头压根没有任何后续。验一件不存在的事，只能靠人读。')

console.log(
  failed === 0
    ? '\n八道都过了。四种人生同时立着，而这个人分不出自己是哪一种。\n'
    : `\n${failed} 道没过。\n`,
)
if (failed > 0) process.exitCode = 1
