/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 正文点了名，而没有任何一处问过他在不在。
 *
 * 跑法：`bun scripts/absent.ts`
 *
 * ## 这一支从哪来
 *
 * `present.ts` 守的是同一件事的另一端：**跑真人生，撞见死人还在正文里露面**。
 * 它抓到过三条（嫂子、乳母、还有一条误报），而抓到它们要先修掉那一支自己的
 * 取证缺陷——从前它拿 `stream.slice(seen)` 收正文，而
 * `MAX_STREAM_LENGTH = 400`、超出从头裁，于是**四百块之后它读到的永远是空**。
 * 一世产生正文 432–991 块（中位 760），**四十世里四十世越过 400**。
 * 漏掉的那一半正是人生后半段——**而死人恰好集中在那里**。
 *
 * ⚠️ 那条缺陷不是「出错」，是稳定地什么也不做。问「`seen` 有没有超出 `length`」
 * 查不出来（实测 200 世零次）：封顶之后 `length` 恒等于 400、`seen` 也恒等于 400，
 * `slice(400)` 稳定返回空。**能分辨它的提问是「两种收法的总数对比」**
 * ——按块 id 收 73751 块，按下标切 37084 块。
 *
 * ## 而这一支换了个问法：不等撞上，静态地问
 *
 * ```
 * present.ts   跑真世 → 那个人恰好死了 → 那一节恰好演到 → 才抓得到
 * 这一支       扫内容 → 正文点了 X → 有没有任何一处保证过 X 还在
 * ```
 *
 * 两者互补：**静态扫出候选，`present` 证实哪些真会发生。**
 * 静态扫的长处是不依赖撞上——一条一辈子只演 1% 的卷，它照样看得见。
 *
 * ## ⚠️ 难的地方在 `branches` 的短路语义
 *
 * 「这一节自己问没问」是错的问法。看 `kindred:newyear` 修好之后的样子：
 *
 * ```ts
 * branches: [
 *   { requires: [{ family: { id: 'brother-wife', exists: true, alive: false } }],
 *     next: 'she-is-gone' },
 *   { requires: [COLD_SISTER_IN_LAW], next: 'cold' },
 * ],
 * next: 'warm',
 * ```
 *
 * `cold` 和 `warm` 里都有 `{call:brother-wife}`，而**那两节自己一个字也不问她**。
 * 它们安全，靠的是**排在前面那一条把她不在的情形拦走了**
 * （`branches` 取第一条满足的就走）。
 *
 * 所以这一支算的是：**到达某一节的【所有】路径上，那个人的存活是不是都被保证了。**
 * 做法是不动点迭代——节点的保证集 = 所有入边传播值的**交集**，迭代到不变。
 *
 * ## 这一支判得了什么、判不了什么
 *
 * ```
 * 判得了   {call:<真 id>}                61 处（nephew 28、brother-wife 11、nurse 6…）
 * 判不了   {call:<角色记号>}             36 处（spouse 15、known/playmate 11、son 8…）
 *          ——它们运行时才解析成谁，而条件层是拿 bond 问的，不是拿 id
 * ```
 *
 * ⚠️ **判不了的那 36 处单列一栏报数，不混进结论里。**
 * 一个判不了的东西被算进「已检查」，比不检查更坏。
 *
 * ## 报数，不判成败
 *
 * 扫出来的不都是问题：回想的语境（「你想起娘说过」）、对白里的亲属称谓
 * （侄儿嘴里的「我爹」指的是玩家的兄）、整卷讲死人的（`mourning`），
 * 都是正当的。**这一支只负责把候选摆出来，判哪一条真是问题要人看。**
 * 判成败的那一半在 `present.ts`。
 */
import './lib/seeded'

import { readFileSync } from 'node:fs'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { ROLE_IDS } from '../src/engine/interpolate'
import type { Condition, Scene, SceneNode } from '../src/types/game'

/**
 * 运行时才解析成谁的记号。**名单从引擎现取，不照印象抄。**
 *
 * ⚠️ 头一版我凭印象写了八个（多加了 spouse / son / daughter / sibling），
 * 而 `ROLE_IDS` 只有四个。多出来的那四个是**真 id**——
 * 那一版于是把 17 处真候选当成「判不了」排掉了，而报表上很干净。
 *
 * 这四个里头前三个是【位置】、最后一个是【一个人】
 * （分法写在 `engine/interpolate.ts` 那段注释里）：
 *
 *     elder / dam / child   位置    爹殁了就落到娘身上——换人照样成立
 *     playmate              一个人  换了人立意就毁了
 *
 * 所以严格说只有 `playmate` 值得往下追，而追法跟这一支不同：
 * 它要问的不是「他还在吗」，是「还是同一个他吗」。
 */
const ROLE_TOKENS: readonly string[] = ROLE_IDS

/**
 * 认哪几族占位符。
 *
 * ⚠️ 头一版只认 `call`，而 `hail` 整族（13 处）在射程外——
 * 另一个会话拿实测结果来对名单才发现的：他抓到的 `teacher` 不在我名单里，
 * 追下去是 `{hail:east-wife}你可算回来了`。**`hail` 的性质跟 `call` 一样**，
 * 它也要那个人还在，也会在人殁之后印出一句通顺而错的话。
 *
 * ⚠️ 而这条空隙【那行分母自检抓不住】：
 *
 *     漏扫一个字段      分母对不上      ← 自检抓得到（chronicle 那次）
 *     漏扫一整族占位符  分母照样对得上  ← 抓不到，那些字从来没进过分母
 *
 * **自检守得住「我想到要数的那些」，守不住「我没想到的那一族」。**
 * 所以补这一族的时候顺手把全库占位符印了一遍，而不是补一个算一个：
 *
 *     {call: 97   {elder} 134   {dam} 85   {hail: 13   {house: 9   {age: 4
 *
 * `{elder}`/`{dam}` 那 219 处是【位置】，现算，天然不指向死人；
 * `{house:}` 指户不指人；`{age:}` 印的是岁数——死人的岁数说得通，另论。
 */
const PLACEHOLDER = new RegExp('\\{(?:call|hail):([^}]+)\\}', 'g')

/** 玩家读得到字的地方，一处不漏 */
function textsOf(node: SceneNode): string[] {
  const texts: string[] = []
  for (const block of node.blocks) if ('text' in block) texts.push(block.text)
  for (const one of node.seen ?? []) texts.push(one.text)
  for (const choice of node.choices ?? []) {
    texts.push(choice.label)
    // `hint` 是选项底下那行小字，`echo` 是点下去之后回响的那一句——两处都是正文
    if (choice.hint !== undefined) texts.push(choice.hint)
    if (choice.echo !== undefined) texts.push(choice.echo)
  }
  /*
   * ⚠️ 效果里的字也算——`chronicle` 那种。
   *
   * 头一版漏了这一处，而漏掉的方式很典型：我按「正文」去想，只扫了 `blocks`。
   * **分母对不上才发现**（源码 grep 数 83 处、走查数 70 处），差的里头有三处是年表。
   * 年表是玩家读得到的字，跟卷轴上那行是一回事。
   */
  const effects = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
  for (const one of effects) {
    const text = (one as { text?: string }).text
    if (typeof text === 'string') texts.push(text)
  }
  return texts
}

/** 去重【之前】的处数。只给尺子自检用 */
function rawCallCount(node: SceneNode): number {
  let n = 0
  for (const text of textsOf(node)) n += [...text.matchAll(PLACEHOLDER)].length
  return n
}

/** 一个节点里点到的名字。同一节里点两遍算一处 */
function callsIn(node: SceneNode): Set<string> {
  const found = new Set<string>()
  for (const text of textsOf(node)) {
    for (const hit of text.matchAll(PLACEHOLDER)) {
      const raw = hit[1]
      if (raw !== undefined) found.add(raw)
    }
  }
  return found
}

/**
 * 哪种关系落在哪个 id 上。**从内容层现取，不列一张凭印象的表。**
 *
 * 遍历全库的 `meet` 效果收 `{ id, bond }` 对：`match.ts` 那几处
 * `{ id: 'spouse', bond: '配偶' }` 一进来，`配偶 → spouse` 这条就有了。
 */
const BOND_TO_ID = new Map<string, Set<string>>()
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const effects = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of effects) {
      const rec = one as { id?: string; bond?: string }
      if (typeof rec.id !== 'string' || typeof rec.bond !== 'string') continue
      if (!BOND_TO_ID.has(rec.bond)) BOND_TO_ID.set(rec.bond, new Set())
      BOND_TO_ID.get(rec.bond)?.add(rec.id)
    }
  }
}

/**
 * 一组条件保证了谁还活着。
 *
 * 两种写法都认：
 *
 *     { family: { id: 'brother-wife', alive: true } }   直接点 id
 *     { bond: { kind: '配偶', alive: true } }           问关系种类
 *
 * ⚠️ 后一种从前不认，于是 `wife:her-own-way` 那六节被报成候选——
 * **而那一卷的入场条件明写着 `{ bond: { kind: '配偶', alive: true, near: true } }`。**
 * 九处误报能把二十几条真候选淹掉，而看的人会直奔一个没毛病的地方去查。
 *
 * 后一种放宽了：`配偶` 这种关系可能落在好几个 id 上，而这里把它们全算成保证。
 * 方向是**宁可少报一条候选，不要多报一条**——这一支的产物是给人看的名单，
 * 误报的代价比漏报大。
 */
function guaranteedAlive(requires: readonly Condition[] | undefined): Set<string> {
  const out = new Set<string>()
  for (const one of requires ?? []) {
    const family = (one as { family?: { id?: string; alive?: boolean } }).family
    if (family?.id !== undefined && family.alive === true) out.add(family.id)
    const bond = (one as { bond?: { kind?: string; alive?: boolean } }).bond
    if (bond?.kind !== undefined && bond.alive === true) {
      for (const id of BOND_TO_ID.get(bond.kind) ?? []) out.add(id)
    }
  }
  return out
}

/** 一条 branch 问的是「他不在了」吗——排在它后面的路都因此被保证 */
function assertsGone(requires: readonly Condition[] | undefined): Set<string> {
  const out = new Set<string>()
  for (const one of requires ?? []) {
    const family = (one as { family?: { id?: string; alive?: boolean } }).family
    if (family?.id !== undefined && family.alive === false) out.add(family.id)
  }
  return out
}

interface Edge {
  to: string
  /** 走这条边时额外保证活着的人 */
  adds: Set<string>
}

/** 一节的全部出边，连同各自保证了谁 */
function edgesOf(node: SceneNode): Edge[] {
  const edges: Edge[] = []
  /*
   * ⚠️ `branches` 取第一条满足的就走。所以走到第 i 条，
   * 说明前 i-1 条都【不】成立——前面哪一条问的是「他不在了」，
   * 这一条就因此保证了他还在。
   */
  const goneSoFar = new Set<string>()
  for (const branch of node.branches ?? []) {
    edges.push({
      to: branch.next,
      adds: new Set([...guaranteedAlive(branch.requires), ...goneSoFar]),
    })
    for (const id of assertsGone(branch.requires)) goneSoFar.add(id)
  }
  // 兜底那条：所有 branches 都不成立才走
  if (node.next !== undefined) edges.push({ to: node.next, adds: new Set(goneSoFar) })
  for (const choice of node.choices ?? []) {
    // `next: null` 是「这一节到此为止」，不是一条边
    if (choice.next === null) continue
    edges.push({ to: choice.next, adds: guaranteedAlive(choice.requires) })
  }
  return edges
}

/**
 * 到每一节时，哪些人的存活是**所有**路径都保证了的。
 *
 * 不动点迭代：节点的保证集 = 各入边传播值的交集，算到不变为止。
 * 跨卷跳转（`场景id#节点id`）不跟——那是另一卷的事，留给那一卷自己扫。
 */
function assuredAt(scene: Scene, fromEvent: Set<string>): Map<string, Set<string>> {
  const assured = new Map<string, Set<string>>()
  const ids = Object.keys(scene.nodes)
  for (const id of ids) assured.set(id, new Set<string>())
  assured.set(scene.entry, new Set(fromEvent))

  const incoming = new Map<string, { from: string; adds: Set<string> }[]>()
  for (const id of ids) incoming.set(id, [])
  for (const id of ids) {
    const node = scene.nodes[id]
    if (node === undefined) continue
    for (const edge of edgesOf(node)) {
      // 跨卷跳转（`场景id#节点id`）不跟——那是另一卷的事，留给那一卷自己扫
      if (edge.to.includes('#') || !ids.includes(edge.to)) continue
      incoming.get(edge.to)?.push({ from: id, adds: edge.adds })
    }
  }

  for (let round = 0; round < ids.length + 2; round += 1) {
    let changed = false
    for (const id of ids) {
      if (id === scene.entry) continue
      const ins = incoming.get(id) ?? []
      // 够不着的节点。这一支不管可达性，那是别的门禁的活
      if (ins.length === 0) continue
      let merged: Set<string> | null = null
      for (const edge of ins) {
        const here = new Set<string>(fromEvent)
        for (const x of assured.get(edge.from) ?? []) here.add(x)
        for (const x of edge.adds) here.add(x)
        if (merged === null) {
          merged = here
        } else {
          // 所有入边的【交集】：只有条条路都保证了，才算保证
          const keep: string[] = []
          for (const x of merged) if (here.has(x)) keep.push(x)
          merged = new Set(keep)
        }
      }
      const before = assured.get(id) ?? new Set<string>()
      const after = merged ?? new Set<string>()
      const same = before.size === after.size && [...after].every((x) => before.has(x))
      if (!same) {
        assured.set(id, after)
        changed = true
      }
    }
    if (!changed) break
  }
  return assured
}

// ============================================================
// 扫
// ============================================================
const requiresOf = new Map<string, Condition[]>()
for (const event of lifeEvents) {
  if (event.scene === undefined) continue
  requiresOf.set(event.scene, [...(event.requires ?? [])])
}

interface Row {
  scene: string
  node: string
  who: string
}
const bare: Row[] = []
const roleish: Row[] = []
let totalCalls = 0
let covered = 0

let rawTotal = 0
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  const fromEvent = guaranteedAlive(requiresOf.get(sceneId))
  const assured = assuredAt(scene, fromEvent)
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    rawTotal += rawCallCount(node)
    for (const who of callsIn(node)) {
      totalCalls += 1
      const bareId = who.includes('/') ? (who.split('/')[1] ?? who) : who
      if (ROLE_TOKENS.includes(bareId)) {
        roleish.push({ scene: sceneId, node: nodeId, who })
        continue
      }
      if ((assured.get(nodeId) ?? new Set()).has(bareId)) {
        covered += 1
        continue
      }
      bare.push({ scene: sceneId, node: nodeId, who: bareId })
    }
  }
}

console.log(`\n=== 正文点了名，而没有一处保证过他还在 ===\n`)

/*
 * ⚠️ 尺子自检：观察宇宙完不完备。
 *
 * 独立数一遍去重前的处数，跟源码里 grep 得到的对一眼。两个数【不该精确相等】
 * ——源码那边会把注释里举的例子也数进去——所以报出来给人看，不判红。
 *
 * 头一版就是靠这一行发现漏扫了 `chronicle`：83 对 70。
 * **一个漏扫的走查，跟一个什么也没发现的走查，印出来一模一样。**
 */
console.log(
  `  ◆ 尺子自检：去重前数到 ${rawTotal} 处 {call:…}；` +
    `源码 grep 的数会比它大一点（注释里举的例子），差得太多就是漏扫了\n`,
)

/*
 * ⚠️ 观察边界：日常那一套不在这支的射程里。
 *
 * 这一支遍历的是 `lifeScenes`，而 `content/days-manor.ts`（王府的日子）
 * 走的是另一套结构（`BEATS` / `DOINGS`，不是 `Scene`），没有 `requires`
 * 和 `branches` 可以顺藤摸。**硬补一套判不准的逻辑，不如把边界说清楚。**
 *
 * 而这一栏不是可有可无的：王府那一族（管家、乳母、门房）正是
 * `present.ts` 撞出真穿帮的地方。
 */
{
  const daily = readFileSync('src/content/days-manor.ts', 'utf8')
  const inDaily = [...daily.matchAll(/\{call:([^}]+)\}/g)].map((m) => m[1] ?? '')
  if (inDaily.length > 0) {
    console.log(
      `  ◇ 日常那一套（days-manor.ts）另有 ${inDaily.length} 处 {call:…}，这一支【够不着】：` +
        `${[...new Set(inDaily)].join('、')}\n`,
    )
  }
}
console.log(
  `  全库 ${totalCalls} 处 {call:…}：${covered} 处被保证、` +
    `${bare.length} 处没有、${roleish.length} 处是角色记号（这一支判不了）\n`,
)

const byWho = new Map<string, Row[]>()
for (const row of bare) {
  if (!byWho.has(row.who)) byWho.set(row.who, [])
  byWho.get(row.who)?.push(row)
}
for (const [who, rows] of [...byWho.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${who.padEnd(24)} ${String(rows.length).padStart(2)} 处`)
  for (const row of rows) console.log(`      ${row.scene}#${row.node}`)
}

if (roleish.length > 0) {
  const kinds = new Map<string, number>()
  for (const row of roleish) kinds.set(row.who, (kinds.get(row.who) ?? 0) + 1)
  console.log(`\n  ◇ 角色记号那 ${roleish.length} 处（运行时才解析成谁，这一支判不了）：`)
  console.log(`      ${[...kinds.entries()].map(([k, n]) => `${k}×${n}`).join('　')}`)
}

console.log(
  `\n  ⚠️ 这一支【报数不判成败】。扫出来的不都是问题：回想的语境、\n` +
    `  对白里的亲属称谓（说话人视角）、整卷讲死人的，都是正当的。\n` +
    `  判哪一条真会发生在 present.ts 那一头——它跑真人生撞。\n`,
)
