import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createId } from '@/engine/id'
import { randomBetween } from '@/engine/random'
import type {
  AspectKey,
  Aspects,
  AttributeKey,
  Attributes,
  GameTime,
  InventoryItem,
  KnowledgeCategory,
  KnowledgeEntry,
  Realm,
  Relationship,
  Trade,
} from '@/types/game'

import { makeParents } from '@/content/parents'

import { originAttributes, rollName, useHouseholdStore } from './household'
import { usePeopleStore } from './people'
import { useWorldStore } from './world'

const ATTRIBUTE_MIN = 0
const ATTRIBUTE_MAX = 100
const AFFINITY_MIN = -100
const AFFINITY_MAX = 100

const INITIAL_REALM: Realm = '凡人'
const INITIAL_IDENTITY = '孩童'

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
  const origin = originAttributes(household.trade)
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
 * 出生：先造父母，再给自己取名。
 *
 * 这个顺序是这套系统的立场——**父母不是为了玩家而存在的两块牌子**。
 * 他们各有姓名、年岁、脾性，在玩家出生前就已经活了二十几年，
 * 而且那些年发生的事都是真的，只是玩家一件也不知道。
 *
 * 玩家随父姓：父亲叫沈怀山，所以你姓沈。
 *
 * @returns 玩家的姓名
 */
function bornInto(trade: Trade, home: string): string {
  const people = usePeopleStore()
  const full = rollName(trade)
  const surname = full.slice(0, 1)
  const parents = makeParents(trade, surname, home)
  people.enroll(parents.father)
  people.enroll(parents.mother)
  // 一出生就认识爹娘，但那时你还不知道他们叫什么——
  // 「爹」是称呼，「沈怀山」是名字，那是两回事
  people.meet('father', '爹', 60)
  people.meet('mother', '娘', 65)
  return full
}

/** learn 的结果。界面据此决定要不要报一句「得知 · ×××」 */
export type LearnOutcome = 'new' | 'detailed' | 'known'

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
    const name = ref(bornInto(household.trade, household.home))
    const identity = ref(INITIAL_IDENTITY)
    const realm = ref<Realm>(INITIAL_REALM)
    const attributes = ref<Attributes>(rollAttributes())
    const aspects = ref<Aspects>(blankAspects())
    const relationships = ref<Relationship[]>([])
    /** 出生时一无所知，一条见闻也没有。此后每一条都是学来的 */
    const knowledge = ref<KnowledgeEntry[]>([])
    const inventory = ref<InventoryItem[]>([])

    /**
     * 年龄不是独立字段，也不是点一下「下一年」加上去的。
     * 它就是时序本身：出生那年是第一年，此后过了多少年就是多少岁。
     */
    const age = computed(() => Math.max(0, world.time.year - 1))

    /** 别人评说过你几次。面板未读提示据此判断 */
    const claimCount = computed(() =>
      Object.values(aspects.value).reduce((total, aspect) => total + aspect.claims.length, 0),
    )

    function adjustAttribute(key: AttributeKey, delta: number): void {
      const next = clamp(attributes.value[key] + delta, ATTRIBUTE_MIN, ATTRIBUTE_MAX)
      attributes.value = { ...attributes.value, [key]: next }
    }

    function setRealm(next: Realm): void {
      realm.value = next
    }

    function setIdentity(next: string): void {
      identity.value = next
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

    /** @returns 是否初识此人 */
    function adjustRelation(id: string, who: string, delta: number, note?: string): boolean {
      const existing = relationships.value.find((item) => item.id === id)

      if (!existing) {
        relationships.value = [
          ...relationships.value,
          {
            id,
            name: who,
            affinity: clamp(delta, AFFINITY_MIN, AFFINITY_MAX),
            ...(note ? { note } : {}),
          },
        ]
        return true
      }

      relationships.value = relationships.value.map((item) =>
        item.id === id
          ? {
              ...item,
              affinity: clamp(item.affinity + delta, AFFINITY_MIN, AFFINITY_MAX),
              ...(note ? { note } : {}),
            }
          : item,
      )
      return false
    }

    function knows(id: string): boolean {
      return knowledge.value.some((item) => item.id === id)
    }

    /**
     * 记下一条见闻。
     *
     * 「先知其名，后知其详」是常态：炼气二字你早就听过，
     * 真正弄懂是很久以后的事。所以已有条目若原本没有内容，这次补上仍算一次收获。
     */
    function learn(
      id: string,
      title: string,
      summary: string | null,
      category: KnowledgeCategory,
      at: GameTime,
    ): LearnOutcome {
      const existing = knowledge.value.find((item) => item.id === id)

      if (!existing) {
        knowledge.value = [
          ...knowledge.value,
          { id, title, summary, category, learnedAt: { ...at } },
        ]
        return 'new'
      }

      if (existing.summary === null && summary !== null) {
        knowledge.value = knowledge.value.map((item) =>
          item.id === id ? { ...item, summary, learnedAt: { ...at } } : item,
        )
        return 'detailed'
      }

      return 'known'
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

    /** 重开一世：家世已由 household 先行重掷，这里按新出身取名、定身子骨。 */
    function reset(): void {
      usePeopleStore().reset()
      name.value = bornInto(household.trade, household.home)
      identity.value = INITIAL_IDENTITY
      realm.value = INITIAL_REALM
      attributes.value = rollAttributes()
      aspects.value = blankAspects()
      relationships.value = []
      knowledge.value = []
      inventory.value = []
    }

    return {
      name,
      age,
      identity,
      realm,
      attributes,
      aspects,
      relationships,
      knowledge,
      inventory,
      claimCount,
      adjustAttribute,
      setRealm,
      setIdentity,
      note,
      claim,
      adjustRelation,
      knows,
      learn,
      has,
      carry,
      reveal,
      reset,
    }
  },
  {
    // age 与 claimCount 是派生值，存了反而会在恢复时盖掉 computed
    persist: {
      key: 'xiuxian:character',
      pick: [
        'name',
        'identity',
        'realm',
        'attributes',
        'aspects',
        'relationships',
        'knowledge',
        'inventory',
      ],
    },
  },
)
