/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 谁在场，谁看得见。
 *
 * 这一支守三件事，都是从同一类毛病里长出来的：
 * **内容默认了一个它没问过的前提。**
 *
 *   一、死了的人还在正文里说话、还在选项里被点名
 *   二、高墙里头的人读到街面上的事（「镇上的集照常开」落在王府世子眼前）
 *   三、加了 `who` 之后，某一种日子反而一条征象也读不到
 *
 * 第三条是第二条的对照组，缺了它第二条会把人引到沟里：
 * 把征象一句一句收给该看见的人，收过头就成了「宫里的孩子对世界一无所知」，
 * 而那正好说反了这一册的话——他不是看不见，是**看见的是另一样东西**。
 *
 * 跑法：bun scripts/present.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { ALL_LIVINGS } from '../src/content/living'
import { SIGNS } from '../src/content/signs'
import { meetsAll } from '../src/engine/conditions'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'

/**
 * 走多少世。
 *
 * 第一条要等的是**家里死人**，而且得死在人生走完之前。
 * 一百世下采到三四百个人的死，够了；第四条会把实际采到多少印出来。
 */
const RUNS = 100

/**
 * 死者的称呼里，哪些是通用词，撞上不算数。
 *
 * 「孩子」「徒弟」这种叫法不专属某一个人——女儿没了，而「添个孩子」
 * 这个选项里也有「孩子」两个字，那是字面碰撞，不是穿帮。
 * 头一版没有这张表，二十几条误报里有一半出自这里。
 *
 * 「哥」「姐」是后来补的，撞的两句尤其能说明这张表为什么必要：
 * 「他说**他哥**托人捎过一次信」说的是别人的哥，
 * 「往后你是当**哥哥**的了」是一个词的一半。
 * 判据按子串找人，而中文里一个称呼常常是另一个词的零件。
 */
const TOO_COMMON: readonly string[] = ['孩子', '徒弟', '老人', '家里人', '哥', '姐', '弟', '妹']

/**
 * 说的正是「他不在了」的那些话，撞上不算数。
 *
 * 「爹娘都不在了。有些事情从此没有人可以问。」——这一句里当然有「爹娘」，
 * 而它恰恰是这套东西**做对了**的样子。判据要是不放过它，
 * 每一处讣告都会被判成穿帮。
 */
const TALKING_ABOUT_DEATH = /不在了|没了|殁|走了|下葬|坟|丧|头七|再没有消息/

/**
 * 一个字的称呼是别的词的零件，撞上不算数。
 *
 * 娘没了之后，正文里出现「姑娘」「新娘」「娘娘」，或者一枚回执
 * 「原来他叫 · 秦娘」（一个叫秦娘的妇人，「娘」是她名字的后缀），
 * 判据按子串找「娘」都会撞上——头一版就是在这儿闪红的，一百世里两三世。
 * 一道会无故红的门禁比没有门禁更坏：它训练人无视它。
 *
 * 只挡这几个词，不把「娘」整个放进 `TOO_COMMON`：娘是这条判据存在的理由
 * （那个 bug 原本就是娘没了之后「整日跟在母亲身后」），整个放掉就是拆了尺子。
 */
const INNOCENT_CONTEXTS: readonly string[] = ['姑娘', '新娘', '娘娘', '原来他叫']

/** 这一句里的「娘」是不是别的词的零件 */
function innocent(text: string, calls: string): boolean {
  if (calls.length > 1) return false
  return INNOCENT_CONTEXTS.some((word) => text.includes(word))
}

/**
 * 整卷都是回想的那几卷，不算数。
 *
 * **一个人可以想起死去的人**——「你逃过好几回学，那条河边的日头，
 * 比先生念的那些句子记得清楚」是临终那一卷的话，先生早不在了，
 * 而这句话正因为他不在了才有分量。
 *
 * 这是这条判据的**边界**，写明在这里：它分不出「此刻在说话」和
 * 「想起他从前说过话」，中文没有时态可以让机器照着判。
 * 所以按卷放行——落幕那一卷从头到尾都是回想，整卷豁免；
 * 别处再出现回忆型的句子，得单独判断，不能顺手往这张表里加。
 */
const REMEMBERING: readonly string[] = ['ending']

interface Ghost {
  who: string
  calls: string
  where: '正文' | '选项'
  text: string
}

const ghosts: Ghost[] = []
let deathsSeen = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  story.begin()
  let seen = narrative.stream.length
  const gone = new Map<string, string>()
  let turns = 0

  while (!narrative.ended && turns < 200) {
    /*
     * 先记下「**这一步之前**谁已经不在了」，再往下走。
     *
     * 顺序错了这一条就会诬告：头一版是先 `choose` 再记死者，
     * 于是**他咽气那一刻的那一节**——正文里他还在说话，因为他那时还活着——
     * 被算成了死后露面。判据当场报出十几条假的。
     * 采样点是判据的一部分，跟采什么一样要紧。
     */
    for (const person of Object.values(people.roster)) {
      if (person.fate === '在' || gone.has(person.id)) continue
      const calls = people.known[person.id]?.calls
      if (!calls || TOO_COMMON.includes(calls)) continue
      gone.set(person.id, calls)
      deathsSeen += 1
    }

    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const fresh = narrative.stream.slice(seen)
    seen = narrative.stream.length

    // 整卷都是回想的那几卷跳过。人可以想起死去的人，那不是穿帮
    if (REMEMBERING.some((id) => (narrative.sceneId ?? '').startsWith(id))) continue

    for (const [id, calls] of gone) {
      for (const item of fresh) {
        const text = item.block.text
        if (!text || !text.includes(calls)) continue
        if (TALKING_ABOUT_DEATH.test(text)) continue
        if (innocent(text, calls)) continue
        ghosts.push({ who: id, calls, where: '正文', text })
      }
      for (const option of narrative.options) {
        const label = option.choice.label
        if (!label.includes(calls)) continue
        if (innocent(label, calls)) continue
        ghosts.push({ who: id, calls, where: '选项', text: label })
      }
    }
  }
}

console.log(`\n=== 谁在场，谁看得见（${RUNS} 世）===\n`)

let bad = 0

/**
 * 一、人不在了，他就不再说话，也不再被点名。
 *
 * 这一条抓到过的两处，坏法不一样，值得各记一笔：
 *
 * - `routine:child` 的「整日跟着{dam}」**门本身开着**。占位符是防住了的
 *   （`isNearby` 不认死人，`{dam}` 会落到别的长辈身上），可它的 `echo`
 *   里写着硬邦邦的「母亲」——**占位符防住的那一层，硬写的字绕过去了**，
 *   而底下那个 `relation` 还照旧给一个死人加六分好感。
 * - 私塾那几节只问 `schooled` 那个旗标，而**旗标不会因为一个人死了就变**，
 *   于是先生殁了之后还在讲台上讲课。
 */
{
  const unique = new Map<string, Ghost>()
  for (const g of ghosts) unique.set(`${g.where}:${g.text}`, g)

  if (unique.size > 0) {
    console.log(`  ✗ ${unique.size} 种说法里，不在了的人还在露面：`)
    for (const [, g] of [...unique].slice(0, 8)) {
      console.log(`      〔${g.where}〕${g.who}（玩家叫他「${g.calls}」）：${g.text}`)
    }
    bad += 1
  } else {
    console.log(`  ✓ ${deathsSeen} 个人不在了之后，没有谁还在正文或选项里露面。`)
  }
}

/**
 * 二、每一种日子都得看得见几条征象。
 *
 * 把「镇上的集照常开」收给街面上的人是对的，可**收过头就成了
 * 「宫里的孩子对世界一无所知」**。这一条是上面那件事的对照组：
 * 它不问「谁看不见」，问的是**有没有谁什么也看不见**。
 *
 * 判据只要求「有」，不定几条：几条合适是内容的事，会随着写新征象漂，
 * 而「一条也没有」是一个不会漂的坏。
 */
{
  const barren: string[] = []
  const table: string[] = []

  for (const living of ALL_LIVINGS) {
    setActivePinia(createPinia())
    const character = useCharacterStore()
    const household = useHouseholdStore()
    useWorldStore()
    usePeopleStore()
    // 先立基：征象现在还看住处（村口是村里的事），住处要立基才有
    useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
    // 再把这一世的日子钉成这一种，别的一概不动
    character.liveAs(living.id)

    const mine = SIGNS.filter((sign) => !sign.who || meetsAll(sign.who))
    table.push(`    ${living.id.padEnd(9)}${String(mine.length).padStart(3)} 条`)
    if (mine.length === 0) barren.push(`${living.id}（${household.outlook}）`)
  }

  console.log(`\n  各种日子看得见几条征象（不论年景）：`)
  for (const row of table) console.log(row)

  if (barren.length > 0) {
    console.log(
      `\n  ✗ ${barren.join('、')} 一条征象也看不见。` +
        `\n    他不是看不见世界，是该看见另一样东西——日常那一卷的「抬头看一眼外头」` +
        `\n    对他成了空的，而界面上只会少一句话，不会报错。`,
    )
    bad += 1
  }
}

/**
 * 三、尺子自检：把「谁看得见」整个摘掉，第二条得照样绿，第一条得红。
 *
 * 第二条摘掉 `who` 只会让每种日子看得见**更多**，所以它测不出摘没摘——
 * 这一条明写在这里，是提醒它守的是「不许有人看不见」这一头，
 * 另一头（「不许人人都看得见」）由 `scripts/upbringing.ts` 的生活事实词典守。
 * 两支合起来才是完整的一把尺子。
 */
{
  const anyone = SIGNS.filter((s) => !s.who).length
  console.log(`\n  覆盖：${SIGNS.length} 条征象，其中人人可见的 ${anyone} 条`)
  if (anyone === SIGNS.length) {
    console.log(`  ✗ 一条征象也没写「谁看得见」——那么这一节量的是一句空话。`)
    bad += 1
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  不在了的人不再说话，每一种日子都还看得见世界。')
  console.log('  **看不见不等于没发生，那是两件事。**\n')
}
