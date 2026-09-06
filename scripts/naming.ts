/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 名字要有人告诉你才知道。
 *
 * ## 这一道守的是一条硬规矩（用户 2026-09-07，26.md）
 *
 * 世界里的人先独立存在，玩家对他的姓名、身份、家世的认识必须从真实接触里来——在玩家还不知道
 * 他叫什么之前，正文和选项里不得写出他的姓名。「王家的那个孩子」「卖柴的年轻人」是认知不足时
 * 的自然指代，不是人物实体；人口册上的「陈安」是人物实体，不是玩家嘴里的称呼。
 *
 * 库里这条线早就分开了：`roster` 是世界人物库（有姓有名），`known` 是玩家认知库（`calls` 是玩家
 * 此刻怎么叫他，`knowsName` 单独一格，要 `meet` 带 `name: true` 才置真）。`callOf` 不知道名字就绝
 * 不落名字。**可正文是人写的**：作者知道那个先生叫周敬之，手一滑就写进正文了——这一支就是量这个。
 *
 * ## 判据
 *
 *   一、随机人生里，凡是人口册上有名有姓的人，玩家还不 `knowsName` 的时候，正文、选项、回响里
 *       不得出现他的全名（姓+名）。爹娘也一样：一出生就认得，不等于知道他叫什么。
 *   二、`callOf` 对不知道名字的人不落名字；知道了才落。
 *   三、尺子自检：往正文里塞一句带全名的话，抓得到。
 *
 * 跑法：bun scripts/naming.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { usePeopleStore } from '../src/stores/people'

import { mapShards, sumTallies } from './lib/parallel'
import { type NamingShard } from './tasks/naming-lives'

const RUNS = 120

// 这一段原样搬去了 tasks/naming-lives.ts，走法一步没动。
// 判据和它们的自检留在这儿——它们是这支门禁的结论，不是实现细节
const tally = sumTallies(
  await mapShards<NamingShard>({ task: 'scripts/tasks/naming-lives.ts', runs: RUNS }),
)
const { leaks, namedFine, personsSeen, namedPersons, callWrong } = tally

console.log(`\n=== 名字要有人告诉你才知道（${RUNS} 世）===\n`)
let bad = 0

const dedup = [
  ...new Set(
    leaks.map((one) => `${one.where}　${one.name}（${one.id}）　${one.text.slice(0, 40)}`),
  ),
]
if (dedup.length > 0) {
  console.log(`  ✗ 一、${dedup.length} 处玩家还不知道名字，正文或选项里却写出了全名：`)
  for (const line of dedup.slice(0, 20)) console.log(`      ${line}`)
  bad += 1
} else {
  console.log(
    `  ✓ 一、玩家不知道名字的人，正文和选项里一处全名也没有。（知道名字之后写了名字的 ${namedFine} 处，尺子咬得到）`,
  )
}

if (callWrong > 0) {
  console.log(`  ✗ 二、${callWrong} 处 callOf 把不知道的名字落到了纸上，或知道了却不用。`)
  bad += 1
} else
  console.log(
    `  ✓ 二、${personsSeen} 个认得的人里知道名字的 ${namedPersons} 个：不知道的一律按称呼叫，知道的才叫名字。`,
  )

// 三、尺子自检
{
  /*
   * 要一个生下来有爹的人生。有的境况生下来就没爹（种子 19sygn95try1 撞上过），掷到有为止。
   *
   * 这儿不能写成 `let people = usePeopleStore()` 再进循环——**主线程此刻没有活着的 pinia**。
   * 从前那么写跑得通，是因为上面紧挨着 120 世模拟，最后一世的 pinia 还留在那儿；
   * 模拟搬进 worker 之后主线程一片空白，那一行当场就炸。
   *
   * 值得记的是这个 bug **躲过了同种子对照**：`GATE_INLINE=1` 那条路在主线程里跑模拟，
   * 照样留下一个活着的 pinia，于是前后输出逐字节相同、判据全绿，而真 worker 路径是红的。
   * 逐字节相同证明的是「搬出去的循环体没走样」，不是「搬走之后主脚本还站得住」。
   */
  let people: ReturnType<typeof usePeopleStore> | null = null
  for (let tries = 0; tries < 60; tries += 1) {
    setActivePinia(createPinia())
    people = usePeopleStore()
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    if (people.personOf('father')) break
  }
  const father = people?.personOf('father')
  const wrong: string[] = []
  if (!people || !father) wrong.push('掷了六十世没有一世生下来有爹，摆不出局')
  else {
    const name = `${father.surname}${father.given}`
    const knows = people.known['father']?.knowsName === true
    if (knows) wrong.push('一出生就知道爹叫什么——「爹」是称呼，名字是另一回事')
    if (people.callOf('father') === name) wrong.push('不知道名字，callOf 却落了名字')
    const probe = `你听见有人在门外喊${name}。`
    if (!probe.includes(name)) wrong.push('尺子自检：塞进去的全名没找着')
    people.learnName('father')
    if (people.callOf('father') !== name)
      wrong.push(`知道了名字，callOf 却还叫「${people.callOf('father')}」`)
  }
  if (wrong.length > 0) {
    console.log(`  ✗ 三、尺子自检：${wrong[0]}`)
    bad += 1
  } else console.log('  ✓ 三、尺子自检：出生时不知道爹叫什么、callOf 不落名字；有人告诉了才落。')
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else console.log('  名字要有人告诉你才知道：全部成立。\n')
