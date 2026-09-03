/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 那册书的漏斗。
 *
 * 「多年以后才明白当年捡到的不是普通书」是整个凡人阶段的落点。
 * 全量走查只给一个总数，说不清是哪一环卡住了：
 * 是没走上山道、没看见人、掷出来的不是修士、还是在渡口没走过去。
 *
 * 这里把几道关卡逐级数出来，好知道该拧哪一颗螺丝。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

/**
 * ## 世数按最后那一格定
 *
 * 三百世够看前几格，不够看最后那一句。感知层从一行阈值
 * （`insight ≥ 34`，三百世三百个人全都过）换成「那天他心里装着什么」
 * 之后，这条链多了两道真会筛人的关——而它们是**一道乘法里的两环**：
 *
 *     这辈子拿到过那册书　　8.3%（三百世）→ 3.9%（一千二百世）
 *     多年以后有人点破　　　2.7%（三百世）→ 1.8%（一千二百世）
 *
 * 这不是内容坏了，是感知层实打实吃掉的：注意力落在那儿的只剩五成半，
 * 其中又有四分之一把人看成了醉汉或死人，绕开走了。**这个代价是明知故犯的**——
 * 那一关从前不存在，而「机会摆在面前，看不看得见是另一回事」这句话
 * 得有人真的看不见才算数。
 *
 * ## 那两个百分比不是同一个世数下量的，这里要说清楚
 *
 * 改完先跑了七百世，最后那格印出 5 个人（0.7%）；一千二百世再跑，
 * 是 22 个（1.8%）。两批差了近一倍——因为那两格高度相关（被点破的人
 * 是拿到书的人的子集），一批偏低就一起偏低，七百世那次两格都低了两个标准差。
 *
 * **一个期望五的格子，下一批完全可能是一**，而 `> 0` 那条门禁红起来的时候，
 * 红的原因不是内容坏了，是抽样。**一支会随机红灯的门禁比没有门禁更糟**——
 * 它会把对的判成错的。所以世数定在一千二。
 */
const RUNS = 1200

/**
 * 山道那条链。
 *
 * ## 这几格从前量的不是它宣称的东西
 *
 * 旧判据认的是 `saw-wounded-man`、`fled-wounded-man`、`saved-a-man`
 * 这几面旗子——**源码里一面也没有**。`met-adept` 倒是存在，
 * 可那是父亲的一段过去（「在路上遇见过一个落魄修士」）的篇目名，
 * 不是世界旗标，`hasFlag` 永远查不到它。
 *
 * 于是「看见了人」实际上量的是「被邪修抓过，或者手里有那册书」，
 * 「走过去了」实际上量的是「被邪修抓过」——七个人。
 * 而下一格「拿到书」是十六个，**过关率印出来 229%**：
 * 一个漏斗报出后一关比前一关宽，这本身就是它坏了的证据，
 * 可它印了很多遍，因为**这一支从前一道门禁也没有**。
 *
 * ## 中间那一格是后来劈开的
 *
 * 「看见了人」曾经是一格，实测过关率 100%——那一行阈值不筛人。
 * 现在它是两格：**先问他有没有把注意力放在那儿，再问他有没有停下来。**
 * 中间夹着一道从前不存在的关：看清了，判断了，认定那不过是个醉汉，
 * 于是绕开走了。三档各自的占比归 `scripts/attention.ts` 报，
 * 这里只把它们串进漏斗，好看清哪一环吃掉了多少人。
 *
 * ## 这几格量的是「最后一回」，不是「这辈子」
 *
 * 山道有两个入口：年表上那件事（`omen-wounded`，一辈子只掷一次），
 * 以及「一天」里他自己走出门撞上的（`day.ts` 三处 `next: 'omen:wounded'`）。
 * 后一条绕开事件系统，所以**同一个人可以走两回山道**——
 * 人生里同一类事撞上两回，本来就正常。
 *
 * 而 `wounded-outcome` 只有一个格子，第二回会把第一回盖掉。
 * 底下那格「拿到过那册书」因此不从旗标数，改从背包数：
 * **书拿到手就不会消失，旗标却会被下一回覆盖。**
 */
const chain = {
  上了山道: 0,
  注意力放在了那儿: 0,
  没当成别的东西: 0,
  最后那回伸手扶了: 0,
}

/** 走到「他把这人看成什么」之后，读成这两样的人不会停下来。跟场景里那两条 branches 是一回事 */
const WALKS_AWAY = new Set(['醉汉', '死人'])

/**
 * 渡口那一节。
 *
 * **它不是山道的下一环**，所以单独一段印。十六岁那年谁都可能走上前搭话，
 * 手里有没有那册书是另一回事——旧版把六格串成一条，
 * 于是这里的过关率印出来是 438%。
 */
const river = {
  在渡口走上前: 0,
  有人点破: 0,
}

/** 山道那一卷各个出口分别落了几个人。拼错一个字，这张表上就会多出一行没见过的 */
const outcomes = new Map<string, number>()

/** 这辈子拿到过那册书。从背包数——它记的是「有没有」，不是「最后一回是什么」 */
let carriesBook = 0

/**
 * 拿到书之后又走了一回山道的人，第二回落在哪个出口。
 *
 * 这是「同一个人走两回山道」的下界，也是这一支唯一能直接看见它的地方。
 * 印出来是为了让**旗标被覆盖这件事有据可查**——
 * `leanings.ts` 和 `wishes.ts` 里有两个火种认的正是 `wounded-outcome`，
 * 它们认的其实是「最后一回」。
 */
const overwritten = new Map<string, number>()

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  if (world.hasFlag('event:omen-wounded')) chain.上了山道 += 1
  // 那天他有没有把注意力放在那儿。这一格从前是一行属性阈值，量出来人人都过
  if (world.getFlag('attention') === 'caught') chain.注意力放在了那儿 += 1
  // 看进去了，还得没把他当成醉汉或死人——那两种读法会让他绕开走
  const reading = world.getFlag('wounded-reading')
  if (
    world.getFlag('attention') === 'caught' &&
    typeof reading === 'string' &&
    !WALKS_AWAY.has(reading)
  ) {
    chain.没当成别的东西 += 1
  }

  const outcome = world.getFlag('wounded-outcome')
  if (typeof outcome === 'string') {
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1)
    if (outcome.startsWith('lift-')) chain['最后那回伸手扶了'] += 1
  }

  if (character.has('thin-book')) {
    carriesBook += 1
    // 书在手里，可这一卷给他记的出口不是修士那一档——他后来又走了一回山道
    if (outcome !== 'lift-adept') {
      const where = typeof outcome === 'string' ? outcome : '（这一卷根本没结算过）'
      overwritten.set(where, (overwritten.get(where) ?? 0) + 1)
    }
  }

  if (
    world.hasFlag('met-stranger') ||
    world.hasFlag('knows-the-book') ||
    world.hasFlag('marked-known')
  ) {
    river.在渡口走上前 += 1
  }
  if (world.hasFlag('knows-the-book')) river.有人点破 += 1
}

console.log(`\n=== 那册书的漏斗（${RUNS} 世）===\n`)
console.log('  一、山道。前四格量的是「最后那回」，末一格量的是「这辈子」：\n')
let previous = RUNS
for (const [label, count] of Object.entries(chain)) {
  const ofAll = ((count / RUNS) * 100).toFixed(1)
  const ofPrev = previous === 0 ? '—' : `${((count / previous) * 100).toFixed(0)}%`
  console.log(
    `  ${label.padEnd(20)} ${String(count).padStart(5)}   占全体 ${ofAll.padStart(5)}%   过关率 ${ofPrev}`,
  )
  previous = count
}
console.log(
  `  ${'这辈子拿到过那册书'.padEnd(20)} ${String(carriesBook).padStart(5)}   ` +
    `占全体 ${((carriesBook / RUNS) * 100).toFixed(1).padStart(5)}%   （从背包数，不接上一行）`,
)

/**
 * 那一档没走到「有得选」的人。
 *
 * 这一行从前印的是一个 0——`omen:wounded` 按 `insight ≥ 34` 或 `body ≥ 52`
 * 分岔，而年表上那句注释写着「看不看得见那个人、他又是谁，才是真正的筛子」。
 * 十一种出身里只有农户两项都够不着，童年那些事到十岁之前就把属性推过了线。
 * **一个满格的过关率读起来像「这一关很宽」，而不像「这一关根本不存在」**，
 * 所以那个 0 单独占了一行，好让它自己说话。
 *
 * 现在它不是 0 了，而且不是一个数是三个：没注意到、看见了没放在心上、
 * 看见了理解成另一回事。三者在人生意义上完全不同，
 * 各自占多少由 `scripts/attention.ts` 报——这里只报它们加起来吃掉了多少人。
 */
const shutOut = chain.上了山道 - chain.没当成别的东西
console.log(
  `  ${'（其中没走到有得选的）'.padEnd(20)} ${String(shutOut).padStart(5)}   ` +
    (shutOut === 0 ? '  ← 这一档一个人也没落到，跟「真正的筛子」那句话对不上' : ''),
)

console.log('\n  二、十六岁那年的渡口。这两格的分母是全体，不是上一段的出口：\n')
for (const [label, count] of Object.entries(river)) {
  const ofAll = ((count / RUNS) * 100).toFixed(1)
  console.log(`  ${label.padEnd(20)} ${String(count).padStart(5)}   占全体 ${ofAll.padStart(5)}%`)
}

console.log('\n  三、山道那一卷各个出口（人数，不是占比——三百世下每格都是个位数）：\n')
for (const [id, n] of [...outcomes.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${id.padEnd(22)} ${String(n).padStart(4)}`)
}

const adept = outcomes.get('lift-adept') ?? 0
if (overwritten.size > 0) {
  console.log('\n  四、拿到书之后又走了一回山道的人，第二回落在哪儿：\n')
  for (const [where, n] of [...overwritten.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${where.padEnd(22)} ${String(n).padStart(4)}`)
  }
  console.log(`\n  这 ${carriesBook - adept} 个人的 wounded-outcome 记的是第二回，第一回被盖掉了。`)
}

/**
 * 门禁。
 *
 * 头两条量的是**漏斗还是不是漏斗**——后一关比前一关宽，
 * 或者某一关一个人也过不去，都说明判据认错了东西。
 * 旧版那三面不存在的旗子，任何一条都拦得住。
 */
console.log()
{
  let bad = 0

  const steps = Object.entries(chain)
  for (const [label, count] of steps) {
    if (count === 0) {
      console.log(`  ✗ 「${label}」一个人也没过去——这一关认的东西怕是根本不会被写进去。`)
      bad += 1
    }
  }
  for (let i = 1; i < steps.length; i += 1) {
    const [label, count] = steps[i]!
    const [before, wider] = steps[i - 1]!
    if (count > wider) {
      console.log(`  ✗ 「${label}」${count} 个人，比它前一关「${before}」的 ${wider} 个还多。`)
      console.log('    一条链上后一环宽过前一环，那就不是链。')
      bad += 1
    }
  }

  /**
   * 三、两边对账：旗标那边说「最后那回遇见的是修士」，背包那边说「有那册书」。
   *
   * **同一件事从两个互不相干的地方各数一遍**，是这几条里最便宜也最凶的一条：
   * 判据认错东西的时候，两个数几乎不可能还落在一条不等式的同一侧。
   *
   * 这里守的是**包含关系**，不是相等：拿到书的人只会多不会少——
   * 走第二回山道会把旗标盖掉，却盖不掉背包里的书。
   * 反过来若 `lift-adept` 比拿到书的人还多，那就是发书那一步真的漏了。
   */
  if (adept > carriesBook) {
    console.log(
      `  ✗ 旗标那边有 ${adept} 个人最后那回遇见的是修士，` +
        `可背包里有书的只有 ${carriesBook} 个——遇见了却没拿到书。`,
    )
    bad += 1
  }
  if (carriesBook === 0) {
    console.log('  ✗ 一个人也没拿到那册书——通往修行的那条路整个断了。')
    bad += 1
  }

  // 四、点破那一句，得有人听见过。它是整个凡人阶段的落点
  if (river.有人点破 === 0) {
    console.log('  ✗ 一个人也没被点破——「多年以后才明白」这句话没有落地。')
    bad += 1
  }
  // 被点破的人不可能多过拿到书的人：渡口那一节认的就是手里那册书
  if (river.有人点破 > carriesBook) {
    console.log(`  ✗ 被点破的有 ${river.有人点破} 个，可拿到书的只有 ${carriesBook} 个。`)
    bad += 1
  }

  if (bad > 0) {
    console.log(`\n  ✗ ${bad} 项不成立。\n`)
    process.exitCode = 1
  } else {
    console.log('  一环比一环窄，两边对得上账，而最后那一句总有人听见。\n')
  }
}
