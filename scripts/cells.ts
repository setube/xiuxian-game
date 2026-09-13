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
 * ## ⚠️ 「格子少」有两种，而这张表分不出来
 *
 * ```
 * 漏了    正文把他当【一个人】使，而条件层没有能力问他的状态
 * 一致    正文把他当【一个位置】使，而位置本来就只需要「有没有人在」
 * ```
 *
 * `father` 是后者的标本：**3 格 · 30 卷**，三格全是存在状态
 * （`alive` / `cause` / `present`），看着像这张表上最大的缺口。
 * 而一手数过：
 *
 * ```
 * {dam} / {elder} 在正文里      164 处
 * {call:father} / {call:mother} / {call:brother}   【各 0 处】
 * ```
 *
 * **爹娘哥从来不被指名。** 内容层从一开始就把他们当位置用
 * （`{elder}` 爹殁了就落到娘身上），**条件层只问存在状态是一致的，不是漏的。**
 *
 * ⚠️ 所以读这张表时，「格子少」要先问一句：
 * **正文是拿他当人用，还是当位置用？** 而那个答案在
 * 「正文点他几处」那一栏里——**点名数为零的，多半是位置。**
 *
 * （这也是为什么这一支有意不把 `{dam}`/`{elder}` 算进「正文消费」：
 * 算进去会让位置看着像人，而那正是要分开的两件事。）
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

/**
 * 条件里指人的那几个键。`tie` 那种一条边两头都算。
 *
 * ⚠️ `who` 是第九种漏掉的写法：`{ mayAsk: { who: 'east-head', how: '寒暄' } }`
 * 问的是「能不能跟这个人说上这种话」——**一种真实的观察面**，
 * 而头一版按 `id` 归户，认不出它。
 *
 * 全库只有四处（都在 `regard.ts`），而它恰好落在
 * 「`east-head` 五卷里只有一格」那笔账上——**那一格本来就不止一格。**
 */
const WHO_KEYS = ['id', 'from', 'to', 'who'] as const

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
    /*
     * ⚠️ `knownAs` 没有 `id`，它问的是「当年认定的那一个」：
     *
     *     { knownAs: { kind: 'playmate', present: true } }
     *
     * 而正文那一头用的正是 `{call:known/playmate}`——**同一个指称**。
     * 所以把它记成 `known/<kind>`，两头才对得上。
     *
     * 头一版认不出它，于是 `playmate` 那三卷全被报进风险栏
     * （`census:mismatch` / `playmate:wed` / `playmate:years`），
     * **而那三卷的入场条件全都写着 `present: true`**——一处也不是风险。
     *
     * ⚠️ 这是第八次修射程，而它属于「判据看不懂的写法」那一类：
     * 该修。跟「判据看得懂、而我不想看见的结果」要分开
     * （后者记成已判定的反例就够了，见底下风险栏那一段）。
     */
    const kindOf = inner['kind']
    if (who.length === 0 && kind === 'knownAs' && typeof kindOf === 'string') {
      who.push(`known/${kindOf}`)
    }
    // `{ bond: { kind: '配偶', … } }` 问的是关系种类，落在谁身上从内容层现取
    if (who.length === 0 && kind === 'bond' && typeof kindOf === 'string') {
      for (const id of BOND_TO_ID.get(kindOf) ?? []) who.push(id)
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

/**
 * 哪种关系落在哪个 id 上。**从内容层的 `meet` 效果现取，不列凭印象的表。**
 *
 * ⚠️ 没有它，`{ bond: { kind: '配偶', alive: true } }` 这种写法认不出在问谁
 * ——`mountain:asked-home` 的入场条件明写着那一条，而 `spouse`
 * 照样被报进风险栏。**判据看不懂的写法，属于射程问题，该修。**
 */
const BOND_TO_ID = new Map<string, Set<string>>()
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const fx = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of fx) {
      const rec = one as { id?: string; bond?: string }
      if (typeof rec.id !== 'string' || typeof rec.bond !== 'string') continue
      if (!BOND_TO_ID.has(rec.bond)) BOND_TO_ID.set(rec.bond, new Set())
      BOND_TO_ID.get(rec.bond)?.add(rec.id)
    }
  }
}

/** 哪一卷自己把谁领进门了。那一卷的正文用他，不算风险 */
const bornIn = new Map<string, Set<string>>()
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const fx = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of fx) {
      const rec = one as { type?: string; id?: string }
      if (rec.type !== 'meet' && rec.type !== 'person') continue
      if (typeof rec.id !== 'string') continue
      if (!bornIn.has(sceneId)) bornIn.set(sceneId, new Set())
      bornIn.get(sceneId)?.add(rec.id)
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
        /*
         * ⚠️ **不截 `known/` 那个前缀。**
         *
         * `{call:playmate}` 和 `{call:known/playmate}` 是【两个指称】：
         * 前者是此刻顶上的那个孩子，后者是当年认定的那一个
         * （`engine/interpolate.ts` 那段注释分过，而那两者常常不是同一个人）。
         *
         * 条件那一头也分：`family: { id: 'playmate' }` 问前者，
         * `knownAs: { kind: 'playmate' }` 问后者。**各对各的。**
         *
         * 头一版把 `known/playmate` 截成 `playmate`，于是正文那头记成前者、
         * 条件那头记成后者，两头对不上——`playmate` 那三卷因此全被报进风险栏，
         * **而它们的入场条件全都写着 `present: true`。**
         */
        bump(rawId, sid)
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
        /*
         * ⚠️ 称呼后面紧跟【司／局／房／院】的，那是**衙门不是人**。
         *
         * `chancellor` 的 `calls` 是「长史」，而 `schooling` 里写的是
         * 「教授是【长史司】的属官」——风险栏因此把他报了出来。
         *
         * 一手量过全库：那八个称呼后面跟的字，只有「长史」被机构名吃掉
         * （八次里八次跟着「司」）。其余跟的都是标点、动词、引号。
         * **所以这一条窄得很，而它恰好盖住那唯一的一处。**
         */
        if (new RegExp(`${word}[司局房院]`).test(text)) continue
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
  /*
   * ⚠️ 点名数为零 → 标「◇ 当位置用」，不是「正文不点他」。
   *
   * 两种说法的差别不在字面，在【读的人下一步做什么】：
   * 「不点他」读起来像缺口（该去补），「当位置用」读起来是一种写法
   * （不该动）。`father` 3 格 · 30 卷，而 {call:father} 全库 0 处
   * ——内容层把他当位置（{elder} 爹殁了就落到娘身上），
   * 条件层只问存在状态是【一致的，不是漏的】。
   */
  const seen = n === 0 ? '◇ 当位置用  ' : `正文点他 ${String(n).padStart(2)} 处`
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
 * `shop-keeper` 报 3 卷，也判完了，**三处全是同词碰撞**：
 *
 * ```
 * debt:quit      「掌柜的话不多，只在你搬错东西的时候骂一句」  ← 真的是他，而他在场
 * omen:book      货郎【转述府城当铺】：「掌柜的看了一眼就摆手」 ← 隔两层，另一家的
 * omen:merchant  「他在跟掌柜的说话」（你在旁边听见）          ← 另一家铺子的
 * ```
 *
 * ⚠️ `omen:book` 那句嵌在**货郎转述见闻**里——**隔了两层**，
 * 而静态扫只看见「掌柜」两个字。
 *
 * 剩下三处也判完了，**零缺陷**：
 *
 * ```
 * chancellor  school:threshold   「教授是【长史司】的属官」  ← 撞的是【衙门名】
 * apprentice  refuge:master      「上个月遣了一个徒弟回家」  ← 那位老师傅的徒弟
 * sibling     kindred:brother-gone 入边问 house.head='弟'    ← 户主不留死人
 * ```
 *
 * ⚠️ `chancellor` 那处把同词碰撞又推了一层：**撞的不是另一个人，是一个机构**
 * （`长史司`）。「从字面到人」那一跳跨不过去的，不止是人名。
 *
 * ### 合起来：风险栏五个人八处，全部判完，零缺陷
 *
 * 而它们只用了三种理由（同词碰撞 ×5、正在说他没了 ×2、别处已有保证 ×1）
 * ——**可解释性本身就是这张表在工作的证据**，而同一张表上
 * `brother-wife` 那五处修完就退下去了。
 *
 * **四处零缺陷，而它们只命中三种理由：**
 *
 * ```
 * 一  同词碰撞      同一个词指的是另一个人（甚至指玩家自己）
 * 二  正在说他没了  那句话本身就是他不在了的陈述
 * 三  时间点错开    那句话发生在他存在【之前】（拜师、收徒那一刻）
 * ```
 *
 * ## ⚠️ 而那四处里有两处，判定的理由【只看见了一层】
 *
 * 后来给这一支补上「认 `bond` 那种写法」之后，`craft:out` 和
 * `youth:apprentice` 自己从表上退下去了——**那两卷用 `bond` 问过他**。
 *
 * ```
 * 我当时判的   正文在说他没了 / 拜师那一刻他还不存在    ← 没错
 * 而同时还有   那一卷的入场条件用 bond 问过他          ← 我没看见
 * ```
 *
 * **判定结论对，而理由只写了一半。** 真正的教训在流程上：
 * **逐处读正文判「正当」的时候，我没有去看那一卷的入场条件。**
 * 看了就会发现它们根本不该出现在表上。
 *
 * 所以判一处风险候选，两件事都要做：
 *
 * ```
 * 一  读那句正文        它在说什么（同词碰撞？在说他没了？他还没出现？）
 * 二  读那一卷的条件    是不是已经有一层保证，而这一支没认出来
 * ```
 *
 * ⚠️ **只做第一件，会把「判据的射程问题」记成「内容的正当例外」**
 * ——而那两者的处置相反：前者该修判据，后者该留着不动。
 *
 * ⚠️ **所以这一栏报的是风险面，不是缺陷清单。**
 * 四处全正当不是「这一支没用」——它把该看的四处摆了出来，人看完判定没问题。
 * **摆出来和判红是两件事。**
 *
 * 反面的证据在同一张表上：`brother-wife` 现在只剩 1 卷，
 * 而那一轮修掉的五处【当时全在这张表上】。
 *
 * ## ⚠️ 这四处【不许】变成排除规则
 *
 * 看见四处正当例外，最自然的下一步是「给判据加个条件把它们滤掉」
 * ——**而那正是要防的事**：
 *
 * > 下一次有人看到这种正当例外，为了让报表更漂亮给规则加一个过宽的排除，
 * > 最后把真正的 `brother-wife` 一起放掉。
 *
 * 这一支这一轮已经加过七次排除（chronicle 字段、hail 一族、bond 写法、
 * seen 各自的 requires、onEnter 造人、户主不留死人、多义称呼）
 * ——**七次都对，而七次都是在拿分辨力换整洁。** 到第八次就该停下来问：
 * 这一条排除的是「判据看不懂的写法」，还是「判据看得懂而我不想看见的结果」？
 *
 * ```
 * 前者  判据的射程问题     该修
 * 后者  报表的观感问题     不该修 —— 记成【已判定的反例】就够了
 * ```
 *
 * 那四处属于后者，所以它们写在这儿，**没有变成一行代码**。
 *
 * ## 这一栏的质量该怎么看
 *
 * > **不是「命中即缺陷」，而是一个高价值的人工判定边界。**
 * > 质量看【真实缺陷是否集中出现】、【正当例外能否被解释】，
 * > 不看候选数量有多少。
 *
 * 按这个标准：嫂子五中五（集中），师傅四处例外三种理由（可解释）。
 * **一支走查在一个人身上零命中、在另一个人身上五中五，正是它该有的样子。**
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
  // 角色记号是位置不是人（`{elder}` 落到谁身上现算），风险栏也不收
  if (ROLE_IDS.includes(id as (typeof ROLE_IDS)[number])) continue
  const watched = wheres.get(id) ?? new Set<string>()
  const gap = [...scenes]
    /*
     * ⚠️ 这一卷【自己把他领进门】的，不算风险。
     *
     * `onEnter` 是进那一节时结算的，所以那一节的正文当然用得上他
     * ——`school:threshold` 造完 `tutor` 紧接着就说「侍讲姓沈」，
     * 中间隔不了任何东西。
     *
     * 头一版没这一层，`tutor` / `chancellor` 都因此被报进风险栏。
     * 这跟 `absent.ts` 的 `bornHere` 是同一条，**而两支各写了一遍**
     * ——没合成公用函数是有意的：那两支的输入不同（一个按节点、
     * 一个按卷），合起来会多出一层「按什么粒度」的参数，
     * 而那正是这一族最容易出错的地方。
     */
    .filter((one) => !bornIn.get(one)?.has(id))
    .filter((one) => !watched.has(one))
    .sort()
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


/*
 * ⚠️ 这一支【判不了】的两块，印在报表上而不是只写在文件头。
 *
 * 理由：**注释只在有人读那个文件时存在，报表上那一行每次跑都念一遍。**
 * 一块没人看得住的地方，如果只写在四十行注释里，
 * 下一个人看见三栏都干净，会以为这一族已经查完了。
 */
console.log(
  `  ◇ 这一支【判不了】的两块（每次都念一遍，别当它们已经查过）：` +
    `\n      一、写死的称呼——「乳母说，年景不好」那种。` +
    `这一支扫的是 {call:}/{hail:} 占位符，写死的字一个也看不见。` +
    `\n      二、days-manor 那一族（BEATS/DOINGS）——结构不同，够不着。` +
    `\n      两块都【确实是玩家读得到的字】，而这张表里它们不存在。\n`,
)

console.log(
  `\n  格子后头的「·」表示【全库只被问过一处】——那一格刚开了个口，还写得进去。

  ⚠️ 一格「零处问过」不等于死的（引擎可能在读），\n` +
    `  但它确实等于【改了它，没有任何一句正文或一条分支会因此不同】。\n`,
)
