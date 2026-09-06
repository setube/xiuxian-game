<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { usePeopleStore } from '@/stores/people'
import { useHouseholdStore } from '@/stores/household'
import { HOUSEHOLD_BONDS, noteOf } from '@/engine/note'
import { kinCall } from '@/engine/address'
import { kinTreeOf, type KinEdge } from '@/engine/kinTree'
import type { Bond } from '@/types/game'

/**
 * 人际：你认得的人，摆成一张世系图。
 *
 * 这里没有好感度数字，也没有进度条。亲疏是内部刻度，只喂给引擎判定——
 * 一个人不会知道「先生对我好感 62」，他只知道「先生教了我九年书」。
 * 玩家看到的就是这句话。
 *
 * 数据只有一个来源：人口册。**玩家自己也只是 people 图里的一个节点**，
 * 所以「我」在这张图上跟别人一样是一个格子，只是描了朱砂。
 *
 * ## 为什么是图不是列表
 *
 * `people.relations` 本来就是一张图，可从前这个面板把它压成了一列名字：
 * 每一行都是「我」跟某个人的一条边，**人与人之间的边一条也没上过界面**。
 * 于是「爹和娘是夫妻」「侄儿是哥的儿子」这些事，数据里一直有，玩家一直看不见。
 *
 * 辈分怎么算、哪条边该画，都在 `engine/kinTree.ts`。这里只管把它摆到纸上。
 *
 * ## 线画在 SVG 上，名字是 HTML 按钮
 *
 * 两层叠着：底下一张 SVG 只画线（`pointer-events: none`），上面用绝对定位摆
 * 一排 `<button>`。不把名字也画进 SVG，是因为**这个项目的下限是 Chrome 51**
 * （见 `styles/main.css` 里那几处让步），而 SVG 上的 `tabindex` 在那个年代
 * 支持得七零八落。摆成 HTML 按钮，键盘焦点、`:focus-visible`、hover
 * 全是浏览器原生的行为，一行兼容代码都不用写。
 */
const people = usePeopleStore()
const household = useHouseholdStore()
const { known, relations } = storeToRefs(people)

/** 一格多宽、一辈多高。名字最长的是「渡口的青衫人」这种，超了截断 */
const COL = 84
const ROW = 72
/** 名字那一格的高度。线要从格子边缘出发，不能从字的正中穿出来 */
const NODE_H = 26

/** 「爹」这种称呼本身已经说明了关系，就不必再标一遍 */
const IMPLIED: readonly Bond[] = ['生父', '生母']

/** 点开了谁。没点就是 null——图上不预选任何人 */
const chosen = ref<string | null>(null)

const tree = computed(() =>
  kinTreeOf({ relations: relations.value, known: Object.keys(known.value) }),
)

interface Placed {
  id: string
  x: number
  y: number
}

/** 每一辈横向居中排。各辈共用一个格宽，线才不会歪 */
const layout = computed(() => {
  const rows = tree.value.ranks
  const widest = rows.reduce((most, row) => Math.max(most, row.members.length), 0)
  const width = Math.max(widest, 1) * COL
  const placed = new Map<string, Placed>()

  rows.forEach((row, index) => {
    const start = (width - row.members.length * COL) / 2
    row.members.forEach((id, seat) => {
      placed.set(id, {
        id,
        x: start + (seat + 0.5) * COL,
        y: index * ROW + ROW / 2,
      })
    })
  })

  return { placed, width, height: Math.max(rows.length, 1) * ROW }
})

/** 一对人的稳定键。谁在前谁在后不该影响它 */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join(' ')
}

const spousePairs = computed(() => {
  const pairs = new Set<string>()
  for (const edge of tree.value.edges) {
    if (edge.kind === '夫妻') pairs.add(pairKey(edge.a, edge.b))
  }
  return pairs
})

/** 谁的长辈是谁。一个人可能只有一个长辈上了图（另一个玩家不认得） */
const parentsOf = computed(() => {
  const parents = new Map<string, string[]>()
  for (const edge of tree.value.edges) {
    if (edge.kind !== '亲子') continue
    const row = parents.get(edge.b)
    if (row) row.push(edge.a)
    else parents.set(edge.b, [edge.a])
  }
  return parents
})

interface Stroke {
  key: string
  d: string
  kind: KinEdge['kind']
  /** 这条线连着的两个人。点开谁，跟他相连的线就描成朱砂 */
  ends: [string, string]
}

/**
 * 把边画成线。
 *
 * 亲子线走折线：从长辈格子底下垂到两辈之间，横过去，再垂到晚辈格子顶上——
 * 家谱历来就是这么画的。**爹娘俱在图上时，线从他俩中间垂下**，
 * 不是各画一条：一个孩子有两条线分别连着爹和娘，读起来像两个来源，
 * 而他只有一个来源，是那门亲事。
 */
const strokes = computed<Stroke[]>(() => {
  const { placed } = layout.value
  const out: Stroke[] = []

  // 夫妻：两格之间一道双横线。古籍家谱里夫妻就是并排一条横杠
  for (const edge of tree.value.edges) {
    if (edge.kind !== '夫妻') continue
    const a = placed.get(edge.a)
    const b = placed.get(edge.b)
    if (!a || !b) continue
    const left = Math.min(a.x, b.x) + COL / 2 - 8
    const right = Math.max(a.x, b.x) - COL / 2 + 8
    if (right <= left) continue
    out.push({
      key: `wed ${pairKey(edge.a, edge.b)}`,
      d: `M ${left} ${a.y - 2} H ${right} M ${left} ${a.y + 2} H ${right}`,
      kind: '夫妻',
      ends: [edge.a, edge.b],
    })
  }

  // 亲子：一个孩子一次画完，这样爹娘俱在时能从中点垂下
  for (const [child, parents] of parentsOf.value) {
    const kid = placed.get(child)
    if (!kid) continue
    const seats = parents.map((id) => placed.get(id)).filter((one): one is Placed => !!one)
    if (seats.length === 0) continue

    const married = seats.length === 2 && spousePairs.value.has(pairKey(parents[0]!, parents[1]!))
    const sources = married
      ? [{ x: (seats[0]!.x + seats[1]!.x) / 2, y: seats[0]!.y, from: parents }]
      : seats.map((seat) => ({ x: seat.x, y: seat.y, from: [seat.id] }))

    for (const source of sources) {
      // 夫妻中点那条线从横杠上起步，单亲从格子底下起步
      const top = married ? source.y + 2 : source.y + NODE_H / 2
      const bottom = kid.y - NODE_H / 2
      const middle = (source.y + kid.y) / 2
      for (const parent of source.from) {
        out.push({
          key: `kin ${parent} ${child}`,
          d: `M ${source.x} ${top} V ${middle} H ${kid.x} V ${bottom}`,
          kind: '亲子',
          ends: [parent, child],
        })
      }
    }
  }

  /*
   * 同辈线只画「看不出同源」的那一对。
   *
   * 哥和我都连在爹娘底下，图上已经说清楚我们是兄弟了——再描一条横线是把
   * 同一件事说两遍，而两遍之间那条多出来的线会跟亲子线挤在一处。
   * 只有爹娘一个都不在图上的时候（早殁、或玩家压根没认识过），
   * 兄弟俩才是两个孤零零的格子，那时才需要一条线把他们连起来。
   */
  for (const edge of tree.value.edges) {
    if (edge.kind !== '同辈') continue
    const mine = parentsOf.value.get(edge.a) ?? []
    const theirs = parentsOf.value.get(edge.b) ?? []
    if (mine.some((one) => theirs.includes(one))) continue
    const a = placed.get(edge.a)
    const b = placed.get(edge.b)
    if (!a || !b) continue
    const left = Math.min(a.x, b.x) + COL / 2 - 8
    const right = Math.max(a.x, b.x) - COL / 2 + 8
    if (right <= left) continue
    out.push({
      key: `sib ${pairKey(edge.a, edge.b)}`,
      d: `M ${left} ${a.y} H ${right}`,
      kind: '同辈',
      ends: [edge.a, edge.b],
    })
  }

  return out
})

/** 图上的每一格 */
const seats = computed(() =>
  [...layout.value.placed.values()].map((seat) => ({
    ...seat,
    calls: nameOf(seat.id),
    gone: seat.id !== 'me' && !people.isAlive(seat.id),
  })),
)

/**
 * 这一格上写谁。
 *
 * 认得的人问人口册（`callOf`）。**图上还有一种人是没见过面的**：
 * 出生之前就殁了的爹——`known` 里没有他，可血缘边一直立着，
 * 于是 `kinTree` 把他补上了图（见那边 `whoIsOnChart` 的注释）。
 *
 * 这种人多半连称呼都没有，而且**修法不在这儿**：寻常人家那一套「爹」「娘」
 * 故意不在称谓表里（`content/address.ts` 说得很明白：「那不是缺省，
 * 那就是寻常人家那一套本身」），它的出处是境况表 `meet` 进 `known` 的那个
 * `calls`——从没 `meet` 过的人，那一格是空的。在这里硬编一张「爹娘哥姐」
 * 就是把那张表写第二遍，而两处一抄就会各自漂。
 *
 * 所以写世上唯一记着的那件事：他跟我是什么关系。`Bond` 的值本来就是
 * 给玩家看的字（`types/game.ts` 那处注释：它会原样落到人际面板上）。
 *
 * 这一层不写进 `people.callOf`，是因为那个函数是**正文里 `{call:…}` 的同一个出口**：
 * 改它等于把这些字塞进所有正文，那是另一件事，得连着正文一起看。
 */
function nameOf(id: string): string {
  if (id === 'me') return '我'
  if (known.value[id] !== undefined) return people.callOf(id)
  const bonds = people.bondsWith(id)
  // 教养、爵位那两层能答就用它答，跟正文里的 `{elder}` 是同一个函数、同一个答案
  for (const bond of bonds) {
    const learnt = kinCall(bond, people.personOf(id)?.rank, '家常')
    if (learnt !== undefined) return learnt
  }
  return bonds[0] ?? '不知是谁'
}

/** 排不进世系的人：先生、朋友、说不上辈分的亲戚 */
const loose = computed(() =>
  tree.value.loose.map((id) => ({
    id,
    calls: nameOf(id),
    bonds: people.bondsWith(id).filter((bond) => !IMPLIED.includes(bond)),
  })),
)

function isLit(stroke: Stroke): boolean {
  return chosen.value !== null && stroke.ends.includes(chosen.value)
}

function pick(id: string): void {
  chosen.value = chosen.value === id ? null : id
}

/** 点开的那个人：他是我的什么、他现在怎么样 */
const opened = computed(() => {
  const id = chosen.value
  if (id === null) return null
  if (id === 'me') return { calls: '我', bonds: [] as Bond[], note: '你自己。' }
  return {
    calls: nameOf(id),
    bonds: people.bondsWith(id).filter((bond) => !IMPLIED.includes(bond)),
    note: noteFor(id),
  }
})

/**
 * 他现在怎么样了。
 *
 * 拼那一句话的活儿在 `engine/note.ts`——它从前写在这儿，
 * 于是「面板上最终那一行字」是全套走查唯一够不着的东西，
 * 「爹 43岁。undefined」就是从这个缝里漏出去的。
 */
function noteFor(id: string): string {
  const bonds = people.bondsWith(id)
  return noteOf({
    person: people.personOf(id),
    remembered: known.value[id]?.note,
    age: people.ageOf(id),
    months: people.monthsOf(id),
    vanished: '再没有消息。',
    // 只有同一个家里过活的人才落回家业。先生、商旅、掌柜不做你家的营生
    fallback: bonds.some((bond) => HOUSEHOLD_BONDS.includes(bond))
      ? household.livelihood
      : undefined,
  })
}
</script>

<template>
  <div>
    <p v-if="seats.length <= 1 && loose.length === 0" class="ink-note">你还没有真正认识什么人。</p>

    <template v-else>
      <div class="chart">
        <div class="paper" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
          <svg
            class="lines"
            :viewBox="`0 0 ${layout.width} ${layout.height}`"
            :width="layout.width"
            :height="layout.height"
            aria-hidden="true"
            focusable="false"
          >
            <path
              v-for="stroke in strokes"
              :key="stroke.key"
              :d="stroke.d"
              class="line"
              :class="{ lit: isLit(stroke) }"
            />
          </svg>

          <button
            v-for="seat in seats"
            :key="seat.id"
            type="button"
            class="seat"
            :class="{ me: seat.id === 'me', gone: seat.gone, open: chosen === seat.id }"
            :style="{ left: `${seat.x}px`, top: `${seat.y}px` }"
            :aria-pressed="chosen === seat.id"
            :title="seat.calls"
            @click="pick(seat.id)"
          >
            {{ seat.calls }}
          </button>
        </div>
      </div>

      <!-- 点开谁，谁的近况落在图下方。不点就留着这一句 -->
      <p v-if="opened === null" class="ink-note hint">点一个人，看他的近况。</p>
      <div v-else class="opened">
        <p class="name">
          {{ opened.calls }}
          <span v-if="opened.bonds.length > 0" class="bond">{{ opened.bonds.join(' · ') }}</span>
        </p>
        <p class="ink-branch">
          <span>{{ opened.note }}</span>
        </p>
      </div>

      <!--
        排不进世系的人。他们不是没关系，是这张图答不了他们——
        世系图的纵轴是辈分，而教了你九年书的先生在这根轴上没有位置。
      -->
      <div v-if="loose.length > 0" class="aside">
        <ul class="others">
          <li v-for="one in loose" :key="one.id">
            <button type="button" class="other" @click="pick(one.id)">
              {{ one.calls }}
              <span v-if="one.bonds.length > 0" class="bond">{{ one.bonds.join(' · ') }}</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 一辈人多了会比版框宽。横着推，不压缩格子——名字挤成一团就谁也认不出了 */
.chart {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.25rem;
}

.paper {
  position: relative;
  margin-left: auto;
  margin-right: auto;
}

.lines {
  position: absolute;
  top: 0;
  left: 0;
  /* 线不接鼠标：点击要落到上面那层按钮上 */
  pointer-events: none;
}

/* 世系的线是陪衬，不承载文义——`--color-ink-ghost` 那一格就是为这个留的 */
.line {
  fill: none;
  stroke: var(--color-ink-ghost);
  stroke-width: 1;
  transition: stroke 0.25s ease;
}

.line.lit {
  stroke: var(--color-cinnabar);
}

.seat {
  position: absolute;
  /* 坐标给的是格子中心 */
  transform: translate(-50%, -50%);
  max-width: 80px;
  overflow: hidden;
  padding: 0.2rem 0.3rem;
  border: 0;
  /* 纸色底：线从格子背后穿过时，得让名字压在线上面 */
  background-color: var(--color-paper);
  color: var(--color-ink-deep);
  font-family: inherit;
  font-size: var(--text-note);
  white-space: nowrap;
  text-overflow: ellipsis;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    color 0.25s ease,
    background-color 0.25s ease;
}

.seat:hover {
  background-color: var(--color-wash);
}

.seat:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: 1px;
}

/* 「我」描朱砂。图上认自己不该费第二眼 */
.seat.me {
  color: var(--color-cinnabar);
}

/*
 * 殁了的人：淡一档，名字两边加一对方括号。
 *
 * 不用删除线，也不做灰。**人殁了不是从系统里消失**——他还在人口册、
 * 关系图、编年、日录里（见 `types/game.ts` 的 `House.head`），
 * 图上也还站在他那一辈。只是那个名字读起来该跟活人不一样。
 */
.seat.gone {
  color: var(--color-ink-faint);
}

.seat.gone::before {
  content: '〔';
}

.seat.gone::after {
  content: '〕';
}

.seat.open {
  background-color: var(--color-wash);
  color: var(--color-cinnabar);
}

.hint {
  margin-top: 1rem;
  margin-bottom: 0;
}

.opened {
  margin-top: 1rem;
}

.name {
  margin: 0;
  color: var(--color-ink-deep);
}

/* 关系比称呼轻一档：它是注解，不是名字 */
.bond {
  margin-left: 0.6em;
  color: var(--color-ink-faint);
  font-size: var(--text-note);
  letter-spacing: 0.1em;
}

/* 图与图外的人之间落一道线，两拨人不是一回事 */
.aside {
  margin-top: 1.25rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--color-rule);
}

.others {
  margin: 0;
  padding: 0;
  list-style: none;
}

.others > li + li {
  margin-top: 0.4rem;
}

.other {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-ink-deep);
  font-family: inherit;
  font-size: inherit;
  text-align: left;
  cursor: pointer;
  transition: color 0.25s ease;
}

.other:hover {
  color: var(--color-cinnabar);
}

.other:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: 2px;
}
</style>
