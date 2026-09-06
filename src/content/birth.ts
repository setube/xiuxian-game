import { COUNTY_NAMES, TOWN_NAMES, VILLAGE_NAMES } from '@/content/geography'
import { SURNAMES, originById } from '@/content/origins'
import {
  type Circumstance,
  keeperName,
  rollCircumstance,
  siblingGap,
} from '@/content/circumstances'
import { pick, randomBetween } from '@/engine/random'
import { useHouseholdStore } from '@/stores/household'
import { makePerson, rollTemper, usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Bond, Chapter, Gender, Livelihood, OriginId } from '@/types/game'

/**
 * 出生。
 *
 * 这一支不生成「一对父母」，生成的是**一张初始关系网**——
 * 它可能有四个人，可能只有一个，也可能一个血亲都没有。
 *
 * 「出生 → 父亲 + 母亲 → 家庭事件」这个写法假定了每个人都有爹娘、
 * 且爹娘都活着。真实的世界不是这样：有人生下来娘就没了，
 * 有人跟着长姐过，有人被丢在庙门口，有人是老乞丐从雪地里捡回来的。
 *
 * 所以正确的形状是：
 *
 *   出生 → 初始生存环境 → 抚养关系 → 人际网络 → 人生发展
 *
 * 「父母」只是其中一种情况，而且是最常见的那一种——但不是唯一的。
 */

/** 女子的名。这个时代多是柳氏、王氏，闺名只有家里人知道 */
const FEMALE_GIVEN = [
  '清荷',
  '素娥',
  '婉娘',
  '秋娘',
  '巧云',
  '菱儿',
  '桂英',
  '兰香',
  '月娥',
  '阿宁',
] as const

/** 男子的名，按出身取字。名字本身就是家世 */
const MALE_GIVEN: Record<OriginId, readonly string[]> = {
  farm: ['怀山', '大有', '长根', '春发', '守田'],
  hunt: ['铁山', '虎生', '老岩', '青松', '得胜'],
  craft: ['文柏', '守成', '直方', '斧头', '砚生'],
  cloth: ['敬堂', '万金', '瑞丰', '通海', '德昌'],
  inn: ['来顺', '迎宾', '安平', '广通', '四海'],
  tavern: ['庆丰', '醉山', '满堂', '和鼎', '德茂'],
  herb: ['济仁', '和甫', '济安', '慎之', '存德'],
  escort: ['震山', '威远', '镇江', '雄飞', '定邦'],
  office: ['文渊', '希圣', '承宗', '维桢', '敬修'],
  yamen: ['大牛', '来福', '有财', '得贵', '顺子'],
  manor: ['载德', '崇礼', '守正', '恪勤', '慎行'],
  court: ['明煦', '承乾', '昭宁', '景元', '嘉佑'],
}

/**
 * 长辈年轻时可能有过的事。
 *
 * 掷两三件出来，全部 `known: false`——它们是真的，但玩家不知道。
 * 「跟商队去过北方」和「遇见过一个落魄修士」这两件不是随便写的：
 * 后者是这个游戏里最要紧的一根暗线——**养你的那个人其实见过修士，
 * 而他一辈子没跟你提过。**
 */
const ELDER_PAST: readonly { id: string; atAge: number; what: string; weight: number }[] = [
  { id: 'north-journey', atAge: 18, what: '年轻时跟商队去过一趟北方，走了大半年。', weight: 30 },
  { id: 'met-adept', atAge: 21, what: '在路上遇见过一个落魄修士，同行了几日。', weight: 14 },
  { id: 'lost-brother', atAge: 16, what: '有过一个兄长，那年发大水没了。', weight: 22 },
  { id: 'old-debt', atAge: 20, what: '替人担过一笔债，还了三年。', weight: 20 },
  { id: 'refused-match', atAge: 22, what: '本来说的是另一门亲事，后来没成。', weight: 18 },
  { id: 'soldiered', atAge: 19, what: '被征去修过一年河堤。', weight: 24 },
  { id: 'saw-killing', atAge: 23, what: '亲眼见过一场械斗，死了人。', weight: 16 },
  { id: 'famine', atAge: 9, what: '小时候逃过一次荒，那年饿死了很多人。', weight: 22 },
  { id: 'learned-letters', atAge: 12, what: '小时候认过几个字，后来忘得差不多了。', weight: 20 },
  { id: 'far-home', atAge: 20, what: '娘家在很远的地方，此后再没回去过。', weight: 18 },
]

function rollPast(count: number): Chapter[] {
  const remaining = [...ELDER_PAST]
  const picked: Chapter[] = []
  for (let i = 0; i < count && remaining.length > 0; i += 1) {
    const total = remaining.reduce((sum, item) => sum + item.weight, 0)
    let roll = Math.random() * total
    let index = 0
    for (let j = 0; j < remaining.length; j += 1) {
      roll -= remaining[j]!.weight
      if (roll <= 0) {
        index = j
        break
      }
    }
    const chosen = remaining.splice(index, 1)[0]!
    picked.push({ id: chosen.id, atAge: chosen.atAge, what: chosen.what, known: false })
  }
  return picked.sort((a, b) => a.atAge - b.atAge)
}

/** 这个位置上的人是男是女 */
function genderFor(bond: string, calls: string): Gender {
  if (bond === '生母' || bond === '姐' || bond === '妹') return '女'
  if (bond === '生父' || bond === '兄' || bond === '弟') return '男'
  // 抚养人和亲戚看称呼
  if (calls.includes('姐') || calls.includes('娘') || calls.includes('婆')) return '女'
  return '男'
}

export interface Birth {
  /** 玩家的姓名 */
  name: string
  circumstance: Circumstance
}

/**
 * 生下来。
 *
 * 顺序是有意的：**先有这张网，才有你**。
 * 你姓什么取决于生父姓什么；生父都没有的孩子，
 * 姓是收留他的人给的，或者干脆是庙里排的——那也是一条信息。
 */
export function beBorn(id: OriginId, home: string): Birth {
  const people = usePeopleStore()
  // 先把世界推到玩家出生那一年。他睁开眼时这个府是什么光景，
  // 是前面十几年一年一年变成的——那些年跟他没有关系，但确实发生过
  useWorldStore().seedHistory()
  const origin = originById(id)
  const circumstance = rollCircumstance()
  // 爹娘生在玩家出生之前多少年——按世界纪年算，不是按玩家的年龄算
  const bornYear = useWorldStore().time.year

  const bloodline = circumstance.kin.some((k) => k.bond === '生父')
  const surname = pick(SURNAMES) ?? '沈'

  // 同一个人可能占好几条边（姐姐既是姐又是抚养人），只造一次
  const made = new Set<string>()

  for (const kin of circumstance.kin) {
    if (!made.has(kin.id)) {
      made.add(kin.id)
      const gender = genderFor(kin.bond, kin.calls)
      const gap = kin.older > 15 ? kin.older + randomBetween(-3, 5) : siblingGap(kin.older)
      // 收留你的人不跟你同姓——这本身就是一条信息，玩家迟早会想到
      /**
       * 跟你同姓的只有父系血亲。
       *
       * 母亲有她自己的姓——「柳氏」这三个字里，「柳」是她娘家的。
       * 收留你的人更不会跟你同姓，那本身就是一条信息：
       * 一个姓陈的孩子跟着姓吴的老丈过，村里人一看就知道是怎么回事。
       */
      const isBlood = kin.bond === '生父' || ['兄', '姐', '弟', '妹'].includes(kin.bond)
      const stranger = keeperName()
      const person = makePerson({
        id: kin.id,
        surname: isBlood ? surname : stranger.surname,
        given:
          gender === '女'
            ? (pick(FEMALE_GIVEN) ?? '清荷')
            : isBlood
              ? (pick(MALE_GIVEN[id]) ?? '怀山')
              : stranger.given,
        gender,
        bornYear: bornYear - gap,
        // 他做什么营生。收养他的人自带一句（讨饭的、寺中的老僧），
        // 血亲长辈填这家人的**业**——是「务农」不是「农户」，
        // 因为这一格问的是他在做什么，不是官府认定他家是什么户。
        // 兄姐弟妹这一格**空着**：小孩子说不上营生，而「还没成人」
        // 是年龄的另一种说法，它旁边就写着岁数（见 `types/game.ts`）
        doing: kin.doing ?? (gap > 15 ? origin.livelihood : undefined),
        // 他过的是什么日子。绝大多数人不写这一格，自然落回这个家；
        // 写了的抚养人（老僧、老乞丐、战乱里收留你的人）的日子盖过这个家
        living: kin.living,
        temper: rollTemper(),
        health: randomBetween(40, 85),
        place: home,
        // 只有长辈才有值得说的过去。五岁的弟弟没有往事
        history: gap > 15 ? rollPast(randomBetween(2, 3)) : [],
      })
      people.enroll(person)

      if (kin.goneAtBirth) {
        // 他存在过。玩家没见过他，但这条血缘永远成立
        people.amend(kin.id, { fate: '殁' })
      } else {
        // 一出生就认得，但那时还不知道他叫什么——
        // 「爹」是称呼，「沈怀山」是名字，那是两回事
        people.meet(kin.id, kin.calls, kin.bond === '抚养' ? 55 : 60)
      }
    }
    // 边照牵。人没了，血缘还在
    people.bind('me', kin.id, kin.bond)
  }

  // 姓：有生父就随生父，没有就是收留的人给的
  const father = people.personOf('father')
  const finalSurname =
    bloodline && father
      ? father.surname
      : (people.personOf(circumstance.kin[0]?.id ?? '')?.surname ?? surname)

  // 先立地方，再立邻居：邻居住在哪一处宅，得先有村或街可挂
  settlePlaces({ id, origin, circumstance })

  // 东邻西舍。姓定下来了才能立——邻居不能跟自家同姓
  settleNeighbours({
    people,
    id,
    origin,
    home,
    bornYear,
    surname: finalSurname,
  })

  // 自家这一户：一出生就在的那些人。头是爹，没有爹就是养你的那个人
  settleOwnHouse({ people, id, circumstance, surname: finalSurname })

  // 王府里的人。乳母、管事、门房、婢女、小厮——他们是真人，不是一个 servantCount
  // 住在王府里才有：被寺里收留的那个孩子身边是老僧，不是乳母
  if (id === 'manor' && useWorldStore().residenceKind() === '王府') {
    settleManorHousehold({ people, home, bornYear })
  }

  return {
    name: `${finalSurname}${pick(origin.given) ?? '生'}`,
    circumstance,
  }
}

/**
 * 立自家这一户。
 *
 * `House.members` 是**住在这一户里的人**，不是亲属名单（见 `types/game.ts`）。
 * 出生那一刻住在这儿的是境况表给的那几个人：爹娘兄姐，或是收留你的老僧、老乞丐。
 * 生下来就没了的不算——他没住在这儿。户主是爹；没有爹，就是养你的那个人。
 *
 * 住处照抄 `world.residence`：讨饭的没有居所，这一户照样是一户（`'无'`）——
 * 户是「谁跟谁一起过日子」，不是「有没有一处房子」。
 */
function settleOwnHouse(input: {
  people: ReturnType<typeof usePeopleStore>
  id: OriginId
  circumstance: Circumstance
  surname: string
}): void {
  const { people, id, circumstance, surname } = input
  const members = [...new Set(circumstance.kin.filter((k) => !k.goneAtBirth).map((k) => k.id))]
  const head =
    members.find((one) => one === 'father') ??
    circumstance.kin.find((k) => k.bond === '抚养' && !k.goneAtBirth)?.id ??
    members[0] ??
    'me'
  people.enrollHouse({
    id: 'home',
    surname,
    head,
    members,
    residence: useWorldStore().residence ?? '无',
    livelihood: originById(id).livelihood,
  })
}

/**
 * 立王府里的人。
 *
 * 用户 2026-09-06 定的：**府里的下人也必须是真人。** 不是 `servantCount = 37`，
 * 是乳母、管事、门房、婢女、小厮各有年纪、脾气、过去——乳母有自己留在乡下的孩子，
 * 管事服侍这个家三十年，小厮出身城外的农家。他们进人口册，会老会死，
 * 也会被逐出府（`royal:dismissal`）——身份会变，那正是这一层要说的话。
 *
 * 他们进 `houses['home']`：玩家自家这一户除了亲人还有谁。**成员不等于亲人**——
 * 举家迁出王府时乳母跟着走，靠的就是她在这一户里，不是靠正文点名。
 * 脾气是掷的，跟别人一样——**宗室身份和具体人物分开**，在王府里不体面的人照样有。
 */
function settleManorHousehold(input: {
  people: ReturnType<typeof usePeopleStore>
  home: string
  bornYear: number
}): void {
  const { people, home, bornYear } = input
  const staff: {
    pid: string
    gender: Gender
    older: [number, number]
    doing: string
    calls: string
    past?: Chapter
  }[] = [
    {
      pid: 'nurse',
      gender: '女',
      older: [22, 36],
      doing: '乳母',
      calls: '乳母',
      past: { id: 'own-child', atAge: 20, what: '自己的孩子留在乡下，托给了娘家。', known: false },
    },
    {
      pid: 'steward',
      gender: '男',
      older: [42, 60],
      doing: '府里的管事',
      calls: '老管家',
      past: {
        id: 'served-long',
        atAge: 20,
        what: '从上一代王爷起就在府里，服侍这个家三十年。',
        known: false,
      },
    },
    { pid: 'gatekeeper', gender: '男', older: [30, 55], doing: '门房', calls: '门房' },
    { pid: 'maid', gender: '女', older: [12, 18], doing: '府里的婢女', calls: '春杏' },
    {
      pid: 'page',
      gender: '男',
      older: [10, 15],
      doing: '府里的小厮',
      calls: '小厮',
      past: {
        id: 'farm-born',
        atAge: 12,
        what: '家里是城外种地的，十二岁被招进府。',
        known: false,
      },
    },
  ]
  for (const one of staff) {
    const person = makePerson({
      id: one.pid,
      surname: pick(SURNAMES) ?? '刘',
      given:
        one.gender === '女' ? (pick(FEMALE_GIVEN) ?? '巧云') : (pick(MALE_GIVEN.farm) ?? '大有'),
      gender: one.gender,
      bornYear: bornYear - randomBetween(one.older[0], one.older[1]),
      doing: one.doing,
      place: home,
      history: one.past ? [one.past] : [],
    })
    people.enroll(person)
    people.meet(person.id, one.calls, 0)
    people.joinHouse('home', person.id)
  }
}

/**
 * 立他身边那几处地方。
 *
 * ## 两棵树，各走各的
 *
 *     宫里　　　京师 → 皇城 → 宫城 → 宫
 *     藩王　　　府 → 县 → 城 → 王府
 *     府城里　　府 → 县 → 城 → 街 → 宅／寺
 *     乡下　　　府 → 县 → 镇 → 村 → 宅／寺，外加一两个邻村
 *
 * 只立他身边的：一个县、一个邻县、一个镇或城、一个村或街、一处居所。
 * 不是整个天下——一个人一辈子也走不了几个地方，天下等他走到再立。
 *
 * ## 从前这儿有一把临时尺子
 *
 * `residenceKind` 从出身和境况里猜「他住在什么样的地方」，替还没建的地域层说话。
 * 现在住处是一件真实的事（`world.residence`），那把尺子删了，
 * 邻居那一支改问 `world.residenceKind()`。
 *
 * 寺里、讨饭、逃难这三种从抚养人认：`monk`／`beggar`／`keeper` 是境况表里写死的 id。
 * 境况表从前每条写了一串 `flags`（orphan、in-temple……），没有任何一处立成旗标，
 * 也没有任何一条 requires 读——用户明令：**没有真实使用者，就删**，不为它找读者。
 */
function settlePlaces(input: {
  id: OriginId
  origin: { capital?: string; station: string }
  circumstance: Circumstance
}): void {
  const { id, origin, circumstance } = input
  const world = useWorldStore()
  const household = useHouseholdStore()
  const guardians = circumstance.kin.filter((k) => k.bond === '抚养').map((k) => k.id)
  const inTemple = guardians.includes('monk')
  const roofless = guardians.includes('beggar') || guardians.includes('keeper')

  if (origin.capital) {
    world.enrollPlace({ id: 'capital', name: '京师', kind: '京师', within: null })
    world.enrollPlace({ id: 'imperial-city', name: '皇城', kind: '皇城', within: 'capital' })
    world.enrollPlace({ id: 'palace-city', name: '宫城', kind: '宫城', within: 'imperial-city' })
    world.enrollPlace({ id: 'home', name: household.locale, kind: '宫', within: 'palace-city' })
    world.settle('home', 'capital')
    return
  }

  world.enrollPlace({ id: 'prefecture', name: household.prefecture, kind: '府', within: null })
  const counties = [...COUNTY_NAMES].sort(() => Math.random() - 0.5)
  world.enrollPlace({
    id: 'county',
    name: counties[0] ?? '清平县',
    kind: '县',
    within: 'prefecture',
  })
  // 邻县：修河堤的活在那儿，父亲死在那儿——它得是一个真的地方
  world.enrollPlace({
    id: 'county-2',
    name: counties[1] ?? '安化县',
    kind: '县',
    within: 'prefecture',
  })

  const rural = id === 'farm' || id === 'hunt'
  let parent: string
  if (rural) {
    world.enrollPlace({
      id: 'town',
      name: pick(TOWN_NAMES) ?? '石桥镇',
      kind: '镇',
      within: 'county',
    })
    world.enrollPlace({ id: 'village', name: household.locale, kind: '村', within: 'town' })
    // 邻村一到两个：走山道去的那个村，托人来问亲事的那个村
    const names = VILLAGE_NAMES.filter((name) => name !== household.locale).sort(
      () => Math.random() - 0.5,
    )
    for (let n = 0; n < randomBetween(1, 2); n += 1) {
      world.enrollPlace({
        id: `village-${n + 2}`,
        name: names[n] ?? '南坡',
        kind: '村',
        within: 'town',
      })
    }
    parent = 'village'
  } else {
    world.enrollPlace({
      id: 'city',
      name: `${household.prefecture}城`,
      kind: '城',
      within: 'county',
    })
    if (origin.station === '宗室') {
      // 王府占一整片，不挂在哪条街下。生在王府却被寺里收留、被人捡去的孩子，
      // 住的不是王府——境况压过出身，跟别的人家一样
      if (roofless) {
        world.settle(null, 'city')
        return
      }
      if (inTemple) {
        world.enrollPlace({ id: 'home', name: '寺', kind: '寺', within: 'city' })
        world.settle('home', 'city')
        return
      }
      world.enrollPlace({ id: 'home', name: household.locale, kind: '王府', within: 'city' })
      world.settle('home', 'city')
      return
    }
    world.enrollPlace({ id: 'street', name: household.locale, kind: '街', within: 'city' })
    parent = 'street'
  }

  const at = rural ? 'village' : 'city'
  if (roofless) {
    // 讨饭的、逃难的：有聚落，没有居所
    world.settle(null, at)
    return
  }
  if (inTemple) {
    world.enrollPlace({ id: 'home', name: '寺', kind: '寺', within: parent })
    world.settle('home', at)
    return
  }
  world.enrollPlace({ id: 'home', name: '家', kind: '宅', within: parent })
  world.settle('home', at)
}

/** 东邻、西邻。两户，不多不少——第一批内容只用得着这两户 */
const NEIGHBOUR_SIDES = ['east', 'west'] as const

/**
 * 立东邻西舍。
 *
 * ## 邻接属于户，关系属于人
 *
 * 这里造的是**两户人家**（`House`），各有户主、多半有主妇、零到三个孩子，
 * 全都进人口册，跟玩家自家一样会老、会死（`people.live`）。
 * 户与户相邻是一条独立的事实（`adjoin`），**不从「同村」推出来**——
 * 同村不等于两家宅子挨着；这里是立基时明确声明「这两户挨着你家」。
 * 人与人的边一条也不牵：王二是不是你的朋友，得等真发生过什么。
 *
 * ## 一出生就「认识」，跟爹娘一样
 *
 * `meet` 进玩家的册子，好感零。称呼不存——`people.callOf` 每次现算
 * （九岁叫「王婶」，三十岁叫「王嫂」），这儿填的那句只是查不到时的兜底。
 *
 * ## 邻居的营生跟这条巷子走——这是采样偏好，不是世界规则
 *
 * 村里的邻居种地，铁匠巷的邻居打铁，布庄隔壁多半也是铺子：聚落会产生职业聚集，
 * 作为第一批内容的分布合理。**但它不能升级成「住在铁匠巷 = 铁匠」**，
 * 否则又从随机标签变成了空间标签。以后完全该出现铁匠巷里住着一个卖布的、
 * 铁匠破产搬走、铁匠的儿子去读书、一家人只是因为租得起才住进来。
 * 那些分别等有内容要它的时候再掷（用户 2026-09-06 划的警戒线）。
 */
function settleNeighbours(input: {
  people: ReturnType<typeof usePeopleStore>
  id: OriginId
  origin: { livelihood: Livelihood }
  home: string
  bornYear: number
  surname: string
}): void {
  const { people, id, origin, home, bornYear, surname } = input
  const world = useWorldStore()
  // 住在宅里的才有东邻西舍。宫、王府、寺、没有居所的，一户也没有
  if (world.residenceKind() !== '宅' || !world.residence) return
  const lane = world.placeOf(world.residence)?.within ?? null

  const taken = new Set([surname])
  for (const side of NEIGHBOUR_SIDES) {
    let family = pick(SURNAMES) ?? '王'
    for (let guard = 0; taken.has(family) && guard < 20; guard += 1) family = pick(SURNAMES) ?? '王'
    taken.add(family)

    const headBorn = bornYear - randomBetween(24, 50)
    const head = makePerson({
      id: `${side}-head`,
      surname: family,
      given: pick(MALE_GIVEN[id]) ?? '大有',
      gender: '男',
      bornYear: headBorn,
      doing: origin.livelihood,
      place: home,
    })
    people.enroll(head)
    people.meet(head.id, '邻家的人', 0)
    const members = [head.id]

    if (Math.random() < 0.8) {
      // 她姓自己的姓——「王家的」是夫家，「刘氏」是她自己
      const wife = makePerson({
        id: `${side}-wife`,
        surname: pick(SURNAMES) ?? '刘',
        given: pick(FEMALE_GIVEN) ?? '巧云',
        gender: '女',
        bornYear: headBorn + randomBetween(-2, 6),
        place: home,
      })
      people.enroll(wife)
      people.meet(wife.id, '邻家的妇人', 0)
      members.push(wife.id)
    }

    // 比玩家大零到十二岁：能一起玩的年纪。不生在玩家之后——那是以后的事，到时再添
    const children = randomBetween(0, 3)
    for (let n = 1; n <= children; n += 1) {
      const gender: Gender = Math.random() < 0.5 ? '男' : '女'
      const child = makePerson({
        id: `${side}-child-${n}`,
        surname: family,
        given: gender === '女' ? (pick(FEMALE_GIVEN) ?? '小满') : (pick(MALE_GIVEN[id]) ?? '二牛'),
        gender,
        bornYear: bornYear - randomBetween(0, 12),
        place: home,
      })
      people.enroll(child)
      people.meet(child.id, '邻家的孩子', 0)
      members.push(child.id)
    }

    // 他们家那处宅，挂在跟你家同一条街、同一个村下
    world.enrollPlace({ id: `${side}-house`, name: `${family}家`, kind: '宅', within: lane })
    people.enrollHouse({
      id: side,
      surname: family,
      head: head.id,
      members,
      residence: `${side}-house`,
      livelihood: origin.livelihood,
    })
    people.adjoin('home', side)
  }
  // 东邻和西邻也挨着——三家在同一条巷子上
  people.adjoin('east', 'west')
}

/**
 * 这一家姓什么。
 *
 * 跟出生那一刻定姓的规矩是同一条：有生父就随生父，没有就随收留你的人。
 * 抄一遍是因为那一段算完就丢了——`beBorn` 只把姓拼进玩家的名字里返回，
 * 没有留在任何地方。
 *
 * ## 家里添的人一律走这里
 *
 * 弟弟妹妹走这里，成年后自己生的孩子也走这里（`engine/effects.ts`
 * 的 `meet`：`who` 不写 surname 就是「跟本家同姓」）。
 *
 * 那一头从前另有一份写法，问的是 `personOf('me')?.surname`——
 * 可**「我」从来不在人口册上**：`'me'` 只是关系图上的一个节点名，
 * 没有任何地方 `enroll` 过它。于是那一问恒为 undefined，
 * 家里添的孩子全都姓「某」。它甚至老老实实报了错，
 * 只是报在一支没人盯着的走查脚本的标准错误里。
 *
 * **同一条规矩写第三遍的时候，第三遍是错的。** 现在只有这一份。
 */
export function houseSurname(people: ReturnType<typeof usePeopleStore>): string {
  const father = people.personOf('father')
  if (father) return father.surname
  for (const relation of people.relations) {
    if (relation.from !== 'me') continue
    const person = people.personOf(relation.to)
    if (person) return person.surname
  }
  return pick(SURNAMES) ?? '沈'
}

/**
 * 家里添了一个人。
 *
 * `beBorn` 造的是出生那一刻就在的那张网。这一支管的是之后添的——
 * 弟弟妹妹是一年一年生出来的，不是一出生就摆在那儿。
 *
 * ## 为什么非得真的造一个人
 *
 * 从前 `family` 那条效果只往认知层写一句话，人口册上根本没有这个人。
 * 三样东西于是一起坏，而且坏得很安静：
 *
 *     人际面板上显示的是 `sibling`　　　　　`callOf` 拿不到称呼，只好回退到内部 id
 *     「比你小几岁」那句话永远不显示　　　`noteFor` 先查 `personOf`，查不到就返回空串
 *     家里多了一张嘴，`members` 数不出来　没有关系边，`household` 读不到他
 *
 * 说了「家人也是人」，就得真的把他放进册子里。他有姓有名有生年，
 * 时序一推进他跟着长大，也跟着有可能没了——跟这世上别的人一样。
 *
 * @returns 玩家怎么称呼他，以及他是你的什么人
 */
export function bearKin(id: string, origin: OriginId, home: string): { calls: string; bond: Bond } {
  const people = usePeopleStore()
  const gender: Gender = Math.random() < 0.5 ? '男' : '女'
  const bond: Bond = gender === '女' ? '妹' : '弟'

  people.enroll(
    makePerson({
      id,
      // 弟妹是血亲，跟这一家同姓
      surname: houseSurname(people),
      given:
        gender === '女' ? (pick(FEMALE_GIVEN) ?? '菱儿') : (pick(MALE_GIVEN[origin]) ?? '长根'),
      gender,
      // 今年生的。他的年纪从此自己算，不必有谁去维护
      bornYear: useWorldStore().time.year,
      // 这个月生的。**必须传**——世界正看着这件事发生，掷一个月份就是编，
      // 而编出来的月份会让面板上写出「十一个月」大的新生儿
      bornMonth: useWorldStore().time.month,
      // 营生这一格空着。刚落地的孩子说不上做什么，
      // 而「还没成人」是年龄的另一种说法——年龄自己会算，不必在这儿再说一遍
      doing: undefined,
      temper: rollTemper(),
      health: randomBetween(40, 85),
      place: home,
      // 刚落地的孩子没有往事
      history: [],
    }),
  )
  people.bind('me', id, bond)
  // 生在这一户里，就是这一户的人
  people.joinHouse('home', id)

  return { calls: gender === '女' ? '妹妹' : '弟弟', bond }
}
