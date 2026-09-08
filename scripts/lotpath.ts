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
import type { Tenure } from '../src/types/game'

/**
 * 走多少世。
 *
 * ## 定这个数的理由已经死了，数留着——先说清楚现在靠什么撑着
 *
 * 原来这儿写的是「要等的是出嫁／入赘那种世，三百世下采得到几十个」。
 * **那句话是错的，而且一直是错的**：`life/match.ts` 至今没接进
 * `life/index.ts`（2026-09-08 复查仍然如此），那一卷一次也不触发，
 * 出嫁／入赘实测 **0 世**——底下第六条那段早写着这件事，
 * 只是没人回来改这里。一个数的**理由**死了而数还立着，
 * 比数本身错更难查：读的人以为它经过论证。
 *
 * 现在真正靠 300 撑着的是两件事：`sawTenure` 那条硬哨兵要非零
 * （地那一格只有务农人家掷得出），以及那些零容忍判据要撞得到
 * 足够多样的家境形状。
 *
 * ## 为什么这一支没有「一个数替两条判据兜底」那笔账
 *
 * `newyear` 栽过一次：世数只为「一次也没采到吗」算过，而另一条判据
 * 一直在蹭它的余量，率被定准那天余量一声不响地没了。
 *
 * 这一支的结构不同——**没有一条判据是按比率判的**，全是两类：
 *
 *     零容忍　　`offences.length > 0` 就红。撞上一次就认得出，
 *               样本量只决定「多久撞上」，不决定「撞上了认不认得出」
 *     存在性　　`saw* === 0` 就红。要的是非零余量
 *
 * 所以调世数不会像那边一样抽掉谁的底。
 *
 * ## 但仍欠着一层，写在这儿等第一个撞上的人
 *
 * 哨兵只保证 **≥1**。要抓「只在某种家境里才犯」的毛病，≥1 远远不够：
 * 按九成把握至少撞一次的算式（`n ≥ ln(0.1)/ln(1-p)`），违例率两成要 11 个
 * 样本、一成要 22 个。**眼下靠底下把实际采到多少印出来给人看，
 * 没有一行代码守着这个数。** 哪天真被这种毛病咬一次，
 * 就把哨兵的门槛从「非零」抬到算出来的那个数，别再拍。
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
const wrongTenure: Offence[] = []
const dowryKept: Offence[] = []
const emptyWords: Offence[] = []

let wed = 0
let onOwn = 0
let underSomeone = 0
/** 采到多少世说得出地那一句。`null` 那一档不算——它是「说不上」，不出声 */
let sawTenure = 0
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
  /*
   * 嫁出去／入赘了没有：看的是**户的 id**，不是「在不在户里」。
   * `houseOf('me')` 对没出嫁的人也返回 `home`——`birth.ts` 出生那刻就把
   * `me` 放进了自家那一户。拿「有没有户」当依据，300 世会全部算成嫁出去。
   */
  const movedOut = joined !== undefined && joined.id !== 'home'
  if (movedOut) wed += 1

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
   * 四、说地那两句，得跟 `household.tenure` 对得上。
   *
   * **这一条守的是三档不塌成两档**：说「种着别人的地」时那一格真的是 `'佃'`，
   * 说「那几亩地是自家的」时真的是 `'自耕'`。塌了的话——比如把 `佃` 也说成
   * 「自家的」——那句话读起来一点毛病没有，而它把一个佃户说成了地主。
   *
   * 「迁出去了没有」看的是**户的 id**，不是「在不在户里」：`houseOf('me')`
   * 对没出嫁的人也返回 `home`（`birth.ts` 出生那刻就把 `me` 放了进去）。
   * 拿「有没有户」当依据的话，这几条判据恒为真——那正是这一支第一次红的原因。
   */
  const landNow = movedOut ? null : household.tenure
  if (now.tenure === '佃' && landNow !== '佃') {
    wrongTenure.push({
      what: '佃',
      detail: `话里说种着别人的地，而这一户的 tenure 是「${movedOut ? 'null（迁出去了）' : household.tenure}」`,
    })
  }
  if (now.tenure === '自耕' && landNow !== '自耕') {
    wrongTenure.push({
      what: '自耕',
      detail: `话里说那几亩地是自家的，而这一户的 tenure 是「${movedOut ? 'null（迁出去了）' : household.tenure}」`,
    })
  }
  /* 迁出去的人不许再报娘家的地，跟产业同一个口径 */
  if (movedOut && now.tenure !== null) {
    dowryKept.push({
      what: String(now.tenure),
      detail: `已经进了「${joined?.id}」这一户，话里却还报着娘家的地`,
    })
  }
  if (now.tenure !== null) sawTenure += 1

  /*
   * 五、嫁出去／入赘的人不许再报娘家的产业。
   *
   * 这一条守的是 `wed-into` 之后的口径：`home` 那一户不再是你的了，
   * 娘家那间铺子也不再是你名下的。**写死 `houses['home']` 的实现会在这儿红**。
   *
   * 问的是 `movedOut`，不是 `joined`——上面地那一句的注释已经写了为什么：
   * `houseOf('me')` 对没出嫁的人也返回 `home`。头一版这儿写的是 `joined`，
   * 靠采样点（咽气那年，人已经不在户里）掩着；一世 220 回合没走完、人还活着，
   * 它就把「在自家报自家的客栈」报成了嫁出去还报娘家（2026-09-08）。
   */
  if (movedOut && now.property !== null) {
    dowryKept.push({
      what: now.property,
      detail: `已经进了「${joined.id}」这一户，话里却还报着娘家的产业`,
    })
  }
  /*
   * 还在自家的人，产那一格就该照实报自家的家业。
   *
   * 上面那条是反面（迁出去不许报），这一条是正面，两条合起来才是完整的口径——
   * 而且只有这一条每一世都被锻炼到：`engine/lotpath.ts` 里 `movedOut ? null : business`
   * 让反面那条结构上掷不出来，真跑又 `wed === 0`，它今天没有任何东西在锻炼。
   * 地那一格有 `sawTenure` 哨兵兜底，产这一格从前没有——引擎哪天退化成恒 null，
   * 「家里那间 X 还在」那句话会从报表里静静消失（17 指出的，2026-09-08）。
   */
  if (!movedOut && now.property !== household.business) {
    dowryKept.push({
      what: String(now.property),
      detail: `还在自家，产那一格却报着「${now.property}」，而这一户的家业是「${household.business}」`,
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
  wrongTenure,
  '地那一句跟 `household.tenure` 对不上',
  '三档不许塌成两档：把「佃」说成「自家的」，读起来毫无破绽，可它把佃户说成了地主。',
)
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
    `        其中嫁出去／入赘 ${wed} 世 / 上头有人当家 ${underSomeone} 世 / 自己当家 ${onOwn} 世 / ` +
    `说得出地那一句 ${sawTenure} 世` +
    `　（采样点：咽气那年，六问的答案最分化的一刻）`,
)

/*
 * 地那一格采不到的话，第四条是空的。
 *
 * `tenure` 只有务农人家才掷得出（`content/origins.ts`），所以它天然不是
 * 每一世都有——但**一世也采不到就说明这一条根本没被验过**，
 * 而没查到跟查过了长得一模一样。
 */
if (sawTenure === 0) {
  console.log(
    `  ✗ ${RUNS} 世里没有一世说得出地那一句，第四条根本没被验过。` +
      `\n    household.tenure 那一格是不是压根没掷出来过？`,
  )
  bad += 1
}

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

  /*
   * 地那三档，各摆一次。
   *
   * **这一条自检的是「三档没塌成两档」**：`自耕` 和 `佃` 各说各的话，
   * `null` 一声不出。少了它，把两档合并成「有地／没地」的实现照样全绿——
   * 那正是这一格存在之前的样子。
   *
   * **必须另起 pinia，而且赋值要在 `pathsNow()` 之后**：三个 store 头一次
   * 被取到时会掷一份家境（`rolled`），把先赋的值冲掉。先跑一次把它们
   * 初始化完，再改 `tenure`。
   */
  setActivePinia(createPinia())
  {
    pathsNow()
    const household = useHouseholdStore()
    const cases: { tenure: Tenure | null; want: string | null }[] = [
      { tenure: '自耕', want: '那几亩地是自家的。' },
      { tenure: '佃', want: '种着别人的地，秋后先量租子。' },
      { tenure: null, want: null },
    ]
    for (const one of cases) {
      household.tenure = one.tenure
      const said = pathWords(pathsNow())
      const about = said.find((line) => line.includes('地'))
      if (one.want === null) {
        if (about !== undefined) {
          failed.push(`tenure 是 null 时不该说地，却说了「${about}」`)
        }
      } else if (about !== one.want) {
        failed.push(`tenure 是「${one.tenure}」时该说「${one.want}」，说的是「${about}」`)
      }
    }
  }

  /*
   * 迁出去之后，产和田都该「说不上」。
   *
   * 这是上面那条的另一半：三档分得清管的是**没迁出去**的情形，
   * 这一条管**迁出去**的——79 定的那句「读产/田的人对迁出去的玩家
   * 一律当不知道」，正面守在这儿。
   *
   * 两条合起来才是完整的那条语义。只有前一条的话，一个「迁出去了还报
   * 娘家几亩地」的实现照样全绿。
   */
  setActivePinia(createPinia())
  {
    pathsNow()
    const household = useHouseholdStore()
    const people = usePeopleStore()
    household.tenure = '自耕'
    household.business = '药铺'
    // 先确认没迁出去时说得出来，否则下面那半句证明不了任何事
    if (pathsNow().tenure !== '自耕') {
      failed.push('还在自家时地那一格就已经说不上了，这一条验不到迁出去的效果')
    }
    people.enrollHouse({
      id: 'in-law-spouse',
      surname: '吴',
      head: 'spouse',
      members: ['spouse'],
      residence: 'somewhere',
      livelihood: '务农',
    })
    people.leaveHouse('me')
    people.joinHouse('in-law-spouse', 'me')
    const after = pathsNow()
    if (after.tenure !== null) {
      failed.push(`嫁出去之后地该说不上，算出来还是「${after.tenure}」`)
    }
    if (after.property !== null) {
      failed.push(`嫁出去之后产业该说不上，算出来还是「${after.property}」`)
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
