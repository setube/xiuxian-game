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
 *   六、嫂子跟你娘——全库第一条 NPC↔NPC 的边：娶亲那天牵在她们两个之间（不从「我」出发）；
 *       处法从两个人的性情里出，同样的性情永远同样的处法；那条边上的事一格也不动你的好感；
 *       为镯子翻脸只翻处得来的，翻完是不睦；娘没了的时候谁在跟前，跟那条边对得上
 *   七、第一笔债——匀了粮就记一笔（谁欠谁、欠什么），没借的没有；还了就销，还不上就一直欠着；
 *       欠着的那些年正月里那句「谁也没提」有，销了就没有
 *   八、老屋的营生——种地的还的是粮、看收成；开铺子的折银子、看粮价。`House.livelihood` 的第一个读者
 *   九、尺子自检：把「不见面不减分」喂一条腐烂的边，第一条得红；把性情对调，第三条、第六条得红
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
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString } from '../src/engine/interpolate'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { makePerson, usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Temper, Terms } from '../src/types/game'
import { beOf } from './origin'
import { effectsOf } from './refs'

const LIVES = 240
const CAP = 5000
/** 走到分家（自己分出去）的世数，掷到够数为止 */
const DIVIDES_WANTED = 24
/** 走到借粮的世数：荒年得撞上分家之后，稀。两条路各要有人走 */
const BORROWS_WANTED = 4

const COLD: readonly Temper[] = ['暴躁', '刚硬']

/** 婆媳的处法从性情里出。跟 `life/kindred.ts` 娶亲那一卷的分流一个字不差 */
function termsFor(wife: Temper, mother: Temper): Terms {
  if (COLD.includes(wife) && COLD.includes(mother)) return '不睦'
  if (wife === '温和' || mother === '温和') return '亲厚'
  return '平常'
}

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
  /** 娶亲那天嫂子跟娘之间的边：从谁出发、处法、两个人的性情 */
  inlaws: { from: string | null; terms: Terms | null; wife: Temper; mother: Temper } | null
  /** 娶亲那一步前后，你跟娘的好感 */
  motherAcrossWedding: { before: number | null; after: number | null } | null
  quarrel: { before: Terms | null; after: Terms | null } | null
  mourningLine: { line: 'fond' | 'sour' | 'none'; terms: Terms | null } | null
  iouAfterLend: boolean | null
  iouAfterRefuse: boolean | null
  repaid: { kind: '粮' | '银子'; back: boolean; settled: boolean; oldLivelihood: string } | null
  debtLineRight: number
  debtLineWrong: number
}

/** 「不见面不减分」：没事发生的那些年好感有没有动。写成函数，是为了自检能喂坏数据 */
function driftOf(
  base: number | null,
  quiet: readonly { year: number; affinity: number }[],
): number {
  if (base === null) return 0
  return quiet.filter((q) => q.affinity !== base).length
}

/** 嫂子的脸色是不是从性情里出的。写成函数，是为了自检能把性情对调 */
function coldnessWrong(rows: readonly { temper: Temper; cold: boolean }[]): number {
  return rows.filter((r) => COLD.includes(r.temper) !== r.cold).length
}

/** 这一册的卷。`apart.ts` 把 kindred:wedding 与 kindred:nephew 领人进门那两处移交到这儿 */
const KINDRED_SCENES = [
  'kindred:wedding',
  'kindred:nephew',
  'kindred:newyear',
  'kindred:borrow',
  'kindred:mourning',
] as const

function live(): Lived {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
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
    inlaws: null,
    motherAcrossWedding: null,
    quarrel: null,
    mourningLine: null,
    iouAfterLend: null,
    iouAfterRefuse: null,
    repaid: null,
    debtLineRight: 0,
    debtLineWrong: 0,
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
    const motherBefore = people.known['mother']?.affinity ?? null
    const termsBefore = people.termsBetween('brother-wife', 'mother') ?? null

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
    if (
      out.wifeHouse === null &&
      people.personOf('brother-wife') &&
      people.isAlive('brother-wife')
    ) {
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
    if (
      out.wifeCold === null &&
      fresh.some((l) => l.includes('没说几句话') || l.includes('留你吃了晚饭'))
    ) {
      out.wifeCold = fresh.some((l) => l.includes('没说几句话'))
    }
    // 六、嫂子跟娘那条边
    if (out.inlaws === null && fresh.some((l) => l.includes('喜酒'))) {
      const wife = people.personOf('brother-wife')
      const mother = people.personOf('mother')
      if (wife && mother && people.isAlive('mother')) {
        const edge = people.relations.find(
          (r) => r.to === 'mother' && r.from !== 'me' && r.until === null && r.terms !== undefined,
        )
        out.inlaws = {
          from: edge?.from ?? null,
          terms: edge?.terms ?? null,
          wife: wife.temper,
          mother: mother.temper,
        }
        out.motherAcrossWedding = { before: motherBefore, after: people.known['mother']?.affinity ?? null }
      }
    }
    if (out.quarrel === null && fresh.some((l) => l.includes('翻了脸'))) {
      out.quarrel = { before: termsBefore, after: people.termsBetween('brother-wife', 'mother') ?? null }
    }
    if (out.mourningLine === null && fresh.some((l) => l.includes('老屋捎话来，娘没了'))) {
      const line = fresh.some((l) => l.includes('是嫂子在跟前'))
        ? 'fond'
        : fresh.some((l) => l.includes('饭是自己烧的'))
          ? 'sour'
          : 'none'
      out.mourningLine = { line, terms: people.termsBetween('brother-wife', 'mother') ?? null }
    }

    // 七、债
    const owes = (): boolean =>
      people.ious.some((one) => one.debtor === 'brother' && one.creditor === 'me' && one.settled === null)
    if (chose === 'kindred:borrow#open:lend') out.iouAfterLend = owes()
    if (chose === 'kindred:borrow#open:refuse') out.iouAfterRefuse = owes()
    if (out.repaid === null) {
      const grainBack = fresh.some((l) => l.includes('把粮送了回来'))
      const silverBack = fresh.some((l) => l.includes('折了银子送来'))
      const grainShort = fresh.some((l) => l.includes('秋后他没来'))
      const silverShort = fresh.some((l) => l.includes('年底他没来'))
      if (grainBack || silverBack || grainShort || silverShort) {
        out.repaid = {
          kind: grainBack || grainShort ? '粮' : '银子',
          back: grainBack || silverBack,
          settled: !owes(),
          oldLivelihood: people.houses['old-home']?.livelihood ?? '（无）',
        }
      }
    }
    if (fresh.some((l) => l.includes('正月里你回了一趟老屋'))) {
      const said = fresh.some((l) => l.includes('那笔粮，谁也没提'))
      if (said === owes()) out.debtLineRight += 1
      else out.debtLineWrong += 1
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
// 六到八不靠随机掷到（见下面「摆好的局」），所以这儿只等分家和借粮两条路够数
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
    console.log(
      `  ✗ 一、${drifted.length} 世哥那条边在没事发生的年里自己动了：分家时 ${one.brotherAtDivide}，后来 ${one.quietYears.map((q) => q.affinity).join('/')}`,
    )
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
  const grew = newyears.filter(
    (l) => l.nephewAges.length >= 2 && l.nephewAges[l.nephewAges.length - 1]! > l.nephewAges[0]!,
  )
  // 「躲到嫂子身后」的得是会走路的孩子：一个月大的娃不会躲（头一版这一句落的正是「已经一个月了」）
  const toddling = newyears.filter((l) => l.nephewAges.some((age) => age < 2))
  const sample = newyears[0]?.newyearLines[0] ?? ''
  if (sample) console.log(`  年节那一句落纸：${sample}`)
  if (wedded.length === 0 || nephews.length === 0) {
    console.log(`  ✗ 二、老屋没添人：娶亲 ${wedded.length} 世，添丁 ${nephews.length} 世。`)
    bad += 1
  } else if (wrongHouse.length > 0) {
    console.log(
      `  ✗ 二、${wrongHouse.length} 世嫂子或侄儿进错了户：${wrongHouse[0]!.wifeHouse} / ${wrongHouse[0]!.nephewHouse}`,
    )
    bad += 1
  } else if (rawToken.length > 0) {
    console.log(`  ✗ 二、年节那句里有没落的记号：${rawToken[0]!.newyearLines[0]}`)
    bad += 1
  } else if (grew.length === 0) {
    console.log(
      `  ✗ 二、没有一世里侄儿在两次年节之间长了岁数（走到两次年节的 ${newyears.filter((l) => l.nephewAges.length >= 2).length} 世）。`,
    )
    bad += 1
  } else if (toddling.length > 0) {
    console.log(`  ✗ 二、${toddling.length} 世年节那句里躲到嫂子身后的侄儿还不到两岁。`)
    bad += 1
  } else
    console.log(
      `  ✓ 二、嫂子、侄儿都住在老屋；${grew.length} 世侄儿在两次年节之间长了岁数，那一句落的是中文岁数，而且是会走路的岁数。`,
    )
}

// 三、两条边各是各的；脸色从性情里出
{
  const rows = wedded
    .filter((l) => l.wifeTemper !== null && l.wifeCold !== null)
    .map((l) => ({ temper: l.wifeTemper!, cold: l.wifeCold! }))
  const split = wedded.filter(
    (l) =>
      l.brotherAffinity !== null &&
      l.wifeAffinity !== null &&
      l.brotherAffinity > 30 &&
      l.wifeAffinity < 0,
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
  } else
    console.log(
      `  ✓ 三、${rows.length} 世嫂子的脸色都从性情里出；${split.length} 世哥跟你好、嫂子跟你不对付。`,
    )
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
    console.log(
      `  ✗ 四、借粮掷不够：借了 ${lent.length} 世，没借 ${refused.length} 世，两条路各要 ${BORROWS_WANTED / 2} 世。`,
    )
    bad += 1
  } else if (lentWrong.length > 0 || refusedWrong.length > 0) {
    console.log(
      `  ✗ 四、借粮之后好感没朝该动的方向动：借了没升 ${lentWrong.length}，没借没降 ${refusedWrong.length}。`,
    )
    bad += 1
  } else if (!newyearScene || newyearTouches.length > 0) {
    console.log(`  ✗ 四、年节那一卷里有 ${newyearTouches.length} 处在动好感——见面本身不该加分。`)
    bad += 1
  } else
    console.log(
      `  ✓ 四、借了粮的 ${lent.length} 世好感升、没借的 ${refused.length} 世降；年节那一卷一格好感也不碰。`,
    )
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

/**
 * ## 六到八是摆好的局，不是随机掷到的
 *
 * 六到八问的是「这一处效果落下去，世界对不对」，不是「随机人生走不走得到」——走不走得到
 * 归上面五条和各支的覆盖率。随机掷到「分了家、哥娶了亲、娘还在、荒年、又到了还粮那一年」
 * 要几千世（头一版这一支为此跑了十分钟没跑完），而一局摆好只要几毫秒。所以照 `apart.ts`
 * 的法子：出生、推到二十岁、分家，然后把库里那一卷一节一节演下去（`play`）——
 * 条件用真的 `meetsAll` 判、正文用真的 `fillString` 落、效果用真的 `applyEffects` 结。
 * 随机人生里也走到了几世，只报数，不作判据。
 */
type PeopleStore = ReturnType<typeof usePeopleStore>
type WorldStore = ReturnType<typeof useWorldStore>
type HouseholdStore = ReturnType<typeof useHouseholdStore>

const CALM = { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }

/** 把库里的一卷一节一节演下去。有选项的节按 `choiceId` 选，没写就选第一个 */
function play(sceneId: string, choiceId?: string): string[] {
  const scene = lifeScenes[sceneId]
  if (!scene) return []
  const texts: string[] = []
  let node = scene.nodes[scene.entry]
  for (let step = 0; step < 32 && node; step += 1) {
    applyEffects(node.onEnter)
    for (const block of node.blocks) {
      if ('text' in block && block.text) texts.push(fillString(block.text))
    }
    for (const one of node.seen ?? []) if (meetsAll(one.requires)) texts.push(fillString(one.text))
    if (node.choices && node.choices.length > 0) {
      const choice = node.choices.find((one) => one.id === choiceId) ?? node.choices[0]!
      applyEffects(choice.effects)
      if (!choice.next) break
      node = scene.nodes[choice.next.replace(/^.*#/, '')]
      continue
    }
    const target = node.branches?.find((one) => meetsAll(one.requires))?.next ?? node.next
    if (!target) break
    node = scene.nodes[target.replace(/^.*#/, '')]
  }
  return texts
}

interface Staged {
  people: PeopleStore
  world: WorldStore
  household: HouseholdStore
}

/** 生在一个有哥、娘还在的人家，推到二十岁，分家。掷不出来就 null */
function stage(origin: 'farm' | 'cloth'): Staged | null {
  for (let tries = 0; tries < 600; tries += 1) {
    setActivePinia(createPinia())
    const household = useHouseholdStore()
    const world = useWorldStore()
    const people = usePeopleStore()
    // 出身要在角色 store 建起来之前定：出生（立人、立户）发生在 `useCharacterStore()` 那一刻，
    // 之后再 `beOf` 只改得了家境四格，改不了已经立起来的户——头一版摆出来的「布庄人家」老屋在种地
    beOf(origin)
    useCharacterStore()
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    if (!people.isAlive('brother') || !people.isAlive('mother')) continue
    world.regions = { [household.prefecture]: { state: { ...CALM }, last: {} } }
    applyEffects([{ type: 'time', years: 20 }])
    if (!people.isAlive('brother') || !people.isAlive('mother')) continue
    applyEffects([{ type: 'divide', leaves: 'me' }])
    if (!people.houses['old-home']) continue
    return { people, world, household }
  }
  return null
}

function weather(s: Staged, patch: Partial<typeof CALM>): void {
  s.world.regions = { [s.household.prefecture]: { state: { ...CALM, ...patch }, last: {} } }
}

/** 让嫂子先在老屋里，性情由这一局定——娶亲那一卷的 `meet` 见到已有的人就不再造 */
function marryIn(s: Staged, temper: Temper): void {
  s.people.enroll(
    makePerson({
      id: 'brother-wife',
      surname: '吴',
      given: '氏',
      gender: '女',
      bornYear: s.world.time.year - 19,
      temper,
      doing: '操持家务',
      place: s.people.personOf('brother')?.place ?? s.household.home,
    }),
  )
  s.people.joinHouse('old-home', 'brother-wife')
}

// 六、嫂子跟娘：第一条 NPC↔NPC 的边
{
  const combos: readonly { wife: Temper; mother: Temper; quarrel: boolean }[] = [
    { wife: '暴躁', mother: '刚硬', quarrel: false },
    { wife: '刚硬', mother: '暴躁', quarrel: false },
    { wife: '温和', mother: '暴躁', quarrel: false },
    { wife: '暴躁', mother: '温和', quarrel: true },
    { wife: '谨慎', mother: '木讷', quarrel: true },
    { wife: '精明', mother: '谨慎', quarrel: false },
  ]
  const quarrelEvent = lifeEvents.find((one) => one.id === 'kindred-quarrel')
  const wrong: string[] = []
  const seen: string[] = []
  for (const combo of combos) {
    const s = stage('farm')
    if (!s) {
      wrong.push('掷不出一个有哥、娘还在的农户家')
      break
    }
    s.people.amend('mother', { temper: combo.mother })
    marryIn(s, combo.wife)
    const mineBefore = s.people.known['mother']?.affinity ?? null
    play('kindred:wedding')
    const edge = s.people.relations.find(
      (r) => r.from === 'brother-wife' && r.to === 'mother' && r.until === null,
    )
    const want = termsFor(combo.wife, combo.mother)
    const label = `嫂子${combo.wife}、娘${combo.mother}`
    if (!edge) wrong.push(`${label}：娶亲之后嫂子跟娘之间没有边`)
    else if (edge.terms !== want) wrong.push(`${label}：边上写的是 ${edge.terms}，该是 ${want}`)
    if ((s.people.known['mother']?.affinity ?? null) !== mineBefore) {
      wrong.push(`${label}：牵那条边动了你跟娘的好感`)
    }
    const fromMe = s.people.relations.some((r) => r.from === 'me' && r.to === 'mother' && r.terms !== undefined)
    if (fromMe) wrong.push(`${label}：处法写到了从「我」出发的边上`)
    const canQuarrel = quarrelEvent !== undefined && meetsAll(quarrelEvent.requires)
    if (canQuarrel !== (want !== '不睦')) {
      wrong.push(`${label}：翻脸那一卷${canQuarrel ? '开着' : '关着'}，可她们${want}`)
    }
    if (combo.quarrel && canQuarrel) {
      const wifeBefore = s.people.known['brother-wife']?.affinity ?? null
      const motherBefore = s.people.known['mother']?.affinity ?? null
      play('kindred:quarrel')
      if (s.people.termsBetween('brother-wife', 'mother') !== '不睦') wrong.push(`${label}：翻了脸边上还不是不睦`)
      if ((s.people.known['brother-wife']?.affinity ?? null) !== wifeBefore) wrong.push(`${label}：翻脸动了你跟嫂子的好感`)
      if ((s.people.known['mother']?.affinity ?? null) !== motherBefore) wrong.push(`${label}：翻脸动了你跟娘的好感`)
    }
    // 娘没了：谁在跟前，看那条边
    s.people.amend('mother', { fate: '殁' })
    const lines = play('kindred:mourning')
    const terms = s.people.termsBetween('brother-wife', 'mother')
    const fond = lines.some((l) => l.includes('是嫂子在跟前'))
    const sour = lines.some((l) => l.includes('饭是自己烧的'))
    if (terms === '亲厚' && !fond) wrong.push(`${label}：亲厚，娘没了那句却没说是嫂子在跟前`)
    if (terms === '不睦' && !sour) wrong.push(`${label}：不睦，娘没了那句却没说饭是自己烧的`)
    if (terms === '平常' && (fond || sour)) wrong.push(`${label}：平常，娘没了那句却偏了一头`)
    seen.push(`${label}→${want}${combo.quarrel && canQuarrel ? '→翻脸' : ''}`)
  }
  const randomly = divided.filter((l) => l.inlaws !== null).length
  if (wrong.length > 0) {
    console.log(`  ✗ 六、嫂子跟娘那条边：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 六、${combos.length} 种性情组合摆下去，嫂子跟娘之间都牵了边、处法都从性情里出、一格没动你的好感；` +
        `翻脸只翻处得来的，翻完不睦；娘没了谁在跟前跟那条边对得上。（随机人生里也走到 ${randomly} 世）`,
    )
    console.log(`      ${seen.join('；')}`)
  }
}

// 七、第一笔债
{
  const wrong: string[] = []
  const owes = (s: Staged): boolean =>
    s.people.ious.some((one) => one.debtor === 'brother' && one.creditor === 'me' && one.settled === null)
  const owedCondition = (s: Staged): boolean => meetsAll([{ owed: { debtor: 'brother', creditor: 'me', settled: false } }])
  void owedCondition
  // 没借：没有债
  {
    const s = stage('farm')
    if (!s) wrong.push('掷不出局')
    else {
      play('kindred:borrow', 'refuse')
      if (s.people.ious.length !== 0) wrong.push('没借却记了一笔债')
    }
  }
  // 借了，收成好：还了
  {
    const s = stage('farm')
    if (!s) wrong.push('掷不出局')
    else {
      play('kindred:borrow', 'lend')
      const iou = s.people.ious[0]
      if (!iou || iou.debtor !== 'brother' || iou.creditor !== 'me' || iou.settled !== null) {
        wrong.push('匀了粮没记下「哥欠你」这一笔')
      } else if (!iou.what.includes('粮') || !iou.terms) wrong.push(`债上写的是「${iou.what}」「${iou.terms}」`)
      if (!meetsAll([{ owed: { debtor: 'brother', creditor: 'me', settled: false } }])) wrong.push('债记了，条件却问不到')
      weather(s, { harvest: 72 })
      const lines = play('kindred:repay')
      if (!lines.some((l) => l.includes('把粮送了回来'))) wrong.push(`收成好，还粮那一卷却说：${lines[0] ?? '（空）'}`)
      if (owes(s)) wrong.push('正文说还了，债簿上还欠着')
      if (s.people.ious[0]?.settled === null) wrong.push('还清了没记哪一年')
    }
  }
  // 借了，收成差：一直欠着；正月里谁也不提；后来还了就不提了
  {
    const s = stage('farm')
    if (!s) wrong.push('掷不出局')
    else {
      play('kindred:borrow', 'lend')
      weather(s, { harvest: 28 })
      const lines = play('kindred:repay')
      if (!lines.some((l) => l.includes('秋后他没来'))) wrong.push(`收成差，还粮那一卷却说：${lines[0] ?? '（空）'}`)
      if (!owes(s)) wrong.push('正文说没还，债簿上却销了')
      marryIn(s, '温和')
      play('kindred:nephew')
      applyEffects([{ type: 'time', years: 3 }])
      const newyear = play('kindred:newyear')
      if (!newyear.some((l) => l.includes('那笔粮，谁也没提'))) wrong.push('欠着粮，正月里那句「谁也没提」没出来')
      weather(s, { harvest: 72 })
      play('kindred:repay')
      if (owes(s)) wrong.push('第二年收成好了还没还')
      const later = play('kindred:newyear')
      if (later.some((l) => l.includes('那笔粮，谁也没提'))) wrong.push('还清了，正月里还在说「谁也没提」')
    }
  }
  const randomly = divided.filter((l) => l.iouAfterLend !== null).length
  if (wrong.length > 0) {
    console.log(`  ✗ 七、第一笔债：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 七、匀了粮就记一笔「哥欠你半年的粮，开春还」，没借的没有；收成好了销、差了一直欠着；` +
        `欠着的正月里「谁也没提」，销了就不提。（随机人生里也走到 ${randomly} 世）`,
    )
  }
}

// 八、老屋的营生
{
  const wrong: string[] = []
  const s = stage('cloth')
  if (!s) wrong.push('掷不出一个有哥、娘还在的布庄人家')
  else {
    const old = s.people.houses['old-home']
    if (old?.livelihood !== '经商') wrong.push(`布庄人家分家，老屋的营生是 ${old?.livelihood}`)
    play('kindred:borrow', 'lend')
    weather(s, { grain: 140 })
    const short = play('kindred:repay')
    if (!short.some((l) => l.includes('年底他没来'))) wrong.push(`粮价高，铺子那边还粮那一卷却说：${short[0] ?? '（空）'}`)
    weather(s, { grain: 100 })
    const back = play('kindred:repay')
    if (!back.some((l) => l.includes('折了银子送来'))) wrong.push(`粮价落了，铺子那边还粮那一卷却说：${back[0] ?? '（空）'}`)
    if (s.people.ious.some((one) => one.settled === null)) wrong.push('折了银子送来，债簿上还欠着')
  }
  const randomly = divided.filter((l) => l.repaid !== null).length
  if (wrong.length > 0) {
    console.log(`  ✗ 八、老屋的营生：${wrong[0]}`)
    bad += 1
  } else {
    console.log(
      `  ✓ 八、还粮那一卷读了老屋的营生：种地的还粮、看收成；开铺子的折银子、看粮价。（随机人生里也走到 ${randomly} 世）`,
    )
  }
}

// 九、尺子自检
{
  const rotten = driftOf(40, [
    { year: 1, affinity: 40 },
    { year: 2, affinity: 39 },
    { year: 3, affinity: 38 },
  ])
  const steady = driftOf(40, [
    { year: 1, affinity: 40 },
    { year: 2, affinity: 40 },
  ])
  const swapped = coldnessWrong([
    { temper: '暴躁', cold: false },
    { temper: '温和', cold: true },
  ])
  const right = coldnessWrong([
    { temper: '暴躁', cold: true },
    { temper: '温和', cold: false },
  ])
  const inlawsRuler =
    termsFor('暴躁', '刚硬') === '不睦' &&
    termsFor('暴躁', '温和') === '亲厚' &&
    termsFor('谨慎', '木讷') === '平常' &&
    termsFor('温和', '暴躁') === '亲厚'
  if (rotten !== 2 || steady !== 0 || swapped !== 2 || right !== 0 || !inlawsRuler) {
    console.log(
      `  ✗ 九、尺子自检：腐烂的边抓到 ${rotten}/2，稳的边误抓 ${steady}，性情对调抓到 ${swapped}/2，对的误抓 ${right}，婆媳那把尺${inlawsRuler ? '对' : '错'}。`,
    )
    bad += 1
  } else console.log(`  ✓ 九、尺子自检：腐烂的边抓得到、稳的边放得过；性情对调当场红；婆媳那把尺四种性情组合都对。`)
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log(
    '  家拆成两户，关系没有自己烂掉：变的只来自具体的事。哥跟你好，嫂子未必；嫂子跟娘怎样，跟你没关系；那笔粮是一笔债，不是一个数。\n',
  )
}
