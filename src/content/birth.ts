import { SURNAMES, originById } from '@/content/origins'
import {
  type Circumstance,
  keeperName,
  rollCircumstance,
  siblingGap,
} from '@/content/circumstances'
import { pick, randomBetween } from '@/engine/random'
import { makePerson, rollTemper, usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { Bond, Chapter, Gender, OriginId } from '@/types/game'

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
        // 因为这一格问的是他在做什么，不是官府认定他家是什么户
        doing: kin.doing ?? (gap > 15 ? origin.livelihood : '还没成人'),
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

  return {
    name: `${finalSurname}${pick(origin.given) ?? '生'}`,
    circumstance,
  }
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
      doing: '还没成人',
      temper: rollTemper(),
      health: randomBetween(40, 85),
      place: home,
      // 刚落地的孩子没有往事
      history: [],
    }),
  )
  people.bind('me', id, bond)

  return { calls: gender === '女' ? '妹妹' : '弟弟', bond }
}
