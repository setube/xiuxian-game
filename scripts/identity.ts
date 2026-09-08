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

import { createPinia, setActivePinia } from 'pinia'

import { CHAPTERS } from '../src/content/life/chapters'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'

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
 * 这个数是定的不是量的，理由跟 `attest.ts` 的 `MIN_SOURCE_LENGTH` 一样：
 * 它守的是一条纪律（**「正在做的事」得有人接手**），不是一个观测值。
 * 学童那次是 80%，学徒那次是 100%——真出问题的时候这个数很难看，
 * 不需要卡在小数点上。
 */
const TOLERANCE = 0.3

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

  const 到死 = new Map<string, number>()
  const 出现过 = new Map<string, number>()

  for (let i = 0; i < RUNS; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const character = useCharacterStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    const seen = new Set<string>()
    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((one) => !one.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
      seen.add(character.identity)
    }
    for (const id of seen) 出现过.set(id, (出现过.get(id) ?? 0) + 1)
    到死.set(character.identity, (到死.get(character.identity) ?? 0) + 1)
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
