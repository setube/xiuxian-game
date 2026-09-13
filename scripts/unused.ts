/*
 * 导出了，可没有人用。
 *
 * ## 这一支只报数，不判成败——除了一种情况
 *
 * 「导出了没人用」在一个还在长的库里**天然会有**：遗留、预留、
 * 还没接上的设计、动态调用……它只是一个**审查候选**，不等于错误。
 *
 * 把它报红会长出一个坏习惯：为了让门禁绿，随手删掉所有暂时没人用的导出
 * ——那会把「清理死代码」和「提前删除设计能力」混成一件事。
 *
 * **真正该红的是这把尺子自己失效**，而那是有过实例的（见下）。
 *
 * ## 2026-09-13 头一版就漏掉一整个 store，而报表干干净净
 *
 * 头一版用 `lastIndexOf('return {')` 取导出块。`people.ts` 在 1021 行
 * 有真正的导出块、1140 行还有一个外层包装的 `return {`——取到后者，
 * 那个 store 的五十多个导出**一个也没扫到**，而打印出来的名单
 * 看不出任何异样（13 个变 8 个）。
 *
 * 抓住它的是**已知锚点自检**：`people.isNeighbour` 是上一轮一手核验过的
 * 零调用导出，它必须出现在结果里。所以那一条是这支门禁唯一的红线。
 *
 * ## 六种性质，报告要分开——只有头一种该删
 *
 *     错契约      判据跟真在跑的那把尺子对不上　　canSchool（已删）
 *     还没人用    语义对，只是没有第一个使用者　　livingParents
 *     重复        别处逐字同义地又算了一遍　　　　isNewGame
 *     不必导出    自己文件里在用，只是不该 public　TONE_CLASS
 *     观察窗口    运行时在跑，门禁换个口去看它　　CULTIVATORS
 *     旧路留着    调用方式变了，helper 没人知道　　signRuleById
 *
 * 头三种是 2026-09-13 扫 store 那一层归纳的，第四五种是同一天
 * 扫顶层导出（366 个）时冒出来的，**第六种是抽查那三个时冒出来的**
 * ——而后三种最容易被误判成死代码。
 *
 * ### 「旧路留着」是第六种，抽查三个撞到两个
 *
 * ```
 * signRuleById    按 id 取征象。而 engine 那边要的是「此刻看得见哪几条」
 *                （按条件筛），从不按 id 取；门禁要按 id 取，
 *                 却【自己写了一遍 SIGNS.find(s => s.id === ...)】
 * rollName        被更完整的实现取代——birth.ts:254 还要处理「生父在就随生父姓」
 * originOpening   被就地展开取代——birth.ts:240 要在开场和取名之间插分隔线
 * ```
 *
 * **三个都不是死代码，而且三个各有各的来路。** 这一类留着，
 * 但要在函数自己身上写明「真正在跑的那条路在哪」——
 * 否则下一个人会像那支门禁一样，不知道它存在，自己再写一遍。
 *
 * ### 「不必导出」不是没人用
 *
 * `TONE_CLASS` 在自己文件里被 15 行的导出函数读着。
 * 处置办法是改私有，不是删。这一类实测 57 个，**当前不动**：
 * 没有功能收益，57 处批量改动有非零风险（动态导入、调试依赖），
 * 而 public 面太大是维护问题不是当前故障。
 * 真要收敛，等模块拆分 / 边界调整 / 循环依赖那些时机顺手做。
 *
 * ### 「观察窗口」怎么跟「门禁守着孤立数据」分开
 *
 * 项目记忆里有一条「**门禁读不算读取端——那比没人读更坏**」，
 * 说的是内容层的旗标：没有内容读它，只有门禁读它，
 * 于是门禁守着一个世界里不存在的东西。
 *
 * **但那条话没有限定就会把正常的观察窗口一并判成病。** 加上限定：
 *
 * > 门禁读不算运行时消费者，**除非它观察的是已经由运行时建立
 * > 并消费的同一份世界事实**。
 *
 * 五条判定（跟 GPT 过完之后定的），必须同时成立：
 *
 *     1. 底层数据由运行时真实入口消费
 *     2. 这个导出提供运行时入口【没提供】的访问形态
 *     3. 门禁读的是运行时同一份数据，不是另备的一份
 *     4. 删掉它只削弱门禁的观察力，【不改变世界行为】　← 最好验
 *     5. 不能靠「新增一支门禁去读它」反过来给一个没接入世界的接口发合法性
 *
 * `CULTIVATORS` 五条全中（一手验过）：
 *
 *     ALL          760 定义 → 768 cultivatorById 读它（运行时唯一入口）
 *     CULTIVATORS  771 别名导出，src 零引用，门禁引用 24 次
 *
 * 删掉它，修士照旧通过 `ALL` 活着。这一类实测 17 个。
 *
 * ⚠️ **第 5 条是防自证的**：不写这一条，任何没人用的导出都可以
 * 补一支门禁去读，然后宣称「那是给门禁开的」。
 *
 * ## ⚠️ 头一个 import 必须是 `./lib/seeded`，纯静态的也一样
 *
 * 这一支一颗骰子也不掷（只读文件、剥注释、配括号），我头一版因此
 * 直接从 `node:fs` 起手——`replay` 当场红：
 *
 *     ✗ 1 支第一个 import 不是 ./lib/seeded：unused
 *
 * **那条判据不给「反正我不掷骰子」开例外，而那是对的**：
 * 开了例外，它就得去判断哪一支「真的不掷」，而那件事静态看不出来
 * （今天不掷，明天加一行 `Math.random` 就掷了，没人会想起回来改 import）。
 */
import './lib/seeded'

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 已知锚点：一手核验过的零调用导出。抓不到它，这把尺子就是坏的 */
const ANCHOR = 'isNeighbour'

/** 把注释剥掉——只在剥完的正文里数调用（名字出现在注释里不算用） */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** 一个 `return {` 到它配平的那个 `}`。取不到就是解析失败 */
function blockAt(body: string, from: number): string | null {
  let depth = 0
  for (let i = from; i < body.length; i += 1) {
    if (body[i] === '{') depth += 1
    else if (body[i] === '}') {
      depth -= 1
      if (depth === 0) return body.slice(from, i)
    }
  }
  return null
}

console.log('\n=== 导出了，可没有人用 ===\n')

const files = walk('src')
const bodies = new Map<string, string>()
for (const file of files) bodies.set(file, stripComments(readFileSync(file, 'utf8')))

const storeFiles = files.filter((f) => f.includes('stores') && f.endsWith('.ts'))
let failed = 0
let 解析失败 = 0
let 导出总数 = 0
const 跳过: string[] = []
const 候选: { store: string; name: string }[] = []

for (const file of storeFiles) {
  const body = bodies.get(file)!
  /*
   * ⚠️ **「在 stores 目录里」不等于「是一个 setup store」。**
   *
   * 头一版把两者划了等号，于是 `founding.ts`（立基次第表，用
   * `export const` / `export function` 直接导出，没有 setup store 那个
   * `return {}`）被判成「导出块解析失败」，尺子自检当场报红。
   *
   * **那是判据的口径错，不是被测系统坏了。** 没有 `return {` 的文件
   * 本来就不该走这条路——显式跳过并报出来，而不是算成失败。
   */
  if (!/return\s*\{/.test(body)) {
    跳过.push(`${file.replace(/\\/g, '/')}（不是 setup store，没有 return 块）`)
    continue
  }
  const names = new Set<string>()
  let 块数 = 0
  /*
   * ⚠️ **要扫【所有】`return {`，不能只取最后一个。**
   * 那正是头一版漏掉整个 people store 的原因（见文件头）。
   * 单行的 `return { newHouse: ... }` 配平后只有一行，自然不产生名字。
   */
  for (const match of body.matchAll(/return\s*\{/g)) {
    const block = blockAt(body, match.index)
    if (block === null) {
      解析失败 += 1
      continue
    }
    块数 += 1
    for (const one of block.matchAll(/^\s*([a-zA-Z_$][\w$]*),?\s*$/gm)) names.add(one[1]!)
  }
  if (块数 === 0) 解析失败 += 1
  导出总数 += names.size

  for (const name of names) {
    let uses = 0
    for (const [other, text] of bodies) {
      if (other === file) continue
      uses += (text.match(new RegExp(`[.\\s\\[{,(]${name}\\b`, 'g')) ?? []).length
    }
    if (uses === 0) 候选.push({ store: file.replace(/\\/g, '/'), name })
  }
}

console.log(`  扫了 ${storeFiles.length - 跳过.length} 个 store、${导出总数} 个导出、${files.length} 个源文件（注释已剥）`)
for (const one of 跳过) console.log(`  跳过 ${one}`)
console.log(`  未发现消费者的候选：${候选.length}`)

/*
 * ⚠️ 这一条是这支门禁唯一的红线：**尺子自己失效**。
 * 不是「找到了 N 个零调用导出」——那是候选，不是错误。
 */
const 抓到锚点 = 候选.some((one) => one.name === ANCHOR)
if (!抓到锚点) {
  console.log(`\n  ✗ 已知锚点 ${ANCHOR} 没抓到——这把尺子坏了，底下的名单不可信。`)
  failed += 1
} else {
  console.log(`  ✓ 已知锚点自检：${ANCHOR} 抓到了`)
}
if (解析失败 > 0) {
  console.log(`\n  ✗ ${解析失败} 处导出块解析失败——扫描不完整，名单不可信。`)
  failed += 1
}

if (候选.length > 0) {
  console.log('\n  名单（是审查候选，不是判决）：\n')
  const byStore = new Map<string, string[]>()
  for (const one of 候选) byStore.set(one.store, [...(byStore.get(one.store) ?? []), one.name])
  for (const [store, names] of byStore) console.log(`    ${store}\n      ${names.join('、')}`)
  console.log('\n  ⚠️ 里头混着同名撞车（匹配是宽的），逐个复核再动手。')
  console.log('     六种性质只有头一种该删：')
  console.log('       错契约    判据跟真在跑的那把尺子对不上　　→ 删')
  console.log('       还没人用  语义对，只是没有第一个使用者　　→ 留')
  console.log('       重复      别处逐字同义地又算了一遍　　　　→ 留')
  console.log('       不必导出  自己文件里在用，只是不该 public　→ 改私有，不是删')
  console.log('       观察窗口  运行时在跑，门禁换个口去看它　　→ 留（五条判定见文件头）')
  console.log('       旧路留着  调用方式变了，helper 没人知道　　→ 留，并写明真正的那条路')
}

console.log()
if (failed > 0) {
  console.log(`◆ 尺子自检没过（${failed} 项）。`)
  process.exit(1)
}
console.log('◆ 名单印出来了，绿不绿这件事这一支不回答——要人去读。')
