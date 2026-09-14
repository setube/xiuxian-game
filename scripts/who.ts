/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 内容层点名要的那个人，这个世界造得出来吗。
 *
 * 跑法：`bun scripts/who.ts`
 *
 * ## 这一支从一个空转的格子来
 *
 * `verify.ts` 那张 `NEEDS` 表里，人物 id 这一族的现状是：
 *
 * ```
 * family      null    ← 全库最常用的人物 id 入口，不查
 * temper      null
 * tie / owed  null
 * unaged      写了一个【当场造、当场丢】的 Map ← 唯一试图查的，而它空转
 * ```
 *
 * 而 `unaged` 那一格的注释明写着它在防什么：
 *
 * > `who` 是人口册上的 id，该由这一道查。写 `null` 的话，
 * > `{ unaged: { who: '写错的名字' } }` 会安安静静永远为假。
 *
 * **注释说它在防恒假，而它自己是空转的。**
 *
 * 不把它补进 `verify.ts`，是因为那一支是**纯静态**的
 * （不起 pinia、不跑世界），而立基造的人（爹娘、东邻、王府那几位）
 * 只有跑起来才数得清。硬塞进去就得手写一张名单——
 * 而手写名单是这个库今天已经栽过四次的东西。
 *
 * ## 干草堆有几种来源——每答一次都多一种
 *
 * ```
 * 一  立基造的      跑真世界读人口册      爹娘、东邻、王府那几位
 * 二  内容层造的    遍历 meet 的 id       东边那家的娃
 * 三  修士那四位    import 导出常量       ← 第一版漏了
 * 四  角色记号      ROLE_IDS              elder/dam/child/playmate，是位置不是人
 * 五  玩家自己      写死的 'me'           ← 第二版漏了，他不在人口册里
 * 六  身世表里的亲属  CIRCUMSTANCES.kin     ← 第三版漏了，sister 只在一种身世里
 * ```
 *
 * ⚠️ **前两版各漏一种，各报出一次假缺口**（`herbalist-at-the-shed` 16 处、
 * `me` 12 处），而两次印出来都是理直气壮的「这个 id 造不出来，条件恒假」。
 *
 * > 从「手写名单」改成「现取」不是终点。
 * > 要问的是**这个东西有几种来源**——而那个数每查一次都会变大。
 *
 * ## 两条路互相补盲区
 *
 * ```
 * 跑真世界   立基造的人      常见的几十世就齐   ← 稀有的攒不齐
 * 静态 import 修士那四位      导出常量，跑不跑都在 ← 变量算不出
 * ```
 *
 * ⚠️ **这不是稳妥起见，是实测撞出来的。** 头一版只跑世界，
 * 156 世的人口册当干草堆，当场报出
 * 「`herbalist-at-the-shed` 造不出来，16 处引用全恒假」
 * ——**而它就在 `cultivators.ts` 里导出着**。
 * 真相是修行那条线可达率 0.37%，156 世一次也没掷到。
 *
 * > **靠跑世界攒干草堆，稀有的人永远攒不齐，
 * > 而「攒不齐」和「这个 id 是错的」印出来一模一样。**
 *
 * ## 它问的七格是【行为证据】数出来的，不是读类型数的
 *
 * 读类型会漏：多行定义的格子一行 grep 抓不到，
 * 而单行的又会把 `leaning.id`、`befell.id` 这些**不是人**的混进来。
 * 改成看 `conditions.ts` 里哪几格真的拿值去 `personOf` / `roster[…]`：
 *
 * ```
 * family.id   temper.id   tie.from/to   owed.debtor/creditor
 * unaged.who  past.id     mayAsk.who
 * ```
 *
 * 排掉的三格也是这么定的：`knownAs` 按 kind 反查、`bond` 按关系找、
 * `outlived` 数数、`house` 读 members——**它们手里根本没有 id**。
 *
 * ## ⚠️ 效果层那一侧只扫了一个入口，剩下的记在账上
 *
 * 条件层七格之外，**效果层也点名要人**。而它那一族全叫 `effect.id`
 * ——同一个字段名在别的效果上是物品 id、旗标 key、往事 id，
 * 不按 `type` 分就会把一大片非人的 id 拖进来。按 type 分那一步还没做。
 *
 * 眼下只扫 `item.keepsake.from`（东西是谁留下的），
 * 因为它是效果层**唯一一个不叫 `id`** 的人物 id。
 *
 * **不做那一步的代价写明**：`{ type: 'recall', id: '写错的名字' }`
 * 这一族现在没人查——而 `recall` 找不到人就 `return false`，**静默**。
 */
import './lib/seeded'

import { born } from './lib/staged'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { CULTIVATORS } from '../src/content/cultivators'
import { CIRCUMSTANCES } from '../src/content/circumstances'
import { ORIGINS } from '../src/content/origins'
import { ROLE_IDS } from '../src/engine/interpolate'
import type { Condition, Effect, LifeEvent, SceneNode } from '../src/types/game'

/** 内容层【点名要】的人：这个 id 出现在哪几处 */
const needed = new Map<string, string[]>()
const want = (id: string | undefined, where: string): void => {
  if (id === undefined) return
  const list = needed.get(id) ?? []
  list.push(where)
  needed.set(id, list)
}

const scan = (conditions: readonly Condition[] | undefined, where: string): void => {
  for (const one of conditions ?? []) {
    want(one.family?.id, `${where}·family`)
    want(one.temper?.id, `${where}·temper`)
    want(one.tie?.from, `${where}·tie.from`)
    want(one.tie?.to, `${where}·tie.to`)
    want(one.owed?.debtor, `${where}·owed.debtor`)
    want(one.owed?.creditor, `${where}·owed.creditor`)
    want(one.unaged?.who, `${where}·unaged`)
    want(one.past?.id, `${where}·past`)
    want(one.mayAsk?.who, `${where}·mayAsk`)
  }
}

/** 内容层自己造出来的人（`meet` 带 `who` 的那一族） */
const byContent = new Set<string>()
const eat = (effects: readonly Effect[] | undefined): void => {
  for (const one of effects ?? []) {
    if (one.type === 'meet') byContent.add(one.id)
    /*
     * ⚠️ 效果层【点名要人】的入口，眼下只扫这一个。
     *
     * `keepsake.from`（东西是谁留下的）是效果层唯一一个**不叫 `id`**
     * 的人物 id——所以它扫得动。而 `meet`／`amend`／`recall` 那一族
     * 点的人全叫 `effect.id`，**同一个字段名在别的效果上是物品 id、
     * 旗标 key、往事 id**，不按 `type` 分就会把一大片非人的 id 拖进来。
     *
     * 按 type 分那一步还没做，记在这儿。而不做它的代价是明确的：
     * **`{ type: 'recall', id: '写错的名字' }` 这一族眼下没人查。**
     */
    if (one.type === 'item' && one.keepsake !== undefined) {
      want(one.keepsake.from, '效果·keepsake')
    }
  }
}

const walkNode = (node: SceneNode, where: string): void => {
  eat(node.onEnter)
  for (const one of node.branches ?? []) scan(one.requires, where)
  for (const one of node.choices ?? []) {
    scan(one.requires, where)
    eat(one.effects)
  }
  for (const one of node.seen ?? []) scan(one.requires, where)
}

for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) walkNode(node, `${sceneId}#${nodeId}`)
}
for (const one of lifeEvents as readonly LifeEvent[]) scan(one.requires, `事件 ${one.id}`)

/*
 * 干草堆第一路：立基造的人。
 *
 * 每种出身各跑几世——王府那几位只在王府的世界里有，
 * 东邻西舍只在住宅里有，**一种出身漏掉就是一批假缺口**。
 */
const byBirth = new Set<string>()
let worlds = 0
for (const origin of ORIGINS) {
  for (let n = 0; n < 8; n += 1) {
    const staged = born(origin.id, 20, [])
    if (staged === null) continue
    worlds += 1
    for (const id of Object.keys(staged.people.roster)) byBirth.add(id)
  }
}

/** 干草堆第二路：修士那几位——导出常量，掷不掷得到都在 */
const byImport = new Set(CULTIVATORS.map((one) => one.id))

/*
 * 干草堆第四路：身世表里的亲属。
 *
 * ⚠️ **跑世界那一路漏得掉他们。** `sister` 只在 `raised-by-sister`
 * 那一种身世里立（权重 10），而这一支跑 104 世一次也没掷到
 * ——于是报出「`sister` 造不出来，条件恒假」。
 *
 * 而它就在 `CIRCUMSTANCES` 里静态写着。跟修士那一路同一个道理：
 * **导出常量里有的，不该靠掷骰去撞。**
 *
 * 这是「这个东西有几种来源」第六次给出新答案。
 */
const byCircumstance = new Set(CIRCUMSTANCES.flatMap((one) => one.kin.map((each) => each.id)))

/*
 * 干草堆第三路：玩家自己。
 *
 * ⚠️ **`me` 不在人口册里。** 引擎到处特判他
 * （`people.ts`：`id === 'me' ? me.age : roster[id]?.…`），
 * 所以拿 roster 当干草堆一定漏掉他——而他在 `owed` 那一族上
 * 点名 12 处（「我欠哥哥的」）。
 *
 * 这一条是跑出来才知道的：头一版报「`me` 造不出来，12 处恒假」。
 */
const SELF = 'me'

const made = new Set([...byBirth, ...byContent, ...byImport, ...byCircumstance, ...ROLE_IDS, SELF])

console.log(`\n=== 内容层点名要的那个人，世界造得出来吗 ===\n`)
console.log(
  `  要 ${needed.size} 个 · 干草堆 ${made.size} 个` +
    `（立基 ${byBirth.size}／${worlds} 世 ${ORIGINS.length} 种出身` +
    ` ＋ 内容层 meet ${byContent.size} ＋ 修士 ${byImport.size} ＋ 角色记号 ${ROLE_IDS.length}）\n`,
)

const orphan = [...needed.entries()].filter(([id]) => !made.has(id)).sort()
if (orphan.length > 0) {
  console.log(`  ✗ ${orphan.length} 个【这个世界里造不出来】：`)
  for (const [id, where] of orphan) {
    console.log(`      ${id.padEnd(24)} ${where.length} 处 ← ${where.slice(0, 2).join('、')}`)
  }
  console.log(
    `      ——条件恒假：不报错、演不到、报表上什么也看不出来。\n` +
      `      ⚠️ 而先别急着改内容：这一支的第一路是【跑出来的】，\n` +
      `      稀有的人攒不齐跟 id 写错印出来一模一样。先 grep 一次那个名字。\n`,
  )
  process.exitCode = 1
} else {
  console.log(`  ✓ 每一个点到名的人，这个世界都造得出来。\n`)
}

/*
 * 尺子自检：喂一个谁也造不出的名字，判据必须认出来。
 *
 * ⚠️ 不打断的话，这一支跟一条「永远为真」的判据长得一模一样
 * ——干草堆越攒越大，而它本来就该越攒越大。
 */
{
  const fake = 'nobody-by-this-name'
  if (made.has(fake)) {
    console.log(`  ✗ 尺子自检：干草堆里居然有「${fake}」——这一支的判据没有辨识力。`)
    process.exitCode = 1
  } else {
    console.log(`  ✓ 尺子自检：喂「${fake}」进去认得出来（干草堆里没有它）。`)
  }
}

/*
 * 尺子自检之二：效果层那个入口，真的在扫吗。
 *
 * ⚠️ **加了一个入口而它一条也没扫到，跟没加是一样的**
 * ——而两者印出来完全相同（这一支照样绿）。
 *
 * `item.keepsake.from` 眼下全库只有一处（`exam.ts` 先生留下的书）。
 * 这一条守的是「那一处还在，而且这个入口还认得它」：
 * 内容删了会红（该去掉这条自检），扫描坏了也会红。
 */
{
  const fromEffects = [...needed.values()].flat().filter((one) => one.includes('keepsake')).length
  if (fromEffects === 0) {
    console.log(`  ✗ 尺子自检：效果层那个入口一条也没扫到——要么内容没了，要么扫描坏了。`)
    process.exitCode = 1
  } else {
    console.log(`  ✓ 尺子自检：效果层的 keepsake 入口扫到 ${fromEffects} 处，它是活的。`)
  }
}

/*
 * 报数不判成败：这一支只问「造得出来吗」，答不了「这一卷演得到吗」。
 * 一个造得出来的人可能一辈子也没跟玩家照过面，那归别的支查。
 */
const top = [...needed.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6)
console.log(`\n  · 点名最多的几个：` + top.map(([id, w]) => `${id} ${w.length}`).join('，'))
console.log(`  ⚠️ 这一支答不了「他演得到吗」——造得出来的人也可能一辈子没跟玩家照过面。\n`)
