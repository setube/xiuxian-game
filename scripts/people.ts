/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * NPC 实体走查。
 *
 * 验四件事，每一件都是这套系统的立身之本：
 *
 * 1. **父母是人，不是牌子。** 有名有姓、有年纪、有脾气，比玩家早出生二十几年。
 * 2. **他们在玩家出生前就有过人生。** 那些事是真的，但玩家一开始一件不知道。
 * 3. **离家不等于消失。** 父亲去外地做工之后，人还在册子上，还在某个地方。
 * 4. **玩家的认知是分层的。** 认识他 ≠ 知道他叫什么 ≠ 知道他的过去。
 *
 * 跑法：npx vite-node scripts/people.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

/**
 * 走查跑多少世。
 *
 * ## 世数照最稀那一格定，而这一支最稀的一格是「爹见过修士」
 *
 * 这一支每一世都要把一辈子走完，跟 `simulate.ts` 一样重（一世一百毫秒上下），
 * 所以它是全套里第二慢的。可两百世量不住它自己印出来的那几个数：
 * 「玩家知道了『爹见过修士』」只占两个点，两百世里是四个人，
 * 一批多一个就晃掉四分之一。
 *
 * 底下那条铁律要的样本更贵：父亲离过家的只占一成半上下，
 * 两百世里三十来个——**而 README 引的正是那个数**。
 *
 * 一千世跑一百多秒，「爹见过修士」是二十个人上下，
 * 父亲离过家的一百五十来个，两个数才配印出来给人读。
 */
const RUNS = 1000

function live() {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const world = useWorldStore()
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
  return { character, people, household, world }
}

// —— 一、随便挑一世，把爹娘印出来 ——
console.log('\n=== 你爹是谁 ===\n')
{
  const { character, people, world } = live()
  for (const id of ['father', 'mother']) {
    const person = people.personOf(id)
    if (!person) continue
    const acquaintance = people.known[id]
    console.log(`  ${person.surname}${person.given}`)
    console.log(`    ${people.ageOf(id)}岁 · ${person.gender} · ${person.trade} · ${person.temper}`)
    console.log(`    此刻在：${person.place}`)
    console.log(`    下落：${person.fate}`)
    console.log(`    玩家叫他：${acquaintance?.calls ?? '（不认识）'}`)
    console.log(`    玩家知道他叫什么吗：${acquaintance?.knowsName ? '知道' : '不知道'}`)
    console.log(`    他这辈子的事（★ = 玩家知道了）：`)
    for (const chapter of person.history) {
      console.log(`      ${chapter.known ? '★' : '　'} ${chapter.atAge}岁：${chapter.what}`)
    }
    console.log()
  }
  console.log(`  （玩家今年 ${character.age} 岁，此刻是第 ${world.time.year} 年）\n`)
}

// —— 二、统计 ——
// 标题里的世数从常量取。从前这里写死「五百世统计」，而 RUNS 一直是 200——
// **走查自己撒的谎里最不容易被发现的那一种**：印出来的数一个没错，
// 只是分母比它自己宣称的少了六成
console.log(`=== ${RUNS} 世统计 ===\n`)
let sameSurname = 0
let fatherHasPast = 0
let learnedSomething = 0
let learnedAdept = 0
const parentAges: number[] = []

/**
 * 父亲离过家的人生，和其中「人从世界上消失了」的。
 *
 * ## 从前这两个数是另一支循环单跑的，而那一支漏掉了六成样本
 *
 * 旧判据是 `hasFlag('father-away')`。可 `hasFlag` 的语义是
 * 「存在且不为 false」，而父亲回来那一卷会把这面旗子按回 `false`——
 * **于是「他回来了」那六成人生，在铁律眼里等于从没离过家**。
 * 真查到的只剩死在外面和杳无音信的两档，而那两档恰恰是最不需要担心的：
 * 它们本来就会写进册子。
 *
 * 现在改用 `father-fate`：他走出村口那一刻必掷一次，掷了就不会再被抹掉。
 * 归、亡、杳三个出口一个不漏。
 */
let everAway = 0
let vanished = 0
const exits = new Map<string, number>()

/** 三个出口各自的下落。「杳」不是「殁」——剧本自己把这两件事分得很清楚 */
const fates = new Map<string, number>()

for (let i = 0; i < RUNS; i += 1) {
  const { character, people, world } = live()
  const father = people.personOf('father')

  /**
   * 铁律要先查，因为它要查的恰恰是「`personOf` 取不到」这件事。
   *
   * 从前这一行下面紧跟着 `if (!father) continue`——**而「父亲从世界上消失了」
   * 长得就是 `personOf` 取不到**。那条 continue 会把这一支唯一要拦的缺陷
   * 静静吞掉，然后底下那一节照样报「人一直都在」。
   */
  const exit = world.getFlag('father-fate')
  if (exit !== undefined) {
    everAway += 1
    exits.set(String(exit), (exits.get(String(exit)) ?? 0) + 1)
    // 无论死活，他都该还在册子上，而且有个地方。「杳」也算——
    // 剧本自己写着「他还在册子上，可能还活着」
    if (!father || !father.place) vanished += 1
  }

  if (!father) continue

  // 玩家随父姓
  if (character.name.slice(0, 1) === father.surname) sameSurname += 1
  if (father.history.length > 0) fatherHasPast += 1
  if (father.history.some((c) => c.known)) learnedSomething += 1
  if (father.history.some((c) => c.id === 'met-adept' && c.known)) learnedAdept += 1

  fates.set(father.fate, (fates.get(father.fate) ?? 0) + 1)

  parentAges.push(world.time.year - father.bornYear)
}

const pct = (n: number) => `${((n / RUNS) * 100).toFixed(1)}%`
console.log(`  玩家随父姓                        ${pct(sameSurname)}`)
console.log(`  父亲有自己的过去                  ${pct(fatherHasPast)}`)
console.log(`  玩家知道了他过去的至少一件事      ${pct(learnedSomething)}`)
console.log(`  玩家知道了「爹见过修士」          ${pct(learnedAdept)}`)
console.log(`  父亲离过家                        ${pct(everAway)}`)

/**
 * 十六岁那年，父亲的下落。
 *
 * 从前这里只有一行「父亲已故／失踪，但仍在册子上」，判据是 `fate !== '在'`——
 * **可那一格是个永真式包装成的统计**：能取到 `personOf('father')`
 * 本身就意味着他在册子上，「仍在册子上」这句话没有验证任何东西。
 * 而它把「杳」和「殁」并成一格，抹掉的正是这套系统最在意的那条区别。
 */
console.log(`\n  十六岁那年，父亲的下落：`)
for (const [fate, n] of [...fates.entries()].sort((a, b) => b[1] - a[1])) {
  const gloss = fate === '在' ? '' : fate === '杳' ? '　没有消息，不算死' : '　死了，有人捎回了话'
  console.log(`    ${fate}　${String(pct(n)).padStart(6)}${gloss}`)
}

const sorted = [...parentAges].sort((a, b) => a - b)
console.log(
  `\n  玩家十六岁时父亲的年纪：最小 ${sorted[0]}  中位 ${sorted[Math.floor(sorted.length / 2)]}  最大 ${sorted[sorted.length - 1]}`,
)

// —— 三、铁律：人不因离开视野而消失 ——
console.log('\n=== 铁律：离家 ≠ 消失 ===\n')
{
  /**
   * 这一节从前自己再跑两百世，跑到攒够四十个就停。三处不对：
   *
   * 1. **判据漏样本**（见上）——回来的那六成根本没进检查。
   * 2. **多花两百世的时间去攒上面已经有的东西。**
   * 3. **一个也没攒到的时候，它照样报「人一直都在」。**
   *    `vanished === 0` 在 `checked === 0` 时永远成立——
   *    跟 `day.ts` 那个「空的一档不是最少的一档」是同一个洞：
   *    **没查到和查过了长得一模一样。**
   */
  for (const [exit, n] of [...exits.entries()].sort((a, b) => b[1] - a[1])) {
    const gloss = exit === '归' ? '几年后回来了' : exit === '亡' ? '死在了外地' : '再也没有消息'
    console.log(`    ${exit}　${String(n).padStart(4)} 个　${gloss}`)
  }
  console.log(`\n  查了 ${everAway} 个父亲离过家的人生`)
  console.log(
    `  其中「父亲从世界上消失了」的：${vanished} 个${vanished === 0 ? '。人一直都在。' : '——这是重大缺陷。'}`,
  )
  if (vanished > 0) process.exitCode = 1
  if (everAway === 0) {
    console.log('  ✗ 一个父亲离过家的人生也没跑出来——这条铁律根本没被验过。')
    process.exitCode = 1
  }
}
console.log()
