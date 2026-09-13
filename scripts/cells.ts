/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 这个人身上，哪几格是活的。
 *
 * 跑法：`bun scripts/cells.ts`
 *
 * ## 这一支从一句判据来
 *
 * > **不要从「对象有这个字段」推导「这个字段可以成为这个对象的剧情状态」。**
 * >
 * > 一个字段只有在它**参与真实世界判定**、或者存在**明确的下游消费契约**时，
 * > 才算这个对象当前可用的动态事实。**否则它只是结构上的储存位置。**
 *
 * 起因是写邻居第二卷时连撞三堵墙。东邻那一户六格逐格问下来：
 *
 * ```
 * members      ✓ 通    live() 每年推、方位判定读、条件层读
 * livelihood   ✗       全库 family.livelihood 只问过 brother 和 nephew
 * residence    ✗       模型错配：内容当人，引擎当位置
 * head         ✗       同上
 * ```
 *
 * **第一卷（东邻添丁）不是挑得准，是撞对了唯一通着的那一格。**
 *
 * ## 所以顺序要倒过来
 *
 * ```
 * ✗ 这个人还能发生什么故事 → 需要哪些字段 → 逼世界模型补
 * ✓ 这个人的哪些世界事实【目前是活的】 → 故事候选从那里长出来
 * ```
 *
 * 这一支回答的正是箭头右边那一问。
 *
 * ## 它量的是「内容层问过没有」，不是「引擎读不读」
 *
 * ⚠️ 这个区分要紧，因为两者的含义完全不同：
 *
 * ```
 * 引擎读     health / span / fate 被 live() 每年读一遍
 *            ——【对所有人一视同仁】，所以它区分不出谁的哪一格值得写
 * 内容问     { family: { id: 'brother', livelihood: [...] } }
 *            ——【针对某一个人】，这才是「给他写这一格有没有人接」
 * ```
 *
 * 所以一格「内容层零处问过」不等于死的（引擎可能在读），
 * 但**它确实等于「改了它，没有任何一句正文或一条分支会因此不同」**。
 *
 * ## 它是一张交叉表，不是排行榜
 *
 * > 这不是人物健康度表，也不是「谁缺字段」的排行榜，而是一张
 * > **「实体事实观察能力 × 正文语义消费」的交叉表**。
 *
 * 两栏配不配得上，才是它要说的事。**单看任何一栏都判不了。**
 *
 * ## 四种，而这一支只判得了前三种
 *
 * ```
 * A  有条件观察面                          nephew 6 格、brother 6 格…
 * B  没有观察面，正文也不专门点他          不是问题（多数配角）
 * C  没有观察面，【而正文一直在用他】      内容层把他当活人使，条件系统问不了
 * ────────────────────────────────
 * D  【有观察面，而用到他的那几节没问】    ← 这一支【判不了】
 * ```
 *
 * ⚠️ **嫂子那五处穿帮是 D，不是 C。** 她在这一支里报 5 格
 * （`family.alive` / `exists` / `present` / `temper.in` / `tie.terms`）
 * ——**问过，只是不在让她躲孩子、跟哥吵架、在老人跟前的那几节问。**
 *
 * D 归 `absent.ts`：它算的正是「到达某一节的所有路径上，那个人的存活
 * 有没有被保证」。两支的分工因此是：
 *
 * ```
 * cells.ts    这个人【整体上】有没有观察面     A / B / C
 * absent.ts   【具体那一节】保证了没有         D
 * ```
 *
 * **一个人可以同时是 A 和 D**——那正是嫂子，也正是最难看见的那一种：
 * 报表上她有五格，看着比谁都健全。
 *
 * ## ⚠️ 两条边界
 *
 * **一、`bond` 那种写法它认不出指的是谁。**
 * `{ bond: { kind: '配偶', alive: true } }` 问的是关系种类，
 * 而这一支按 `id` 归户。所以 `spouse` 报出来只有两格，
 * **而那一卷的入场条件明写着 `alive: true`**——它没算进去。
 * 这跟 `absent.ts` 撞的是同一堵墙：**指称没闭合，静态就连不上。**
 *
 * **二、角色记号不是人。** `elder` / `dam` / `child` / `playmate` 是位置，
 * 现算的；它们出现在「零格」那一栏里是噪声，已排掉。
 *
 * ⚠️ **而排掉它们，让「正文消费」那一栏在几个人身上偏低。**
 *
 * ```
 * brother   6 格 · 正文不点他      ← 而哥在正文里当然出现
 * mother    5 格 · 正文不点他      ← 娘更是
 * ```
 *
 * 真因：他们在正文里走的是 `{dam}` / `{elder}`（134 + 85 处），
 * 而那两个记号**落到谁身上是现算的**——爹殁了 `{elder}` 就落到娘身上。
 * 「`{dam}` 消费了 mother」这句话严格说不成立，所以不算。
 *
 * **所以「正文不点他」要读成「没有一处【指名道姓】地点他」，
 * 不是「正文里没有他」。** 这一栏量的是**指名的消费**，
 * 而通过位置出场的那一大片，这一支照旧看不见。
 *
 * ## 报数，不判成败
 *
 * 零处不是缺陷——多数人本来就只需要「他还在不在」。
 * 这一支的用处在**动笔之前**：想给谁写点什么的时候，先看看他身上有哪几格通着。
 */
import './lib/seeded'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { ROLE_IDS } from '../src/engine/interpolate'
import type { Condition } from '../src/types/game'

/** 条件里指人的那几个键。`tie` 那种一条边两头都算 */
const WHO_KEYS = ['id', 'from', 'to'] as const

/**
 * 一条条件问了谁的哪一格。
 *
 * 不枚举条件种类——**种类有三十三种，而且还会加**。
 * 认的是形状：顶层 key 是种类，值里带 `id` / `from` / `to` 的就是在问某个人，
 * 值里别的键就是在问那个人的哪一格。
 */
function probe(cond: Condition, out: Map<string, Set<string>>, where: string): void {
  for (const [kind, value] of Object.entries(cond as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') continue
    const inner = value as Record<string, unknown>
    const who: string[] = []
    for (const key of WHO_KEYS) {
      const v = inner[key]
      if (typeof v === 'string') who.push(v)
    }
    if (who.length === 0) continue
    for (const id of who) {
      if (!out.has(id)) out.set(id, new Set())
      const cells = out.get(id)
      if (cells === undefined) continue
      // 只问了「是谁」而没问别的格 → 记成这个种类本身（family 那种就是问在不在）
      const others = Object.keys(inner).filter((k) => !(WHO_KEYS as readonly string[]).includes(k))
      const names = others.length === 0 ? [kind] : others.map((cell) => `${kind}.${cell}`)
      for (const name of names) {
        cells.add(name)
        const key = `${id}␟${name}`
        howOften.set(key, (howOften.get(key) ?? 0) + 1)
        if (!wheres.has(id)) wheres.set(id, new Set())
        wheres.get(id)?.add(where)
      }
    }
  }
}

const asked = new Map<string, Set<string>>()
/**
 * 每一格【被问过几处】。
 *
 * ⚠️ 只报「问过没有」是不够的：一格被问过一处和被问过八处，
 * 在布尔那一栏里长得一模一样，**而它们对「还能不能往这儿写」
 * 给出的是相反的答案**。
 *
 * ```
 * family.health   craft-master 一处   ← 全库唯一一处读 health 的内容
 *                                        这一格【刚开了一个口】
 * family.alive    到处都是            ← 已经用满了
 * ```
 *
 * 分隔符用 ␟（U+241F），不用 NUL——真 NUL 会让 grep 把整个源文件
 * 当二进制，一行匹配都不打印（`engine/kinTree.ts` 正踩着那个坑）。
 */
const howOften = new Map<string, number>()
/**
 * 这个人**在几卷里**被观察过。
 *
 * ⚠️ 第三维，而它比格子数还要紧：
 *
 * ```
 * craft-master  4 格，【全在 refuge 一卷里】  → 那一卷之外他是隐形的
 * nephew        6 格，分布在六七卷            → 世界反复在观察他
 * ```
 *
 * 两者在「格子数」那一栏里长得一模一样，**而含义相反**。
 * 四格全在一卷不是「四个口」，是**一个口开了四格**。
 *
 * 而它跟嫂子那一族同构：她五格，可让她躲孩子、跟哥吵架的那几节一格不问
 * ——**观察面集中在少数几卷，等于别处全是盲区。**
 */
const wheres = new Map<string, Set<string>>()

// 一、年表事件的入场条件
for (const event of lifeEvents) {
  for (const one of event.requires ?? []) probe(one, asked, event.scene ?? event.id)
}

// 二、卷里的分支、seen、选项
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    for (const branch of node.branches ?? []) {
      for (const one of branch.requires) probe(one, asked, sceneId)
    }
    for (const seen of node.seen ?? []) for (const one of seen.requires) probe(one, asked, sceneId)
    for (const choice of node.choices ?? []) {
      for (const one of choice.requires ?? []) probe(one, asked, sceneId)
    }
  }
}

/** 内容层立过的人：他们【本可以】被问，所以零处才有意义 */
const known = new Set<string>()
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const fx = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of fx) {
      const rec = one as { type?: string; id?: string }
      if ((rec.type === 'meet' || rec.type === 'person') && typeof rec.id === 'string') {
        known.add(rec.id)
      }
    }
  }
}
// 邻居那几个是立基造的，内容层从没 meet 过，可内容层一直在点他们
for (const id of ['east-head', 'east-wife', 'west-head', 'west-wife']) known.add(id)
// 角色记号是位置不是人（elder 落到谁身上现算），从「零格」那一栏里排掉
for (const token of ROLE_IDS) known.delete(token)
/**
 * 正文消费了他几次：占位符 + 写死的称呼。
 *
 * ⚠️ 这一维是这一支的【第二根轴】，而没有它「0 格」判不了任何事：
 *
 * ```
 * 0 格 + 正文也不点他   他只是「目前没进条件层的实体」——不是问题
 * 0 格 + 正文一直在用他 内容层把他当活人使，而条件系统【没能力问他的状态】
 * ```
 *
 * **后者才是嫂子那一族的同构形式。** 那五处穿帮正是这么来的：
 * 正文让她躲孩子、跟哥吵架、在老人跟前，而那几卷一格也不问她。
 */
const PLACEHOLDER = new RegExp('\\{(?:call|hail):([^}]+)\\}', 'g')
const used = new Map<string, number>()
/**
 * 正文在**哪几卷**专指消费他。跟 `wheres`（条件层在哪几卷观察他）成对。
 *
 * ⚠️ 这一对是这一支最后一层，也是最有力的一层：
 *
 * > **这个实体的世界模型，是否在它【真正被世界使用的地方】保持可观察。**
 *
 * 两组卷集合求差——`usedIn - wheres` 就是**风险卷**：
 * 正文在那一卷里用了他，而条件层在那一卷里一句也没问过他。
 *
 * 嫂子那五处穿帮全部落在这个差集里，**而它们本可以在动笔之前就被标出来。**
 */
const usedIn = new Map<string, Set<string>>()
const bump = (id: string, where: string): void => {
  used.set(id, (used.get(id) ?? 0) + 1)
  if (!usedIn.has(id)) usedIn.set(id, new Set())
  usedIn.get(id)?.add(where)
}

/** 字面称呼 → 谁。从内容层的 meet 现取，不列凭印象的表 */
const literal = new Map<string, string[]>()
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const fx = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of fx) {
      const rec = one as { type?: string; id?: string; calls?: string }
      if (rec.type !== 'meet' || typeof rec.id !== 'string') continue
      if (typeof rec.calls !== 'string') continue
      literal.set(rec.calls, [...(literal.get(rec.calls) ?? []), rec.id])
    }
  }
}
for (const [sid, scene] of Object.entries(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const texts: string[] = []
    for (const blk of node.blocks) if ('text' in blk) texts.push(blk.text)
    for (const one of node.seen ?? []) texts.push(one.text)
    for (const choice of node.choices ?? []) texts.push(choice.label)
    for (const text of texts) {
      for (const found of text.matchAll(PLACEHOLDER)) {
        const rawId = found[1]
        if (rawId === undefined) continue
        bump(rawId.includes('/') ? (rawId.split('/')[1] ?? rawId) : rawId, sid)
      }
      /*
       * 写死的称呼。⚠️ **只认专指的那些**——一个称呼映射到几个人，
       * 它就不是在点谁。
       *
       * 这个判据从系统取，不列一张凭印象的通用词表：
       *
       *     calls: '孩子' → son 和 daughter 两个人   → 不专指，不算
       *     calls: '徒弟' → apprentice 一个人        → 专指，算
       *
       * 头一版没这一条，`daughter` 报出「正文点她 35 处」，
       * **而其中 32 处是「孩子」两个字**——那个数是虚的，
       * 而它恰好会把 C 类头一名做实。
       */
      for (const [word, ids] of literal) {
        if (ids.length !== 1) continue
        if (!text.includes(word)) continue
        const only = ids[0]
        if (only !== undefined) bump(only, sid)
      }
    }
  }
}


console.log(`\n=== 这个人身上，哪几格是活的 ===\n`)
console.log(
  `  量的是【内容层问过没有】，不是引擎读不读——` +
    `引擎那一层（live 每年推 health/span/fate）对所有人一视同仁，区分不出谁。\n`,
)

const rows = [...new Set([...asked.keys(), ...known])]
  .filter((id) => id !== 'me')
  .map((id) => ({ id, cells: [...(asked.get(id) ?? [])].sort() }))
  .sort((a, b) => b.cells.length - a.cells.length)

/*
 * ⚠️ 两维并列，**不按格子数排行**。
 *
 * 头一版按格子数从多到少排，而那个排法有害：
 * **格子多的人正是戏多的人，而戏多意味着「有几节没问他」的机会多。**
 * 嫂子五格排在前列，看着比谁都健全——而她正是那一轮修了五处的人。
 *
 * 排行榜的框架会让人读成「上面的健康、下面的有问题」，
 * 而这张表想说的是【这两栏配不配得上】。
 */
for (const row of rows) {
  if (row.cells.length === 0) continue
  const n = used.get(row.id) ?? 0
  const seen = n === 0 ? '正文不点他' : `正文点他 ${String(n).padStart(2)} 处`
  const spread = wheres.get(row.id)?.size ?? 0
  const only = spread === 1 ? '⚠️ ' : ''
  const head =
    `  ${row.id.padEnd(20)} ${String(row.cells.length).padStart(2)} 格 · ` +
    `${only}${String(spread).padStart(2)} 卷 · ${seen.padEnd(13)}`
  // 一格只被问过一处的，标个 ·  ——那一格【刚开了一个口】，还写得进去
  const cells = row.cells.map((cell) => {
    const n = howOften.get(`${row.id}␟${cell}`) ?? 0
    return n === 1 ? `${cell}·` : cell
  })
  console.log(`${head} ${cells.join('  ')}`)
}

/*
 * 三分类。**只有 C 值得审**——「0 格」本身判不了任何事。
 *
 * > `daughter` 零格本身不是嫂子问题；
 * > 「正文已经消费她，而条件层观察面为零」才是嫂子问题的同构形式。
 */
/**
 * ⚠️ 风险栏怎么读：头一次人工判完的四处，【四处全是正当的】。
 *
 * `craft-master` 报 4 卷，逐处读正文：
 *
 * ```
 * counter:years     「柜上那位老师傅说的」      别人口中的另一个老师傅 —— 同词碰撞
 * house:succeed     「老师傅呢」「你说不在了」  正文本身就在说他不在了
 * youth:apprentice  「你拜了师傅」              拜师那一刻他还不存在 —— 时间点错开
 * craft:out         「师傅没了。铺子里的活…」   同第二种
 * ```
 *
 * **四处零缺陷，而它们只命中三种理由：**
 *
 * ```
 * 一  同词碰撞      同一个词指的是另一个人（甚至指玩家自己）
 * 二  正在说他没了  那句话本身就是他不在了的陈述
 * 三  时间点错开    那句话发生在他存在【之前】（拜师、收徒那一刻）
 * ```
 *
 * ⚠️ **所以这一栏报的是风险面，不是缺陷清单。**
 * 四处全正当不是「这一支没用」——它把该看的四处摆了出来，人看完判定没问题。
 * **摆出来和判红是两件事。**
 *
 * 反面的证据在同一张表上：`brother-wife` 现在只剩 1 卷，
 * 而那一轮修掉的五处【当时全在这张表上】。
 */
/*
 * ⚠️ 最后一层，也是最有力的一层。
 *
 * > **这个实体的世界模型，是否在它【真正被世界使用的地方】保持可观察。**
 *
 * 两组卷集合求差：`正文专指用过他的卷` − `条件层观察过他的卷`。
 * 差集里的每一卷都是【正文在那儿用了他，而那儿一句也没问过他】。
 *
 * 嫂子那五处穿帮全部落在这个差集里——**而它们本可以在动笔之前被标出来。**
 */
const risky: { id: string; scenes: string[] }[] = []
for (const [id, scenes] of usedIn) {
  const watched = wheres.get(id) ?? new Set<string>()
  const gap = [...scenes].filter((one) => !watched.has(one)).sort()
  if (gap.length > 0) risky.push({ id, scenes: gap })
}
risky.sort((x, y) => y.scenes.length - x.scenes.length)
if (risky.length > 0) {
  console.log(
    `\n  ⚠️ 正文在这些卷里【专指用了他】，而这些卷【一句也没问过他】：`,
  )
  for (const row of risky) {
    const head = `      ${row.id.padEnd(18)} ${String(row.scenes.length).padStart(2)} 卷`
    console.log(`${head}   ${row.scenes.slice(0, 4).join('  ')}${row.scenes.length > 4 ? '  …' : ''}`)
  }
  console.log(
    `      ——不是每一处都是穿帮（回想、说他不在了、整卷讲死人都算正当），` +
      `\n      而【那五处已经修掉的嫂子穿帮，当时全在这张表上】。`,
  )
}

const mute = rows.filter((row) => row.cells.length === 0)
const quiet = mute.filter((row) => (used.get(row.id) ?? 0) === 0)
const loud = mute
  .filter((row) => (used.get(row.id) ?? 0) > 0)
  .sort((x, y) => (used.get(y.id) ?? 0) - (used.get(x.id) ?? 0))

if (quiet.length > 0) {
  console.log(
    `\n  ◇ B 类 ${quiet.length} 个：没有条件观察面，正文也不点他——【不是问题】` +
      `\n      ${quiet.map((r) => r.id).join('、')}`,
  )
}
if (loud.length > 0) {
  console.log(`\n  ⚠️ C 类 ${loud.length} 个：正文【一直在用他】，而条件层一格也问不了：`)
  for (const row of loud) {
    const n = String(used.get(row.id) ?? 0).padStart(2)
    console.log(`      ${row.id.padEnd(20)} 正文点他 ${n} 处`)
  }
  console.log(
    `      ——内容层把他当活人使，而条件系统没有能力询问他的状态。` +
      `\n      **这才是要审的那一栏**，「零格」本身不是。`,
  )
}


console.log(
  `\n  格子后头的「·」表示【全库只被问过一处】——那一格刚开了个口，还写得进去。

  ⚠️ 一格「零处问过」不等于死的（引擎可能在读），\n` +
    `  但它确实等于【改了它，没有任何一句正文或一条分支会因此不同】。\n`,
)
