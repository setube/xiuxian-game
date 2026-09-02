import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { ORIGINS, SURNAMES, type Origin } from '@/content/origins'
import { PREFECTURES, type Prefecture } from '@/content/geography'
import { pick, pickWeighted, randomBetween } from '@/engine/random'

import { usePeopleStore } from './people'
import type { Attributes, FamilyMember, Gender, NarrativeBlock, Trade } from '@/types/game'

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
    const origin = rollOrigin()
    const seat = rollPrefecture()

    const trade = ref<Trade>(origin.trade)
    const gender = ref<Gender>(rollGender())
    /**
     * 州与府。皇室虽然生在京城，这两个仍然照掷——
     * 那是他日后被贬去的地方，旨意下来之前他自己也不知道有这么个府。
     */
    const province = ref(seat.province)
    const prefecture = ref(seat.name)
    /** 街巷村名这一级 */
    const locale = ref(pick(origin.locales) ?? origin.locales[0]!)
    /** 家不在州府而在京城的（只有皇室），这里存「天启 · 皇城」 */
    const capital = ref<string | null>(origin.capital ?? null)

    /** 完整门牌。三段拼出来，不再各处写死「云州 · 临江府」 */
    const home = computed(() =>
      capital.value
        ? `${capital.value} · ${locale.value}`
        : `${province.value} · ${prefecture.value} · ${locale.value}`,
    )

    const standing = ref(randomBetween(origin.standing.from, origin.standing.to))
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
        if (relation.bond === 'friend' || relation.bond === '仇') continue
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
     * 家中光景。人物面板只显示这一句——
     * 一个孩子对家境的全部认识，就是饭桌上有没有肉、冬天有没有新衣。
     */
    const outlook = computed(() => {
      if (debt.value > 0) return '欠着债。这两年家里没添过新东西。'
      if (standing.value >= 62) return '家里不缺什么。'
      if (standing.value >= 42) return '不宽裕，但过得去。'
      if (standing.value >= 26) return '紧巴。农忙时全家都得下地。'
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
      trade.value = next.trade
      gender.value = rollGender()
      province.value = nextSeat.province
      prefecture.value = nextSeat.name
      locale.value = pick(next.locales) ?? next.locales[0]!
      capital.value = next.capital ?? null
      standing.value = randomBetween(next.standing.from, next.standing.to)
      debt.value = 0
    }

    return {
      trade,
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
      pick: ['trade', 'gender', 'province', 'prefecture', 'locale', 'capital', 'standing', 'debt'],
    },
  },
)

/** 按出身取名。识字人家才用雅字，名字本身就是家世。 */
export function rollName(trade: Trade): string {
  const origin = ORIGINS.find((item) => item.trade === trade) ?? ORIGINS[0]!
  return `${pick(SURNAMES) ?? '沈'}${pick(origin.given) ?? '生'}`
}

/**
 * 取某一出身的隐藏刻度初值。
 *
 * 不含 root 与 spirit——修行资质与神魂在出生那一刻单独掷，
 * 出身管不着。那是全作唯一一处王府的孩子和农户的孩子完全平等的地方。
 */
export function originAttributes(trade: Trade): Omit<Attributes, 'root' | 'spirit'> {
  const origin = ORIGINS.find((item) => item.trade === trade) ?? ORIGINS[0]!
  return { ...origin.attributes }
}

/** 取某一出身的开场正文 */
export function originOpening(trade: Trade): readonly NarrativeBlock[] {
  const origin = ORIGINS.find((item) => item.trade === trade) ?? ORIGINS[0]!
  return origin.opening
}
