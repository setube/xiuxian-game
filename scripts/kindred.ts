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
 *   九、侄儿长大——三岁躲、九岁凑过来、十六岁一般高；温和的自己跑来过、长大了跟你亲，木讷的没来过、
 *       长大了客客气气，哥跟你再好也一样：他那条边是他的（代际关系不是静态继承的）
 *   十、第三代——侄儿娶亲、侄孙出生都进老屋、岁数现算；哥没了老屋的当家是侄儿，你跟哥那条边不封口
 *   十一、活世界——翻脸、和好都在你不在场的时候发生（没有正文、不进编年），你只在正月里看见结果
 *   十二、尺子自检：把「不见面不减分」喂一条腐烂的边，第一条得红；把性情对调，第三条、第六条得红
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
import { useStory } from '../src/engine/story'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Livelihood, Temper, Terms } from '../src/types/game'
import { effectsOf } from './refs'
import { type Staged, ageTo, grownUp, marryIn, play, stage, weather } from './lib/staged'

const LIVES = 240
const CAP = 5000
/** 走到分家（自己分出去）的世数，掷到够数为止 */
const DIVIDES_WANTED = 24
/**
 * 借粮两条路各要几世。荒年得撞上分家之后，稀——种子 k7 掷了一千零四十一世（平常三百来世）
 * 才凑够两条路各两世。所以第四条的判据改在摆好的局上量（下面），随机人生里的只报数。
 */
const BORROWS_WANTED = 0

const COLD: readonly Temper[] = ['暴躁', '刚硬']

/** 婆媳的处法从性情里出。跟 `life/kindred.ts` 娶亲那一卷的分流一个字不差 */
function termsFor(wife: Temper, mother: Temper): Terms {
  if (COLD.includes(wife) && COLD.includes(mother)) return '不睦'
  if (wife === '温和' || mother === '温和') return '亲厚'
  return '平常'
}

/**
 * ## 四、六到十一、十三、十四是摆好的局，不是随机掷到的
 *
 * 四、六到十一、十三、十四问的是「这一处效果落下去，世界对不对」，不是「随机人生走不走得到」——走不走得到
 * 归上面五条和各支的覆盖率。随机掷到「分了家、哥娶了亲、娘还在、荒年、又到了还粮那一年」
 * 要几千世（头一版这一支为此跑了十分钟没跑完），而一局摆好只要几毫秒。所以照 `apart.ts`
 * 的法子：出生、推到二十岁、分家，然后把库里那一卷一节一节演下去（`play`）——
 * 条件用真的 `meetsAll` 判、正文用真的 `fillString` 落、效果用真的 `applyEffects` 结。
 * 随机人生里也走到了几世，只报数，不作判据。
 */
// 摆局的工具（`stage` / `play` / `weather` / `ageTo` / `marryIn` / `grownUp`）在 `lib/staged.ts`，`away.ts` 也用它

interface Lived {
  divided: boolean
  /** 分家那一刻哥的好感，和之后每一个「老屋没事发生的年」采到的好感 */
  brotherAtDivide: number | null
  quietYears: { year: number; affinity: number }[]
  wifeHouse: string | null
  nephewHouse: string | null
  nephewAges: number[]
  /** 随机人生里走到了哪几步：侄儿成人、第三代、哥改行——只报数，不作判据 */
  nephewGrown: boolean
  thirdGeneration: boolean
  brotherTurned: boolean
  nephewRestless: boolean
  nephewWent: boolean
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
    nephewGrown: false,
    thirdGeneration: false,
    brotherTurned: false,
    nephewRestless: false,
    nephewWent: false,
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
      if ('text' in item.block) fresh.push(item.block.text)
    }
    return fresh
  }
  drain()
  const KINDRED_TEXT = /老屋|嫂子|侄儿|侄孙|侄媳|正月里|喜酒/
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
    const kindredStep =
      fresh.some((l) => KINDRED_TEXT.test(l)) || chose.startsWith('kindred:') || chose.startsWith('nephew:')
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

    if (!out.nephewGrown && fired('kindred-nephew-grown')) out.nephewGrown = true
    if (!out.thirdGeneration && fired('kindred-grandnephew')) out.thirdGeneration = true
    if (!out.brotherTurned && fired('kindred-brother-turns')) out.brotherTurned = true
    if (!out.nephewRestless && (fired('nephew-restless') || fired('nephew-restless-hungry'))) out.nephewRestless = true
    if (!out.nephewWent && world.hasFlag('nephew-went')) out.nephewWent = true

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
// 四、六到十一、十三、十四不靠随机掷到（见上面「摆好的局」），所以这儿只等分家够数
const enough = (): boolean => lives.filter((l) => l.divided).length >= DIVIDES_WANTED
for (let tries = 0; tries < CAP && !enough(); tries += 1) lives.push(live())
const divided = lives.filter((l) => l.divided)
const wedded = divided.filter((l) => l.wifeHouse !== null)
const nephews = divided.filter((l) => l.nephewHouse !== null)
const newyears = divided.filter((l) => l.newyearLines.length > 0)
const borrowed = divided.filter((l) => l.lent !== null)
const mourned = divided.filter((l) => l.mourned)
console.log(
  `  ${lives.length} 世：分家 ${divided.length}，哥娶亲 ${wedded.length}，添侄儿 ${nephews.length}，` +
    `年节走动 ${newyears.length}，借粮 ${borrowed.length}，守孝 ${mourned.length}，` +
    `侄儿想走 ${divided.filter((l) => l.nephewRestless).length}，走成 ${divided.filter((l) => l.nephewWent).length}`,
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
  // 好感封顶正负一百：顶上再匀粮也升不了，那不是「没升」。另一个会话在种子 1959t641pabs 下撞上的
  const lentWrong = lent.filter(
    (l) =>
      l.brotherAfterBorrow! < l.brotherBeforeBorrow! ||
      (l.brotherBeforeBorrow! < 100 && !(l.brotherAfterBorrow! > l.brotherBeforeBorrow!)),
  )
  const refusedWrong = refused.filter(
    (l) =>
      l.brotherAfterBorrow! > l.brotherBeforeBorrow! ||
      (l.brotherBeforeBorrow! > -100 && !(l.brotherAfterBorrow! < l.brotherBeforeBorrow!)),
  )
  // 年节走动一格不改——查的是那一卷本身：同一步里年表能连着抽到守孝（+4），动态量分不开是谁动的
  const newyearScene = lifeScenes['kindred:newyear']
  const newyearTouches = Object.values(newyearScene?.nodes ?? {}).flatMap((node) =>
    effectsOf(node).filter((one) => one.type === 'meet' || one.type === 'relation'),
  )
  // 借了升、没借降：在摆好的局上量（随机人生里荒年撞上分家太稀）
  const stagedWrong: string[] = []
  for (const choice of ['lend', 'refuse'] as const) {
    const st = stage('farm')
    if (!st) {
      stagedWrong.push('掷不出局')
      continue
    }
    const before = st.people.known['brother']?.affinity ?? 0
    play('kindred:borrow', choice)
    const after = st.people.known['brother']?.affinity ?? 0
    if (choice === 'lend' && !(after > before)) stagedWrong.push(`匀了粮，哥那条边 ${before}→${after}`)
    if (choice === 'refuse' && !(after < before)) stagedWrong.push(`没借，哥那条边 ${before}→${after}`)
  }
  void BORROWS_WANTED
  if (stagedWrong.length > 0) {
    console.log(`  ✗ 四、${stagedWrong[0]}`)
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
      `  ✓ 四、匀了粮哥那条边升、没借的降；年节那一卷一格好感也不碰。（随机人生里借了 ${lent.length} 世、没借 ${refused.length} 世，方向都对）`,
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
    if (!edge) {
      wrong.push(
        `${label}：娶亲之后嫂子跟娘之间没有边（娘${s.people.isAlive('mother') ? '还在' : '不在了'} ${s.people.ageOf('mother')} 岁，` +
          `嫂子${s.people.personOf('brother-wife')?.temper ?? '不在册'}，到娘的边：${s.people.relations
            .filter((r) => r.to === 'mother')
            .map((r) => `${r.from}:${r.bond}:${r.terms ?? ''}`)
            .join(' ')}）`,
      )
    }
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
  const owedCondition = (_s: Staged): boolean => meetsAll([{ owed: { debtor: 'brother', creditor: 'me', settled: false } }])
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

// 九、侄儿长大：代际关系不是静态继承的
{
  const wrong: string[] = []
  const comes = lifeEvents.find((one) => one.id === 'kindred-nephew-comes')
  const grown = lifeEvents.find((one) => one.id === 'kindred-nephew-grown')
  // 一个温和的孩子：三岁躲、九岁凑过来、自己跑来找你、长大了跟你亲
  const s = stage('farm')
  if (!s || !comes || !grown) wrong.push('掷不出局，或者年表上没有侄儿那两卷')
  else {
    marryIn(s, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    s.people.amend('nephew', { temper: '温和' })
    ageTo(s, 'nephew', 3)
    const at3 = play('kindred:newyear')
    if (!at3.some((l) => l.includes('躲到'))) wrong.push(`三岁：${at3.find((l) => l.includes('侄儿')) ?? '（没提侄儿）'}`)
    ageTo(s, 'nephew', 9)
    const at9 = play('kindred:newyear')
    if (!at9.some((l) => l.includes('凑过来'))) wrong.push(`九岁：${at9.find((l) => l.includes('侄儿')) ?? '（没提侄儿）'}`)
    if (at9.some((l) => l.includes('躲到'))) wrong.push('九岁还躲在嫂子身后')
    if (!meetsAll(comes.requires)) wrong.push('九岁、温和，「侄儿来了」那一卷却关着')
    const brotherBefore = s.people.known['brother']?.affinity ?? null
    const nephewBefore = s.people.known['nephew']?.affinity ?? 0
    play('kindred:nephew-comes')
    if ((s.people.known['nephew']?.affinity ?? 0) <= nephewBefore) wrong.push('他自己跑来了，他那条边没动')
    if ((s.people.known['brother']?.affinity ?? null) !== brotherBefore) wrong.push('侄儿来了，动的却是哥那条边')
    ageTo(s, 'nephew', 16)
    const at16 = play('kindred:newyear')
    if (!at16.some((l) => l.includes('一般高'))) wrong.push(`十六岁：${at16.find((l) => l.includes('侄儿')) ?? '（没提侄儿）'}`)
    if (!meetsAll(grown.requires)) wrong.push('十六岁，「侄儿成人」那一卷却关着')
    const lines = play('kindred:nephew-grown')
    if (!lines.some((l) => l.includes('像小时候那样'))) wrong.push(`小时候来过的，长大了却：${lines[lines.length - 1]}`)
    if (!(s.people.personOf('nephew')?.doing ?? '').includes('种地')) wrong.push(`农户老屋的侄儿成人了，手上的活是「${s.people.personOf('nephew')?.doing}」`)
  }
  // 一个木讷的孩子：不会自己跑来；长大了对你客客气气——哥跟你再好也一样
  const t = stage('farm')
  if (!t || !comes) wrong.push('掷不出第二局')
  else {
    marryIn(t, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    t.people.amend('nephew', { temper: '木讷' })
    ageTo(t, 'nephew', 9)
    if (meetsAll(comes.requires)) wrong.push('木讷的孩子九岁也「自己跑来」了')
    t.people.meet('brother', '哥', 30) // 哥跟你好
    const nephewBefore = t.people.known['nephew']?.affinity ?? 0
    ageTo(t, 'nephew', 16)
    const lines = play('kindred:nephew-grown')
    if (!lines.some((l) => l.includes('客客气气'))) wrong.push(`没来过的，长大了却：${lines[lines.length - 1]}`)
    if ((t.people.known['nephew']?.affinity ?? 0) !== nephewBefore) wrong.push('客客气气的那一支动了他那条边')
    const brother = t.people.known['brother']?.affinity ?? 0
    const nephew = t.people.known['nephew']?.affinity ?? 0
    if (!(brother > nephew)) wrong.push(`哥跟你好（${brother}）该压过侄儿（${nephew}）`)
  }
  const randomly = divided.filter((l) => l.nephewGrown).length
  if (wrong.length > 0) {
    console.log(`  ✗ 九、侄儿长大：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 九、侄儿三岁躲、九岁凑过来、十六岁一般高；温和的自己跑来过、长大了跟你亲，木讷的没来过、长大了客客气气——` +
        `哥跟你再好也一样，他那条边是他的。（随机人生里侄儿成人的 ${randomly} 世）`,
    )
  }
}

// 十、第三代
{
  const wrong: string[] = []
  const s = stage('farm')
  if (!s) wrong.push('掷不出局')
  else {
    marryIn(s, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    ageTo(s, 'nephew', 19)
    const weds = lifeEvents.find((one) => one.id === 'kindred-nephew-weds')
    if (!weds || !meetsAll(weds.requires)) wrong.push('侄儿十九了，娶亲那一卷却关着')
    play('kindred:nephew-weds')
    ageTo(s, 'nephew', 20)
    if (s.people.houseOf('nephew-wife')?.id !== 'old-home') wrong.push(`侄媳妇进的是 ${s.people.houseOf('nephew-wife')?.id ?? '（无）'}`)
    const born = lifeEvents.find((one) => one.id === 'kindred-grandnephew')
    if (!born || !meetsAll(born.requires)) wrong.push('侄媳妇进了门，添丁那一卷却关着')
    const lines = play('kindred:grandnephew')
    if (s.people.houseOf('grandnephew')?.id !== 'old-home') wrong.push(`侄孙进的是 ${s.people.houseOf('grandnephew')?.id ?? '（无）'}`)
    if (!lines.some((l) => l.includes('手都不知道往哪儿放'))) wrong.push('哥还在，添丁那句却没提他')
    ageTo(s, 'grandnephew', 3)
    if (s.people.ageOf('grandnephew') !== 3) wrong.push(`侄孙三年后 ${s.people.ageOf('grandnephew')} 岁`)
    // 爹还在的话先送走爹：老屋的当家换成哥（成年的儿子），那是他殁那一刻的事
    if (s.people.isAlive('father')) {
      applyEffects([{ type: 'person', id: 'father', fate: '殁' }])
      if (s.people.houses['old-home']?.head !== 'brother') wrong.push(`爹没了，老屋的当家是 ${s.people.houses['old-home']?.head}`)
    }
    // 哥没了：老屋的当家换成侄儿，那是他殁那一刻的事；你跟哥那条边不封口
    applyEffects([{ type: 'person', id: 'brother', fate: '殁' }])
    // 谁该当家：没分出去、还住在老屋的成年弟弟（兄终弟及）压过侄儿；没有这样的弟弟才是侄儿
    const old = s.people.houses['old-home']
    const uncle = s.people
      .kinOf('弟')
      .find((id) => s.people.isAlive(id) && s.people.ageOf(id) >= 16 && (old?.members ?? []).includes(id))
    const heir = uncle ?? 'nephew'
    if (old?.head !== heir) wrong.push(`哥没了，老屋的当家该是 ${heir}，是 ${old?.head}`)
    if (s.people.houses['old-home']?.members.includes('brother')) wrong.push('哥没了还在老屋的户里')
    const edge = s.people.relations.find((r) => r.from === 'me' && r.to === 'brother' && r.bond === '兄')
    if (!edge || edge.until !== null) wrong.push('哥没了，「他是你哥」那条边被封了口')
    const gone = lifeEvents.find((one) => one.id === 'kindred-brother-gone')
    if (!gone || !meetsAll(gone.requires)) wrong.push('哥没了，丧事那一卷却关着')
    const mourning = play('kindred:brother-gone')
    if (!mourning.some((l) => l.includes('当家'))) wrong.push(`哥没了那一卷没说谁当家：${mourning[mourning.length - 1]}`)
    if (uncle && !mourning.some((l) => l.includes('轮不到他'))) wrong.push('弟弟当了家，那一卷却说是侄儿')
    if (!uncle && mourning.some((l) => l.includes('轮不到他'))) wrong.push('侄儿当了家，那一卷却说是弟弟')
    // 哥没了照样走动：送你到巷口的是侄儿
    const after = play('kindred:newyear')
    if (!after.some((l) => l.includes('送你到巷口') && l.includes('叔'))) wrong.push('哥没了，正月里送你到巷口的不是侄儿')
  }
  const randomly = divided.filter((l) => l.thirdGeneration).length
  if (wrong.length > 0) {
    console.log(`  ✗ 十、第三代：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 十、侄儿娶亲、侄孙出生都进老屋、岁数现算；哥没了老屋的当家是侄儿，你跟哥那条边不封口，正月里送你到巷口的换成侄儿。（随机人生里到第三代的 ${randomly} 世）`,
    )
  }
}

// 十一、活世界：老屋里的事发生的时候你不在场
{
  const wrong: string[] = []
  for (const id of ['kindred:quarrel', 'kindred:mend']) {
    const scene = lifeScenes[id]
    const spoken = Object.values(scene?.nodes ?? {}).some((node) => node.blocks.length > 0 || (node.seen?.length ?? 0) > 0)
    if (!scene) wrong.push(`库里没有 ${id}`)
    else if (spoken) wrong.push(`${id} 有正文——你不在场的事不该有你读到的话`)
    else if (Object.values(scene.nodes).some((node) => effectsOf(node).some((e) => e.type === 'chronicle'))) {
      wrong.push(`${id} 记了编年——你不在场的事不该进你的编年`)
    }
  }
  // 赶上了那一回：哥送你到巷口说了缘由
  const s = stage('farm')
  if (!s) wrong.push('掷不出局')
  else {
    s.people.amend('mother', { temper: '温和' })
    marryIn(s, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    ageTo(s, 'nephew', 3)
    const chronicleBefore = s.world.chronicle.length
    const quarrel = play('kindred:quarrel')
    if (quarrel.length > 0) wrong.push('翻脸那一卷落了正文')
    if (s.world.chronicle.length !== chronicleBefore) wrong.push('翻脸那一卷进了编年')
    if (s.people.termsBetween('brother-wife', 'mother') !== '不睦') wrong.push('翻了脸，边上不是不睦')
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('没说一句话'))) wrong.push('翻了脸，正月里那顿饭却有人说话')
    if (!visit.some((l) => l.includes('镯子'))) wrong.push('赶上了那一回，哥却没说镯子的事')
    const again = play('kindred:newyear')
    if (again.some((l) => l.includes('镯子'))) wrong.push('镯子的事说了两回')
    if (again.some((l) => l.includes('你不知道为了什么'))) wrong.push('知道了缘由还说不知道')
  }
  // 没赶上：一辈子不知道为了什么；后来她们和好了，你也只看见结果
  const t = stage('farm')
  if (!t) wrong.push('掷不出第二局')
  else {
    t.people.amend('mother', { temper: '温和' })
    marryIn(t, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    ageTo(t, 'nephew', 3)
    play('kindred:quarrel')
    const mend = lifeEvents.find((one) => one.id === 'kindred-mend')
    // 娘还不到五十五：和好那一卷关着；把她的生年往前挪，就开了
    if (!mend) wrong.push('年表上没有和好那一卷')
    else {
      const mother = t.people.personOf('mother')
      if (mother && t.people.ageOf('mother') < 55) {
        if (meetsAll(mend.requires)) wrong.push('娘还没老，和好那一卷就开了')
        t.people.amend('mother', { bornYear: mother.bornYear - (56 - t.people.ageOf('mother')) })
      }
      if (!meetsAll(mend.requires)) wrong.push('婆媳不睦、娘老了，和好那一卷却关着')
      const chronicleBefore = t.world.chronicle.length
      const lines = play('kindred:mend')
      if (lines.length > 0 || t.world.chronicle.length !== chronicleBefore) wrong.push('和好那一卷落了正文或进了编年')
      if (t.people.termsBetween('brother-wife', 'mother') !== '亲厚') wrong.push('和好了，边上不是亲厚')
      const visit = play('kindred:newyear')
      if (!visit.some((l) => l.includes('添饭'))) wrong.push('和好了，正月里却没看见嫂子给娘添饭')
      if (!visit.some((l) => l.includes('什么时候和好的，你不知道'))) wrong.push('没赶上翻脸也没赶上和好，正月里却像什么都知道')
      if (visit.some((l) => l.includes('镯子'))) wrong.push('没人跟你说过镯子，你却知道')
    }
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 十一、活世界：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 十一、翻脸、和好都在你不在场的时候发生（没有正文、不进编年）；你只在正月里看见结果——赶上那一回才知道缘由，没赶上的一辈子不知道。`,
    )
  }
}

// 十二、尺子自检
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
      `  ✗ 十二、尺子自检：腐烂的边抓到 ${rotten}/2，稳的边误抓 ${steady}，性情对调抓到 ${swapped}/2，对的误抓 ${right}，婆媳那把尺${inlawsRuler ? '对' : '错'}。`,
    )
    bad += 1
  } else console.log(`  ✓ 十二、尺子自检：腐烂的边抓得到、稳的边放得过；性情对调当场红；婆媳那把尺四种性情组合都对。`)
}

// 十三、哥改行：户的营生 ≠ 人的营生；离家做工 ≠ 离户
{
  const wrong: string[] = []
  /** 这一局老屋谁当家（爹在是爹，不在是哥）——写进报数那行字，红了好知道采到的是哪一种局 */
  let whoRuns = '（没摆到）'
  const turns = lifeEvents.find((one) => one.id === 'kindred-brother-turns')
  /** 分了家、哥娶了亲、侄儿十七岁——哥能把地交给他的那一天 */
  const setUp = (): Staged | null => {
    const st = stage('farm')
    if (!st) return null
    marryIn(st, '温和')
    play('kindred:wedding')
    play('kindred:nephew')
    ageTo(st, 'nephew', 17)
    return st
  }
  const s = setUp()
  if (!s || !turns) wrong.push('掷不出局，或者年表上没有哥改行那一卷')
  else {
    // 因果：侄儿还小，地没人种，哥不走；木讷的哥不走
    s.people.amend('brother', { temper: '精明' })
    ageTo(s, 'nephew', 12)
    if (meetsAll(turns.requires)) wrong.push('侄儿才十二，哥就把地交给他走了')
    ageTo(s, 'nephew', 17)
    s.people.amend('brother', { temper: '木讷' })
    if (meetsAll(turns.requires)) wrong.push('木讷的哥也走了')
    s.people.amend('brother', { temper: '精明' })
    if (!meetsAll(turns.requires)) wrong.push('侄儿成人、哥精明、老屋务农，改行那一卷却关着')
    // 改行之前，侄儿成人那句是「他跟哥两个人种」
    const before = play('kindred:nephew-grown')
    if (!before.some((l) => l.includes('两个人种'))) {
      wrong.push(`哥还在地里，侄儿成人那句却是：${before.find((l) => l.includes('种')) ?? '（没提）'}`)
    }
    const nephewPlace = s.people.personOf('nephew')?.place
    // 当家的是谁问户，不想当然：爹还在就是爹当家，哥去镇上做工不换人。头一版写死了 `'brother'`，
    // 掷到爹还在的局就红（另一个会话先撞上的）——跟兄终弟及那一回是同一个错
    const headBefore = s.people.houses['old-home']?.head ?? null
    const lines = play('kindred:brother-turns')
    if (!lines.some((l) => l.includes('还是种地的人家'))) {
      wrong.push(`改行那一卷没说老屋还是种地的人家：${lines[lines.length - 1] ?? '（没有正文）'}`)
    }
    // 户的营生 ≠ 人的营生
    const own = s.people.livelihoodOf('brother')
    if (own !== '木工') wrong.push(`哥去了镇上做木匠，问他靠什么谋生却是「${own ?? '（无）'}」`)
    const oldHome = s.people.houses['old-home']
    if (oldHome?.livelihood !== '务农') {
      wrong.push(`哥改了行，老屋的营生跟着变成了「${oldHome?.livelihood ?? '（无）'}」——户靠什么维持是另一件事`)
    }
    if (s.people.livelihoodOf('nephew') !== '务农') {
      wrong.push(`侄儿种着老屋的地，问他靠什么谋生却是「${s.people.livelihoodOf('nephew') ?? '（无）'}」`)
    }
    // 离家做工 ≠ 离户
    if (s.people.houseOf('brother')?.id !== 'old-home') {
      wrong.push(`哥去镇上做工，就不是老屋的人了（${s.people.houseOf('brother')?.id ?? '无户'}）`)
    }
    if ((oldHome?.head ?? null) !== headBefore) {
      wrong.push(`哥去镇上做工，老屋的当家从 ${headBefore ?? '（无）'} 换成了 ${oldHome?.head ?? '（无）'}`)
    }
    if (!oldHome?.members.includes('brother')) wrong.push('哥去镇上做工，老屋的户里没他了')
    whoRuns = headBefore === 'brother' ? '哥当家' : headBefore === 'father' ? '爹当家' : `${headBefore ?? '没人'}当家`
    if (s.people.personOf('brother')?.place === nephewPlace) wrong.push('哥去了镇上，人却还在老屋')
    if ((s.people.personOf('nephew')?.doing ?? '').includes('跟着爹')) {
      wrong.push(`哥走了，侄儿手上的活还是「${s.people.personOf('nephew')?.doing}」——写死的字段活得比事实久`)
    }
    if (meetsAll(turns.requires)) wrong.push('已经改了行，改行那一卷还开着')
    // 正月里：哥从镇上回来，送你到巷口的还是他
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('从镇上回来'))) wrong.push('哥在镇上做木匠，正月里那一卷却没说他从镇上回来')
    if (!visit.some((l) => l.includes('哥送你到巷口'))) wrong.push('哥回来过年了，送你到巷口的却不是他')
    // 债怎么还来自还债的人此刻靠什么过活：木匠还的是一张桌子
    weather(s, { grain: 130, harvest: 30 })
    play('kindred:borrow', 'lend')
    weather(s, { grain: 100, harvest: 60 })
    const repaid = play('kindred:repay')
    if (!repaid.some((l) => l.includes('桌子'))) wrong.push(`哥是木匠，还的却是：${repaid[repaid.length - 1] ?? '（没有正文）'}`)
    if (s.people.ious.some((one) => one.debtor === 'brother' && !one.settled)) wrong.push('桌子送来了，那笔债还没销')
  }
  // 哥没了：侄儿成人那句不能是「他跟哥两个人种」——死了的人不种地，也问不出营生
  const t = setUp()
  if (!t) wrong.push('掷不出第二局')
  else {
    applyEffects([{ type: 'person', id: 'brother', fate: '殁' }])
    const lines = play('kindred:nephew-grown')
    if (lines.some((l) => l.includes('两个人'))) wrong.push('哥没了，侄儿成人那句还是「他跟哥两个人种」')
    if (!lines.some((l) => l.includes('一个人种'))) {
      wrong.push(`哥没了，侄儿成人那句却是：${lines.find((l) => l.includes('种')) ?? '（没提）'}`)
    }
    if (t.people.livelihoodOf('brother') !== undefined) wrong.push(`哥没了，问他靠什么谋生还答得出「${t.people.livelihoodOf('brother')}」`)
  }
  // 缘由来自世界里已有的事实：欠着粮走的，那一卷说的是粮
  const u = setUp()
  if (!u) wrong.push('掷不出第三局')
  else {
    u.people.amend('brother', { temper: '刚硬' })
    weather(u, { grain: 130, harvest: 30 })
    play('kindred:borrow', 'lend')
    const lines = play('kindred:brother-turns')
    if (!lines.some((l) => l.includes('还不上'))) wrong.push(`欠着粮走的，那一卷却没提那笔粮：${lines[0] ?? '（没有正文）'}`)
  }
  // 尺子自检：只问户不问人的那把尺，对改了行的哥答的是务农——它分不出户和人
  const houseOnly = (st: Staged, id: string): Livelihood | undefined => st.people.houseOf(id)?.livelihood
  const v = setUp()
  if (!v) wrong.push('掷不出第四局')
  else {
    v.people.amend('brother', { temper: '精明' })
    play('kindred:brother-turns')
    if (houseOnly(v, 'brother') !== '务农') wrong.push('尺子自检：只问户的那把尺该答务农')
    if (v.people.livelihoodOf('brother') === houseOnly(v, 'brother')) wrong.push('尺子自检：问人和只问户答得一样，这把尺分不出户和人')
  }
  const randomly = divided.filter((l) => l.brotherTurned).length
  if (wrong.length > 0) {
    console.log(`  ✗ 十三、哥改行：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 十三、哥去镇上做木匠：老屋还是务农的户、哥自己是木工、侄儿种着地；人在镇上、户在老屋、当家的不换（这一局老屋${whoRuns}）；` +
        `正月里从镇上回来，那笔粮还的是一张桌子；侄儿小、哥木讷都不走；哥没了侄儿成人那句是「一个人种」。（随机人生里哥改了行的 ${randomly} 世）`,
    )
  }
}

// 十四、侄儿想去镇上：家庭经营、个人选择、代际关系、个人生计四件事同时存在而不互相覆盖
{
  const wrong: string[] = []
  type Stance = 'for-nephew' | 'for-brother' | 'stay-out'
  const TEMPERS: readonly Temper[] = ['谨慎', '温和', '刚硬', '精明', '木讷', '暴躁']
  const STANCES: readonly Stance[] = ['for-nephew', 'for-brother', 'stay-out']
  /**
   * 走没走成的那张分流表，跟 `life/nephew.ts` 里 `nephew:goes` 一格不差。
   * 他爹、他自己、你、那一年四样东西一起定；下面把它在全部二百一十六种组合上跟真引擎对一遍
   */
  const verdict = (
    nephew: Temper,
    father: Temper,
    stance: Stance,
    hungry: boolean,
  ): { goes: boolean; terms: Terms } => {
    const bold = nephew === '刚硬' || nephew === '暴躁'
    const soft = nephew === '温和' || nephew === '木讷'
    const lenient = father === '温和' || father === '木讷'
    const counting = father === '精明' || father === '谨慎'
    if (bold && lenient) return { goes: true, terms: '亲厚' }
    if (bold) return { goes: true, terms: '不睦' }
    if (soft && stance === 'for-brother') return { goes: false, terms: '平常' }
    if (lenient) return { goes: true, terms: '亲厚' }
    if (counting && stance === 'for-nephew') return { goes: true, terms: '平常' }
    if (counting && hungry) return { goes: true, terms: '平常' }
    if (soft) return { goes: false, terms: '平常' }
    return { goes: false, terms: '不睦' }
  }
  const restless = lifeEvents.find((one) => one.id === 'nephew-restless')
  const hungryEvent = lifeEvents.find((one) => one.id === 'nephew-restless-hungry')
  const goesEvent = lifeEvents.find((one) => one.id === 'nephew-goes')
  const mendEvent = lifeEvents.find((one) => one.id === 'nephew-mend')
  /** 老屋在哪：嫂子从没离开过 */
  const oldHomePlace = (st: Staged): string | undefined => st.people.personOf('brother-wife')?.place

  if (!restless || !hungryEvent || !goesEvent || !mendEvent) wrong.push('年表上少了侄儿那几卷')

  // 想不想走是倾向：性情里出，也从年景里出
  const a = grownUp()
  if (!a || !restless || !hungryEvent) wrong.push('掷不出局')
  else {
    a.people.amend('nephew', { temper: '温和' })
    if (meetsAll(restless.requires) || meetsAll(hungryEvent.requires)) wrong.push('温和的孩子、年景平常，却想走')
    weather(a, { harvest: 30 })
    if (!meetsAll(hungryEvent.requires)) wrong.push('荒年，温和的孩子也该想走——「更可能」成了「只允许」')
    weather(a, {})
    a.people.amend('nephew', { temper: '精明' })
    if (!meetsAll(restless.requires)) wrong.push('精明的孩子在地上待不住，那一卷却关着')
    // 两边都来找了你：小时候自己跑来过的孩子先来找你；没来过的，是哥来让你劝
    const nephewBefore = a.people.known['nephew']?.affinity ?? 0
    const brotherBefore = a.people.known['brother']?.affinity ?? 0
    const lines = play('nephew:restless', 'stay-out')
    if (!lines.some((l) => l.includes('哥来了一趟'))) wrong.push(`没自己来过的孩子，该是哥来找你：${lines[1] ?? ''}`)
    if ((a.people.known['nephew']?.affinity ?? 0) !== nephewBefore) wrong.push('不掺和，侄儿那条边却动了')
    if ((a.people.known['brother']?.affinity ?? 0) !== brotherBefore) wrong.push('不掺和，哥那条边却动了')
    if (!a.world.hasFlag('nephew-restless')) wrong.push('想走那一卷没留下旗，走没走成那一卷接不上')
    if (goesEvent && !meetsAll(goesEvent.requires)) wrong.push('想走了，走没走成那一卷却关着')
  }
  const b = grownUp()
  if (!b) wrong.push('掷不出第二局')
  else {
    b.world.setFlag('nephew-came', true)
    const nephewBefore = b.people.known['nephew']?.affinity ?? 0
    const brotherBefore = b.people.known['brother']?.affinity ?? 0
    const lines = play('nephew:restless', 'for-nephew')
    if (!lines.some((l) => l.includes('他先来找的你'))) wrong.push(`自己来过的孩子该先来找你：${lines[1] ?? ''}`)
    if (!((b.people.known['nephew']?.affinity ?? 0) > nephewBefore)) wrong.push('替他说了话，他那条边没升')
    if (!((b.people.known['brother']?.affinity ?? 0) < brotherBefore)) wrong.push('替他儿子说话，哥那条边没降')
    if (b.people.termsBetween('nephew', 'brother') !== undefined) wrong.push('你替他说话，父子那条边就先定了——那是走没走成那一卷的事')
  }

  // 分流表：二百一十六种组合，一格一格跟真引擎对
  const mismatch: string[] = []
  let went = 0
  let stayed = 0
  const seen = new Map<string, { goes: boolean; terms: Terms | undefined }>()
  const key = (n: Temper, f: Temper, st: Stance, h: boolean): string => `${n}|${f}|${st}|${h ? '荒' : '平'}`
  for (const stance of STANCES) {
    for (const hungry of [false, true]) {
      const st = grownUp()
      if (!st) {
        wrong.push('分流表：掷不出局')
        break
      }
      const home = oldHomePlace(st)
      for (const nephew of TEMPERS) {
        for (const father of TEMPERS) {
          st.people.amend('nephew', { temper: nephew, livelihood: undefined, place: home ?? st.household.home, doing: '跟着爹种地' })
          st.people.amend('brother', { temper: father, livelihood: undefined, place: home ?? st.household.home })
          st.people.relations = st.people.relations.filter((r) => !(r.from === 'nephew' && r.to === 'brother'))
          st.world.setFlag('spoke-for-nephew', stance === 'for-nephew')
          st.world.setFlag('spoke-for-brother', stance === 'for-brother')
          st.world.setFlag('nephew-restless-hungry', hungry)
          st.world.setFlag('nephew-went', false)
          st.world.setFlag('nephew-restless', true)
          const lines = play('nephew:goes')
          if (lines.length > 0) mismatch.push(`${key(nephew, father, stance, hungry)} 落了正文`)
          const goes = st.people.livelihoodOf('nephew') === '佣工'
          const terms = st.people.termsBetween('nephew', 'brother')
          seen.set(key(nephew, father, stance, hungry), { goes, terms })
          const want = verdict(nephew, father, stance, hungry)
          if (goes !== want.goes || terms !== want.terms) {
            mismatch.push(`${key(nephew, father, stance, hungry)}：引擎 ${goes ? '走' : '留'}/${terms ?? '无'}，表上 ${want.goes ? '走' : '留'}/${want.terms}`)
          }
          if (goes) went += 1
          else stayed += 1
          if (st.world.hasFlag('nephew-restless')) mismatch.push(`${key(nephew, father, stance, hungry)} 走没走成之后「想走」那面旗还在`)
          if (goes && st.people.houseOf('nephew')?.id !== 'old-home') mismatch.push(`${key(nephew, father, stance, hungry)} 走了就不是老屋的人了`)
          if (goes && st.people.houses['old-home']?.livelihood !== '务农') mismatch.push(`${key(nephew, father, stance, hungry)} 他走了老屋的营生跟着变了`)
        }
      }
    }
  }
  if (mismatch.length > 0) wrong.push(`分流表对不上：${mismatch[0]}（共 ${mismatch.length} 处）`)
  if (went === 0 || stayed === 0) wrong.push(`分流表一边倒：走 ${went}，留 ${stayed}`)
  // 四样东西各自都能翻转结果——没有一样能单独拍板，也没有一样是摆设
  const at = (n: Temper, f: Temper, st: Stance, h: boolean): boolean | undefined => seen.get(key(n, f, st, h))?.goes
  if (!(at('精明', '精明', 'stay-out', false) === false && at('精明', '精明', 'for-nephew', false) === true)) wrong.push('你说的话对精明的爹不起作用')
  if (!(at('谨慎', '谨慎', 'stay-out', false) === false && at('谨慎', '谨慎', 'stay-out', true) === true)) wrong.push('荒年对谨慎的爹不起作用')
  if (!(at('精明', '刚硬', 'stay-out', false) === false && at('精明', '温和', 'stay-out', false) === true)) wrong.push('爹的性情不起作用')
  if (!(at('温和', '刚硬', 'stay-out', false) === false && at('刚硬', '刚硬', 'stay-out', false) === true)) wrong.push('孩子自己的性情不起作用')
  if (!(at('刚硬', '刚硬', 'for-brother', false) === true)) wrong.push('刚硬的孩子该是你劝也劝不住的')

  // 四件事各是各的：他走了，老屋还是务农的户、他是学徒、哥还种地、你的边不动；正月里看见他回来
  const c = grownUp()
  if (!c) wrong.push('掷不出第三局')
  else {
    c.people.amend('nephew', { temper: '精明' })
    c.people.amend('brother', { temper: '温和' })
    const home = oldHomePlace(c)
    const meBrother = c.people.known['brother']?.affinity ?? null
    const meNephew = c.people.known['nephew']?.affinity ?? null
    const myLivelihood = c.household.livelihood
    const chronicleBefore = c.world.chronicle.length
    c.world.setFlag('nephew-restless', true)
    play('nephew:goes')
    if (c.world.chronicle.length !== chronicleBefore) wrong.push('走没走成那一卷进了编年')
    // 老屋的事只动老屋：你自家那一格营生（`household.livelihood`）一根毫毛也不能动
    if (c.household.livelihood !== myLivelihood) wrong.push(`侄儿去了镇上，你自家的营生却从「${myLivelihood}」变成了「${c.household.livelihood}」`)
    if (c.people.livelihoodOf('nephew') !== '佣工') wrong.push(`他去镇上当学徒了，问他靠什么谋生却是「${c.people.livelihoodOf('nephew') ?? '无'}」`)
    if (c.people.houses['old-home']?.livelihood !== '务农') wrong.push('他走了，老屋不是种地的人家了')
    if (c.people.livelihoodOf('brother') !== '务农') wrong.push('儿子走了，哥自己的营生跟着变了')
    if (c.people.personOf('nephew')?.place === home) wrong.push('他去了镇上，人却还在老屋')
    if (c.people.houseOf('nephew')?.id !== 'old-home') wrong.push('他去镇上当学徒，就不是老屋的人了')
    if ((c.people.known['brother']?.affinity ?? null) !== meBrother) wrong.push('父子的事动了你跟哥的边')
    if ((c.people.known['nephew']?.affinity ?? null) !== meNephew) wrong.push('父子的事动了你跟侄儿的边')
    if (c.people.termsBetween('nephew', 'brother') !== '亲厚') wrong.push('温和的爹放他走，父子那条边不是亲厚')
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('从镇上回来过年，穿着'))) wrong.push('他在镇上当学徒，正月里那一卷却没说他回来过年')
    if (visit.some((l) => l.includes('没说一句话'))) wrong.push('父子亲厚，正月里那顿饭却没人说话')
    // 哥没了：在镇上的儿子回来当家，地不能荒。谁当家问户：爹还在先送爹；没分出去的成年弟弟在，轮不到他
    if (c.people.isAlive('father')) applyEffects([{ type: 'person', id: 'father', fate: '殁' }])
    const uncle = c.people
      .kinOf('弟')
      .find((id) => c.people.isAlive(id) && c.people.ageOf(id) >= 16 && (c.people.houses['old-home']?.members ?? []).includes(id))
    applyEffects([{ type: 'person', id: 'brother', fate: '殁' }])
    const mourning = play('kindred:brother-gone')
    if (uncle === undefined) {
      if (!mourning.some((l) => l.includes('地不能荒'))) wrong.push(`哥没了，在镇上的儿子该回来当家：${mourning[mourning.length - 1] ?? ''}`)
      if (c.people.livelihoodOf('nephew') !== '务农') wrong.push(`他回来当家了，问他靠什么谋生却还是「${c.people.livelihoodOf('nephew') ?? '无'}」`)
      if (c.people.personOf('nephew')?.livelihood !== undefined) wrong.push('他回老屋种地了，自己那格营生没清')
      if (c.people.personOf('nephew')?.place !== home) wrong.push(`他回来了，人却在 ${c.people.personOf('nephew')?.place}`)
      if (c.people.houses['old-home']?.head !== 'nephew') wrong.push(`哥没了，老屋的当家是 ${c.people.houses['old-home']?.head}`)
    } else if (c.people.livelihoodOf('nephew') !== '佣工') wrong.push('老屋有成年的叔叔当家，侄儿却也回来了')
  }

  // 哥在镇上做木匠、儿子又走了：地不能荒，哥回来——自己的营生清掉，落回老屋的
  const d = grownUp()
  if (!d) wrong.push('掷不出第四局')
  else {
    d.people.amend('brother', { temper: '精明' })
    const home = oldHomePlace(d)
    play('kindred:brother-turns')
    if (d.people.livelihoodOf('brother') !== '木工') wrong.push('第四局摆不出在镇上做木匠的哥')
    d.people.amend('nephew', { temper: '刚硬' })
    d.world.setFlag('nephew-restless', true)
    play('nephew:goes')
    if (d.people.livelihoodOf('nephew') !== '佣工') wrong.push('刚硬的孩子该说走就走')
    if (d.people.livelihoodOf('brother') !== '务农') wrong.push(`儿子走了地没人种，哥该回来种地，问他靠什么谋生却是「${d.people.livelihoodOf('brother') ?? '无'}」`)
    if (d.people.personOf('brother')?.livelihood !== undefined) wrong.push('哥回来种地了，自己那格营生没清——写死的字段活得比事实久')
    if (d.people.personOf('brother')?.place !== home) wrong.push(`哥回老屋了，人却在 ${d.people.personOf('brother')?.place}`)
    if (d.people.houses['old-home']?.livelihood !== '务农') wrong.push('两个人换了个地方，老屋的营生却变了')
    if (d.people.termsBetween('nephew', 'brother') !== '不睦') wrong.push('精明的爹拦不住刚硬的儿子，父子那条边该是不睦')
  }

  // 留下了、不睦；后来和好，是你不在场的事：正月里看见结果，缘由是娘告诉你的
  const e = grownUp()
  if (!e || !mendEvent) wrong.push('掷不出第五局')
  else {
    e.people.amend('nephew', { temper: '精明' })
    e.people.amend('brother', { temper: '刚硬' })
    e.world.setFlag('nephew-restless', true)
    play('nephew:goes')
    if (e.people.livelihoodOf('nephew') !== '务农') wrong.push('刚硬的爹不放，精明的孩子该留下')
    if (e.people.termsBetween('nephew', 'brother') !== '不睦') wrong.push('留下了，父子那条边该是不睦')
    const sour = play('kindred:newyear')
    if (!sour.some((l) => l.includes('一顿饭没说一句话'))) wrong.push('父子不睦，正月里那顿饭却有人说话')
    if (meetsAll(mendEvent.requires)) wrong.push('哥还没老，和好那一卷就开了')
    ageTo(e, 'brother', 56)
    if (!meetsAll(mendEvent.requires)) wrong.push('父子不睦、哥老了，和好那一卷却关着')
    const chronicleBefore = e.world.chronicle.length
    const lines = play('nephew:mend')
    if (lines.length > 0 || e.world.chronicle.length !== chronicleBefore) wrong.push('和好那一卷落了正文或进了编年')
    if (e.people.termsBetween('nephew', 'brother') !== '亲厚') wrong.push('和好了，父子那条边不是亲厚')
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('又说上话了'))) wrong.push('和好了，正月里却没看见父子说上话')
    if (!visit.some((l) => l.includes('是') && l.includes('守着的'))) wrong.push('娘在老屋、还活着，该是她告诉你缘由')
    if (visit.some((l) => l.includes('什么时候的事，你不知道'))) wrong.push('娘告诉你了，还说不知道')
    const again = play('kindred:newyear')
    if (again.some((l) => l.includes('又说上话了'))) wrong.push('和好的事说了两回')
  }
  // 娘不在了：没人告诉你，你只看见结果
  const f = grownUp()
  if (!f) wrong.push('掷不出第六局')
  else {
    f.people.amend('nephew', { temper: '精明' })
    f.people.amend('brother', { temper: '刚硬' })
    f.world.setFlag('nephew-restless', true)
    play('nephew:goes')
    applyEffects([{ type: 'person', id: 'mother', fate: '殁' }])
    play('nephew:mend')
    const visit = play('kindred:newyear')
    if (!visit.some((l) => l.includes('什么时候的事，你不知道'))) wrong.push('娘不在了，没人告诉你缘由，正月里却像什么都知道')
    if (visit.some((l) => l.includes('守着的'))) wrong.push('娘不在了，谁告诉你的「病了一冬」')
  }

  // 哥改行那条：欠着粮的，五十五往上、木讷的也可能走——倾向不是规则
  const g = grownUp()
  const turnsDebt = lifeEvents.find((one) => one.id === 'kindred-brother-turns-debt')
  const turns = lifeEvents.find((one) => one.id === 'kindred-brother-turns')
  if (!g || !turnsDebt || !turns) wrong.push('掷不出第七局，或年表上没有欠债改行那一条')
  else {
    g.people.amend('brother', { temper: '木讷' })
    ageTo(g, 'brother', 58)
    if (meetsAll(turns.requires)) wrong.push('五十八、木讷的哥，平常那条改行却开着')
    if (meetsAll(turnsDebt.requires)) wrong.push('没欠债，欠债那条改行却开着')
    weather(g, { grain: 130, harvest: 30 })
    play('kindred:borrow', 'lend')
    if (!meetsAll(turnsDebt.requires)) wrong.push('欠着粮还不上，五十八、木讷的哥也该可能走——「更可能」成了「只允许」')
    // 侄儿走了地上没人，哥不能再走
    g.people.amend('nephew', { temper: '刚硬' })
    g.world.setFlag('nephew-restless', true)
    play('nephew:goes')
    if (meetsAll(turnsDebt.requires) || meetsAll(turns.requires)) wrong.push('侄儿去了镇上，地上没人，哥改行那一卷却还开着')
  }

  // 静态：走没走成、和好两卷一个字也没有、不进编年
  for (const id of ['nephew:goes', 'nephew:mend']) {
    const scene = lifeScenes[id]
    if (!scene) wrong.push(`库里没有 ${id}`)
    else if (Object.values(scene.nodes).some((node) => node.blocks.length > 0 || (node.seen?.length ?? 0) > 0)) wrong.push(`${id} 有正文——你不在场的事不该有你读到的话`)
    else if (Object.values(scene.nodes).some((node) => effectsOf(node).some((one) => one.type === 'chronicle'))) wrong.push(`${id} 记了编年`)
  }
  // 尺子自检：那张表自己得答得对
  const ruler =
    verdict('刚硬', '刚硬', 'stay-out', false).goes &&
    verdict('刚硬', '刚硬', 'stay-out', false).terms === '不睦' &&
    !verdict('温和', '刚硬', 'stay-out', false).goes &&
    !verdict('精明', '精明', 'stay-out', false).goes &&
    verdict('精明', '精明', 'for-nephew', false).goes &&
    verdict('谨慎', '谨慎', 'stay-out', true).goes &&
    verdict('温和', '温和', 'stay-out', false).terms === '亲厚' &&
    !verdict('温和', '温和', 'for-brother', false).goes
  if (!ruler) wrong.push('尺子自检：分流表那把尺自己答错了')

  const randomly = divided.filter((l) => l.nephewRestless).length
  const randomlyWent = divided.filter((l) => l.nephewWent).length
  if (wrong.length > 0) {
    console.log(`  ✗ 十四、侄儿想去镇上：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else {
    console.log(
      `  ✓ 十四、侄儿想去镇上：想走从性情里出也从年景里出；走没走成二百一十六种组合跟分流表一格不差，走 ${went} 留 ${stayed}，` +
        `爹、他、你、那一年各自都翻得动结果；他走了老屋还是务农的户、他是学徒、哥照旧、你的边不动；哥在镇上的话回来种地、自己那格营生清掉；` +
        `留下的不睦、后来和好是娘告诉你的，娘不在了你就不知道；哥没了在镇上的儿子回来当家。（随机人生里想走的 ${randomly} 世，走成的 ${randomlyWent} 世）`,
    )
  }
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
