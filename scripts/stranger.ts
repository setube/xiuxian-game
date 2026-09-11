/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 正文里不许出现「一个陌生人」。
 *
 * 跑法：`bun scripts/stranger.ts`
 *
 * ## 这个故障长什么样
 *
 * `{call:nephew}` 在正文里现场解析成一个称呼。而 `people.callOf()`
 * 找不到那个人时**不报错**——它老实答「一个陌生人」。于是：
 *
 *     写的是   他往{call:nephew}媳妇身后躲了半步，手抓着她的裤腿。
 *     印出来   他往一个陌生人媳妇身后躲了半步，手抓着她的裤腿。
 *
 * **句子通顺、类型过、门禁绿，而它是错的。** 这是「应该出现的东西
 * 沉默了」的反面——不该出现的东西出现了，而且伪装成一句正常的话。
 *
 * ## 为什么单独立一支，而不是塞进别处
 *
 * 三支门禁的注释里都记着自己撞见过这个症状
 * （`address.ts` 把爹叫成一个陌生人、`kindred.ts` 年节正文里嫂子和侄儿、
 * `naming.ts` 知道了名字却还叫一个陌生人）——**三次都是顺带撞上的，
 * 没有一支在守它**。而它散在十册 54 处。
 *
 * ## 判法：摆局问「这个人不在认知库里会怎样」，不等真世撞
 *
 * 2026-09-11 实测：300 世真跑**零次**印出这句话。
 * 而那个零没有分辨力——`kindred` 那 27 处在常演的册里（说明常见路径不漏），
 * 可 `descend` / `mountain` / `royal` 那几册本身就稀，
 * 三百世抽不到它们等于没问过。
 *
 * 所以这一支**静态扫全库 + 摆局验每个人**：
 * 把认知库清空，逐个问 `{call:X}` 印出什么。
 * 印出「一个陌生人」的，就是那一处在「没见过这个人」时的真实样子。
 *
 * ⚠️ **这一支不要求 54 处全都有兜底**——多数情形下那个人确实在册
 * （正文点名说谁，条件就得问谁，那是另一条纪律管的）。
 * 它守的是**新写的正文别引用一个从没入册的人**：
 * 名单一旦变长，就是有人写了一句话指着一个世界里还不存在的人。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { fillString } from '../src/engine/interpolate'

/** `callOf` 找不到人时答的那句话。改了它这一支要跟着改 */
const STRANGER = '一个陌生人'

/**
 * 现在这些人在空库时会印成「一个陌生人」——**这是现状，不是目标**。
 *
 * 立这份名单是为了**冻住它**：名单不许变长。
 * 变长了说明有人新写了一句正文，指着一个世界里可能还不存在的人。
 *
 * 要缩短它得从两头之一入手：给那个人一条兜底称呼
 * （像 `east-head` 那样邻居现算），或者把那句正文改成不点名。
 */
const KNOWN_BARE = new Set([
  'nephew',
  'brother-wife',
  'spouse',
  'nurse',
  'steward',
  'page',
  'nephew-wife',
  'sibling',
])

const wrong: string[] = []

/** 全库每一处 `{call:X}` 各在哪儿 */
const who = new Map<string, string[]>()
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    const texts = [
      ...(node.blocks ?? []).map((b) => ('text' in b ? b.text : '')),
      ...(node.seen ?? []).map((s) => s.text),
      ...(node.choices ?? []).flatMap((c) => [c.label, c.echo ?? '']),
    ]
    for (const text of texts) {
      for (const found of text.matchAll(/\{call:([a-z-]+)\}/g)) {
        const id = found[1]!
        who.set(id, [...(who.get(id) ?? []), `${sceneId}#${nodeId}`])
      }
    }
  }
}

const total = [...who.values()].reduce((sum, list) => sum + list.length, 0)
console.log(`\n【全库 {call:} 】引用 ${who.size} 个人，共 ${total} 处\n`)

setActivePinia(createPinia())
const bare: string[] = []
for (const [id, places] of [...who.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const out = fillString(`{call:${id}}`)
  const isBare = out === STRANGER
  if (isBare) bare.push(id)
  console.log(
    `  ${isBare ? '⚠' : ' '} ${id.padEnd(24)} ${String(places.length).padStart(2)} 处  空库时印「${out}」`,
  )
}

/*
 * 一、这份名单不许变长。
 *
 * **这一问是这支门禁的全部重点。** 新写一句 `{call:someone}` 而那个人
 * 没有兜底称呼，名单就会长一个——而那句话在「没见过这个人」的人生里
 * 会印成「他往一个陌生人媳妇身后躲了半步」。
 */
for (const id of bare) {
  if (!KNOWN_BARE.has(id)) {
    wrong.push(
      `{call:${id}} 是新加的，而它在空库时印「${STRANGER}」——` +
        `${who.get(id)?.slice(0, 2).join(' / ')} 那几处会印出一句通顺但错的话。` +
        `给他一条兜底称呼（像 east-head 那样现算），或者把那句正文改成不点名`,
    )
  }
}

/*
 * 二、名单里的人还在库里引用着吗。
 *
 * 缩短这份名单是好事——但要**改完顺手把这儿也改了**，
 * 否则下一个人看到名单里有个库里根本没人用的 id，会以为自己漏了什么。
 */
for (const id of KNOWN_BARE) {
  if (!who.has(id)) {
    wrong.push(`名单里的 ${id} 在库里已经没有 {call:} 引用了——从 KNOWN_BARE 里删掉它`)
  }
}

/*
 * 三、正文里不许直接写「一个陌生人」这四个字。
 *
 * 那是 `callOf` 的兜底话，不是给人写进正文的。
 * 真要写陌生人，写「一个不认得的人」「一个面生的」都行——
 * **别跟兜底话撞**，否则这一支和 `address` 那几支都分不出真假。
 */
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    const texts = [
      ...(node.blocks ?? []).map((b) => ('text' in b ? b.text : '')),
      ...(node.seen ?? []).map((s) => s.text),
    ]
    for (const text of texts) {
      if (text.includes(STRANGER)) {
        wrong.push(
          `${sceneId}#${nodeId} 的正文里直接写了「${STRANGER}」——` +
            `那是 callOf 找不到人时的兜底话，跟它撞了就分不出真假`,
        )
      }
    }
  }
}

console.log('')
if (wrong.length === 0) {
  console.log(`  ✓ ${bare.length} 个人在空库时会印兜底话，跟名单一致；正文里没人跟兜底话撞`)
} else {
  for (const one of wrong) console.log(`  ✗ ${one}`)
}

console.log(`\n共 ${wrong.length} 处不对。`)
process.exit(wrong.length === 0 ? 0 : 1)
