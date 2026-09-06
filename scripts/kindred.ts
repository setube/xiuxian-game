/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
import './lib/seeded'

/**
 * 老屋：分家以后的两家。
 *
 * 跑法：bun scripts/kindred.ts
 *
 * ## 守的是什么
 *
 * 用户 2026-09-06 定的：家拆成两户之后，人际关系是不是仍然有连续性——
 * 「长期分离不自动降低关系」这句规矩第一次有几十年去验。分头守：
 *
 *   一、不见面不减分——分家之后没有任何老屋的事发生的那些年，哥那条边的好感一格没动
 *   二、老屋在过日子——嫂子进门、侄儿出生进的是老屋（`old-home`）不是你这一户；
 *       侄儿的岁数跟着世界时间长，正文里那句「已经几岁了」是现算的中文，不是记号
 *   三、两条边各是各的——有的人生里哥的好感高、嫂子的低；嫂子处不处得来从她的性情里出
 *       （刚硬、暴躁 → 冷；别的 → 热），同一种性情永远同一种脸色
 *   四、关系变化只来自具体的事——借粮借了的那些人生哥的好感升，没借的降；年节走动一格不改
 *   五、娘在老屋没了，你回去守孝——那一卷走到时娘确实不在了，而且她确实是留在老屋的
 *   六、尺子自检：把「不见面不减分」喂一条腐烂的边，第一条得红；把性情对调，第三条得红
 *
 * ## 两处采样上的坑，都踩过
 *
 * 正文流封顶四百块（`narrative.ts` 的 `MAX_STREAM_LENGTH`），`stream.slice(seen)` 在一世
 * 过了四百块之后返回的永远是空——头一版这一支报「年节走动 0 世」，其实年节年年在过，
 * 是尺子把后半生的正文全丢了。现在按块 id 收（同 `tasks/seen-lives.ts`）。
 *
 * 无选项的卷（娶亲、添丁、年节、丧事）进去就出来，`choose` 之后 `narrative.sceneId`
 * 已经是日常那一卷——走没走到得看正文里那句话，不能看卷名。
 * `apart.ts` 把 kindred:wedding#open 与 kindred:nephew#open 移交到这儿：领进门的人得进老屋。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { effectsOf } from './refs'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Temper } from '../src/types/game'

const LIVES = 240
const CAP = 5000
/** 走到分家（自己分出去）的世数，掷到够数为止 */
const DIVIDES_WANTED = 24
/** 走到借粮的世数：荒年得撞上分家之后，稀。两条路各要有人走 */
const BORROWS_WANTED = 4

const COLD: readonly Temper[] = ['暴躁', '刚硬']

interface Lived {
  divided: boolean
  /** 分家那一刻哥的好感，和之后每一个「老屋没事发生的年」采到的好感 */
  brotherAtDivide: number | null
  quietYears: { year: number; affinity: number }[]
  wifeHouse: string | null
  nephewHouse: string | null
  nephewAges: number[]
  newyearLines: string[]
  wifeTemper: Temper | null
  wifeCold: boolean | null
  brotherAffinity: number | null
  wifeAffinity: number | null
  lent: boolean | null
  brotherBeforeBorrow: number | null
  brotherAfterBorrow: number | null
  mourned: boolean
  mournedOk: boolean
  mournNote: string
}

/** 「不见面不减分」：没事发生的那些年好感有没有动。写成函数，是为了自检能喂坏数据 */
function driftOf(base: number | null, quiet: readonly { year: number; affinity: number }[]): number {
  if (base === null) return 0
  return quiet.filter((q) => q.affinity !== base).length
}

/** 嫂子的脸色是不是从性情里出的。写成函数，是为了自检能把性情对调 */
function coldnessWrong(rows: readonly { temper: Temper; cold: boolean }[]): number {
  return rows.filter((r) => COLD.includes(r.temper) !== r.cold).length
}

/** 这一册的卷。`apart.ts` 把 kindred:wedding 与 kindred:nephew 领人进门那两处移交到这儿 */
const KINDRED_SCENES = ['kindred:wedding', 'kindred:nephew', 'kindred:newyear', 'kindred:borrow', 'kindred:mourning'] as const

function live(): Lived {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale })
  story.begin()

  const out: Lived = {
    divided: false,
    brotherAtDivide: null,
    quietYears: [],
    wifeHouse: null,
    nephewHouse: null,
    nephewAges: [],
    newyearLines: [],
    wifeTemper: null,
    wifeCold: null,
    brotherAffinity: null,
    wifeAffinity: null,
    lent: null,
    brotherBeforeBorrow: null,
    brotherAfterBorrow: null,
    mourned: false,
    mournedOk: true,
    mournNote: '',
  }
  const fired = (id: string): boolean => world.hasFlag(`event:${id}`)
  const kept = new Set<string>()
  const drain = (): string[] => {
    const fresh: string[] = []
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if (item.block.text) fresh.push(item.block.text)
    }
    return fresh
  }
  drain()
  const KINDRED_TEXT = /老屋|嫂子|侄儿|正月里|喜酒/
  let lastYear = world.time.year
  for (let turns = 0; !narrative.ended && turns < 240; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    const pick = open[Math.floor(Math.random() * open.length)]!
    const sceneBefore = narrative.sceneId ?? ''
    const nodeBefore = narrative.nodeId ?? ''
    const brotherBefore = people.known['brother']?.affinity ?? null

    story.choose(pick.choice)

    const fresh = drain()
    const chose = `${sceneBefore}#${nodeBefore}:${pick.choice.id}`
    const brotherNow = people.known['brother']?.affinity ?? null

    // 分家那一刻。**这一步不跳**：分完家的同一步里年表就可能接着抽到娶亲、添丁
    if (!out.divided && people.houses['old-home'] !== undefined) {
      out.divided = true
      lastYear = world.time.year
    }
    if (!out.divided) continue

    // 一、老屋的事发生了没：看正文，不看卷名（无选项的卷进去就出来）
    const kindredStep = fresh.some((l) => KINDRED_TEXT.test(l)) || chose.startsWith('kindred:')
    if (kindredStep || out.brotherAtDivide === null) {
      // 这一步动没动好感是这一步的事；从这一步起按新的基线量「没事的年」——
      // 旧基线下采的那些年作废，不然基线一挪，早先采的就都成了「动过」
      out.brotherAtDivide = brotherNow
      out.quietYears = []
    } else if (world.time.year !== lastYear && brotherNow !== null) {
      out.quietYears.push({ year: world.time.year, affinity: brotherNow })
    }
    lastYear = world.time.year

    // 四、借粮
    if (chose === 'kindred:borrow#open:lend' || chose === 'kindred:borrow#open:refuse') {
      out.lent = chose.endsWith('lend')
      out.brotherBeforeBorrow = brotherBefore
      out.brotherAfterBorrow = brotherNow
    }

    // 二、老屋在过日子。头一回见到他们时量住在哪一户；这一步里就夭折了的（时序跨了年）不量——
    // 殁了的人不在户里，那是对的
    if (out.wifeHouse === null && people.personOf('brother-wife') && people.isAlive('brother-wife')) {
      out.wifeHouse = people.houseOf('brother-wife')?.id ?? '（无）'
      out.wifeTemper = people.personOf('brother-wife')?.temper ?? null
    }
    if (out.nephewHouse === null && people.personOf('nephew') && people.isAlive('nephew')) {
      out.nephewHouse = people.houseOf('nephew')?.id ?? '（无）'
    }
    // 年节：正文里那句「正月里你回了一趟老屋」到了，就是走到了
    if (fresh.some((l) => l.includes('正月里你回了一趟老屋'))) {
      for (const line of fresh) if (line.includes('已经')) out.newyearLines.push(line)
      out.nephewAges.push(people.ageOf('nephew'))
    }
    void brotherBefore
    // 三、嫂子的脸色（娶亲那一卷）
    if (out.wifeCold === null && fresh.some((l) => l.includes('没说几句话') || l.includes('留你吃了晚饭'))) {
      out.wifeCold = fresh.some((l) => l.includes('没说几句话'))
    }
    // 五、守孝
    if (!out.mourned && fired('kindred-mourning')) {
      out.mourned = true
      const mother = people.kinOf('生母')[0]
      if (mother === undefined || people.isAlive(mother)) {
        out.mournedOk = false
        out.mournNote = '守了孝，娘还活着'
      } else if (world.getFlag('old-home-mother') !== false) {
        out.mournedOk = false
        out.mournNote = '守了孝，旗还写着娘在老屋'
      }
    }
  }
  out.brotherAffinity = people.known['brother']?.affinity ?? null
  out.wifeAffinity = people.known['brother-wife']?.affinity ?? null
  void household
  void KINDRED_SCENES
  return out
}

console.log(`\n=== 老屋：分家以后的两家（${LIVES} 世，分家至少 ${DIVIDES_WANTED} 世）===\n`)
let bad = 0

const lives: Lived[] = []
for (let i = 0; i < LIVES; i += 1) lives.push(live())
const enough = (): boolean =>
  lives.filter((l) => l.divided).length >= DIVIDES_WANTED &&
  lives.filter((l) => l.lent === true).length >= BORROWS_WANTED / 2 &&
  lives.filter((l) => l.lent === false).length >= BORROWS_WANTED / 2
for (let tries = 0; tries < CAP && !enough(); tries += 1) lives.push(live())
const divided = lives.filter((l) => l.divided)
const wedded = divided.filter((l) => l.wifeHouse !== null)
const nephews = divided.filter((l) => l.nephewHouse !== null)
const newyears = divided.filter((l) => l.newyearLines.length > 0)
const borrowed = divided.filter((l) => l.lent !== null)
const mourned = divided.filter((l) => l.mourned)
console.log(
  `  ${lives.length} 世：分家 ${divided.length}，哥娶亲 ${wedded.length}，添侄儿 ${nephews.length}，` +
    `年节走动 ${newyears.length}，借粮 ${borrowed.length}，守孝 ${mourned.length}`,
)
if (divided.length < DIVIDES_WANTED) {
  console.log(`  ✗ 掷了 ${lives.length} 世只有 ${divided.length} 世分家，不够判。`)
  bad += 1
}

// 一、不见面不减分
{
  const drifted = divided.filter((l) => driftOf(l.brotherAtDivide, l.quietYears) > 0)
  const quietTotal = divided.reduce((n, l) => n + l.quietYears.length, 0)
  if (quietTotal === 0) {
    console.log(`  ✗ 一、分家之后没有采到一个「老屋没事发生」的年——这一条没验到。`)
    bad += 1
  } else if (drifted.length > 0) {
    const one = drifted[0]!
    console.log(`  ✗ 一、${drifted.length} 世哥那条边在没事发生的年里自己动了：分家时 ${one.brotherAtDivide}，后来 ${one.quietYears.map((q) => q.affinity).join('/')}`)
    bad += 1
  } else console.log(`  ✓ 一、${quietTotal} 个没事发生的年，哥那条边的好感一格没动——不见面不减分。`)
}

// 二、老屋在过日子
{
  const wrongHouse = [
    ...wedded.filter((l) => l.wifeHouse !== 'old-home'),
    ...nephews.filter((l) => l.nephewHouse !== 'old-home'),
  ]
  const rawToken = newyears.filter((l) => l.newyearLines.some((line) => /[{}]/.test(line)))
  const grew = newyears.filter((l) => l.nephewAges.length >= 2 && l.nephewAges[l.nephewAges.length - 1]! > l.nephewAges[0]!)
  // 「躲到嫂子身后」的得是会走路的孩子：一个月大的娃不会躲（头一版这一句落的正是「已经一个月了」）
  const toddling = newyears.filter((l) => l.nephewAges.some((age) => age < 2))
  const sample = newyears[0]?.newyearLines[0] ?? ''
  if (sample) console.log(`  年节那一句落纸：${sample}`)
  if (wedded.length === 0 || nephews.length === 0) {
    console.log(`  ✗ 二、老屋没添人：娶亲 ${wedded.length} 世，添丁 ${nephews.length} 世。`)
    bad += 1
  } else if (wrongHouse.length > 0) {
    console.log(`  ✗ 二、${wrongHouse.length} 世嫂子或侄儿进错了户：${wrongHouse[0]!.wifeHouse} / ${wrongHouse[0]!.nephewHouse}`)
    bad += 1
  } else if (rawToken.length > 0) {
    console.log(`  ✗ 二、年节那句里有没落的记号：${rawToken[0]!.newyearLines[0]}`)
    bad += 1
  } else if (grew.length === 0) {
    console.log(`  ✗ 二、没有一世里侄儿在两次年节之间长了岁数（走到两次年节的 ${newyears.filter((l) => l.nephewAges.length >= 2).length} 世）。`)
    bad += 1
  } else if (toddling.length > 0) {
    console.log(`  ✗ 二、${toddling.length} 世年节那句里躲到嫂子身后的侄儿还不到两岁。`)
    bad += 1
  } else console.log(`  ✓ 二、嫂子、侄儿都住在老屋；${grew.length} 世侄儿在两次年节之间长了岁数，那一句落的是中文岁数，而且是会走路的岁数。`)
}

// 三、两条边各是各的；脸色从性情里出
{
  const rows = wedded
    .filter((l) => l.wifeTemper !== null && l.wifeCold !== null)
    .map((l) => ({ temper: l.wifeTemper!, cold: l.wifeCold! }))
  const split = wedded.filter(
    (l) => l.brotherAffinity !== null && l.wifeAffinity !== null && l.brotherAffinity > 30 && l.wifeAffinity < 0,
  )
  const wrong = coldnessWrong(rows)
  if (rows.length === 0) {
    console.log(`  ✗ 三、没有一世读到嫂子的脸色。`)
    bad += 1
  } else if (wrong > 0) {
    console.log(`  ✗ 三、${wrong} / ${rows.length} 世嫂子的脸色跟她的性情对不上。`)
    bad += 1
  } else if (split.length === 0) {
    console.log(`  ✗ 三、${wedded.length} 世里没有一世「哥的好感高、嫂子的低」——两条边像是一条。`)
    bad += 1
  } else console.log(`  ✓ 三、${rows.length} 世嫂子的脸色都从性情里出；${split.length} 世哥跟你好、嫂子跟你不对付。`)
}

// 四、关系变化只来自具体的事
{
  const lent = borrowed.filter((l) => l.lent === true)
  const refused = borrowed.filter((l) => l.lent === false)
  const lentWrong = lent.filter((l) => !(l.brotherAfterBorrow! > l.brotherBeforeBorrow!))
  const refusedWrong = refused.filter((l) => !(l.brotherAfterBorrow! < l.brotherBeforeBorrow!))
  // 年节走动一格不改——查的是那一卷本身：同一步里年表能连着抽到守孝（+4），动态量分不开是谁动的
  const newyearScene = lifeScenes['kindred:newyear']
  const newyearTouches = Object.values(newyearScene?.nodes ?? {}).flatMap((node) =>
    effectsOf(node).filter((one) => one.type === 'meet' || one.type === 'relation'),
  )
  if (lent.length < BORROWS_WANTED / 2 || refused.length < BORROWS_WANTED / 2) {
    console.log(`  ✗ 四、借粮掷不够：借了 ${lent.length} 世，没借 ${refused.length} 世，两条路各要 ${BORROWS_WANTED / 2} 世。`)
    bad += 1
  } else if (lentWrong.length > 0 || refusedWrong.length > 0) {
    console.log(`  ✗ 四、借粮之后好感没朝该动的方向动：借了没升 ${lentWrong.length}，没借没降 ${refusedWrong.length}。`)
    bad += 1
  } else if (!newyearScene || newyearTouches.length > 0) {
    console.log(`  ✗ 四、年节那一卷里有 ${newyearTouches.length} 处在动好感——见面本身不该加分。`)
    bad += 1
  } else console.log(`  ✓ 四、借了粮的 ${lent.length} 世好感升、没借的 ${refused.length} 世降；年节那一卷一格好感也不碰。`)
}

// 五、娘在老屋没了
{
  const wrong = mourned.filter((l) => !l.mournedOk)
  if (mourned.length === 0) {
    console.log(`  ✗ 五、没有一世走到老屋的丧事。`)
    bad += 1
  } else if (wrong.length > 0) {
    console.log(`  ✗ 五、${wrong.length} 世守错了孝：${wrong[0]!.mournNote}`)
    bad += 1
  } else console.log(`  ✓ 五、${mourned.length} 世娘在老屋没了，你回去守孝；守的时候她确实不在了。`)
}

// 六、尺子自检
{
  const rotten = driftOf(40, [{ year: 1, affinity: 40 }, { year: 2, affinity: 39 }, { year: 3, affinity: 38 }])
  const steady = driftOf(40, [{ year: 1, affinity: 40 }, { year: 2, affinity: 40 }])
  const swapped = coldnessWrong([{ temper: '暴躁', cold: false }, { temper: '温和', cold: true }])
  const right = coldnessWrong([{ temper: '暴躁', cold: true }, { temper: '温和', cold: false }])
  if (rotten !== 2 || steady !== 0 || swapped !== 2 || right !== 0) {
    console.log(`  ✗ 六、尺子自检：腐烂的边抓到 ${rotten}/2，稳的边误抓 ${steady}，性情对调抓到 ${swapped}/2，对的误抓 ${right}。`)
    bad += 1
  } else console.log(`  ✓ 六、尺子自检：腐烂的边抓得到、稳的边放得过；性情对调当场红。`)
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  家拆成两户，关系没有自己烂掉：变的只来自具体的事。哥跟你好，嫂子未必——那是两条边。\n')
}
