/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 户籍家世门禁：八格各管什么。
 *
 * ## 这一支回答的是一个提问，而不是查一类错
 *
 * 上一版一个人的处境写在一个字段里：`trade`，十一个值，
 * 从「农户」一直排到「皇室」。排成一列看着整齐，可那一列里
 * 至少混着四层东西——籍、业、产、家世——于是有三种话写不出来：
 * 「凡是做买卖的人家」只能挨个列铺面名、「改行做木工」一改就连籍
 * 一起改了、「削爵之后门第没了可玉牒上的名字还在」根本无从表达。
 *
 * 拆成八格之后，真正该被反复问的问题只有一句：
 *
 *   **这八格分别负责改变什么？**
 *
 * 这一句只要还停在文档里，下一轮内容一多它就会重新互相污染——
 * 有人图省事把「他家开着铺子」写进家世，把「他爹是官」写进营生，
 * 而这两件事都不报错。所以这一支不查拼写、不查连通，
 * 它把那句话跑成数字：谁读得动哪一格、谁改得动哪一格、
 * 哪几格是彼此独立的、压回一格之后会写不出什么。
 *
 * ## 判据都从库里量，不在这儿抄一份清单
 *
 * 五格的键名只有一处定义（`scripts/origin.ts` 的 `ORIGIN_KEYS`，
 * 带 `satisfies`，`Condition` 改名一格这里当场编译不过）；
 * 「一条条件说的是哪几行人」也只有一处实现（`originsUnder`）。
 * 抄第二份的下场在别处交过学费：抄错的那一份不会喊，
 * 只会安静地少命中几行，而门禁看着一直是绿的。
 *
 * ## 第四段是这支门禁的重心
 *
 * 「谁改得动哪一格」不问代码怎么写，问的是**实际跑一遍会怎样**：
 * 全库每一条效果各开一世，落下去之前拍一张八格的照，落完再拍一张，
 * 两张一比就知道这条效果动了谁。这个数会推翻人的印象——
 * 写这一段的那天，库里已有五处注释写着「削爵那天 station 落到寻常」，
 * 而当时**没有任何一条效果写得出 station**，那五处话全是空的。
 * （那个五今天已经不是五了，所以底下判据里不写死处数——
 * 会漂的数字写进判据，漂的时候判据一直是绿的。）
 *
 * 跑法：npx vite-node scripts/household.ts
 * 失败会以非零码退出，可以直接挂进 CI。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS, DOINGS } from '../src/content/days'
import { ERRANDS } from '../src/content/errands'
import { HINDSIGHTS } from '../src/content/hindsight'
import { INFORMANTS } from '../src/content/informants'
import { DAMPERS, SPARKS } from '../src/content/leanings'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { OPENINGS } from '../src/content/openings'
import { ORIGINS } from '../src/content/origins'
import { SIGNS } from '../src/content/signs'
import { applyEffects } from '../src/engine/effects'
import { STORES, foundingOrder } from '../src/stores/founding'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import type { Condition, Effect, OriginId, SceneNode } from '../src/types/game'

import { ORIGIN_KEYS, asksOrigin, beOf, originsUnder, type OriginKey } from './origin'
import { conditionsOf, effectsOf } from './refs'

let wrong = 0
function bad(line: string): void {
  wrong += 1
  console.log(`  ✗ ${line}`)
}

// ============================================================
// 八格：五格出身，加上早就分出去的三格
// ============================================================

/**
 * 一个人的处境由这八格描述。
 *
 * 前五格是出身那一行拆开的，后三格早就各自成格了
 * （`household.home` / `character.identity` / `character.living`）。
 * 八格摆在一起才看得出一件事：**它们不是一个层级**——
 * 后三格随境遇天天变，前五格几乎不变，
 * 而第三段和第四段量的正是这个「几乎」到底有多大。
 */
const CELLS = ['出身', '籍', '业', '产', '家世', '居所', '身份', '日子'] as const
type Cell = (typeof CELLS)[number]

/** 五格在这张表里的名字，和它们在 `Condition` 上的键名的对照 */
const CELL_OF_KEY: Record<OriginKey, Cell> = {
  origin: '出身',
  census: '籍',
  livelihood: '业',
  business: '产',
  station: '家世',
}

function snap(): Record<Cell, string> {
  const household = useHouseholdStore()
  const character = useCharacterStore()
  return {
    出身: household.origin,
    籍: household.census,
    业: household.livelihood,
    产: household.business ?? '（无铺面）',
    家世: household.station,
    居所: household.home,
    身份: character.identity,
    日子: character.living.id,
  }
}

/** 开一世，八个 store 按立基次第建齐。摆成哪一行由调用方决定 */
function freshLife(origin?: OriginId): void {
  setActivePinia(createPinia())
  for (const name of foundingOrder()) STORES[name]()
  if (origin) beOf(origin)
}

function diff(before: Record<Cell, string>, after: Record<Cell, string>): Cell[] {
  return CELLS.filter((cell) => before[cell] !== after[cell])
}

// ============================================================
// 全库采集
// ============================================================

/** 一条条件，连同它写在哪儿 */
interface Asked {
  where: string
  one: Condition
}

/**
 * 全库每一条条件。
 *
 * 出处照抄 `verify.ts` 那份清单，外加 `SIGNS[].who`——
 * 那一处它没扫，而五格里有五条条件正写在那儿（预兆问「务农的人家」）。
 * 少扫一处的后果不是漏报一条错，是**这一支报出来的读者数偏低**，
 * 于是一格看着像没人用，而它其实有人用。
 */
function allConditions(): Asked[] {
  const asked: Asked[] = []
  const take = (list: readonly Condition[] | undefined, where: string): void => {
    for (const one of list ?? []) asked.push({ where, one })
  }

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes) as [string, SceneNode][]) {
      const where = `${sceneId}#${nodeId}`
      for (const ref of conditionsOf(node)) {
        take(ref.requires, ref.tag ? `${where} · ${ref.tag}` : where)
      }
    }
  }
  for (const event of lifeEvents) take(event.requires, `年表 · ${event.id}`)
  for (const doing of DOINGS) take(doing.requires, `一天 · 去处 ${doing.id}`)
  for (const beat of BEATS) take(beat.requires, `一天 · ${beat.doing}:w${beat.weight}`)
  for (const spark of SPARKS) take(spark.requires, `火种 · ${spark.id}`)
  for (const damper of DAMPERS) take(damper.requires, `反向火种 · ${damper.id}`)
  for (const opening of OPENINGS) take(opening.requires, `机会 · ${opening.id}`)
  for (const rule of HINDSIGHTS) take(rule.needs, `后见 · ${rule.id}`)
  for (const errand of ERRANDS) take(errand.requires, `跑腿 · ${errand.id}`)
  for (const one of INFORMANTS) take(one.requires, `打听 · ${one.id}`)
  for (const sign of SIGNS) take(sign.who, `预兆 · ${sign.id}`)

  return asked
}

/** 一条效果，连同它写在哪儿 */
interface Made {
  where: string
  effect: Effect
}

function allEffects(): Made[] {
  const made: Made[] = []
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes) as [string, SceneNode][]) {
      for (const effect of effectsOf(node)) made.push({ where: `${sceneId}#${nodeId}`, effect })
    }
  }
  for (const beat of BEATS) {
    for (const effect of beat.effects ?? []) made.push({ where: `一天 · ${beat.doing}`, effect })
  }
  return made
}

// ============================================================
// 尺子自检
// ============================================================

console.log('=== 尺子自检（存心改坏的必须红）===')
{
  /**
   * 自检一：`originsUnder` 真的在看每一格吗。
   *
   * 一格一格单独问：只写这一格的条件，命中面必须比「什么也不问」窄。
   * 哪一格窄不下来，就是 `originsUnder` 压根没在看它——
   * 那么底下第五段量出来的「压回一格要多写几行」全是假的。
   *
   * 头一版这里写的是「五格写满，逐格抹掉一格看会不会变宽」，
   * **那条判据永远绿**：五格写满只命中一行，而其中 `origin` 一格
   * 自己就把那一行钉死了，抹掉别的哪一格都还是那一行。
   * 输入不构成挑战的判据，跟没有判据是一回事。
   */
  const all = originsUnder({}).length
  const blind: string[] = []
  for (const key of ORIGIN_KEYS) {
    const value = key === 'origin' ? ORIGINS[0]!.id : ORIGINS[0]![key]
    if (value === null) continue
    if (originsUnder({ [key]: value } as Condition).length >= all) blind.push(CELL_OF_KEY[key])
  }
  console.log(
    `  ${blind.length === 0 ? '√' : `✗ ${blind.join('、')} 没在看`}　五格各自单独问，命中面都比 ${all} 行窄`,
  )
  if (blind.length > 0) bad(`originsUnder 漏看了 ${blind.join('、')}，底下的数字全部不作数`)
  // 反过来也要对：不问出身的条件谁都成立，一行也不许筛掉
  if (originsUnder({ age: { atLeast: 7 } }).length !== all) {
    bad('不问出身的条件把人筛掉了——originsUnder 收窄得太狠，会把有人读的内容判成没人读')
  }
}
{
  /**
   * 自检二：八格的快照真的分得开吗。
   *
   * 摆两世出来（药铺的孩子、宫里的孩子），八格必须处处不同。
   * 要是快照函数读错了 store，两世会长得一模一样，
   * 于是第三段第四段永远报「什么也没变」——**一支永远绿的门禁**。
   */
  freshLife('herb')
  const one = snap()
  freshLife('court')
  const other = snap()
  const apart = diff(one, other)
  const want: Cell[] = ['出身', '籍', '业', '产', '家世', '居所', '日子']
  const missed = want.filter((cell) => !apart.includes(cell))
  console.log(
    `  ${missed.length === 0 ? '√' : `✗ ${missed.join('、')} 没分开`}　药铺的孩子和宫里的孩子，八格里有 ${apart.length} 格不同`,
  )
  if (missed.length > 0) bad(`快照读错了格子：${missed.join('、')} 两世相同`)
}
{
  /**
   * 自检三：效果实跑那把尺子量得到写手吗。
   *
   * 喂一条**已知会写家世**的效果进去，第四段那套办法必须量到它。
   * 量不到就说明 `applyEffects` 那条路在门禁里根本没走通，
   * 于是第四段会报「五格一个写手也没有」——而那句话看着完全合理。
   */
  freshLife('manor')
  const before = snap()
  applyEffects([{ type: 'household', station: '寻常' }])
  const touched = diff(before, snap())
  const ok = touched.includes('家世')
  console.log(
    `  ${ok ? '√' : '✗ 量不到'}　喂一条明写家世的效果，量出它动了 ${touched.join('、') || '（什么也没动）'}`,
  )
  if (!ok) bad('效果实跑量不到已知的写手，第四段的结论不作数')
}

// ============================================================
// 一　八格各自有几个读者
// ============================================================

console.log('\n=== 一　八格各自有几个读者 ===')

/**
 * 眼下一个条件读者也没有的格子。
 *
 * 名单钉在这儿是两头守的：名单上的格子有了第一个读者要红
 * （提醒把 `types/game.ts` 里那段「这一格眼下没有读者」删掉），
 * 名单外的格子掉到零也要红（有人删光了读它的内容）。
 *
 * `census` 在名单上，理由写在 `types/game.ts` 的 `Census` 那一段：
 * 它今天唯一的使用者是「削爵那天它不跟着 station 走」。
 */
const KNOWN_UNREAD: readonly OriginKey[] = ['census']

const asked = allConditions()
const readers = new Map<OriginKey, string[]>(ORIGIN_KEYS.map((key) => [key, []]))
for (const { where, one } of asked) {
  for (const key of ORIGIN_KEYS) {
    if (one[key] !== undefined) readers.get(key)!.push(where)
  }
}

/**
 * 代码里读这一格的地方。
 *
 * 这是文本扫的，粗——跟 `verify.ts` 扫引擎源码找旗标是同一种粗办法，
 * 理由也一样：**只要没有任何一处代码提到它，它就一定没人读**。
 * 反过来不成立，所以这个数只印不判。
 *
 * 认三种写法，因为这个库里三种都有：`household.census`、
 * `useCharacterStore().identity`、以及 `storeToRefs` 拆出来直接在模板里用。
 * 头一版只认第一种，于是身份和日子都报了个 0——
 * 而它们各自有真读者，只是写法不是那一种。
 *
 * `engine/conditions.ts` 排掉：那是求值器，五格各占一行，
 * 跟内容用不用这一格毫无关系，算进来会让每一格都显得有人读。
 */
function codeReaders(name: string): string[] {
  const roots = ['src/engine', 'src/components/game']
  const dotted = new RegExp(`\\.${name}\\b`)
  const bare = new RegExp(`\\b${name}\\b`)
  const hits: string[] = []
  for (const root of roots) {
    for (const file of readdirSync(join(process.cwd(), root))) {
      if (file === 'conditions.ts') continue
      if (!file.endsWith('.ts') && !file.endsWith('.vue')) continue
      const source = readFileSync(join(process.cwd(), root, file), 'utf8')
      // 注释里提一句不算读它。只认真的代码
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      const destructured = code.includes('storeToRefs') && bare.test(code)
      if (dotted.test(code) || destructured) hits.push(`${root}/${file}`)
    }
  }
  return hits
}

const CODE_NAME: Record<Cell, string> = {
  出身: 'origin',
  籍: 'census',
  业: 'livelihood',
  产: 'business',
  家世: 'station',
  居所: 'home',
  身份: 'identity',
  日子: 'living',
}

console.log(`  全库 ${asked.length} 条条件，八格各自的读者：`)
for (const cell of CELLS) {
  const key = ORIGIN_KEYS.find((one) => CELL_OF_KEY[one] === cell)
  const byCondition =
    key === undefined
      ? cell === '日子'
        ? // 日子在 Condition 上有自己的键（living），可它不属于出身那五格
          asked.filter(({ one }) => one.living !== undefined).length
        : -1
      : readers.get(key)!.length
  const shown = byCondition < 0 ? '　—　' : String(byCondition).padStart(3)
  console.log(
    `    ${cell}　条件 ${shown}　代码 ${String(codeReaders(CODE_NAME[cell]).length).padStart(2)} 处`,
  )
}
console.log('    · 居所和身份那两格在 Condition 上没有入口（「—」），这是有意的：')
console.log('      它们由正文插值和称谓层读，剧本要分岔的时候问的是日子，不是门牌')
console.log('    · 「代码」是源码文本扫的，粗；求值器 conditions.ts 排掉了，它对每一格都有一行')

for (const key of ORIGIN_KEYS) {
  const count = readers.get(key)!.length
  const listed = KNOWN_UNREAD.includes(key)
  if (count === 0 && !listed) {
    bad(`${CELL_OF_KEY[key]}（${key}）一个条件读者也没有，而它不在明写的缺口名单上`)
  }
  if (count > 0 && listed) {
    bad(
      `${CELL_OF_KEY[key]}（${key}）已经有 ${count} 个条件读者了——` +
        '把它从 KNOWN_UNREAD 里删掉，types/game.ts 里那段「眼下没有读者」也该删',
    )
  }
}
for (const key of KNOWN_UNREAD) {
  console.log(`    · ${CELL_OF_KEY[key]}（${key}）是明写的缺口：零个条件读者，等第一个使用者`)
}

// ============================================================
// 二　五格互不决定
// ============================================================

console.log('\n=== 二　五格互不决定：这真的是五件事吗 ===')

/** A 相同的行里 B 也都相同——那就是 A 把 B 决定死了，B 白占一格 */
function determines(a: OriginKey, b: OriginKey): boolean {
  const seen = new Map<unknown, unknown>()
  for (const row of ORIGINS) {
    const from = a === 'origin' ? row.id : row[a]
    const to = b === 'origin' ? row.id : row[b]
    if (seen.has(from) && seen.get(from) !== to) return false
    seen.set(from, to)
  }
  return true
}

for (const a of ORIGIN_KEYS) {
  const decided = ORIGIN_KEYS.filter((b) => b !== a && determines(a, b)).map((b) => CELL_OF_KEY[b])
  console.log(
    `    ${CELL_OF_KEY[a]}　决定了 ${decided.length > 0 ? decided.join('、') : '（谁也没决定）'}`,
  )
}

/**
 * 这四条是这次拆分真正的产出，各自对着一句原来写不出来的话。
 * 它们只要有一条塌了，那一格就该并回去。
 */
const INDEPENDENT: readonly [OriginKey, OriginKey, string][] = [
  ['census', 'station', '八品官家在黄册上仍是民户——籍相同而家世不同'],
  ['station', 'census', '寻常人家里有民户也有匠户也有医户——家世相同而籍不同'],
  ['livelihood', 'business', '经商的三家柜台上摆的不是同一样东西——业相同而产不同'],
]
for (const [a, b, why] of INDEPENDENT) {
  if (determines(a, b)) bad(`${CELL_OF_KEY[a]} 现在把 ${CELL_OF_KEY[b]} 决定死了——${why}`)
}

/** 主键存在的理由：四格合起来仍然分不开藩府和宫里 */
{
  const four = ORIGIN_KEYS.filter((key) => key !== 'origin')
  const fingerprints = new Set(ORIGINS.map((row) => four.map((key) => String(row[key])).join('|')))
  const collided = ORIGINS.length - fingerprints.size
  console.log(
    `    四格合起来还剩 ${collided} 行分不开，所以 origin 这个主键得留着（藩府和宫里四格全同）`,
  )
  if (collided === 0) {
    bad('四格已经能把十一行分完了——origin 这个主键失去了它现在写着的那条理由')
  }
}
{
  /**
   * 已知的一处弱点，钉在这儿是为了它变了会红。
   *
   * `origins.ts` 那段注释写着「业这一列已经把籍那一列决定死了」——
   * 那是量出来的，不是猜的。哪天添一行军户务农的人家，这一句就不成立，
   * 那时该回去改那段注释，而不是让它继续挂着。
   */
  const stillFlat = determines('livelihood', 'census')
  console.log(
    `    业 → 籍：${stillFlat ? '仍然一一对应' : '已经不再一一对应了'}（origins.ts 那段注释按这个写的）`,
  )
  if (!stillFlat) {
    bad('业不再决定籍了——origins.ts 里「静态上它是冗余的」那一段该改了')
  }
}

// ============================================================
// 三　动一格，别的格跟不跟着动
// ============================================================

console.log('\n=== 三　削爵那两卷实跑：哪几格塌了，哪几格没动 ===')

/** 把一卷里几个节点的 onEnter 顺着落下去，量出这一卷动了哪几格 */
function playScene(scene: string, nodes: readonly string[], origin: OriginId): Cell[] {
  freshLife(origin)
  const before = snap()
  for (const id of nodes) {
    const node = lifeScenes[scene]?.nodes[id]
    if (!node) {
      bad(`${scene}#${id} 找不到——这一卷改过节点名，判据该跟着改`)
      return []
    }
    applyEffects(node.onEnter)
  }
  return diff(before, snap())
}

const FALLS: readonly { name: string; scene: string; nodes: string[]; origin: OriginId }[] = [
  {
    name: '削爵（王府）',
    scene: 'royal:demote',
    nodes: ['open', 'home', 'after'],
    origin: 'manor',
  },
  { name: '除封（宫里）', scene: 'royal:fall', nodes: ['edict'], origin: 'court' },
]

/** 墙塌下来该动的和不该动的。这一行就是「家世 ≠ 籍」在剧情里的样子 */
const MUST_FALL: readonly Cell[] = ['家世', '身份', '日子', '居所']
const MUST_HOLD: readonly Cell[] = ['出身', '籍', '业', '产']

for (const fall of FALLS) {
  const moved = playScene(fall.scene, fall.nodes, fall.origin)
  console.log(`    ${fall.name}　动了 ${moved.join('、') || '（什么也没动）'}`)
  for (const cell of MUST_FALL) {
    if (!moved.includes(cell)) bad(`${fall.name} 之后 ${cell} 没变——墙塌了而这一格没跟着塌`)
  }
  for (const cell of MUST_HOLD) {
    if (moved.includes(cell)) bad(`${fall.name} 之后 ${cell} 也变了——一道旨意改不动这一格`)
  }
}
console.log('    · 家世塌而籍不动，是这两格分开存的全部现有证据：')
console.log('      削爵之后他是「宗室籍的寻常人家」——上一版一个 trade 写不出这句话')

// ============================================================
// 四　谁改得动哪一格
// ============================================================

console.log('\n=== 四　谁改得动哪一格（全库效果各开一世实跑）===')

const made = allEffects()
const writers = new Map<Cell, Map<string, string>>(CELLS.map((cell) => [cell, new Map()]))
let skipped = 0
const skipReasons = new Map<string, number>()

/**
 * 每一条效果都从三种人家各落一遍。
 *
 * 头一版只落一遍，而且那一世的出身是随机掷的——于是
 * **一条明写 `station: '寻常'` 的效果被量成了「没有写手」**：
 * 掷到的那一世本来就是寻常人家，落下去前后一模一样。
 * 判据当时报的是「家世一个写手也没有」，而那句话看着完全合理。
 *
 * 三种人家挑的是相互最远的三行：宫里（宗室 · 食禄 · 无铺面）、
 * 农家（民户 · 务农 · 无铺面）、药铺（医户 · 行医 · 有铺面）。
 * 任何一条写得动五格的效果，都至少跟其中一种起点不同值。
 * 三个起点的结果取并集——**只要有一个起点看见它动了，它就是写手。**
 */
const BASELINES: readonly OriginId[] = ['court', 'farm', 'herb']

for (const { where, effect } of made) {
  for (const baseline of BASELINES) {
    freshLife(baseline)
    let before: Record<Cell, string>
    try {
      before = snap()
      applyEffects([effect])
    } catch (error: unknown) {
      skipped += 1
      const why = error instanceof Error ? error.message : String(error)
      skipReasons.set(why, (skipReasons.get(why) ?? 0) + 1)
      continue
    }
    for (const cell of diff(before, snap())) {
      if (!writers.get(cell)!.has(effect.type)) writers.get(cell)!.set(effect.type, where)
    }
  }
}

const tries = made.length * BASELINES.length
console.log(
  `  全库 ${made.length} 条效果，各从 ${BASELINES.length} 种人家落一遍（${tries} 次，跑通 ${tries - skipped} 次），八格各自的写手：`,
)
for (const cell of CELLS) {
  const who = writers.get(cell)!
  const shown =
    who.size === 0
      ? '（一个也没有）'
      : [...who].map(([type, where]) => `${type}（如 ${where}）`).join('、')
  console.log(`    ${cell}　${shown}`)
}
if (skipped > 0) {
  console.log(`  这一段有 ${skipped} 条效果落不下去，各自的报错：`)
  for (const [why, count] of [...skipReasons].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    console.log(`    ${String(count).padStart(3)} 条　${why}`)
  }
  console.log('    · 落不下去的那些不算「没有写手」，只算没量到——覆盖率印在上面一行')
}

/** 后三格必须各有写手。一个也没有，说明这一段整段没量到，而不是真没人改 */
for (const cell of ['居所', '身份', '日子'] as const) {
  if (writers.get(cell)!.size === 0) {
    bad(`${cell} 一个写手也量不到——这一段的办法没走通，别的格子的结论也不作数`)
  }
}
/** 出身是掷定不动的那一格。哪天有人写得动它，这一句得当场红 */
if (writers.get('出身')!.size > 0) {
  bad(`出身被 ${[...writers.get('出身')!.keys()].join('、')} 改动了——它该是掷定就不再动的那一格`)
}
{
  const five = (['籍', '业', '产', '家世'] as const).filter((cell) => writers.get(cell)!.size > 0)
  console.log(`    · 籍业产家世四格里，眼下有写手的是：${five.join('、') || '（一个也没有）'}`)
  if (!five.includes('家世')) {
    bad('家世一个写手也没有——那么库里每一处「削爵那天 station 落到寻常」的注释都是空话')
  }
}

// ============================================================
// 五　压回一格会写不出什么
// ============================================================

console.log('\n=== 五　反向判据：把五格压回一个 trade，哪些条件写不出来 ===')
{
  const origin = asked.filter(({ one }) => asksOrigin(one))
  /**
   * 问性质的，不是问某一行的。
   *
   * 这才是压回一格之后真正要改写的那一批：`{ business: '药铺' }`
   * 说的是「家里有一处药铺」，压回一格之后它只能写成一串出身名，
   * 于是那句话从「问的是铺面」变成了「问的是这几家」——
   * **意思没了，只剩名单。**添一行新的药铺人家，名单不会自己长。
   */
  const byProperty = origin.filter(({ one }) => one.origin === undefined)
  const wide = origin.filter(({ one }) => originsUnder(one).length > 1)
  const extra = wide.reduce((sum, { one }) => sum + originsUnder(one).length - 1, 0)

  console.log(`  全库 ${origin.length} 条条件问了出身那五格，其中：`)
  console.log(`    ${byProperty.length} 条问的是性质不是某一行——压回一格全得改写成列出身名`)
  console.log(`    ${wide.length} 条一次命中不止一行人家——改写之后还要多写 ${extra} 行分支`)
  for (const { where, one } of wide.slice(0, 6)) {
    const rows = originsUnder(one).map((row) => row.id)
    const said = ORIGIN_KEYS.filter((key) => one[key] !== undefined)
      .map((key) => `${key}: ${String(one[key])}`)
      .join(' + ')
    console.log(`      ${where}　{ ${said} } → ${rows.join(' ')}`)
  }
  if (wide.length > 6) console.log(`      …… 另有 ${wide.length - 6} 条`)
  console.log('    · 多出来的那些行不是麻烦，是风险：列漏一行没有任何机器会提醒')
  if (byProperty.length === 0) {
    bad('没有一条条件问的是性质——那么五格全在当主键使，这次拆分至今一无所获')
  }
  if (wide.length === 0) {
    bad('没有一条条件是一次命中多行的——粗那一档没人用，家世那一格该并回去')
  }
}

// ============================================================
// 这一支没有验到的
// ============================================================

console.log('\n=== 这一支没有验到的 ===')
console.log('  · 「没有铺面的人家」写不出来：Condition.business 不收 null，')
console.log('    于是那六行只能反着列铺面名，或者绕道问业。眼下没有内容需要它，先留着')
console.log('  · 效果只单独落，不成串落：一卷里前一条效果给后一条铺的路，这里量不到')
console.log('  · 代码读者那一列是文本扫的，说得了「没人读」，说不了「有人读」')
console.log('  · 居所和身份没有条件入口，所以第一段里它们只有代码读者那半列')

console.log('')
if (wrong === 0) {
  console.log('  八格各管各的：')
  console.log('    · 五格里只有家世有写手，写手只有旨意那两处；籍业产至今没人改得动')
  console.log('    · 削爵那天家世塌而籍不动——这是五格不是一格的现场证据')
  console.log('    · 有人把「他家开着铺子」写进家世，第二段那三条独立性会红')
  console.log('    · 有人给籍写了第一条 requires，第一段会红，提醒去删那段「眼下没有读者」')
} else {
  console.log(`  ${wrong} 处对不上——八格的分工变了，或者那些话该改了。`)
  process.exitCode = 1
}
