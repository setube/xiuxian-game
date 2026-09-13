/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 事件的另一半：入场点了名的人，世界有没有往他身上落过一笔。
 *
 * **这一支只报数，不判成败**（跟 `royal`/`settle`/`perceive`/`shadow` 同一类）。
 * 它产的是候选，而「这个人到底是不是这件事的主体」要人去判——
 * 判完往底下 `CALLED` 里登记一条。
 *
 * ## 由来：配偶那一册四次查下来，形状完全一样
 *
 * ```
 * 性情    引擎给了她，零处内容读                → 补了
 * 过门    别人有那一天，她没有                  → 补了
 * 那条边  立了没人读                            → 补了
 * 添丁    事发生在她身上，效果全落在孩子和编年   → 机制缺口
 * ```
 *
 * 四次都不是「缺一个字段」，是**「这件事的【他那一半】没人写」**。
 * 而四次都靠人顺手看见——**第五次未必有人顺手看那一眼**，所以钉成一支走查。
 *
 * ## ⚠️ 它必然误报，而那是设计如此
 *
 * 「入场点了名」不等于「这件事发生在他身上」。至少五种角色，只有最后一种要承接：
 *
 * ```
 * 背景      要有个哥才有嫂子、才有分家   ← 卷讲的不是哥
 * 记录者    编年落在玩家名下             ← 这是玩家视角的游戏，本来就该这样
 * 执行者    产婆                        ← 她连 id 都没有，压根不在册
 * 关系双方  tie 的两头
 * 【真正经历者】                        ← 只有这一格该问「世界记下了吗」
 * ```
 *
 * **而静态判不出最后一格**。跟 GPT 过这一轮时定的口径：
 *
 * > `bond:兄` 出现在条件里 ≠ 哥是事件主体。
 * > 只有事件语义明确把他作为「经历／承受／状态发生」的对象，才算主体。
 * > **不要为了让候选变少就把背景人物一律白名单消掉**——
 * > 保留候选，在语义层判角色。
 *
 * 所以这一支不判成败：它把候选摆出来，人判完登记，登记里要写清**为什么**。
 *
 * ## 两边都从运行时取，不猜
 *
 * ```
 * PEOPLE      跑 120 世收 roster 的 id   → 「这个 id 是不是一个人」
 * BOND_TO_ID  从 relations 解「兄→brother」 → 「条件点的这个关系，落在谁身上」
 * ```
 *
 * ⚠️ 头一版没有这两张表，82 条候选里大半是尺子自己的毛病：
 * `old-home` 是【户】的 id、`banditry` 是【世道大事】的 id、
 * 而 `bond:兄` 二十条是因为条件问「兄」、效果落 `brother`，我没做映射。
 * 接上人口册之后 82 → 28。
 *
 * 跑法：bun scripts/subject.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { useCharacterStore } from '../src/stores/character'
import { usePeopleStore } from '../src/stores/people'

/**
 * 判过的候选，和判成了什么。
 *
 * ⚠️ **这不是白名单，是「判过了，这么判的」的登记。**
 * 每一条要写清：这件事真正经历者是谁、他身上有没有东西、这个人是什么角色。
 * 写不出来就别登记——那说明还没判完。
 */
const CALLED: readonly { key: string; role: string; why: string }[] = [
  {
    key: 'bond:兄',
    role: '背景',
    why: [
      '「要有个哥」是很多卷的结构前提：有哥才有嫂子、才有分家、才有那笔债。',
      '  · kindred-quarrel / kindred-mend  讲的是娘跟嫂子，哥是第三人',
      '  · away-i-repay                    债的另一头是哥，而经历那件事的是玩家',
      '  真正经历者身上【有】东西（kindred-mend 落 brother-wife → mother 的 tie）',
    ].join('\n'),
  },
  {
    key: 'wife-her-own-way',
    role: '观察者',
    why: [
      '认知卷：玩家看见她做一件没教过的事，写完就停。',
      '  它改变的是玩家对这个人的理解，不是世界状态——落任何东西都是错的。',
    ].join('\n'),
  },
  {
    key: 'reunion-homecoming',
    role: '关系双方',
    why: [
      '「回来了」——玩家从镇上回家，那个把他带大的人认出他，说了句「瘦了」。',
      '  抚养的人不是「经历了一件事」，他是这件事的另一头：',
      '  这一卷写的是【重逢】，而重逢本来就没有单方面的承载者。',
    ].join('\n'),
  },
  {
    key: 'reunion-emptied',
    role: '主体事实由【别处】落的',
    why: [
      '「你从镇上赶回来，没赶上。」入场条件是 { bond: 抚养, alive: false }',
      '  ——他殁了这件事是这一卷的【前提】，不是这一卷该落的东西。',
      '',
      '  ⚠️ 而这一条照出这把尺子的一个盲点：它只看【同一卷】里的效果。',
      '  主体事实由别的生产者落下的，它分不出来，会报成缺席。',
      '  没有一般解法（跨卷追因要读语义），所以逐条登记。',
    ].join('\n'),
  },
  {
    key: 'need-illness',
    role: '落了，而尺子对不上',
    why: [
      '这一卷落的正是 { type: person, id: elder, fate: 殁 } + undertake who: elder。',
      '  而它用的是【角色记号 elder】，条件问的是 bond:抚养——',
      '  尺子拿「抚养」去比「elder」，对不上。',
      '',
      '  ⚠️ 这是误报，而病根在尺子：角色记号（elder/dam/child/playmate）',
      '  跟关系种类是两套名字，静态解不开（`{elder}` 落到谁由关系网现算）。',
      '  真要消它得把角色记号也接进 BOND_TO_ID，而那是运行时的事。',
    ].join('\n'),
  },
  {
    key: 'house-divide',
    role: '背景',
    why: [
      '分家：成了家的儿子分出去。入场是 { house: { head: 兄 } } + { bond: 配偶, alive }',
      '  ——「成了家」是分得出去的【前提】，而这一卷讲的是户怎么分，',
      '  真正经历者是这一户和玩家自己。配偶不是这件事的承受者。',
    ].join('\n'),
  },
  {
    key: 'bearing-await',
    role: '⚠️ 真候选（已立案，卡在依据上）',
    why: [
      '添丁：等着的那几年。入场要 { bond: 配偶, alive }，而效果落在',
      '  son / daughter 和编年上——【spouse 身上零笔】。三次掷也没有一次掷她',
      '  （怀上没有 / 孩子活不活 / 男女）。',
      '',
      '  ⚠️ 这一条跟 wife-that-winter 卡在同一处：要落 health 就得先定义',
      '  「生育存在母体身体风险」这条世界规则，而史料支撑得起',
      '  「农村家庭分娩的母体死亡风险显著」，支撑不起「有 X% 的幸存妇女',
      '  留下足以缩短余寿的长期身体损害」。',
      '  **alive=false 和 health↓ 是两个不同的世界事实，证据要分别对应。**',
      '  口径和状态在 design/the-wife.md 第八、九节。',
    ].join('\n'),
  },
  {
    key: 'wife-that-winter',
    role: '⚠️ 真候选（第一颗真阳性，2026-09-13）',
    why: [
      '娘病了半个月，她在跟前照应。点了配偶、生母、mother 三个人，一笔也没落。',
      '  **真正经历者是娘**，而世界上一笔也没记——跟 bearing 一模一样的形状。',
      '  写它的时候我想的是「关系不决定她做不做，只决定质地」，',
      '  而那一条只管住了【她】那一侧，娘那一侧压根没想。',
      '',
      '  ⚠️ 暂不修世界机制：给娘落 health 要先有「病一场之后身子骨怎么样」的依据，',
      '  而那跟生育风险那条卡在同一处（见 design/the-wife.md 第八、九节）。',
      '  **不为了过门禁制造 health 损失。**',
    ].join('\n'),
  },
]

/** 条件里点到了谁。`bond:X` 是关系种类，别的是人的 id */
function namedInRequires(node: unknown): Set<string> {
  const out = new Set<string>()
  const walk = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(walk)
    if (one === null || typeof one !== 'object') return
    const rec = one as Record<string, unknown>
    if (typeof rec.kind === 'string') out.add(`bond:${rec.kind}`)
    if (typeof rec.id === 'string') out.add(rec.id)
    if (typeof rec.with === 'string') out.add(`bond:${rec.with}`)
    if (typeof rec.from === 'string') out.add(rec.from)
    if (typeof rec.to === 'string') out.add(rec.to)
    Object.values(rec).forEach(walk)
  }
  walk(node)
  return out
}

/** 这一卷的效果往谁身上落过 */
function touchedByScene(sceneId: string): Set<string> {
  const out = new Set<string>()
  const scene = lifeScenes[sceneId]
  if (!scene) return out
  const walk = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(walk)
    if (one === null || typeof one !== 'object') return
    const rec = one as Record<string, unknown>
    if (['person', 'meet', 'tie', 'undertake'].includes(String(rec.type))) {
      for (const key of ['id', 'who', 'from', 'to']) {
        const v = rec[key]
        if (typeof v === 'string') out.add(v)
      }
    }
    Object.values(rec).forEach(walk)
  }
  for (const node of Object.values(scene.nodes)) walk(node)
  return out
}

const PEOPLE = new Set<string>()
const BOND_TO_ID = new Map<string, Set<string>>()
for (let i = 0; i < 120; i += 1) {
  setActivePinia(createPinia())
  useCharacterStore()
  const people = usePeopleStore()
  for (const one of Object.values(people.roster)) PEOPLE.add(one.id)
  for (const rel of people.relations) {
    if (!BOND_TO_ID.has(rel.bond)) BOND_TO_ID.set(rel.bond, new Set())
    BOND_TO_ID.get(rel.bond)!.add(rel.to)
  }
}

const rows: { event: string; who: string }[] = []
for (const event of lifeEvents) {
  const named = namedInRequires(event.requires ?? [])
  if (named.size === 0) continue
  const touched = touchedByScene(event.scene)
  for (const who of named) {
    if (who.startsWith('bond:')) {
      const ids = BOND_TO_ID.get(who.slice(5))
      // 这一百二十世里没出现过的关系种类，解不出 id——别当成缺席
      if (!ids || ids.size === 0) continue
      if ([...ids].some((id) => touched.has(id))) continue
      rows.push({ event: event.id, who })
      continue
    }
    if (!PEOPLE.has(who)) continue
    if (touched.has(who)) continue
    rows.push({ event: event.id, who })
  }
}

// —— 尺子自检：坏掉的尺子跟「库里很干净」印出来一模一样 ——
const broken: string[] = []
if (PEOPLE.size < 20) broken.push(`人口册只收到 ${PEOPLE.size} 个人，太少`)
if (BOND_TO_ID.size < 5) broken.push(`关系只解出 ${BOND_TO_ID.size} 种，太少`)
if (PEOPLE.has('old-home')) broken.push('「old-home」进了人口册——那是户不是人')
if (!BOND_TO_ID.get('兄')?.has('brother')) broken.push('「兄 → brother」没解出来')
if (!rows.some((one) => one.event === 'wife-that-winter')) {
  broken.push('已知那颗真阳性（wife-that-winter）没被抓到')
}

console.log(`\n=== 事件的另一半（${lifeEvents.length} 件事件）===\n`)

/**
 * ⚠️ **把「这一支实际站在几个样本上」印出来。**
 *
 * 2026-09-13 一天之内三支门禁栽在同一处：`RUNS` 是所有人都看得见的旋钮，
 * **而「落到那一小撮上的样本有几个」没有任何地方印出来**：
 *
 * ```
 * circumstance  4000 世，而「一个血亲也没有」只占 6%  → 240 个样本
 * world          300 世，而撞上旱灾的只有十几世       → 十几个样本
 * ```
 *
 * 两支都因此把阈值画在了噪声里。这一支不判成败，**所以更该把分母印出来**
 * ——读的人得看得见这 28 条是从多大的底子上捞出来的。
 */
console.log(`  底子：${PEOPLE.size} 个人、${BOND_TO_ID.size} 种关系（120 世收的）`)
console.log(
  `  其中 ${lifeEvents.filter((one) => namedInRequires(one.requires ?? []).size > 0).length} 件事件的入场点了名，是这一支的分母\n`,
)

if (broken.length > 0) {
  console.log('  ✗ 尺子坏了，底下的清单不能当结论读：\n')
  for (const line of broken) console.log(`    ${line}`)
  console.log()
  process.exitCode = 1
} else {
  console.log('  ✓ 尺子自己判得出：人口册和关系表都解出来了，已知那颗真阳性在册。\n')
}

const judged = new Map(CALLED.map((one) => [one.key, one]))
const fresh = rows.filter((one) => !judged.has(one.who) && !judged.has(one.event))

console.log(
  `  候选 ${rows.length} 条，判过 ${rows.length - fresh.length} 条，没判过 ${fresh.length} 条\n`,
)

for (const one of CALLED) {
  const hit = rows.filter((row) => row.who === one.key || row.event === one.key)
  console.log(`  ◇ ${one.key}　〔${one.role}〕　${hit.length} 条`)
  console.log(`    ${one.why.split('\n').join('\n    ')}\n`)
}

if (fresh.length > 0) {
  console.log(`  · 还没判过的 ${fresh.length} 条：\n`)
  for (const one of [...fresh].sort((a, b) => a.who.localeCompare(b.who))) {
    console.log(`      ${one.who.padEnd(14)} ${one.event}`)
  }
  console.log()
}

console.log('  这一支不判成败。「点了名」不等于「这件事发生在他身上」——')
console.log('  背景、记录者、执行者、关系双方、真正经历者，只有最后一格该问')
console.log('  「世界记下了吗」，而那一格静态判不出来。判完往 CALLED 里登记。\n')
