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
 * ## 关系变化只来自具体的事
 *
 * 这一册里改动好感的只有三件事：嫂子头一回见你、荒年借粮你借不借、娘没了你回去守孝。
 * 年节走动本身一格也不改——见面不加分，不见面也不减分。
 *
 * 老屋的日子怎么过（哥种的还是那几亩地，铺子的账还是他记）这一片不写：那是他的户，
 * `House.livelihood` 分家时抄了一份，等有内容要问「哥家今年收成怎样」再动。
 */

/** 分了家、哥还在，这一册才有得说 */
const TWO_HOUSES = [{ house: { divided: true } }, { bond: { kind: '兄', alive: true } }] as const

/** 嫂子处不处得来：从她的性情里出。刚硬、暴躁的跟你不对付，别的处得来 */
const COLD_SISTER_IN_LAW = { temper: { id: 'brother-wife', in: ['暴躁', '刚硬'] } } as const

export const kindredScenes: SceneLibrary = {
  /**
   * 哥娶亲。你回老屋吃了喜酒。嫂子从这一天起是老屋的人，不是你这一户的。
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
            who: { surname: '吴', given: '氏', gender: '女', age: 19, doing: '操持家务', house: 'old-home' },
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
          { kind: 'narration', text: '{call:brother-wife}跟你没说几句话。收拾碗筷的时候，她把你那只碗放在最后。' },
          { kind: 'narration', text: '哥没看见。你也没提。', tone: 'faint' },
        ],
      },
      warm: {
        id: 'warm',
        onEnter: [{ type: 'meet', id: 'brother-wife', delta: 6, note: '头一回见你就留你吃饭。' }],
        blocks: [
          { kind: 'narration', text: '{call:brother-wife}话不多，可是留你吃了晚饭，临走又给你装了一包点心。' },
        ],
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
        blocks: [
          { kind: 'narration', text: '娘抱着孩子不撒手。她比你上回见她的时候又老了些。' },
        ],
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 年节走动。这一卷**一格好感也不改**：见面不加分，不见面也不减分。
   * 变的只有人——侄儿长了几岁，娘更老了，嫂子照旧那个样子。
   */
  'kindred:newyear': {
    id: 'kindred:newyear',
    title: '正月里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '正月里你回了一趟老屋。' },
          { kind: 'narration', text: '{call:nephew}已经{age:nephew}了，见了你先躲到{call:brother-wife}身后，过一会儿才出来。' },
        ],
        branches: [
          { requires: [{ bond: { kind: '生母', alive: true } }], next: 'mother' },
          { requires: [COLD_SISTER_IN_LAW], next: 'cold' },
        ],
        next: 'warm',
      },
      mother: {
        id: 'mother',
        blocks: [{ kind: 'narration', text: '娘坐在灶边，问你那边过得怎么样。你说都好。' }],
        branches: [{ requires: [COLD_SISTER_IN_LAW], next: 'cold' }],
        next: 'warm',
      },
      cold: {
        id: 'cold',
        blocks: [
          { kind: 'narration', text: '{call:brother-wife}照旧没多话。你坐了一顿饭的工夫就走了。' },
          { kind: 'narration', text: '哥送你到巷口。他说，她就那个脾气。', tone: 'faint' },
        ],
      },
      warm: {
        id: 'warm',
        blocks: [
          { kind: 'narration', text: '{call:brother-wife}留你住了一夜。第二天走的时候，哥送你到巷口。' },
        ],
      },
    },
  },

  /**
   * 荒年借粮。关系变化来自具体的事：你借了，他记着；你没借，他也记着。
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
          { kind: 'narration', text: '开春他还了一半，剩下的没提。你也没提。', tone: 'faint' },
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
   * 娘在老屋没了。你回去守了七天。
   * 问的是「娘留在了老屋」那面旗加上她不在了——不是「娘殁了」：分家前殁的娘另有一卷。
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
          { kind: 'narration', text: '出殡那天下着雨。回来的路上，你和哥一句话也没说。', tone: 'faint' },
        ],
        branches: [{ requires: [COLD_SISTER_IN_LAW], next: 'cold' }],
        next: 'done',
      },
      cold: {
        id: 'cold',
        blocks: [{ kind: 'narration', text: '那几天{call:brother-wife}倒是没说什么难听的。', tone: 'faint' }],
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
    // 「躲到嫂子身后」得是个会走路的孩子：满月那天认下的侄儿，认了三年就是三岁
    id: 'kindred-newyear',
    window: { from: 22, to: 70 },
    requires: [
      ...TWO_HOUSES,
      { family: { id: 'nephew', alive: true } },
      { bond: { kind: '亲戚', alive: true, years: { atLeast: 3 } } },
    ],
    scene: 'kindred:newyear',
    weight: 5,
    repeatable: true,
  },
  {
    id: 'kindred-borrow',
    window: { from: 19, to: 70 },
    requires: [...TWO_HOUSES, { region: { grain: { atLeast: 126 } } }],
    scene: 'kindred:borrow',
    weight: 12,
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
