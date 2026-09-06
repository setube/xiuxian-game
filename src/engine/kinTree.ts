import type { Bond, Relation } from '@/types/game'

/**
 * 世系：把关系图摆成一张画得出来的图。
 *
 * `people.relations` 存的本来就是一张图（一条边一条记录，玩家自己是 `'me'` 这个节点），
 * 可人际面板从前把它压成了一列名字——**图的那一维一直在数据里，只是没画出来**。
 * 「爹和娘是夫妻」「侄儿是哥的儿子」这些边一条也没上过界面。
 *
 * 这一支只干两件事，都不碰界面：
 *
 *   1. **定辈分**。谁是长辈、谁同辈、谁是晚辈——从边上算，不从年纪猜。
 *   2. **挑边**。哪些边玩家看得见，哪些不该画。
 *
 * 画成什么样是 `RelationshipPanel.vue` 的事。这里出的是坐标之前的那一层：
 * 谁在第几辈、谁跟谁之间有一条什么线。
 */

/**
 * 一条边把辈分推几格。
 *
 * 读法：`A →bond B` 记的是「B 是 A 的 bond」。所以 `我 →生父 爹` 那条边上，
 * 爹比我高一辈，推 -1；`哥 →子 侄儿` 那条边上，侄儿比哥低一辈，推 +1。
 *
 * **不在这张表里的边不推辈分**，各有各的道理：
 *
 *     亲戚　　祖父母、叔伯、姑舅、侄儿全走这一格（见 `types/game.ts`），
 *             推 -2、-1、+1 都有，一格说不了。侄儿的辈分不靠它，
 *             靠他自己那条「侄儿→哥 生父」（`life/nephew.ts` 定下的）算出来。
 *     师 徒　 辈分之外的另一条轴。先生比你年长不等于他在你家的世系上。
 *     友 仇　 跟辈分无关。
 */
const RANK_SHIFT: Partial<Record<Bond, number>> = {
  生父: -1,
  生母: -1,
  兄: 0,
  姐: 0,
  弟: 0,
  妹: 0,
  配偶: 0,
  子: 1,
  女: 1,
}

/**
 * 血缘婚姻这一类。**这类边是公开事实，玩家认得两头就等于知道这条边。**
 *
 * 你认得爹也认得娘，就不必再有谁来告诉你他俩是夫妻；你认得哥也认得侄儿，
 * 那是他儿子这件事同样不用谁说。而「陈先生跟王婶有旧怨」不是这样的事——
 * 它得有人说给你听，或者你自己撞见。所以 `友`、`仇` 不在这里，
 * 它们即便两头都认得也不画（也画不进世系，它们不推辈分）。
 *
 * `亲戚` 在这里：它虽不推辈分，但「这两个人是亲戚」本身是公开的。
 */
const PUBLIC_BONDS: readonly Bond[] = [
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
  '亲戚',
]

/** 画出来是一条竖线（亲子）还是一道双横线（夫妻） */
export type KinEdgeKind = '亲子' | '夫妻' | '同辈'

export interface KinEdge {
  /** 亲子边：`a` 是长辈那头。夫妻、同辈边：两头平等，顺序只看边是怎么记的 */
  a: string
  b: string
  kind: KinEdgeKind
}

/** 同一辈的人 */
export interface KinRank {
  /** 0 是「我」这一辈，负数长辈，正数晚辈 */
  rank: number
  members: string[]
}

export interface KinTree {
  /** 按辈分从长到幼。没有人的那一辈不占位 */
  ranks: KinRank[]
  edges: KinEdge[]
  /**
   * 排不进世系的人：先生、朋友、说不上辈分的亲戚。
   *
   * **他们不是没关系，是这张图答不了他们。** 世系图的纵轴是辈分，
   * 而「教了你九年书的先生」在这根轴上没有位置——硬摆上去要么撒谎
   * （他不是你的长辈），要么占着一格却连不出任何一条线。
   */
  loose: string[]
}

export interface KinInput {
  /** 关系图上全部的边。含 `until` 不为 null 的——断了的关系也是发生过的 */
  relations: readonly Relation[]
  /** 玩家认识的人。`'me'` 不必在里头，这里自己算上 */
  known: readonly string[]
}

/** 这条边此刻还立着吗。断了的边不进世系图——那是「曾经」，不是「是」 */
function isOpen(relation: Relation): boolean {
  return relation.until === null
}

/**
 * 谁站得上这张图。
 *
 * 底子是 `known`——玩家认得的人。但**认得和知道有这么个人不是一回事**：
 *
 * 弃儿那一世，爹在你出生之前就殁了。你从没见过他，`known` 里没有他，
 * 可 `me →生父 father` 那条边一直立着（出生那一节写的：「边照牵。人没了，
 * 血缘还在」，见 `life/birth.ts`）。头一版按 `known` 过滤，于是那张图上
 * **整整缺了父亲那一辈**——一个孩子凭空长在娘底下。
 *
 * 家谱历来不是这么记的：没见过面的、早亡的先人都在谱上，那正是谱的用处。
 *
 * 所以补一条：**跟「我」直接连着一条血缘婚姻边的人，一律上图。**
 * 这条规矩有界，不会级联——只补「我」这一跳，不补爹的爹、也不补邻居的亲家。
 * 补进来的人多半没有称呼（从没 `meet` 过），那一格由面板从 bond 上算
 * （`engine/address.ts` 的 `kinCall`，跟正文里 `{elder}` 是同一个答案）。
 */
function whoIsOnChart(relations: readonly Relation[], known: readonly string[]): Set<string> {
  const on = new Set<string>([...known, 'me'])
  for (const relation of relations) {
    if (!isOpen(relation)) continue
    if (!PUBLIC_BONDS.includes(relation.bond)) continue
    if (relation.from === 'me') on.add(relation.to)
    else if (relation.to === 'me') on.add(relation.from)
  }
  return on
}

/**
 * 从「我」出发，沿边把辈分传出去。
 *
 * ## 为什么要跑两轮
 *
 * `抚养` 这条边不在 `RANK_SHIFT` 里，可它又确实经常是 -1（爹娘把你养大）。
 * 麻烦在于**它不一定**：`people.guardians` 那一格的注释写着「可能是爹娘，
 * 可能是姐姐，可能是个老乞丐」。姐姐把你养大的时候，她身上同时挂着
 * `姐`（同辈）和 `抚养` 两条边——先撞上哪条，她就落在哪一辈。
 *
 * 所以分两轮：**血缘边先走，抚养边后补**。姐姐在第一轮就被 `姐` 定成同辈，
 * 第二轮的抚养边碰到她时她已经有辈分了，不会再动；而那个老乞丐没有任何
 * 血缘边，第一轮够不着他，第二轮才由抚养边把他放到长辈那一格。
 *
 * 头一版只跑一轮，姐姐抚养的那一世里她被画成了母亲那一辈——
 * 图上她跟娘并排站着，而她明明是同辈。
 */
function assignRanks(
  relations: readonly Relation[],
  inGraph: (id: string) => boolean,
): Map<string, number> {
  const rank = new Map<string, number>([['me', 0]])

  /** 沿一批边把辈分推满。推不动了就停 */
  function spread(shiftOf: (bond: Bond) => number | undefined): void {
    let changed = true
    while (changed) {
      changed = false
      for (const relation of relations) {
        if (!isOpen(relation)) continue
        if (!inGraph(relation.from) || !inGraph(relation.to)) continue
        const shift = shiftOf(relation.bond)
        if (shift === undefined) continue

        const from = rank.get(relation.from)
        const to = rank.get(relation.to)
        // 正着走：知道 from 的辈分，推出 to 的
        if (from !== undefined && to === undefined) {
          rank.set(relation.to, from + shift)
          changed = true
        }
        // 反着走：知道 to 的辈分，推回 from 的。侄儿就是这么算出来的——
        // 「侄儿→哥 生父」这条边上先有的是哥（我的兄），倒推才有侄儿
        else if (to !== undefined && from === undefined) {
          rank.set(relation.from, to - shift)
          changed = true
        }
      }
    }
  }

  spread((bond) => RANK_SHIFT[bond])
  spread((bond) => (bond === '抚养' ? -1 : undefined))
  return rank
}

/**
 * 这条边画成什么线。
 *
 * **看的是两人差几辈，不是只看 bond。** 这两者会分家，而分家的那一次很难看：
 * `抚养` 通常是长辈（爹娘养大你），可它不一定——姐姐把你养大的时候，
 * 她身上同时挂着 `姐` 和 `抚养`。只按 bond 判的头一版把那条抚养边画成了亲子线，
 * 于是图上**两个并排站着的同辈人之间垂下来一条亲子线**，
 * 从姐姐脚底拐个弯又爬回我头顶。
 *
 * 辈分已经在上一步算出来了（而且算得比 bond 准，见 `assignRanks`），
 * 那就拿它来判：差一辈才是亲子，同辈才是夫妻或兄弟。
 *
 * @param gap 晚辈的辈分减长辈的辈分。同辈是 0，差一辈是 1
 */
function edgeKind(bond: Bond, gap: number): KinEdgeKind | undefined {
  if (bond === '配偶') return gap === 0 ? '夫妻' : undefined
  if (bond === '兄' || bond === '姐' || bond === '弟' || bond === '妹') {
    return gap === 0 ? '同辈' : undefined
  }
  if (bond === '生父' || bond === '生母' || bond === '抚养' || bond === '子' || bond === '女') {
    /*
     * 差一辈才画。同辈的抚养（姐姐养大你）不画线——**那不是世系结构**，
     * 图上她已经跟你并排站着了；「她养大了你」这件事在点开她那一行里，
     * 由 `抚养` 这两个字自己说。隔两辈的（祖母养大你）同理不画：
     * 一条跨两辈的亲子线在图上就是在说她是你娘。
     */
    return gap === 1 ? '亲子' : undefined
  }
  return undefined
}

/** 亲子边上谁是长辈那头 */
function elderFirst(relation: Relation): { a: string; b: string } {
  // `A →生父 B`、`A →抚养 B`：B 是长辈。`A →子 B`：A 是长辈
  const toIsElder = relation.bond === '生父' || relation.bond === '生母' || relation.bond === '抚养'
  return toIsElder ? { a: relation.to, b: relation.from } : { a: relation.from, b: relation.to }
}

/**
 * 算出一张世系图。
 *
 * 只认玩家认识的人：世界上还有许多人在过日子，可这张图是**玩家自己那本册子**，
 * 不是世界的人口志。哥在镇上认识的木匠师傅不该出现在这里。
 */
export function kinTreeOf(input: KinInput): KinTree {
  const known = whoIsOnChart(input.relations, input.known)
  const inGraph = (id: string): boolean => known.has(id)

  const rank = assignRanks(input.relations, inGraph)

  // 分辈。同一辈的按边上出现的先后排，不排序——世系图上谁站左谁站右没有真相，
  // 而一个「按 id 排」会让哥和弟的位置随 id 字母序跳
  const byRank = new Map<number, string[]>()
  for (const id of known) {
    const at = rank.get(id)
    if (at === undefined) continue
    const row = byRank.get(at)
    if (row) row.push(id)
    else byRank.set(at, [id])
  }

  const ranks: KinRank[] = [...byRank.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([at, members]) => ({ rank: at, members }))

  // 挑边：两头都在图上、两头都排进了辈分、这条边是公开事实
  const edges: KinEdge[] = []
  const drawn = new Set<string>()
  for (const relation of input.relations) {
    if (!isOpen(relation)) continue
    if (!inGraph(relation.from) || !inGraph(relation.to)) continue
    if (!PUBLIC_BONDS.includes(relation.bond)) continue
    const fromRank = rank.get(relation.from)
    const toRank = rank.get(relation.to)
    if (fromRank === undefined || toRank === undefined) continue

    // 长辈那头摆在 `a`。差几辈由算出来的辈分说了算，不由 bond 猜
    const ends = elderFirst(relation)
    const elderRank = ends.a === relation.from ? fromRank : toRank
    const youngerRank = ends.b === relation.from ? fromRank : toRank
    const kind = edgeKind(relation.bond, youngerRank - elderRank)
    if (kind === undefined) continue
    // 同一对人之间可能有好几条边（哥同时是兄和抚养人），一对只画一条线。
    // 键上带 kind：夫妻线和亲子线是两回事，不该互相顶掉
    const key = [kind, ...[ends.a, ends.b].sort()].join(' ')
    if (drawn.has(key)) continue
    drawn.add(key)
    edges.push({ ...ends, kind })
  }

  const loose = [...known].filter((id) => id !== 'me' && rank.get(id) === undefined)

  return { ranks, edges, loose }
}
