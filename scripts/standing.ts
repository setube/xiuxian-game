/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 家业这条线的走查。
 *
 * `standing` 是隐藏刻度，绝不上界面（`stores/household.ts` 明写着这一条）。
 * 玩家读到的只有 `outlook` 那一句「家里不缺什么」／「紧巴」。
 * 正因为它不上界面，它坏掉的时候**界面上一个字也不会变**——
 * 只会变成人人读到同一句。
 *
 * ## 这一支是从一次误诊里长出来的
 *
 * 先前有一支临时探针报「十一种出身的家境全部超出出身表」，看着像立基没读出身表。
 * 真相是**采样点错了**：它读的是内容跑过一段之后的值，而家境本来就该在一生里漂。
 * 换成「立基之后、一次也没选之前」再量，十一种出身一格没出界。
 *
 * 换对采样点之后，同一次采集露出了真正的毛病：**咽气那年十一种出身里有七种
 * 的中位数顶到上限 100**——人人晚年巨富。病根不在哪个数太大，在
 * **日常的涨压倒了一切往下拿的东西**：`routine` 后半生三卷里，
 * 「守着家里的活计」「把手上的事做扎实」这些**维持性**的动作也在往上抬家境，
 * 而它们一辈子要停二十几次。
 *
 * 所以这一支同时钉住两件事：**采样点**（第一条），和**走势**（第二、三、四条）。
 *
 * ## 三条走势判据的问法都换过一次
 *
 * 头一版问的是「跌过吗」「顶格吗」「有几档」，三条**在坏掉的时候全是绿的**。
 * 搭一个把数值还原成改前的对照组并排跑，才看出来该问什么：
 *
 *     　　　　　　　　　　　改前　　　改后
 *     咽气中位　　　　　　　  97　　　  59
 *     后半生往下走的步数　　 16%　　　 50%
 *     最挤的那个取值　　　100（46%）　60（3%）
 *     面板上最常见的那一句　88%　　　 44%
 *
 * 左边那一列每个数都说得出「这不像一个人的一生」，而头一版的三个问法
 * 一个也接不住它们。**判据写完得先问：这个机制要是根本不存在，它还会绿吗。**
 *
 * 跑法：bun scripts/standing.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS, originById } from '../src/content/origins'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import type { OriginId } from '../src/types/game'

/**
 * 走查跑多少世。
 *
 * 这一支的四条判据都落在**比例**上，分母是四百世或者四千多步，
 * 不像别的走查那样得等某一格稀事件攒够样本。四百世下这几个比例在两三个点内晃，
 * 而判据离它们都有二十个点以上的余地。
 *
 * 表里那两行稀出身（`manor` / `court` 各三五个人）是给人看形状的，不是给人读数的——
 * 第一条查的是「每个人都落在自己那一行的区间里」，那是逐个人查的，跟样本厚薄无关。
 *
 * 一世要走完一辈子，四百世四十秒上下。
 */
const RUNS = 400

/** 后半生从哪一岁算起。十六岁是人生阶段的变化点，不是检测线 */
const LATER_LIFE_FROM = 17

interface Life {
  origin: OriginId
  /** 立基那一刻：出身表掷完，一次也没选之前 */
  founded: number
  /** 咽气那年 */
  final: number
  finalOutlook: string
}

const lives: Life[] = []
/** 十七岁以后，家境往下走过几步 / 一共动过几步。这两个数是第二条的分子分母 */
let downSteps = 0
let allSteps = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const household = useHouseholdStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  const origin = household.origin
  const founded = household.standing

  story.begin()

  let previous = household.standing
  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const now = household.standing
    // 岁数在每一步之后读，因为效果里的 time 刚刚推过它
    if (character.age >= LATER_LIFE_FROM && now !== previous) {
      allSteps += 1
      if (now < previous) downSteps += 1
    }
    previous = now
  }

  lives.push({
    origin,
    founded,
    final: household.standing,
    finalOutlook: household.outlook,
  })
}

function median(v: readonly number[]): number {
  const s = [...v].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

const pct = (part: number, whole: number) =>
  whole === 0 ? '  —  ' : `${((part / whole) * 100).toFixed(0)}%`.padStart(5)

// —— 表一：立基那一刻 vs 咽气那年，按出身 ——
console.log(`\n=== 家业这一辈子（${RUNS} 世）===\n`)
console.log('  出身      出身表    立基中位  咽气中位   人数')
console.log('  ' + '─'.repeat(48))
for (const origin of ORIGINS) {
  const mine = lives.filter((life) => life.origin === origin.id)
  if (mine.length === 0) continue
  const table = originById(origin.id).standing
  console.log(
    `  ${origin.id.padEnd(8)}${String(table.from).padStart(3)}–${String(table.to).padEnd(4)}  ` +
      `${String(median(mine.map((l) => l.founded))).padStart(6)}  ` +
      `${String(median(mine.map((l) => l.final))).padStart(8)}  ` +
      `${String(mine.length).padStart(5)}`,
  )
}

// —— 表二：咽气那年，玩家读到的是哪一句 ——
// 分档不写阈值，直接拿 store 自己那句话当键：`outlook` 改了这里自动跟上
const byOutlook = new Map<string, number>()
for (const life of lives)
  byOutlook.set(life.finalOutlook, (byOutlook.get(life.finalOutlook) ?? 0) + 1)

console.log(`\n  咽气那年，人物面板上那一句：`)
for (const [line, n] of [...byOutlook.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${pct(n, RUNS)}  ${line}`)
}

console.log(
  `\n  十七岁以后，家境动过 ${allSteps} 步，其中往下走的 ${downSteps} 步` +
    `（${((downSteps / Math.max(1, allSteps)) * 100).toFixed(0)}%）`,
)

// —— 门禁 ——
console.log()
{
  let bad = 0

  /**
   * 一、立基那一刻，每个人都落在自己出身表的区间里。
   *
   * 区间从 `originById` 现读，一个数也不抄。出身表改了这一条自动跟上。
   *
   * 这一条钉的是**采样点**：它是全套里唯一一个在 `begin()` 之前采集的地方。
   * 先前那次误诊——「十一种出身全部超界」——正是把这个采样点挪到了内容跑过之后。
   * 家境在一生里漂是对的；漂了就说立基坏了，是把尺子放错了地方。
   */
  const outOfTable = lives.filter((life) => {
    const table = originById(life.origin).standing
    return life.founded < table.from || life.founded > table.to
  })
  if (outOfTable.length > 0) {
    const one = outOfTable[0]!
    const table = originById(one.origin).standing
    console.log(
      `  ✗ ${outOfTable.length} 个人立基就出了出身表的界，` +
        `例如「${one.origin}」掷到 ${one.founded}，而表上写着 ${table.from}–${table.to}。`,
    )
    bad += 1
  }

  /**
   * 二、后半生的涨跌不许一边倒。
   *
   * **这一条是这一支的重心，而它的问法换过一次。**
   *
   * 头一版问的是「后半生跌过吗」，那个问法**在坏掉的时候照样是绿的**：
   * `routine:prime` 本来就有两处往下拿的（把老人接过来照看、家里添了孩子），
   * 所以「跌过」这件事一直是真的——跌的不是没有，是**跌不过涨**。
   * 一条只问在不在的判据，在这儿量不到那个差别。
   *
   * 换成问**步数占比**就分得清了。搭一个把七处数值还原成改前的对照组，
   * 两边并排跑四百世：
   *
   *     改前　往下走 595/3717 步 = 16%　　咽气中位 97
   *     改后　往下走 2255/4473 步 = 50%　 咽气中位 59
   *
   * 四分之一不是从这两个数里挑出来的，它是「一边倒」这个词的语义线：
   * 一条有涨有跌的线，往下的步数不该少到只剩四分之一。
   * 16% 落在线下，50% 落在线上——这两个数会漂，那条线不会。
   */
  if (allSteps === 0) {
    console.log('  ✗ 十七岁以后家境一步也没动过——这条判据根本没被验过。')
    bad += 1
  } else if (downSteps / allSteps < 0.25) {
    console.log(
      `  ✗ 十七岁以后家境动的 ${allSteps} 步里，只有 ${downSteps} 步是往下走的。` +
        `\n    家业成了一台只进不退的棘轮——那不是一个人的一生该有的形状。`,
    )
    bad += 1
  }

  /**
   * 三、咽气那年不许挤在同一个数上。
   *
   * 不问「顶不顶格」——那要先知道上限是多少，而且顶格只是挤堆的一种长法。
   * 直接问**最挤的那个取值占多少人**：一把零到一百的刻度，
   * 任何单一取值占到四分之一人群，它就分不开人了，那个值是不是端点无所谓。
   *
   *     改前　最挤的是 100，占 46%
   *     改后　最挤的是  60，占  3%
   *
   * 四分之一跟上一条同源，也是同一个意思：这把尺子还分不分得开人。
   */
  const counts = new Map<number, number>()
  for (const life of lives) counts.set(life.final, (counts.get(life.final) ?? 0) + 1)
  const [crowdedValue, crowdedCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!
  if (crowdedCount / RUNS > 0.25) {
    console.log(
      `  ✗ ${pct(crowdedCount, RUNS).trim()} 的人咽气那年家境都正好是 ${crowdedValue}。` +
        `\n    这把刻度此刻分不出这些人。`,
    )
    bad += 1
  }

  /**
   * 四、面板上那句话，不许一句话包办大多数人。
   *
   * 档位和阈值一个也不写在这儿：直接把 `household.outlook` 印出来的那句话当键，
   * 那一句改了、档位加了减了，这一条自动跟着变——**门禁里不留字段名清单**。
   *
   * 也不问「有几档」。改前是四档，改后是五档，**只数档数分不清好坏**：
   *
   *     改前　88% 的人读到「家里不缺什么。」
   *     改后　44%
   *
   * 一句话被七成以上的人读到，它就不再是「你家的光景」，而是一句旁白。
   * 这种坏法在界面上看不出异样——每个人的人物面板都好好地写着一句通顺的话。
   */
  const [commonLine, commonCount] = [...byOutlook.entries()].sort((a, b) => b[1] - a[1])[0]!
  if (commonCount / RUNS > 0.7) {
    console.log(
      `  ✗ ${pct(commonCount, RUNS).trim()} 的人咽气那年读到的是同一句：「${commonLine}」。` +
        `\n    这一句此刻说的不是他家的光景，是一句旁白。`,
    )
    bad += 1
  }

  /**
   * 五、这一支自己的覆盖率。
   *
   * 前四条都建立在「样本里真有那么多种人」上。十一种出身没掷全、
   * 或者一世也没走到十七岁以后，上面几条会安安静静地全绿——
   * **没查到和查过了长得一模一样。**
   */
  const originsSeen = new Set(lives.map((life) => life.origin)).size
  console.log(
    `  覆盖：${RUNS} 世 / ${originsSeen} 种出身 / ` +
      `十七岁以后采到 ${allSteps} 步家境变动 / 面板上那句话出现过 ${byOutlook.size} 种`,
  )
  if (originsSeen < ORIGINS.length) {
    console.log(`  ✗ 十一种出身只掷到 ${originsSeen} 种，这一批的表是缺行的。`)
    bad += 1
  }

  console.log()
  if (bad > 0) {
    console.log(`  ✗ ${bad} 项不成立。\n`)
    process.exitCode = 1
  } else {
    console.log('  立基落在出身表里，后半生有涨有跌，咽气那年没有谁跟谁挤在同一个数上。')
    console.log('  **家业是一条走出来的线，不是一台棘轮。**\n')
  }
}
