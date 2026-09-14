/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 落下的世界事实，眼下有没有人问。
 *
 * 跑法：`bun scripts/unasked.ts`
 *
 * ## ⚠️ 这一支【报数，不判红】，而标题的措辞是有讲究的
 *
 * 它不叫「没人用的旗标」——那个说法把一件**结构性观察**
 * 说成了**缺陷判定**。准确的说法是：
 *
 * > **已生产、未被当前条件层消费的世界事实记录。**
 *
 * 「无人读取」本身不够成为缺陷。要判缺陷，得证明它违反了某条不变量：
 * 写入了永远不成立的事实、跟别的权威事实冲突、本该承担某处分流而没有读取端、
 * 造成状态漂移、遮蔽了更权威的事实、让同一语义有多个说不清的来源。
 *
 * ## 四条「它凭什么留着」的资格，每一条都要外部证据
 *
 * ```
 * 一 有其他消费者    引擎、存档、面板、统计里读它（这一支只扫内容层条件）
 * 二 独立世界事实    它承载了别的权威事实【没有表达】的语义
 * 三 未来契约        设计文档／待办／已定的下一阶段【明确引用了这个键】
 * 四 历史审计        回放、调试、迁移、存档兼容真的读它
 * ```
 *
 * ⚠️ **「以后可能会用」不是契约，只是可能性。**
 * 而「像日志」也不能自动成为理由——日志不是写进去就成立的概念。
 *
 * ## 报表分栏，不报一个总数
 *
 * 一个「73」把至少五种性质混在一起（真没消费者／消费者不在条件层／
 * 未来接口／重复记录／遗留死代码）。所以底下按**落它的那一批效果里
 * 有没有别的东西**分栏——那一刀分得出「玩家看得见那件事」和「只有这面旗」。
 *
 * ## ⚠️ 头一版的底子是错的，那个教训写在这儿
 *
 * 只扫 `lifeScenes` + `lifeEvents`，报出「79 面旗没人读」
 * ——而 `has-sibling` 的读取端在 `content/leanings.ts`（念头那一套）。
 * **判据自己的观察宇宙漏了一整个系统，而它照样理直气壮地印了个数。**
 *
 * 所以底下有一条自检：拿 `has-sibling` 当已知锚点，两头都得认出来。
 */
import './lib/seeded'

import { lifeEvents, lifeScenes } from '../src/content/life'
import { DAMPERS, SPARKS } from '../src/content/leanings'
import type { Condition, Effect, SceneNode } from '../src/types/game'

const made = new Map<string, Set<string>>()
const read = new Map<string, Set<string>>()
/** 那一批效果里，除了旗还有没有玩家看得见的东西 */
const alsoVisible = new Set<string>()

const put = (map: Map<string, Set<string>>, key: string, where: string): void => {
  const set = map.get(key) ?? new Set<string>()
  set.add(where)
  map.set(key, set)
}

const eatEffects = (effects: readonly Effect[] | undefined, where: string): void => {
  const batch = effects ?? []
  const visible = batch.some(
    (one) => one.type === 'knowledge' || one.type === 'chronicle' || one.type === 'item',
  )
  for (const one of batch) {
    if (one.type === 'flag' || one.type === 'roll') {
      put(made, `旗 ${one.key}`, where)
      if (visible) alsoVisible.add(`旗 ${one.key}`)
    }
    if (one.type === 'knowledge') put(made, `知 ${one.id}`, where)
    if (one.type === 'item') put(made, `物 ${one.id}`, where)
  }
}

const eatConditions = (conditions: readonly Condition[] | undefined, where: string): void => {
  for (const one of conditions ?? []) {
    if (one.flag !== undefined) put(read, `旗 ${one.flag.key}`, where)
    if (one.knowledge !== undefined) put(read, `知 ${one.knowledge}`, where)
    if (one.item !== undefined) put(read, `物 ${one.item}`, where)
    if (one.keepsake !== undefined) put(read, `物 ${one.keepsake.item}`, where)
  }
}

for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes) as SceneNode[]) {
    eatEffects(node.onEnter, scene.id)
    eatConditions(
      (node.branches ?? []).flatMap((one) => one.requires ?? []),
      scene.id,
    )
    eatConditions(
      (node.seen ?? []).flatMap((one) => one.requires ?? []),
      scene.id,
    )
    for (const choice of node.choices ?? []) {
      eatEffects(choice.effects, scene.id)
      eatConditions(choice.requires, scene.id)
    }
  }
}
for (const one of lifeEvents) eatConditions(one.requires, `事件 ${one.id}`)
// ⚠️ 念头那一套：头一版漏掉它，一个人就把「79 面没人读」推翻了
for (const one of SPARKS) eatConditions(one.requires, `火种 ${one.id}`)
for (const one of DAMPERS) eatConditions(one.requires, `浇灭 ${one.id}`)

const orphans = [...made.keys()].filter((one) => !read.has(one))
/*
 * ⚠️ 认知条目单独一栏，不跟旗混。
 *
 * `知 far-places` 这一族**玩家在认知面板上读得到**——按四条资格的头一条，
 * 它有别的消费者（UI），不是「没人读」。
 *
 * 头一版把它们跟旗混在一栏里，于是第二栏 62 种里大多是认知条目，
 * 而那一栏的标题写着「这件事发生过，而世界里没有别的痕迹」
 * ——**那句话对认知条目是错的**：它本身就是玩家读的那个痕迹。
 *
 * 旗不一样：旗是**引擎侧的东西**，玩家看不见。一面没人问的旗，
 * 才真的是「落下去而没有任何人读」。
 */
const flags = orphans.filter((one) => one.startsWith('旗'))
const known = orphans.filter((one) => one.startsWith('知'))
const things = orphans.filter((one) => one.startsWith('物'))
const withVisible = flags.filter((one) => alsoVisible.has(one))
const alone = flags.filter((one) => !alsoVisible.has(one))

console.log(`\n=== 落下的世界事实，眼下有没有人问 ===\n`)
console.log(`  底子：落下 ${made.size} 种 · 被条件问到 ${read.size} 种`)
console.log(`        （扫的是 lifeScenes / lifeEvents / SPARKS / DAMPERS）\n`)
console.log(`  ◇ 认知 ${known.length} 种 · 物件 ${things.length} 种没有条件问`)
console.log(`     ⚠️ 这两族【玩家自己读得到】（认知面板、行囊），不是「没人读」。\n`)
console.log(`  ◇ 旗 ${flags.length} 面没有条件问，分两栏：\n`)
console.log(`      ── 同一批里还落了【玩家看得见的东西】 ${withVisible.length} 面`)
console.log(`         认知条目／编年／物件玩家读得到，这面旗是引擎侧的第二份记录。`)
console.log(`         ⚠️ 问一句：那第二份【表达了头一份没表达的语义】吗？`)
console.log(`         没有的话它是重复，而重复会漂——新内容只写一份就分家了。`)
for (const one of withVisible.slice(0, 5)) console.log(`         · ${one}`)
console.log(``)
console.log(`      ── 只落了这一面旗 ${alone.length} 面`)
console.log(`         ⚠️ 这一栏才是「这件事发生过，而世界里没有别的痕迹」。`)
for (const one of alone.slice(0, 6)) console.log(`         · ${one}`)

/*
 * 尺子自检：拿一个【已知有读取端】的键去试。
 *
 * `has-sibling` 落在 `childhood`，而读它的是 `content/leanings.ts`
 * ——头一版正是在它身上露馅的（漏了整个念头系统，照样印了个数）。
 */
{
  const anchor = '旗 has-sibling'
  if (made.has(anchor) && read.has(anchor)) {
    console.log(`\n  ✓ 尺子自检：${anchor} 两头都认出来了。`)
  } else {
    console.log(`\n  ✗ 尺子自检：${anchor} 的两头没配上——上面那些数不作数。`)
    process.exitCode = 1
  }
}

console.log(
  `\n  ⚠️ 这一支【不判红】：「眼下没人问」不是缺陷，是一个结构性事实。` +
    `\n  要删一面旗，先过四条资格（见文件头）——而「以后可能会用」不是契约。\n`,
)
