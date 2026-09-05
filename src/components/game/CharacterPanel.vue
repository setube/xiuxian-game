<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { ASPECTS } from '@/engine/aspects'
import { describeAge, describeStamp } from '@/engine/describe'
import { selfSense } from '@/engine/leanings'
import { noteOf } from '@/engine/note'
import { useCharacterStore } from '@/stores/character'
import { useLeaningStore } from '@/stores/leanings'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import { useWorldStore } from '@/stores/world'
import type { AspectKey } from '@/types/game'
import { computed } from 'vue'

/**
 * 人物：第二层信息。
 *
 * 这里没有「悟性 尚可」「气运 平平」——一个十六岁的私塾学生
 * 凭什么知道自己的气运？他只知道「我读过几年书」「我不知道灵根是什么」。
 * 数值留在引擎里做判定，界面上呈现的是角色对自己的认知，
 * 以及别人对他说过的话（只增不改，落差自己会显形）。
 *
 * 家世同理：standing 与 debt 一个字也不上界面。
 * 一个孩子对家境的全部认识就是饭桌上有没有肉、父亲这几年在哪——
 * 「家道中落」要从这两行读出来，不是从一个数字上看出来。
 */
const character = useCharacterStore()
const household = useHouseholdStore()
const people = usePeopleStore()
const world = useWorldStore()

/**
 * 家人那一行。
 *
 * 写的是玩家知道的，不是世界知道的：知道名字就写名字，
 * 不知道就只写「爹」。一个人的名字是要有人告诉你才知道的——
 * 小孩子未必问过爹叫什么。
 *
 * 拼那一句话的活儿在 `engine/note.ts`，跟人际面板同一支。
 */
function kinLine(id: string): string {
  const person = people.personOf(id)
  const acquaintance = people.known[id]
  return noteOf({
    person,
    age: people.ageOf(id),
    name: acquaintance?.knowsName && person ? `${person.surname}${person.given}` : undefined,
    vanished: '没有消息。',
    // 这一栏本来就只列自家人，所以落回家里的营生在这儿是无条件的
    fallback: household.livelihood,
  })
}

const leaning = useLeaningStore()

/**
 * 心里的事。
 *
 * 这一段**没有一个数字**，而且这是有意的：别人怎么看你不给数字，
 * 世界什么光景不给数字，那么你自己是什么人更不该给数字。
 * 一旦这里出现「离乡 63 / 求医 12」，这个游戏就变成了另一个游戏。
 *
 * 他到「反复」这一档时，这里是一句他自己也说不清的话；
 * 到「明白」了，才是他真正说出口的那一句。
 * 而**大多数人一辈子这一段都是空的**——那不是缺内容。
 */
const sense = computed(() => selfSense())

/** 他做过的那些事。「我好像总是这样做」要玩家自己从这一串里读出来 */
const traces = computed(() =>
  leaning
    .atLeast('反复')
    .flatMap((item) => item.moments.slice(-3))
    .sort((a, b) => a.at.year - b.at.year),
)

const { name, age, identity, realm, aspects } = storeToRefs(character)
const { livelihood, business, station, gender, home, members, outlook } = storeToRefs(household)
const { place } = storeToRefs(world)

/**
 * 家世那一行。
 *
 * 从前是一句写死的 `你家在{home}，{trade}。`，而它对两种出身是穿帮的：
 * 皇室那一世读到的是「你家在天启皇城 · 东宫，皇室。」——
 * 一个人不会这样介绍自己家。毛病出在那个字段身上：
 * 十一个值里既有营生又有铺面又有身份，一句模板套不住。
 *
 * 现在三格各答各的，而且**先后是有讲究的**：
 *
 *     有铺面的　　先说铺面　　　　那是这家人每天待的地方
 *     宗室　　　　什么也不说　　　宫墙里的人不谈「靠什么过活」
 *     仕宦　　　　说门第　　　　　「当差」不是这家人的自我认识
 *     其余　　　　说业　　　　　　靠地、靠山、靠手艺
 *
 * 宗室那一档只剩地址，看着短，可那正是实情——**他家不靠任何营生过活**，
 * 而这件事一旦被削爵那一卷改掉（`station` 落到「寻常」），
 * 这一行会自己变成「靠……过活」，不必再改一个字。
 */
const houseLine = computed(() => {
  const at = `你家在${home.value}`
  if (business.value) return `${at}，开着一间${business.value}。`
  if (station.value === '宗室') return `${at}。`
  if (station.value === '仕宦') return `${at}，官宦人家。`
  return `${at}，靠${livelihood.value}过活。`
})

function selfOf(key: AspectKey, fallback: string): string {
  return aspects.value[key].self ?? fallback
}

function isUnknown(key: AspectKey): boolean {
  return aspects.value[key].self === null
}
</script>

<template>
  <div>
    <dl class="facts">
      <dt>姓名</dt>
      <dd>{{ name }}</dd>
      <dt>年龄</dt>
      <dd>{{ describeAge(age) }} · {{ gender }}</dd>
      <dt>身份</dt>
      <dd>{{ identity }}</dd>
      <!-- 凡人不会用「境界」想自己。等真入了门，这一行才有意义 -->
      <template v-if="realm !== '凡人'">
        <dt>修为</dt>
        <dd class="text-cinnabar">{{ realm }}</dd>
      </template>
      <dt>所在</dt>
      <dd>{{ place }}</dd>
    </dl>

    <!-- 家世。人没了也不从名册里删，只是那一行变浅——
         父亲死在外地那年你十四岁，这件事此后一直在你的人生里 -->
    <section class="household">
      <h3 class="ink-label">家世</h3>
      <p class="self">{{ houseLine }}</p>
      <p class="self outlook">{{ outlook }}</p>
      <ul class="kin">
        <li
          v-for="member in members"
          :key="member.person"
          :class="{ gone: !people.isAlive(member.person) }"
        >
          <span class="who">{{ member.relation }}</span>
          <span class="what">{{ kinLine(member.person) }}</span>
        </li>
      </ul>
    </section>

    <!--
      心里的事。空着是常态——大多数人一辈子说不出自己想要什么，
      而那不是缺内容，那就是大多数人真实的样子
    -->
    <section v-if="sense.length > 0" class="leaning">
      <h3 class="ink-label">心里的事</h3>
      <p v-for="line in sense" :key="line" class="self">{{ line }}</p>

      <!-- 他做过的那些事。这一串才是那句话的来历 -->
      <details v-if="traces.length > 0" class="traces">
        <summary class="ink-stamp">你都做过些什么</summary>
        <ul>
          <li v-for="(trace, index) in traces" :key="index">
            <span class="ink-stamp">第 {{ trace.at.year }} 年</span>
            <span class="what">{{ trace.text }}</span>
          </li>
        </ul>
      </details>
    </section>

    <section v-for="aspect in ASPECTS" :key="aspect.key" class="aspect">
      <h3 class="ink-label">{{ aspect.label }}</h3>
      <p class="self" :class="{ blank: isUnknown(aspect.key) }">
        {{ selfOf(aspect.key, aspect.unknown) }}
      </p>

      <ul v-if="aspects[aspect.key].claims.length > 0" class="claims">
        <li v-for="claim in aspects[aspect.key].claims" :key="claim.id">
          <p class="ink-branch">
            <span>{{ claim.source }}说：「{{ claim.text }}」</span>
          </p>
          <p v-if="claim.doubt" class="doubt">{{ claim.doubt }}</p>
          <p class="ink-stamp when">{{ describeStamp(claim.at) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* 心里的事。楷体，因为这一段是他自己的话，不是账目 */
.leaning .self {
  font-family: var(--font-kai);
}

.traces {
  margin: 0.4rem 0 0;
  padding-left: 1.4em;
}

.traces > summary {
  cursor: pointer;
  list-style: none;
}

.traces > summary::before {
  content: '▸ ';
}

.traces[open] > summary::before {
  content: '▾ ';
}

.traces ul {
  margin: 0.3rem 0 0;
  padding: 0;
  list-style: none;
}

.traces li {
  display: flex;
  align-items: baseline;
  line-height: 1.8;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.traces li > * + * {
  margin-left: 0.6em;
}

.traces .what {
  color: var(--color-ink-faint);
  font-family: var(--font-kai);
}

/* 四项事实，两列对齐。这一块要一眼扫完，不该有阅读的节奏 */
.facts {
  /* 两栏用浮动排，不用网格——那个布局方式要 Chrome 57，
     而这个项目的下限是 51。`overflow: hidden` 是给浮动收边的，别删：
     少了它，底下的 `.aspect` 会爬到标签栏旁边去 */
  overflow: hidden;
  margin: 0 0 1.4rem;
  font-size: var(--text-note);
}

.facts dt {
  float: left;
  /* 每一行的标签都要另起一行，否则第二个标签会贴在上一行的值后面 */
  clear: left;
  /* 标签都是两个汉字，字距 0.16em——实测约 2rem，3.5rem 留足了余量 */
  width: 3.5rem;
  margin-bottom: 0.15rem;
  color: var(--color-ink-faint);
  letter-spacing: 0.16em;
}

.facts dd {
  /* 3.5rem 标签栏 + 1.1rem 栏距。从前这两个数由网格的
     栏定义和栏距各管一半，现在合成这一个外边距 */
  margin: 0 0 0.15rem 4.6rem;
  color: var(--color-ink-deep);
}

.aspect + .aspect {
  margin-top: 1.1rem;
}

.household {
  margin-bottom: 1.4rem;
}

.household h3,
.aspect h3 {
  margin: 0 0 0.25rem;
  font-weight: normal;
}

/* 家中光景比出身那一行重：出身十六年不变，光景年年在动 */
.outlook {
  color: var(--color-ink-deep);
}

.kin {
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-note);
}

.kin > li {
  /* 关系名 + 那个人怎么样，两栏。用弹性盒不用网格——
     网格布局要 Chrome 57，而这个项目的下限是 51 */
  display: flex;
  line-height: 1.75;
}

.kin .who {
  /* 从前这一栏宽度写在父级的栏定义里，
     栏距写在 `gap` 里；现在两个数都落到这一格自己身上 */
  flex: none;
  width: 3.2em;
  margin-right: 0.8rem;
  color: var(--color-ink-faint);
  letter-spacing: 0.16em;
}

.kin .what {
  /* `min-width: 0` 不能省：弹性项默认不肯缩到内容宽度以下，
     少了它，长句子会把这一行顶出版框 */
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-ink-deep);
}

/* 不在了的人不从名册里删，只是整行退到淡墨——这一生他还在里面 */
.kin > li.gone .what {
  color: var(--color-ink-faint);
}

.self {
  margin: 0;
  line-height: 1.8;
}

/* 「你不知道那是什么」本身就是一条信息，但它比自述更轻 */
.self.blank {
  color: var(--color-ink-faint);
}

.claims {
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

.claims > li + li {
  margin-top: 0.6rem;
}

/* 你对这句话的理解——通常是不理解。缩到连接符之后，说明它从属于上一句 */
.doubt {
  margin: 0.1rem 0 0;
  padding-left: 1.4em;
  color: var(--color-ink-faint);
  font-family: var(--font-kai);
  font-size: var(--text-note);
  line-height: 1.75;
}

.when {
  margin: 0.1rem 0 0;
  padding-left: 1.4em;
}
</style>
