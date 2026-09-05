import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { type Living, livingById, livingOfOrigin } from '@/content/living'
import { ORIGINS, SURNAMES, originById, type Origin } from '@/content/origins'
import { PREFECTURES, type Prefecture } from '@/content/geography'
import { pick, pickWeighted, randomBetween } from '@/engine/random'

import { usePeopleStore } from './people'
import type {
  Attributes,
  Business,
  Census,
  FamilyMember,
  Gender,
  Livelihood,
  NarrativeBlock,
  OriginId,
  Station,
} from '@/types/game'

const STANDING_MIN = 0
const STANDING_MAX = 100

/** 低于此线，家里就供不起读书了 */
export const STANDING_SCHOOLABLE = 42

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 掷定这一世的出身。玩家看不到这一步，只会读到「你生在柳溪村」。 */
function rollOrigin(): Origin {
  return pickWeighted(ORIGINS, (origin) => origin.weight) ?? ORIGINS[0]!
}

/** 男女各一半。跟出身一样，这一掷玩家也参与不了 */
function rollGender(): Gender {
  return Math.random() < 0.5 ? '男' : '女'
}

/**
 * 掷定这一世生在哪个府。
 *
 * 跟出身分开掷：生在哪个府，跟你家做什么营生没有关系。
 * 两边一组合，一个农家子就可能生在江陵府的杏花坞，
 * 也可能生在东莱府的下河屯。
 */
function rollPrefecture(): Prefecture {
  return pickWeighted(PREFECTURES, (item) => item.weight) ?? PREFECTURES[0]!
}

/**
 * 家。
 *
 * standing 与 debt 是隐藏刻度，绝不上界面——「家道中落」不是一个词条，
 * 是这两个数连着几年往下走，最后你被叫去下地、私塾再没去成的那一串后果。
 * 玩家在人物面板看到的只有一句「家中光景」，和父母各自在做什么。
 */
export const useHouseholdStore = defineStore(
  'household',
  () => {
    const rolled = rollOrigin()
    const seat = rollPrefecture()

    /**
     * 出身那五格。**掷出来的是一整行，存下来的是五个各自会变的格子。**
     *
     * 分开存不是为了整齐，是因为它们变的时机差得很远。可「时机不同」
     * 这句话得有出处，所以照眼下真跑出来的样子说：
     *
     *     station     旨意那两处写它（除封、削爵）——五格里唯一有写手的
     *     census      没有任何一处写它，也没有任何一条 requires 读它
     *     livelihood  没有写手。读它的是攀谈、书摊、正文里的 {livelihood}
     *     business    没有写手。读它的是药铺那几卷和师承那一处
     *     origin      掷定就不动，本来也不该有写手
     *
     * 削爵那天这一对值劈开：`station` 落到「寻常」，`census` 仍是「宗室」。
     * **那一刻是这五格分开存的全部现有证据**——上一版共用一个 `trade`，
     * 那天只能整格换掉，于是「门第没了，玉牒上的名字还在」写不出来。
     *
     * 「铺子盘出去 `business` 变 null」「改行去码头扛活 `livelihood` 变」
     * 这两件事眼下都还没有内容写，格子先空着等第一个使用者，
     * 不预先造一条效果去填它。
     *
     * `origin` 是掷定就不动的那一格：它记的是「这一世从哪一行掷出来的」，
     * 不是「现在过成什么样」。教养、开场正文、起名用字都从它查。
     */
    const origin = ref<OriginId>(rolled.id)
    const census = ref<Census>(rolled.census)
    const livelihood = ref<Livelihood>(rolled.livelihood)
    const business = ref<Business | null>(rolled.business)
    const station = ref<Station>(rolled.station)
    const gender = ref<Gender>(rollGender())
    /**
     * 州与府。皇室虽然生在京城，这两个仍然照掷——
     * 那是他日后被贬去的地方，旨意下来之前他自己也不知道有这么个府。
     */
    const province = ref(seat.province)
    const prefecture = ref(seat.name)
    /** 街巷村名这一级 */
    const locale = ref(pick(rolled.locales) ?? rolled.locales[0]!)
    /** 家不在州府而在京城的（只有皇室），这里存「京师 · 皇城」 */
    const capital = ref<string | null>(rolled.capital ?? null)

    /** 完整门牌。三段拼出来，不再各处写死「云州 · 临江府」 */
    const home = computed(() =>
      capital.value
        ? `${capital.value} · ${locale.value}`
        : `${province.value} · ${prefecture.value} · ${locale.value}`,
    )

    const standing = ref(randomBetween(rolled.standing.from, rolled.standing.to))
    const debt = ref(0)
    /**
     * 家里还有谁。
     *
     * 从关系图上读出来，不再写死「父亲、母亲」——
     * 有人跟着长姐过，有人是老乞丐养大的，有人一个血亲也没有。
     * 谁在这个家里，是出生那一刻由境况生成的事实。
     */
    const members = computed<FamilyMember[]>(() => {
      const people = usePeopleStore()
      const seen = new Set<string>()
      const list: FamilyMember[] = []
      for (const relation of people.relations) {
        if (relation.from !== 'me' || relation.until !== null) continue
        if (relation.bond === '友' || relation.bond === '仇') continue
        if (seen.has(relation.to)) continue
        seen.add(relation.to)
        list.push({
          person: relation.to,
          relation: people.known[relation.to]?.calls ?? relation.bond,
        })
      }
      return list
    })

    /** 供得起读书吗。启蒙那几年反复问到 */
    const canSchool = computed(() => standing.value >= STANDING_SCHOOLABLE && debt.value === 0)

    /** 家里还剩几个大人。劳力少了，孩子就得顶上 */
    const livingParents = computed(() => {
      const people = usePeopleStore()
      return members.value.filter((m) => people.isAlive(m.person)).length
    })

    /**
     * 这家人过的是什么日子。
     *
     * 剧本靠它写生活细节，而不是靠出身猜——「父亲在檐下修一把锄头」
     * 这种句子从前默认所有人生都来自农户，皇子读到就成了世界事实自相矛盾。
     *
     * ## 解析有先后，而且这个先后是内容逼出来的
     *
     *     先看有没有把你养大的人，那个人过的是什么日子
     *     ← 没有，才看这家人过的是什么日子
     *
     * 老乞丐捡去养大的孩子，籍和业仍然是他生在的那一家的（可能是农户），
     * 可他过的是讨饭的日子——**户籍不是生活**。
     * 反过来，姐姐把你拉扯大的，抚养人身上没有单独的营生，
     * 于是自然落回这个家，而那正是对的：家还是那个家。
     *
     * 这跟 `interpolate.ts` 的 `callByBond(['生父','抚养','生母'])`
     * 是同一条纪律：**先问关系网，再落笔。**
     *
     * ## 「那个人过的是什么日子」从前是拿营生当键查出来的
     *
     * 从前这里查的是一张 `doing → Living` 的表
     * （`讨饭的 → BEGGING`、`逃难路上的人 → ADRIFT`）。
     * 那让 `doing` 一格说了两件事：面板上给人读的一句话，和一个判定用的键。
     * 当时的注释里写着「这里改一个字，那边就查不到，静默落回这个家」——
     * 一句写给人的警告，而没有任何机器看着它。
     *
     * 后来真踩中了：「逃难路上的人」是一句会过期的话（逃难会结束），
     * 删掉它的那一刻 `adrift` 那种日子跟着一起没了，界面上什么也看不出来。
     * 现在读的是 `Person.living` 那一格，两件事各归各的。
     */
    const living = computed<Living>(() => {
      const people = usePeopleStore()
      for (const id of people.guardians) {
        if (!people.isAlive(id)) continue
        const id_ = people.personOf(id)?.living
        // 拼错的 id 在这里静默落回这个家，跟 `livingById` 那边同一种降级。
        // 拦它的是 `scripts/verify.ts`：全库的 living id 都得解析得到
        const keeper = id_ ? livingById(id_) : undefined
        if (keeper) return keeper
      }
      return livingOfOrigin(origin.value)
    })

    /**
     * 家中光景。人物面板只显示这一句——
     * 一个孩子对家境的全部认识，就是饭桌上有没有肉、冬天有没有新衣。
     *
     * 这一句对**所有出身**都成立，所以一个营生词也不能出现。
     * 从前那一档写的是「农忙时全家都得下地」，而它挂在人物面板上，
     * 十一种出身一律可见——被贬出宫的皇子照样读到自己要下地。
     */
    const outlook = computed(() => {
      if (debt.value > 0) return '欠着债。这两年家里没添过新东西。'
      if (standing.value >= 62) return '家里不缺什么。'
      if (standing.value >= 42) return '不宽裕，但过得去。'
      if (standing.value >= 26) return '紧巴。家里没有闲人。'
      return '揭不开锅。'
    })

    function shiftStanding(delta: number): void {
      standing.value = clamp(standing.value + delta, STANDING_MIN, STANDING_MAX)
    }

    function shiftDebt(delta: number): void {
      debt.value = Math.max(0, debt.value + delta)
    }

    /**
     * 搬家。抄家、削爵、逃荒之后，「回家」指向的地方就不一样了。
     *
     * 接完整门牌，拆回三段存着——一旦搬了家，京城那一档就作废：
     * 被贬出宫的人，家在城南那处小院，不在东宫。
     */
    function moveHome(place: string): void {
      const parts = place.split('·').map((part) => part.trim())
      capital.value = null
      if (parts.length >= 3) {
        province.value = parts[0]!
        prefecture.value = parts[1]!
        locale.value = parts.slice(2).join(' · ')
        return
      }
      // 段数不够就只当换了门牌，州府不动
      locale.value = parts[parts.length - 1] ?? place
    }

    function isAlive(id: string): boolean {
      return usePeopleStore().isAlive(id)
    }

    /** 重开一世：连出身、州府一并重掷，不是把同一个人再演一遍 */
    function reset(): void {
      const next = rollOrigin()
      const nextSeat = rollPrefecture()
      origin.value = next.id
      census.value = next.census
      livelihood.value = next.livelihood
      business.value = next.business
      station.value = next.station
      gender.value = rollGender()
      province.value = nextSeat.province
      prefecture.value = nextSeat.name
      locale.value = pick(next.locales) ?? next.locales[0]!
      capital.value = next.capital ?? null
      standing.value = randomBetween(next.standing.from, next.standing.to)
      debt.value = 0
    }

    return {
      origin,
      census,
      livelihood,
      business,
      station,
      gender,
      province,
      prefecture,
      locale,
      capital,
      home,
      standing,
      debt,
      members,
      canSchool,
      livingParents,
      living,
      outlook,
      shiftStanding,
      shiftDebt,
      moveHome,
      isAlive,
      reset,
    }
  },
  {
    // home 是派生值，存了会在恢复时盖掉 computed。存的是拼它的那三段
    persist: {
      key: 'xiuxian:household',
      pick: [
        'origin',
        'census',
        'livelihood',
        'business',
        'station',
        'gender',
        'province',
        'prefecture',
        'locale',
        'capital',
        'standing',
        'debt',
      ],
    },
  },
)

/** 按出身取名。识字人家才用雅字，名字本身就是家世。 */
export function rollName(id: OriginId): string {
  return `${pick(SURNAMES) ?? '沈'}${pick(originById(id).given) ?? '生'}`
}

/**
 * 取某一出身的隐藏刻度初值。
 *
 * 不含 root 与 spirit——修行资质与神魂在出生那一刻单独掷，
 * 出身管不着。那是全作唯一一处王府的孩子和农户的孩子完全平等的地方。
 */
export function originAttributes(id: OriginId): Omit<Attributes, 'root' | 'spirit'> {
  return { ...originById(id).attributes }
}

/** 取某一出身的开场正文 */
export function originOpening(id: OriginId): readonly NarrativeBlock[] {
  return originById(id).opening
}
