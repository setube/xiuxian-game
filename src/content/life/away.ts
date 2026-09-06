import type { LifeEvent, SceneLibrary } from '@/types/game'

import {
  BROTHER_CARPENTER,
  BROTHER_FARMS,
  FATHER_SON_SOUR,
  NEPHEW_AWAY,
  NEPHEW_FARMS,
  OLD_HOME_FARMS,
  TWO_HOUSES,
} from './kindred'

/**
 * 在外的那些年：一个人在镇上谋生十年二十年，家里的事照旧发生。
 *
 * 用户 2026-09-07 点的观察题：一个人一旦在外谋生十年二十年，家庭、婚姻、子女、关系、财产和原户
 * 之间会怎样自然变化。这一册不建新东西，让哥在镇上的那些年往前跑，每一件事都从已有的事实里出：
 *
 * - **财产**：木匠有的是银钱，不是粮。荒年他不再来借粮（`kindred-borrow` 要哥在地上），
 *   倒过来是他从镇上捎回二两银子（`away:lends`）——第二笔债，欠的是银、方向反着，
 *   进的是同一个 `IOU` 格，什么也没逼出来。侄儿的彩礼是他一锤一锤攒的。
 * - **关系**：娘没了他在镇上，赶回来已是第三天——那一回你跟他的边动的是减不是加。
 * - **子女**：侄儿出师了，头一个月的工钱捎回老屋；他在镇上成的亲，媳妇留在老屋。
 * - **原户**：伤了手、老了做不动了，都回老屋——自己的营生清掉，落回老屋的（`livelihood: null`），
 *   回来了就不再走（`brother-home-for-good`）。他在镇上待了二十年，回来了还是老屋的人。
 * - **家庭**：哥老了种不动地、儿子在镇上，回不回来看父子那条边——亲厚平常的回来，不睦的不回，
 *   地是嫂子、侄媳妇种着。家庭劳动断了档没有系统来补，是现实自己露出来的。
 *
 * ## 没做的
 *
 * 老屋没有家境格：哥有没有银子问的是他的营生，不是账。哥在镇上这些年老屋的事谁拿主意——
 * `House.head` 仍写着他，那一格「实际主持家事的人」的定义第一次跟现实分开了，等一件具体的事来交。
 */

const I_OWE_HIM = { owed: { debtor: 'me', creditor: 'brother', settled: false } } as const
/** 回来就不再走：伤了手、老了做不动了 */
const HOME_FOR_GOOD = { flag: { key: 'brother-home-for-good' } } as const

export const awayScenes: SceneLibrary = {
  /**
   * 哥从镇上捎回二两银子。荒年他不再是来借粮的那个——木匠有的是银钱，没有粮。
   * 收不收是你的事：收了是一笔债（欠的是银，方向跟那笔粮反着），不收他也不说什么。
   */
  'away:lends': {
    id: 'away:lends',
    title: '二两银子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          {
            kind: 'narration',
            text: '入冬前哥从镇上回来了一趟，到你这儿坐了坐。走的时候放下二两银子，说铺子里刚结了工钱。',
          },
        ],
        choices: [
          {
            id: 'take',
            label: '收下',
            echo: '你收下了。',
            effects: [
              { type: 'household', standing: 6 },
              { type: 'owe', debtor: 'me', creditor: 'brother', what: '二两银子', terms: '秋后还' },
              { type: 'meet', id: 'brother', delta: 4, note: '荒年他从镇上捎回二两银子。' },
              { type: 'chronicle', text: '荒年，哥从镇上捎回二两银子。' },
            ],
            next: 'taken',
          },
          {
            id: 'refuse',
            label: '推回去',
            echo: '你把银子推了回去，说家里还撑得住。',
            effects: [{ type: 'chronicle', text: '荒年，哥捎来二两银子，你没收。', tone: 'deep' }],
            next: 'refused',
          },
        ],
      },
      taken: {
        id: 'taken',
        blocks: [
          { kind: 'narration', text: '你没说谢。他也没等你说，说秋后还就行。', tone: 'faint' },
        ],
      },
      refused: {
        id: 'refused',
        blocks: [{ kind: 'narration', text: '他把银子揣回去了，没再提。', tone: 'faint' }],
      },
    },
  },

  /**
   * 还银子。年景好了你去还；他伤了手做不了活了，你不等年景也还——还不还来自现实生活。
   * 他在镇上就送去镇上，回了老屋就送去老屋。
   */
  'away:i-repay': {
    id: 'away:i-repay',
    title: '还银子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'household', standing: -6 },
          { type: 'repay', debtor: 'me', creditor: 'brother' },
          { type: 'chronicle', text: '你把哥的银子还了。' },
        ],
        blocks: [],
        branches: [{ requires: [BROTHER_CARPENTER], next: 'in-town' }],
        next: 'at-home',
      },
      'in-town': {
        id: 'in-town',
        blocks: [
          {
            kind: 'narration',
            text: '秋后你去了一趟镇上，把二两银子还了。哥在铺子里刨木头，满身刨花。他把银子收了，没数。',
          },
        ],
      },
      'at-home': {
        id: 'at-home',
        blocks: [{ kind: 'narration', text: '你把二两银子送去了老屋。他收了，没数。' }],
      },
    },
  },

  /**
   * 哥在镇上伤了手。锯子走了一下——木匠这一行的险，不是谁安排的。木匠是做不成了，回老屋；
   * 自己的营生清掉，落回老屋的。地是侄儿种着，他伤了手也帮不上。
   */
  'away:hurt': {
    id: 'away:hurt',
    title: '哥伤了手',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          {
            type: 'person',
            id: 'brother',
            livelihood: null,
            backTo: 'old-home',
            doing: '伤了手，回老屋养着',
          },
          { type: 'flag', key: 'brother-home-for-good', value: true },
          { type: 'chronicle', text: '哥在镇上伤了手，回了老屋。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '老屋捎话来，哥在镇上伤了手。锯子走了一下，右手三根指头。' },
          { kind: 'narration', text: '他回了老屋。木匠是做不成了。' },
        ],
        branches: [{ requires: [NEPHEW_FARMS], next: 'son-on-land' }],
        next: 'done',
      },
      'son-on-land': {
        id: 'son-on-land',
        blocks: [
          {
            kind: 'narration',
            text: '地是{call:nephew}种着，他伤了手也帮不上。你去看他，他把手藏在袖子里。',
            tone: 'faint',
          },
        ],
      },
      done: {
        id: 'done',
        blocks: [{ kind: 'narration', text: '你去看他，他把手藏在袖子里。', tone: 'faint' }],
      },
    },
  },

  /**
   * 哥老了，镇上的活做不动了，回老屋。他在镇上待了这些年，回来了还是老屋的人。
   */
  'away:old': {
    id: 'away:old',
    title: '哥回来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          {
            type: 'person',
            id: 'brother',
            livelihood: null,
            backTo: 'old-home',
            doing: '老了，回老屋',
          },
          { type: 'flag', key: 'brother-home-for-good', value: true },
          { type: 'chronicle', text: '哥老了，从镇上回了老屋。' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '哥{age:brother}了，镇上的活做不动了，回了老屋。带回来一箱子家什，都是他自己打的。',
          },
        ],
        branches: [{ requires: [NEPHEW_FARMS], next: 'son-on-land' }],
        next: 'done',
      },
      'son-on-land': {
        id: 'son-on-land',
        blocks: [
          {
            kind: 'narration',
            text: '地是{call:nephew}种着，用不着他了。他在院子里打了张凳子。',
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

  /**
   * 哥老了种不动地了，儿子在镇上。回不回来，看父子那条边：亲厚、平常的回来，不睦的不回——
   * 地是嫂子、侄媳妇种着。家庭劳动断了档，没有系统来补，是现实自己露出来的。
   */
  'away:father-old': {
    id: 'away:father-old',
    title: '哥种不动了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'person', id: 'brother', doing: '老了，种不动地了' },
          { type: 'flag', key: 'brother-home-for-good', value: true },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '哥{age:brother}了，那几亩地种不动了。{call:nephew}还在镇上。',
          },
        ],
        branches: [{ requires: [FATHER_SON_SOUR], next: 'son-stays-away' }],
        next: 'son-comes-back',
      },
      'son-comes-back': {
        id: 'son-comes-back',
        onEnter: [
          {
            type: 'person',
            id: 'nephew',
            livelihood: null,
            backTo: 'old-home',
            doing: '种老屋那几亩地',
          },
          { type: 'chronicle', text: '哥种不动地了，侄儿从镇上回了老屋。' },
        ],
        blocks: [{ kind: 'narration', text: '{call:nephew}从镇上回来了。地不能荒。' }],
      },
      'son-stays-away': {
        id: 'son-stays-away',
        onEnter: [
          { type: 'person', id: 'brother-wife', doing: '种地，也操持家务' },
          { type: 'chronicle', text: '哥种不动地了，侄儿没回来。', tone: 'deep' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '{call:nephew}没回来。老屋那几亩地，如今是{call:brother-wife}种着。',
          },
          { kind: 'narration', text: '哥没托人去叫他。你也没去。', tone: 'faint' },
        ],
      },
    },
  },

  /** 侄儿出师了。头一个月的工钱捎回老屋。他自己的营生还是佣工——伙计跟学徒粗粒度一格 */
  'away:journeyman': {
    id: 'away:journeyman',
    title: '侄儿出师',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'person', id: 'nephew', doing: '在镇上铺子里当伙计' },
          { type: 'chronicle', text: '侄儿出师了。' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '老屋捎话来，{call:nephew}出师了。头一个月的工钱，他捎回了老屋。',
          },
        ],
      },
    },
  },
}

export const awayEvents: readonly LifeEvent[] = [
  {
    // 荒年他不来借粮了——他有的是银钱。你家紧的时候，他捎回来
    id: 'away-lends',
    window: { from: 35, to: 75 },
    requires: [
      ...TWO_HOUSES,
      BROTHER_CARPENTER,
      { region: { grain: { atLeast: 126 } } },
      { standing: { atMost: 45 } },
    ],
    scene: 'away:lends',
    weight: 12,
  },
  {
    // 年景好了你去还
    id: 'away-i-repay',
    window: { from: 35, to: 78 },
    requires: [...TWO_HOUSES, I_OWE_HIM, { region: { harvest: { atLeast: 50 } } }],
    scene: 'away:i-repay',
    weight: 30,
  },
  {
    // 他伤了手做不了活了，你不等年景也还
    id: 'away-i-repay-need',
    window: { from: 35, to: 78 },
    requires: [...TWO_HOUSES, I_OWE_HIM, HOME_FOR_GOOD],
    scene: 'away:i-repay',
    weight: 60,
  },
  {
    // 木匠这一行的险。稀
    id: 'away-hurt',
    window: { from: 36, to: 75 },
    requires: [
      ...TWO_HOUSES,
      BROTHER_CARPENTER,
      { family: { id: 'brother', age: { atMost: 57 } } },
    ],
    scene: 'away:hurt',
    weight: 3,
  },
  {
    // 老了做不动了
    id: 'away-old',
    window: { from: 40, to: 80 },
    requires: [
      ...TWO_HOUSES,
      BROTHER_CARPENTER,
      { family: { id: 'brother', age: { atLeast: 58 } } },
    ],
    scene: 'away:old',
    weight: 20,
  },
  {
    // 在地上的哥老了种不动了、儿子在镇上：回不回来看父子那条边
    id: 'away-father-old',
    window: { from: 40, to: 80 },
    requires: [
      ...TWO_HOUSES,
      OLD_HOME_FARMS,
      BROTHER_FARMS,
      NEPHEW_AWAY,
      { family: { id: 'brother', age: { atLeast: 60 } } },
    ],
    scene: 'away:father-old',
    weight: 20,
  },
  {
    // 学徒三年出师。他走的时候十七到二十二
    id: 'away-journeyman',
    window: { from: 33, to: 78 },
    requires: [
      ...TWO_HOUSES,
      NEPHEW_AWAY,
      { flag: { key: 'nephew-went' } },
      { family: { id: 'nephew', age: { atLeast: 21 } } },
    ],
    scene: 'away:journeyman',
    weight: 24,
  },
]
