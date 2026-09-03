import type { Chapter } from '@/types/chapter'

import { birthEvents, birthScenes } from './birth'
import { childhoodEvents, childhoodScenes } from './childhood'
import { dayEvents, dayScenes } from './day'
import { dearthEvents, dearthScenes } from './dearth'
import { encounterEvents, encounterScenes } from './encounters'
import { hardshipEvents, hardshipScenes } from './hardship'
import { illnessEvents, illnessScenes } from './illness'
import { inquiryEvents, inquiryScenes } from './inquiry'
import { kinEvents, kinScenes } from './kin'
import { leavingEvents, leavingScenes } from './leaving'
import { rivermanEvents, rivermanScenes } from './riverman'
import { routineScenes } from './routine'
import { royalEvents, royalScenes } from './royal'
import { schoolingEvents, schoolingScenes } from './schooling'
import { seekingEvents, seekingScenes } from './seeking'
import { tradeEvents, tradeScenes } from './trades'
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
 * 六十一卷，跨章的边只有一条：`day` → `encounters`。
 * 其余十六章彼此不连，各自靠年表被叫出来，演完就回年表。
 *
 * 这个形状是有意的：**每一章是一段可以独立读的人生片段**，
 * 而不是一棵必须从头走到尾的剧情树。链条是靠 flag 攒出来的
 * （欠债 → 父亲出门 → 死在外地），不是靠场景硬接。
 * 硬接的那一条（村里那日撞见的三桩事）反倒是个例外——
 * 它写在 `day` 的 `to` 里，看得见。
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

  /** 欠债、出门做工、死在外地。这一册里最长的一根链条 */
  {
    id: 'hardship',
    scenes: hardshipScenes,
    events: hardshipEvents,
    called: ['年表'],
    to: [],
    age: [7, 15],
    purpose: [
      '一个人的死怎么改掉之后十年',
      '把「家里少个劳力」变成后面事件读得到的事实，而不是一句旁白',
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
   * 四卷里有一卷（`routine:adult`）现在走不到，原委见 `routine.ts`，
   * 看住它的是 `verify.ts` 第六道。
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

  /** 起了心思之后，自己去找。`seek:door` 靠章内跳转进入，没有年表入口 */
  {
    id: 'seeking',
    scenes: seekingScenes,
    events: seekingEvents,
    called: ['年表'],
    to: [],
    age: [12, 16],
    purpose: [
      '起了心思之后自己去找——听来的消息真假难辨，跑一趟才知道',
      '门开不开，他永远不知道是凭什么',
    ],
    marks: ['follow', 'knock'],
  },

  /**
   * 渡口。凡人这一段在这里收尾。
   *
   * 两种身份：年表事件（十六岁起，权重 1000）和 `lifeFinale`。
   * 窗口写到 99 岁不是因为九十九岁还能收尾，是因为**它必须永远在候选池里**——
   * 池子一空，人就掉进日常那一章的成年卷，而那一卷还没写。
   */
  {
    id: 'riverman',
    scenes: rivermanScenes,
    events: rivermanEvents,
    called: ['年表', '收尾'],
    to: [],
    age: [16, 99],
    purpose: [
      '把十六年攒下的东西，第一次拿到明白人面前过一眼',
      '多年以后才明白，当年捡到的不是普通书',
    ],
    marks: ['reveal', 'claim'],
  },
]
