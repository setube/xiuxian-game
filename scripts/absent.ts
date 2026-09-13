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
 * ⚠️ **判不了的那些单列一栏报数，不混进结论里。**
 * 一个判不了的东西被算进「已检查」，比不检查更坏。
 *
 * ## ⚠️ 而最大的一条边界是：写死的称呼，这一支一个也看不见
 *
 * `present.ts` 在真人生里抓到过这一句：
 *
 * ```
 * 府里裁了两个人。乳母说，年景不好，禄米又拖了。
 * ```
 *
 * **那两个字是写死的，不是 `{call:nurse}`。** 这一支扫的是占位符，
 * 所以它连看都看不见——而那一句是真穿帮（那时乳母已经不在了）。
 *
 * ```
 * {call:X} / {hail:X}   占位符      这一支扫得到
 * 「乳母」「先生」「嫂子」 写死的字   ← 【一个也看不见】
 * ```
 *
 * 两支的分工因此比「静态 vs 动态」更具体：
 *
 *     这一支     占位符指向的人，条件层保证了没有       全覆盖，不依赖撞上
 *     present    正文里出现死者的称呼（不论怎么来的）   要撞上，但不挑写法
 *
 * **谁也不能宣称自己扫完了这一族。**
 *
 * ## ⚠️ 这一支的职责边界
 *
 * > **审计器应当对世界保持保守，对证据保持开放，对修复保持无权。**
 *
 * ```
 * 能做   认出证据 · 判证据够不够 · 把证不出来的地方摆出来
 * 不能   因为证不出来，就擅自给内容补 alive: true、改分支可达性，
 *        或者把一个本来不存在的世界事实当成存在
 * ```
 *
 * ⚠️ 而有一条区分要一直留着：
 * **「没有被当前扫描器识别」不等于「没有保证」，但也不能自动等于「安全」。**
 * 那 1 处剩下的候选正是这样——它被「户主不留死人」罩着（引擎层的保证），
 * 而这一支只读内容层，看不见。
 *
 * ## 证不出来之后怎么修：两问，不是一条直觉
 *
 * 摆出来的缺口交给人判，而人判的时候有两种处置，分界是可问的：
 *
 * ```
 * 一问  这句话描述的事，【以那个人在场为前提】吗？
 *         否 → 甲档：事照样发生，只是叙述借了他。换个说法。
 *              例「{call:brother-wife}多了个帮手」——老屋添人手这件事
 *                照发生，改成「老屋多了个做活的人」
 *         是 → 人不在这件事就不发生，接着问二
 *
 * 二问  这一节【还有别的话】吗？
 *         有 → 乙档：加 alive: true，少说这一句，玩家不少读什么
 *              例「他没跟{call:brother-wife}说」——瞒不了一个不在的人，
 *                而那一节前面还有两句
 *         没有 → 甲档：这一节得另有话说，否则玩家读到一片空白
 *              例 mourning#cold 整节就那一句「头七那晚哥跟她吵了一架」
 * ```
 *
 * ⚠️ 头一版我用的是「缺了这句，玩家是不是读到一个洞」——**那个问法分不开
 * 「他没跟她说」和「哥跟她吵了一架」**：两句都以她在场为前提，
 * 而一句缺了不要紧、一句缺了整节空白。差别在二问，不在一问。
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

/**
 * 一个节点里点到的名字，连同**那一句自己带的守卫**。
 *
 * ⚠️ `seen` 的每一条和 `choices` 的每一条**各有各的 `requires`**，
 * 而那正是内容层处理这件事最常用、也最干净的写法：
 *
 * ```ts
 * seen: [
 *   { requires: [{ family: { id: 'east-head', alive: true } }],
 *     text: '中人请的是{call:east-head}，和族里的一位长辈。' },
 *   { requires: [{ family: { id: 'east-head', alive: false } }],
 *     text: '中人请的是族里的两位长辈。' },
 * ]
 * ```
 *
 * 头一版收了这些字、却没读它们的条件，于是 `house:divide` 那两处被报成候选
 * ——**而那一卷早把两种情形都写了**。
 *
 * 这是这一支第四次栽在同一个形状上：**判据看不懂一种正当的写法，
 * 于是把一处做对了的地方报成问题。** 前三次是 `chronicle`、`hail`、`bond`。
 */
function callsIn(node: SceneNode): { who: string; guards: Set<string> }[] {
  const out: { who: string; guards: Set<string> }[] = []
  const add = (text: string, guards: Set<string>): void => {
    for (const hit of text.matchAll(PLACEHOLDER)) {
      const raw = hit[1]
      if (raw !== undefined) out.push({ who: raw, guards })
    }
  }
  const none = new Set<string>()
  for (const block of node.blocks) if ('text' in block) add(block.text, none)
  for (const one of node.seen ?? []) add(one.text, guaranteedAlive(one.requires))
  for (const choice of node.choices ?? []) {
    const guards = guaranteedAlive(choice.requires)
    add(choice.label, guards)
    if (choice.hint !== undefined) add(choice.hint, guards)
    if (choice.echo !== undefined) add(choice.echo, guards)
    for (const one of choice.effects ?? []) {
      const text = (one as { text?: string }).text
      if (typeof text === 'string') add(text, guards)
    }
  }
  for (const one of node.onEnter ?? []) {
    const text = (one as { text?: string }).text
    if (typeof text === 'string') add(text, none)
  }
  return out
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
    /*
     * ⚠️ 问「这一户的户主是谁」也是一种保证——**户主不留死人**。
     *
     * 一手核过：`stores/people.ts` 的结算里，户主殁了当场换人
     * （那一行记的是 `how: headAlive ? '交' : '殁'`）。
     * 所以 `{ house: { id: 'old-home', head: '弟' } }` 成立，
     * 就意味着那个弟弟此刻是活的。
     *
     * 这是第七种正当写法——`kindred:brother-gone#uncle`
     * 「老屋如今是{call:sibling}当家」本来就被这一条罩着。
     */
    const house = (one as { house?: { head?: string } }).house
    if (house?.head !== undefined) {
      for (const id of BOND_TO_ID.get(house.head) ?? []) out.add(id)
    }
  }
  return out
}

/**
 * 这一节把谁领进门了。
 *
 * ⚠️ `onEnter` 是**进这一节时**结算的，所以这一节自己的正文就用得上——
 * `kindred:wedding` 那一卷正是这样：嫂子在入口那一节被 `meet` 造出来，
 * 底下 `cold`/`warm` 两支写的是她进门头一天。**她当然活着。**
 *
 * 头一版没算这一层，于是那两支被报成候选。这是第六种正当写法
 * （前五种：chronicle 字段、hail 一族、bond 写法、seen 各自的 requires、
 * 写死的称呼）——而它跟前几种一样，**误报的是一处本来就做对了的地方**。
 */
function bornHere(effects: readonly unknown[] | undefined): Set<string> {
  const out = new Set<string>()
  for (const one of effects ?? []) {
    const rec = one as { type?: string; id?: string }
    if ((rec.type === 'meet' || rec.type === 'person') && typeof rec.id === 'string') out.add(rec.id)
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
  assured.set(
    scene.entry,
    new Set([...fromEvent, ...bornHere(scene.nodes[scene.entry]?.onEnter)]),
  )

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
      const node = scene.nodes[id]
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
      // 这一节自己领进门的人，在这一节的正文里当然还在
      for (const x of bornHere(node?.onEnter)) after.add(x)
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

/**
 * 判过的候选。**判过不等于修了**——这张表记的是判定，不是处置。
 *
 * 2026-09-14 头一轮判完六条，六条【全是真候选】：正文里那个人在做事
 * （躲到她身后、瞒着她、跟她吵架、在跟前、当家），而没有任何一处问过他还在。
 *
 * ⚠️ 六条里五条在 `kindred` 那一册，而那不是巧合：
 * **老屋那一族的人活得久、戏份多，而那一册的入场条件问的多半是【侄儿】**
 * ——`kindred-newyear` 问侄儿活着、`kindred-mourning` 问娘殁了，
 * 嫂子从头到尾没人问过，她只是「那个一直在那儿的人」。
 *
 * 处置口径照 `kindred:newyear` 已经做过的那样：**给「她没了」写一支**，
 * 而不是加个 `alive: true` 把玩家挡在外面——那样她殁了这一节直接没正文。
 */
const JUDGED: readonly { at: string; verdict: string; why: string }[] = [
  {
    at: 'kindred:newyear#small',
    verdict: '真候选',
    why: [
      '「{call:nephew}已经{age:nephew}了，见了你先躲到{call:brother-wife}身后」',
      '——侄儿躲到他娘身后。她殁了这一句就没法读。',
      '⚠️ 同一节里还有个 {age:nephew}，那一族另论（死人的岁数说得通）。',
    ].join('\n'),
  },
  {
    at: 'kindred:nephew-comes#behind-her-back',
    verdict: '真候选',
    why: [
      '「他没跟{call:brother-wife}说。」——节点名就是「背着她」。',
      '这一节的全部意思是【他瞒着他娘】，而瞒不了一个已经不在的人。',
    ].join('\n'),
  },
  {
    at: 'kindred:nephew-weds#groom-back-to-town',
    verdict: '真候选',
    why: [
      '侄儿成亲之后回镇上，正文写他媳妇留在老屋、跟他娘一处。',
      '侄媳妇是这一卷刚领进门的（不报），而他娘不是。',
    ].join('\n'),
  },
  {
    at: 'kindred:mourning#cold',
    verdict: '真候选，而且最硬',
    why: [
      '「头七那晚哥跟{call:brother-wife}吵了一架，隔着院子都听得见。」',
      '**死人吵不了架。** 这六处里最没有回旋余地的一条。',
    ].join('\n'),
  },
  {
    at: 'kindred:mourning#sour',
    verdict: '真候选',
    why: [
      '「老人家没了的时候，是嫂子在跟前。她跟你说，没受罪。」',
      '⚠️ 而 `kindred-mourning` 那一卷的 requires 只问',
      '{ bond: { kind: 「生母」, alive: false } }——【一个字不问嫂子】。',
      '奔丧那一卷开到玩家七十岁，那时嫂子多半也不在了。',
    ].join('\n'),
  },
  {
    at: 'kindred:brother-gone#uncle',
    verdict: '安全，而这一支【连不上】那条保证',
    why: [
      '「老屋如今是{call:sibling}当家。侄儿还小，轮不到他。」',
      '入边问的是 { house: { id: old-home, head: 「弟」 } }，而【户主不留死人】',
      '——`stores/people.ts` 的结算里户主殁了当场换人（那一行记 how: 交／殁）。',
      '所以这一条成立就意味着那个弟弟活着，**正文是对的**。',
      '',
      '⚠️ 而这一支连不上那条保证：`sibling` 的 bond 是【运行时按性别掷的】',
      '（`birth.ts` 的 bearKin：女为「妹」男为「弟」），而这里的 bond↔id 映射',
      '是从内容层的静态 meet 效果取的，掷出来的边它看不见。',
      '',
      '**没有硬改判据去追这一条**——那要把出生那一支的运行时逻辑搬进来，',
      '判据会变脆，而换来的只是少报一条。宁可让它留在名单上带着这段话。',
    ].join('\n'),
  },
]

interface Row {
  scene: string
  node: string
  who: string
}
const byProof = new Map<string, number>()
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
    const here = assured.get(nodeId) ?? new Set<string>()
    const born = bornHere(node.onEnter)
    const done = new Set<string>()
    for (const { who, guards } of callsIn(node)) {
      // 同一节里点两遍算一处
      if (done.has(who)) continue
      done.add(who)
      totalCalls += 1
      const bareId = who.includes('/') ? (who.split('/')[1] ?? who) : who
      if (ROLE_TOKENS.includes(bareId)) {
        roleish.push({ scene: sceneId, node: nodeId, who })
        continue
      }
      /*
       * 是哪一种证据保住了他。由近及远问——**报出来的是「凭什么」，
       * 不只是「行不行」**。
       *
       * ⚠️ 这四栏不是装饰。一栏长期为零，说明要么内容层不那么写、
       * 要么这一支认不出那种写法——而后者会变成误报，
       * 而误报会让看的人直奔一处没毛病的地方去查。
       */
      const proof =
        guards.has(bareId)
          ? '就近的条件'
          : born.has(bareId)
            ? '这一节领进门'
            : fromEvent.has(bareId)
              ? '入场条件'
              : here.has(bareId)
                ? '路上的分支'
                : null
      if (proof !== null) {
        covered += 1
        byProof.set(proof, (byProof.get(proof) ?? 0) + 1)
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
/*
 * ⚠️ 分栏而不是只报一个数，是用户和 GPT 定的那条不变量逼出来的：
 *
 * > **审计器只能指出「存在性证明缺口」，不能决定「证明必须通过 requires 补齐」。
 * > requires 只是证明方式之一。**
 *
 * 这一支头一版输出的是「N 个需要加 alive 的地方」，而那个说法本身就在替
 * 设计者做决定。25 处候选里只有 5 处该动内容，另 20 处是这支尺子
 * **不认识那种证明方式**——照着它一路加 requires，会加错 20 处，
 * 而每一处都不报错、门禁照样绿、可达世界悄悄缩小一圈。
 */
console.log(`  凭什么算「保住了」：`)
for (const [kind, n] of [...byProof.entries()].sort((x, y) => y[1] - x[1])) {
  console.log(`      ${kind.padEnd(14)} ${String(n).padStart(2)} 处`)
}
for (const kind of ['就近的条件', '这一节领进门', '入场条件', '路上的分支']) {
  if (!byProof.has(kind)) {
    console.log(`      ⚠️ 「${kind}」一处也没有——要么内容不那么写，要么这一支认不出它`)
  }
}
console.log()

const judgedAt = new Map(JUDGED.map((one) => [one.at, one] as const))
let unjudged = 0
for (const [who, rows] of [...byWho.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${who.padEnd(24)} ${String(rows.length).padStart(2)} 处`)
  for (const row of rows) {
    const at = `${row.scene}#${row.node}`
    const judged = judgedAt.get(at)
    if (judged === undefined) unjudged += 1
    console.log(`      ${judged === undefined ? '⚠️ 还没判' : `〔${judged.verdict}〕`} ${at}`)
  }
}
console.log(
  `
  判过 ${bare.length - unjudged} / ${bare.length} 条` +
    (unjudged > 0 ? `，还有 ${unjudged} 条没判过` : '——【判过不等于修了】，处置见各条的 why'),
)

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
