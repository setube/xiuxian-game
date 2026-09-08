/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 造反从你门口经过：四种结局是选择跟世界的交叉，而世界那一半先掷定。
 *
 * 跑法：`bun scripts/unrest.ts`
 *
 * ## 这一道守的是什么
 *
 * `life/unrest.ts` 那一卷的全部设计压在两句话上：
 *
 *     一　四种结局是**选择 × 世界状态**的交叉，不是选择的报应
 *     二　世界那一半（散还是闹）**在他开口之前**就掷定了
 *
 * 第二句是第一句的地基。掷在选择之后的话，「不说」就成了一场赌，
 * 而这一卷从头到尾不想写赌——19.md 明写着「根本没人响应，
 * 几天后就散了」也是一种结果，那件事跟玩家没关系。
 *
 * ## 为什么非要摆局跑
 *
 * 真世跑过了（1500 世抽中 6 世，0.4%），四格里**有一格零次**：
 * 报了官 + 闹起来了。那一格在真世里要等两个各自稀有的事同时发生，
 * 而它恰恰是这一卷里最难写的一节（他没事，而村里人知道是谁报的）。
 *
 * **零次演出的内容跟不存在没有分别**——所以这一支把四格逐个摆出来走一遍。
 * 摆局验的是「这四条路各自站不站得住」，真世验的是「演不演得到」，
 * 两者答不了同一个问题，这一卷两样都做了。
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Effect, NarrativeBlock, SceneNode } from '../src/types/game'
import { beOf } from './origin'

const SCENE = 'unrest:word'

/** 一格交叉：他选了什么，世界掷出了什么 */
interface Cell {
  label: string
  /** `asked` 那一节上他点的那条 */
  choice: 'keep' | 'dodge' | 'tell'
  /** 掷出来的那个字 */
  rolled: '散' | '闹'
  /** 走完该落在哪一节 */
  want: string
}

/**
 * 六格，不是四格。
 *
 * 「应下」和「装作没听懂」往后的事一模一样——**不一样的只在他自己心里**，
 * 而那一句差别写在 `quiet` 那一节的 `seen` 上。所以这两条各摆一次，
 * 才验得了「机制上同路，正文里分得开」这件事。
 */
const CELLS: readonly Cell[] = [
  { label: '应下　　　　× 散了', choice: 'keep', rolled: '散', want: 'quiet' },
  { label: '装作没听懂　× 散了', choice: 'dodge', rolled: '散', want: 'quiet' },
  { label: '去里长家　　× 散了', choice: 'tell', rolled: '散', want: 'quiet' },
  { label: '应下　　　　× 闹起来了', choice: 'keep', rolled: '闹', want: 'storm-kept' },
  { label: '装作没听懂　× 闹起来了', choice: 'dodge', rolled: '闹', want: 'storm-kept' },
  { label: '去里长家　　× 闹起来了', choice: 'tell', rolled: '闹', want: 'storm-told' },
]

/** 这一卷跑完之后，跟这一道有关的一切 */
interface Ran {
  label: string
  /** 走完落在哪一节 */
  landed: string
  /**
   * 依次走过的每一节。
   *
   * ⚠️ **不能只记链尾。** `storm-kept` 和 `storm-told` 走完都汇到
   * `after-storm`（那一节两支共用，因为日子接着过的方式是一样的），
   * 于是只比链尾的话，「报官和不报官落在同一节」永远成立——
   * 头一版的判据正是这么写的，当场误报。
   */
  through: readonly string[]
  /** 这一路读到的正文，插值之后 */
  lines: readonly string[]
  /**
   * 家底**变了多少**，不是绝对值。
   *
   * ⚠️ 每一格摆局各起各的 pinia，`beOf('farm')` 每次现掷家底
   * （实测六格的起手是 26 到 62）。拿两条人生的绝对家底相比，
   * 比的是掷出来的运气，不是这一卷落下的效果——头一版两条判据
   * 都栽在这儿。
   */
  lost: number
  /** 身上留下了哪几面旗 */
  flags: readonly string[]
}

function nodeOf(id: string): SceneNode {
  const scene = lifeScenes[SCENE]
  if (!scene) throw new Error(`库里没有这一卷：${SCENE}`)
  const node = scene.nodes[id]
  if (!node) throw new Error(`${SCENE} 里没有这一节：${id}`)
  return node
}

/** 一节的正文，插值之后。`seen` 那几句按条件收 */
function linesOf(node: SceneNode): string[] {
  const out: string[] = []
  for (const block of node.blocks ?? []) {
    const text = (block as NarrativeBlock & { text?: string }).text
    if (text) out.push(fillString(text, node.manner))
  }
  for (const one of node.seen ?? []) {
    if (meetsAll(one.requires)) out.push(fillString(one.text, node.manner))
  }
  return out
}

/** 顺着 `branches` / `next` 往下走，直到走不动 */
function walkFrom(start: string, lines: string[], through: string[]): string {
  let at = start
  for (let step = 0; step < 12; step += 1) {
    through.push(at)
    const node = nodeOf(at)
    applyEffects(node.onEnter ?? [])
    lines.push(...linesOf(node))
    const branch = (node.branches ?? []).find((one) => meetsAll(one.requires))
    const next = branch?.next ?? node.next
    if (next === undefined) return at
    at = next
  }
  throw new Error('走了十二步还没到头，这一卷里多半有环')
}

function run(cell: Cell): Ran {
  setActivePinia(createPinia())
  const world = useWorldStore()
  const household = useHouseholdStore()
  // 这两个 store 这一支不直接读，可 `beOf` 和效果层要它们先立起来
  useCharacterStore()
  usePeopleStore()
  beOf('farm')

  const lines: string[] = []
  const through: string[] = []
  // 起手的家底。这一卷落下的效果是终值减它，不是终值本身
  const before = household.standing

  // —— open：这一节掷散还是闹。**掷完立刻按摆局改写**，不看运气 ——
  const open = nodeOf('open')
  applyEffects(open.onEnter ?? [])
  world.setFlag('unrest-outcome', cell.rolled)
  lines.push(...linesOf(open))

  // —— asked：他点的那一条 ——
  const asked = nodeOf('asked')
  applyEffects(asked.onEnter ?? [])
  lines.push(...linesOf(asked))
  const choice = (asked.choices ?? []).find((one) => one.id === cell.choice)
  if (!choice) throw new Error(`asked 那一节上没有这条：${cell.choice}`)
  applyEffects((choice.effects ?? []) as readonly Effect[])

  const landed = walkFrom(choice.next ?? 'winter', lines, through)
  return {
    label: cell.label,
    landed,
    through,
    lines,
    lost: household.standing - before,
    flags: [
      'unrest-kept',
      'unrest-said-yes',
      'unrest-told',
      'unrest-implicated',
      'unrest-marked',
    ].filter((key) => world.hasFlag(key)),
  }
}

const ran = new Map<string, Ran>()
const broken: string[] = []
for (const cell of CELLS) {
  try {
    ran.set(cell.label, run(cell))
  } catch (error) {
    broken.push(`${cell.label}：${error instanceof Error ? error.message : String(error)}`)
  }
}

// ============================================================
// 一、六格各自落在该落的地方
// ============================================================

function landings(): string[] {
  const wrong = [...broken]
  for (const cell of CELLS) {
    const one = ran.get(cell.label)
    if (!one) continue
    // 落点是链尾，而链尾在 `quiet`/`storm-*` 之后还有一节收尾
    const wanted = cell.want === 'quiet' ? 'after-quiet' : 'after-storm'
    if (one.landed !== wanted) {
      wrong.push(`${cell.label}：该走到 ${wanted}，实际停在 ${one.landed}`)
    }
    console.log(
      `  【${cell.label}】${one.through.join('→')}　家底 ${one.lost >= 0 ? '+' : ''}${one.lost}　` +
        `旗 ${one.flags.join('·') || '（无）'}`,
    )
  }
  return wrong
}

// ============================================================
// 二、四种结局各自留下不同的东西
// ============================================================

/**
 * 这一节问的是**「四格分得开吗」**，不是「四格存在吗」。
 *
 * 分不开的话上一节照样全绿：六条路都走到了终点，而终点上
 * 什么也没留下——那时这一卷等于只有一种结局，配了六个入口。
 */
function distinct(): string[] {
  const wrong: string[] = []
  const kept = ran.get('应下　　　　× 闹起来了')
  const told = ran.get('去里长家　　× 闹起来了')
  const quiet = ran.get('应下　　　　× 散了')

  // 知情不报 + 闹起来了：家底跌，而且留下一笔他自己看不见的记录
  if (kept && !kept.flags.includes('unrest-implicated')) {
    wrong.push('知情不报 × 闹起来了：走完身上没有 unrest-implicated——那一笔没落下')
  }
  if (kept && kept.lost >= 0) {
    wrong.push(`知情不报 × 闹起来了：家底变了 ${kept.lost}——被关六天、地没人管，家底该跌`)
  }
  // 报了官 + 闹起来了：他没事，可村里留下了另一样东西
  if (told && told.flags.includes('unrest-implicated')) {
    wrong.push('报了官 × 闹起来了：他不该被牵连，可身上有 unrest-implicated')
  }
  if (told && !told.flags.includes('unrest-marked')) {
    wrong.push('报了官 × 闹起来了：走完身上没有 unrest-marked——村里那一层没落下')
  }
  if (told && told.lost !== 0) {
    wrong.push(`报了官 × 闹起来了：家底变了 ${told.lost}，可他家没有事，这一格不该动`)
  }

  // 散了那一格：什么也不该留下。**这一条是这一卷最要紧的判据**
  if (
    quiet &&
    (quiet.flags.includes('unrest-implicated') || quiet.flags.includes('unrest-marked'))
  ) {
    wrong.push('散了那一格身上留下了牵连或名声——那一格该是「什么也没有发生」')
  }
  if (wrong.length === 0) {
    console.log('  ✓ 四格各留各的：牵连、名声、什么也没有，三样分得开')
  }
  return wrong
}

// ============================================================
// 三、应下和装作没听懂：往后的事一样，正文里分得开
// ============================================================

function inHisHeart(): string[] {
  const wrong: string[] = []
  const yes = ran.get('应下　　　　× 散了')
  const dodge = ran.get('装作没听懂　× 散了')
  if (!yes || !dodge) return wrong

  if (yes.through.join('→') !== dodge.through.join('→') || yes.lost !== dodge.lost) {
    wrong.push(
      `应下走的是 ${yes.through.join('→')}（家底 ${yes.lost}），` +
        `装作没听懂走的是 ${dodge.through.join('→')}（家底 ${dodge.lost}）——` +
        '往后的事应当一模一样，机制上不该有分别',
    )
  }
  const only = yes.lines.filter((line) => !dodge.lines.includes(line))
  if (only.length === 0) {
    wrong.push(
      '应下和装作没听懂读到的正文一字不差——**那句「你应下的那句话他一次也没提过」没出来**，' +
        '两条选择于是只剩标签不同',
    )
  } else {
    console.log(`  ✓ 机制上同路，正文里分得开：「${only[0]}」`)
  }
  return wrong
}

// ============================================================
// 四、尺子自检
// ============================================================

/**
 * 三种坏实现，必须全被上面拒绝。
 *
 * 第一种是这一卷的设计要害：**掷在选择之后**。它跟正确实现的差别
 * 在真世里看不出来（两种跑法都会四格都出现），只有摆局才分得清——
 * 因为摆局能同时钉死「选了什么」和「掷出了什么」。
 */
function ruler(): string[] {
  const wrong: string[] = []

  // —— 坏实现一：结局按选择推，不按掷 ——
  const kept = ran.get('应下　　　　× 闹起来了')
  const told = ran.get('去里长家　　× 闹起来了')
  /*
   * 比**走过的路**，不比落点。
   *
   * `storm-kept` 和 `storm-told` 走完都汇到 `after-storm`——那一节两支共用，
   * 因为日子接着过的方式是一样的。只比落点的话这条永远误报（头一版就是）。
   */
  if (kept && told && kept.through.join('→') === told.through.join('→')) {
    wrong.push('同一次掷「闹」，报官和不报官走的是同一条路——这一卷分不出选择')
  } else {
    console.log(
      `  ✓ 同一次掷「闹」，两条路分开：${kept?.through.join('→')} ／ ${told?.through.join('→')}`,
    )
  }

  const quietKept = ran.get('应下　　　　× 散了')
  const stormKept = ran.get('应下　　　　× 闹起来了')
  if (quietKept && stormKept && quietKept.through.join('→') === stormKept.through.join('→')) {
    wrong.push('同一个选择，掷散和掷闹走的是同一条路——这一卷分不出世界')
  } else {
    console.log('  ✓ 同一个选择（应下），掷散和掷闹落在两节')
  }

  // —— 坏实现二：那一掷根本不在 open 上 ——
  const open = nodeOf('open')
  const rolls = (open.onEnter ?? []).filter((one) => one.type === 'roll')
  if (rolls.length === 0) {
    wrong.push(
      '`open` 那一节上没有 roll——**散还是闹得在他开口之前掷定**。' +
        '挪到选择之后，「不说」就成了一场赌，而这一卷不写赌',
    )
  } else {
    console.log(`  ✓ 那一掷在 open 上（他开口之前）：${rolls.length} 条`)
  }

  // —— 坏实现三：掷的权重被改成了对半 ——
  const among = rolls[0]?.type === 'roll' ? rolls[0].among : []
  const scatter = among.find((one) => one.value === '散')?.weight ?? 0
  const storm = among.find((one) => one.value === '闹')?.weight ?? 0
  if (scatter <= storm) {
    wrong.push(
      `散 ${scatter} 闹 ${storm}——**散该是常态**。19.md 明写着「根本没人响应，` +
        '几天后就散了」，而历史上成事的是极少数',
    )
  } else {
    console.log(`  ✓ 散是常态：散 ${scatter} 闹 ${storm}`)
  }

  return wrong
}

const gates: readonly { name: string; run: () => string[] }[] = [
  { name: '一、六格各自落在该落的地方', run: landings },
  { name: '二、四种结局各留各的', run: distinct },
  { name: '三、应下和装没听懂：事一样，心里不一样', run: inHisHeart },
  { name: '四、尺子自检', run: ruler },
]

let bad = 0
for (const gate of gates) {
  console.log(gate.name)
  const found = gate.run()
  for (const one of found) console.log(`  ✗ ${one}`)
  if (found.length === 0) console.log('  ✓ 没有发现问题')
  bad += found.length
  console.log('')
}

if (bad > 0) {
  console.log(`共 ${bad} 处。`)
  process.exitCode = 1
} else {
  console.log('四道全过。造反从他门口经过，而散还是闹在他开口之前就定了。')
  console.log('**六成二的人生里什么也没有发生——那三个月的心是白担的。**')
}
