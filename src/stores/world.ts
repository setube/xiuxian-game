import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createId } from '@/engine/id'
import { randomBetween } from '@/engine/random'
import { newRegion, tickRegion, type Region } from '@/engine/worldclock'
import type { ChronicleEntry, FlagValue, GameTime, InkTone, RegionState } from '@/types/game'

import { useHouseholdStore } from './household'

const DAYS_PER_MONTH = 30
const MONTHS_PER_YEAR = 12
const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR

/**
 * 玩家出生的年份。
 *
 * 世界从第一年就开始跑了，玩家生在第几年是掷出来的——
 * **两个玩家进入的是同一个世界，只是人生起点不同。**
 * 一个生在第九年的旱季，一个生在第十七年商路刚通的时候。
 *
 * 这也是「世界先于玩家存在」最直接的一处：他睁开眼时，
 * 这个府已经有了十几年的历史，而那些事跟他一点关系也没有。
 */
const WORLD_HEAD_START = { from: 6, to: 28 }

function birthTime(): GameTime {
  return {
    year: randomBetween(WORLD_HEAD_START.from, WORLD_HEAD_START.to),
    month: randomBetween(1, 12),
    day: randomBetween(1, 30),
  }
}

/**
 * 把一个日子换成「从头数起第几天」。
 *
 * 放出来是给 `engine/tutelage.ts` 用的：有些事不看你练了多少回，
 * 只看从那一天到今天过去了多少日子。**两件事不能用同一个数表示**，
 * 所以那边不能拿 `tries` 凑合，得真的会算日子。
 */
export function toAbsoluteDays(time: GameTime): number {
  return (time.year - 1) * DAYS_PER_YEAR + (time.month - 1) * DAYS_PER_MONTH + (time.day - 1)
}

function fromAbsoluteDays(total: number): GameTime {
  const clamped = Math.max(0, total)
  const year = Math.floor(clamped / DAYS_PER_YEAR) + 1
  const withinYear = clamped % DAYS_PER_YEAR
  const month = Math.floor(withinYear / DAYS_PER_MONTH) + 1
  const day = (withinYear % DAYS_PER_MONTH) + 1
  return { year, month, day }
}

export interface TimeDelta {
  years?: number
  months?: number
  days?: number
}

/**
 * 世界状态：时序、地点、足迹、旗标、编年。
 *
 * 时与地常驻在状态栏上，因此它们的变化不再往正文里写回执——
 * 界面上一直看得见的东西，不必在文中再说一遍。
 */
export const useWorldStore = defineStore(
  'world',
  () => {
    const household = useHouseholdStore()

    const time = ref<GameTime>(birthTime())
    const place = ref(household.home)
    /** 到过的地方，按先后排列。世界面板据此呈现「你走过哪里」 */
    const visited = ref<string[]>([household.home])
    const flags = ref<Record<string, FlagValue>>({})
    /**
     * 各个府此刻的光景。
     *
     * 只有玩家待过的府才在这里——没必要给整个天下记账，
     * 一个人一辈子也走不了几个地方。
     */
    const regions = ref<Record<string, Region>>({})
    /** 玩家出生那一年。年龄由它和当下时序算出来 */
    const bornYear = ref(0)
    const chronicle = ref<ChronicleEntry[]>([])

    const isNewGame = computed(() => chronicle.value.length === 0)

    /**
     * 推进时序。年月按日历叠加，日按绝对天数叠加。
     * @returns 跨过的年数，供角色年龄同步
     */
    function advanceTime(delta: TimeDelta): number {
      const previousYear = time.value.year

      const monthIndex =
        (time.value.year - 1) * MONTHS_PER_YEAR +
        (time.value.month - 1) +
        (delta.years ?? 0) * MONTHS_PER_YEAR +
        (delta.months ?? 0)
      const shifted: GameTime = {
        year: Math.floor(monthIndex / MONTHS_PER_YEAR) + 1,
        month: (monthIndex % MONTHS_PER_YEAR) + 1,
        day: time.value.day,
      }

      time.value = fromAbsoluteDays(toAbsoluteDays(shifted) + (delta.days ?? 0))
      const years = time.value.year - previousYear
      // 时序一走，世界跟着走。玩家在私塾念书的那几年，
      // 外头的年景也在变——他多半只从米价上感觉得到
      if (years > 0) runWorld(years)
      return years
    }

    /** 玩家所在那个府此刻的光景 */
    function regionHere(): Region {
      const household = useHouseholdStore()
      const key = household.prefecture
      if (!regions.value[key]) regions.value = { ...regions.value, [key]: newRegion() }
      return regions.value[key]!
    }

    /** 问一句这个府现在怎么样。Condition 与剧本都走这里 */
    function regionState(): RegionState {
      return regionHere().state
    }

    /**
     * 让世界过若干年。
     *
     * 玩家推进时序时跟着调，出生之前也跑——
     * 世界不会因为玩家还没出生就停着。
     *
     * @param silent 出生前那些年不进编年史。玩家不该「记得」自己出生前的事，
     *               但那些年确实发生过，区域状态就是它们留下的
     */
    function runWorld(years: number, silent = false): void {
      if (years <= 0) return
      const household = useHouseholdStore()
      const key = household.prefecture
      let region = regions.value[key] ?? newRegion()
      const startYear = time.value.year - years

      for (let i = 0; i < years; i += 1) {
        const result = tickRegion(region, startYear + i)
        region = result.region
        if (silent) continue
        for (const line of result.chronicles) record(line, 'faint')
      }
      regions.value = { ...regions.value, [key]: region }
    }

    /**
     * 把世界推到玩家出生那一天。
     *
     * 出生前的那些年不写进编年史——玩家不该「记得」自己出生前的事。
     * 但它们确实发生过：他睁开眼时这个府是什么光景，就是那些年的结果。
     */
    function seedHistory(): void {
      bornYear.value = time.value.year
      runWorld(Math.max(0, time.value.year - 1), true)
    }

    function moveTo(next: string): void {
      place.value = next
      if (!visited.value.includes(next)) visited.value = [...visited.value, next]
    }

    function setFlag(key: string, value: FlagValue): void {
      flags.value = { ...flags.value, [key]: value }
    }

    function getFlag(key: string): FlagValue | undefined {
      return flags.value[key]
    }

    function hasFlag(key: string): boolean {
      return flags.value[key] !== undefined && flags.value[key] !== false
    }

    /** 记一笔大事。时间戳取当下时序。 */
    function record(text: string, tone?: InkTone): void {
      const entry: ChronicleEntry = {
        id: createId('chr'),
        time: { ...time.value },
        text,
        ...(tone ? { tone } : {}),
      }
      chronicle.value = [...chronicle.value, entry]
    }

    /** setup store 不自带 $reset，须自行定义。家世已由 household 先行重掷。 */
    function reset(): void {
      time.value = birthTime()
      place.value = household.home
      visited.value = [household.home]
      flags.value = {}
      regions.value = {}
      bornYear.value = 0
      chronicle.value = []
    }

    return {
      time,
      place,
      visited,
      flags,
      regions,
      bornYear,
      chronicle,
      isNewGame,
      advanceTime,
      moveTo,
      regionState,
      runWorld,
      seedHistory,
      setFlag,
      getFlag,
      hasFlag,
      record,
      reset,
    }
  },
  { persist: { key: 'xiuxian:world' } },
)
