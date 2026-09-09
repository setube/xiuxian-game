/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 认得出与认不出：名字不在东西上，在人身上。
 *
 * ## 这一支守的是一条立场，不是一段流程
 *
 * 31.md 第一节反对「拾取：赤炎石 × 3」——玩家不该自动知道手里的是什么。
 * 而这条立场最容易坏在一个地方：**有人顺手给东西起了个真名字**。
 *
 * 它坏起来一声不响：一件 `item` 的 `name` 写成「灵草」而不是「一株没见过的草」，
 * 报表上什么也不会变，内容照演，玩家读到的却是一个他不该知道的名字。
 *
 * 所以这一支不数「演了几次」（那是覆盖率的事），它逐件问：
 *
 *     进行囊那一刻的名字　　是你会怎么称呼它，还是它究竟是什么
 *     认知的解释状态　　　　说不出那是什么的，得停在「未理解」
 *     点破那一笔　　　　　  改名要经 `reveal`，且得有人真说了那句话
 *
 * 跑法：bun scripts/finding.ts
 */
import './lib/seeded'

import { lifeScenes } from '../src/content/life'
import type { Effect, SceneNode } from '../src/types/game'

/**
 * 全库每一处「东西进了行囊」和「点破」。
 *
 * 从内容推，不写死一张表：新加一卷带 `item` 的内容会自动进判据。
 * **写死的话，下一个人加的那一件不会被验，而报表照样全绿**
 * （`scripts/festival.ts` 为这件事改过一版，那次是判据写死了找中秋那一句）。
 */
interface Given {
  scene: string
  node: string
  id: string
  name: string
  note: string | undefined
}
const gained: Given[] = []
const revealed: Given[] = []

for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes) as SceneNode[]) {
    const from: Effect[] = [
      ...(node.onEnter ?? []),
      ...(node.choices ?? []).flatMap((one) => one.effects ?? []),
    ]
    for (const effect of from) {
      if (effect.type === 'item') {
        gained.push({
          scene: scene.id,
          node: node.id,
          id: effect.id,
          name: effect.name,
          note: effect.note,
        })
      }
      if (effect.type === 'reveal') {
        revealed.push({
          scene: scene.id,
          node: node.id,
          id: effect.item,
          name: effect.name,
          note: effect.note,
        })
      }
    }
  }
}

console.log(`\n=== 认得出与认不出（全库 ${gained.length} 处给物、${revealed.length} 处点破）===\n`)

let bad = 0

/**
 * 一、给到手里的名字，得是「他会怎么称呼它」。
 *
 * ## 判别式：那个名字里有没有他此刻不可能知道的东西
 *
 * 一个九岁的猎户孩子，从石头缝里挖出一株草。他能说的是「一株没见过的草」，
 * 不能说的是「灵草」「火属性灵矿」「赤炎石」——**那些名字里含着一整套
 * 他从没听说过的体系**。
 *
 * 这几个字是**修行那一侧的词**：库里凡人这一侧一处也不该用它们给东西命名。
 * 它们出现在 `reveal` 的新名字里是对的（那正是点破），
 * 出现在 `item` 的初名里就是「拾取：赤炎石 × 3」。
 *
 * ⚠️ 这张表是**关键词表**，而关键词表最容易悄悄失效
 * （内容改一个字它就不匹配，而不匹配的表现是漏报）。所以底下第四条
 * 拿库里真有的那两个名字反过来验它——**尺子自己要被量一遍**。
 */
const ARCANE = ['灵草', '灵药', '灵矿', '灵材', '法器', '法宝', '丹药', '符箓', '灵石', '妖兽']
const named = gained.filter((one) => ARCANE.some((word) => one.name.includes(word)))
if (named.length > 0) {
  console.log(`  ✗ ${named.length} 处东西一进手就带着修行那一侧的名字：`)
  for (const one of named.slice(0, 6)) {
    console.log(`      ${one.scene}#${one.node}　${one.id}　「${one.name}」`)
  }
  console.log(
    `    名字是「你此刻会怎么称呼它」，不是「它究竟是什么」（\`types/game.ts\` 的 InventoryItem）。` +
      `\n    这几个词属于点破之后——写在 reveal 的新名字里，不写在 item 的初名里。`,
  )
  bad += 1
}

/**
 * 二、点破得有人说话。
 *
 * `reveal` 改的是玩家对一样东西的称呼，而**改称呼这件事在这个世界里
 * 只有一个来源：某个具体的人在某个具体的时候说了一句话**。
 *
 * 判别式是那一笔带不带 `note`——库里现有两处点破，两处的 `note` 都写着
 * 「有人告诉你……」。一笔没有出处的改名，等于系统自己告诉了玩家答案。
 */
const silent = revealed.filter((one) => one.note === undefined || one.note.length === 0)
if (silent.length > 0) {
  console.log(`  ✗ ${silent.length} 处点破没有出处：`)
  for (const one of silent.slice(0, 6)) {
    console.log(`      ${one.scene}#${one.node}　${one.id}　→　「${one.name}」`)
  }
  console.log(`    名字来自某个人说的一句话。没有 note 的 reveal，是系统在直接告诉玩家答案。`)
  bad += 1
}

/**
 * 三、覆盖：这一支得真有东西可查。
 *
 * 全库一处 `item` 也没有的话，上面两条会安安静静地全绿——
 * **没查到和查过了长得一模一样**。
 *
 * 这个数**报出来不判红的那一半**也有用：`item` 只有两三处的时候，
 * 「认得出与认不出」这条线在库里就只是个别奇遇，不是这个世界的常态。
 */
console.log(`  覆盖：给物 ${gained.length} 处、点破 ${revealed.length} 处`)
for (const one of gained) {
  console.log(`      ${one.scene}#${one.node}　${one.id}　「${one.name}」`)
}
if (gained.length === 0) {
  console.log(`  ✗ 全库一处 item 也没有，上面两条根本没被验过。`)
  bad += 1
}

/**
 * 四、尺子自检：那张关键词表真的在判事。
 *
 * **这一条是必须的**，因为第一条是关键词匹配——而关键词表失效的方向是**漏报**：
 * 表里的词跟内容里真写的字对不上，判据就永远绿，看着像一切正常。
 *
 * 所以拿两组反过来验：库里真有的名字（该判「不含」）和明知违规的名字（该判「含」）。
 * 用例里的字**照库里真写的抄**，不凭印象编——凭印象编的用例，
 * 验的是「我以为库里写的字」（`ruler-standard-must-come-from-system`）。
 */
{
  const failed: string[] = []
  const hits = (name: string): boolean => ARCANE.some((word) => name.includes(word))

  // 库里真有的初名，一个也不该被判违规
  for (const ok of ['认不出的根', '一株没见过的草', '一册旧书']) {
    if (hits(ok)) failed.push(`「${ok}」是他此刻会说的话，不该被判成修行那一侧的名字`)
  }
  // 明知违规的，一个也不能漏
  for (const bad of ['灵草（残根）', '火属性灵矿', '赤炎石·下品灵材']) {
    if (!hits(bad)) failed.push(`「${bad}」该被抓住，关键词表漏了它`)
  }
  // 点破之后的名字带这些词是对的——第一条只管 item，不管 reveal
  const afterReveal = revealed.filter((one) => hits(one.name))
  if (revealed.length > 0 && afterReveal.length === 0) {
    failed.push(
      '库里没有一处点破用了修行那一侧的词——那说明第一条那张表跟内容对不上，' +
        '或者点破这件事本身没在发生',
    )
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检：库里三个初名都不含修行那一侧的词；三个违规名字都抓得住；` +
        `\n    而点破之后的名字里有 ${afterReveal.length} 处用了那些词——那正是点破该做的事。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  东西进手的时候没有真名字，名字来自某个人说的一句话。')
  console.log('  **名字不在东西上，在人身上。**\n')
}
