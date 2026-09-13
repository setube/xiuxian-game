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
function probe(cond: Condition, out: Map<string, Set<string>>): void {
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
      if (others.length === 0) cells.add(kind)
      for (const cell of others) cells.add(`${kind}.${cell}`)
    }
  }
}

const asked = new Map<string, Set<string>>()

// 一、年表事件的入场条件
for (const event of lifeEvents) for (const one of event.requires ?? []) probe(one, asked)

// 二、卷里的分支、seen、选项
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    for (const branch of node.branches ?? []) for (const one of branch.requires) probe(one, asked)
    for (const seen of node.seen ?? []) for (const one of seen.requires) probe(one, asked)
    for (const choice of node.choices ?? []) {
      for (const one of choice.requires ?? []) probe(one, asked)
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

console.log(`\n=== 这个人身上，哪几格是活的 ===\n`)
console.log(
  `  量的是【内容层问过没有】，不是引擎读不读——` +
    `引擎那一层（live 每年推 health/span/fate）对所有人一视同仁，区分不出谁。\n`,
)

const rows = [...new Set([...asked.keys(), ...known])]
  .filter((id) => id !== 'me')
  .map((id) => ({ id, cells: [...(asked.get(id) ?? [])].sort() }))
  .sort((a, b) => b.cells.length - a.cells.length)

for (const row of rows) {
  if (row.cells.length === 0) continue
  console.log(`  ${row.id.padEnd(22)} ${String(row.cells.length).padStart(2)} 格   ${row.cells.join('  ')}`)
}

const mute = rows.filter((row) => row.cells.length === 0)
if (mute.length > 0) {
  console.log(
    `\n  ◇ 内容层立过、而【一格也没被问过】的 ${mute.length} 个：\n      ${mute.map((r) => r.id).join('、')}`,
  )
  console.log(
    `      ——不是缺陷：多数人本来就只需要「他在」。\n` +
      `      而给他们写内容之前值得先看一眼，改了哪一格会有人接。`,
  )
}

console.log(
  `\n  ⚠️ 一格「零处问过」不等于死的（引擎可能在读），\n` +
    `  但它确实等于【改了它，没有任何一句正文或一条分支会因此不同】。\n`,
)
