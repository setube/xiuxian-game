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

import { readFileSync } from 'node:fs'

import { lifeScenes } from '../src/content/life'

/**
 * 正文里「姓X」那种写法。
 *
 * ⚠️ **不用汉字做字符范围的端点。** 头一版写的是 `[一-龥]`，
 * 而 `namesake` 当场报红：那个「一」撞上了人名「沈一贯」的「一」。
 *
 * 它报得对——**判据源码里的汉字字面量，机器分不出哪个是「认的词」、
 * 哪个是「范围端点」**，而下一个人读到 `[一-龥]` 也得停下来想一秒。
 * 换成 Unicode 脚本属性，歧义本身就没有了。
 *
 * 这比往 `namesake` 的登记表里加一条例外好：**能消除的就别登记。**
 */
const SURNAMED = /姓(\p{Script=Han})/gu

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
    const effects = [
      ...(node.onEnter ?? []),
      ...(node.choices ?? []).flatMap((c) => c.effects ?? []),
    ]
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
        faults.push({
          at: `${sceneId}#${nodeId}`,
          made: `${one.surname}${one.given}`,
          id: one.id,
          said,
        })
      }
    }
  }
}
/*
 * ⚠️ 第二问：**别的判据里那张「署名 → id」的表，姓对得上吗。**
 *
 * `presence.ts` 的 `SPEAKER_IDS` 曾经写着 `周侍讲 → tutor`，
 * 而那个 id 在宫里那一支造出来【姓沈】——**表是照一处错正文抄的**。
 * 于是两者互相印证着对方是对的，两支门禁一起绿了两年。
 *
 * 这一条把那张表拉进来对：**拿 `who.surname` 这个世界事实去校它**。
 * 判据表的校准源不能是它要判的那个东西，所以校准的活落在这儿。
 *
 * ⚠️ 表从【源码】里读（不 import）：`presence.ts` 是门禁不是模块，
 * import 它会把那一支整个跑起来。
 *
 * ## ⚠️ 而这一问的射程只有三分之一，且判不了的恰好是出过错的那两条
 *
 * ```
 * 周先生 → teacher   teacher 全库只造过一个姓（周）   ✓ 判得了
 * 周教授 → tutor     tutor 造过【沈】和【周】两个姓   ◇ 判不了
 * 沈侍讲 → tutor     同上                             ◇ 判不了
 * ```
 *
 * 头一版我写的是「这个 id 造过的姓里有没有它」——**打断验不红**：
 * 把表改回 `周侍讲 → tutor`（当年那个错），`tutor` 的两个姓里有「周」，
 * 判据照样说对得上。**一个宽到永远成立的写法，冒充了判过了。**
 *
 * 现在改成只判单姓的，并把判不了的那两条**单列**。
 * 要对上一个 id 的多个姓，得先知道「这个署名说的是哪一处造人」
 * ——那要指称解析，跟这一支文件头说的那堵墙是同一堵。
 *
 * > **判不了就说判不了。** 那两条当年出过错，而这一支现在仍然看不住它们
 * > ——**写清楚，比让报表好看有用。**
 */
const speakerSrc = readFileSync('scripts/presence.ts', 'utf8')
const tableBody = /const SPEAKER_IDS[^{]*{([^}]*)}/.exec(speakerSrc)?.[1] ?? ''
const tableRows = [...tableBody.matchAll(/(\p{Script=Han}+)\s*:\s*'([\w-]+)'/gu)]
const madeAs = new Map<string, Set<string>>()
for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes)) {
    const fx = [...(node.onEnter ?? []), ...(node.choices ?? []).flatMap((c) => c.effects ?? [])]
    for (const one of fx) {
      const rec = one as { type?: string; id?: string; who?: { surname?: string } }
      if (rec.type !== 'meet' || typeof rec.id !== 'string') continue
      if (typeof rec.who?.surname !== 'string') continue
      if (!madeAs.has(rec.id)) madeAs.set(rec.id, new Set())
      madeAs.get(rec.id)?.add(rec.who.surname)
    }
  }
}
const tableFaults: string[] = []
/** 一个 id 造过好几个姓的，这一支判不了——单列，不混进「对得上」 */
const multi: string[] = []
for (const row of tableRows) {
  const said = row[1]
  const id = row[2]
  if (said === undefined || id === undefined) continue
  const surnames = [...(madeAs.get(id) ?? [])]
  if (surnames.length === 0) continue
  /*
   * ⚠️ 只在【这个 id 全库只有一个姓】的时候判。
   *
   * `tutor` 造过两次（宫里那位姓沈、王府那位姓周），于是
   * 「这个 id 造过的姓里有没有它」对两个姓都成立——**打断验不红**。
   * 我头一版正是这么写的，把表改回错的照样绿。
   *
   * 一个 id 两个姓的，要对上得先知道「这个署名说的是哪一处造人」
   * ——那要指称解析，这一支跨不过去（见文件头的边界）。
   * **判不了就不判，别用一个宽到永远成立的写法冒充判过了。**
   */
  if (surnames.length > 1) {
    multi.push(`${said} → ${id}（这个 id 造过 ${surnames.join('/')} 两个姓，这一支判不了）`)
    continue
  }
  if (!surnames.includes(said[0] ?? '')) {
    tableFaults.push(
      `presence.ts 的 SPEAKER_IDS：「${said}」→ ${id}，而他造出来姓 ${surnames.join('/')}`,
    )
  }
}


console.log(`\n=== 正文写死的姓，跟同一节造的人对得上吗 ===\n`)
console.log(`  全库 ${nodesWithBirth} 个节点在 onEnter 里带姓造人，共 ${made} 个人。\n`)

console.log(
  `  ◆ 顺带核了 presence.ts 的 SPEAKER_IDS ${tableRows.length} 条：` +
    `${tableRows.length - multi.length - tableFaults.length} 条姓对得上、` +
    `${tableFaults.length} 条对不上、${multi.length} 条判不了`,
)
for (const one of multi) console.log(`      ◇ ${one}`)
for (const one of tableFaults) console.log(`      ✗ ${one}`)
if (tableFaults.length > 0) process.exitCode = 1

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
