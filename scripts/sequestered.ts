/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 高墙里头的人，选项该跟外头不一样。
 *
 * ## 15.md 那条硬规则
 *
 * > 不做「通用行为池 + 文本替换」——**同一个选项对所有出身都开着，
 * > 只是把里头的词换一换**，那是最不像那个时代的一件事。
 *
 * 用户在 21.md 拍板过三件「最值得立刻动手的」，这是第三件（前两件是出处标注
 * 和过程中状态，都已落地）。
 *
 * ## 病不在「没做」，在「逐处补的」
 *
 * 15.md 逐处核过「皇子 → 去私塾 → 找活赚钱」那条路，结论是**大部分已经收窄了**：
 *
 *     routine.ts:258　出去做工　　✅ `living notIn ['palace','manor']`
 *     routine.ts:389　出门做工　　✅ 同上，注释写着「高墙里头的人不出去做工」
 *     routine.ts:96 　在外面疯跑　✅ `dwelling kind ['宅','寺','无']`
 *
 * **补一处是一处，而没有任何机制保证下一个写选项的人会记得补。**
 * 这跟 `{elder}` 那件事形状完全一样：占位符防住了称谓那一层，
 * 而硬写的字绕过去了。
 *
 * 实测（400 世，2026-09-08）漏网的还有四处，措辞都是「帮家里干活」
 * 「照旧干活，家里不能停」——**王府世子和皇子照样读得到**：
 *
 *     illness.ts:89　　照旧干活，家里不能停
 *     day.ts:66/137　 帮家里干活
 *     leaving.ts:72　 接下来做几天
 *     dearth.ts:164　 你出去做工
 *
 * ## 判据问什么：选项集合的差异，不是「有没有 requires」
 *
 * **「每个选项都必须有 `requires`」是错的问法**——那会逼出一堆形式主义的条件，
 * 而「跟着娘」「睡觉」这类选项本来就该人人都有。
 *
 * 要抓的是**同一个选项对所有出身都开着，而它显然不该**。所以跑真世，
 * 按出身收集「他实际见到过哪些选项」，然后比高门和寒门的集合——
 * **两者高度重合就是「通用行为池」的症状**。
 *
 * ⚠️ 但重合度本身**不能直接当判据**：实测高门见过 100 个选项、86 个对寒门也开着，
 * 而那 86 个里绝大多数（吃饭、睡觉、跟着娘）本来就该共享。
 * **判据只报那些语义上不该共享的**——见 `MENIAL`。
 *
 * ## 这一支不判「哪些词算低贱」，那是人的活
 *
 * `MENIAL` 是一张人写的表。它认不出的措辞就漏过去，认错的会误报——
 * 跟 `attest.ts` 那支同一个立场：**机器守得住「这个词出现在不该出现的地方」，
 * 守不住「这个词算不算低贱」**。
 *
 * 表里的词照库里真写的字抄（`grep label` 出来的），不是想出来的——
 * 2026-09-08 在 `whence` 上栽过一次「按印象写关键词表」，
 * 库里写的是「你成**了**亲」而表里写的是「成亲」，于是每条正常的边都被报成无来源。
 *
 * 跑法：bun scripts/sequestered.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'

/**
 * 走多少世。高门出身稀有（court/manor 加起来不到 2%），少了采不到。
 *
 * ## ⚠️ 600 世一轮只见得到一部分漏网——这一支的绿灯要多跑几颗种子才作数
 *
 * 2026-09-08 提交时三处堵完、跑绿；**半小时后再跑，抓到第四处**
 * （`ask:around#let-it-be`「接着干活去」）。四次跑抓到的不是同一批：
 *
 *     一轮只走到一部分卷，而高墙里头的日子本来就稀有
 *     ——1577 步采样听着不少，摊到几十卷上每卷才几步
 *
 * 所以**这一支报绿只说明「这一轮没撞上」**，跟 `identity` 那支的采样量问题
 * 是同一族（那次是伙计只出现十几世、一世差六个百分点）。
 *
 * **判它真绿要跑四五颗种子取并集**：
 *
 *     for s in q1 q2 q3 q4 q5; do SEED=$s bun scripts/sequestered.ts; done
 *
 * 不把 `RUNS` 一口气抬上去，是因为它要跟另外七十几支一起跑
 * （同 `gate-thresholds-drift` 那条：正常那八成的路径不该为一成的坏运气一起变慢）。
 */
const RUNS = 600

/**
 * 高墙里头的日子。
 *
 * ## ⚠️ 判的是 `living`（他此刻过什么日子），不是 `origin`（他生在哪一家）
 *
 * 头一版按出身判，于是把 `routine:adult#earn` 报成了漏网——**而那一处早就
 * 收窄了**（`requires: [{ living: { notIn: ['palace','manor'] } }]`）。
 * 它被报出来是因为**削爵之后 `living` 变成 `fallen`，那扇门本该开**：
 *
 * > 门第塌了的宗室，是真的要出去挣这口饭的——而那正是那一册要说的话。
 * > （`routine.ts:262` 的注释）
 *
 * **判据该跟被测对象用同一个维度。** 那条 `requires` 写的是 `living notIn`，
 * 判据却按 `origin` 问，于是把「设计如此」读成了「漏了」——
 * 跟 `attest` 和 `doors` 头一版栽的是同一族：**把做过的判断报成欠账**。
 *
 * 值照 `content/origins.ts` 和 `routine.ts` 那几条 `requires` 抄，不另立名字。
 */
const SEQUESTERED_LIVING: readonly string[] = ['palace', 'manor']

/**
 * 这些选项对高墙里头的人不该开着。
 *
 * **照库里真写的 `label` 抄的**，用 `grep "label:" src/content/life/*.ts` 出来的原句。
 * 按印象写会漏——「做工」和「干活」在库里是两个词，而「照旧干活，家里不能停」
 * 两个都不带。
 *
 * 认的是**动作**不是身份：一个王府世子可以「跟着爹去看田」（那是巡视），
 * 不能「帮家里干活」（那是他家没有的事）。
 */
const MENIAL: readonly string[] = ['做工', '干活', '做几天', '讨饭', '借粮', '卖了']

interface Leak {
  where: string
  label: string
}

console.log(`\n=== 高墙里头的人，选项该跟外头不一样（${RUNS} 世）===\n`)

let bad = 0

const 见过 = new Map<string, string>()
/** 采到多少步是在高墙里头过的日子。没有这个数，底下那一条会在「一步也没采到」时打勾 */
let 高墙里的步数 = 0

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

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((one) => !one.locked)
    if (open.length === 0) break

    /*
     * **每一步现读一次**，不是世初读一次。
     *
     * 一个王府世子在削爵那一年之前之后是两种人：`living` 从 `manor` 变成
     * `fallen`，而「出去做工」那扇门正是那一刻才该开的。
     * 按出身采样分不出这两段人生，会把「设计如此」报成「漏了」。
     */
    const living = String((character as unknown as { living?: { id?: string } }).living?.id ?? '?')
    if (SEQUESTERED_LIVING.includes(living)) {
      高墙里的步数 += 1
      for (const one of open) {
        const choice = (one as unknown as { choice?: { id?: string; label?: string } }).choice
        if (choice?.id) 见过.set(`${narrative.sceneId}#${choice.id}`, choice.label ?? '')
      }
    }

    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
}

// ============================================================
// 一、采到高墙里头的日子了没有——先验尺子量到了东西
// ============================================================
{
  if (高墙里的步数 === 0) {
    console.log(`  ✗ ${RUNS} 世里一步也没在高墙里头过——这一支什么也没量。`)
    bad += 1
  } else {
    console.log(
      `  ✓ 采到高墙里头的日子 ${高墙里的步数} 步（living 是 ${SEQUESTERED_LIVING.join('、')}）。`,
    )
  }
}

// ============================================================
// 二、高墙里头的人读到了不该读的选项
// ============================================================
{
  const leaks: Leak[] = []
  for (const [where, label] of 见过) {
    const hit = MENIAL.find((one) => label.includes(one))
    if (hit !== undefined) leaks.push({ where, label })
  }

  if (leaks.length > 0) {
    console.log(`\n  ✗ ${leaks.length} 处：高墙里头的人读到了不该读的选项：`)
    for (const one of leaks) {
      console.log(`      ${one.where}：「${one.label}」`)
    }
    console.log("      收窄它：`living notIn ['palace','manor']`，照 `routine.ts:258` 那条写。")
    bad += 1
  } else {
    console.log('\n  ✓ 高墙里头的人没读到「做工」「干活」那一类选项。')
  }
}

// ============================================================
// 三、尺子自检：喂它一条该抓的和一条不该抓的
// ============================================================
{
  const 该抓 = MENIAL.some((one) => '帮家里干活'.includes(one))
  const 不该抓 = MENIAL.some((one) => '跟着娘'.includes(one))
  const 原句该抓 = MENIAL.some((one) => '照旧干活，家里不能停'.includes(one))

  const broken: string[] = []
  if (!该抓) broken.push('「帮家里干活」没被认出来——表太窄')
  if (不该抓) broken.push('「跟着娘」被认成低贱活计——表太宽')
  if (!原句该抓) broken.push('「照旧干活，家里不能停」没被认出来——只认了「做工」漏了「干活」')

  if (broken.length > 0) {
    console.log(`\n  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log('  ✓ 尺子自检：库里的原句认得出，寻常选项放得过。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  同一个词换个人说，不是同一件事。\n')
}
