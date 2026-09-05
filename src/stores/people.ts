import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { kinCall } from '@/engine/address'
import { createId } from '@/engine/id'
import { pick, randomBetween } from '@/engine/random'
import type {
  Acquaintance,
  Bond,
  Chapter,
  Fate,
  Gender,
  Person,
  Relation,
  Temper,
} from '@/types/game'

import { useWorldStore } from './world'

const TEMPERS: readonly Temper[] = ['谨慎', '温和', '刚硬', '精明', '木讷', '暴躁']

/**
 * 人口册。
 *
 * 这个 store 回答一个问题：**世界里的人，是不是真的存在？**
 *
 * 「父亲」不是一块插在家庭位置上的牌子，是沈怀山这个人——
 * 他有名有姓、有年纪、有脾气，出生比玩家早二十七年，
 * 而且**玩家不在场的时候他照样活着**。
 *
 * 离家做工的父亲不会变成 `father = dead`。他人在青州某县，
 * 是个商队伙计，穷，还以为自己的孩子在老家等他。
 * 几年后玩家可能在茶摊边看见一个中年男人跟伙计争价钱——
 * 系统不会跳出「【发现父亲】」，玩家得自己认出来，也可能认不出来。
 *
 * ## 三层，按「世界需不需要记住他」分
 *
 * - **纯路人**：连 id 都没有，不进这个册子。茶摊伙计、赶车的、庙会人群。
 * - **有名有姓**：玩家跟他说过话，或他做过影响玩家的事。门槛要低——
 *   重要性是结果不是出厂属性，山道上那个濒死的人是路人还是恩师，
 *   在他躺下的那一刻还不知道。
 * - **有人生**：与玩家有持续关系的，另有 history，且会自己往下过日子。
 */
export const usePeopleStore = defineStore(
  'people',
  () => {
    const world = useWorldStore()

    /** 世界记得的所有人 */
    const roster = ref<Record<string, Person>>({})
    /** 玩家认识的那些人。键同 person id */
    const known = ref<Record<string, Acquaintance>>({})
    /**
     * 关系网。
     *
     * 一条边一条记录，玩家自己也是图里的一个节点（'me'）。
     * 所以「成年后自己成家」不需要任何新机制——加两条边而已。
     *
     * 断了的关系不删，只置 until：**老乞丐养过你这件事，
     * 不因为他死了就没发生过。**
     */
    const relations = ref<Relation[]>([])

    /** 玩家认识几个人。人际面板的角标 */
    const acquaintedCount = computed(() => Object.keys(known.value).length)

    function personOf(id: string): Person | undefined {
      return roster.value[id]
    }

    /** 他今年多大。年龄是算出来的，不是存着的——跟玩家的年龄同一个道理 */
    function ageOf(id: string): number {
      const person = roster.value[id]
      return person ? Math.max(0, world.time.year - person.bornYear) : 0
    }

    /**
     * 玩家此刻会怎么称呼他。
     *
     * 知道姓名就叫姓名，不知道就用那个描述性的叫法——
     * 「渡口的青衫人」这种。这一行就是「世界事实 ≠ 玩家认知」的出口。
     *
     * 不知道姓名时还要再问一层：**家里人怎么叫，要看这人身上有没有爵位、
     * 以及这孩子是在哪儿学会说话的。** 宫里长大的孩子管爹叫「爹爹」，
     * 读书人家叫「父亲」，王府那位挂着亲王爵，于是叫「父王」，
     * 而境况表里写死的那个 `calls` 是「爹」——寻常人家那一套。
     * 这一问跟正文里 `{elder}` 走的是同一个函数（`engine/address.ts`），
     * **两边必须是同一个答案**：面板上写着「爹」而正文里叫「爹爹」，
     * 那是同一个人在同一屏上有两个名字。
     *
     * 场合这一维在这儿写死成家常，不接参数：**人际面板不是一个场合。**
     * 它是玩家随时能翻开的一张册子，翻开它的时候没有人在行礼，
     * 而册子上那个名字得是他平常叫惯的那个。
     */
    function callOf(id: string): string {
      const acquaintance = known.value[id]
      if (!acquaintance) return '一个陌生人'
      if (acquaintance.knowsName) {
        const person = roster.value[id]
        if (person) return `${person.surname}${person.given}`
      }
      for (const bond of bondsWith(id)) {
        const learnt = kinCall(bond, roster.value[id]?.rank, '家常')
        if (learnt) return learnt
      }
      return acquaintance.calls
    }

    /** 把一个人记进世界。已经在册的不动——同一个人不该被造两次 */
    function enroll(person: Person): Person {
      const existing = roster.value[person.id]
      if (existing) return existing
      roster.value = { ...roster.value, [person.id]: person }
      return person
    }

    /** 改写一个人的状态。他去了别处、丢了差事、死了，都走这里 */
    function amend(id: string, patch: Partial<Omit<Person, 'id' | 'history'>>): void {
      const person = roster.value[id]
      if (!person) return
      roster.value = { ...roster.value, [id]: { ...person, ...patch } }
    }

    /**
     * 给他的人生添一笔。
     *
     * `known` 默认 false——**事情发生了，不等于玩家知道**。
     * 父亲十八岁去过北方，这件事从那年起就是真的，
     * 玩家可能到十六岁才第一次听说，也可能一辈子不知道。
     */
    function inscribe(id: string, chapter: Omit<Chapter, 'known'> & { known?: boolean }): void {
      const person = roster.value[id]
      if (!person) return
      if (person.history.some((item) => item.id === chapter.id)) return
      roster.value = {
        ...roster.value,
        [id]: {
          ...person,
          history: [...person.history, { ...chapter, known: chapter.known ?? false }],
        },
      }
    }

    /**
     * 玩家得知了这个人过去的一件事。
     *
     * @returns 是不是头一回听说。界面据此决定要不要报一句
     */
    function recall(id: string, chapterId: string): boolean {
      const person = roster.value[id]
      if (!person) return false
      const chapter = person.history.find((item) => item.id === chapterId)
      if (!chapter || chapter.known) return false
      roster.value = {
        ...roster.value,
        [id]: {
          ...person,
          history: person.history.map((item) =>
            item.id === chapterId ? { ...item, known: true } : item,
          ),
        },
      }
      return true
    }

    /** 玩家认识了他。已经认识的只调好感 */
    function meet(id: string, calls: string, delta = 0, note?: string): boolean {
      const existing = known.value[id]
      if (existing) {
        known.value = {
          ...known.value,
          [id]: {
            ...existing,
            affinity: Math.min(100, Math.max(-100, existing.affinity + delta)),
            ...(note ? { note } : {}),
          },
        }
        return false
      }
      known.value = {
        ...known.value,
        [id]: {
          person: id,
          calls,
          knowsName: false,
          affinity: Math.min(100, Math.max(-100, delta)),
          ...(note ? { note } : {}),
        },
      }
      return true
    }

    /**
     * 玩家知道了他叫什么。
     *
     * 单独一个动作，因为「认识这个人」和「知道他的名字」是两回事——
     * 你可以跟一个人打十年交道，只知道他叫「老周」。
     */
    function learnName(id: string): boolean {
      const acquaintance = known.value[id]
      if (!acquaintance || acquaintance.knowsName) return false
      known.value = { ...known.value, [id]: { ...acquaintance, knowsName: true } }
      return true
    }

    /** 牵一条边。同样的一条不重复牵 */
    function bind(from: string, to: string, bond: Bond): void {
      if (
        relations.value.some(
          (r) => r.from === from && r.to === to && r.bond === bond && r.until === null,
        )
      )
        return
      relations.value = [
        ...relations.value,
        { id: createId('rel'), from, to, bond, since: world.time.year, until: null },
      ]
    }

    /** 这条关系到此为止。不删，只封口——它发生过 */
    function unbind(to: string, bond: Bond): void {
      relations.value = relations.value.map((r) =>
        r.to === to && r.bond === bond && r.until === null ? { ...r, until: world.time.year } : r,
      )
    }

    /** 玩家的某一类关系人。默认只取还在延续的 */
    function kinOf(bond: Bond, includeEnded = false): string[] {
      return relations.value
        .filter((r) => r.from === 'me' && r.bond === bond && (includeEnded || r.until === null))
        .map((r) => r.to)
    }

    /** 这个人是玩家的什么。一个人可能同时是好几样——姐姐也是抚养人 */
    function bondsWith(id: string): Bond[] {
      return relations.value.filter((r) => r.from === 'me' && r.to === id).map((r) => r.bond)
    }

    /**
     * 这条边牵了多少年。
     *
     * **「认识了很久」是一个世界事实，不是一个好感度。**
     * 它从 `since` 减出来，跟年龄同一个道理——存一格「相识年数」
     * 就得年年记着去加，漏一年就再也对不上了。
     *
     * 这一格存在的理由是久别重逢：一个认了你十六年的人再见到你，
     * 那声招呼跟客栈伙计的「客官住店」不是一回事，
     * 而这个分别不该由 `affinity` 来管——好感是会变的，
     * 「她认识你十六年了」这件事不会因为三年没见就变少。
     */
    function boundFor(to: string, bond: Bond): number {
      const edge = relations.value.find(
        (r) => r.from === 'me' && r.to === to && r.bond === bond && r.until === null,
      )
      return edge ? Math.max(0, world.time.year - edge.since) : 0
    }

    /** 谁把你养大的。可能是爹娘，可能是姐姐，可能是个老乞丐 */
    const guardians = computed(() => kinOf('抚养'))

    function isAlive(id: string): boolean {
      return roster.value[id]?.fate === '在'
    }

    /**
     * 让世上的人过日子。
     *
     * 时序一推进就调它。这是「NPC 不因离开玩家视野而停止存在」的落点——
     * 玩家在私塾念书的那几年，在外地做工的父亲也在老去、也在生病、
     * 也可能换个地方谋生。
     *
     * 刻意只做最朴素的一件事：老去，以及老去带来的病死。
     * 更复杂的（他会不会另娶、会不会发财）留给剧本去写，
     * 因为那些事该有正文，不该在后台悄悄发生。
     */
    function live(years: number): void {
      if (years <= 0) return
      const next: Record<string, Person> = {}
      for (const [id, person] of Object.entries(roster.value)) {
        if (person.fate !== '在') {
          next[id] = person
          continue
        }
        const age = Math.max(0, world.time.year - person.bornYear)
        // 上了年纪、底子又差的人，每年都有那么点可能过不去
        const frailty = Math.max(0, age - 45) * 0.004 + Math.max(0, 50 - person.health) * 0.0016
        let fate: Fate = person.fate
        for (let i = 0; i < years; i += 1) {
          if (Math.random() < frailty) {
            fate = '殁'
            break
          }
        }
        next[id] = fate === person.fate ? person : { ...person, fate }
      }
      roster.value = next
    }

    function reset(): void {
      roster.value = {}
      known.value = {}
      relations.value = []
    }

    return {
      roster,
      known,
      relations,
      guardians,
      acquaintedCount,
      personOf,
      ageOf,
      callOf,
      enroll,
      amend,
      inscribe,
      recall,
      meet,
      learnName,
      bind,
      unbind,
      kinOf,
      bondsWith,
      boundFor,
      isAlive,
      live,
      reset,
    }
  },
  { persist: { key: 'xiuxian:people', pick: ['roster', 'known', 'relations'] } },
)

/** 掷一个脾性 */
export function rollTemper(): Temper {
  return pick(TEMPERS) ?? '温和'
}

/** 造一个人。姓名由调用方给——名字是世界事实，不该在这里随便拍 */
export function makePerson(input: {
  id: string
  surname: string
  given: string
  gender: Gender
  bornYear: number
  doing?: string
  /** 他过的是什么日子。绝大多数人不写——他们过的就是这个家的日子 */
  living?: string
  temper?: Temper
  health?: number
  place: string
  history?: Chapter[]
}): Person {
  return {
    id: input.id,
    surname: input.surname,
    given: input.given,
    gender: input.gender,
    bornYear: input.bornYear,
    doing: input.doing,
    living: input.living,
    temper: input.temper ?? rollTemper(),
    health: input.health ?? randomBetween(40, 80),
    place: input.place,
    fate: '在',
    history: input.history ?? [],
  }
}
