/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 正文里写死的姓，跟同一节造出来的那个人对得上吗。
 *
 * 跑法：`bun scripts/surname.ts`
 *
 * ## 这一支从一处真穿帮来
 *
 * `school:threshold` 的 `hall` 那一节（宫里出身）：
 *
 * ```
 * onEnter   id: 'tutor'  calls: '侍讲'  who: { surname: '沈', given: '一贯' }
 * 正文      「侍讲姓周，翰林出身，行过礼才敢坐下。」
 * 对白      speaker: '周侍讲'
 * ```
 *
 * **姓周的是王府那位教授**（`study` 那一节，manor 出身，`surname: '周'`）
 * ——两个出身各造一个 `tutor`，姓不同，而正文把另一支的姓写到了这一支上。
 * **玩家人物面板上是「沈一贯」，读到的正文却是姓周。**
 *
 * ## ⚠️ 为什么它活到现在
 *
 * **一、没有任何门禁守这一条。** `naming` 守的是「玩家知不知道名字」
 * （不知道就不许出现全名），而这里是**知道之后姓写错了**——另一件事。
 * 两支合起来才是完整的：
 *
 * ```
 * naming.ts    该不该出现名字     玩家没被告知就不许写
 * 这一支       写出来的对不对     写了就得跟造出来的那个人一致
 * ```
 *
 * **二、`court` 出身的权重是 2/244 = 0.82%。** 一百二十世里撞上一次都难，
 * 而真跑到那一节的更少——**跑真世的走查天然抓不着它，静态扫一眼就看见。**
 *
 * ## 它守什么、不守什么
 *
 * ```
 * 守     同一节 onEnter 造了人（who.surname 写死了），
 *        而那一节的正文里出现「姓X」而 X 不是他的姓
 * 不守   跨节的（那个人在别的卷里被写错姓）——指称跳不过去
 *        不带 surname 造的人（姓是运行时掷的，正文本来就不该写死）
 * ```
 *
 * ⚠️ **一节里造了两个人**的情形会误报（正文说的是另一个的姓）。
 * 实测全库没有这种节点；真出现了，处置是把那一节的两个人分开记，
 * **不是把这条判据放宽**。
 */
import './lib/seeded'

import { lifeScenes } from '../src/content/life'

/** 正文里「姓X」那种写法 */
const SURNAMED = /姓([一-龥])/g

interface Fault {
  at: string
  made: string
  id: string
  said: string
}

const faults: Fault[] = []
let made = 0
let nodesWithBirth = 0

for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    const effects = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    const born: { id: string; surname: string; given: string }[] = []
    for (const one of effects) {
      const rec = one as { type?: string; id?: string; who?: { surname?: string; given?: string } }
      if (rec.type !== 'meet' || typeof rec.id !== 'string') continue
      if (typeof rec.who?.surname !== 'string') continue
      born.push({ id: rec.id, surname: rec.who.surname, given: rec.who.given ?? '' })
    }
    if (born.length === 0) continue
    nodesWithBirth += 1
    made += born.length

    /*
     * 玩家读得到字的地方，一处不漏——`speaker` 那一格也算：
     * 「周侍讲」三个字正是从那儿印出来的。
     */
    const texts: string[] = []
    for (const block of node.blocks) {
      if ('text' in block) texts.push(block.text)
      if ('speaker' in block && typeof block.speaker === 'string') texts.push(block.speaker)
    }
    for (const one of node.seen ?? []) texts.push(one.text)

    const all = texts.join('｜')
    for (const one of born) {
      for (const hit of all.matchAll(SURNAMED)) {
        const said = hit[1]
        if (said === undefined || said === one.surname) continue
        faults.push({ at: `${sceneId}#${nodeId}`, made: `${one.surname}${one.given}`, id: one.id, said })
      }
    }
  }
}

console.log(`\n=== 正文写死的姓，跟同一节造的人对得上吗 ===\n`)
console.log(
  `  全库 ${nodesWithBirth} 个节点在 onEnter 里带姓造人，共 ${made} 个人。\n`,
)

if (faults.length > 0) {
  console.log(`  ✗ ${faults.length} 处对不上：`)
  for (const one of faults) {
    console.log(`      ${one.at}　造的是「${one.made}」(${one.id})，而正文写「姓${one.said}」`)
  }
  console.log()
  process.exitCode = 1
} else {
  console.log(
    `  ✓ 一处也没有。人物面板上那个名字，跟正文里说的姓，是同一个人。\n\n` +
      `  ⚠️ 这一支只看【同一节】——那个人在别的卷里被写错姓，它跳不过去。\n` +
      `  而跑真世的走查抓不着这一族：宫里出身 0.82%，一百二十世里撞上一次都难。\n`,
  )
}
