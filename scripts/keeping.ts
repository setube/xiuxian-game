/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 天年被改过之后，那件事在正文里说得出来吗。
 *
 * 跑法：`bun scripts/keeping.ts`
 *
 * ## 这一支守的是「延寿」这件事的两头，而两头都不是数对不对
 *
 * `{ type: 'lifespan', years }` 从建好那天起就没人正向用过——
 * 全库唯一的使用者是老年那一卷的「再走一趟远路」（减两年）。`keeping.ts` 是第一个，
 * 而用户 2026-09-10 给它定的形状里，**有两条是判据管得着的**：
 *
 *     一、玩家未必知道加了多少　→ 正文里不许出现年数
 *     二、不绑境界　　　　　　　→ 落 lifespan 的地方不许同时落 realm
 *
 * 剩下两条（挂在真正练成上、量要小）是设计决定，判据不该替用户守——
 * 它们写在 `content/life/keeping.ts` 的文件头里。
 *
 * ## 为什么是摆局跑，而且这一支只能摆局跑
 *
 * 真世 4000 世里够格的人约 1 个（漏斗见那个文件头），`held` 零次。
 * **拿真世跑这一支，它会永远绿——因为永远没有样本。**
 * 那正是「一个恒为空的观测长得跟一个恒为假的判据一模一样」。
 *
 * 所以这一支摆局跑：把前提旗落好，从头走到底，看走出来的东西对不对。
 * 而「真世里演不演得到」由 `lifelong` 那一支的修行覆盖率守着。
 *
 * ## 第五问是打断验来的
 *
 * 前四问里有三问在头一版是**永远绿**的：我拿末节点当 key，
 * 而 `sign-sweat` 在路中间，key 里永远没有它——判据报 ✗ 的时候
 * 路其实走对了（误报），改对之后又变成不论怎么走都绿。
 * 第五问「没有一局同时走过两条征象」是那次修完补上的，
 * 它是唯一一条**打断得动**的：把两条征象的 requires 去掉，它立刻红。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useWorldStore } from '../src/stores/world'
import type { Choice, Condition, Effect, SceneNode } from '../src/types/game'

const SCENE = 'keeping:years'

/** 掷多少局。`held` 是三成，四种组合都要摆到 */
const TRIES = 400

interface Run {
  nodes: string[]
  lines: string[]
  spanBefore: number
  spanAfter: number
}

/** 摆一局：落好前提旗，从入口一路走到底 */
function stage(hurt: boolean, pick: 'keep' | 'ask'): Run {
  setActivePinia(createPinia())
  const character = useCharacterStore()
  const world = useWorldStore()
  /*
   * ⚠️ 这儿原先写着 `character.begin()`，而**那是「开始做一件事」
   * （`begin(id, who)`），不是「开始一世」**——门禁一直绿着，
   * 因为 `character.span` 在 store 初始化时就掷好了，那一行纯属多余。
   *
   * 是 `vue-tsc --build --force` 查出来的：增量构建读着陈年
   * `.tsbuildinfo`，漏报了这条「Expected 1-2 arguments, but got 0」。
   */

  world.setFlag('felt-something', true)
  if (hurt) world.setFlag('first-attempt', 'hurt')

  const spanBefore = character.span
  const scene = lifeScenes[SCENE]!
  const nodes: string[] = []
  const lines: string[] = []
  let id: string | undefined = scene.entry

  for (let step = 0; step < 20 && id; step += 1) {
    const node: SceneNode | undefined = scene.nodes[id]
    if (!node) break
    nodes.push(id)
    applyEffects((node.onEnter ?? []) as readonly Effect[])
    /*
     * ⚠️ **不能只取 `block.text`。** `NarrativeBlock` 是联合类型，
     * `heading` 那一支用的是 `title`／`subtitle`，`divider` 一个字也没有。
     * 只取 `text` 的话，写在标题里的年数**这一支判据看不见**——
     * 而它正是「正文里不许出现年数」那一问的输入。
     *
     * （`vue-tsc --build --force` 查出来的：增量构建漏报了这条。）
     */
    for (const block of node.blocks ?? []) {
      if ('text' in block) lines.push(block.text)
      if ('title' in block) lines.push(block.title)
      if ('subtitle' in block && block.subtitle !== undefined) lines.push(block.subtitle)
    }

    const choices: readonly Choice[] = node.choices ?? []
    const choice: Choice | undefined = choices.find((one) => one.id === pick) ?? choices[0]
    if (choice) {
      applyEffects((choice.effects ?? []) as readonly Effect[])
      id = choice.next ?? undefined
      continue
    }
    const branch = (node.branches ?? []).find((one: { requires: readonly Condition[] }) =>
      meetsAll(one.requires),
    )
    id = branch?.next ?? node.next ?? undefined
  }

  return { nodes, lines, spanBefore, spanAfter: character.span }
}

const runs: Run[] = []
const byShape = new Map<string, Run>()
for (let i = 0; i < TRIES; i += 1) {
  const hurt = i % 2 === 0
  const pick: 'keep' | 'ask' = i % 4 < 2 ? 'keep' : 'ask'
  const run = stage(hurt, pick)
  runs.push(run)
  const key = `${hurt ? '有旧伤' : '没旧伤'}·${run.nodes[run.nodes.length - 1] ?? '(空)'}`
  if (!byShape.has(key)) byShape.set(key, run)
}

console.log(`\n【${SCENE}】摆了 ${TRIES} 局，走出 ${byShape.size} 种形状\n`)
for (const [key, run] of [...byShape.entries()].sort()) {
  const delta = run.spanAfter - run.spanBefore
  console.log(`  ${key.padEnd(20)} ${run.nodes.join('→')}　天年 ${delta >= 0 ? '+' : ''}${delta}`)
}

const wrong: string[] = []

// 一、成的那一支真的动了天年，不成的那一支一年也没动
const held = runs.filter((r) => r.nodes.includes('held'))
const notHeld = runs.filter((r) => r.nodes.includes('still-nothing'))
if (held.length === 0) wrong.push('四百局里一局也没成——那一掷的权重可能写坏了')
if (notHeld.length === 0) wrong.push('四百局里局局都成——「多数人什么也没有」这条没了')
if (held.some((r) => r.spanAfter <= r.spanBefore)) {
  wrong.push('成了却没加天年：`lifespan` 那条效果没落上')
}
if (notHeld.some((r) => r.spanAfter !== r.spanBefore)) {
  wrong.push('没成却加了天年：那条效果落错了节点')
}

/*
 * 二、正文里不许出现年数——**用户第四条，这一支的主判据**。
 *
 * 关键词表照库里真写的字抄：`effects.ts` 那条 `lifespan` 不出回执，
 * 所以玩家能读到年数的唯一途径是正文自己写出来。
 */
const NUMBERS = /[一二三四五六七八九十百千万\d]+\s*年|寿命|天年|阳寿/
const leaked = runs.flatMap((r) => r.lines.filter((line) => NUMBERS.test(line)))
if (leaked.length > 0) {
  wrong.push(
    `正文里写出了年数，玩家不该知道加了多少：${[...new Set(leaked)].slice(0, 2).join(' / ')}`,
  )
}

/*
 * 三、落 lifespan 的地方不许同时落 realm——**用户第二条**。
 *
 * 静态判，不靠摆局：翻这一卷所有节点的 onEnter。
 * 哪天有人往 `held` 里加一条 `{ type: 'realm' }`，这一问立刻红。
 */
{
  const scene = lifeScenes[SCENE]!
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    const effects = (node.onEnter ?? []) as readonly Effect[]
    const hasSpan = effects.some((one) => one.type === 'lifespan')
    const hasRealm = effects.some((one) => one.type === 'realm')
    if (hasSpan && hasRealm) {
      wrong.push(`${nodeId} 同时落了 lifespan 和 realm——延寿绑到境界上了`)
    }
  }
}

// 四、两条征象各归各的人
const bothSigns = runs.filter(
  (r) => r.nodes.includes('sign-sweat') && r.nodes.includes('sign-winter'),
)
if (bothSigns.length > 0) {
  wrong.push(`${bothSigns.length} 局同时走过两条征象——它们该是互斥的两种人`)
}
const sweatWithoutHurt = runs.filter((r, i) => r.nodes.includes('sign-sweat') && i % 2 !== 0)
if (sweatWithoutHurt.length > 0) {
  wrong.push('没有那处旧伤的人读到了「盗汗停了」——一句话默认了他没有的东西')
}

// 五、成了之后走得到第三方观察那一节
if (held.length > 0 && !held.some((r) => r.nodes.includes('noticed'))) {
  wrong.push('成了却没走到 noticed——第三方观察那一层断了')
}

console.log('')
if (wrong.length === 0) {
  console.log('  ✓ 天年动了、正文没漏数、没绑境界、两条征象各归各的人')
  console.log(
    `    成 ${held.length} 局 · 不成 ${notHeld.length} 局 · ` +
      `加的年数 ${held[0] ? held[0].spanAfter - held[0].spanBefore : '—'}`,
  )
} else {
  for (const one of wrong) console.log(`  ✗ ${one}`)
}

console.log(`\n共 ${wrong.length} 处不对。`)
process.exit(wrong.length === 0 ? 0 : 1)
