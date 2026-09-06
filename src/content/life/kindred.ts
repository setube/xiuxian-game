import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 老屋：分家以后的两家。
 *
 * ## 这一片验的是一句早就立下的规矩
 *
 * 「长期分离不自动降低关系」（`relations-continuity`）——从前它只被搬家那一卷验过。
 * 分家把一个家真正拆成两户之后，这句话第一次有了几十年的时间去验：
 * 哥住老屋，你住隔壁或进了城；两家仍是兄弟；他娶妻、添丁、娘老了、没了；
 * 你们多久见一次，谁还来往，谁遇到事互相帮，谁因为一次借粮翻了脸。
 *
 * 用户 2026-09-06 定的：**下一步不是继续扩家庭制度，是让这个家庭继续活下去。**
 *
 * ## 老屋里的人是真人，而且各是各的
 *
 * 嫂子进门（`brother-wife`）、侄儿出生（`nephew`）都进人口册，住在老屋（`who.house`），
 * 会老会死。**哥跟你好，嫂子未必跟你好**——那是两条边，从你出发各是各的；
 * 嫂子跟你处不处得来从她的性情里出（`temper` 条件，`Person.temper` 的第一个读者），
 * 不从骰子里出：NPC 没有好人／坏人标签，有的是性情、处境、关系。
 *
 * ## 嫂子跟你娘：全库第一条 NPC↔NPC 的边
 *
 * 用户点名要先追的一条。从前所有的边都从「我」出发，世界是围着主角转的。
 * 嫂子进门那天，她跟你娘之间牵了一条边（`tie`），处法（`terms`）从两个人的性情里出：
 * 两个都是刚硬、暴躁的，不睦；有一个温和的，亲厚；不然平常。它由具体的事改——
 * 为一副娘陪嫁的镯子翻了脸——而且**跟你没关系**：那条边上的事一格也不动你跟谁的好感。
 * 你只是看见：正月里那顿饭有没有人说话，娘最后那两年是谁在跟前。
 *
 * ## 第一笔债
 *
 * 荒年你匀了一半粮给哥，那是一笔债：谁欠谁、欠什么、哪一年、约定了什么（`owe`）。
 * 还没还，是老屋那边收成不好；还了，是秋后他把粮送了回来（`repay`）。还着的那些年，
 * 正月里谁也不提。**它是两个人之间的一件历史事实，不是一个数**——`household.debt`
 * 那个数不知道欠谁，这里的债知道。
 *
 * ## 老屋的营生
 *
 * 老屋是哥的户，`House.livelihood` 分家时抄了一份，到这儿才有第一个读者：
 * 种地的，还的是粮，收成不好就还不上；开铺子的，折的是银子，粮价回落了才还得起。
 *
 * ## 关系变化只来自具体的事
 *
 * 这一册里改动你的好感的只有三件事：嫂子头一回见你、荒年借粮你借不借、娘没了你回去守孝。
 * 年节走动本身一格也不改——见面不加分，不见面也不减分。
 */

/** 分了家、哥还在，这一册才有得说 */
const TWO_HOUSES = [{ house: { divided: true } }, { bond: { kind: '兄', alive: true } }] as const
/** 分了家就行——哥没了老屋还在，侄儿当家，走动照旧 */
const OLD_HOUSE = [{ house: { divided: true } }] as const

/** 嫂子处不处得来：从她的性情里出。刚硬、暴躁的跟你不对付，别的处得来 */
const COLD_SISTER_IN_LAW = { temper: { id: 'brother-wife', in: ['暴躁', '刚硬'] } } as const
/** 婆媳两个都是硬脾气 */
const HARD_MOTHER = { temper: { id: 'mother', in: ['暴躁', '刚硬'] } } as const
const SOFT_WIFE = { temper: { id: 'brother-wife', in: ['温和'] } } as const
const SOFT_MOTHER = { temper: { id: 'mother', in: ['温和'] } } as const

const INLAWS_SOUR = { tie: { from: 'brother-wife', to: 'mother', terms: ['不睦'] } } as const
const INLAWS_FOND = { tie: { from: 'brother-wife', to: 'mother', terms: ['亲厚'] } } as const

const OWES_ME = { owed: { debtor: 'brother', creditor: 'me', settled: false } } as const
const OLD_HOME_FARMS = { house: { id: 'old-home', livelihood: '务农' } } as const
/**
 * 哥自己还在种地。问的是人不是户：没有自己的营生就是老屋的营生；他去镇上做了木匠，
 * 老屋仍是务农的户，这一条却不成立了。死了的人也不成立——死了的人不种地
 */
const BROTHER_FARMS = { family: { id: 'brother', alive: true, livelihood: ['务农'] } } as const
/** 哥在镇上做木匠 */
const BROTHER_CARPENTER = { family: { id: 'brother', alive: true, livelihood: ['木工'] } } as const

export const kindredScenes: SceneLibrary = {
  /**
   * 哥娶亲。你回老屋吃了喜酒。嫂子从这一天起是老屋的人，不是你这一户的。
   * 她跟你怎样，看她的性情；她跟你娘怎样，看两个人的性情——两条边，各是各的。
   */
  'kindred:wedding': {
    id: 'kindred:wedding',
    title: '老屋办喜事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          {
            type: 'meet',
            id: 'brother-wife',
            calls: '嫂子',
            delta: 0,
            who: {
              surname: '吴',
              given: '氏',
              gender: '女',
              age: 19,
              doing: '操持家务',
              house: 'old-home',
            },
            bond: '亲戚',
          },
          { type: 'chronicle', text: '哥娶了亲。' },
        ],
        blocks: [
          { kind: 'narration', text: '哥托人捎话来，说定了日子。' },
          { kind: 'narration', text: '那天你回老屋吃了喜酒。院子还是那个院子，只是添了一个人。' },
        ],
        branches: [{ requires: [COLD_SISTER_IN_LAW], next: 'cold' }],
        next: 'warm',
      },
      cold: {
        id: 'cold',
        onEnter: [{ type: 'meet', id: 'brother-wife', delta: -4, note: '头一回见你就没什么话。' }],
        blocks: [
          {
            kind: 'narration',
            text: '{call:brother-wife}跟你没说几句话。收拾碗筷的时候，她把你那只碗放在最后。',
          },
          { kind: 'narration', text: '哥没看见。你也没提。', tone: 'faint' },
        ],
        next: 'inlaws',
      },
      warm: {
        id: 'warm',
        onEnter: [{ type: 'meet', id: 'brother-wife', delta: 6, note: '头一回见你就留你吃饭。' }],
        blocks: [
          {
            kind: 'narration',
            text: '{call:brother-wife}话不多，可是留你吃了晚饭，临走又给你装了一包点心。',
          },
        ],
        next: 'inlaws',
      },
      /** 婆媳。娘不在了就没有这条边 */
      inlaws: {
        id: 'inlaws',
        blocks: [],
        branches: [
          { requires: [{ bond: { kind: '生母', alive: false } }], next: 'done' },
          { requires: [COLD_SISTER_IN_LAW, HARD_MOTHER], next: 'inlaws-sour' },
          { requires: [SOFT_WIFE], next: 'inlaws-fond' },
          { requires: [SOFT_MOTHER], next: 'inlaws-fond' },
        ],
        next: 'inlaws-plain',
      },
      'inlaws-sour': {
        id: 'inlaws-sour',
        onEnter: [{ type: 'tie', from: 'brother-wife', to: 'mother', bond: '亲戚', terms: '不睦' }],
        blocks: [
          { kind: 'narration', text: '娘跟她头一天就没说上话。哥站在当中，不知道该先招呼谁。' },
        ],
      },
      'inlaws-fond': {
        id: 'inlaws-fond',
        onEnter: [{ type: 'tie', from: 'brother-wife', to: 'mother', bond: '亲戚', terms: '亲厚' }],
        blocks: [{ kind: 'narration', text: '娘拉着她的手不放。她叫了一声娘，声音不大。' }],
      },
      'inlaws-plain': {
        id: 'inlaws-plain',
        onEnter: [{ type: 'tie', from: 'brother-wife', to: 'mother', bond: '亲戚', terms: '平常' }],
        blocks: [{ kind: 'narration', text: '娘跟她客客气气的。' }],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 哥家添丁。侄儿住在老屋，岁数从生年现算——十年后正文说他「已经十一岁了」，
   * 不是谁写死的。
   */
  'kindred:nephew': {
    id: 'kindred:nephew',
    title: '老屋添丁',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          {
            type: 'meet',
            id: 'nephew',
            calls: '侄儿',
            delta: 6,
            who: { given: '狗儿', gender: '男', age: 0, house: 'old-home' },
            bond: '亲戚',
          },
          { type: 'chronicle', text: '哥家添了个儿子。' },
        ],
        blocks: [
          { kind: 'narration', text: '哥家添了个儿子。满月那天你回去了一趟。' },
          { kind: 'narration', text: '孩子睡着，你没敢抱。' },
        ],
        branches: [{ requires: [{ bond: { kind: '生母', alive: true } }], next: 'granny' }],
        next: 'done',
      },
      granny: {
        id: 'granny',
        blocks: [{ kind: 'narration', text: '娘抱着孩子不撒手。她比你上回见她的时候又老了些。' }],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 年节走动。这一卷**一格好感也不改**：见面不加分，不见面也不减分。
   * 变的只有人——侄儿长了几岁（三岁躲、九岁凑过来、十六岁一般高：同一句不能从三岁念到三十岁），
   * 娘更老了，嫂子照旧那个样子；娘跟嫂子那顿饭有没有人说话；那笔粮谁也不提。
   *
   * 哥没了之后照样走动：送你到巷口的换成侄儿。老屋是一户，不是哥一个人。
   */
  'kindred:newyear': {
    id: 'kindred:newyear',
    title: '正月里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [{ kind: 'narration', text: '正月里你回了一趟老屋。' }],
        branches: [
          { requires: [{ family: { id: 'nephew', age: { atMost: 6 } } }], next: 'small' },
          { requires: [{ family: { id: 'nephew', age: { atMost: 12 } } }], next: 'boy' },
        ],
        next: 'tall',
      },
      small: {
        id: 'small',
        blocks: [
          {
            kind: 'narration',
            text: '{call:nephew}已经{age:nephew}了，见了你先躲到{call:brother-wife}身后，过一会儿才出来。',
          },
        ],
        next: 'back',
      },
      boy: {
        id: 'boy',
        blocks: [
          {
            kind: 'narration',
            text: '{call:nephew}已经{age:nephew}了，不躲了，凑过来看你腰上挂的东西，问东问西。',
          },
        ],
        next: 'back',
      },
      tall: {
        id: 'tall',
        blocks: [
          { kind: 'narration', text: '{call:nephew}已经跟哥一般高了。见了你叫一声叔，接过你手里的东西。' },
        ],
        next: 'back',
      },
      /** 哥在镇上做木匠的，正月里回来过年。人在别处，户在老屋 */
      back: {
        id: 'back',
        blocks: [],
        branches: [{ requires: [BROTHER_CARPENTER], next: 'from-town' }],
        next: 'granny',
      },
      'from-town': {
        id: 'from-town',
        blocks: [{ kind: 'narration', text: '哥从镇上回来过年，手上多了几道口子。' }],
        next: 'granny',
      },
      granny: {
        id: 'granny',
        blocks: [],
        branches: [{ requires: [{ bond: { kind: '生母', alive: true } }], next: 'mother' }],
        next: 'sister-in-law',
      },
      mother: {
        id: 'mother',
        blocks: [{ kind: 'narration', text: '娘坐在灶边，问你那边过得怎么样。你说都好。' }],
        branches: [
          { requires: [INLAWS_SOUR], next: 'mother-sour' },
          { requires: [INLAWS_FOND, { flag: { key: 'inlaws-mended' } }], next: 'mother-mended' },
          { requires: [INLAWS_FOND], next: 'mother-fond' },
        ],
        next: 'sister-in-law',
      },
      /**
       * 婆媳不睦，你只看见结果。翻脸那件事发生的时候你不在场（`kindred:quarrel` 没有正文）：
       * 这一回哥送你到巷口才压着声说了镯子的事；没赶上这一回的，一辈子不知道为了什么。
       */
      'mother-sour': {
        id: 'mother-sour',
        blocks: [{ kind: 'narration', text: '娘跟嫂子一顿饭没说一句话。哥低着头吃。' }],
        branches: [
          { requires: [{ flag: { key: 'inlaws-quarrel-fresh' } }], next: 'told' },
          { requires: [{ flag: { key: 'knows-bracelet' } }], next: 'sister-in-law' },
        ],
        next: 'untold',
      },
      told: {
        id: 'told',
        onEnter: [
          { type: 'flag', key: 'inlaws-quarrel-fresh', value: false },
          { type: 'flag', key: 'knows-bracelet', value: true },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '走的时候哥送你到巷口，压着声说了镯子的事——娘陪嫁的那副，娘说给孙子留着，嫂子说早该当了买粮。',
          },
          { kind: 'narration', text: '他夹在中间，两头不是人。', tone: 'faint' },
        ],
        next: 'sister-in-law',
      },
      untold: {
        id: 'untold',
        blocks: [{ kind: 'narration', text: '你不知道为了什么。哥没说，你也没问。', tone: 'faint' }],
        next: 'sister-in-law',
      },
      'mother-mended': {
        id: 'mother-mended',
        onEnter: [{ type: 'flag', key: 'inlaws-mended', value: false }],
        blocks: [
          { kind: 'narration', text: '嫂子给娘添饭，娘拉着她的手说话。' },
          { kind: 'narration', text: '她们什么时候和好的，你不知道。', tone: 'faint' },
        ],
        next: 'sister-in-law',
      },
      'mother-fond': {
        id: 'mother-fond',
        blocks: [{ kind: 'narration', text: '嫂子给娘添饭，娘拉着她的手说话。' }],
        next: 'sister-in-law',
      },
      'sister-in-law': {
        id: 'sister-in-law',
        blocks: [],
        branches: [{ requires: [COLD_SISTER_IN_LAW], next: 'cold' }],
        next: 'warm',
      },
      cold: {
        id: 'cold',
        blocks: [
          { kind: 'narration', text: '{call:brother-wife}照旧没多话。你坐了一顿饭的工夫就走了。' },
        ],
        next: 'lane',
      },
      warm: {
        id: 'warm',
        blocks: [{ kind: 'narration', text: '{call:brother-wife}留你住了一夜。' }],
        next: 'lane',
      },
      lane: {
        id: 'lane',
        blocks: [],
        branches: [{ requires: [{ bond: { kind: '兄', alive: true } }], next: 'lane-brother' }],
        next: 'lane-nephew',
      },
      'lane-brother': {
        id: 'lane-brother',
        blocks: [{ kind: 'narration', text: '走的时候哥送你到巷口。', tone: 'faint' }],
        next: 'debt',
      },
      'lane-nephew': {
        id: 'lane-nephew',
        blocks: [
          { kind: 'narration', text: '走的时候{call:nephew}送你到巷口。他说，叔，常来。', tone: 'faint' },
        ],
        next: 'debt',
      },
      /** 那笔粮还欠着，谁也不提 */
      debt: {
        id: 'debt',
        blocks: [],
        branches: [{ requires: [OWES_ME], next: 'debt-open' }],
        next: 'done',
      },
      'debt-open': {
        id: 'debt-open',
        blocks: [{ kind: 'narration', text: '那笔粮，谁也没提。', tone: 'faint' }],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 侄儿自己跑来了。
   *
   * 代际关系不是静态继承的：他跟你怎样，不由哥跟你怎样定，也不由嫂子跟你怎样定。
   * 木讷、谨慎的孩子不会自己跑来；别的孩子八九岁上会——嫂子跟你不对付也拦不住。
   * 这一回是他跟你之间自己的事，好感是他那条边上的。
   */
  'kindred:nephew-comes': {
    id: 'kindred:nephew-comes',
    title: '侄儿来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'meet', id: 'nephew', delta: 8, note: '八九岁上自己跑来找过你。' },
          { type: 'flag', key: 'nephew-came', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '{call:nephew}自己跑来了，一个人，鞋上都是泥。' },
          { kind: 'narration', text: '他说想来看看。你留他吃了饭，天黑前送他回去。' },
        ],
        branches: [{ requires: [COLD_SISTER_IN_LAW], next: 'behind-her-back' }],
        next: 'done',
      },
      'behind-her-back': {
        id: 'behind-her-back',
        blocks: [{ kind: 'narration', text: '他没跟{call:brother-wife}说。', tone: 'faint' }],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 侄儿成人了。手上有了活（老屋靠什么过活，他就干什么）；
   * 小时候自己跑来过的，长大了跟你亲；没来过的，对你客客气气，像对一个远亲——
   * **哪怕哥跟你再好**。
   *
   * 「他跟哥两个人种」问的是哥本人还在不在地里，不是问老屋靠什么过活：哥去了镇上做木匠，
   * 或者没了，都是他一个人种。头一版只问老屋，哥死了也照说「两个人种」——死了的人不种地。
   */
  'kindred:nephew-grown': {
    id: 'kindred:nephew-grown',
    title: '侄儿成人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [{ kind: 'narration', text: '{call:nephew}成人了，已经跟哥一般高。' }],
        branches: [
          { requires: [OLD_HOME_FARMS, BROTHER_FARMS], next: 'fields' },
          { requires: [OLD_HOME_FARMS], next: 'fields-alone' },
          { requires: [{ bond: { kind: '兄', alive: true } }], next: 'shop' },
        ],
        next: 'shop-alone',
      },
      fields: {
        id: 'fields',
        onEnter: [{ type: 'person', id: 'nephew', doing: '跟着爹种地' }],
        blocks: [{ kind: 'narration', text: '老屋那几亩地，如今是他跟哥两个人种。' }],
        next: 'how',
      },
      'fields-alone': {
        id: 'fields-alone',
        onEnter: [{ type: 'person', id: 'nephew', doing: '种老屋那几亩地' }],
        blocks: [{ kind: 'narration', text: '老屋那几亩地，如今是他一个人种。' }],
        next: 'how',
      },
      shop: {
        id: 'shop',
        onEnter: [{ type: 'person', id: 'nephew', doing: '在铺子里帮忙' }],
        blocks: [{ kind: 'narration', text: '铺子里的活，如今是他跟哥两个人做。' }],
        next: 'how',
      },
      'shop-alone': {
        id: 'shop-alone',
        onEnter: [{ type: 'person', id: 'nephew', doing: '守着老屋的铺子' }],
        blocks: [{ kind: 'narration', text: '铺子里的活，如今是他一个人撑着。' }],
        next: 'how',
      },
      how: {
        id: 'how',
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'nephew-came' } }], next: 'close' }],
        next: 'polite',
      },
      close: {
        id: 'close',
        onEnter: [{ type: 'meet', id: 'nephew', delta: 6, note: '长大了还是跟你亲。' }],
        blocks: [
          { kind: 'narration', text: '见了你还是像小时候那样，先把手里的东西放下，凑过来。' },
        ],
      },
      polite: {
        id: 'polite',
        blocks: [
          { kind: 'narration', text: '他对你客客气气的，叫一声叔，再没别的话。像对一个远亲。' },
        ],
      },
    },
  },

  /** 侄儿娶亲。老屋添的人进老屋，是你的侄媳妇，不是你这一户的人 */
  'kindred:nephew-weds': {
    id: 'kindred:nephew-weds',
    title: '老屋又办喜事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          {
            type: 'meet',
            id: 'nephew-wife',
            calls: '侄媳妇',
            delta: 2,
            who: { surname: '林', given: '氏', gender: '女', age: 18, doing: '操持家务', house: 'old-home' },
            bond: '亲戚',
          },
          { type: 'chronicle', text: '侄儿娶了亲。' },
        ],
        blocks: [
          { kind: 'narration', text: '老屋捎话来，{call:nephew}定了日子。' },
          { kind: 'narration', text: '那天你又回去吃了喜酒。上一回坐在上首的是哥，这一回哥坐到了一边。' },
        ],
      },
    },
  },

  /** 第三代。老屋添的孩子进老屋，岁数从生年现算——跟侄儿当年一样 */
  'kindred:grandnephew': {
    id: 'kindred:grandnephew',
    title: '老屋的第三代',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          {
            type: 'meet',
            id: 'grandnephew',
            calls: '侄孙',
            delta: 4,
            who: { given: '石头', gender: '男', age: 0, house: 'old-home' },
            bond: '亲戚',
          },
          { type: 'chronicle', text: '老屋添了第三代。' },
        ],
        blocks: [{ kind: 'narration', text: '{call:nephew}家添了个儿子。老屋有了第三代。' }],
        branches: [{ requires: [{ bond: { kind: '兄', alive: true } }], next: 'grandpa' }],
        next: 'gone',
      },
      grandpa: {
        id: 'grandpa',
        blocks: [{ kind: 'narration', text: '哥抱着孩子，手都不知道往哪儿放。' }],
      },
      gone: {
        id: 'gone',
        blocks: [{ kind: 'narration', text: '哥没赶上看见。', tone: 'faint' }],
      },
    },
  },

  /**
   * 哥没了。老屋的当家换人——户主换人是 `people.keepHeads` 在他殁的那一刻做的，
   * 这一卷只是把它讲出来：儿子成人了就是儿子，没成人就是嫂子当家。
   */
  'kindred:brother-gone': {
    id: 'kindred:brother-gone',
    title: '老屋的丧事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 9 },
          { type: 'chronicle', text: '哥没了。你回老屋守了七天。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '老屋捎话来，哥没了。' },
          { kind: 'narration', text: '你回去守了七天。这一回没有人跪在你前头。' },
        ],
        /**
         * 谁当家，问户，不问辈分想当然：爹还在是爹；没分出去的弟弟还在老屋，兄终弟及是他
         * （`keepHeads` 挑的是户里最年长的成年男丁）；再才是侄儿；都没有，嫂子当家。
         */
        branches: [
          { requires: [{ house: { id: 'old-home', head: '生父' } }], next: 'father-still' },
          { requires: [{ house: { id: 'old-home', head: '弟' } }], next: 'uncle' },
          { requires: [{ family: { id: 'nephew', alive: true, age: { atLeast: 16 } } }], next: 'heir' },
        ],
        next: 'widow',
      },
      /** 弟弟没分出去、还住在老屋：兄终弟及 */
      uncle: {
        id: 'uncle',
        blocks: [{ kind: 'narration', text: '老屋如今是{call:sibling}当家。侄儿还小，轮不到他。', tone: 'faint' }],
      },
      /** 白发人送黑发人：爹还在，老屋就还是爹当家 */
      'father-still': {
        id: 'father-still',
        blocks: [{ kind: 'narration', text: '爹还在。老屋还是他当家，只是话更少了。', tone: 'faint' }],
      },
      heir: {
        id: 'heir',
        blocks: [{ kind: 'narration', text: '老屋如今是{call:nephew}当家。', tone: 'faint' }],
      },
      widow: {
        id: 'widow',
        blocks: [{ kind: 'narration', text: '老屋里只剩嫂子和孩子。', tone: 'faint' }],
      },
    },
  },

  /**
   * 哥改行。
   *
   * 老屋那几亩地，两个大男人种嫌少；侄儿成了人能顶地里的活，哥把地交给他，自己去镇上跟一个
   * 木匠搭伙做活。从这一天起两件事分开了：**老屋还是种地的人家**（`House.livelihood` 仍是务农，
   * 地是侄儿种着），**哥自己是木工**（`Person.livelihood`）。一户靠什么维持，和户里某个人自己
   * 干什么，不是一回事——这是那一格的第一个使用者。
   *
   * 他住在铺子里，农忙和年节才回来：人在镇上（`Person.place`），户还是老屋（`House.members`），
   * 当家的还是他。离家做工不是离户。
   *
   * 为什么走，两种缘由都来自世界里已经有的事实：地薄人多，或者欠你的那笔粮一直还不上。
   * 木讷、谨慎的哥不走；侄儿没成人也不走——地总得有人种。
   */
  'kindred:brother-turns': {
    id: 'kindred:brother-turns',
    title: '哥去了镇上',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [],
        branches: [{ requires: [OWES_ME], next: 'why-debt' }],
        next: 'why-land',
      },
      'why-land': {
        id: 'why-land',
        blocks: [
          {
            kind: 'narration',
            text: '老屋那几亩地，两个大男人种嫌少。{call:nephew}成了人，哥把地交给了他。',
          },
        ],
        next: 'goes',
      },
      'why-debt': {
        id: 'why-debt',
        blocks: [
          {
            kind: 'narration',
            text: '老屋那几亩地打不出多少，欠你的那笔粮一直还不上。{call:nephew}成了人，哥把地交给了他。',
          },
        ],
        next: 'goes',
      },
      goes: {
        id: 'goes',
        onEnter: [
          {
            type: 'person',
            id: 'brother',
            livelihood: '木工',
            place: '{province} · {prefecture} · 镇上',
            doing: '在镇上做木匠',
          },
          { type: 'person', id: 'nephew', doing: '种老屋那几亩地' },
          { type: 'chronicle', text: '哥去镇上做木匠了。老屋的地交给了侄儿。' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '哥手上有点木活的底子，自己去了镇上，跟一个木匠搭伙做活。住在铺子里，夏收秋收和年节才回来。',
          },
          { kind: 'narration', text: '老屋还是种地的人家。地是{call:nephew}种着，哥不种了。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 荒年借粮。关系变化来自具体的事：你借了，他记着；你没借，他也记着。
   * 借了的那一半是一笔债（`owe`）——还不还，看老屋那边的年景（`kindred:repay`）。
   */
  'kindred:borrow': {
    id: 'kindred:borrow',
    title: '借粮',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '入冬前，哥来了一趟。他站在门口没进来，说老屋那边接不上了。' },
          { kind: 'narration', text: '你家的也不多。' },
        ],
        choices: [
          {
            id: 'lend',
            label: '匀一半给他',
            echo: '你把家里的匀了一半给他。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -6 },
              { type: 'meet', id: 'brother', delta: 8, note: '荒年你匀了一半粮给他。' },
              { type: 'owe', debtor: 'brother', creditor: 'me', what: '半年的粮', terms: '开春还' },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'chronicle', text: '荒年，你匀了一半粮给老屋。' },
            ],
            next: 'lent',
          },
          {
            id: 'refuse',
            label: '说自家也接不上',
            echo: '你说自家也接不上。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'meet', id: 'brother', delta: -10, note: '荒年他来借粮，你没借。' },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'chronicle', text: '荒年，老屋来借粮，你没借。', tone: 'deep' },
            ],
            next: 'refused',
          },
        ],
      },
      lent: {
        id: 'lent',
        blocks: [
          { kind: 'narration', text: '他没说谢。扛着走的时候，背比从前弯了些。' },
          { kind: 'narration', text: '他说开春还。', tone: 'faint' },
        ],
      },
      refused: {
        id: 'refused',
        blocks: [
          { kind: 'narration', text: '他站了一会儿，说知道了，转身走了。' },
          { kind: 'narration', text: '那年正月他没来。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 还粮。还不还看还债的人此刻靠什么过活：种地的看收成，开铺子的看粮价回没回落，
   * 做了木匠的还的是一张桌子——债怎么还来自现实生活，不来自户。
   * 还不上不是赖账——是那年老屋也紧。债还在，正月里谁也不提。
   */
  'kindred:repay': {
    id: 'kindred:repay',
    title: '还粮',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [],
        branches: [
          { requires: [BROTHER_CARPENTER], next: 'work-back' },
          {
            requires: [OLD_HOME_FARMS, { region: { harvest: { atLeast: 50 } } }],
            next: 'grain-back',
          },
          { requires: [OLD_HOME_FARMS], next: 'grain-short' },
          { requires: [{ region: { grain: { atMost: 110 } } }], next: 'silver-back' },
        ],
        next: 'silver-short',
      },
      'grain-back': {
        id: 'grain-back',
        onEnter: [
          { type: 'repay', debtor: 'brother', creditor: 'me' },
          { type: 'chronicle', text: '哥把粮还了。' },
        ],
        blocks: [
          { kind: 'narration', text: '秋后哥把粮送了回来，一斗不少。他没进屋，放下就走了。' },
        ],
      },
      'grain-short': {
        id: 'grain-short',
        blocks: [{ kind: 'narration', text: '秋后他没来。老屋那边也没打下多少，你没去问。' }],
      },
      /** 欠的是粮，还的是工。这是不是同一种债，等第二笔来分 */
      'work-back': {
        id: 'work-back',
        onEnter: [
          { type: 'repay', debtor: 'brother', creditor: 'me' },
          { type: 'chronicle', text: '哥打了一张桌子送来，那笔粮算清了。' },
        ],
        blocks: [
          { kind: 'narration', text: '年底哥扛了一张桌子来，榆木的，说是铺子里下了工打的。' },
          { kind: 'narration', text: '那笔粮，他说就算清了。你没说不。', tone: 'faint' },
        ],
      },
      'silver-back': {
        id: 'silver-back',
        onEnter: [
          { type: 'repay', debtor: 'brother', creditor: 'me' },
          { type: 'chronicle', text: '哥折了银子把粮还了。' },
        ],
        blocks: [
          { kind: 'narration', text: '年底哥折了银子送来。他说，粮价下来了，铺子里缓过来了。' },
        ],
      },
      'silver-short': {
        id: 'silver-short',
        blocks: [{ kind: 'narration', text: '年底他没来。粮价还没下来，你知道那边也紧。' }],
      },
    },
  },

  /**
   * 婆媳翻脸。为一副娘陪嫁的镯子——这件事在老屋那条边上，**你不在场**。
   *
   * 这一卷没有正文、不记编年：世界不是为玩家准备的，老屋里的事发生的时候你在自己家。
   * 你只在下一回正月看见结果（那顿饭没人说话）；哥赶上那一回送你到巷口才说了缘由，
   * 没赶上的一辈子不知道为了什么。你跟娘、跟嫂子的好感一格不动。
   */
  'kindred:quarrel': {
    id: 'kindred:quarrel',
    title: '老屋的镯子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'tie', from: 'brother-wife', to: 'mother', bond: '亲戚', terms: '不睦' },
          { type: 'flag', key: 'inlaws-quarrel-fresh', value: true },
        ],
        blocks: [],
      },
    },
  },

  /**
   * 和好了。娘病了一冬，是嫂子伺候的——也是你不在场的事，正月里看见嫂子给娘添饭才知道，
   * 中间发生了什么你不知道。关系变化来自具体的事，不来自日历翻页；这件事不是你的事。
   */
  'kindred:mend': {
    id: 'kindred:mend',
    title: '那一冬',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'tie', from: 'brother-wife', to: 'mother', bond: '亲戚', terms: '亲厚' },
          { type: 'flag', key: 'inlaws-quarrel-fresh', value: false },
          { type: 'flag', key: 'inlaws-mended', value: true },
        ],
        blocks: [],
      },
    },
  },

  /**
   * 娘在老屋没了。你回去守了七天。
   * 问的是「娘留在了老屋」那面旗加上她不在了——不是「娘殁了」：分家前殁的娘另有一卷。
   * 她最后那两年是谁在跟前，看她跟嫂子那条边。
   */
  'kindred:mourning': {
    id: 'kindred:mourning',
    title: '老屋的丧事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 9 },
          { type: 'flag', key: 'old-home-mother', value: false },
          { type: 'meet', id: 'brother', delta: 4 },
          { type: 'chronicle', text: '娘在老屋没了。你回去守了七天。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '老屋捎话来，娘没了。' },
          { kind: 'narration', text: '你回去守了七天。哥跪在前头，你跪在他后头。' },
          {
            kind: 'narration',
            text: '出殡那天下着雨。回来的路上，你和哥一句话也没说。',
            tone: 'faint',
          },
        ],
        branches: [
          { requires: [INLAWS_FOND], next: 'fond' },
          { requires: [INLAWS_SOUR], next: 'sour' },
          { requires: [COLD_SISTER_IN_LAW], next: 'cold' },
        ],
        next: 'done',
      },
      fond: {
        id: 'fond',
        blocks: [
          {
            kind: 'narration',
            text: '老人家没了的时候，是嫂子在跟前。她跟你说，没受罪。',
            tone: 'faint',
          },
        ],
      },
      sour: {
        id: 'sour',
        blocks: [
          {
            kind: 'narration',
            text: '老人家最后那两年，饭是自己烧的。你没问，哥也没说。',
            tone: 'faint',
          },
        ],
      },
      cold: {
        id: 'cold',
        blocks: [
          {
            kind: 'narration',
            text: '那几天{call:brother-wife}倒是没说什么难听的。',
            tone: 'faint',
          },
        ],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },
}

export const kindredEvents: readonly LifeEvent[] = [
  {
    id: 'kindred-wedding',
    window: { from: 19, to: 70 },
    requires: [...TWO_HOUSES, { family: { id: 'brother-wife', alive: false } }],
    scene: 'kindred:wedding',
    weight: 24,
  },
  {
    id: 'kindred-nephew',
    window: { from: 20, to: 70 },
    requires: [
      ...TWO_HOUSES,
      { family: { id: 'brother-wife', alive: true } },
      { family: { id: 'nephew', alive: false } },
    ],
    scene: 'kindred:nephew',
    weight: 20,
  },
  {
    // 年节走动，年年可能有。权重压低：绝大多数正月没什么可记的，正是这一卷要说的话。
    // 「躲到嫂子身后」得是个会走路的孩子：满月那天认下的侄儿，认了三年就是三岁。
    // 哥没了照样走动——老屋是一户，不是哥一个人
    id: 'kindred-newyear',
    window: { from: 22, to: 75 },
    requires: [
      ...OLD_HOUSE,
      { family: { id: 'nephew', alive: true, age: { atLeast: 3 } } },
    ],
    scene: 'kindred:newyear',
    weight: 5,
    repeatable: true,
  },
  {
    // 侄儿八九岁上自己跑来。木讷、谨慎的孩子不会；嫂子跟你不对付拦不住
    id: 'kindred-nephew-comes',
    window: { from: 26, to: 70 },
    requires: [
      ...OLD_HOUSE,
      { family: { id: 'nephew', alive: true, age: { atLeast: 8, atMost: 12 } } },
      { temper: { id: 'nephew', in: ['温和', '暴躁', '刚硬', '精明'] } },
    ],
    scene: 'kindred:nephew-comes',
    weight: 14,
  },
  {
    id: 'kindred-nephew-grown',
    window: { from: 34, to: 75 },
    requires: [...OLD_HOUSE, { family: { id: 'nephew', alive: true, age: { atLeast: 16 } } }],
    scene: 'kindred:nephew-grown',
    weight: 30,
  },
  {
    // 哥改行：侄儿能顶地里的活了，哥把地交给他去镇上做木匠。年纪太大的不走，木讷谨慎的不走
    id: 'kindred-brother-turns',
    window: { from: 34, to: 60 },
    requires: [
      ...TWO_HOUSES,
      OLD_HOME_FARMS,
      BROTHER_FARMS,
      { family: { id: 'brother', age: { atMost: 55 } } },
      { family: { id: 'nephew', alive: true, age: { atLeast: 16 } } },
      { temper: { id: 'brother', in: ['温和', '暴躁', '刚硬', '精明'] } },
    ],
    scene: 'kindred:brother-turns',
    weight: 10,
  },
  {
    id: 'kindred-nephew-weds',
    window: { from: 37, to: 78 },
    requires: [
      ...OLD_HOUSE,
      { family: { id: 'nephew', alive: true, age: { atLeast: 19 } } },
      { family: { id: 'nephew-wife', alive: false } },
    ],
    scene: 'kindred:nephew-weds',
    weight: 24,
  },
  {
    id: 'kindred-grandnephew',
    window: { from: 38, to: 80 },
    requires: [
      ...OLD_HOUSE,
      { family: { id: 'nephew', alive: true } },
      { family: { id: 'nephew-wife', alive: true } },
      { family: { id: 'grandnephew', alive: false } },
    ],
    scene: 'kindred:grandnephew',
    weight: 20,
  },
  {
    // 哥没了：户主换人是他殁那一刻的事，这一卷只讲出来。分了家才有老屋可回
    id: 'kindred-brother-gone',
    window: { from: 19, to: 80 },
    requires: [...OLD_HOUSE, { bond: { kind: '兄', alive: false } }],
    scene: 'kindred:brother-gone',
    weight: 60,
  },
  {
    id: 'kindred-borrow',
    window: { from: 19, to: 70 },
    requires: [...TWO_HOUSES, { region: { grain: { atLeast: 126 } } }],
    scene: 'kindred:borrow',
    weight: 12,
  },
  {
    // 借了粮的第二年起，他还不还看老屋的年景。一次：还不上就一直欠着
    id: 'kindred-repay',
    window: { from: 19, to: 70 },
    requires: [...TWO_HOUSES, OWES_ME],
    scene: 'kindred:repay',
    weight: 30,
  },
  {
    // 婆媳翻脸：处得来或平常的才有得翻；不睦的早就不说话了。你不在场
    id: 'kindred-quarrel',
    window: { from: 20, to: 70 },
    requires: [
      ...TWO_HOUSES,
      { bond: { kind: '生母', alive: true } },
      { family: { id: 'brother-wife', alive: true } },
      { tie: { from: 'brother-wife', to: 'mother', terms: ['亲厚', '平常'] } },
    ],
    scene: 'kindred:quarrel',
    weight: 6,
  },
  {
    // 和好：娘老了病了一冬，是嫂子伺候的。你不在场
    id: 'kindred-mend',
    window: { from: 22, to: 75 },
    requires: [
      ...TWO_HOUSES,
      { family: { id: 'mother', alive: true, age: { atLeast: 55 } } },
      { family: { id: 'brother-wife', alive: true } },
      { tie: { from: 'brother-wife', to: 'mother', terms: ['不睦'] } },
    ],
    scene: 'kindred:mend',
    weight: 8,
  },
  {
    id: 'kindred-mourning',
    window: { from: 19, to: 70 },
    requires: [
      { house: { divided: true } },
      { flag: { key: 'old-home-mother', equals: true } },
      { bond: { kind: '生母', alive: false } },
    ],
    scene: 'kindred:mourning',
    weight: 60,
  },
]
