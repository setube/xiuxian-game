/* eslint-disable no-console -- 这是一支命令行门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 「师父教了你」和「你真正会了」之间，隔着什么。
 *
 * ## 这一支要证的那句话
 *
 *     不是所有认真学的人都学得会，
 *     而学不会的原因，往往不在学的那个人身上。
 *
 * 上一支（`scripts/tutelage.ts`）验的是他愿不愿意教。这一支验的是教完之后：
 * 那五句话进了他耳朵，然后呢。
 *
 * ## 隔着的是两样东西，两样都不在属性表里
 *
 *     你走的是不是那件事　　他能给你的只有话。而那件事不在话里
 *     你身上有没有那个东西　这一样练一辈子也补不了
 *
 * 于是这不是一条阶梯，是两条各走各的轴：
 *
 *     脑子里　听过 → 记住 → 明白
 *     身　上　没上手 ─┬→ 照着做 ─→ 摸着了 ─→ 拿得住
 *                     └→ 走岔了 ─┘
 *
 * 中间那个分叉是这一章全部的新东西：陶仲的教法是「说给你听」，
 * 守一要的是「让你自己找」。**对不上。** 于是他念得越认真，
 * 学的人越笃定地往错地方使劲——一个从没人教、自己瞎坐的人反倒不会走岔。
 *
 * ## 七道判据
 *
 *     一　四种组合　　脑子里和身上真的各走各的，四种组合都跑得出来
 *     二　换个教法　　同一个孩子同一个师父，教法一改，命就不同
 *     三　反例　　　　悟性更高的那个学不会，悟性平常的那个学会了
 *     四　看不见　　　「照着做」和「走岔了」，玩家读到的是同一段话
 *     五　出路　　　　走岔了只有一条出路，而他不知道自己走出来过
 *     六　日子　　　　练得多没用，练得久才有用
 *     七　什么也没多　走完全程属性一格没动；他只是确信自己懂了那五句
 *
 * ## 三份样本的根骨完全相同，区别只在出身
 *
 * 这是第三道的全部凭据。`SAME_BONES` 那一块钉死了六项，
 * 三份样本只差一个 `insight` 和一行 `origin`——
 * **而学得会的是悟性低的那个。** 少了这一处对齐，
 * 「他学不会」永远可以解释成「他资质差一点」。
 *
 * 出身钉的是整行五格（`beOf`），而 `handsKnow()` 只读其中两格：
 * 家里那处铺面是不是药铺，或者这家人是不是靠打猎过活。
 * 摆整行不是多余——少摆一格会摆出「开着药铺却是宗室」这种人，
 * 而那种人走查出来的结论不算数。
 *
 * 跑法：bun scripts/mastery.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { THE_ONE_AT_THE_HERB_SHED } from '../src/content/cultivators'
import { originById } from '../src/content/origins'
import { QUIET_BREATH, type Grasp, type Hold } from '../src/content/rites'
import {
  footingWith,
  graspOf,
  holdOf,
  practise,
  teach,
  weighUp,
  type Practice,
} from '../src/engine/tutelage'
import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import type { Attributes, OriginId } from '../src/types/game'

import { beOf } from './origin'

/** 剧本里那一章给到几回叩门的机会 */
const KNOCKS = 12

/**
 * 一份样本最多重开多少世去凑那一次「他肯教」。
 *
 * 陶仲每一世量到的数都不一样（`observe()` 里那点抖动），
 * 所以同一份数据有的世教有的世不教。凑不到 `LIVES` 世，
 * **那是样本配错了，不是机制坏了**——所以那一条直接抛出去，
 * 不当成一道红判据，免得把「门禁自己搭错了台子」说成「代码有问题」。
 */
const LIVES = 200

// ────────────────────────────────────────────────────────────
// 样本。这一支全部的区分力都在「同一副根骨、不同的出身」上
// ────────────────────────────────────────────────────────────

/**
 * 六项钉死的那一副身子骨。三份样本共用它，只差一个悟性。
 *
 * `body 86 / will 94` 是为了让陶仲肯教——这两样是他那把尺子量的东西，
 * 低了他就不教，后面六道全没了台子。
 * `root 72 / spirit 66` 让「碰得着」那一关过得去（69.6 ≥ 55），
 * `memory 58` 让「背下来」那一关第一回就过（58 ≥ 44）。
 *
 * **也就是说：这三个孩子在每一道跟身体有关的关口上完全一样。**
 * 剩下的差别只有两处，而那两处决定了他们各自的一生。
 */
const SAME_BONES: Omit<Attributes, 'insight'> = {
  memory: 58,
  body: 86,
  will: 94,
  fortune: 50,
  root: 72,
  spirit: 66,
}

interface Sample {
  label: string
  attributes: Attributes
  origin: OriginId
  /** 小时候在后院认过药。这是一条**见闻**，不是出身——见第三道末尾 */
  herbLore?: boolean
}

/**
 * 这一行出身在这一支里怎么称呼。
 *
 * 取的是 `handsKnow()` 真正会去问的那两格：先看家里那处铺面，
 * 没有铺面就看这家靠什么过活。**印出来的词跟判据读的是同一格**——
 * 印一个「官宦」而判据读的是 `business`，那这一行字就是在替读者猜。
 */
function originName(id: OriginId): string {
  const row = originById(id)
  return row.business ?? row.livelihood
}

/** 报出身用的那一段：主键在前，因为只有它分得开每一行 */
function who(sample: Sample): string {
  return `${sample.origin}（${originName(sample.origin)}）`
}

/**
 * 巷子里那个药铺的孩子。悟性 30，寻常得很。
 *
 * 他打小就知道有一类东西是说不出来的：认草的人闻一下就知道是哪一味，
 * 说不清凭什么。于是他听见一句说不通的话，不会硬往话上凑——
 * **他不走岔，而他这辈子也不会知道自己躲过了什么。**
 */
const SHED_CHILD: Sample = {
  label: '药铺的孩子',
  origin: 'herb',
  attributes: { ...SAME_BONES, insight: 30 },
}

/**
 * 官宦人家那个孩子。悟性 40，比上面那个高十分。
 *
 * 根骨一模一样，师父一模一样，教的东西一模一样，他还更聪明些。
 * **而他一辈子学不会。**
 *
 * 算得出来的那一笔：想明白那一关是 `insight 9 : memory 1`，
 * 他生下来就有 41.8 分，门槛 46。差 4.2 分——练两回就补上了，
 * 可他在岔上，`graspTries` 把那两回归了零。
 * 于是他练八十回、八百回，永远差着那 4.2 分。
 */
const OFFICIAL_CHILD: Sample = {
  label: '官宦的孩子',
  origin: 'office',
  attributes: { ...SAME_BONES, insight: 40 },
}

/**
 * 匠户的孩子，悟性也是 30，可他小时候在后院翻过药。
 *
 * 这一份是第三道最要紧的一处收尾：**这不是出身决定论。**
 * 决定他不走岔的不是家里那处药铺，是他手上那份不靠话的经验——
 * 一条见闻就够了。
 */
const SMITH_CHILD: Sample = {
  label: '认过药的匠户孩子',
  origin: 'craft',
  attributes: { ...SAME_BONES, insight: 30 },
  herbLore: true,
}

/**
 * 悟性够高的那个官宦孩子。50 分，光靠生下来那点就过得了「明白」这一关。
 *
 * 他第一夜照样走岔——`stepOn` 那一回拿的是「记住」，还没轮到「明白」。
 * 第二夜他把那五句想通了，于是当场从岔上下来，回到「照着做」重走。
 *
 * **他不知道自己走岔过，也不知道自己走出来了。** 那两夜他读到的
 * 身上那一段一字不差，见第五道。
 */
const SHARP_OFFICIAL: Sample = {
  label: '悟性够的官宦孩子',
  origin: 'office',
  attributes: { ...SAME_BONES, insight: 50 },
}

/** 想通了，可身上那个地方一辈子没反应。第一道的第三格 */
const ROOTLESS_SHED: Sample = {
  label: '碰不着的药铺孩子',
  origin: 'herb',
  attributes: { ...SAME_BONES, insight: 30, root: 41, spirit: 38 },
}

/** 碰着了，可那五句到死也没想通。第一道的第四格 */
const DULL_SHED: Sample = {
  label: '想不通的药铺孩子',
  origin: 'herb',
  attributes: { ...SAME_BONES, insight: 14 },
}

/**
 * 在岔上，记性还差。
 *
 * 拿它验「归零只归『明白』那一关」：他记性 26，头几回背不下来，
 * 练到第四回才背熟——**而他从第一夜起就在岔上**。
 * 背诵跟你坐得对不对没有关系，所以那一关一切照旧。
 */
const ASTRAY_AND_SLOW: Sample = {
  label: '在岔上背书的孩子',
  origin: 'office',
  attributes: { ...SAME_BONES, insight: 40, memory: 26 },
}

// ────────────────────────────────────────────────────────────
// 跑一世
// ────────────────────────────────────────────────────────────

/**
 * 开一世。
 *
 * **先 `useCharacterStore()` 再动别的**：创建那一刻等于出生，
 * 它把 `bornYear` 钉在当时的 `time.year` 上。顺序反了，人就凭空老了几岁。
 *
 * `herbLore` 那一条走的是真的 `learn()`，不是往旗标里塞一个值——
 * `handsKnow()` 问的是 `character.knows('herb-lore')`，
 * 而那条见闻在 `content/life/childhood.ts` 里是真有的一段人生。
 */
function fresh(sample: Sample): void {
  setActivePinia(createPinia())
  const character = useCharacterStore()
  character.attributes = { ...sample.attributes }
  beOf(sample.origin)
  if (!sample.herbLore) return
  character.learn({
    id: 'herb-lore',
    title: '认药',
    summary: '草木各有各的样子和气味。认错一味就要出人命。',
    category: '器物',
    at: useWorldStore().time,
  })
}

/** 一趟一趟地去，去到他肯教，教完为止 */
function begin(sample: Sample): void {
  for (let life = 0; life < LIVES; life += 1) {
    fresh(sample)
    for (let i = 0; i < KNOCKS; i += 1) weighUp(THE_ONE_AT_THE_HERB_SHED.id)
    if (footingWith(THE_ONE_AT_THE_HERB_SHED.id) !== '教一点') continue
    teach(THE_ONE_AT_THE_HERB_SHED.id, QUIET_BREATH.id)
    return
  }
  throw new Error(`${sample.label}：叩了 ${LIVES} 世的门，陶仲一世也没肯教——这份样本配错了`)
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

function here(): Ending {
  return { grasp: graspOf(QUIET_BREATH.id), hold: holdOf(QUIET_BREATH.id) }
}

/** 被教了，然后自己练 `times` 回 */
function live(sample: Sample, times: number): Ending {
  begin(sample)
  for (let i = 0; i < times; i += 1) practise(QUIET_BREATH.id)
  return here()
}

/** 这一夜他读到的全部 */
function textOf(practice: Practice | null): string[] {
  return (practice?.blocks ?? []).map((block) => ('text' in block ? block.text : ''))
}

/**
 * 这一夜正文里「身上那一段」——他做了什么、觉出了什么。
 *
 * 拿它单独切出来，是因为第五道要比的那两夜脑子里那一段确实不同
 * （他其中一夜想通了那五句）。**身上那一段必须一字不差**：
 * 从岔上下来那一夜，他看见的是他第一天看见的那句话。
 */
function bodyLines(practice: Practice | null): string[] {
  if (!practice) return []
  const sight = QUIET_BREATH.holds[practice.now]
  return textOf(practice).slice(0, (practice.moved ? sight.passed : sight.failed).length)
}

/** 被教了，练一回，把那一回整个端出来 */
function firstNight(sample: Sample): Practice | null {
  begin(sample)
  return practise(QUIET_BREATH.id)
}

/**
 * 临时改一格，跑完还回去，把跑出来的结果带出来。
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

const same = (a: readonly string[], b: readonly string[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

// ────────────────────────────────────────────────────────────
console.log('\n=== 尺子自检（存心改坏的必须红）===\n')

/**
 * 第一把，也是这一支最要紧的一把：**「走岔」有可能是一个恒真的死机制。**
 *
 * 「官宦那个孩子学不会」这句话，在一个 `goesAstray` 永远返回 true
 * 的坏实现下同样成立，在一个门槛高到谁也过不去的坏数据下也同样成立。
 * 所以把守一要的那一种教法临时改成陶仲会的那一种——
 * **同一个孩子必须当场学得会**。改了还学不会，说明挡住他的根本不是教法，
 * 底下三道全是空话。
 */
{
  const before = live(OFFICIAL_CHILD, 20)
  const after = borrow(QUIET_BREATH, 'asks', '说给你听', () => live(OFFICIAL_CHILD, 20))
  console.log(
    `  守一要的教法原样是「${QUIET_BREATH.asks}」，陶仲会的是「${THE_ONE_AT_THE_HERB_SHED.way}」`,
  )
  console.log(`  原样：想到「${before.grasp}」，身上「${before.hold}」`)
  console.log(`  改成「说给你听」之后：想到「${after.grasp}」，身上「${after.hold}」`)
  judge(before.hold === '走岔了', '原样：他练了二十回，从头到尾在岔上')
  judge(after.hold === '摸着了' && after.grasp === '明白', '教法一对上，同一个孩子当场学会了')
}

/**
 * 第二把：`settles` 真的是那道日子的坎吗。
 *
 * 「他稳不住」在一个门槛高到谁也过不去的实现下同样成立。
 * 把那一年半临时改成 0——**同一个孩子不用等日子就该稳住**。
 */
{
  const before = live(SHED_CHILD, 60)
  const after = borrow(QUIET_BREATH, 'settles', 0, () => live(SHED_CHILD, 60))
  console.log(`\n  稳得住那一关要熬 ${QUIET_BREATH.settles} 天`)
  console.log(`  原样练 60 回：身上「${before.hold}」　把日子改成 0 之后：「${after.hold}」`)
  judge(before.hold === '摸着了', '原样：练六十回也只是「摸着了」')
  judge(after.hold === '拿得住', '日子一去掉就稳住了——挡住他的确实是那一年半')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 一　脑子里和身上，各走各的 ===\n')
console.log('  四种组合都得跑得出来。少一种，这两条轴就是一条轴换了两个名字。\n')

{
  const cases: readonly [Sample, Grasp, Hold][] = [
    [SHED_CHILD, '明白', '摸着了'],
    [ROOTLESS_SHED, '明白', '照着做'],
    [DULL_SHED, '记住', '摸着了'],
    [OFFICIAL_CHILD, '记住', '走岔了'],
  ]
  const seen = new Set<string>()
  for (const [sample, grasp, hold] of cases) {
    const got = live(sample, 20)
    seen.add(`${got.grasp}/${got.hold}`)
    console.log(`  ${sample.label.padEnd(18)}想到「${got.grasp}」，身上「${got.hold}」`)
    judge(got.grasp === grasp && got.hold === hold, `　　该是「${grasp}」/「${hold}」`)
  }
  console.log()
  judge(seen.size === cases.length, `四种组合真的是四种：${[...seen].join('　')}`)

  /**
   * 而这四个人在陶仲眼里是一样的。
   *
   * 他那把尺子量的是耐性和身子骨，四份样本这两项完全相同——
   * **他挑人的时候看不出任何区别，他教完之后也不会知道有区别。**
   */
  const bones = cases.map(([sample]) => `${sample.attributes.body}/${sample.attributes.will}`)
  judge(new Set(bones).size === 1, `而他挑人量的那两样，四个人一模一样：body/will = ${bones[0]}`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 二　同一个孩子，同一个师父，换一种教法 ===\n')

{
  const before = live(OFFICIAL_CHILD, 20)
  const after = borrow(THE_ONE_AT_THE_HERB_SHED, 'way', '让你自己找', () =>
    live(OFFICIAL_CHILD, 20),
  )
  console.log(`  陶仲原样是「说给你听」：这孩子想到「${before.grasp}」，身上「${before.hold}」`)
  console.log(`  换成「让你自己找」：　　想到「${after.grasp}」，身上「${after.hold}」`)
  judge(before.hold === '走岔了' && after.hold !== '走岔了', '同一个人，教法一改，命就不同')
  judge(after.grasp === '明白', '而他本来就想得明白——挡着他的是那五句给的方向')
  console.log()
  console.log('  这不是「他教得不好」。他教得很认真，他只是不知道这样东西教不了。')
  console.log('  他这辈子也不会知道——他只会觉得是自己讲得不够细。')

  /**
   * 教法没有高下，这一条得看得见。
   *
   * 四种教法排成一列的话，`way` 就成了一个隐藏的能力值，
   * 「陶仲差一点」就成了这一章的解释——**而那正是要躲开的那句话**。
   */
  console.log()
  console.log(`  守一要的是「${QUIET_BREATH.asks}」。换一样东西要的是别的，`)
  console.log('  同一个陶仲就成了最合适的那个师父。四种教法只有对不对得上，没有高下。')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 三　不是所有认真学的人都学得会 ===\n')
console.log('  两个孩子，根骨一项不差，师父同一个，教的同一样东西。\n')

{
  const shed = live(SHED_CHILD, 20)
  const official = live(OFFICIAL_CHILD, 20)
  const smith = live(SMITH_CHILD, 20)

  const bones = (sample: Sample): string =>
    (Object.keys(SAME_BONES) as (keyof Attributes)[])
      .map((key) => `${key}=${sample.attributes[key]}`)
      .join(' ')
  console.log(
    `  ${SHED_CHILD.label}　　悟性 ${SHED_CHILD.attributes.insight}　出身 ${who(SHED_CHILD)}`,
  )
  console.log(
    `  ${OFFICIAL_CHILD.label}　　悟性 ${OFFICIAL_CHILD.attributes.insight}　出身 ${who(OFFICIAL_CHILD)}`,
  )
  console.log(`  其余六项：${bones(SHED_CHILD)}`)
  console.log(`  　　　　　${bones(OFFICIAL_CHILD)}\n`)
  console.log(`  ${SHED_CHILD.label}：想到「${shed.grasp}」，身上「${shed.hold}」`)
  console.log(`  ${OFFICIAL_CHILD.label}：想到「${official.grasp}」，身上「${official.hold}」`)

  judge(same([bones(SHED_CHILD)], [bones(OFFICIAL_CHILD)]), '两份样本除了悟性和出身，一项不差')
  judge(
    OFFICIAL_CHILD.attributes.insight > SHED_CHILD.attributes.insight,
    `而学不会的那个悟性更高（${OFFICIAL_CHILD.attributes.insight} > ${SHED_CHILD.attributes.insight}）`,
  )
  judge(official.hold === '走岔了', '悟性高、根骨够、师父认真教——他一辈子在岔上')
  judge(shed.hold === '摸着了' && shed.grasp === '明白', '悟性平常的那个学会了')

  /**
   * 而这也不是出身决定论。
   *
   * 少了这一行，上面那四行合起来会读成「投胎决定一切」——
   * 那只是把「悟性 = 成功率」换成了「出身 = 成功率」，同一种病。
   * 真正管用的是他手上那份不靠话的经验，**而那是一条见闻，一段人生**。
   */
  console.log(
    `\n  ${SMITH_CHILD.label}（悟性 ${SMITH_CHILD.attributes.insight}，出身 ${who(SMITH_CHILD)}）：`,
  )
  console.log(`  想到「${smith.grasp}」，身上「${smith.hold}」`)
  judge(smith.hold === '摸着了', '出身不是药铺，可他小时候认过药——他也学会了')
  console.log()
  console.log('  所以决定这件事的不是「人 + 悟性」，是')
  console.log('  「人 + 所学之物 + 教法 + 他手上有没有那份经验 + 练习 + 日子」。')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 四　「照着做」和「走岔了」，读到的是同一段话 ===\n')

{
  const right = QUIET_BREATH.holds['照着做']
  const wrong = QUIET_BREATH.holds['走岔了']
  judge(same(right.passed, wrong.passed), '刚坐下那一夜，两格写的是同一段话')
  judge(same(right.failed, wrong.failed), '往后每一夜，两格写的也是同一段话')

  /**
   * 对照组：别的格必须不一样。
   *
   * 一份「所有格正文都相同」的坏数据能让上两行绿，
   * **而那是内容没写完，不是设计**。
   */
  judge(
    !same(QUIET_BREATH.holds['摸着了'].passed, right.passed),
    '而「摸着了」那一格是看得出来的（对照组）',
  )
  judge(
    !same(QUIET_BREATH.holds['摸着了'].passed, QUIET_BREATH.holds['摸着了'].failed),
    '「摸着了」到没到也是看得出来的（对照组）',
  )

  /**
   * 实跑一遍。静态相同不等于玩家读到的相同——
   * `practise` 完全可以在别处多塞一句「你这样是不对的」。
   *
   * 两个孩子记性都是 58，头一夜都把那五句背下来了，
   * 所以脑子里那一段也一样。**整段正文一字不差。**
   */
  const walking = firstNight(SHED_CHILD)
  const astray = firstNight(OFFICIAL_CHILD)
  console.log(`\n  走对了的那个第一夜落在「${walking?.now}」，走错了的那个落在「${astray?.now}」`)
  console.log('  而他们读到的是：')
  for (const line of textOf(walking)) console.log(`    ${line}`)
  console.log()
  judge(walking?.now === '照着做' && astray?.now === '走岔了', '实跑：两个人确实落在不同的格上')
  judge(same(textOf(walking), textOf(astray)), '实跑：他们读到的一字不差')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 五　走岔了只有一条出路，而他不知道自己走出来过 ===\n')

{
  begin(SHARP_OFFICIAL)
  const night1 = practise(QUIET_BREATH.id)
  const night2 = practise(QUIET_BREATH.id)
  console.log(
    `  第一夜：${night1?.was} → ${night1?.now}　（脑子里 ${night1?.from} → ${night1?.to}）`,
  )
  console.log(
    `  第二夜：${night2?.was} → ${night2?.now}　（脑子里 ${night2?.from} → ${night2?.to}）`,
  )
  judge(night1?.now === '走岔了', '第一夜他就岔了——那时候他连那五句在说什么都还没想')
  judge(
    night2?.was === '走岔了' && night2?.to === '明白' && night2?.now === '照着做',
    '第二夜他把那五句想通了，当场从岔上下来，回到「照着做」重走',
  )

  console.log('\n  他走岔那一夜，身上那一段读到的是：')
  for (const line of bodyLines(night1)) console.log(`    ${line}`)
  console.log('  他走出来那一夜，身上那一段读到的是：')
  for (const line of bodyLines(night2)) console.log(`    ${line}`)
  console.log()
  judge(same(bodyLines(night1), bodyLines(night2)), '一字不差——他确实是从头开始，而他不知道')

  /**
   * `graspTries` 归零那一条。**两条轴全书只在这一处交叉一次。**
   *
   * 走岔了的人天天在做一件错事，那件错事天天给他一个
   * 「我这不是做得挺对的吗」的回音——于是他在错路上练一百回，
   * 对于「想明白那五句」这件事，等于一回也没练。
   *
   * 少了下面这一对，「他想不明白」还可以解释成他悟性不够；
   * 有了它，那句解释就没地方站了：**同一个人，不在岔上第二回就想明白了。**
   */
  const stuck = live(OFFICIAL_CHILD, 80)
  const freed = borrow(QUIET_BREATH, 'asks', '说给你听', () => live(OFFICIAL_CHILD, 2))
  console.log(`  在岔上练 80 回：想到「${stuck.grasp}」`)
  console.log(`  同一个人不在岔上，练 2 回：想到「${freed.grasp}」`)
  judge(stuck.grasp === '记住', '在错路上练八十回，对于想明白那五句，等于一回也没练')
  judge(freed.grasp === '明白', '而他本来两回就够了（对照组：挡他的是岔，不是脑子）')

  /**
   * 归零只归「明白」那一关。
   *
   * 背五句照样背得下来——**背诵跟你坐得对不对没有关系**。
   * 少了这一行，`graspTries` 可能是一条「走岔了就什么也学不成」的粗暴规则，
   * 那就又把两条轴粘回一起了。
   */
  const rote = live(ASTRAY_AND_SLOW, 10)
  console.log(`\n  ${ASTRAY_AND_SLOW.label}（记性 ${ASTRAY_AND_SLOW.attributes.memory}）：`)
  console.log(`  想到「${rote.grasp}」，身上「${rote.hold}」`)
  judge(rote.hold === '走岔了', '他从第一夜起就在岔上')
  judge(rote.grasp === '记住', '可那五句他照样背下来了——归零只归「明白」那一关')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 六　练得多没用，练得久才有用 ===\n')

{
  begin(SHED_CHILD)
  for (let i = 0; i < 60; i += 1) practise(QUIET_BREATH.id)
  const drilled = here()
  console.log(`  一口气练 60 回，一天也没让它过去：身上「${drilled.hold}」`)
  judge(drilled.hold === '摸着了', '练得再多也只是「摸着了」——有时候有，有时候没有')

  const world = useWorldStore()
  world.advanceTime({ days: QUIET_BREATH.settles })
  practise(QUIET_BREATH.id)
  const settled = here()
  console.log(`  让 ${QUIET_BREATH.settles} 天过去，再坐一回：身上「${settled.hold}」`)
  judge(settled.hold === '拿得住', '日子过够了，一回就稳住了')
  console.log()
  console.log(
    `  稳得住那一关 helps=${QUIET_BREATH.steadying.helps}，settles=${QUIET_BREATH.settles}。`,
  )
  console.log('  一个月里练二十回，和两年里练二十回，不是一回事。')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 七　走到最后，什么也没多 ===\n')

{
  begin(SHED_CHILD)
  const character = useCharacterStore()
  const world = useWorldStore()
  const before = { ...character.attributes }
  const realmBefore = character.realm
  const identityBefore = character.identity
  const itemsBefore = character.inventory.length
  const justTaught = character.knowledge.find(
    (one) => one.id === `rite:${QUIET_BREATH.id}`,
  )?.interpretation

  for (let i = 0; i < 60; i += 1) practise(QUIET_BREATH.id)
  world.advanceTime({ days: QUIET_BREATH.settles })
  practise(QUIET_BREATH.id)

  console.log(
    `  他走完了全程：想到「${graspOf(QUIET_BREATH.id)}」，身上「${holdOf(QUIET_BREATH.id)}」`,
  )
  judge(holdOf(QUIET_BREATH.id) === '拿得住', '他真的会了——每回都找得着，不用数那三下了')

  const attrSame = (Object.keys(before) as (keyof Attributes)[]).every(
    (key) => character.attributes[key] === before[key],
  )
  judge(attrSame, '而属性表一格没动')
  judge(character.realm === realmBefore, `境界还是「${character.realm}」`)
  judge(character.identity === identityBefore, `身份还是「${character.identity}」`)
  judge(character.inventory.length === itemsBefore, '一件东西也没拿到')

  /**
   * 他多的只有一样：**他确信自己懂了那五句。**
   *
   * `确信` 那一根轴量的是他自己有多笃定，跟他身上有没有那个东西
   * 毫不相干——`ROOTLESS_SHED` 那个孩子也会走到「确信」，
   * 而他身上一辈子什么也没有。
   */
  const learnt = character.knowledge.find((one) => one.id === `rite:${QUIET_BREATH.id}`)
  console.log(`\n  他听见那一刻，那条见闻上写的是「${justTaught}」`)
  console.log(`  他想通之后，改成了「${learnt?.interpretation}」`)
  judge(justTaught === '未理解', '教完那一刻：他听见了，他不懂')
  judge(learnt?.interpretation === '确信', '想通之后才改口——而这只是他自己的笃定')
  judge(learnt?.contact === '亲历', `接触档是「${learnt?.contact}」——有人当面对他说的`)

  /**
   * 而走岔的那个，一辈子写着「未理解」。
   *
   * 认知层老老实实记着他没懂。**他自己完全不知道**——
   * 他每天都在练，每天都觉得自己做得一点不差。
   */
  const stuck = ((): string | undefined => {
    begin(OFFICIAL_CHILD)
    for (let i = 0; i < 80; i += 1) practise(QUIET_BREATH.id)
    return useCharacterStore().knowledge.find((one) => one.id === `rite:${QUIET_BREATH.id}`)
      ?.interpretation
  })()
  console.log(`  而走岔的那个练了 80 回，那条见闻上还写着「${stuck}」`)
  judge(stuck === '未理解', '认知层老老实实记着他没懂，而他自己完全不知道')

  /**
   * 最不该漏出去的那样东西：他到底在哪一条路上。
   *
   * 玩家若能从见闻里读到「走岔了」，第四道那一整节就成了假话——
   * 而正文照样好看，什么也不会吭声。
   */
  const leaked = character.knowledge.filter(
    (one) => JSON.stringify(one).includes('走岔') || 'hold' in one,
  )
  judge(leaked.length === 0, '落进见闻里的那一条，看不出他走的是哪条路')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 这一支没有验到的 ===\n')
console.log('  · 「聋子听不见那五句，瞎子看不见他的动作」——`Constitution` 里有这两样，')
console.log('    而 `handsKnow()` 一点也不看它们。这是有意留的缺口：把它们塞进那个函数，')
console.log('    等于绕过「他听不见那句话」这个更要紧的问题，反倒去领一份好处。')
console.log('  · 「没人教、自己瞎坐的人不会走岔」——`goesAstray` 第一条就是它，')
console.log('    可这条路此刻**跑不出来**：`practise` 要 grasp 非空，而只有 `teach` 会写它。')
console.log('    手动往旗标里塞一个「没人教却在练」的人是伪造状态，验不了真东西。')
console.log('    要等「自己瞎坐」这件事真的在剧本里存在。')
console.log('  · 「能持续，但效果很弱」那一档没做——它要「修炼产出」，')
console.log('    一做就滑向完整功法系统，而这一章的范围是一门功法、一个师父、一次教学。')
console.log('  · 「以后可能忘掉」没做——那是另一个状态问题，不提前造。')

console.log(
  failed === 0
    ? '\n七道都过了。他教了，他很认真，而这中间隔着两样他给不了的东西。\n'
    : `\n${failed} 道没过。\n`,
)
if (failed > 0) process.exitCode = 1
