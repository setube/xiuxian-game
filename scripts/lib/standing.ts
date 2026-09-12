/**
 * 摆局立人：**立了就按死**。
 *
 * ## 为什么要有这个文件
 *
 * 2026-09-12 一天之内五支门禁栽在同一件事上：
 *
 *     still     兜底局摆哥「暴躁」，实际是引擎掷的「木讷」
 *     birth     摆「爹在身边」，而宫里那一档父亲的 place 不在孩子身边
 *     reunion   摆「养育你的人」，而立基已经把父母挂在那条边上
 *     trades    摆「爹还在」，两条入场条件在批次里红、单跑绿
 *     away      摆「哥改行做了木匠」，而立基造的哥在种地
 *
 * 同一个真因：**新开一个 pinia 就已经立完基了**（父母、兄弟、东西邻都在册），
 * 而 `people.enroll` **对已经在册的人不改写**——我摆的值静默落空。
 *
 * 症状最阴的一点：**它的红取决于随机流**。立基造的那个人恰好满足条件时绿，
 * 流位置一挪就红。于是「单跑绿、批次红」，而两边跑的是同一份代码。
 *
 * ## 它做两件事，缺一不可
 *
 *     enroll   人不在册时立起来
 *     amend    人已在册时把那几格按死
 *
 * `enroll` 一个人在真实人生里只该发生一次（出生、娶进门、拜师），
 * 所以它不改写是对的——**错在摆局拿它当「写入」用**。
 */
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'
import type { Bond, Gender, Livelihood, Person, Temper } from '../../src/types/game'

export interface Standing {
  /** 人口册上的 id */
  id: string
  /** 跟玩家什么关系。不写就只入册不牵边 */
  bond?: Bond
  /** 他比玩家大几岁 */
  older?: number
  gender?: Gender
  surname?: string
  given?: string
  temper?: Temper
  health?: number
  livelihood?: Livelihood
  /** 在不在身边。默认在——不在的话摆局多半没意义 */
  here?: boolean
  /** 还在不在。默认在 */
  alive?: boolean
}

/**
 * 立一个人并把指定的几格按死，回报他的 id。
 *
 * ⚠️ **`amend` 那一刀是这个函数的全部意义**：立基可能已经造过这个人了，
 * 那时 `enroll` 静默不改写，而判据会报「条件不成立」并指向内容。
 *
 * `place` 和 `fate` 一律按死，因为这两格是「在不在身边」的判定依据
 * （`engine/nearby.ts`），而它们最容易被立基造的那个人带偏
 * （宫里那一档父亲的 `place` 就不在孩子身边）。
 */
export function standing(who: Standing): string {
  const people = usePeopleStore()
  const world = useWorldStore()
  const older = who.older ?? 30
  const alive = who.alive ?? true
  const here = who.here ?? true

  people.enroll({
    id: who.id,
    surname: who.surname ?? '江',
    given: who.given ?? '某',
    gender: who.gender ?? '男',
    bornYear: world.time.year - older,
    bornMonth: 3,
    temper: who.temper ?? '木讷',
    health: who.health ?? 70,
    place: world.place,
    fate: alive ? '在' : '殁',
    ...(who.livelihood !== undefined ? { livelihood: who.livelihood } : {}),
    history: [],
  } as Person)

  // 已经在册的人 `enroll` 不改写，这一刀把摆的那几格按死
  const patch: Partial<Omit<Person, 'id' | 'history'>> = {
    fate: alive ? '在' : '殁',
    place: here ? world.place : '别处',
    bornYear: world.time.year - older,
  }
  if (who.temper !== undefined) patch.temper = who.temper
  if (who.health !== undefined) patch.health = who.health
  if (who.livelihood !== undefined) patch.livelihood = who.livelihood
  people.amend(who.id, patch)

  if (who.bond !== undefined) people.bind('me', who.id, who.bond)
  return who.id
}
