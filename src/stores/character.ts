import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { createId } from '@/engine/id'
import { rollSpan } from '@/engine/lifespan'
import { randomBetween } from '@/engine/random'
import type {
  AspectKey,
  Aspects,
  AttributeKey,
  Attributes,
  Contact,
  GameTime,
  Interpretation,
  InventoryItem,
  KnowledgeCategory,
  KnowledgeEntry,
  KnowledgeMoment,
  Constitution,
  Realm,
  Turn,
} from '@/types/game'

import { beBorn } from '@/content/birth'
import { constitutionShift, rollConstitution } from '@/content/circumstances'
import { livingById, type Living } from '@/content/living'

import { originAttributes, useHouseholdStore } from './household'
import { useWorldStore } from './world'

const ATTRIBUTE_MIN = 0
const ATTRIBUTE_MAX = 100

const INITIAL_REALM: Realm = '凡人'
const INITIAL_IDENTITY = '孩童'

/**
 * 你自己过过的一段日子。
 *
 * 跟 `people.ts` 的 `Relation` 同构，而且是刻意的同构：那边一条关系断了
 * 不删、只置 `until`（「老乞丐养过你这件事，不因为他死了就没发生过」），
 * 这边一段日子过完了也不删、只置 `until`——
 * **当前的日子只能有一段，过去的日子一段也不能少。**
 *
 * 没有第四格「这是什么日子」：那句话已经在 `content/living.ts` 的
 * `Living.summary` 里了，抄过来就是造第二个真相。
 */
export interface LivingSpan {
  /** 哪一种日子。对得上 `content/living.ts` 里某一格的 `Living.id` */
  id: string
  /** 从哪一年起。世界纪年，跟 `Relation.since` 同一把尺 */
  since: number
  /** 还在过就是 null。**同时至多只有一条是 null** */
  until: number | null
}

/**
 * 一个刚出生的人对自己的全部认识：没有。
 *
 * 四面全空不是偷懒，是这一版的立场——十六岁的少年尚且不知道自己的「悟性」，
 * 一个婴儿更不会知道。这四栏要靠此后十几年一件一件填起来：
 * 下地干活填 body，认字填 learning，遇见修士才填 root。
 */
function blankAspects(): Aspects {
  return {
    body: { self: null, claims: [] },
    learning: { self: null, claims: [] },
    cultivation: { self: null, claims: [] },
    root: { self: null, claims: [] },
  }
}

/**
 * 掷定这一世的身子骨与根骨。
 *
 * `root` 与 `spirit` 是修行资质与神魂：从没有人测过，玩家一辈子可能都不知道，
 * 但它们**在出生那一刻就已经定了**。修士十六年后看见的，
 * 是早就长在那里的东西，不是被谁的评价创造出来的。
 *
 * 它们与出身完全无关——王府的孩子和农户的孩子在这一掷上平等。
 * 这是全作最要紧的一处平等：凡间的一切在这里都不作数。
 */
function rollAttributes(): Attributes {
  const household = useHouseholdStore()
  const origin = originAttributes(household.origin)
  return {
    ...origin,
    // 记性受出身影响很小，主要是天生的
    memory: clamp(origin.memory + randomBetween(-8, 8), ATTRIBUTE_MIN, ATTRIBUTE_MAX),
    root: randomBetween(1, 100),
    spirit: randomBetween(10, 90),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 把体质叠进隐藏刻度。
 *
 * 注意这里**一个字也不碰 root 和 spirit**——
 * 修行资质跟身子骨没有关系。一个瞎子完全可能是天生的修行胚子，
 * 这是全作最要紧的一条，也是「残缺不是惩罚」真正的落点。
 */
function withConstitution(base: Attributes, constitution: Constitution): Attributes {
  const shift = constitutionShift(constitution)
  const next = { ...base }
  for (const [key, delta] of Object.entries(shift)) {
    const attribute = key as keyof Attributes
    next[attribute] = clamp(next[attribute] + (delta ?? 0), ATTRIBUTE_MIN, ATTRIBUTE_MAX)
  }
  return next
}

/** 接触方式，自远及近。**只能往上走** */
const CONTACT_ORDER: readonly Contact[] = ['听说', '见过', '亲历']

/** 解释状态，自浅入深。**可以往下掉**——被人说动摇了就往回退一档 */
const INTERPRETATION_ORDER: readonly Interpretation[] = ['未理解', '猜想', '确信']

/** learn 的结果。界面据此决定要不要报一句「得知 · ×××」 */
export type LearnOutcome = 'new' | 'detailed' | 'known'

/**
 * 记一条见闻要交代的事。
 *
 * 做成对象而不是位置参数，是因为**「不传」本身有含义**：
 * 不传 `contact` 就是「离得没更近」，不传 `mistaken` 就是「对错没变」。
 * 七个位置参数排下去，调用处根本读不出哪个是「没变」哪个是「变成没有」。
 */
export interface Learning {
  id: string
  title: string
  category: KnowledgeCategory
  at: GameTime
  /** 他此刻会怎么说这件事。不传就沿用原来那句 */
  summary?: string | null
  /** 他这一次离这件事更近了吗。不传就不动 */
  contact?: Contact
  /** 他这一次形成了什么样的解释。不传就不动 */
  interpretation?: Interpretation
  /**
   * 不传 = 对错不变（他只是换了个说法）；
   * 传 `null` = 明确纠正，他弄明白了；
   * 传 `'事实' | '因果'` = 标记成错的。
   */
  mistaken?: '事实' | '因果' | null
  /**
   * 有人给了另一种说法。
   *
   * **它不覆盖原来那句。** 记下来并排放着，同时把他的解释往回打一档——
   * 他没弄明白什么，只是不再那么肯定了。
   */
  rival?: string
  /** 他被说动摇了：解释往回退一档，说法不变 */
  shaken?: boolean
}

export const useCharacterStore = defineStore(
  'character',
  () => {
    const household = useHouseholdStore()
    const world = useWorldStore()

    /**
     * 姓名与父母，一并定下。
     *
     * 顺序是有意的：**先有父母，才有你**。
     * 父亲叫沈怀山，所以你姓沈——不是先掷出一个「沈」，
     * 再倒推出一个姓沈的父亲。
     */
    /**
     * 出生。
     *
     * 顺序是有意的：**先有那张关系网，才有你**。
     * 你姓什么取决于生父姓什么；生父都没有的孩子，
     * 姓是收留他的人给的——那也是一条信息。
     */
    const birth = beBorn(household.origin, household.home)
    const name = ref(birth.name)
    /**
     * 身子骨的底子。它不是 debuff，是人生的形状——
     * 腿脚不便的孩子下不了地，可他摸到书的机会比谁都多。
     */
    const constitution = ref(rollConstitution())
    const identity = ref(INITIAL_IDENTITY)
    /**
     * 你自己过过的每一段日子，按先后排。
     *
     * **出生时是空的，而空是常态**——一个人绝大多数时候过的就是家里的日子，
     * 那时候这个列表一条也没有，解析链自然落到下一级去。
     * 只有人生中途真的换了一种活法，这里才会长出第一段。
     */
    const livings = shallowRef<LivingSpan[]>([])
    const realm = ref<Realm>(INITIAL_REALM)
    const attributes = shallowRef<Attributes>(withConstitution(rollAttributes(), constitution.value))
    /**
     * 天年：这一世能活多少年。
     *
     * 跟 `attributes.root` 同一条纪律——**出生那一刻就定了，
     * 而这个人一辈子不会知道它是多少**。面板上没有它。
     *
     * 摆在 `attributes` 后面是因为它读身子骨：这具身体本身是什么底子，
     * 决定了这一掷落在哪儿。跟出身无关，跟家里有没有钱无关。
     * 为什么下限不是三岁、为什么修行能改它，都写在 `engine/lifespan.ts`。
     */
    const span = ref(rollSpan(attributes.value.body))
    const aspects = shallowRef<Aspects>(blankAspects())
    /** 出生时一无所知，一条见闻也没有。此后每一条都是学来的 */
    const knowledge = shallowRef<KnowledgeEntry[]>([])
    const inventory = shallowRef<InventoryItem[]>([])

    /**
     * 年龄不是独立字段，也不是点一下「下一年」加上去的。
     * 它就是时序本身：出生那年是第一年，此后过了多少年就是多少岁。
     */
    /**
     * 年龄。
     *
     * 从前是 year - 1（人人生在第一年）。现在世界先于玩家存在，
     * 他可能生在第九年，也可能生在第十七年——**同一个世界，不同的起点。**
     */
    const age = computed(() => Math.max(0, world.time.year - world.bornYear))

    /** 别人评说过你几次。面板未读提示据此判断 */
    const claimCount = computed(() =>
      Object.values(aspects.value).reduce((total, aspect) => total + aspect.claims.length, 0),
    )

    /**
     * 你现在过的是什么日子。
     *
     * ## 三级解析链的顶端
     *
     *     我自己现在过什么日子              ← 这里
     *     ← 没有，问抚养我的人现在过什么日子   ┐ 这两级在
     *     ← 再没有，问我出生于什么家庭        ┘ `household.living`
     *
     * 头一级住在这里而不在 `household`，理由是主语：
     * **「十七岁被削爵迁出京城」的主语是我。**我搬出去了，
     * 宫里那些人过的日子一点没变——那件事改变的是我，不是那个家。
     * 而 `household.living` 的头一级问的已经是「把你养大的那个人」，
     * 它本来就半只脚站在人这边，只是那个人不是你自己。
     *
     * ## 为什么落回，而不是出生时就写一条
     *
     * 出生就写一条的话，这个列表里立刻堆满「我过着农户的日子」这种
     * 从别处抄来的事实，而它一旦被抄下来就不会再跟着家里变了——
     * 姐姐死了、老乞丐没了，`household.living` 那个 computed 自己会变，
     * 抄下来的那一条不会。所以这里空着才是对的：
     * **没有自己的活法时，答案就该现问。**
     *
     * ## 依赖方向
     *
     * `character → household → people → world`，全单向，这一行不改变它。
     * character 在 setup 开头就 `useHouseholdStore()` 取过出身和 home 了，
     * 这里只是又读了它一格。
     */
    const living = computed<Living>(() => {
      const mine = livings.value.find((span) => span.until === null)
      if (mine) {
        const found = livingById(mine.id)
        if (found) return found
      }
      return household.living
    })

    function adjustAttribute(key: AttributeKey, delta: number): void {
      const next = clamp(attributes.value[key] + delta, ATTRIBUTE_MIN, ATTRIBUTE_MAX)
      attributes.value = { ...attributes.value, [key]: next }
    }

    function setRealm(next: Realm): void {
      realm.value = next
    }

    /**
     * 天年加减。
     *
     * 加的那一头是修行——「修仙可能改变生命长度」这句话唯一的落点。
     * 减的那一头是大病、重伤、耗损：**一场病可以让人少活十年**，
     * 而那件事得由具体的某一卷写出来，不是由一个概率表算出来。
     *
     * 削到当年以下就是当场死，所以不设下限保护：
     * 「他没能熬过这个冬天」本来就该写得出来。
     */
    function extendSpan(years: number): void {
      span.value = Math.max(0, span.value + years)
    }

    function setIdentity(next: string): void {
      identity.value = next
    }

    /**
     * 换一种日子过。
     *
     * 旧的那一段不删，只封口——`people.ts` 里 `unbind` 那句「不删，只封口，
     * 它发生过」在这里是同一条纪律。真正要避开的坏法是
     * `living.value = 'temple'`：那样三年前那个 `shop` 会从世界上消失，
     * 而他在铺子里当过三年伙计这件事，不因为他后来去了寺里就没发生过。
     *
     * **只封口，不补记。**链下面那两级不复制到这个列表里来——
     * 皇子在宫里长到十七岁这件事由 `household.living` 一直答着，
     * 抄一份进来就是造第二个真相，而两个真相迟早会对不上。
     * 这个列表只记「我自己」这一级，此前那一段由链自己回答。
     *
     * @param id `content/living.ts` 里某一格的 `Living.id`
     */
    function liveAs(id: string): void {
      if (livingById(id) === undefined) {
        // 不能静默落回：那会让一个已经迁出京城的人接着读宫里的正文，
        // 而且看起来跟「这一卷本来就没写日子」一模一样
        console.error(`剧本让人过一种不存在的日子：${id}`)
        return
      }
      const mine = livings.value.find((span) => span.until === null)
      // 同一种日子接着过，不记第二笔——否则一卷里连着两处效果会切出一段零长的日子
      if (mine?.id === id) return
      const year = world.time.year
      livings.value = [
        ...livings.value.map((span) => (span.until === null ? { ...span, until: year } : span)),
        { id, since: year, until: null },
      ]
    }

    /** 改写角色对自己某一面的看法。 */
    function note(key: AspectKey, self: string | null): void {
      aspects.value = { ...aspects.value, [key]: { ...aspects.value[key], self } }
    }

    /** 记下别人的评说。只增不改——认知的错位就靠这份先后顺序显形。 */
    function claim(
      key: AspectKey,
      source: string,
      text: string,
      at: GameTime,
      doubt?: string,
    ): void {
      const existing = aspects.value[key]
      aspects.value = {
        ...aspects.value,
        [key]: {
          ...existing,
          claims: [
            ...existing.claims,
            { id: createId('clm'), source, text, at: { ...at }, ...(doubt ? { doubt } : {}) },
          ],
        },
      }
    }

    function knows(id: string): boolean {
      return knowledge.value.some((item) => item.id === id)
    }

    /**
     * 记下一条见闻。
     *
     * 「知道」不是一个开关，也不是一道单一的坡。它有三根各自独立的轴：
     *
     *     接触　听说 → 见过 → 亲历　　**只能往上**
     *     解释　未理解 → 猜想 → 确信　**可以往下**
     *     对错　对 / 错　　　　　　　　跟前两根都正交
     *
     * 从前这些揉在一个 grasp 字段里，那道梯子混了两个轴——
     * 于是「亲眼见过但完全不明白那是什么」写不出来，
     * 而那正是一个人第一次撞见修士时最真实的状态。
     *
     * ## 接触只能往上，解释可以往下
     *
     * 亲眼见过之后不会退回「只是听说」，这一条不变。
     * 但**笃定程度是会掉的**：一句「不是那么回事」就能让一个
     * 确信多年的人重新不敢肯定。而他动摇之后往往什么也没弄明白，
     * 只是不再笃定了——这跟「他被纠正了」完全是两回事。
     *
     * ## 被人说动之后的三种样子
     *
     *     ① 动摇　　　　shaken: true
     *        「你这么一说……我也不敢肯定了。」解释退一档，说法不变。
     *
     *     ② 有了别的说法　rival: '……'
     *        「也可能不是修士，是某种江湖把式。」新说法跟原说法**并排放着**，
     *        不覆盖。他从此心里有两个版本。
     *
     *     ③ 明确纠正　　mistaken: null + 新的 summary
     *        「原来那天见到的确实是修士。」这一步才抹掉错误标记。
     *
     * 只做 ③ 的话，NPC 一开口玩家的世界模型就被改对，那还是百科系统。
     *
     * ## 认知历史本身就是内容
     *
     * 每一次变化都往 history 里追加一条，旧的绝不删。
     * 一条一路被改到「对」的知识条目，跟一个人真实的理解过程毫无关系；
     * 「他原来以为什么、后来听谁说了什么、现在还剩下什么疑问」才是。
     */
    function learn(input: Learning): LearnOutcome {
      const { id, title, category, at, summary, rival, shaken } = input
      const existing = knowledge.value.find((item) => item.id === id)

      const moment = (entry: Omit<KnowledgeEntry, 'history'>, how: Turn): KnowledgeMoment => ({
        at: { ...at },
        summary: entry.summary,
        contact: entry.contact,
        interpretation: entry.interpretation,
        how,
      })

      if (!existing) {
        const fresh: Omit<KnowledgeEntry, 'history'> = {
          id,
          title,
          summary: summary ?? null,
          contact: input.contact ?? '听说',
          interpretation: input.interpretation ?? (summary ? '猜想' : '未理解'),
          category,
          learnedAt: { ...at },
          ...(input.mistaken ? { mistaken: input.mistaken } : {}),
          ...(rival ? { rival } : {}),
        }
        knowledge.value = [...knowledge.value, { ...fresh, history: [moment(fresh, '初识')] }]
        return 'new'
      }

      // 接触只能往上。听人说一嘴，推翻不了亲眼见过
      const nextContact =
        input.contact !== undefined &&
        CONTACT_ORDER.indexOf(input.contact) > CONTACT_ORDER.indexOf(existing.contact)
          ? input.contact
          : existing.contact

      /**
       * 解释可以往下。三个来源，越靠后越有力：
       * 剧本直接指定 > 有人给了别的说法 > 被说动摇了。
       */
      let nextInterpretation = input.interpretation ?? existing.interpretation
      if (rival !== undefined || shaken) {
        const held = INTERPRETATION_ORDER.indexOf(input.interpretation ?? existing.interpretation)
        nextInterpretation = INTERPRETATION_ORDER[Math.max(0, held - 1)]!
      }

      const nextSummary = summary === undefined ? existing.summary : summary
      const nextMistaken =
        input.mistaken === undefined ? existing.mistaken : (input.mistaken ?? undefined)
      const nextRival = rival === undefined ? existing.rival : rival

      const changed =
        nextContact !== existing.contact ||
        nextInterpretation !== existing.interpretation ||
        nextSummary !== existing.summary ||
        nextMistaken !== existing.mistaken ||
        nextRival !== existing.rival
      if (!changed) return 'known'

      /** 这一步是怎么来的。给认知历史用，玩家读得见 */
      const how: Turn =
        rival !== undefined
          ? '有了别的说法'
          : input.mistaken === null
            ? '弄明白了'
            : shaken || nextInterpretation < existing.interpretation
              ? '动摇'
              : '加深'

      const updated: Omit<KnowledgeEntry, 'history'> = {
        ...existing,
        title,
        summary: nextSummary,
        contact: nextContact,
        interpretation: nextInterpretation,
        learnedAt: { ...at },
        mistaken: nextMistaken,
        rival: nextRival,
      }

      knowledge.value = knowledge.value.map((item) =>
        item.id === id ? { ...updated, history: [...item.history, moment(updated, how)] } : item,
      )
      return 'detailed'
    }

    function has(id: string): boolean {
      return inventory.value.some((item) => item.id === id)
    }

    /**
     * 收进或取出行囊。count 为负即失去，减到零则整条移除。
     * @returns 实际变动的数量，0 表示什么也没发生
     */
    function carry(id: string, name: string, count: number, unit: string, note?: string): number {
      const existing = inventory.value.find((item) => item.id === id)

      if (!existing) {
        if (count <= 0) return 0
        inventory.value = [...inventory.value, { id, name, count, unit, ...(note ? { note } : {}) }]
        return count
      }

      const next = existing.count + count
      if (next <= 0) {
        inventory.value = inventory.value.filter((item) => item.id !== id)
        return -existing.count
      }

      inventory.value = inventory.value.map((item) =>
        item.id === id ? { ...item, count: next, ...(note ? { note } : {}) } : item,
      )
      return count
    }

    /**
     * 有人点破了你手里这东西究竟是什么。
     *
     * 全作最迟到的一种反馈：你可能揣着它走了十年，一直当它是本破书。
     * 旧名字留在 formerName 里不删——那十年是真的，不该被新知识抹掉。
     *
     * @returns 是否真的改了名。物件不在手上、或早已认得，都返回 false
     */
    function reveal(id: string, trueName: string, note?: string): boolean {
      const existing = inventory.value.find((item) => item.id === id)
      if (!existing || existing.name === trueName) return false

      inventory.value = inventory.value.map((item) =>
        item.id === id
          ? {
              ...item,
              name: trueName,
              formerName: item.formerName ?? item.name,
              ...(note ? { note } : {}),
            }
          : item,
      )
      return true
    }

    /**
     * 重开一世：按新出身取名、定身子骨。
     *
     * 家世由 `household` 先重掷，人口册由 `people` 自己清——次序归
     * `stores/founding.ts` 那张表管，这里不越俎代庖去 reset 别人。
     * 从前这里有一句 `usePeopleStore().reset()`，是把次序记在了第三个地方。
     */
    function reset(): void {
      name.value = beBorn(household.origin, household.home).name
      constitution.value = rollConstitution()
      identity.value = INITIAL_IDENTITY
      livings.value = []
      realm.value = INITIAL_REALM
      attributes.value = withConstitution(rollAttributes(), constitution.value)
      span.value = rollSpan(attributes.value.body)
      aspects.value = blankAspects()
      knowledge.value = []
      inventory.value = []
    }

    return {
      name,
      constitution,
      age,
      identity,
      livings,
      living,
      realm,
      attributes,
      span,
      aspects,
      knowledge,
      inventory,
      claimCount,
      adjustAttribute,
      setRealm,
      extendSpan,
      setIdentity,
      liveAs,
      note,
      claim,
      knows,
      learn,
      has,
      carry,
      reveal,
      reset,
    }
  },
  {
    // age、claimCount 与 living 是派生值，存了反而会在恢复时盖掉 computed。
    // 存的是 livings——那份历史是真事实，谁也算不出来
    persist: {
      key: 'xiuxian:character',
      pick: [
        'name',
        'constitution',
        'identity',
        'livings',
        'realm',
        'attributes',
        'span',
        'aspects',
        'knowledge',
        'inventory',
      ],
    },
  },
)
