import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createId } from '@/engine/id'
import { randomBetween } from '@/engine/random'
import type { ChronicleEntry, FlagValue, GameTime, InkTone } from '@/types/game'

import { useHouseholdStore } from './household'

const DAYS_PER_MONTH = 30
const MONTHS_PER_YEAR = 12
const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR

/**
 * 出生时刻。第一年是你出生的那一年，此后 `year - 1` 就是年龄——
 * 年龄不再是一个能被单独加一的字段，它就是时序本身。
 * 生日逐世随机：同样一个雨天出生的孩子，一世是三月，一世是腊月。
 */
function birthTime(): GameTime {
  return { year: 1, month: randomBetween(1, 12), day: randomBetween(1, 30) }
}

function toAbsoluteDays(time: GameTime): number {
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
      return time.value.year - previousYear
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
      chronicle.value = []
    }

    return {
      time,
      place,
      visited,
      flags,
      chronicle,
      isNewGame,
      advanceTime,
      moveTo,
      setFlag,
      getFlag,
      hasFlag,
      record,
      reset,
    }
  },
  { persist: { key: 'xiuxian:world' } },
)
