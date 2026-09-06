import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { createId } from '@/engine/id'
import {
  deathAfter,
  endReign,
  eraAt,
  extendReigns,
  foundDynasty,
  isBefore,
  yearMonth,
  yearsLeft,
  type YearMonth,
} from '@/engine/dynasty'
import { ERA_NAMES } from '@/content/eras'
import { COUNTY_NAMES } from '@/content/geography'
import { pick, randomBetween } from '@/engine/random'
import { residenceKindOf, settlementOf, siblingsOf } from '@/engine/places'
import { newRegion, tickRegion, type Region } from '@/engine/worldclock'
import type {
  ChronicleEntry,
  FlagValue,
  GameTime,
  InkTone,
  Place,
  RegionState,
  Reign,
  ResidenceKind,
  SettlementKind,
} from '@/types/game'

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
    const visited = shallowRef<string[]>([household.home])
    const flags = ref<Record<string, FlagValue>>({})
    /**
     * 各个府此刻的光景。
     *
     * 只有玩家待过的府才在这里——没必要给整个天下记账，
     * 一个人一辈子也走不了几个地方。
     */
    const regions = shallowRef<Record<string, Region>>({})
    /** 玩家出生那一年。年龄由它和当下时序算出来 */
    const bornYear = ref(0)
    /**
     * 玩家出生在那一年的几月。
     *
     * 光有年份，头一年只能写成「〇岁」——一个刚出生的婴儿，
     * 面板上写着一个〇，那不是年龄，那是没算出来。
     * 有了月，第一年才说得出「三个月」「快一岁了」。
     *
     * 只有第一年用得着它。往后年龄按整年算，跟从前一样。
     */
    const bornMonth = ref(1)
    const chronicle = shallowRef<ChronicleEntry[]>([])
    /**
     * 王朝史。规则在 `engine/dynasty.ts`，词库在 `content/eras.ts`。
     *
     * 立基时往前生成一两百年、往后生成一百多年，整段存档。
     * 年号只管给人看和给人说；判定一律照旧读绝对年。
     */
    const reigns = shallowRef<Reign[]>([])
    /** 王朝史要生成到哪一年。玩家活不过一百二十岁，往后留够就行 */
    const DYNASTY_HORIZON = 130
    /**
     * 地域。只有玩家身边那几处：他的府、县、镇或城、村或街、宅，邻村，邻县。
     * 不是整个天下——一个人一辈子也走不了几个地方。规矩见 `types/game.ts` 的 `Place`。
     */
    const places = shallowRef<Record<string, Place>>({})
    /** 脚下那一处宅、寺、宫。讨饭的、逃难的没有，是 null */
    const residence = ref<string | null>(null)
    /** 归在哪一级聚落。没有居所的人也有聚落——他在哪个镇上讨饭 */
    const settlement = ref<string | null>(null)

    const isNewGame = computed(() => chronicle.value.length === 0)

    /**
     * 推进时序。年月按日历叠加，日按绝对天数叠加。
     * @returns 跨过的年数，供角色年龄同步
     */
    function advanceTime(delta: TimeDelta): number {
      const previousYear = time.value.year
      const previousMonth = time.value.month

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
      // 皇帝也在老。先看宫里那一位该不该定下来，再看这一步有没有跨过谁的死
      settleThrone()
      announceSuccessions({ year: previousYear, month: previousMonth }, yearMonth(time.value))
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
      bornMonth.value = time.value.month
      seedDynasty()
      runWorld(Math.max(0, time.value.year - 1), true)
    }

    /**
     * 立一个王朝，玩家生在它的中后段。
     *
     * 立国在出生前一百二十到两百年——参照的是嘉靖—万历，那正是一个王朝
     * 一百五十到两百五十年上的光景。往前生这么多，老人口中才有
     * 「那是承和年间的事了」可说；往后生一百三十年，玩家怎么活也活不出去。
     *
     * ## 宫里那一支的父亲不掷
     *
     * 生在宫里的孩子，龙椅上坐着的是他爹。他爹什么时候崩，`royal.ts` 说了算
     * （十三到十五岁那一卷，掷出「倾」的才崩）——所以这里把那一位的 `death`
     * 抹成 null，把他之后生成好的几位都删掉，等 `succession` 那一笔来填。
     * 到十六岁那卷窗口过了他还没崩，`settleThrone` 再替世界掷一个。
     */
    function seedDynasty(): void {
      const names = ERA_NAMES.map((one) => one.text)
      const founding = time.value.year - randomBetween(120, 200)
      let history = foundDynasty(founding, time.value.year + DYNASTY_HORIZON, names)

      if (household.origin === 'court') {
        const birth = yearMonth(time.value)
        const i = history.findIndex(
          (r) => !isBefore(birth, r.accession) && (!r.death || isBefore(birth, r.death)),
        )
        if (i >= 0) history = [...history.slice(0, i), { ...history[i]!, death: null }]
      }
      reigns.value = history
    }

    /**
     * 宫里那一支：父亲的死一直悬着，到十六岁那卷窗口过了还没崩，就替世界定一个。
     *
     * 不抽「还在位几年」——头一版抽的是一到二十年，那是一个没有依据的分布，
     * 几年之后会露出游戏数学。现在问的是**这个人此刻几岁、还能活多久**
     * （`yearsLeft`：寿数照明代抽，减去他现在的岁数），剩余在位年数由此推出。
     * 他四十二岁即位、在位十四年、今年五十六，抽到寿数六十三，就还剩七年。
     */
    function settleThrone(): void {
      const pending = reigns.value.findIndex((r) => r.death === null)
      if (pending < 0 || time.value.year - bornYear.value < 16) return
      const reign = reigns.value[pending]!
      const now = yearMonth(time.value)
      const death = deathAfter(now, yearsLeft(reign.born, now))
      reigns.value = extendReigns(
        [...reigns.value.slice(0, pending), { ...reign, death }],
        time.value.year + DYNASTY_HORIZON,
        ERA_NAMES.map((one) => one.text),
      )
    }

    /**
     * 这一步跨过了谁的死，就记一笔。所有出身都听得见——国丧是天下的事。
     *
     * 逾年改元的那一句是「诏明年改元某某」；即位当年就没了的（泰昌那种），
     * 说的是「诏以本年为某某元年」。
     */
    function announceSuccessions(before: YearMonth, after: YearMonth): void {
      reigns.value.forEach((reign, i) => {
        if (!reign.death) return
        if (!isBefore(before, reign.death)) return
        if (isBefore(after, reign.death)) return
        const next = reigns.value[i + 1]
        if (!next) return record('先帝崩。', 'deep')
        const decree =
          next.eraFrom.year === reign.death.year
            ? `诏以本年为${next.era}元年。`
            : `诏明年改元${next.era}。`
        record(`先帝崩。皇太子即位，${decree}`, 'deep')
      })
    }

    /** 那一刻用的年号和第几年。给标题、编年、对话用；判定不读它 */
    function eraOf(at: GameTime): { name: string; year: number } | null {
      return eraAt(reigns.value, yearMonth(at))
    }

    /**
     * 在位的这一位此刻崩了。宫里那一支的「父皇大行」从这儿接进王朝史。
     *
     * `quiet` 是给内容用的：`royal.ts` 自己把这件事说了，这里不再记一笔，
     * 否则编年上会挨着两行「父皇大行」「先帝崩」。
     */
    function succeed(quiet = false): void {
      const at = yearMonth(time.value)
      reigns.value = endReign(
        reigns.value,
        at,
        time.value.year + DYNASTY_HORIZON,
        ERA_NAMES.map((one) => one.text),
      )
      if (quiet) return
      const i = reigns.value.findIndex(
        (r) => r.death && !isBefore(at, r.death) && !isBefore(r.death, at),
      )
      const next = reigns.value[i + 1]
      record(next ? `先帝崩。皇太子即位，诏明年改元${next.era}。` : '先帝崩。', 'deep')
    }

    function moveTo(next: string): void {
      place.value = next
      if (!visited.value.includes(next)) visited.value = [...visited.value, next]
    }

    /**
     * 立一面旗子。
     *
     * ## 这里是就地改，不是整份换掉
     *
     * 从前写的是 `flags.value = { ...flags.value, [key]: value }`。那是
     * 不可变更新的标准写法，读起来也干净，**代价是每立一面旗子就把整袋旗子
     * 重抄一遍**——而旗子是随着一生只增不减的，抄的份量一年比一年重。
     *
     * CPU 采样量到它占整个运行时的 11.7%，比条件求值、效果结算都多。
     * 那不是哪一处写错了，是这一行本身就是平方级的：n 面旗子要抄 n 次。
     *
     * 就地改在 Vue 3 里是安全的，两件事托着：`ref` 装对象会做深层响应式，
     * **改一格和换一整份同样会触发依赖**；而 Proxy 也认得「新增一个键」，
     * 这一点跟 Vue 2 不同，那边才需要 `$set`。
     *
     * 还有一条是这个仓库自己的：**整袋 `flags` 没有任何外人直接读**，
     * `world.ts` 之外一律走 `hasFlag` / `getFlag`。所以没有谁会拿对象身份
     * 变没变当信号——那正是不可变更新在别处唯一真正买到的东西。
     * 哪天有人要 `watch` 这一袋，记得写 `{ deep: true }`。
     */
    function setFlag(key: string, value: FlagValue): void {
      flags.value[key] = value
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

    /** 记一处地方。已在册的不动 */
    function enrollPlace(place: Place): void {
      if (places.value[place.id]) return
      places.value = { ...places.value, [place.id]: place }
    }

    function placeOf(id: string): Place | undefined {
      return places.value[id]
    }

    /** 住下来。`home` 是脚下那一处（可以没有），`at` 是归的聚落 */
    function settle(home: string | null, at: string): void {
      residence.value = home
      settlement.value = at
    }

    /** 脚下这一处是什么样的地方 */
    function residenceKind(): ResidenceKind {
      return residenceKindOf(residence.value ? places.value[residence.value] : null)
    }

    /** 归在哪一级聚落。立基之前是 null */
    function settlementKind(): SettlementKind | null {
      if (!settlement.value) return null
      const found = settlementOf(places.value, settlement.value)
      return found ? (found.kind as SettlementKind) : null
    }

    /** 邻村：同一个镇底下的别的村。住在城里的人没有邻村 */
    function nearbyVillages(): Place[] {
      if (!settlement.value) return []
      const here = places.value[settlement.value]
      if (!here || here.kind !== '村') return []
      return siblingsOf(places.value, here.id, '村')
    }

    /**
     * 搬到府城里的一处宅子。抄家、削爵、逃荒之后走这里。
     *
     * 宫里出来的人原本那棵树是京师的，府这一棵还没立——所以府、县、城
     * 缺哪一级就立哪一级。原来那处宫、王府还在册上：他从那儿搬走了，
     * 那地方没有消失。
     */
    function resettle(prefectureName: string, locale: string): void {
      const household = useHouseholdStore()
      if (!places.value['prefecture']) {
        enrollPlace({ id: 'prefecture', name: prefectureName, kind: '府', within: null })
      }
      if (!places.value['county']) {
        enrollPlace({
          id: 'county',
          name: pick(COUNTY_NAMES) ?? '清平县',
          kind: '县',
          within: 'prefecture',
        })
      }
      if (!places.value['city']) {
        enrollPlace({ id: 'city', name: `${household.prefecture}城`, kind: '城', within: 'county' })
      }
      const id = `home-${Object.keys(places.value).length}`
      enrollPlace({ id, name: locale, kind: '宅', within: 'city' })
      settle(id, 'city')
    }

    /** setup store 不自带 $reset，须自行定义。家世已由 household 先行重掷。 */
    function reset(): void {
      time.value = birthTime()
      place.value = household.home
      visited.value = [household.home]
      flags.value = {}
      regions.value = {}
      bornYear.value = 0
      bornMonth.value = 1
      chronicle.value = []
      reigns.value = []
      places.value = {}
      residence.value = null
      settlement.value = null
    }

    return {
      time,
      place,
      visited,
      flags,
      regions,
      bornYear,
      bornMonth,
      chronicle,
      reigns,
      eraOf,
      succeed,
      places,
      residence,
      settlement,
      enrollPlace,
      placeOf,
      settle,
      residenceKind,
      settlementKind,
      nearbyVillages,
      resettle,
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
