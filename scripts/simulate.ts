/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 凡人阶段的走查。
 *
 * 门禁只能证明代码编译得过，证明不了「一生走得通」——
 * 年表会不会挑不出事、时间会不会停住、十六岁那年能不能收尾，
 * 这些只有真跑一遍才知道。
 *
 * 这里把引擎当纯函数用：随机替玩家落笔，跑很多世，然后看：
 *
 * 1. 每一世都走到卷终了吗（不卡死、不空转）
 * 2. 父债那条链走完过几次（因果链是不是真的长得出来）
 * 3. 十六岁那年，不同的人身上带着不同的东西吗（还是人人一个样）
 *
 * 跑法：npx vite-node scripts/simulate.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { originById } from '../src/content/origins'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

/**
 * 走查跑多少世。
 *
 * ## 世数照最稀那一格定，而这一支最稀的一格是父债链
 *
 * 这一支同时报两类东西，两类要的世数差着一个量级：
 *
 * - **走不走得通**（有没有卡死、有没有空转）。这一类一次都不许出，
 *   两百世就足够——真卡死了不会只卡一世。
 * - **人生轨迹里那几个百分数**。「父债链走到父亲死」只占三个点上下，
 *   两百世里是六七个人，抽多抽少一倍——σ 有一个三分点，
 *   报出来的「3.5%」写到小数位纯属虚张声势，README 还引着它。
 *
 * 照后者定：要把三个点那一格量到 ±0.6 分点，得一千世。
 * 这一支跑一世要一百毫秒（每世几十上百次落笔，比别的支重得多），
 * 一千世将近两分钟——**它本来就是全套里最慢的一支**，
 * 而慢的理由正当：它是唯一一支真把一辈子走完的。
 */
const RUNS = 1000

/**
 * 防死循环的阈值，不是设计约束。
 *
 * 加了主动行动系统之后一世的交互次数本来就该上去：一天要点三次，
 * 一世二十来天就是六十几次，再加上其余的卷。200 是没有「一天」之前的数。
 */
const MAX_TURNS = 500

interface Tally {
  finished: number
  stuck: number
  /** 按**出身主键**分的一千世。数的是掷出来的那一行，不是后来变成的样子 */
  origins: Record<string, number>
  ages: number[]
  debtChainComplete: number
  schooled: number
  metCultivator: number
  knowsTheBook: number
  endings: Record<string, number>
  knowledgeCounts: number[]
}

function run(tally: Tally): void {
  setActivePinia(createPinia())

  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  story.begin()

  let turns = 0
  while (!narrative.ended && turns < MAX_TURNS) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    // 随机落笔：要看的是所有路都通，不是某一条通
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }

  if (narrative.ended) tally.finished += 1
  else tally.stuck += 1

  tally.origins[household.origin] = (tally.origins[household.origin] ?? 0) + 1
  tally.ages.push(character.age)
  tally.knowledgeCounts.push(character.knowledge.length)

  if (world.hasFlag('father-dead')) tally.debtChainComplete += 1
  if (world.hasFlag('event:school-threshold') && world.getFlag('schooled') === true) {
    tally.schooled += 1
  }
  if (world.hasFlag('saw-a-cultivator')) tally.metCultivator += 1
  // 手里的东西被人点破过——不论点破的是「这是炼气法门」还是「这是废纸」。
  // 两者都是同一种迟到的揭示，后者其实更常见，也更该常见
  if (character.inventory.some((item) => item.formerName !== undefined)) {
    tally.knowsTheBook += 1
  }

  // 收尾那一卷落在哪个结局上，就是这一世带着什么走到渡口的
  const ending = narrative.nodeId ?? '(未收尾)'
  tally.endings[ending] = (tally.endings[ending] ?? 0) + 1
}

function percent(part: number, whole: number): string {
  return `${((part / whole) * 100).toFixed(1)}%`
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const tally: Tally = {
  finished: 0,
  stuck: 0,
  origins: {},
  ages: [],
  debtChainComplete: 0,
  schooled: 0,
  metCultivator: 0,
  knowsTheBook: 0,
  endings: {},
  knowledgeCounts: [],
}

for (let i = 0; i < RUNS; i += 1) run(tally)

console.log(`\n=== 跑了 ${RUNS} 世 ===\n`)
console.log(`走到卷终：${tally.finished}（${percent(tally.finished, RUNS)}）`)
console.log(`中途卡住：${tally.stuck}（${percent(tally.stuck, RUNS)}）`)
/**
 * 卡死一世也要作数。
 *
 * 这一支头一条目标就是「每一世都走到卷终」，可它从前只是**把数字印出来**，
 * 印完照样 exit 0——**一支没有门禁的走查，等于一份没人读的报告。**
 * 跑一千世要将近两分钟，谁会盯着看那一行是不是零。
 */
if (tally.stuck > 0) {
  console.log(`\n  ✗ 有 ${tally.stuck} 世没走到卷终——那是卡死或者空转。`)
  process.exitCode = 1
}

console.log(`\n--- 出身 ---`)
for (const [id, count] of Object.entries(tally.origins).sort((a, b) => b[1] - a[1])) {
  // 主键做键、五格里的三格做说明。光印一个 `manor` 看不出那是什么人家，
  // 而光印「宗室」又分不出王府那一支和宫里那一支
  const row = originById(id as OriginId)
  const shop = row.business ? ` · ${row.business}` : ''
  const what = `${row.census} · ${row.livelihood}${shop}`
  console.log(`  ${id.padEnd(7)}${what.padEnd(16)}${count}  ${percent(count, RUNS)}`)
}

console.log(`\n--- 收尾年龄 ---`)
console.log(
  `  最小 ${Math.min(...tally.ages)}  中位 ${median(tally.ages)}  最大 ${Math.max(...tally.ages)}`,
)

console.log(`\n--- 人生轨迹 ---`)
console.log(`  进过私塾            ${percent(tally.schooled, RUNS)}`)
console.log(`  父债链走到父亲死    ${percent(tally.debtChainComplete, RUNS)}`)
console.log(`  认出了修士          ${percent(tally.metCultivator, RUNS)}`)
console.log(`  身上有东西被点破    ${percent(tally.knowsTheBook, RUNS)}`)

console.log(`\n--- 十六岁那年的落点 ---`)
for (const [node, count] of Object.entries(tally.endings).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${node.padEnd(14)}  ${count}  ${percent(count, RUNS)}`)
}

console.log(`\n--- 见闻条数 ---`)
console.log(
  `  最少 ${Math.min(...tally.knowledgeCounts)}  中位 ${median(tally.knowledgeCounts)}  最多 ${Math.max(...tally.knowledgeCounts)}`,
)
console.log()
