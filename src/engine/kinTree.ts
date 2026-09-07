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
  /**
   * **玩家知道的那些边**，由 `people.knownRelations()` 给（两头都是他认得的人、
   * 或他的血亲、或他自己；已经滤掉断了的边）。
   *
   * 这里不再自己判「哪些边玩家看得见」：那份判断从前在这个文件里抄过一遍
   * （一张 `BLOOD_BONDS` 表），跟 store 里那份**判着同一件事**，迟早各自漂。
   * 判断只留一处，这里只管把给到的边摆成一张图。
   */
  relations: readonly Relation[]
}

/*
 * 谁站得上这张图：**给进来的那些边的两头**，加上「我」自己。
 *
 * 用户 2026-09-07 拍的：这张图画玩家知道的人和玩家知道的边，
 * 不知道的节点不画、不知道的边不画。所以它是一张认知图，不是族谱。
 *
 * 「认得这个人」和「知道有这么个人」是两级（用户列的那条认知阶梯：
 * 陌生／见过／知道其存在／知道姓名…）。弃儿那一世的爹在你出生之前就殁了，
 * 从没 `meet` 过——可正文里玩家知道自己有爹（「你的名字不是爹娘给的」）。
 * 他落在「知道其存在」那一级，`knownRelations()` 把血亲算了进来，
 * 所以他在图上，格子里写「生父」（他没有称呼，那一格由面板从 bond 上算）。
 */
function whoIsOnChart(relations: readonly Relation[]): Set<string> {
  const on = new Set<string>(['me'])
  for (const relation of relations) {
    on.add(relation.from)
    on.add(relation.to)
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
  const known = whoIsOnChart(input.relations)
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

  // 挑边：两头都在图上、两头都排进了辈分。
  // **哪些边玩家看得见不在这里判**——那是 `people.knownRelations()` 的职责
  // （传进来的 `relations` 已经是玩家知道的那些）；画不画得成线由 `edgeKind` 判，
  // 「友」「仇」这类它返回 undefined。从前这儿还有一张 `PUBLIC_BONDS` 表，
  // 跟那两处各自判着同一件事，删了免得三处漂。
  const edges: KinEdge[] = []
  const drawn = new Set<string>()
  for (const relation of input.relations) {
    if (!inGraph(relation.from) || !inGraph(relation.to)) continue
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
