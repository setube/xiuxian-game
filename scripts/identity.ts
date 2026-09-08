/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 身份有没有下家。
 *
 * ## 这一支守的是什么
 *
 * 2026-09-08 实测：**450 世的人死的时候，身份栏还写着「学童」**——
 * 他念了书、没考中，而**没有任何一卷内容接手他**。同一天里这个坑发作了三次：
 *
 *     学徒　　`youth.ts` 落了，六十岁咽气那天还是学徒　　　　已修（出师那一册）
 *     伙计　　`youth.ts` 落了，28 世 100% 挂到死　　　　　　 待定（终点是什么还没想清）
 *     学童　　`schooling.ts` 落了，450 世 80% 挂到死　　　　 已修（`exam` 三笔）
 *
 * 三次都是同一个形状：**一个「正在做的事」被写成了身份，而没人写它什么时候结束。**
 *
 * ## 为什么不能拿「到死还挂着的比例」一刀切
 *
 * 因为有些身份**本来就该挂到死**：
 *
 *     生员　中了秀才就是一辈子的秀才
 *     匠人　出了师就是匠人
 *     庶人　削了爵就是庶人
 *
 * 它们跟「学童」的差别在**语义**里——「学童」这个词自己含着一个终止条件
 * （不念书了就不是学童），「生员」没有。**而这件事代码里看不出来**：
 * 两者都是一个字符串，都由某一卷落下，都可能没有下家。
 *
 * 所以判据不猜，**读人标的那一格**（`Chapter.identityKind`）。
 * 这跟 `attest.ts` 那支同一个路子：机器守得住有没有标，守不住标得对不对。
 *
 * ## 三问，缺一不可
 *
 *     一、落了身份的章，`marks` 里得写 `identity`
 *     二、`marks` 里有 `identity` 的章，得标 `identityKind`
 *     三、标了「正在做的事」的，不该有人挂着它进棺材
 *
 * **第一问是这一支存在的直接理由**：查的时候有**五章**落了身份却没在 `marks` 里
 * 写 `identity`（`schooling`/`hardship`/`apprentice`/`royal`/`seeking`），
 * 其中一章是写这支门禁的人自己做的。`marks` 是这个项目守意图的机制，
 * 而这五章在这一格上是空的——**「学童」能活六天没人发现，这是原因之一**。
 *
 * ## 它守不住什么
 *
 * 标错了它认不出来：把「学童」标成「终点」，第三问就不问它了。
 * 那是人的活。这一支能做的是**让「没标」和「标了但没兑现」无处可藏**。
 *
 * 跑法：bun scripts/identity.ts
 */
import './lib/seeded'

import { CHAPTERS } from '../src/content/life/chapters'
import { mapShards, sumTallies } from './lib/parallel'
import { type IdentityShard } from './tasks/identity-lives'

/** 走多少世。身份变化不算稀有，但「到死还挂着」要看分布，少了看不准 */
const RUNS = 1200

/**
 * 一个身份至少要出现这么多世，那个比例才算数。
 *
 * **这一格是被自己的判据逼出来的。** 头一版 400 世，「伙计」只出现十几世，
 * 三颗独立种子跑出来是 11% / 0% / 6%——**一世的差别就是六个百分点**，
 * 而容差是 30%。也就是说伙计真要退化成无期的，在那个样本量下也看不出来：
 * 十一世里五六世挂到死，跟噪声长得一样。
 *
 * 这跟同一天定性 `seen`（0.67% 水位用 `=== 0` 判红）和 `ruin`（1–3% 水位
 * 断言一次模拟）踩的是同一个坑：**拿小样本判有无，等于掷骰子。**
 * 写这支门禁的人刚说完那句话，转头自己犯了一遍。
 *
 * 所以出现次数不够就**明说没量到**，不打勾——绿灯必须分得开
 * 「量过了没问题」和「压根没量到」。
 */
const MIN_SAMPLES = 30

/**
 * 一个「正在做的事」型身份，到死还挂着多少算过。
 *
 * **不是零**——它可以合理地不为零：一个人五十岁还在当伙计、临死那年才出师，
 * 都是真的人生。要的是**它不能是常态**。
 *
 * ## 这个数从 0.3 降到 0.2，中间还错定过一次 0.08
 *
 * 头一版定 0.3，理由是「真出问题的时候这个数很难看」。**实测证明不是**：
 * 「学童」修完之后仍有 10–15% 的人挂着它进棺材（真因是 `exam-first` 要求
 * 先生活着，而先生会自然老死），而 0.3 一次也没报。
 * 更糟的是**我提交那一轮恰好摇到 0%**，于是「修好了」这个结论是运气给的。
 *
 * 第二版拿当时的实测分布划线：真 bug 10–15%、自然波动 0–4%，取中间的 8%。
 * **那次划线用的是坏基线上的数**——「学童」那条路当时还锁着，
 * 而它一修好，两边的分布全变了。
 *
 * 第三版（现在这个）是在 `exam-first` 修好、采样污染也修好之后量的：
 *
 *     种子 b1　学童 0%　伙计 6%
 *     种子 b2　学童 0%　伙计 8%   ← 正好压在上一版那条线上
 *     种子 b3　学童 0%　伙计 7%
 *     种子 b4　学童 0%　伙计 9%   ← 直接越过它
 *
 * **伙计的自然基线就是 6–9%**，而上一版把线画在 8% —— 四颗种子里会报红一到两颗。
 * 那正是我批评过 `seen`（0.67% 水位用 `=== 0` 判红）的那个毛病，
 * 只不过换了个数量级。
 *
 * ⚠️ **而 b4 那一颗是在我改完 0.08、正要提交的时候才跑出来的**——
 * 前三颗（6/8/7）看着像「8% 刚好压线，勉强能用」，第四颗直接越过去。
 * **三颗种子不够，这是今天第三次在样本量上栽跟头。**
 *
 * 0.2 留出了两倍余量：真退化（学童那次 80%、学徒 100%、修好前的学童 10–15%）
 * 一律在它之上，而 6–8% 的自然波动一律在它之下。
 *
 * ⚠️ **这个数会过期，而且已经过期过两次**：一次是内容修好挪动了分布，
 * 一次是我在坏基线上定线。它变红的时候先问一句「是内容退化了，还是
 * **这条线本来就画在噪声里**」——判据的阈值也是判据的一部分（同
 * `gate-thresholds-drift`）。**在一个刚修好的基线上定阈值，比在坏的基线上定强得多。**
 *
 * ## 这条线是在什么基线上画的（下一个人判断它过期没有，靠这一段）
 *
 *     日子　　2026-09-08
 *     主干　　`540fdff` 之前那一版（含 `262f54b` 修完 `exam-first`、
 *             `0dc09c0` 修完 `candour` 挤占候选池、`dc268d8` 行为史与 `LifeEvent.chance`）
 *     量法　　四颗种子 b1–b4，每颗 1200 世，`scripts/identity.ts` 主进程直跑
 *     基线　　伙计 6 / 8 / 7 / 9%，学童 0 / 0 / 0 / 0%，学徒 0%，农家子 0–4%
 *
 * **写下来是为了让「它过期了」这件事可查。** 半年后有人看到伙计跑到 15%，
 * 他该先问「这中间往库里加了什么」，而不是「阈值该不该调」——
 * 没有这一段的话，那两个问题分不开。
 *
 * ⚠️ **判它红了先看实际数字，别先动这个阈值**：
 *
 *     伙计 12% 以上　多半是主干上加了新东西（那不是阈值的问题）
 *     伙计 9.5% 上下　那才是这条线定低了，重量四颗种子再抬
 */
const TOLERANCE = 0.2

/** 落了身份的章：扫它的 scenes，看有没有 `identity` 效果 */
function dropsIdentity(chapter: (typeof CHAPTERS)[number]): boolean {
  for (const scene of Object.values(chapter.scenes)) {
    for (const node of Object.values(scene.nodes)) {
      for (const effect of node.onEnter ?? []) {
        if (effect.type === 'identity') return true
      }
      for (const choice of node.choices ?? []) {
        for (const effect of choice.effects ?? []) {
          if (effect.type === 'identity') return true
        }
      }
    }
  }
  return false
}

/** 这一章落的都是哪几个身份 */
function identitiesOf(chapter: (typeof CHAPTERS)[number]): string[] {
  const found = new Set<string>()
  for (const scene of Object.values(chapter.scenes)) {
    for (const node of Object.values(scene.nodes)) {
      const all = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
      for (const effect of all) {
        if (effect.type === 'identity') found.add(effect.identity)
      }
    }
  }
  return [...found]
}

console.log(`\n=== 身份有没有下家（${RUNS} 世）===\n`)

let bad = 0

// ============================================================
// 一、落了身份的章，marks 里得写 identity
// ============================================================
{
  const missing = CHAPTERS.filter(
    (one) => dropsIdentity(one) && !one.marks.includes('identity'),
  ).map((one) => `${one.id}（落了 ${identitiesOf(one).join('、')}）`)

  if (missing.length > 0) {
    console.log(`  ✗ ${missing.length} 章落了身份，而 \`marks\` 里没写 identity：`)
    for (const one of missing) console.log(`      ${one}`)
    console.log('      marks 是这个项目守意图的机制，这一格空着，改动就没人看得见。')
    bad += 1
  } else {
    console.log('  ✓ 每一章落了身份的，`marks` 里都写着 identity。')
  }
}

// ============================================================
// 二、marks 里有 identity 的章，得标 identityKind
// ============================================================
{
  const unlabelled = CHAPTERS.filter(
    (one) => one.marks.includes('identity') && one.identityKind === undefined,
  ).map((one) => `${one.id}（落了 ${identitiesOf(one).join('、')}）`)

  if (unlabelled.length > 0) {
    console.log(`\n  ✗ ${unlabelled.length} 章落了身份，而没标它是终点还是正在做的事：`)
    for (const one of unlabelled) console.log(`      ${one}`)
    console.log('      这一格机器判不出来（「学童」和「生员」在代码里长得一样），必须人标。')
    bad += 1
  } else {
    console.log('  ✓ 每一章落了身份的，都标了终点还是正在做的事。')
  }
}

// ============================================================
// 三、标了「正在做的事」的，不该有人挂着它进棺材
// ============================================================
{
  /** 哪些身份是「正在做的事」。从人标的那一格读，不在这儿猜 */
  const transient = new Set<string>()
  for (const chapter of CHAPTERS) {
    if (chapter.identityKind !== '正在做的事') continue
    for (const one of identitiesOf(chapter)) transient.add(one)
  }

  /*
   * 这一段的单世模拟搬去了 `tasks/identity-lives.ts`，走法和采样点一步没动
   * （每落一次笔记一次 `character.identity`，不是每卷记一次——一个身份
   * 可能在一卷之内换掉，按卷采会漏）。判据全留在这儿。
   */
  const worn = sumTallies(
    await mapShards<IdentityShard>({ task: 'scripts/tasks/identity-lives.ts', runs: RUNS }),
  )
  const 出现过 = worn.everWorn
  const 到死 = worn.woreToDeath

  /**
   * 尺子自检：分片合回来的数没有走样。
   *
   * ## 这一条是 xiuxian-game-79 的打断实验逼出来的
   *
   * 它把任务里的 `woreToDeath.set(k, (get(k) ?? 0) + 1)` 改成 `set(k, 1)`
   * ——每片只记一个 1，不累加。**判据没红**：`sumTallies` 把五片的 1 加起来
   * 正好是 5，跟真实值撞上了，比例只是变小，没越过 `TOLERANCE`。
   *
   * 它判断这不值得修（要有人手改代码才会发生）。我不同意：**这不是「故意写错」
   * 才会撞上的洞，任何让某一片少记、漏记、或者 `sumTallies` 挑错合并分支的
   * 情形都会落在同一处**，而上面那条比例判据对它是瞎的——因为
   * `比例 = d / n` 的分子分母来自两张独立的表，一起变小就看不出来。
   *
   * 而堵它只要一行：**每个人只死一次**，所以「到死」各身份加起来必然等于世数。
   * 这个恒等式一句话就验完了分片合并、`runs` 分母、和数据完整性三件事。
   *
   * `出现过` 那张表没有同样强的恒等式（一世可挂几个身份，只能验 `>= 世数`），
   * 所以只顺带验个下界。
   */
  {
    let 死了几世 = 0
    for (const [, n] of 到死) 死了几世 += n
    let 挂过几次 = 0
    for (const [, n] of 出现过) 挂过几次 += n

    if (死了几世 !== worn.runs) {
      console.log(
        `\n  ✗ 分片合回来的数走样了：各身份「挂到死」加起来 ${死了几世}，而跑了 ${worn.runs} 世。` +
          `\n    每个人只死一次，这两个数必须相等——比例判据看不出这种坏法（分子分母一起变小）。`,
      )
      bad += 1
    } else if (挂过几次 < worn.runs) {
      console.log(
        `\n  ✗ 分片合回来的数走样了：各身份「出现过」加起来才 ${挂过几次}，少于 ${worn.runs} 世。`,
      )
      bad += 1
    } else {
      console.log(
        `\n  ✓ 尺子自检：${worn.runs} 世，「挂到死」各身份加起来正好 ${死了几世}——分片没合丢。`,
      )
    }
  }

  if (transient.size === 0) {
    console.log('\n  ✗ 一个「正在做的事」型身份也没标到——第三问什么也没量。')
    bad += 1
  } else {
    const 挂到死: string[] = []
    const 没量到: string[] = []
    for (const id of transient) {
      const n = 出现过.get(id) ?? 0
      if (n === 0) {
        没量到.push(`${id}：${RUNS} 世里一次也没出现`)
        continue
      }
      const d = 到死.get(id) ?? 0
      const 比例 = d / n
      console.log(`\n  「${id}」出现 ${n} 世，其中 ${d} 世挂到死（${(比例 * 100).toFixed(0)}%）`)
      if (n < MIN_SAMPLES) {
        没量到.push(`${id}：只出现 ${n} 世，不足 ${MIN_SAMPLES} 世——这个比例是噪声`)
        continue
      }
      if (比例 > TOLERANCE) {
        挂到死.push(`${id}：${d}/${n} 世（${(比例 * 100).toFixed(0)}%）挂着它进棺材`)
      }
    }
    if (挂到死.length > 0) {
      console.log(`\n  ✗ ${挂到死.length} 个「正在做的事」成了无期的：`)
      for (const one of 挂到死) console.log(`      ${one}`)
      console.log('      得有一卷内容接手他——不是加个计时器，是写「他后来做什么去了」。')
      bad += 1
    }
    /*
     * 样本不够也要报，而且**跟报错分开报**。
     *
     * 它不是「有问题」，是「这一格这一轮没量到」——**而绿灯必须分得开
     * 「量过了没问题」和「压根没量到」**。混在一起报，人会把后者读成前者。
     */
    if (没量到.length > 0) {
      console.log(`\n  ⚠ ${没量到.length} 个身份这一轮没量到：`)
      for (const one of 没量到) console.log(`      ${one}`)
      console.log(`      不判红——样本不够只说明这一轮没掷到，不说明它有问题。`)
      console.log(`      但也别把上面那几个 ✓ 当成它们也过了。`)
    }
    if (挂到死.length === 0 && 没量到.length < transient.size) {
      console.log('\n  ✓ 量得到的那几个「正在做的事」，都有一卷内容接手。')
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  一个人做过什么，和他此刻是什么，是两件事。\n')
}
