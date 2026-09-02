import { ORIGINS, SURNAMES } from '@/content/origins'
import { pick, randomBetween } from '@/engine/random'
import { makePerson, rollTemper } from '@/stores/people'
import type { Chapter, Gender, Person, Trade } from '@/types/game'

/**
 * 父母。
 *
 * 他们不是「父亲」这个位置上插着的两块牌子，是两个人：
 * 沈怀山，二十七岁，农户，谨慎；柳清荷，二十四岁，农妇，温和。
 * 他们在玩家出生之前就已经活了二十几年，**那些年发生的事也是真的**——
 * 只是玩家一开始一件都不知道。
 *
 * 父亲十八岁跟商队去过北方，二十一岁在路上遇见过一个落魄修士。
 * 这两件事从发生那天起就写在他的人生里，玩家可能到十六岁才第一次听说，
 * 也可能一辈子不知道。这正是「世界事实 ≠ 玩家认知」在人身上的样子。
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

/** 父亲的名。按出身取字，跟玩家取名同一个道理：名字本身就是家世 */
const FATHER_GIVEN: Record<Trade, readonly string[]> = {
  农户: ['怀山', '大有', '长根', '春发', '守田'],
  猎户: ['铁山', '虎生', '老岩', '青松', '得胜'],
  匠户: ['文柏', '守成', '直方', '斧头', '砚生'],
  商户: ['敬堂', '万金', '瑞丰', '通海', '德昌'],
  客栈: ['来顺', '迎宾', '安平', '广通', '四海'],
  酒楼: ['庆丰', '醉山', '满堂', '和鼎', '德昌'],
  药铺: ['济仁', '和甫', '济安', '慎之', '存德'],
  镖局: ['震山', '威远', '镇江', '雄飞', '定邦'],
  官宦: ['文渊', '希圣', '承宗', '维桢', '敬修'],
  王府: ['载德', '崇礼', '守正', '恪勤', '慎行'],
  皇室: ['明煦', '承乾', '昭宁', '景元', '嘉佑'],
}

/**
 * 父亲年轻时可能有过的事。
 *
 * 掷两三件出来，全部 `known: false`——它们是真的，但玩家不知道。
 * 后面某次闲聊、某个旧物、某个外人的一句话，才会把其中一件翻出来。
 *
 * 「跟商队去过北方」和「遇见过一个落魄修士」这两件不是随便写的：
 * 前者解释了他为什么会说出「不该问的别问」，
 * 后者是这个游戏里最要紧的一根暗线——**你爹其实见过修士，
 * 而他一辈子没跟你提过。**
 */
const FATHER_PAST: readonly { id: string; atAge: number; what: string; weight: number }[] = [
  { id: 'north-journey', atAge: 18, what: '年轻时跟商队去过一趟北方，走了大半年。', weight: 30 },
  { id: 'met-adept', atAge: 21, what: '在路上遇见过一个落魄修士，同行了几日。', weight: 14 },
  { id: 'lost-brother', atAge: 16, what: '有过一个兄长，那年发大水没了。', weight: 22 },
  { id: 'old-debt', atAge: 20, what: '替人担过一笔债，还了三年。', weight: 20 },
  { id: 'refused-match', atAge: 22, what: '本来说的是另一门亲事，后来没成。', weight: 18 },
  { id: 'soldiered', atAge: 19, what: '被征去修过一年河堤。', weight: 24 },
  { id: 'saw-killing', atAge: 23, what: '亲眼见过一场械斗，死了人。', weight: 16 },
]

const MOTHER_PAST: readonly { id: string; atAge: number; what: string; weight: number }[] = [
  {
    id: 'mother-learned',
    atAge: 12,
    what: '小时候跟兄长认过几个字，后来忘得差不多了。',
    weight: 26,
  },
  { id: 'mother-lost-child', atAge: 21, what: '在你之前还有过一个孩子，没能留住。', weight: 20 },
  { id: 'mother-far-home', atAge: 20, what: '娘家在很远的地方，出嫁以后再没回去过。', weight: 24 },
  { id: 'mother-herbs', atAge: 15, what: '跟一个走方郎中学过认草药。', weight: 18 },
  { id: 'mother-famine', atAge: 9, what: '小时候逃过一次荒，那年饿死了很多人。', weight: 22 },
]

/** 从池子里挑几件互不重复的往事 */
function rollPast(
  pool: readonly { id: string; atAge: number; what: string; weight: number }[],
  count: number,
): Chapter[] {
  const remaining = [...pool]
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
    // known: false —— 事情发生了，不等于玩家知道
    picked.push({ id: chosen.id, atAge: chosen.atAge, what: chosen.what, known: false })
  }
  return picked.sort((a, b) => a.atAge - b.atAge)
}

export interface Parents {
  father: Person
  mother: Person
}

/**
 * 造这一世的父母。
 *
 * 玩家出生在世界纪年第一年，所以父亲生于「1 减去他此刻的年纪」——
 * 他二十七岁那年有了你，这件事在时间轴上是实打实的。
 */
export function makeParents(trade: Trade, surname: string, home: string): Parents {
  const origin = ORIGINS.find((item) => item.trade === trade) ?? ORIGINS[0]!
  const fatherAge = randomBetween(22, 36)
  const motherAge = randomBetween(19, fatherAge - 1)

  const father = makePerson({
    id: 'father',
    surname,
    given: pick(FATHER_GIVEN[trade]) ?? '怀山',
    gender: '男' as Gender,
    bornYear: 1 - fatherAge,
    trade: origin.trade,
    temper: rollTemper(),
    health: randomBetween(45, 85),
    place: home,
    history: rollPast(FATHER_PAST, randomBetween(2, 3)),
  })

  const mother = makePerson({
    id: 'mother',
    // 出嫁从夫姓在这个世界里只用于称呼，她本姓另算——
    // 「柳氏」这三个字里，「柳」是她自己的
    surname: pick(SURNAMES.filter((item) => item !== surname)) ?? '柳',
    given: pick(FEMALE_GIVEN) ?? '清荷',
    gender: '女' as Gender,
    bornYear: 1 - motherAge,
    trade: `${origin.trade}的当家娘子`,
    temper: rollTemper(),
    health: randomBetween(40, 78),
    place: home,
    history: rollPast(MOTHER_PAST, randomBetween(1, 2)),
  })

  return { father, mother }
}
