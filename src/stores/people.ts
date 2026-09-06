import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { kinCall, neighbourCall } from '@/engine/address'
import { createId } from '@/engine/id'
import { pick, randomBetween } from '@/engine/random'
import type {
  Acquaintance,
  Adjacency,
  Bond,
  Chapter,
  Fate,
  Gender,
  House,
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
    /**
     * 世界上别的人家。玩家自家不在这里（它在 `household` 那个仓库），
     * 邻接边里用 `'home'` 指它。见 `types/game.ts` 的 `House`。
     */
    const houses = ref<Record<string, House>>({})
    /** 户与户相邻。独立事实，不从「同村」推 */
    const adjacent = ref<Adjacency[]>([])

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
     * 他出生到现在过了几个月。
     *
     * **只有头一年用得着。** 一个刚落地的弟弟，`ageOf` 给的是 0，
     * 而面板上写「〇岁」不是年龄，是一个没算出来的数。
     * 跨年之后光看月份会倒退，所以年月一起算。
     */
    function monthsOf(id: string): number {
      const person = roster.value[id]
      if (!person) return 0
      return Math.max(
        0,
        (world.time.year - person.bornYear) * 12 + (world.time.month - person.bornMonth),
      )
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
      /*
       * 邻居的称呼不存，现算。
       *
       * 「王婶」是一个九岁孩子叫的；他三十岁了还这么叫就不对了，该叫「王嫂」；
       * 她七十岁了该叫「王婆婆」。存一个字符串就是又一个「28岁。还在襁褓里」——
       * 写死的字段活得比事实久。所以每次问都重新算，算的维度见 `neighbourCall`。
       */
      /*
       * 关系压过邻接。分家之后哥住在隔壁老屋——按户算他是邻居，可他是你哥：
       * 「邻接归户、关系归人」，问称呼先问关系图。跟你没有任何一条边的人才按邻居叫。
       * 头一版没有这一条，老屋那一片一写出来，哥落成了「江老爹」，侄儿落成了「老江」。
       */
      const neighbour = roster.value[id]
      if (neighbour && isNeighbour(id) && bondsWith(id).length === 0) {
        return neighbourCall(neighbour, ageOf(id), world.time.year - world.bornYear, '家常')
      }
      return acquaintance.calls
    }

    /** 把一户人家记进世界。已在册的不动 */
    function enrollHouse(house: House): void {
      if (houses.value[house.id]) return
      houses.value = { ...houses.value, [house.id]: house }
    }

    /** 声明两户相邻。同一对不重复记 */
    function adjoin(a: string, b: string): void {
      if (
        adjacent.value.some(
          (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
        )
      ) {
        return
      }
      adjacent.value = [...adjacent.value, { a, b, since: world.time.year }]
    }

    /** 这个人是哪一户的。玩家自家的人不在任何一户里（自家在 `household` 仓库） */
    function houseOf(personId: string): House | undefined {
      return Object.values(houses.value).find((house) => house.members.includes(personId))
    }

    /** 他住进这一户。已经在了就不动 */
    function joinHouse(houseId: string, personId: string): void {
      const house = houses.value[houseId]
      if (!house || house.members.includes(personId)) return
      houses.value = {
        ...houses.value,
        [houseId]: { ...house, members: [...house.members, personId] },
      }
    }

    /** 算「这一家的人」的那几种边。户主只从这几种人里出，乳母、学徒、寄居的不算 */
    const HEAD_BONDS: readonly Bond[] = [
      '生父',
      '生母',
      '抚养',
      '兄',
      '姐',
      '弟',
      '妹',
      '配偶',
      '子',
      '女',
    ]

    /**
     * 户主不能是死人。
     *
     * 时序一推进就调它（`engine/effects.ts`）。两条规矩，都是【推断】的明代常情：
     *
     * 1. 户主殁了，长子承户；没有成年的儿子，寡母当家；再没有，谁最年长谁当。
     * 2. 寡母当家到儿子成人（十六）为止——那一年把家交给他。
     *
     * 「我」不在人口册上，年纪和性别由调用方给。户主是「我」的一律不动：
     * 玩家当了家，就不由引擎把家再交出去。
     * 自家那一户只从亲人里挑（`HEAD_BONDS`）——王府的老管家再年长也不是户主。
     *
     * 殁了的人不住在这一户了——从 `members` 里去掉；一户人全殁了就是户绝，成员空着，
     * 户主留着上一任的名字（那是史实，不是活人）。
     *
     * 邻居殁了，称呼冻在那一刻：「陈婶去年没了」——她不在户里了，`callOf` 算不出「陈婶」，
     * 可你这辈子提起她都叫陈婶。所以去掉之前把当时算出来的那个字写回 `known`，
     * 这一处的「写死」是对的：人不在了，这个字不会再变。
     *
     * @returns 换了户主的那几户：谁传给了谁，是殁了还是交出来的。
     *   `home` 那一条由效果层记成旗标，正文按它说话
     */
    function keepHeads(me: { age: number; gender: Gender }): {
      house: string
      from: string
      to: string
      how: '殁' | '交'
    }[] {
      const passed: { house: string; from: string; to: string; how: '殁' | '交' }[] = []
      const kin = new Set(
        relations.value
          .filter((r) => r.from === 'me' && r.until === null && HEAD_BONDS.includes(r.bond))
          .map((r) => r.to),
      )
      const alive = (id: string): boolean => id === 'me' || roster.value[id]?.fate === '在'
      const ageOfAny = (id: string): number => (id === 'me' ? me.age : ageOf(id))
      const genderOf = (id: string): Gender | undefined =>
        id === 'me' ? me.gender : roster.value[id]?.gender

      const next: Record<string, House> = {}
      for (const [id, entry] of Object.entries(houses.value)) {
        const living = entry.members.filter(alive)
        if (id !== 'home') {
          for (const gone of entry.members.filter((m) => !alive(m))) {
            const person = roster.value[gone]
            const acquaintance = known.value[gone]
            if (!person || !acquaintance) continue
            known.value = {
              ...known.value,
              [gone]: { ...acquaintance, calls: neighbourCall(person, ageOf(gone), me.age, '家常') },
            }
          }
        }
        const house = living.length === entry.members.length ? entry : { ...entry, members: living }
        const family = house.members.filter(
          (member) => id !== 'home' || member === 'me' || kin.has(member),
        )
        const byAge = (a: string, b: string) => ageOfAny(b) - ageOfAny(a)
        const grownSons = family
          .filter((m) => m !== house.head && genderOf(m) === '男' && ageOfAny(m) >= 16)
          .sort(byAge)
        const headAlive = alive(house.head)
        const widowHandsOver =
          headAlive && house.head !== 'me' && genderOf(house.head) === '女' && grownSons.length > 0
        if (headAlive && !widowHandsOver) {
          next[id] = house
          continue
        }
        const grownWomen = family
          .filter((m) => m !== house.head && genderOf(m) === '女' && ageOfAny(m) >= 16)
          .sort(byAge)
        const anyone = family.filter((m) => m !== house.head).sort(byAge)
        const heir = grownSons[0] ?? grownWomen[0] ?? anyone[0]
        if (heir === undefined) {
          next[id] = house
          continue
        }
        next[id] = { ...house, head: heir }
        passed.push({ house: id, from: house.head, to: heir, how: headAlive ? '交' : '殁' })
      }
      houses.value = next
      return passed
    }

    /**
     * 分家。
     *
     * `leaves === 'me'`：你带着 `takes` 里的人搬出去。老屋改叫 `old-home`，邻接边跟着改名
     * （东邻西舍是老屋的邻居）；你这一户仍叫 `home`，住进 `residence`，跟老屋相邻。
     * 别人分出去：老屋还是 `home`，他那一户叫 `<他>-home`，跟老屋相邻。
     *
     * 户主这儿不定——分完调 `keepHeads`，老屋的户主本来就该是活着的那个哥。
     */
    function divideHouse(input: {
      leaves: string
      takes: readonly string[]
      residence: string
    }): { newHouse: string; oldHouse: string } | undefined {
      const home = houses.value['home']
      if (!home) return undefined
      const leavers = [input.leaves, ...input.takes].filter(
        (id, i, all) => home.members.includes(id) && all.indexOf(id) === i,
      )
      const stayers = home.members.filter((id) => !leavers.includes(id))
      const rest = Object.fromEntries(Object.entries(houses.value).filter(([id]) => id !== 'home'))

      if (input.leaves === 'me') {
        const old: House = { ...home, id: 'old-home', members: stayers }
        const mine: House = {
          id: 'home',
          surname: home.surname,
          head: 'me',
          members: leavers,
          residence: input.residence,
          livelihood: home.livelihood,
        }
        houses.value = { ...rest, 'old-home': old, home: mine }
        adjacent.value = adjacent.value.map((edge) => ({
          ...edge,
          a: edge.a === 'home' ? 'old-home' : edge.a,
          b: edge.b === 'home' ? 'old-home' : edge.b,
        }))
        adjoin('home', 'old-home')
        if (houses.value['east']) adjoin('home', 'east')
        return { newHouse: 'home', oldHouse: 'old-home' }
      }

      const theirs: House = {
        id: `${input.leaves}-home`,
        surname: home.surname,
        head: input.leaves,
        members: leavers,
        residence: input.residence,
        livelihood: home.livelihood,
      }
      houses.value = { ...rest, home: { ...home, members: stayers }, [theirs.id]: theirs }
      adjoin('home', theirs.id)
      return { newHouse: theirs.id, oldHouse: 'home' }
    }

    /** 他不再是任何一户的人。人还在册上，边也还在——只是不住在那儿了 */
    function leaveHouse(personId: string): void {
      const next: Record<string, House> = {}
      for (const [id, house] of Object.entries(houses.value)) {
        next[id] = house.members.includes(personId)
          ? { ...house, members: house.members.filter((member) => member !== personId) }
          : house
      }
      houses.value = next
    }

    /** 跟玩家自家相邻的那几户 */
    function neighbourHouses(): House[] {
      return adjacent.value
        .filter((edge) => edge.a === 'home' || edge.b === 'home')
        .map((edge) => houses.value[edge.a === 'home' ? edge.b : edge.a])
        .filter((house): house is House => house !== undefined)
    }

    /** 这个人是不是邻居家的人 */
    function isNeighbour(personId: string): boolean {
      return neighbourHouses().some((house) => house.members.includes(personId))
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
      houses.value = {}
      adjacent.value = []
    }

    return {
      roster,
      known,
      relations,
      houses,
      adjacent,
      enrollHouse,
      joinHouse,
      leaveHouse,
      keepHeads,
      divideHouse,
      adjoin,
      houseOf,
      neighbourHouses,
      isNeighbour,
      guardians,
      acquaintedCount,
      personOf,
      ageOf,
      monthsOf,
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
  {
    persist: {
      key: 'xiuxian:people',
      pick: ['roster', 'known', 'relations', 'houses', 'adjacent'],
    },
  },
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
  /** 生在那一年的几月。不传就掷一个——长辈生在几十年前的哪个月，世界没记过 */
  bornMonth?: number
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
    bornMonth: input.bornMonth ?? randomBetween(1, 12),
    doing: input.doing,
    living: input.living,
    temper: input.temper ?? rollTemper(),
    health: input.health ?? randomBetween(40, 80),
    place: input.place,
    fate: '在',
    history: input.history ?? [],
  }
}
