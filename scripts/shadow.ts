/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 分支遮蔽走查。
 *
 * ## 这一支查的是「顺序」，而前七道门禁查的是「结构」
 *
 * `story.ts` 里那一行：
 *
 *     node.branches?.find((branch) => meetsAll(branch.requires))?.next ?? node.next
 *
 * `.find()`——**第一条满足的赢，声明顺序即命运。**
 *
 * 这不是缺陷，是设计。`riverman#open` 那十一条并列分支里，
 * 「墙塌过的人排在最前」是刻意的：他现在什么也不是，
 * 来渡口不需要理由。同理认信物那一组，有真书就先认真书。
 * **顺序在这里表达的是优先级，不是互斥。**
 *
 * 可正因为顺序有意义，才会出一种静默的错：
 * 前一条的条件比后一条**更宽**，后一条就永远走不到——
 * 不报错、不断线、不算孤儿（那个 `next` 从别处也许还有入边），
 * 只是那段内容一辈子不出现。跟渡口那句「你想起那个教你换气的人」
 * 是同一种病：世上没有任何东西会告诉你它不见了。
 *
 * ## 为什么是走查而不是第八道门禁
 *
 * 因为「判不出来」和「没问题」在这里是两回事。
 * 底下的 `implies` 只认它有把握的那几类（区间、属性、旗标、纽带），
 * 剩下的一律返回 false——**宁可漏报，不可误报**。
 * 一支会误报的门禁比没有门禁更糟，这条教训第四道已经交过学费了。
 *
 * 所以它报 0 不等于全库互斥，只等于「我有把握的那些都没重叠」。
 * 这种话适合走查说，不适合门禁说。
 *
 * ## 检测器自己也会瞎，所以末尾有自检
 *
 * 第一版用 `JSON.stringify(c, Object.keys(c).sort())` 当条件指纹，
 * 以为第二个参数是排序器——**它是属性白名单，而且递归生效**。
 * 于是 `{flag:{key,equals}}` 的内层全被抹平，两条不同的旗标条件
 * 都成了 `{"flag":{}}`，当场"抓"出 26 条假的遮蔽。
 *
 * 报 0 可能是干净，也可能是瞎。所以末尾钉了十个例子：
 * 六个必须抓到，四个必须不误报。**先证明这把尺子是准的，再信它量出的数。**
 *
 * 跑法：bun scripts/shadow.ts
 */
import './lib/seeded'

import { lifeScenes } from '../src/content/life'
import type { Condition, SceneNode } from '../src/types/game'

type Range = { atLeast?: number; atMost?: number }

/** a 的区间是否覆盖 b 的区间（b 落在里面，所以 b 成立时 a 必成立） */
function covers(a: Range, b: Range): boolean {
  if (a.atLeast !== undefined && (b.atLeast === undefined || b.atLeast < a.atLeast)) return false
  if (a.atMost !== undefined && (b.atMost === undefined || b.atMost > a.atMost)) return false
  return true
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** 一格条件里真正写了东西的那些键 */
function filled(condition: Condition): string[] {
  return Object.keys(condition).filter((key) => condition[key as keyof Condition] !== undefined)
}

/**
 * b 成立是否蕴含 a 成立（a 比 b 宽，或两者等价）。
 *
 * 判不出来就返回 false。这支走查的全部可信度都压在这一句上：
 * 它可以少说，不能说错。
 */
function implies(a: Condition, b: Condition): boolean {
  const aKeys = filled(a)
  const bKeys = filled(b)
  // 一格里写多项是 AND。只处理单项对单项，多项的一律不判
  if (aKeys.length !== 1 || bKeys.length !== 1 || aKeys[0] !== bKeys[0]) return false
  const key = aKeys[0]!

  if (key === 'flag') {
    const wide = a.flag!
    const narrow = b.flag!
    if (wide.key !== narrow.key) return false
    /**
     * 「有这面旗」比「旗等于某个值」宽——`hasFlag` 是「存在且不为 false」，
     * 所以 `getFlag === 真值` 成立时 `hasFlag` 必然也成立。
     * 等于 `false` 或 `undefined` 的那两种反而不蕴含，得排掉。
     */
    if (wide.equals === undefined) return narrow.equals !== false && narrow.equals !== undefined
    return same(wide.equals, narrow.equals)
  }

  if (key === 'age') return covers(a.age!, b.age!)
  if (key === 'standing') return covers(a.standing!, b.standing!)

  if (key === 'attribute') {
    const wide = a.attribute!
    const narrow = b.attribute!
    // 天赋从「只问够不够高」变成闭区间之后，这里跟年龄、家境是同一种判法
    return wide.key === narrow.key && covers(wide, narrow)
  }

  if (key === 'region') {
    const wide = a.region!
    const narrow = b.region!
    return Object.entries(wide).every(([field, range]) => {
      if (!range) return true
      const other = narrow[field as keyof typeof narrow]
      return other ? covers(range, other) : false
    })
  }

  if (key === 'bond') {
    const wide = a.bond!
    const narrow = b.bond!
    if (wide.kind !== narrow.kind) return false
    // 不问死活比问死活宽
    return wide.alive === undefined || wide.alive === narrow.alive
  }

  // knowledge / item / 出身那五格 / gender / stage / family：一模一样才算
  return same(a[key as keyof Condition], b[key as keyof Condition])
}

/**
 * 前一条是否遮蔽了后一条。
 *
 * 条件数组是 AND，所以「更宽」的意思是：后一条成立时，前一条的每一格都必然成立——
 * 于是 `.find()` 永远先中前一条，后一条形同不存在。
 */
function shadows(earlier: readonly Condition[], later: readonly Condition[]): boolean {
  return earlier.every((one) => later.some((other) => implies(one, other)))
}

function walk(): { nodes: number; found: number } {
  let nodes = 0
  let found = 0

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const node of Object.values(scene.nodes) as SceneNode[]) {
      const branches = node.branches
      if (!branches || branches.length < 2) continue
      nodes += 1

      for (let i = 0; i < branches.length; i += 1) {
        for (let j = i + 1; j < branches.length; j += 1) {
          const earlier = branches[i]!
          const later = branches[j]!
          if (!shadows(earlier.requires, later.requires)) continue

          found += 1
          const why = earlier.requires.length === 0 ? '无条件分支不在末位' : '前一条更宽'
          console.log(`  ✗ ${sceneId}#${node.id}　第 ${j + 1} 条永远走不到（${why}）`)
          console.log(`      第 ${i + 1} 条 → ${earlier.next}　${JSON.stringify(earlier.requires)}`)
          console.log(`      第 ${j + 1} 条 → ${later.next}　${JSON.stringify(later.requires)}`)
        }
      }
    }
  }

  return { nodes, found }
}

/** 十个例子。这把尺子准不准，先量它们 */
function selfCheck(): boolean {
  const mustCatch: readonly [string, Condition[], Condition[]][] = [
    ['无条件分支排在前面', [], [{ knowledge: 'x' }]],
    ['同一条写了两遍', [{ knowledge: 'x' }], [{ knowledge: 'x' }]],
    ['年龄下限更低', [{ age: { atLeast: 10 } }], [{ age: { atLeast: 15 } }]],
    [
      '属性门槛更低',
      [{ attribute: { key: 'body', atLeast: 30 } }],
      [{ attribute: { key: 'body', atLeast: 50 } }],
    ],
    [
      '只问有没有旗 vs 问旗等于什么',
      [{ flag: { key: 'f' } }],
      [{ flag: { key: 'f', equals: '甲' } }],
    ],
    ['条件更少（AND 更松）', [{ knowledge: 'x' }], [{ knowledge: 'x' }, { item: 'y' }]],
  ]
  const mustPass: readonly [string, Condition[], Condition[]][] = [
    [
      '同一面旗的不同取值',
      [{ flag: { key: 'f', equals: '甲' } }],
      [{ flag: { key: 'f', equals: '乙' } }],
    ],
    ['年龄下限更高', [{ age: { atLeast: 15 } }], [{ age: { atLeast: 10 } }]],
    ['两条无关的认知', [{ knowledge: 'x' }], [{ knowledge: 'y' }]],
    ['条件更多（AND 更紧）', [{ knowledge: 'x' }, { item: 'y' }], [{ knowledge: 'x' }]],
  ]

  let sound = true
  for (const [name, earlier, later] of mustCatch) {
    const ok = shadows(earlier, later)
    if (!ok) sound = false
    console.log(`  ${ok ? '√' : '✗ 漏报'}　${name}`)
  }
  for (const [name, earlier, later] of mustPass) {
    const ok = !shadows(earlier, later)
    if (!ok) sound = false
    console.log(`  ${ok ? '√' : '✗ 误报'}　${name}`)
  }
  return sound
}

console.log('=== 尺子自检（六条必须抓到，四条必须放过）===')
const sound = selfCheck()
console.log(sound ? '  尺子是准的。' : '  尺子坏了——底下那个数字不作数。')

console.log('\n=== 全库分支遮蔽 ===')
const { nodes, found } = walk()
if (found === 0) {
  console.log(`  ${nodes} 个节点写了多条分支，没有一条被前面的遮住。`)
  console.log('    · 顺序仍然是语义的一部分：多条同时成立时，写在前面的赢')
} else {
  console.log(`  ${nodes} 个节点写了多条分支，其中 ${found} 条永远走不到。`)
}
