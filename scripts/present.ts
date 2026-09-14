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
import { titleFor } from '../src/content/address'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'
import { beOf } from './origin'

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
 *
 * 「埋」不写成「埋骨」：知识条目叫「父亲埋骨之处」，而问路那条选项写的是
 * 「问那人，父亲埋在哪里」——**同一件事两种说法，写死其中一种就漏掉另一种**。
 * 这跟底下 `ALSO_CALLED` 是同一个毛病的两次发作。
 */
const TALKING_ABOUT_DEATH =
  /不在了|没了|殁|走了|下葬|坟|埋|丧|头七|再没有消息|留下的|留下来|走在前头|先走一步|过世|去世|故去|不在人世/

/**
 * ## 2026-09-14 补了五个说法，而补它们的理由不是「漏了」
 *
 * 原表收了「走了」没收「走在前头」，收了「殁」没收「过世」。实测：
 *
 *     ★报红   嫂子走在前头 / 嫂子先走一步 / 嫂子过世那年
 *     豁免     嫂子没了
 *
 * 三句里前三句**都是完全正确的话**，而判据会把它们报成穿帮。
 *
 * ⚠️ **真正的代价不是误报，是内容绕着判据写。** 同伴那一轮写「她没了」那一支时，
 * 选择不点她的称呼，理由之一是「否则会被那支报成穿帮」——那一处他另有更好的
 * 理由（从老人家那一头说更贴），**可下一个人未必有**。
 *
 * > **判据的词表不全，于是内容绕着它写。绕一次两次没事，
 * > 绕多了，内容库的措辞就被一张不完整的正则塑形了。**
 *
 * 这是「判据的措辞会跟它的数分家」的另一面：那一条说判据**说错话**，
 * 这一条说判据**改变了被测的东西**——一支只读不写的走查，照样能反过来塑形内容。
 *
 * ## 为什么不收「先走」两个字
 *
 * 「你先走，我随后就到」——短词撞得狠，跟「哥」「姐」进 `TOO_COMMON` 同一个理由。
 * **只收四字以上的固定说法**，这条边界写在这儿，免得下一个人顺手把它加回来。
 */

/**
 * 明说在回想的那些话，撞上不算数。
 *
 * `REMEMBERING` 是按卷豁免的，可回忆不只出现在整卷回想的地方：
 * 渡口那一节「你想起父亲交代过的那句话」是一条**选项**，而它所在的卷通篇是现实。
 *
 * 只收「想起」「记得」这种**明写着在回想**的词，不收「那年」「从前」——
 * 后者是叙述时间，不是回想动作。收进来的话，「那年父亲从山里回来」也会被放过，
 * 而那正是这条判据要抓的东西。
 *
 * ## 「过」字那一组是后补的
 *
 * 头一版只收了「想起／记得／想到／梦见」，漏掉了另一种同样明确的回想说法：
 * **动词加「过」**。`trades.ts` 那句「你问过父亲山里有没有这样的人」在爹殁了
 * 之后被报成穿帮（由 xiuxian-game-79 跑出来），而它说的分明是当年问的那一次。
 *
 * 收的是「问过／说过／讲过／教过／告诉过」这几个**具体动词**加「过」，
 * 不是光收一个「过」字——「他走过来」「路过村口」里的「过」不是这个意思。
 *
 * ⚠️ 那一句还留着另一个问题，不归这条判据管，写在这儿备查：
 * 前半句硬写「父亲」，后半句是 `{elder}`。爹殁了之后占位符会落到别的长辈身上，
 * 于是读成「你问过父亲……娘说别听酒话」——**一句话里两个人**。
 * 判据抓不到它（前半句被豁免了），得靠人看见。
 */
const REMEMBERING_ALOUD = /想起|记得|想到|梦见|梦里|问过|说过|讲过|教过|告诉过/

/**
 * 对白里的亲属称谓，锚在**说话人**身上，不锚在玩家身上。
 *
 * ## 这不是一句例外，是一整类
 *
 * `{call:X}` 解析出来的称呼是**玩家视角**的——「爹」指玩家的爹。
 * 可正文里还有别人说的话，而**他嘴里的「我爹」是他的爹**：
 *
 *     nephew.ts:119   他先来找的你。他说，叔，你替我跟我爹讲一句。
 *     mountain 那句   南山里头早年有个采药的道人。我爹那辈子还见过。
 *
 * 玩家的爹早殁了，判据按「爹」这个字匹配就报「死人还在露面」——
 * **而那两句话一个字也没错**。
 *
 * ## 跟「同一个词指两个人」是同族的另一面
 *
 *     同名   「娘」既是生母的叫法，也是配偶的名字（姓+娘）
 *            → 抹掉在册人的姓+名再扫（`verify-relations.ts` 那一支）
 *     同词   「爹」由别人说出口时指的是别人的爹
 *            → **抹名字挡不住这一种**，因为「爹」根本不是名字
 *
 * ⚠️ 范围写清：豁免的是**带人称领属的亲属称谓**（「我爹」「你哥」「他婶」），
 * 不是所有含「爹」的句子。一句「爹站在门口」照样该红——单测过三句：
 *
 *     照红  吴婆婆留你住了一夜。
 *     豁免  他先来找的你。他说，叔，你替我跟我爹讲一句。
 *     照红  爹站在门口
 */
const SPEAKER_ANCHORED = /[我你他][爹娘哥姐弟妹叔婶伯]/

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
// 「老爹」是邻居的叫法（六十岁的许家户主叫「许老爹」），跟殁了的「爹」撞的是一个字
const INNOCENT_CONTEXTS: readonly string[] = ['姑娘', '新娘', '娘娘', '老爹', '原来他叫']

/**
 * 这个称呼此刻指的是**一个活人**吗。
 *
 * ## 用于认人的证据必须是身份解析结果，不能是未经解析的展示文本
 *
 * 这支门禁按称呼的字面在正文里找人，而**称呼是现算的、按住处走的**
 * （`callOf` → `neighbourCall`）：东头那户的老户主殁了，下一任户主
 * 照样叫「东头老江」。实测同一形状的顶替里 24% 会沿用死者那个称呼。
 *
 * 于是报出来的是：
 *
 *     P4 报=east-head(殁) 称呼=东头老江 认定的人=east-child-1(在) 他的称呼=东头老江
 *
 * **活人在说话，印的是他自己此刻的称呼**，而判据把它记到了死人头上。
 *
 * 两条更差的解法先排除掉：
 *
 *     扩那张排除表　　要人手维护，而且这一类不是「词的零件」，是同名
 *     冻住死者的称呼　那是改世界语义，而世界语义没有问题
 *
 * 这一问是从系统取的：**此刻有没有一个活人也叫这个**。有就是撞车。
 *
 * ## ⚠️ 而「死者的称呼」本身会不会漂：量过，不会
 *
 * 同伴 2026-09-14 在 `kept` 上撞到一条：位置记号落到的人换了，而**称呼会随
 * 年纪变**（「王婶」→「王婆婆」），所以那一支把比较从称呼字符串改成了比 id
 * ——**只有比 id 才分得出「换了人」和「同一个人换了称呼」**。
 *
 * 那条警告对这一支成立吗？实测 150 世、1622 个死者：
 *
 *     殁后称呼变过的   0 个（0.0%）
 *
 * **不成立，而理由是结构性的：死人不再长岁数，称呼就不再变。**
 * 所以 `gone` 表在他刚殁那一步存一次快照、往后一直用，是对的。
 *
 * ⚠️ 这个零有分辨力（分母 1622，不是稀有事件）——跟那种「没撞上的零」
 * 不是一回事。哪天有人让称呼随**别的东西**变（住处、身份、辈分推移），
 * 这个结论要重量。
 */
function stillSomeoneAlive(calls: string, dead: string): boolean {
  const people = usePeopleStore()
  for (const id of Object.keys(people.known)) {
    if (id === dead) continue
    if (!people.isAlive(id)) continue
    if (people.callOf(id) === calls) return true
  }
  return false
}

/**
 * 这个词此刻是不是**别人对玩家**的称呼。
 *
 * ## 第三种同词碰撞，而它跟前两种方向相反
 *
 * ```
 * 同名  「娘」既是生母的叫法，也是配偶的名字（姓+娘）   → 抹在册人的姓+名
 * 同词  「我爹」由别人说出口时指别人的爹                → SPEAKER_ANCHORED
 * 反向  「先生」是【别人对玩家】的称呼                  ← 这一条
 * ```
 *
 * **前两种里那个词至少指向某个 NPC，只是指错了人。这一种根本不指向 NPC。**
 *
 * 2026-09-14 实撞（`SEED=e5`）：
 *
 * ```
 * 〔正文〕teacher（玩家叫他「先生」）：先生，你可算回来了。
 * ```
 *
 * 而库里那句是 `reunion.ts:342` 的**纯白话**「你可算回来了。」，
 * 说话的是隔壁婶子。「先生」两个字是 `{hail:}` 拼上去的：
 *
 *     interpolate.ts:471   `{hail:X}` 是「**那个人开口时怎么称呼你**」，
 *                          跟 `{call:}` 朝相反的方向
 *     content/address.ts   HONORIFICS 里 { identity: '塾师', word: '先生' }
 *
 * **玩家当过塾师，所以别人叫他「先生」**——跟那位死掉的教书先生只是撞了字。
 *
 * ## 为什么问身份称谓，不问 `{hail:}` 的形状
 *
 * 两条更差的解法先排除掉：
 *
 *     判「紧跟逗号」　　不成立。`callMeBy` 对旧交返回 `undefined`
 *                       （`interpolate.ts`：「熟人开口本来就不带称呼，
 *                       那正是『熟』的样子」），所以 `hail` 有时是空的
 *     改 interpolate　　记下每个 hail 段落的区间让判据跳过。准，
 *                       但那是共享代码，而这一问不用碰它
 *
 * 这一问**从系统取**（`titleFor(character.identity, gender)`）：
 * `HONORIFICS` 里添一个词它自动跟上，不用在这边另抄一张表。
 *
 * ⚠️ **边界，而且量过**：玩家的身份称谓若**恰好等于**某个死者的 `calls`，
 * 这一条会放过一条真穿帮。
 *
 * 实测（2026-09-14），而**两个率要分开看，瓶颈在后一个**：
 *
 *     有「先生」殁掉的       191 / 200 世   几乎必然（他比玩家大一辈）
 *     玩家当上塾师            24 / 400 世   6.0%  ← **瓶颈在这儿**
 *     两者同时成立             8 / 200 世   一次抽样，期望 12，在噪声里
 *
 * ⚠️ 我头一版只量了第一个数，把「几乎必然」当成了分母，于是把 4% 说成
 * 「漏报率」。**真正决定它的是玩家当不当得上塾师**——而那 6% 才是这条
 * 豁免的实际代价。要报一位有效数字得跑一千世以上，8 这个数自己就在噪声里。
 *
 * > **抓住了一个真实存在的因素，而没问它是不是那个瓶颈。**
 *
 * 400 世的终身身份分布（同一次实测）：识字人 330、塾师 24、匠人 16、
 * 佣工 9、农家子 9、生员 7、管事 2、伙计 2。
 *
 * 重叠只有一个词：`HONORIFICS` 给出 殿下／相公／先生，而死者的 `calls` 里
 * 有「先生」。**所以这一条放过的全是「玩家当过塾师，而他的塾师也殁了」那种世。**
 *
 * 那是拿误报换漏报——而在这一族里值：
 * **误报会让看的人直奔一处没毛病的地方去查**（同伴那支一轮报出九处误报，
 * 差点把十几条真候选淹掉）。
 */
function isMyOwnTitle(word: string): boolean {
  const character = useCharacterStore()
  const household = useHouseholdStore()
  return titleFor(character.identity, household.gender) === word
}

/**
 * 撞上的那个字，是不是长在【别人的名字】里。
 *
 * ## 这是上面那一问的另一面
 *
 * `stillSomeoneAlive` 问的是「这个**称呼**此刻还指着活人吗」。
 * 而还有一种撞车它够不着：**那个字不是谁的称呼，是谁名字里的一个零件。**
 *
 * 2026-09-13 实撞（`SEED=18bt1eize8h0`）：
 *
 * ```
 * 〔正文〕mother（玩家叫他「娘」）：有人上门说了句不中听的话。秦娘没恼……
 * ```
 *
 * **「秦娘」是妻子。** `match.ts` 四条议亲对象的 `given` 都是「娘」
 *（一手核：`grep -rn "given: '娘'" src/` → `match.ts` 四条，`src/engine/` 零处），
 * 落纸就是「秦娘」「陈娘」「林娘」。而妻子的称呼是「妻子」，
 * 所以 `stillSomeoneAlive('娘', …)` 找不到她——**撞的不是称呼，是名字**。
 *
 * `INNOCENT_CONTEXTS` 也挡不住：那张表收的是「姑娘」「新娘」「娘娘」这类
 * **固定词**，而「姓+娘」不是固定词，姓是掷出来的。
 *
 * ⚠️ **而这个洞早有人碰到过。** 那张表的注释里写着「或者一枚回执
 * 『原来他叫 · 秦娘』」，于是 `'原来他叫'` 被加了进去——**那是照当时撞见的
 * 那一句话的说法补的**，只罩住回执那一种句式。正文里换个说法
 *（「有人上门说了句不中听的话。秦娘没恼」）就照样撞。
 *
 * 所以这一条不往那张表里再加词：**要挡的不是某一句话，是「名字」这一类。**
 *
 * ## 只抹别人的，不抹正在查的这一个
 *
 * ⚠️ 这儿**不能照搬 `verify` 那边的抹法**（`tasks/verify-relations.ts` 把在册
 * 所有人的姓+名都抹掉）。那一支找的是「娘说」这种亲属称谓的鬼影，全抹安全；
 * **而这一支找的就是死者的称呼，全抹等于把它弄瞎。**
 *
 * 所以按 `self` 排除：查娘的时候，抹掉的是别人的名字，娘自己的留着。
 * 姓或名缺一个也跳过——`'' + '娘'` 会把光杆「娘」抹光，那就是弄瞎它。
 *
 * 换成「·」不是删掉：删会把前后两截接起来，接出来的字可能是原文没有的。
 */
function maskOtherNames(text: string, self: string): string {
  const people = usePeopleStore()
  let out = text
  for (const one of Object.values(people.roster)) {
    if (one.id === self) continue
    if (!one.surname || !one.given) continue
    out = out.split(`${one.surname}${one.given}`).join('·')
  }
  return out
}

/** 这一句里的「娘」是不是别的词的零件 */
function innocent(text: string, calls: string): boolean {
  if (calls.length > 1) return false
  return INNOCENT_CONTEXTS.some((word) => text.includes(word))
}

/**
 * 同一个人，正文里还可能被叫成什么。
 *
 * ## 尺子从前只量了两种叫法里的一种
 *
 * `calls` 是境况表钉下的那个称呼——查遍全库，爹永远是「爹」，娘永远是「娘」
 * （`content/circumstances.ts`，各十处，没有第二种写法）。
 * 可正文不用它：库里「父亲」一百五十一处、「爹」一百一十三处，
 * 两个词指着同一个人。判据只拿 `calls` 去找，
 * **于是「父亲」那一百五十一处，一处也够不着。**
 *
 * 这不是内容写错了词。教养不同，这家的孩子就是管爹叫「父亲」
 * （见 `content/address.ts` 的 `kin`），两种叫法都对。
 * 错的是尺子只量了其中一种，而**量不到的那一半看着跟没问题一模一样**。
 *
 * 这正是上面第一条注释里那句话的后半截：占位符防住的那一层，
 * 硬写的字绕过去了——`{elder}` 会按教养解析成「爹」或「父亲」，
 * 硬写的「父亲」却哪一层都不过，从前也没有任何一把尺子量它。
 *
 * 不列「爹爹」「娘娘」：它们各自含着「爹」「娘」，`calls` 那一路已经罩住了；
 * 而「娘娘」还在 `INNOCENT_CONTEXTS` 里另有用处，列进来会打架。
 */
const ALSO_CALLED: Readonly<Record<string, readonly string[]>> = {
  爹: ['父亲'],
  娘: ['母亲'],
}

/** 这个人可能被写成的所有叫法：境况表那个，加上正文惯用的书面词 */
function namesOf(calls: string): readonly string[] {
  return [calls, ...(ALSO_CALLED[calls] ?? [])]
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

/**
 * 被 `TOO_COMMON` 整个滤掉的那些人，殁过几世。
 *
 * ## 判据承认自己分不出，于是把事实摆出来
 *
 * `TOO_COMMON` 是**按词**豁免的，而那张表里混着两类：
 *
 *     真通用词    「孩子」「老人」「家里人」——这个词本来就不专指某一个人
 *     泛指／特指  「徒弟」——同一个词，有时泛指一类人，有时特指那一个
 *
 * 2026-09-14 实测（120 世）：「收个徒弟」这个可反复选的日常项出现 734 次，
 * 其中 403 次徒弟**已经在册**；徒弟已殁而这句话还在选项里的有 2 次。
 *
 *     收个徒弟   泛指一类人   ← 正当，413 次
 *     徒弟没来   特指那一个   ← 他殁了就是穿帮
 *
 * ⚠️ **而这一层中文里没有形式标记，机器分不出。** 三条路都试过：
 *
 *     拿掉豁免           两处稳定误报回来（「收个徒弟」「你收了个徒弟」）
 *     问「他入册了吗」   不成立——收过徒弟之后那个选项照样出现（403/734）
 *     硬编码那两句       把**一整类时刻**记成两个实例，下一句同形状的又漏
 *
 * 所以处置是：**豁免照旧，把它遮住的次数报出来，不判红。**
 * **我分不出的东西，不该假装分出来了。**
 *
 * ## ⚠️ 三行数各有各的来源，别读成一次测量
 *
 *     这个词在正文里出现过几次        本支量的，客观可数
 *     其中几次那个人已经不在了        本支量的，客观可数
 *     而这个人一格也没被条件层问过    **另一支量的**（`scripts/cells.ts`）
 *
 * 第三行是 2026-09-14 同伴那支走查给的：`apprentice` **零格**——
 * 连 `alive` 都没有任何内容问过。所以那 2 次**不是这张豁免表放过了它，
 * 是压根没有人在守这个人**，这张表改不改对他都没区别。
 *
 * **合成一句会让读的人以为它们出自同一次测量**，而下次谁改了其中一支，
 * 另一半会静默失效。所以分行写，并注明来源。
 */
const muted = new Map<string, number>()

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
  /*
   * 已经看过的正文块，按**块 id** 记，不按下标。
   *
   * ## 为什么不能用 `stream.slice(seen)`
   *
   * `narrative.stream` 有上限（`stores/narrative.ts` 的 `MAX_STREAM_LENGTH = 400`），
   * 满了之后 `append()` 从**头部**裁。于是 `length` 封顶恒等于 400，
   * `seen` 也就恒等于 400，**`slice(400)` 稳定返回空**。
   *
   * 2026-09-14 一手量过（100 世）：
   *
   *     按块 id 收到的正文块   73751
   *     slice(seen) 收到的     37084
   *     漏掉                   36667 块（49.7%）
   *     头一次撞上限           第 60 步（一辈子约 200 步，后四分之三基本全漏）
   *
   * ⚠️ **而漏报完全静默**：`seen` 从来不会超出 `length`，没有任何越界迹象。
   * 我头一版探针问的是「`seen > length` 几次」，200 世**零次**，差点判没问题——
   * **「问有没有异常」对「没有异常只有沉默」的故障天然无效**，
   * 换成「两种收法的总数并排比」才量得出来。
   *
   * 这条坑 `stores/narrative.ts:15` 早就写着：「门禁走查也不能拿
   * `stream.slice(seen)` 当全部正文——四百块之后它返回的永远是空，得按块 id 收。」
   * **写上限的人当时就预见到了，而两支门禁照样那么写了**（另一支是 `neighbours.ts`）。
   */
  const seenIds = new Set<string>(narrative.stream.map((one) => one.id))
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
      if (!calls) continue
      if (TOO_COMMON.includes(calls)) {
        // 这个人被整个滤掉了。底下把他殁过几世报出来，不判红
        muted.set(calls, (muted.get(calls) ?? 0) + 1)
        continue
      }
      gone.set(person.id, calls)
      deathsSeen += 1
    }

    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const fresh = narrative.stream.filter((one) => !seenIds.has(one.id))
    for (const one of fresh) seenIds.add(one.id)

    // 整卷都是回想的那几卷跳过。人可以想起死去的人，那不是穿帮
    if (REMEMBERING.some((id) => (narrative.sceneId ?? '').startsWith(id))) continue

    for (const [id, calls] of gone) {
      const names = namesOf(calls)
      for (const item of fresh) {
        const text = 'text' in item.block ? item.block.text : null
        if (!text) continue
        // 撞上哪个词要记住：底下 `innocent` 和报错那行说的都得是撞上的那一个
        // 撞的可能是别人名字里的零件（「秦娘」里的「娘」），先把别人的名字抹掉
        const hit = names.find((name) => maskOtherNames(text, id).includes(name))
        if (hit === undefined) continue
        if (TALKING_ABOUT_DEATH.test(text)) continue
        if (REMEMBERING_ALOUD.test(text)) continue
        if (SPEAKER_ANCHORED.test(text)) continue
        if (innocent(text, hit)) continue
        // 那个称呼此刻还指着一个活人——是撞车，不是穿帮
        if (stillSomeoneAlive(hit, id)) continue
        if (isMyOwnTitle(hit)) continue
        ghosts.push({ who: id, calls: hit, where: '正文', text })
      }
      for (const option of narrative.options) {
        const label = option.choice.label
        const hit = names.find((name) => maskOtherNames(label, id).includes(name))
        if (hit === undefined) continue
        if (TALKING_ABOUT_DEATH.test(label)) continue
        if (REMEMBERING_ALOUD.test(label)) continue
        if (SPEAKER_ANCHORED.test(label)) continue
        if (innocent(label, hit)) continue
        if (stillSomeoneAlive(hit, id)) continue
        if (isMyOwnTitle(hit)) continue
        ghosts.push({ who: id, calls: hit, where: '选项', text: label })
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
  if (muted.size > 0) {
    const rows = [...muted.entries()].sort((a, b) => b[1] - a[1])
    /*
     * ⚠️ 这一段把「为什么遮它」印在数字旁边，而不是只写在上头那四十行注释里。
     *
     * **区别在于「判不了」是不是每次跑都被念一遍。** 注释里的说明只在
     * 有人读这个文件时存在；印在报表上的那一行，每跑一次门禁就提醒一次
     * 「这里有一块没人看得住」——**一个数字旁边写着「这个数没人在看」，
     * 比同样的话埋在注释里有压力。**
     */
    console.log(`\n  · ${rows.length} 个称呼被 TOO_COMMON 整个滤掉（报数不判红）：`)
    for (const [word, n] of rows) {
      console.log(`      ${word.padEnd(4)} 他殁过 ${String(n).padStart(3)} 世`)
    }
    console.log(
      '    ◇ 这几个词为什么遮：「孩子」「老人」「家里人」本来就不专指某一个人；\n' +
        '      「哥」「姐」「弟」「妹」是别的词的零件（「哥哥」「他哥」）。\n' +
        '    ◇ 而「徒弟」不是这两种——它专指一个人，遮它是因为**泛指和特指机器分不出**\n' +
        '      （「收个徒弟」是泛指，「徒弟没来」是特指，中文里没有形式标记）。\n' +
        '      **所以上面那个数里有没有真穿帮，没有任何判据在看。**',
    )
  }

  /*
   * ⚠️ 一笔未结的账，印在这儿——**不印在报红分支里**。
   *
   * ## 为什么不印在报红那一行
   *
   * 这笔账此刻是**绿的**（十几颗种子没复现）。写在报红分支里，
   * 等于它绿着的时候没人知道有这笔账——**而那就把「有没有这笔账」
   * 和「这笔账有没有发作」绑成了一件事。**
   *
   * ## 那笔账
   *
   * 2026-09-14 这一支报过两句（`SEED=1ltutuyfmjy0`，那颗种子后来因为
   * 内容改动失效，复现不了）：
   *
   *     〔正文〕father（玩家叫他「父亲」）：你从来不知道父亲去过那么远的地方。
   *     〔正文〕father（玩家叫他「爹」）：  你忽然发现，爹在当爹之前……
   *
   * 那两句在 `kin.ts:72/76`，属 `dad:north`。三个猜测**逐个排除过**：
   *
   *     recall 天然产生这种语气   ✗ recall 印的是「原来 · …」，不含称呼
   *     字进 stream 活到爹殁之后   ✗ fresh 按块 id 去重，seenIds 每世重置
   *     那一卷在爹殁后还能演       ✗ 入场 father present:true，窗口 8–16，只有一个入口
   *
   * **第四种量出来了**：一步不止演一卷。60 世 6383 步实测——
   *
   *     一步 1 卷  63.5%     一步 2 卷  30.5%
   *     一步 3 卷   4.3%     一步 4–6 卷 1.7%     ← 最多一步六卷
   *
   * 所以**入场判定和正文落笔之间，隔着别的卷推的时间**：入场那一刻爹还在，
   * 落笔那一刻他没了。⚠️ **而最后这一环是推的，没有现场。**
   *
   * ## 下一次它红的时候要印什么
   *
   * 别只印 `sceneId`——**印这一步经过的全部 sceneId（数组）**，
   * 外加每进一卷时爹的 `fate`。一步一行印不出这件事。
   */
  console.log(
    '\n  ⚠️ 未结的账：2026-09-14 这一支报过两句「爹的往事」（kin.ts:72/76），' +
      '真因未定、量级 2、此刻不复现。\n' +
      '     四个猜测排掉三个，第四个（一步演多卷，实测 36.5%）只差现场。\n' +
      '     **新红别当旧闻**——下次红时抄种子，印这一步的全部 sceneId 数组 + 每卷入场时爹的 fate。',
  )
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

  /**
   * 每种日子摆在它**典型**的世界里问。
   *
   * 从前这儿随机掷一个出身再硬套 `liveAs(living)`：掷到一个被寺里收留的木匠家孩子，
   * 套上铺子里的日子——住寺里（街面的征象看不见）、业是木工（田里的看不见）、
   * 家境中等（穷富两句都不说），于是「shop 一条征象也看不见」。种子把这一世钉住了
   * （SEED=h1），可它量的不是日子，是一个不存在的组合。
   *
   * 出身按日子选（`LIVINGS` 的反查）；半路才有的日子（给人做工、门第塌了）
   * 摆在农户家里。住处要是典型的：宅、宫、王府各归各，掷到寺里、街上的重掷。
   */
  const ORIGIN_FOR: Partial<Record<string, OriginId>> = {
    farm: 'farm',
    hunt: 'hunt',
    craft: 'craft',
    shop: 'cloth',
    clinic: 'herb',
    office: 'office',
    yamen: 'yamen',
    palace: 'court',
    manor: 'manor',
  }
  const TYPICAL_HOME: Record<string, string> = { palace: '宫', manor: '王府' }
  for (const living of ALL_LIVINGS) {
    const origin = ORIGIN_FOR[living.id] ?? 'farm'
    const wantHome = TYPICAL_HOME[living.id] ?? '宅'
    let world = useWorldStore()
    let character = useCharacterStore()
    let household = useHouseholdStore()
    for (let tries = 0; tries < 200; tries += 1) {
      setActivePinia(createPinia())
      character = useCharacterStore()
      household = useHouseholdStore()
      world = useWorldStore()
      usePeopleStore()
      beOf(origin)
      useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale }).begin()
      if (world.residenceKind() === wantHome) break
    }
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
