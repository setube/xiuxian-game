/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 角色记号解析到谁，正文说得准吗。
 *
 * 跑法：`bun scripts/pronoun.ts`
 *
 * ## 这一支从一处「多数情形都不对」的穿帮来
 *
 * `{playmate}` 是**角色记号**——按「邻户里跟你年纪最近、还在身边的孩子」
 * 现算，而那个孩子**每一世不是同一个人**。一手量过：
 *
 * ```
 * 有玩伴的 177 世里，玩伴是女的 110 世（62%）
 * ```
 *
 * 而正文里写着「**他**成亲那天你去帮了忙」「**他**站住了」「跟**他**去」
 * ——**不是边角，是多数情形**。
 *
 * ⚠️ 而它变严重是因为另一笔改动：那句话进的是 `Acquaintance.past`，
 * 2026-09-14 之后它不再被覆盖，于是**错的性别会一直印在人际面板上**。
 *
 * > **一笔存储改动，把一族「演完就算」的穿帮变成了「一直挂着」的穿帮。**
 *
 * ## 它跟 `present` 是同一件事的两面
 *
 * ```
 * present    那个人【不在了】而正文还点他的名     跑真世
 * 这一支      那个人【不是那个性别】而正文写死了   静态判
 * ```
 *
 * 共同形状是**正文默认了一个它没问过的前提**。分开写是因为射程不同：
 * 这一条静态就判得了，不必跑世界。
 *
 * ## ⚠️ 它只报数，不判红
 *
 * 「他」在中文里常常是**通指**（「有人喊你，你让他先走」里的「他」
 * 未必在强调性别），而且同一段正文里可能还有别人
 * （`census:mismatch` 那几处的「他」指的是**里长**，正当）。
 *
 * **判红会逼人把正当的句子也改掉**，而那比漏报坏：
 * 内容层会开始绕着判据写字。所以这一支把候选摆出来，让人看一眼。
 *
 * ## 2026-09-14 逐处判过一遍，结论记在这儿省得重判
 *
 * ```
 * 改掉的（那个「他」真会指到女性）
 *   playmate 那册五处   选项标签、正文、连卷名（「他成家那年」）
 *   census:mismatch 四处 「他家原先就在巷子东头」指玩伴
 *   exam:first 一处      {elder} 刚解析成娘，后半句「他哦了一声」
 *   finding:root 两处    {elder} 同上
 *   routine:old 一处     徒弟按 bond 找人，性别同样钉不住
 *
 * 留着的（那个代词指的是别人，或者那个人恒定一种性别）
 *   census:mismatch#open 「他」指【里长】——上一句就是「里长挨着门问人口」
 *   youth:exam           「他」指【先生】——上一句是「先生把你叫到跟前」
 *   trade:archive        入场写死 { family: father alive }，这一卷只对父亲演
 *   trade:herb           「她」紧跟 {dam}，而 dam 恒定是女的
 *   match:offer          「她」指媒人
 *   birth:court          「她」紧跟 {dam}
 * ```
 *
 * ⚠️ **判它只能读那一句的上文**——同一段正文里往往有好几个人，
 * 而代词指的是最近提到的那一个，不是那个角色记号。
 *
 * ## ⚠️ 这一族的修法【只有一种】：改正文
 *
 * 有一条相邻的判据问「这一卷该不该锁定性别」（配偶那一族：
 * 玩家是男的则配偶是女的，入场加一条 `gender` 就锁定了）。
 * **那条的修法对这一族一处也不适用**：
 *
 * ```
 * spouse    性别【钉得住】   入场加 gender 条件
 * playmate  东邻西邻的孩子随机男女，idOfPlaymate 挑人时不看性别
 * elder     落到爹或娘都有可能（199 世里娘 115、姐 14）
 *           → 【没有任何条件能钉住它】
 * ```
 *
 * 写一卷「只在玩伴是男的时候演」会把 62% 的世界挡在外头，
 * 而那一卷的立意跟性别无关。**两条判据长得像，而修法相反
 * ——并成一条会让读的人拿错药。**
 */
import './lib/seeded'

import { lifeScenes } from '../src/content/life'
import { ROLE_IDS } from '../src/engine/interpolate'
import type { SceneNode } from '../src/types/game'

/**
 * 会解析到不同性别的角色记号。
 *
 * ⚠️ **不是全部 `ROLE_IDS`**：`dam`（娘那一位）永远是女的，
 * 拿它当候选是纯噪声。`elder` 落到爹或娘都有可能，`child` 和
 * `playmate` 更是一半一半——**这三个才是这一支的射程**。
 *
 * 而这张表**从 `ROLE_IDS` 减出来**，不手写全集：
 * 加了第五个角色记号而这儿没跟上，至少它会出现在「没归类」那一行。
 */
const ALWAYS_ONE_SEX: readonly string[] = ['dam']
const MIXED = ROLE_IDS.filter((one) => !ALWAYS_ONE_SEX.includes(one))

/** 写死性别的字。「他们」是复数，不算 */
const GENDERED = /他(?!们)|她(?!们)/

interface Hit {
  scene: string
  node: string
  role: string
  kind: string
  text: string
}
const hits: Hit[] = []

for (const scene of Object.values(lifeScenes)) {
  for (const node of Object.values(scene.nodes) as SceneNode[]) {
    const raw = JSON.stringify(node)
    const roles = MIXED.filter((one) => raw.includes(one))
    if (roles.length === 0) continue
    const where = { scene: scene.id, node: node.id, role: roles.join('/') }

    for (const block of node.blocks ?? []) {
      const text = 'text' in block ? block.text : ''
      if (GENDERED.test(text)) hits.push({ ...where, kind: '正文', text: text.slice(0, 28) })
    }
    for (const one of node.seen ?? []) {
      if (GENDERED.test(one.text))
        hits.push({ ...where, kind: 'seen', text: one.text.slice(0, 28) })
    }
    for (const one of node.choices ?? []) {
      if (GENDERED.test(one.label))
        hits.push({ ...where, kind: '选项', text: one.label.slice(0, 20) })
      const echo = one.echo ?? ''
      if (GENDERED.test(echo)) hits.push({ ...where, kind: '回响', text: echo.slice(0, 24) })
    }
  }
}

console.log(`\n=== 角色记号解析到谁，正文说得准吗 ===\n`)
console.log(`  射程：${MIXED.join('、')}（排掉恒定一种性别的：${ALWAYS_ONE_SEX.join('、')}）`)
console.log(`  ◇ ${hits.length} 处候选（那一节点名了角色记号，而正文写死了性别）：\n`)
const byScene = new Map<string, Hit[]>()
for (const one of hits) {
  const list = byScene.get(one.scene) ?? []
  list.push(one)
  byScene.set(one.scene, list)
}
for (const [scene, list] of [...byScene.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`      ${scene}　${list.length} 处（${list[0]!.role}）`)
  for (const one of list.slice(0, 3)) {
    console.log(`         ${one.kind}　「${one.text}…」`)
  }
}

/*
 * 尺子自检：拿一句【已知改过】的话去试。
 *
 * `playmate:wed` 那一节从前写着「他成亲那天你去帮了忙」，
 * 2026-09-14 改成了「成亲那天你去帮了忙」。所以：
 * **那一节现在不该再出现在候选里**，而这一支得认得出这个变化。
 */
{
  const fixed = hits.filter((one) => one.scene === 'playmate:wed')
  if (fixed.length > 0) {
    console.log(`\n  ⚠️ 尺子自检：playmate:wed 还有 ${fixed.length} 处候选——那一册该是清过的。`)
    for (const one of fixed) console.log(`      ${one.kind}　「${one.text}…」`)
  } else {
    console.log(`\n  ✓ 尺子自检：playmate:wed 已经清过（改之前那一句会出现在上面）。`)
  }
}

console.log(
  `\n  ⚠️ 这一支【报数不判红】：「他」在中文里常常是通指，` +
    `\n  而同一段正文里可能还有别人（里长、货郎、路过的人）。` +
    `\n  判红会逼人把正当的句子也改掉，而内容层会开始绕着判据写字。\n`,
)
