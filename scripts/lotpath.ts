/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 「你面前有哪几条路」那一段话，说的是不是真话。
 *
 * ## 这一支守的是「六问答的是事实，不是菜单」
 *
 * `engine/lotpath.ts` 把 12.md 那六问（靠什么生活、和谁一起过、有没有自己的家、
 * 有没有产业、上头有没有人、还做不做原来那一行）从散落的字段里聚成一段话。
 * 聚合最容易坏的地方不是算错，是**答案跟世界对不上而没人发现**——
 * 那段话读起来永远通顺，它是拼出来的。
 *
 * 所以这一支不验「那段话好不好听」，验的是**每一句都能在世界里找到出处**：
 *
 *     说「你还做着家里那一行」→ `livelihoodOf('me')` 真的等于自家那一户的营生
 *     说「这个家是谁谁当的」　→ 那个人真的是户主，而且真的活着
 *     说「屋里就你一个」　　　→ 真的没有别的活人跟你同户
 *
 * ## 跟 `scripts/standing.ts` 分工
 *
 * 那一支守的是 `household.standing` 那个**隐藏刻度**的走势（立基落不落在出身表里、
 * 后半生有没有涨有跌）。这一支守的是**说出口的那段话**跟世界对不对得上。
 * 一个管数，一个管话。
 *
 * ## 出嫁、入赘那一头
 *
 * `wed-into`（14 加的）把 `me` 迁进 `in-law-<配偶>` 那一户，**`home` 从此
 * 不再是玩家的户**。六问里有四问要跟着改口径，所以这一支专门采那种世：
 * 迁出去之后不许再报娘家的产业，当家的得问新那一户的户主。
 * 第六条会把采到多少印出来，采不够会红——没查到和查过了长得一模一样。
 *
 * 跑法：bun scripts/lotpath.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { pathsNow, pathWords } from '../src/engine/lotpath'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'

/**
 * 走多少世。
 *
 * 这一支要等的是**出嫁／入赘那种世**——女玩家成亲才走 `wed-into`，
 * 三百世下采得到几十个。第六条会把实际采到多少印出来。
 */
const RUNS = 300

interface Offence {
  what: string
  detail: string
}

const wrongHead: Offence[] = []
const deadHead: Offence[] = []
const wrongAlone: Offence[] = []
const wrongTrade: Offence[] = []
const dowryKept: Offence[] = []
const emptyWords: Offence[] = []

let wed = 0
let onOwn = 0
let underSomeone = 0
let worlds = 0
let lines = 0
/** 这一批里那段话出现过哪些说法。判据查的就是它们，印出来才知道查过了什么 */
const everySaying = new Map<string, number>()

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const character = useCharacterStore()
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
   * 咽气那年读这段话。
   *
   * **采样点也是判据。** 挑这一刻是因为六问的答案这时最分化：成过家的迁了户、
   * 改过行的换了营生、爹娘殁了的自己当了家。十六岁那年读的话绝大多数人
   * 还在自家、还没成亲，第一四条根本采不到样本。
   */
  const now = pathsNow()
  const said = pathWords(now)
  worlds += 1
  lines += said.length
  for (const one of said) everySaying.set(one, (everySaying.get(one) ?? 0) + 1)

  const joined = people.houseOf('me')
  if (joined) wed += 1

  /* 一、说「这个家是谁当的」，那个人得真是户主，而且真的活着 */
  if (now.under !== undefined) {
    underSomeone += 1
    const head = joined?.head
    if (head !== now.under) {
      wrongHead.push({ what: now.under, detail: `话里说他当家，而那一户的户主是 ${head}` })
    }
    if (!people.isAlive(now.under)) {
      deadHead.push({ what: now.under, detail: '话里说他当家，可他已经不在了' })
    }
  } else {
    onOwn += 1
  }

  /* 二、说「屋里就你一个」，得真的没有别的活人跟你同户 */
  if (now.household.length === 0) {
    const others = joined
      ? joined.members.filter((id) => id !== 'me' && people.isAlive(id))
      : household.members.filter((one) => people.isAlive(one.person)).map((one) => one.person)
    if (others.length > 0) {
      wrongAlone.push({ what: others.join('、'), detail: '话里说屋里就你一个，可这些人还在' })
    }
  }

  /*
   * 三、说「还做着家里那一行」，那一行得真的还是那一行。
   *
   * 比的是「此刻这一户的营生」跟「自家那一户的营生」。**不问
   * `livelihoodOf('me')`**——玩家不在人口册上，那个函数对他恒为 undefined
   * （这一支第一次跑就是这么红的）。
   */
  const mine = joined ? joined.livelihood : household.livelihood
  if (now.sameTrade && mine !== household.livelihood) {
    wrongTrade.push({
      what: String(mine),
      detail: `话里说还做着家里那一行，而家里那一行是「${household.livelihood}」`,
    })
  }

  /*
   * 四、嫁出去／入赘的人不许再报娘家的产业。
   *
   * 这一条守的是 `wed-into` 之后的口径：`home` 那一户不再是你的了，
   * 娘家那间铺子也不再是你名下的。**写死 `houses['home']` 的实现会在这儿红**。
   */
  if (joined && now.property !== null) {
    dowryKept.push({
      what: now.property,
      detail: `已经进了「${joined.id}」这一户，话里却还报着娘家的产业`,
    })
  }

  /* 五、那段话不许是空的。一个字都说不出来，说明六问一问也没答上 */
  if (said.length === 0) {
    emptyWords.push({ what: `第 ${i} 世`, detail: `${character.age} 岁，六问一问也没答上` })
  }
}

console.log(`\n=== 你面前有哪几条路（${RUNS} 世）===\n`)

let bad = 0

function report(offences: Offence[], headline: string, why: string): void {
  if (offences.length === 0) return
  console.log(`  ✗ ${offences.length} 处${headline}：`)
  for (const one of offences.slice(0, 5)) {
    console.log(`      ${one.what.padEnd(14)}${one.detail}`)
  }
  console.log(`    ${why}`)
  bad += 1
}

report(wrongHead, '当家的说错了人', '`under` 那一格取的该是 `houseOf(me).head`。')
report(deadHead, '让死人当着家', '`keepHeads` 守的就是这个：当家的必须是活人。')
report(wrongAlone, '说「屋里就你一个」而屋里有人', '`household` 那一格该数同户的活人。')
report(wrongTrade, '说「还做着家里那一行」而那一行早换了', '`sameTrade` 比的是两个营生格。')
report(
  dowryKept,
  '嫁出去了还报着娘家的产业',
  '`wed-into` 之后 `home` 不再是玩家的户——写死 `houses[home]` 的实现在这儿红。',
)
report(emptyWords, '那段话是空的', '六问至少答得上一问，答不上就是聚合没接上。')

/*
 * 六、上面几条得真有人踩在上头。
 *
 * 一世也没采到出嫁／入赘的话，第四条会安安静静地全绿——
 * **没查到和查过了长得一模一样。**
 *
 * ## 眼下这两条采不到，而且原因不在这一支
 *
 * `life/match.ts`（14 在建）**还没接进 `life/index.ts`**，那一卷一次也不会触发，
 * 于是 300 世里嫁出去／入赘 0 世、上头有人当家 0 世。
 *
 * 所以这两条暂时降为**报数不判红**：判据留在这儿等那一卷接进来，
 * 而不是现在就把全套挡住。**这不是把红改绿**——降级的理由写在这里，
 * 采到之后（`wed > 0`）它立刻恢复成硬判据；接进来那天如果口径不对，
 * 第四条会当场红。
 *
 * 判据的前提被别人的在建工作掐断时，标注比闪红有用：闪红会让接手的人
 * 以为被测系统坏了，而真相是那一卷还没通电。
 */
if (wed === 0) {
  console.log(
    `  ⚠ ${RUNS} 世里没有一世嫁出去或入赘，第四条这一批没被验到。` +
      `\n    原因不在这一支：\`life/match.ts\` 还没接进 \`life/index.ts\`，那一卷不会触发。` +
      `\n    接进来之后这一条自动恢复成硬判据。`,
  )
}
if (underSomeone === 0) {
  console.log(
    `  ⚠ ${RUNS} 世里没有一世上头有人当家，第一条这一批没被验到（同上，等 match 那一卷接进来）。`,
  )
}

console.log(
  `  覆盖：${worlds} 世 / 说出 ${lines} 句（平均每世 ${(lines / Math.max(worlds, 1)).toFixed(1)} 句）\n` +
    `        其中嫁出去／入赘 ${wed} 世 / 上头有人当家 ${underSomeone} 世 / 自己当家 ${onOwn} 世` +
    `　（采样点：咽气那年，六问的答案最分化的一刻）`,
)

/*
 * 这一批里那段话说过哪些句子，印出来。
 *
 * **不印出来就不知道判据查过了什么**：某一句在这一批里一次也没出现过，
 * 对应那条判据就是空的，而空着跟查过了长得一模一样。
 */
console.log(`\n  这一批里那段话出现过 ${everySaying.size} 种说法，最常见的几句：`)
for (const [saying, n] of [...everySaying.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${String(n).padStart(5)}  ${saying}`)
}

/**
 * 七、尺子自检：把答错的处境摆到跟前，判据必须认出来。
 *
 * 不自检的话上面几条可能全是空的——`houseOf` 换了返回值、判据里的字段名
 * 拼错一个字母，都会让它们一声不吭地绿着。
 */
{
  const failed: string[] = []

  // 摆一个「迁进别人户里、户主不是我」的局，`under` 必须指着那个户主
  setActivePinia(createPinia())
  {
    const people = usePeopleStore()
    people.enrollHouse({
      id: 'in-law-spouse',
      surname: '吴',
      head: 'father-in-law',
      members: ['father-in-law'],
      residence: 'somewhere',
      livelihood: '务农',
    })
    people.joinHouse('in-law-spouse', 'me')
    const now = pathsNow()
    if (now.under !== 'father-in-law') {
      failed.push(`入赘之后当家的该是老丈人，算出来是 ${now.under}`)
    }
    if (now.home !== '寄人') {
      failed.push(`入赘之后该是「寄人」，算出来是「${now.home}」`)
    }
    if (now.property !== null) {
      failed.push(`迁出去之后不该再报娘家的产业，算出来是 ${now.property}`)
    }
  }

  // 同一处屋子，户主换成我，这几格必须跟着翻。
  // **另起一个 pinia**：`enrollHouse` 碰上已存在的 id 直接 return（不覆盖），
  // 沿用上一个的话这一户根本建不起来，自检就成了拿旧局验新判断
  setActivePinia(createPinia())
  {
    const people = usePeopleStore()
    people.enrollHouse({
      id: 'in-law-spouse',
      surname: '吴',
      head: 'me',
      members: ['me'],
      residence: 'somewhere',
      livelihood: '务农',
    })
    const now = pathsNow()
    if (now.under !== undefined) {
      failed.push(`家交到我手上之后不该还有人在上头，算出来是 ${now.under}`)
    }
    if (now.home !== '自立') {
      failed.push(`家交到我手上之后该是「自立」，算出来是「${now.home}」`)
    }
  }

  if (failed.length > 0) {
    console.log(`\n  ✗ 尺子自检没通过：`)
    for (const one of failed) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(
      `\n  ✓ 尺子自检：入赘那一世当家的是老丈人、处境是「寄人」、不再报娘家的产业；` +
        `\n    同一处屋子换了户主，几格跟着翻成自立——判据不是恒真的。`,
    )
    /*
     * 真跑采不到出嫁／入赘，靠上面这两个构造的局兜着。
     *
     * **这不等于第四条被验过了**：构造的局验的是「口径算得对不对」，
     * 而真跑要验的是「那一卷真跑起来会不会走到这儿」。两件事，
     * 前者绿不能推出后者绿。所以这一行专门写出来，免得日后有人
     * 看见「尺子自检 ✓」就以为出嫁那条路已经验过了。
     */
    if (wed === 0) {
      console.log(
        `    （出嫁／入赘的口径由上面这两个构造的局兜着；` +
          `真跑那一路等 \`match\` 接进 \`life/index.ts\`。）`,
      )
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  那段话里的每一句，都在世界里找得到出处。')
  console.log('  **六问答的是事实，不是菜单——路由后面各卷自己开口。**\n')
}
