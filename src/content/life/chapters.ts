import { GROWN_UP, PRIME_UP } from '@/engine/stages'
import type { Chapter } from '@/types/chapter'

import { birthEvents, birthScenes } from './birth'
import { childhoodEvents, childhoodScenes } from './childhood'
import { dayEvents, dayScenes } from './day'
import { dearthEvents, dearthScenes } from './dearth'
import { encounterEvents, encounterScenes } from './encounters'
import { endingEvents, endingScenes } from './ending'
import { examEvents, examScenes } from './exam'
import { hardshipEvents, hardshipScenes } from './hardship'
import { houseEvents, houseScenes } from './house'
import { illnessEvents, illnessScenes } from './illness'
import { inquiryEvents, inquiryScenes } from './inquiry'
import { kinEvents, kinScenes } from './kin'
import { kindredEvents, kindredScenes } from './kindred'
import { descendEvents, descendScenes } from './descend'
import { leavingEvents, leavingScenes } from './leaving'
import { meetingEvents, meetingScenes } from './meeting'
import { awayEvents, awayScenes } from './away'
import { nephewEvents, nephewScenes } from './nephew'
import { reunionEvents, reunionScenes } from './reunion'
import { refugeEvents, refugeScenes } from './refuge'
import { regardEvents, regardScenes } from './regard'
import { investEvents, investScenes } from './invest'
import { unrestEvents, unrestScenes } from './unrest'
import { rivermanEvents, rivermanScenes } from './riverman'
import { afterwardsEvents, afterwardsScenes } from './afterwards'
import { apprenticeEvents, apprenticeScenes } from './apprentice'
import { attemptEvents, attemptScenes } from './attempt'
import { bearingEvents, bearingScenes } from './bearing'
import { candourEvents, candourScenes } from './candour'
import { festivalEvents, festivalScenes } from './festival'
import { findingEvents, findingScenes } from './finding'
import { matchEvents, matchScenes } from './match'
import { mountainEvents, mountainScenes } from './mountain'
import { mourningEvents, mourningScenes } from './mourning'
import { routineScenes } from './routine'
import { royalEvents, royalScenes } from './royal'
import { schoolingEvents, schoolingScenes } from './schooling'
import { seekingEvents, seekingScenes } from './seeking'
import { tradeEvents, tradeScenes } from './trades'
import { tutelageEvents, tutelageScenes } from './tutelage'
import { youthEvents, youthScenes } from './youth'

/**
 * 凡人这一册的目录。
 *
 * ## 这张表是唯一真相源
 *
 * `index.ts` 的 `lifeScenes` / `lifeEvents` 都从这里摊平出来。
 * 新写一章要在这里加一行，不加就进不了库——**这正是想要的**：
 * 从前那两处 spread 是各写各的（卷十七行，事件十六行，顺序还不一样），
 * 漏掉一处就是「场景在库里但年表叫不出来」，而没有任何地方会吭声。
 *
 * ## 拓扑长这样
 *
 * 绝大多数章彼此不连，各自靠年表被叫出来，演完就回年表。
 * 跨章的边全在下面各章的 `to` 里，一条不落——现在是三条：
 * `day` → `encounters` 这一条硬接，加上 `seeking` ⇄ `meeting` 那一对回头边。
 *
 * 这个形状是有意的：**每一章是一段可以独立读的人生片段**，
 * 而不是一棵必须从头走到尾的剧情树。链条是靠 flag 攒出来的
 * （欠债 → 父亲出门 → 死在外地），不是靠场景硬接。
 * 硬接的那几条反倒是例外——**它们全都写在 `to` 里，看得见**。
 *
 * ## 这段从前写着「六十四卷，跨章的边只有一条，其余十七章彼此不连」
 *
 * 三个数当时都对。后来加了章、加了卷、`seeking` 和 `meeting` 之间接了一对
 * 回头边，三个数就全错了，而**没有任何一处会因此变红**——
 * 一段散文里的数字没有出处，也就没有人替它把关。
 *
 * 所以现在这里一个数也不写：要数几章几卷，`CHAPTERS.length` 和
 * `Object.keys(lifeScenes).length` 就在手边；要看跨章的边有哪些，
 * 底下每一章的 `to` 是唯一真相源，`verify.ts` 拿它对着内容量。
 */
export const CHAPTERS: readonly Chapter[] = [
  /** 睁开眼那一日。家里正在做的事，就是你的开局 */
  {
    id: 'birth',
    scenes: birthScenes,
    events: birthEvents,
    called: ['年表'],
    to: [],
    age: [0, 0],
    purpose: ['不选出身，出身选你——睁开眼那一刻家里正在做的事，就是开局'],
    marks: ['identity'],
    // 生下来是什么就是什么。它会被削爵那类事件改掉（`royal` 落「庶人」），
    // 但那是**别人夺走的**，不是它自己该结束——跟「学童」那种「做完了就不是了」两回事
    identityKind: '终点',
  },

  /** 三到六岁。世界只有院子那么大 */
  {
    id: 'childhood',
    scenes: childhoodScenes,
    events: childhoodEvents,
    called: ['年表'],
    to: [],
    age: [3, 6],
    purpose: ['头一回知道自家过得好不好，而这件事此后一直在起作用'],
    marks: ['household'],
  },

  /** 私塾。念不念得成，多半不由你 */
  {
    id: 'schooling',
    scenes: schoolingScenes,
    events: schoolingEvents,
    called: ['年表'],
    to: [],
    age: [7, 13],
    purpose: [
      '识字这道门多半不由自己推开——供得起、咬牙供、供不起，是三种人生',
      '学识那一面从这里开始分岔',
    ],
    marks: ['knowledge', 'aspect', 'identity'],
    /*
     * 「学童」是**正在做的事**，不是终点——这是这一格存在的理由。
     *
     * 它的语义里含着一个终止条件：**不念书了就不是学童**。
     * 而全库能改掉它的只有 `exam` 的几节和 `hardship`（家道中落），
     * 于是 xiuxian-game-79 实测出 450 世的人死的时候还挂着它
     * （念了书、没考中、又没家道中落的那些人）。
     *
     * 那三笔已经补在 `exam` 章（`0d5988e`），可**补法治标**——
     * 真正守住它的是这一格加上 `scripts/identity.ts`：
     * 标一次「正在做的事」，判据此后每一轮都替它问「到死还挂着的有几个」。
     *
     * 跟 `birth` 那章的「终点」对照着看就清楚了：生下来是什么就是什么，
     * 削爵能夺走它，但那是**别人夺走的**，不是它自己该结束。
     */
    identityKind: '正在做的事',
  },

  /**
   * 县试那几年。念了书，然后呢。
   *
   * 在这一章之前，念书这条线到十三岁就断了：`schooling` 给你 `literacy`，
   * 而识字之后能做的只有三件——把字捡起来、替人写写算算、收个徒弟。
   * **念了十年书的人和没念过的人，成年之后除了识字这一条，人生没有任何分岔。**
   *
   * 第一个使用者早就在库里，而且是个活人：`schooling.ts:197` 那位西席
   * 「姓周，**落第多年的秀才**」。这个世界里已经有落第的人了，
   * 只是玩家自己不能落第——**他的今天就是玩家可能的明天**。
   *
   * 三档不是三级：童生（见官不跪）、生员（免徭役）、落第。
   * **落第不是失败分支**——议亲、生育、修炼三处都立过这条纪律，
   * 而在功名这一格上它尤其要紧：绝大多数人考不中，
   * 写得薄了这一册就成了「读书 → 做官」的阶梯，那是最不像那个时代的一件事。
   *
   * `marks` 里有 `identity`：童生和生员各换一次身份，
   * **而它们都有下家**（`exam:done` 那一卷不改身份，人还是那个人）——
   * 学徒那一格的教训在这儿是记着的。
   */
  {
    id: 'exam',
    scenes: examScenes,
    events: examEvents,
    called: ['年表'],
    to: [],
    age: [14, 65],
    purpose: ['念了十年书，多半什么也不是——而那不是失败，是那个时代的常态'],
    marks: ['undertake', 'roll', 'flag', 'identity'],
    /*
     * 这一章落四个身份，四个都是终点：
     *
     *     童生　　考中了就是童生，往上考中了才换成生员——**换掉它的是另一次考中，
     *             不是「童生这件事做完了」**
     *     生员　　中了秀才不会因为任何事情不再是秀才
     *     识字人　念过书这件事不会消失。他没考中，可他仍然认得字
     *     塾师　　坐馆是他往后的营生
     *
     * 跟「学童」的分界在语义里：**「学童」含着一个终止条件（不念书了就不是学童），
     * 这四个都不含**。所以它们没有下家是设计，不是漏写。
     *
     * ⚠️ 童生那一格看着像中间态（它确实会被生员换掉），可换掉它的是
     * **另一件事成立了**，不是它自己到期。一个考不上去的童生一辈子是童生，
     * 那不是 bug——明代多的是这样的人。
     */
    identityKind: '终点',
  },

  /**
   * 欠债、出门做工、死在外地。这一册里最长的一根链条。
   *
   * ## 头一格从前写的是七岁
   *
   * 那时它跟 `schooling` 同岁起步，而**两者的先后决定一个人识不识字**：
   * 七岁那年 `school:threshold` 拿家境分档，26 是读不上书的线。
   * 欠债那一节要是排在入学之后，它压下去的那几分再也影响不到那道门——
   * 家道中落只能改后半生，改不了「他有没有念过书」。
   *
   * 提到五岁不是为了让日子更苦，是为了**让这条链有机会赶在那道门之前**。
   * 一个五岁上欠了债的农家，七岁那年才可能真的供不起。
   *
   * ## 提前两岁之后，那道门后面第一次站了人
   *
   * 改之前 `scripts/origins.ts` 印出来的是**十一种出身读过书全是 100%**——
   * 一个连赤贫都没有的世界。于是 `school:threshold` 那三节
   * 「供不起」的内容（`cannot` / `worked` / `peeked`）**写在库里，一千世无人读到**，
   * 而它们看起来跟活的一模一样。
   *
   * 提到五岁之后农户那一行掉到六成六（别的出身仍是 100%——他们本来也不该穷）。
   * 换句话说，**三分之一的农家子现在真的念不成书**：`cannot` 那一节第一次
   * 有人读到，它底下那两条岔路（出门做工、趴在窗外听）也跟着活了过来。
   *
   * 这个数会漂，也**不是判据**：往这条链上再加一件事、或者调一调家境的起手，
   * 它就变。它是这次改动生效的出处，不是一道门槛。
   */
  {
    id: 'hardship',
    scenes: hardshipScenes,
    events: hardshipEvents,
    called: ['年表'],
    to: [],
    age: [5, 15],
    purpose: [
      '一个人的死怎么改掉之后十年',
      '把「家里少个劳力」变成后面事件读得到的事实，而不是一句旁白',
      '家道中落要赶得上七岁那道入学的门槛，否则它只改得了后半生',
    ],
    marks: ['person', 'household', 'identity', 'meet'],
    /*
     * 这一章落两个身份，都是终点：
     *
     *     农家子　家道中落之后回去种地。**种地不是一段要结束的日子，是他往后的日子**
     *     帮工　　给人做工。看着像「正在做的事」，可它跟「学徒」差着一层——
     *             学徒有出师那一天，**帮工没有「帮完了」的时刻**，它就是他的营生
     *
     * 「帮工」这一格我犹豫过。分辨的办法是问：**有没有一件事发生之后他就不再是了？**
     * 学徒有（出师），学童有（不念书了），而帮工没有——他不帮工了是因为
     * 家里翻身了或者他改行了，那是**另一件事发生**，不是这件事到期。
     */
    identityKind: '终点',
  },

  /** 荒年 */
  {
    id: 'dearth',
    scenes: dearthScenes,
    events: dearthEvents,
    called: ['年表'],
    to: [],
    age: [5, 16],
    purpose: [
      '同一场旱灾落在不同人家身上，是四种样子',
      '佃户家还压着租子：田主缓不缓从性情里出；农家靠第二样进项撑过去',
    ],
    marks: ['household', 'owe', 'flag'],
  },

  /** 你问了个大人答不上来的问题 */
  {
    id: 'inquiry',
    scenes: inquiryScenes,
    events: inquiryEvents,
    called: ['年表'],
    to: [],
    age: [6, 16],
    purpose: ['玩家第一次自己提出问题，而不是等着被问'],
    marks: ['ask'],
  },

  /** 家里人。生老病死婚丧嫁娶 */
  {
    id: 'kin',
    scenes: kinScenes,
    events: kinEvents,
    called: ['年表'],
    to: [],
    age: [8, 16],
    purpose: ['爹娘也有过去，只是要等很多年他才听说'],
    marks: ['recall', 'meet'],
  },

  /**
   * 一门亲事。「正在议亲」这件事真的要花时间。
   *
   * 这一章是「过程中状态」的第一个使用者：从前成家是一步跳过去的
   * （`routine.ts` 里选一下、一年过去、屋里多个人），现在它有中间——
   * 有人提起、长辈打听、你愿不愿意、成或不成。
   *
   * **「没成」跟「成了」是同一层的两个结局**，所以 `marks` 里两条都记。
   */
  {
    id: 'match',
    scenes: matchScenes,
    events: matchEvents,
    called: ['年表'],
    to: [],
    age: [16, 40],
    purpose: ['一门亲事从有人提起到成或不成，中间那段时间真的存在过'],
    // 这一章留下的痕迹：议亲那件事的起止（undertake），以及成了之后进门的那个人（meet）
    marks: ['undertake', 'meet'],
  },

  /**
   * 节令：到了那个日子，不是碰巧在那个日子。
   *
   * **这一章是 `{ type: 'time', untilMonth }` 的第一个使用者。**
   * 从前节令靠 `Condition.month` 守时令，那问的是「碰巧在那个月」——
   * 而成年后一回合推两三年、月份几乎不动，于是「年年可能有」成了
   * **按世翻的开关**（实测四十世只有十一世到过腊月正月），
   * 一卷本该年年有的内容四分之三的人读不到。现在由内容自己把日历推过去。
   *
   * 眼下只有中秋一卷，它说的是**今晚不在跟前的那些人**——跟年节
   * （`kindred:newyear`，回老屋走一趟）分工清楚。上元、端午、中元、
   * 除夕、祭灶进这一章时，各得先说清自己说的是什么：
   * 六卷都写成「过节了，一家人聚在一起」等于同一卷演了六遍。
   *
   * `marks` 是空的：这一卷一格好感也不改、不落旗、不进编年——
   * **它只让玩家看见一个空位**。空着不是漏了，是这一章确实什么也不改。
   */
  {
    id: 'festival',
    scenes: festivalScenes,
    events: festivalEvents,
    called: ['年表'],
    to: [],
    age: [22, 80],
    purpose: ['节令说的是「到了那个日子」，所以时令由内容自己推，不靠碰巧'],
    marks: [],
  },

  /**
   * 认得出与认不出：名字不在东西上，在人身上。
   *
   * 31.md 第一节反对「拾取：赤炎石 × 3」那种写法——玩家不该自动知道
   * 手里的是什么。而**地基早就在了**：`InventoryItem.name` 明写它是
   * 「你此刻会怎么称呼它，不是它究竟是什么」，`Interpretation` 里
   * 「确信」那一档的注释自己写着「可能仍然是错的」。
   *
   * **缺的是东西，不是链。** 动手前数过：全库只有两处 `type: 'item'`
   * （药铺那截根、山道上那本书），两样都是白给的、都被一步点破了，
   * 而且认不出这件事只属于药铺家的孩子（`trade-herb` 压着 `business: '药铺'`）。
   *
   * 所以这一章只做一件事：**让「认不出的东西」在普通人的日子里出现，
   * 并且让它停在「认不出」上。** 不建材料表、不建九级链、不给「鉴定」按钮。
   *
   * `marks` 里有 `item` 和 `knowledge`：东西进了行囊，而认知停在「未理解」
   * ——**他知道有这么件事，可他说不出那是什么**。
   */
  {
    id: 'finding',
    scenes: findingScenes,
    events: findingEvents,
    called: ['年表'],
    to: [],
    /*
     * 8–40：**这一章跨着两段人生**，不是一段。
     *
     *     8–16　　跟着大人上山，撞见一样认不出的东西
     *     10–40　 多年以后，某个懂行的人说出它的名字
     *
     * 头一版写的是 8–16（那时只有前一卷）。加了点破那一卷之后
     * `verify` 第七道当场红：「窗口跑出章界」——**目录跟内容对不上**。
     * 改章界不改事件窗口，因为**那两卷本来就该隔着许多年**：
     * 一个人怀里揣着一株没名字的草长大，这件事本身就是内容。
     */
    age: [8, 40],
    purpose: [
      '名字不在东西上，在人身上——认不出是常态，认得出才是例外',
      '认不出要靠一个具体动作说出来（他捏了捏，闻了闻，说不认得），不靠一个标签',
    ],
    marks: ['item', 'knowledge'],
  },

  /**
   * 添丁：等着的那几年。
   *
   * 跟婚事那一册是同一个立场的第二次落地——**这个时代里最要紧的那几件事，
   * 都不由一个人说了算**。从前「添个孩子」是 `routine.ts` 里的一个选项，
   * 选了就有，一次也没落空过；而那写的是「他想不想要孩子」，
   * 不是「他有没有孩子」。
   *
   * 三个结局都是同一层的：孩子活下来、孩子没留住、这些年一直没有动静。
   * 所以 `marks` 里既有 `meet`（多了一个人）也有 `flag`（`no-issue`）——
   * **没有孩子那一路也得在这一章的账上留下痕迹**，否则走查会以为那条路空着。
   */
  {
    id: 'bearing',
    scenes: bearingScenes,
    events: bearingEvents,
    called: ['年表'],
    to: [],
    age: [18, 45],
    purpose: ['想要一个孩子和有一个孩子，在这个时代里是两件事'],
    marks: ['undertake', 'meet', 'flag', 'roll'],
  },

  /**
   * 一件小事上，你说了不是实话。
   *
   * **这一章是「习惯形成」那一梯队（5/7/8.md）的第一个使用者。**
   * 那份共同方案自己写着这一梯队不宜单独施工，理由是：
   *
   * > 习惯形成需要**有反复做的事**——现在长尾日常有了，
   * > 但可反复的道德性行为（骗、偷、救、背）还没写
   *
   * 查证（2026-09-08）：`grep 撒谎|骗|偷|赌|救人|背叛 src/content/life/` **零命中**，
   * 那句话仍然成立。所以这一章先做那个前置——一件真会反复发生的小事，
   * 落一笔可以被累加的痕迹。痕迹落在行为史（`deed` 效果，`character.deeds`），
   * 习惯形成落在同一件事的正文变了：前三回睡得比平常晚、绕开了那个人，第四回起睡得跟平常一样。
   *
   * 它带 `chance: 0.25`：宽窗口、低门槛的事没有它会成为唯一候选、回回都来
   * （头一版一世演一百多回，把十二岁之后的日常挤光了；`scripts/deeds.ts` 守着上限）。
   *
   * 挑「说了不是实话」不是因为它戏剧性强，恰恰因为它**平常**：
   * 不需要任何前提、任何出身任何年纪都可能发生，
   * 而且**小到玩家第一次做的时候不会觉得自己在做一个道德选择**——
   * 那正是 8.md 要的那句话的条件（「我究竟是什么时候变成这样的？」）。
   *
   * 三条不做：不做善恶值、不做即时惩罚、不写「你感到愧疚」。
   * 尤其第二条——**多数谎话没有后果，而那正是它会变成习惯的原因**。
   *
   * 不落 `identity`，所以没有 `identityKind`。
   */
  {
    id: 'candour',
    scenes: candourScenes,
    events: candourEvents,
    called: ['年表'],
    to: [],
    age: [12, 70],
    purpose: ['一件小到当时不觉得是选择的事，做过很多次之后就成了他是谁'],
    marks: ['deed', 'roll'],
  },

  /**
   * 服丧。只做一件事：**让守孝有个尽头。**
   *
   * 守孝那件事没有 deadline（`Undertaking` 上不许有流转规则），
   * 三年到了自己不会停。所以得有一卷真的走到，由它落 `undertake done`。
   * 少了它，守孝就是无期的，媒人此后再不上门——**而那不是礼法，是漏写。**
   *
   * 单独一章而不是塞进 `illness`：那一章讲的是八到十六岁那场病，
   * 而守孝服的可能是爹、是娘、是哥，一辈子里哪一年都可能撞上。
   * **章界不是分类抽屉，是「这一段人生里会发生什么」。**
   */
  {
    id: 'mourning',
    scenes: mourningScenes,
    events: mourningEvents,
    called: ['年表'],
    to: [],
    age: [11, 70],
    purpose: ['守孝有始也有终，而终了的那一天媒人才又上门'],
    marks: ['undertake'],
  },

  /**
   * 出师。跟服丧同一个道理：**让学徒有个尽头。**
   *
   * 在这一章之前，`youth.ts` 落的那一笔 `identity: '学徒'` **全库没有一处改掉它**
   * ——一个人十六七岁拜师，到六十岁咽气那天，面板上还写着学徒。
   * 守孝那件事的坑早就填过了，学徒这件是同一个坑，只是没人回来填。
   *
   * 跟服丧最大的不同：**守孝的对象必然已经死了，而师傅可能还活着。**
   * 所以这一卷有两支——师傅在，他把家什给你，说一句「往后是自己的活计了」；
   * 师傅没了，没有人给你出师，你只是有一天发现活都是自己在做了。
   * **没有仪式的结束也是结束**，分不出这两种，那个死掉的师傅就白死了。
   */
  {
    id: 'apprentice',
    scenes: apprenticeScenes,
    events: apprenticeEvents,
    called: ['年表'],
    to: [],
    age: [19, 34],
    purpose: ['学徒有始也有终，而出师那天手艺才成了他自己的营生'],
    marks: ['undertake', 'identity'],
    // 出了师就是匠人，不会因为别的事情不再是——跟「学徒」正相反，那是正在做的一件事
    identityKind: '终点',
  },

  /**
   * 试着照书上说的做。修仙第一条纵切的最后一段。
   *
   * 前面几步库里都有：听说（`kin`）、找（`seeking`）、照面（`meeting`）、
   * 拿到那册书（`riverman`）。**唯独最后一步是空的**——他揣着一册炼气法门，
   * 知道那是修行的入门之法，然后这辈子再没打开过它。
   *
   * 到此收住：不碰宗门、境界、丹药、法宝、秘境（用户拍板）。
   * 这一章只回答一个问题：**这个人试了，然后呢。**
   */
  {
    id: 'attempt',
    scenes: attemptScenes,
    events: attemptEvents,
    called: ['年表'],
    to: [],
    age: [16, 60],
    purpose: ['修行不是拿到功法就会了——他试了一年，多半什么也没有'],
    marks: ['undertake', 'roll'],
  },

  /**
   * 那一点热，后来怎么样了。
   *
   * `attempt` 里三成的人「觉出了一点什么」，落下 `felt-something` 那面旗
   * 和「那一点热」那条认知——**然后全库没有一处读它们**
   * （查证：`grep felt-something` 除 `attempt.ts` 外零命中）。
   *
   * 这一册补的就是那个空洞。它不写「继续修炼」，写的是
   * **一个人揣着一件说不清的事过了很多年**——27.md 拍板的
   * 「修仙以后，你还是那个人」在这儿落地：他照旧种地、娶亲、送走爹娘，
   * 变的只有一样，夜里睡不着的时候他会想起那个清早。
   *
   * `marks` 里有 `flag`：三条路各落一面旗（再来过 / 再没有 / 没再试），
   * **而「没再试」那一路一样要留痕**——它跟另外两条是同一层的结局。
   */
  {
    id: 'afterwards',
    scenes: afterwardsScenes,
    events: afterwardsEvents,
    called: ['年表'],
    to: [],
    age: [22, 90],
    purpose: ['他这辈子唯一一次碰到修行的边，此后再没有答案，而他已经不需要答案了'],
    marks: ['undertake', 'roll', 'flag'],
  },

  /** 手艺。铁匠、木匠、药铺 */
  {
    id: 'trades',
    scenes: tradeScenes,
    events: tradeEvents,
    called: ['年表'],
    to: [],
    age: [8, 16],
    purpose: ['见识是从别人的行当里蹭来的，不是学来的'],
    marks: ['knowledge'],
  },

  /** 官府。徭役、赋税、过路的兵 */
  {
    id: 'royal',
    scenes: royalScenes,
    events: royalEvents,
    called: ['年表'],
    to: [],
    age: [9, 15],
    purpose: ['同样一个世界，从宫墙里头看是另一个'],
    marks: ['family', 'home', 'identity'],
    /*
     * 削爵那一片落两个身份，都是终点：
     *
     *     庶人　　　旨意夺了爵。**削了就是削了，没有「削完」的那一天**
     *     寓公之子　搬出京城之后的身份。同上
     *
     * 这两个跟 `birth` 那章的「世子」「皇子」是一对：出身给的是终点，
     * 削爵夺走它、换上另一个终点。**两头都不是「正在做的事」**——
     * 那一族的形状是「做完了就不是了」，而这儿是「被夺走了就不是了」。
     * 一个从内部到期，一个从外部改写，别混。
     */
    identityKind: '终点',
  },

  /** 承户与分家。当家的人没了，兄弟分产，分出去的那个自立门户 */
  {
    id: 'house',
    scenes: houseScenes,
    events: houseEvents,
    called: ['年表'],
    to: [],
    age: [16, 70],
    purpose: [
      '户主不能是死人——人殁了那一刻户里就得有人接，这一卷只是把它讲出来',
      '分家分的是户：妻儿跟你，娘和哥留在老屋；铺子分不开，归一人余人折银',
      '差不是家里的东西——役是制度与当前人生的关系，不是家世',
    ],
    marks: ['divide', 'household', 'chronicle'],
  },

  /** 老屋：分家以后的两家。哥娶妻添丁、娘老了没了、荒年借粮、年节走动 */
  {
    id: 'kindred',
    scenes: kindredScenes,
    events: kindredEvents,
    called: ['年表'],
    to: [],
    age: [19, 80],
    purpose: [
      '家拆成两户之后，关系不会自己烂掉——见面不加分，不见面也不减分，变的只来自具体的事',
      '哥跟你好，嫂子未必跟你好：两条边各是各的，她处不处得来从她的性情里出',
      '老屋里的人是真人：嫂子进门、侄儿出生都进人口册，住在老屋，岁数从生年现算',
    ],
    marks: ['meet', 'chronicle'],
  },

  /** 侄儿：老屋的第二代想走自己的路。想不想走、走不走成都是倾向；父子那条边是他们的 */
  {
    id: 'nephew',
    scenes: nephewScenes,
    events: nephewEvents,
    called: ['年表'],
    to: [],
    age: [30, 80],
    purpose: [
      '家庭经营、个人选择、代际关系、个人生计四件事同时存在而不互相覆盖：他走了老屋还是务农的户，他自己是学徒',
      '想走从性情里出也从年景里出，走不走成是爹、他、你、那一年一起定的——「更可能」不是「只允许」',
      '走没走成、后来和没和好，你都不在场；正月里看见结果，缘由是娘告诉你的',
    ],
    marks: ['tie', 'person', 'flag'],
  },

  /** 在外的那些年：哥在镇上谋生十年二十年，家里的事照旧发生——银子、丧事、伤、老、儿子回不回来 */
  {
    id: 'away',
    scenes: awayScenes,
    events: awayEvents,
    called: ['年表'],
    to: [],
    age: [33, 80],
    purpose: [
      '一个人在外谋生十年二十年，家庭、婚姻、子女、关系、财产、原户各自怎么变——每一件都从已有的事实里出，不建新东西',
      '财产从营生里出：木匠有的是银钱没有粮，荒年是他捎银子回来（第二笔债，方向反着，进同一个格）',
      '回来了还是老屋的人：伤了手、老了做不动了，自己的营生清掉落回老屋的；儿子回不回来看父子那条边',
    ],
    marks: ['owe', 'repay', 'person', 'flag', 'chronicle'],
  },

  /**
   * 去投奔：走投无路的时候想起一个人，走两天路去找他。
   *
   * 这一章要证的是 14.md 那一句——**「NPC 好感度 100 所以必定帮助你」是假的**。
   * 三条分岔一次也没读过好感：读的是他还在不在、他多大年纪了。
   * 同一个师傅、同一份情分，你可能扑空、可能撞上他自己的难处、
   * 也可能一句话不问就被留下。
   *
   * 三档背后是同一件事在走：**时间**。他比你大二十岁，
   * 你二十几岁去他还硬朗，四十几岁去他做不动了，五十几岁去多半太晚。
   */
  {
    id: 'refuge',
    scenes: refugeScenes,
    events: refugeEvents,
    called: ['年表'],
    to: [],
    age: [30, 62],
    purpose: [
      '同一个人对你的答复由他的处境决定，不由好感决定——三条分岔读的是他的生死和年纪，不读好感',
      '扑空不是失败分支：他比你大二十岁，你想起他的时候可能已经太晚',
      '留下你不等于好结局：出了师的人回来打下手，日子真的换了（living: hired），可那是降格',
    ],
    marks: ['living', 'household', 'chronicle'],
  },

  /**
   * 认生：隔了两辈的那个孩子，不知道该怎么叫你。
   *
   * 32.md 通篇写的是「你活了六百年回故乡」，而实测终年 p50=62、
   * **活过九十的零个**——那个人在这个世界里不存在。
   *
   * 可它的核心断言不需要六百年：**血缘存在 ≠ 社会关系存在 ≠ 情感关系存在。**
   * 侄孙就够了——一个五十八岁的人和一个十岁的、姓同一个姓的孩子，
   * 血缘是实的，共同经历是零。
   *
   * 这一卷的全部力气花在**不写「亲切」两个字**上（32.md：那是假感情）。
   * 写的是三件具体的事：他躲到他娘身后、他不知道该叫什么、
   * 而你也想不起该说什么。
   */
  {
    id: 'descend',
    scenes: descendScenes,
    events: descendEvents,
    called: ['年表'],
    to: [],
    age: [48, 70],
    purpose: [
      '血缘存在不等于熟识存在：关系边上有名分，两个人之间没有——他叫不出口',
      '不写亲切也不写疏远，写具体的事：他低头扒饭，你问了一句就没再问',
      '哥挑给他一块肉，那孩子才抬头——祖孙跟叔侄不是一回事，那一句就是分别',
    ],
    marks: ['chronicle'],
  },

  /**
   * 夜里那趟：有人来敲门，问你听没听见后山的动静。
   *
   * 19.md 给的是一整条政治道路（不满 → 结社 → 聚众 → 起事 → 镇压），
   * 整条做出来是另一个游戏。这一章取的是同一节里的另一句——
   * **「你本人没有参加起事，但因为知情不报，被牵连。」**
   *
   * 所以它不写造反，写**造反从你门口经过**。一个普通人要做的
   * 不是「加不加入」，是「说不说」。
   *
   * 四种结局一个好的也没有，而它们不是选择的报应，是选择跟世界的交叉：
   * 散还是闹在他开口之前就掷定了。**六成二的人生里什么也没发生**——
   * 那一格最要紧，没有它「不说」就成了一场赌。
   */
  {
    id: 'unrest',
    scenes: unrestScenes,
    events: unrestEvents,
    called: ['年表'],
    to: [],
    age: [18, 42],
    purpose: [
      '造反不是一种职业，是从你门口经过的一件事——你要做的不是加不加入，是说不说',
      '散还是闹在他开口之前就掷定：他报不报官改变不了几十个饿肚子的人会不会跟着走',
      '六成二什么也没发生：担了三个月的心，没换来任何东西，那三个月本来就是白担的',
    ],
    marks: ['roll', 'flag', 'household', 'chronicle'],
  },

  /**
   * 之国：受了封，离开京城，到一座新盖的府里去。
   *
   * 这一章补的是**「什么也不发生」那五成八**——开蒙那一节掷 `court-fate`
   * 安 58 / 倾 42，掷「倾」的有下文（废、削爵、迁出），
   * 而掷「安」的此后一辈子什么也不会发生，到死还挂着「皇子」。
   *
   * 9.md 那句「不是简单：皇宫 → 换地图 → 王府」，落到具体处就是**府是空的**：
   * 墙是新的，一府上下叫他王爷叫得很齐整，而这里头没有一个人认得他小时候。
   * **整齐本身就是距离。**
   *
   * 跟 `royal:demote` 是同一件事的两头：那边爵没了、府邸收回、府里的人散了；
   * 这边爵封了、府邸新盖、人从各处拨来。**方向不改变那件事本身有多难受。**
   */
  {
    id: 'invest',
    scenes: investScenes,
    events: investEvents,
    called: ['年表'],
    to: [],
    age: [16, 24],
    purpose: [
      '掷「安」的那五成八第一次有下文：受封、之国、开府，而不是到死还挂着「皇子」',
      '受封不是换地图：府是新盖的，人是新拨的，一府上下叫得很齐整而没有一个人认得他小时候',
      '带谁走是真的有得选，而讨来了不等于就在身边——她坐在后头的车上，两个月说不上几句话',
    ],
    marks: ['identity', 'living', 'home', 'meet', 'chronicle'],
    // 「亲王」是终点：受了封不会因为任何事情不再是亲王——**夺走它的是另一道旨意**
    // （`royal:demote` 那一卷），那跟「这件事做完了」是两回事
    identityKind: '终点',
  },

  /**
   * 回村那一天：中了秀才之后，别人怎么叫你。
   *
   * 这一章是 16.md 那一句加粗的话的落点——**不是「能不能出现这句话」，
   * 是「这个人凭什么能对你说这句话」**。
   *
   * `exam` 那一节里「村里人见你改了称呼」躺了很久，而在这一章之前
   * **没有任何一个人真的改口**。现在同一句正文，邻家的妇人读出
   * 「相公，你可算回来了」，家里的大人读出「你可算回来了」——
   * 后者一个称呼也没有，而那正是「熟」的样子。
   *
   * 这一章什么也不给：没有属性、没有旗标、没有家底。
   * **一个人的身份变了，最先变的从来不是他自己。**
   */
  {
    id: 'regard',
    scenes: regardScenes,
    events: regardEvents,
    called: ['年表'],
    to: [],
    age: [16, 70],
    purpose: [
      '同一时刻可以存在多个称呼：跟你没交情的按身份叫，认了你一辈子的开口不称呼',
      '一句话该不该说出口，看的是说话的人凭什么——邻家的妇人问不出那句家常，家里的大人张口就问',
      '这一章不给任何东西：身份该给的 exam 已经给过，这里只让它在别人身上发生一次',
    ],
    marks: ['chronicle'],
  },

  /**
   * 撞见的人和物：伤者、旧书、行商。
   *
   * 这三卷有两个入口——年表自己抽得中，`day` 那一卷也能撞进来。
   * 两条路进的是同一卷，读到的是同一段。
   */
  {
    id: 'encounters',
    scenes: encounterScenes,
    events: encounterEvents,
    called: ['年表'],
    to: [],
    age: [9, 16],
    purpose: ['机缘不抽奖：撞见什么看世界，抓不抓得住看这个人', '给他一件他现在还看不懂的东西'],
    marks: ['encounter', 'book', 'hearsay'],
  },

  /** 十三到十六岁。开始有人拿你当个人看 */
  {
    id: 'youth',
    scenes: youthScenes,
    events: youthEvents,
    called: ['年表'],
    to: [],
    age: [13, 16],
    purpose: ['开始有人拿他当个人看，也开始有人评说他'],
    marks: ['aspect', 'identity'],
    /*
     * 「学徒」「伙计」都是正在做的一件事——**不在铺子里了就不是伙计**。
     * 「农家子」混在同一章里，它更像终点，可这一格是按章标的，
     * 而这一章的主色是前两个：它们各自需要一卷内容接手。
     * 学徒那条已经有了（`apprentice` 出师），**伙计那条还没有**。
     */
    identityKind: '正在做的事',
  },

  /**
   * 日常。年表挑不出事的时候人就回到这里，靠 `lifeRoutine` 按阶段映射。
   *
   * 唯一一章没有年表事件的——`age` 那一格因此空转，写全程。
   * 六卷对着六个人生阶段，每一卷都必须真的有人走到，
   * 看住这件事的是 `verify.ts` 第六道。它从前守的是反过来的事：
   * 「成年那一卷走不到」曾经是被承认的现状。
   */
  {
    id: 'routine',
    scenes: routineScenes,
    events: [],
    called: ['日常'],
    to: [],
    age: [0, 99],
    purpose: [
      '一生中绝大多数年头本来就什么也没发生',
      '时间是这局里唯一稀缺的东西，而日常是它唯一的出口',
    ],
    marks: ['time', 'reflect'],
  },

  /**
   * 平平常常的一日。
   *
   * 全库唯一一章会把人送进别处：走到村口那一段，撞见谁是随机的，
   * 撞见了就直接接进 `encounters` 的那一卷，中间不回年表。
   */
  {
    id: 'day',
    scenes: dayScenes,
    events: dayEvents,
    called: ['年表'],
    to: ['encounters'],
    age: [7, 16],
    purpose: [
      '玩家第一次不是被事件叫出来才行动，而是自己安排一天',
      '一天最常见的结果是什么也没发生——正因如此，出事的那天才要紧',
    ],
    marks: ['daily', 'diary'],
  },

  /** 有人离开了村子 */
  {
    id: 'leaving',
    scenes: leavingScenes,
    events: leavingEvents,
    called: ['年表'],
    to: [],
    age: [10, 16],
    purpose: [
      '走还是不走，是这一册里最像分岔的一次选择',
      '念头改的是他怎么读这个机会，不是机会出不出现',
    ],
    marks: ['reading', 'meet'],
  },

  /**
   * 走了三年，又回来。
   *
   * 这一章挂在 `leaving` 后头不是因为题材像，是因为它接的是同一件事的下半截：
   * 那一章问「走不走」，这一章问**走了之后，那些人还算不算你的人**。
   *
   * 后两卷是同一件事的两种样子（养大你的人还在 / 不在了），
   * 靠 `bond.alive` 分岔，不在卷里写 if。
   */
  {
    id: 'reunion',
    scenes: reunionScenes,
    events: reunionEvents,
    called: ['年表'],
    to: [],
    age: [12, 17],
    purpose: [
      '离开不结束任何关系——三年不见，那条边一格没动',
      '重逢跟见陌生人不是一回事，而分别来自「他认了你十几年」，不来自好感度',
      '同样走三年同样回来，人还在和人不在了是两段文字，那句「瘦了」才有出处',
    ],
    marks: ['home', 'living', 'meet'],
  },

  /** 病 */
  {
    id: 'illness',
    scenes: illnessScenes,
    events: illnessEvents,
    called: ['年表'],
    to: [],
    age: [8, 16],
    purpose: ['家里病倒一个人的那阵子，他会重新想一遍自己到底想要什么'],
    marks: ['reflect'],
  },

  /** 起了心思之后，自己去找。找着人以后交给 `meeting`，那扇门在会面之后 */
  {
    id: 'seeking',
    scenes: seekingScenes,
    events: seekingEvents,
    called: ['年表'],
    to: ['meeting'],
    age: [11, GROWN_UP],
    purpose: [
      '起了心思之后自己去找——一趟一趟地跑，多半一趟一趟地空',
      '听来的消息真假难辨，跑一趟才知道',
      '找不到是正常结果。找了这些年一件也对不上，念头就退下去了',
      '门开不开，他永远不知道是凭什么',
    ],
    marks: ['errand', 'follow', 'knock', 'identity'],
    /*
     * 「门下」标**正在做的事**，而这一格我拿不准——记下为什么这么标。
     *
     * 它的语义跟「学徒」几乎一样：在某人门下，跟着他学。而「学徒」有出师，
     * 「门下」有没有对应的那一天，这一册还没写到。
     *
     * 拿不准的时候标这一边，是因为**标错的代价不对称**：
     *
     *     标「正在做的事」而其实是终点　→ 判据红，有人回头改
     *     标「终点」而其实是正在做的事　→ **判据永远不响**
     *
     * 后一种正是「学童」那 450 世的成因——没有任何东西会因此变红。
     * **宁可被自己的尺子拦一下。**
     *
     * ⚠️ 顺带记一笔实测：**1200 世里「门下」一次也没出现**。
     * 查过了，不是断路——`was-taken-in` 那面旗有落点也有读点，
     * 路径通着，条件是灵根够高（`engine/seeking.ts`）。**那是修仙线的门槛，
     * 零次是设计不是 bug。** 所以 `scripts/identity.ts` 对它报「这一轮没量到」
     * 而不是打勾：**样本不足和没问题是两回事**，混着报会把前者读成后者。
     */
    identityKind: '正在做的事',
  },

  /**
   * 照面。找着人了，可他不知道自己找着的是什么。
   *
   * `meet:first` 没有年表入口——它接在 `seeking` 找着人之后。
   * `meet:temple` 有入口，是玩家自己顺着一句闲话走了半个月。
   *
   * `to` 里那条 `seeking` 是回头边：跟上去问，就走到 `seek:door`。
   */
  {
    id: 'meeting',
    scenes: meetingScenes,
    events: meetingEvents,
    called: ['年表'],
    to: ['seeking'],
    age: [14, GROWN_UP],
    purpose: [
      '两个人互相打量了一回——他怎么看你，你怎么看他，两边都会看错',
      '修士不是鉴定机：炼气那个看不见资质，他说的「悟性寻常」是真话也是另一回事',
      '同一次会面里一句说对一句说岔，而玩家没有办法分出哪句是哪句',
      '走到这一步不发任何东西——他只是第一次站在一个自己完全不了解的世界跟前',
    ],
    marks: ['meeting'],
  },

  /**
   * 师承。他为什么愿意教你。
   *
   * 接在 `meeting` 后头，可**入口不要求见过任何修士**——
   * 这一册要说的话就是那个真会教他的人根本不像他要找的那种人，
   * 他是自己撞进药庐里去的。所以 `meeting` 的 `to` 里没有这一章。
   *
   * 四个事件各钉一格 `footing`，关系断了条件自然落空，
   * 于是「不去了」不需要任何额外的开关。
   */
  {
    id: 'tutelage',
    scenes: tutelageScenes,
    events: tutelageEvents,
    called: ['年表'],
    to: [],
    // 入口到成年段末，续上的那几件到壮年末——目录记的是这一章最远开到哪
    age: [12, PRIME_UP],
    purpose: [
      '「能不能修仙」和「有没有人愿意教你」是两件事——四种人生同时成立，而玩家分不出自己是哪一种',
      '他挑人那把尺子量的是肯不肯守着，跟修行没有关系；他量得很准，是他把数连错了结论',
      '师承是一格一格长出来的：不理会→搭话→使唤→带一段→教一点，一次最多挪一格',
      '走到最后拿到的是五句话——而脑子里懂到哪一层、身上走到哪一步是两条各走各的轴，他不知道自己在哪一条上',
    ],
    marks: ['tutelage', 'teaching', 'practice'],
  },

  /**
   * 山上下来的人。修仙界作为第二层社会的第一片。
   *
   * 30.md：修仙世界同样先有世界、组织、人物、资源、规则和因果，玩家再进入其中。
   * 这一章不写「山上」是什么——它写一个凡人能看见的那一面：药庐那位是山上的人，
   * 替上头看着这间药庐；山上隔几年打发一个人下来取药。玩家翻了几年的那几筐药是往山上送的。
   *
   * 挂在师承那条链上（`chain: 'tutelage'`）：下山的人来的时候你得在药庐里。
   * 到「上头问起你了」为止；收不收、叫不叫你上去，是 29.md 那一片的事。
   */
  {
    id: 'mountain',
    scenes: mountainScenes,
    events: mountainEvents,
    called: ['年表'],
    to: [],
    age: [13, PRIME_UP],
    purpose: [
      '修仙界在凡间的第一个接触点是镇西那间没有招牌的药庐——你翻了几年的药是往山上送的，而你不知道',
      '山上有人是世界事实，写在药庐那位身上；你问了、而他肯答，才成为你知道的事',
      '下山的人不挑人、不收人——他量到你不错也只能回去说一声；这一章到「上头问起你了」为止',
    ],
    marks: ['meeting', 'recall', 'knowledge', 'chronicle', 'flag'],
  },

  /**
   * 渡口。**这一章不再是终点。**
   *
   * 从前它有两种身份：年表事件（十六岁起，权重 1000）和 `lifeFinale`。
   * 那个 1000 加上封到 99 岁的窗口，效果是它永远待在候选池里——
   * 于是十六岁之后年表一次也抽不空，人永远进不了成年那一卷的日常，
   * 而演到它就一定 `finish()`。**「十六岁没修上仙就结束」这条规则
   * 就长在这三个数字里。**
   *
   * 现在三个数字都改了：
   *
   *     权重 1000 → 120　　　　它得跟别的事一起去争
   *     窗口 16–99 → 16–28　　 撞见修士是往外闯的年纪才有的事
   *     加了 requires　　　　　命数不够的人这辈子碰不上
   *
   * 那条 `fortune` 门槛是这次改动的重心：**修仙不再是人人必经的检测，
   * 而是一件得靠自己走出来的事**。往城里跑、往山里跑、出远门都涨命数，
   * 一辈子没出过村的人过不了那道坎——他的一生就完全不经过修行这条路，
   * 而那是一种完整的人生，不是一种失败。
   */
  {
    id: 'riverman',
    scenes: rivermanScenes,
    events: rivermanEvents,
    called: ['年表'],
    to: [],
    age: [16, 28],
    purpose: [
      '把这些年攒下的东西，第一次拿到明白人面前过一眼',
      '多年以后才明白，当年捡到的不是普通书',
    ],
    marks: ['reveal', 'claim'],
  },

  /**
   * 落幕。全作唯一的终点。
   *
   * 不进年表（`events` 是空的，理由写在 `ending.ts`）：进得了年表
   * 就意味着它可能被抽中，而没有任何一件事该让人在天年之前死掉。
   * 走到这里只有一条路——`engine/lifespan.ts` 掷定的那个数到了。
   *
   * 年龄段写 [0, 99] 而不是 [40, 99]：天年可以被 `lifespan` 效果削减，
   * 哪天写出一场要命的大病，那个人可能二十岁就走到这一卷。
   */
  {
    id: 'ending',
    scenes: endingScenes,
    events: endingEvents,
    called: ['收尾'],
    to: [],
    age: [0, 99],
    purpose: [
      '人生的终点是这个人不在了，不是他没通过某一道检测',
      '这一卷一个字也不判成败——它只说这个人是谁',
    ],
    marks: ['chronicle'],
  },
]
