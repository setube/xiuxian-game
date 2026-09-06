import type { Chapter } from '@/types/chapter'

import { birthEvents, birthScenes } from './birth'
import { childhoodEvents, childhoodScenes } from './childhood'
import { dayEvents, dayScenes } from './day'
import { dearthEvents, dearthScenes } from './dearth'
import { encounterEvents, encounterScenes } from './encounters'
import { endingEvents, endingScenes } from './ending'
import { hardshipEvents, hardshipScenes } from './hardship'
import { houseEvents, houseScenes } from './house'
import { illnessEvents, illnessScenes } from './illness'
import { inquiryEvents, inquiryScenes } from './inquiry'
import { kinEvents, kinScenes } from './kin'
import { leavingEvents, leavingScenes } from './leaving'
import { meetingEvents, meetingScenes } from './meeting'
import { reunionEvents, reunionScenes } from './reunion'
import { rivermanEvents, rivermanScenes } from './riverman'
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
    marks: ['knowledge', 'aspect'],
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
    marks: ['person', 'household'],
  },

  /** 荒年 */
  {
    id: 'dearth',
    scenes: dearthScenes,
    events: dearthEvents,
    called: ['年表'],
    to: [],
    age: [5, 16],
    purpose: ['同一场旱灾落在不同人家身上，是四种样子'],
    marks: ['household'],
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
    marks: ['family', 'home'],
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
    marks: ['time'],
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
    age: [11, 16],
    purpose: [
      '起了心思之后自己去找——一趟一趟地跑，多半一趟一趟地空',
      '听来的消息真假难辨，跑一趟才知道',
      '找不到是正常结果。找了这些年一件也对不上，念头就退下去了',
      '门开不开，他永远不知道是凭什么',
    ],
    marks: ['errand', 'follow', 'knock'],
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
    age: [14, 16],
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
    age: [12, 16],
    purpose: [
      '「能不能修仙」和「有没有人愿意教你」是两件事——四种人生同时成立，而玩家分不出自己是哪一种',
      '他挑人那把尺子量的是肯不肯守着，跟修行没有关系；他量得很准，是他把数连错了结论',
      '师承是一格一格长出来的：不理会→搭话→使唤→带一段→教一点，一次最多挪一格',
      '走到最后拿到的是五句话——而脑子里懂到哪一层、身上走到哪一步是两条各走各的轴，他不知道自己在哪一条上',
    ],
    marks: ['tutelage', 'teaching', 'practice'],
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
