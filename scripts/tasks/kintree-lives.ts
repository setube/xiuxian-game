/**
 * 世系图门禁的单世模拟，从 `scripts/kintree.ts` 原样搬出来。
 *
 * 走法一步没动——同一套年表、同样两百回合上限、同样跑到咽气那年才读关系图。
 * **采样点是判据的一部分**（读的是咽气那年而不是十六岁那年），那段理由
 * 连同八条尺子自检都留在 `kintree.ts`，这里只把每一世看到的记下来。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { kinTreeOf } from '../../src/engine/kinTree'
import { useStory } from '../../src/engine/story'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'

/** 这个人站在第几辈。图上找不到他就是 undefined */
export function rankOf(tree: ReturnType<typeof kinTreeOf>, id: string): number | undefined {
  return tree.ranks.find((row) => row.members.includes(id))?.rank
}

export interface Offence {
  what: string
  detail: string
}

export interface KinTreeShard {
  sawParents: number
  sawNephew: number
  sawInLaw: number
  sawCouple: number
  sawSibling: number
  sawChild: number
  seats: number
  worlds: number
  wrongElders: Offence[]
  wrongNephew: Offence[]
  wrongInLaw: Offence[]
  looseKin: Offence[]
  danglingEdge: Offence[]
  strangerOnChart: Offence[]
  noCoupleLine: Offence[]
  siblingAdrift: Offence[]
  childAdrift: Offence[]
}

export function runShard(runs: number): KinTreeShard {
  const wrongElders: Offence[] = []
  const wrongNephew: Offence[] = []
  const wrongInLaw: Offence[] = []
  const looseKin: Offence[] = []
  const danglingEdge: Offence[] = []
  const strangerOnChart: Offence[] = []
  const noCoupleLine: Offence[] = []
  const siblingAdrift: Offence[] = []
  const childAdrift: Offence[] = []
  let sawParents = 0
  let sawNephew = 0
  let sawInLaw = 0
  let sawCouple = 0
  let sawSibling = 0
  let sawChild = 0
  let seats = 0
  let worlds = 0

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const people = usePeopleStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })

    story.begin()
    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((o) => !o.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    /*
     * 咽气那年读这张图。
     *
     * **采样点也是判据。** 挑这一刻是因为它人最全：爹娘、兄弟、嫂子、侄儿、
     * 自己的妻儿都已经在册上了，一辈到四辈都可能同时在图上。
     * 早读（比如十六岁那年）图上只有爹娘和兄弟，第二、三条根本采不到样本。
     */
    const known = Object.keys(people.known)
    const tree = kinTreeOf({ relations: people.relations, known })
    worlds += 1
    seats += tree.ranks.reduce((sum, row) => sum + row.members.length, 0)

    const mine = rankOf(tree, 'me')
    const seated = new Set(tree.ranks.flatMap((row) => row.members))

    /*
     * 一、生父生母必须比我高一辈。
     *
     * 判据问的是**边**，不是 `known`——这两者差着一个真实的坏法。
     * 弃儿那一世的爹在你出生之前就殁了：`known` 里没有他，可
     * `me →生父 father` 那条边一直立着（`life/birth.ts`：「边照牵。人没了，
     * 血缘还在」）。头一版写的是 `if (!known.includes(id)) continue`，
     * 于是那种世里这一条**整条跳过**，而图上正缺着父亲那一辈——
     * 没查到和查过了长得一模一样。
     *
     * 改成沿边问之后，凡是世上记着「他是我爹」的世，这一条都查得到。
     */
    const bloodElders = people.relations.filter(
      (one) =>
        one.from === 'me' && one.until === null && (one.bond === '生父' || one.bond === '生母'),
    )
    for (const one of bloodElders) {
      const id = one.to
      const at = rankOf(tree, id)
      if (at === undefined) {
        const his = people.relations
          .filter((edge) => edge.from === id || edge.to === id)
          .map(
            (edge) =>
              `${edge.from}→${edge.to} ${edge.bond}${edge.until === null ? '' : `（${edge.until} 年止）`}`,
          )
        looseKin.push({
          what: id,
          detail: `世上记着他是我的${one.bond}，可他没排进世系。身上的边：${his.join('、')}`,
        })
        continue
      }
      sawParents += 1
      if (mine !== undefined && at !== mine - 1) {
        wrongElders.push({ what: id, detail: `我在第 ${mine} 辈，而他在第 ${at} 辈` })
      }
    }

    /* 二、侄儿比哥低一辈。这一条是「沿图走」的踩实处 */
    if (known.includes('nephew') && known.includes('brother')) {
      const nephew = rankOf(tree, 'nephew')
      const brother = rankOf(tree, 'brother')
      if (nephew !== undefined && brother !== undefined) {
        sawNephew += 1
        if (nephew !== brother + 1) {
          wrongNephew.push({
            what: 'nephew',
            detail: `哥在第 ${brother} 辈，侄儿在第 ${nephew} 辈`,
          })
        }
      } else if (nephew === undefined) {
        looseKin.push({ what: 'nephew', detail: '认得侄儿，可他没排进世系' })
      }
    }

    /* 三、嫂子跟哥同辈。这一条守的是那条「哥↔嫂子 配偶」的边 */
    if (
      known.includes('brother-wife') &&
      known.includes('brother') &&
      people.personOf('brother-wife') !== undefined &&
      people.personOf('brother') !== undefined
    ) {
      const wife = rankOf(tree, 'brother-wife')
      const brother = rankOf(tree, 'brother')
      if (wife !== undefined && brother !== undefined) {
        sawInLaw += 1
        if (wife !== brother) {
          wrongInLaw.push({ what: 'brother-wife', detail: `哥第 ${brother} 辈，嫂子第 ${wife} 辈` })
        }
      } else if (wife === undefined) {
        wrongInLaw.push({ what: 'brother-wife', detail: '嫂子没排进世系，掉进了图外那一栏' })
      }
    }

    /*
     * 三点五、爹娘之间要有一条夫妻线，兄弟姐妹要连到爹娘。
     *
     * 这两条边不从「我」出发，所以从前一条也没有（`content/birth.ts`、
     * `engine/effects.ts` 各补了一处）。缺了它们图不会报错，只会**读起来不对**：
     * 爹娘并排站着中间没有线，哥悬在旁边跟这个家只靠一条「我的哥」挂着。
     *
     * 判据问的是画出来的线，不是边本身——中间隔着 `edgeKind` 和挑边那一步，
     * 只验边等于没验到图。
     */
    const dadId = bloodElders.find((one) => one.bond === '生父')?.to
    const mumId = bloodElders.find((one) => one.bond === '生母')?.to
    if (dadId !== undefined && mumId !== undefined) {
      sawCouple += 1
      const wed = tree.edges.some(
        (one) =>
          one.kind === '夫妻' &&
          ((one.a === dadId && one.b === mumId) || (one.a === mumId && one.b === dadId)),
      )
      if (!wed) {
        noCoupleLine.push({ what: `${dadId}·${mumId}`, detail: '爹娘都在图上，中间却没有夫妻线' })
      }
    }
    for (const one of people.relations) {
      if (one.from !== 'me' || one.until !== null) continue
      if (!['兄', '姐', '弟', '妹'].includes(one.bond)) continue
      if (dadId === undefined && mumId === undefined) continue
      if (rankOf(tree, one.to) === undefined) continue
      sawSibling += 1
      const tied = tree.edges.some(
        (edge) =>
          edge.kind === '亲子' && edge.b === one.to && (edge.a === dadId || edge.a === mumId),
      )
      if (!tied) {
        siblingAdrift.push({
          what: one.to,
          detail: `他是我的${one.bond}，跟我同一对爹娘，可图上他没连到爹娘`,
        })
      }
    }

    /*
     * 三点六、我的孩子要同时连着我和我的配偶。
     *
     * 跟上面那两条是同一类缺口的最后一处：`me→子 X` 记的是「他是我的儿子」，
     * 而「他也是他娘生的」得单独记（`engine/effects.ts` 的 `meet`）。
     * 缺了它孩子只连着我一个，那条线从我脚底单独垂下来——图上读起来像
     * 这孩子只有一个来源，而他是那门亲事的。
     */
    const myChildren = people.relations.filter(
      (one) => one.from === 'me' && one.until === null && (one.bond === '子' || one.bond === '女'),
    )
    const mySpouses = people.relations
      .filter((one) => one.from === 'me' && one.until === null && one.bond === '配偶')
      .map((one) => one.to)
    for (const child of myChildren) {
      if (mySpouses.length === 0) continue
      if (rankOf(tree, child.to) === undefined) continue
      sawChild += 1
      const tied = tree.edges.some(
        (edge) => edge.kind === '亲子' && edge.b === child.to && mySpouses.includes(edge.a),
      )
      if (!tied) {
        childAdrift.push({
          what: child.to,
          detail: `他是我的${child.bond}，我也有配偶在图上，可图上他只连着我一个`,
        })
      }
    }

    /* 四、每条线的两头都得有座位，否则 SVG 画到虚空里去 */
    for (const edge of tree.edges) {
      if (!seated.has(edge.a) || !seated.has(edge.b)) {
        danglingEdge.push({ what: `${edge.a}-${edge.b}`, detail: `${edge.kind} 线有一头不在图上` })
      }
    }

    /*
     * 五、图上不许出现玩家够不着的人。
     *
     * 「够得着」两条路：认得他，或者世上记着他跟我之间有一条直接的边
     * （没见过面的爹走的是后一条）。两条都不占的人不该站上来——
     * 哥在镇上认识的木匠师傅、邻居家的亲家，都不该在这本册子上。
     *
     * 这一条守的是 `whoIsOnChart` 那条补丁**只补一跳**：它一旦级联，
     * 整个世界的人口志都会顺着边爬进这张图。
     */
    const reachable = new Set(known)
    for (const one of people.relations) {
      if (one.until !== null) continue
      if (one.from === 'me') reachable.add(one.to)
      else if (one.to === 'me') reachable.add(one.from)
    }
    for (const id of seated) {
      if (id !== 'me' && !reachable.has(id)) {
        strangerOnChart.push({ what: id, detail: '玩家既不认得他，也没有一条边直接连着他' })
      }
    }
  }

  return {
    sawParents,
    sawNephew,
    sawInLaw,
    sawCouple,
    sawSibling,
    sawChild,
    seats,
    worlds,
    wrongElders,
    wrongNephew,
    wrongInLaw,
    looseKin,
    danglingEdge,
    strangerOnChart,
    noCoupleLine,
    siblingAdrift,
    childAdrift,
  }
}
