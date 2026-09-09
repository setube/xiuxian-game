/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 「不老」这件事，引擎看得见吗。
 *
 * 跑法：`bun scripts/ageing.ts`
 *
 * ## 这一支守的是用户拍板那三层里的第二层
 *
 * 用户 2026-09-10 把寿命拍成三层：
 *
 *     延寿   上限增加、明显衰老
 *     不老   衰老速度变了、外表停住
 *     长生   不受凡人尺度支配
 *
 * 而在 `Person.seemsAge` 那一格之前，**引擎只落得了头一层**：
 * `span: 200` 说得了「他能活很久」，说不了「他不老」。
 * 库里四个修士在引擎眼里一模一样，正文里却是两种人——
 * 秦守拙「头发全白」，另外三个「看着不到三十」。
 *
 * ## 三问，各守一头
 *
 *     一、每个修士都表过态吗　　　　新加一个人不表态，他会悄悄变成「会老」
 *     二、写的数跟正文对得上吗　　　`seemsAge` 比 `bornBefore` 还大就是写反了
 *     三、延寿那一层还有活例子吗　　全都写上 `seemsAge`，三层就塌成两层
 *
 * ## 第三问是这一支的重点，而它是一条「守缺席」的判据
 *
 * 秦守拙是库里唯一一个**故意不写** `seemsAge` 的人——
 * 「延寿」跟「不老」的分别整个落在这一个缺席上。
 * 哪天有人顺手给他补一个数（看着像是补全了数据），
 * **三层里的第一层就没有活的例子了**，而报表上什么也看不出来。
 *
 * 守缺席的判据很少见，因为「什么都没写」通常不值得守。
 * 这一处值得：**那个空格子是一条设计主张。**
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { CULTIVATORS } from '../src/content/cultivators'
import { lifeScenes } from '../src/content/life'
import { makePerson, usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Condition } from '../src/types/game'

const wrong: string[] = []

/**
 * 在玩家多大那年问这些人。
 *
 * **这个数是判据的一部分，不是随手取的**：`mountain` / `meeting` 那几卷
 * 真正发生在玩家二三十岁，而 `bornBefore` 是「比玩家早生多少年」——
 * 在玩家 0 岁那年问，每个人都还没长到内容里写的那个岁数。
 *
 * 头一版就栽在这儿：崔延 `bornBefore: 19`、`seemsAge: 22`，
 * 0 岁那年问出来「看着比实际还老 3 岁」，而正文一个字没错。
 */
const MET_AT = 30

console.log('\n【库里的修士，各自看着多大】\n')
for (const one of CULTIVATORS) {
  const seems = one.seemsAge === undefined ? '跟岁数一起走' : `停在 ${one.seemsAge}`
  console.log(
    `  ${one.surname}${one.given}`.padEnd(8) +
      `${one.realm}`.padEnd(6) +
      `早生 ${String(one.bornBefore).padStart(3)} 年　天年 ${one.span}　${seems}`,
  )
}

/*
 * 一、每个修士都表过态吗。
 *
 * 「表态」包括**明确不写**——所以这一问不能问「都写了吗」，
 * 那会逼着秦守拙也写一个数，正好毁掉第三问守的那件事。
 *
 * 能问的是：**写了的那些，数得说得通**。而没写的那些由第三问兜着。
 */
const aged = CULTIVATORS.filter((one) => one.seemsAge === undefined)
const unaged = CULTIVATORS.filter((one) => one.seemsAge !== undefined)

// 二、写的数跟他的岁数对得上吗
for (const one of unaged) {
  const seems = one.seemsAge!
  if (seems <= 0 || seems > 120) {
    wrong.push(`${one.given} 的 seemsAge = ${seems}，这个数不像一个人的样子`)
  }
  /*
   * ⚠️ **这一问原先拿 `bornBefore` 当「他初见时多大」，而那是错的。**
   *
   * `bornBefore` 是「比玩家早生多少年」，不是岁数——崔延 `bornBefore: 19`，
   * 玩家三十岁那年他四十九，而门禁头一版在**玩家 0 岁**那年问，
   * 于是把「看着 22」判成了「比 19 还老」。**内容是对的，采样点错了。**
   *
   * 所以这一问改成在 `MET_AT` 岁问——那是这几卷内容真正发生的年纪。
   */
  if (seems >= one.bornBefore + MET_AT) {
    wrong.push(
      `${one.given} 看着 ${seems}、而玩家 ${MET_AT} 岁时他已经 ${one.bornBefore + MET_AT} 岁——` +
        `这一格写了等于没写（它要说的是「比岁数年轻」）`,
    )
  }
}

/*
 * 三、延寿那一层还有活例子吗。**守的是一个缺席。**
 *
 * 全库的修士都写上 `seemsAge` 的那一天，「延寿但明显衰老」这一层
 * 就没有任何一个人物代表它了——三层塌成两层，而没有任何别的判据会红。
 */
if (aged.length === 0) {
  wrong.push(
    '没有一个修士是「会老」的了：三层里的「延寿」那一层没有活例子。' +
      '秦守拙那个空着的 seemsAge 是一条设计主张，不是漏填',
  )
}
if (unaged.length === 0) {
  wrong.push('没有一个修士是「不老」的：那 `seemsAge` 这一格就没有使用者')
}

/*
 * 四、`Condition.unaged` 真的有人问吗。
 *
 * **门禁读不算读取端**——所以这一问翻的是 `lifeScenes`，
 * 数内容层有几处真的在问这个条件。零处就是「有一头是空的」：
 * 格子加了、数写了、而没有一句话因此不同。
 */
const asked: string[] = []
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    const pools: readonly (readonly Condition[])[] = [
      ...(node.seen ?? []).map((one) => one.requires),
      ...(node.branches ?? []).map((one) => one.requires),
      ...(node.choices ?? []).map((one) => one.requires ?? []),
    ]
    for (const pool of pools) {
      if (pool.some((one) => one.unaged !== undefined)) asked.push(`${sceneId}#${nodeId}`)
    }
  }
}
if (asked.length === 0) {
  wrong.push('内容层没有一处问 `unaged`：这一格写下去了，可没有一句话因此不同')
}

/*
 * 五、问出来的答案对吗。**真跑一遍，不静态推。**
 *
 * 把四个修士全入册，然后拿 `seemsOf` 减 `ageOf` 逐个问。
 * 秦守拙必须答 0（他不写这一格），另外三个必须答一个正数。
 */
{
  setActivePinia(createPinia())
  const people = usePeopleStore()
  const world = useWorldStore()
  for (const one of CULTIVATORS) {
    people.enroll(
      makePerson({
        id: one.id,
        surname: one.surname,
        given: one.given,
        gender: one.gender,
        // 玩家 MET_AT 岁那年遇见他：他那时候 bornBefore + MET_AT 岁
        bornYear: world.time.year - one.bornBefore - MET_AT,
        realm: one.realm,
        health: 80,
        span: one.span,
        ...(one.seemsAge === undefined ? {} : { seemsAge: one.seemsAge }),
        place: one.place,
      }),
    )
  }
  console.log('\n【入册之后，引擎答得出「他看着比岁数年轻多少」吗】\n')
  for (const one of CULTIVATORS) {
    const gap = people.ageOf(one.id) - people.seemsOf(one.id)
    console.log(
      `  ${one.surname}${one.given}`.padEnd(10) +
        `实际 ${String(people.ageOf(one.id)).padStart(3)} 岁　看着 ${String(people.seemsOf(one.id)).padStart(3)} 岁　年轻 ${gap} 岁`,
    )
    if (one.seemsAge === undefined && gap !== 0) {
      wrong.push(`${one.given} 没写 seemsAge，可引擎说他年轻 ${gap} 岁——派生算错了`)
    }
    if (one.seemsAge !== undefined && gap <= 0) {
      wrong.push(`${one.given} 写了 seemsAge=${one.seemsAge}，可引擎说他年轻 ${gap} 岁`)
    }
  }
}

console.log('')
if (wrong.length === 0) {
  console.log(
    `  ✓ ${unaged.length} 个不老、${aged.length} 个会老，` +
      `内容层 ${asked.length} 处问得着，引擎答得出`,
  )
} else {
  for (const one of wrong) console.log(`  ✗ ${one}`)
}

console.log(`\n共 ${wrong.length} 处不对。`)
process.exit(wrong.length === 0 ? 0 : 1)
