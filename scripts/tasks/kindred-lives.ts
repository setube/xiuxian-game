/**
 * 「老屋：分家以后的两家」那一支的单世模拟，从 `scripts/kindred.ts` 原样搬出来。
 *
 * 走法一步没动——同一套出生、同样推到二十岁、同样一路随机落笔，
 * 采样点也照旧（分家那一刻取哥的好感，之后每个「没事发生的年」再取一次）。
 *
 * ## 判据没有跟着搬过来，这是有意的
 *
 * 这里只把事实取回去：每一世的 `Lived`。判据（`driftOf`、`coldnessWrong`、
 * `termsFor`）留在 `kindred.ts`——那几条自检要拿手写的坏数据去喂它们
 * （把性情对调、把好感改掉），判据搬进 worker 就够不着了。
 *
 * ## 「掷到分家够数为止」那一段留在主脚本
 *
 * 原来是 `for (tries < CAP && !enough()) lives.push(live())`——一个看全局
 * 计数的循环。摊开之后每一片只看得见自己那些世，没法问「大家一共够了没有」。
 * 所以这一步的形状变了：**每片先各掷一批，主线程合并后看够不够，不够再摊一轮**。
 * 掷出来的世一个不少，判据读到的 `lives` 跟从前是同一批东西。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import type { Temper, Terms } from '../../src/types/game'

export interface Lived {
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

export interface KindredShard {
  lives: Lived[]
}

export function runShard(runs: number): KindredShard {
  const lives: Lived[] = []
  for (let i = 0; i < runs; i += 1) lives.push(live())
  return { lives }
}
