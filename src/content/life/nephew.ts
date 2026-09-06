import type { LifeEvent, SceneLibrary } from '@/types/game'

import {
  BROTHER_CARPENTER,
  FATHER_SON_SOUR,
  NEPHEW_FARMS,
  OLD_HOME_FARMS,
  TWO_HOUSES,
} from './kindred'

/**
 * 侄儿这一册：老屋的第二代想走自己的路。
 *
 * 用户 2026-09-07 点的下一个压力测试：侄儿的成长与老屋的生计冲突——家庭经营、个人选择、
 * 代际关系、个人生计四件事能不能同时存在而不互相覆盖。
 *
 * ## 想不想走、走不走成，都是倾向，没有一条是硬规则
 *
 * 想走从他的性情里出（精明、刚硬、暴躁的孩子在那几亩地上待不住），**也从老屋的年景里出**：
 * 一个温和、谨慎的孩子，荒年也会说「我去镇上，家里少一张嘴」。「更可能」不能变成「只允许」
 * （用户 2026-09-07）。
 *
 * 走不走成，是他爹、他自己、你、那一年四样东西一起决定的（`nephew:goes` 那张分流表）：
 * 刚硬暴躁的孩子说走就走，爹拦不住；温和木讷的爹放他走，还送他到镇上；刚硬暴躁的爹不放；
 * 精明谨慎的爹要有人推一把——你替孩子说了话，或者那年老屋实在接不上。温和木讷的孩子
 * 听得进你的话，你劝他留下他就留下。
 *
 * ## 四件事各是各的
 *
 * 他走了，老屋还是种地的人家（`House.livelihood` 不动）；他自己是铺子里的学徒
 * （`Person.livelihood` 佣工——短工、长工、店伙、学徒粗粒度一格，够用到内容分得开它们为止）。
 * 哥要是已经在镇上做木匠，地没人种了，他回来（`person.livelihood: null`：自己的营生清掉，
 * 落回老屋的营生——这一格的第一个「清」法）。父子那条边（`tie` 侄儿→哥）由这件事定下：
 * 亲厚、平常、不睦；你跟侄儿的边、你跟哥的边，只在你说话的那一刻动，他们父子怎样不动你的边。
 *
 * ## 你不在场
 *
 * 他走没走成、父子后来和没和好，两卷都没有正文、不进编年——发生的时候你在自己家。
 * 你在下一回正月看见：他从镇上回来过年，或者哥跟他一顿饭没说一句话；和好了，是娘告诉你的
 * （哥病了一冬，是他守着的）——「听说」这条渠道的第一个使用者：告诉你的人得活着、得在老屋。
 *
 * ## 不做的
 *
 * 铺子的东家是谁没有格——他「在镇上一家铺子里」，那铺子不是人也不是组织。第二个真需要
 * 「为某人做工」的人出现之前，不建雇佣关系（用户 2026-09-07）。
 */

const BOLD_NEPHEW = { temper: { id: 'nephew', in: ['刚硬', '暴躁'] } } as const
const SOFT_NEPHEW = { temper: { id: 'nephew', in: ['温和', '木讷'] } } as const
const LENIENT_FATHER = { temper: { id: 'brother', in: ['温和', '木讷'] } } as const
const COUNTING_FATHER = { temper: { id: 'brother', in: ['精明', '谨慎'] } } as const

const HUNGRY = { flag: { key: 'nephew-restless-hungry' } } as const
const SPOKE_FOR_NEPHEW = { flag: { key: 'spoke-for-nephew' } } as const
const SPOKE_FOR_BROTHER = { flag: { key: 'spoke-for-brother' } } as const

/** 侄儿十七到二十二，在老屋的地上 */
const NEPHEW_ON_THE_LAND = [
  ...TWO_HOUSES,
  OLD_HOME_FARMS,
  NEPHEW_FARMS,
  { family: { id: 'nephew', age: { atLeast: 17, atMost: 22 } } },
  // 「他种了两年地」：得先成了人、下过地
  { flag: { key: 'event:kindred-nephew-grown' } },
] as const

export const nephewScenes: SceneLibrary = {
  /**
   * 侄儿想去镇上。两边都来找了你——他先来找的你（小时候自己跑来过的那种孩子），
   * 或者哥来让你劝他。你说不说话、替谁说，是你的事；他走不走成，是老屋的事。
   */
  'nephew:restless': {
    id: 'nephew:restless',
    title: '侄儿想去镇上',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'flag', key: 'nephew-restless', value: true },
          { type: 'chronicle', text: '侄儿想去镇上当学徒。' },
        ],
        blocks: [{ kind: 'narration', text: '{call:nephew}想去镇上。' }],
        branches: [{ requires: [{ region: { harvest: { atMost: 40 } } }], next: 'why-hungry' }],
        next: 'why-restless',
      },
      'why-restless': {
        id: 'why-restless',
        blocks: [
          {
            kind: 'narration',
            text: '老屋那几亩地他种了两年。他说那几亩地一年到头看不见一个钱，镇上一家铺子肯收他当学徒。',
          },
        ],
        next: 'who-tells',
      },
      /** 荒年：温和、谨慎的孩子也想走——「更可能」不是「只允许」 */
      'why-hungry': {
        id: 'why-hungry',
        onEnter: [{ type: 'flag', key: 'nephew-restless-hungry', value: true }],
        blocks: [
          {
            kind: 'narration',
            text: '今年老屋没打下多少粮。他说他去镇上铺子里当学徒，家里少一张嘴，还能捎钱回来。',
          },
        ],
        next: 'who-tells',
      },
      'who-tells': {
        id: 'who-tells',
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'nephew-came' } }], next: 'asks-me' }],
        next: 'brother-tells',
      },
      'asks-me': {
        id: 'asks-me',
        blocks: [
          { kind: 'narration', text: '他先来找的你。他说，叔，你替我跟我爹讲一句。' },
          { kind: 'narration', text: '过了两天哥也来了，说，你去劝劝他。', tone: 'faint' },
        ],
        next: 'stand',
      },
      'brother-tells': {
        id: 'brother-tells',
        blocks: [
          { kind: 'narration', text: '哥来了一趟，说，你去劝劝他。他说这话的时候没看你。' },
          { kind: 'narration', text: '{call:nephew}没来找你。', tone: 'faint' },
        ],
        next: 'stand',
      },
      stand: {
        id: 'stand',
        blocks: [{ kind: 'narration', text: '这是他们父子的事。可话已经递到了你这儿。' }],
        choices: [
          {
            id: 'for-nephew',
            label: '替他说话',
            echo: '你去老屋，替他跟哥说了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'spoke-for-nephew', value: true },
              { type: 'meet', id: 'nephew', delta: 6, note: '他想去镇上，你替他说过话。' },
              { type: 'meet', id: 'brother', delta: -4, note: '你替他儿子说话，他记着。' },
              { type: 'chronicle', text: '你替侄儿说了话。' },
            ],
            next: 'said',
          },
          {
            id: 'for-brother',
            label: '劝他留下',
            echo: '你劝他，那几亩地总得有人种。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'spoke-for-brother', value: true },
              { type: 'meet', id: 'nephew', delta: -4, note: '他想去镇上，你劝他留下。' },
              { type: 'meet', id: 'brother', delta: 4, note: '他儿子想走，你帮他劝了。' },
              { type: 'chronicle', text: '你劝侄儿留下。' },
            ],
            next: 'said',
          },
          {
            id: 'stay-out',
            label: '不掺和',
            echo: '你没说话。',
            effects: [{ type: 'time', days: 1 }],
            next: 'said',
          },
        ],
      },
      said: {
        id: 'said',
        blocks: [
          { kind: 'narration', text: '这件事怎么了结，是老屋的事。你回了自己家。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 走没走成。**没有正文、不进编年**：那是老屋里的事，发生的时候你不在场。
   *
   * 分流表（先命中的算）：
   *
   *     刚硬暴躁的孩子 + 温和木讷的爹  → 走，亲厚（爹送他到镇上）
   *     刚硬暴躁的孩子                → 走，不睦（爹拦不住）
   *     温和木讷的孩子 + 你劝他留下    → 留，平常（他听了你的）
   *     温和木讷的爹                  → 走，亲厚
   *     精明谨慎的爹 + 你替孩子说了话  → 走，平常
   *     精明谨慎的爹 + 荒年           → 走，平常（少一张嘴）
   *     温和木讷的孩子                → 留，平常（他没再提）
   *     其余（精明谨慎的孩子撞上刚硬暴躁或精明谨慎的爹）→ 留，不睦
   *
   * 他爹、他自己、你、那一年——四样东西一起决定，没有一样能单独拍板。
   * `scripts/kindred.ts` 第十四条把这张表在二百一十六种组合上一格一格对过。
   */
  'nephew:goes': {
    id: 'nephew:goes',
    title: '走没走成',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'flag', key: 'nephew-restless', value: false }],
        blocks: [],
        branches: [
          { requires: [BOLD_NEPHEW, LENIENT_FATHER], next: 'blessed' },
          { requires: [BOLD_NEPHEW], next: 'defiant' },
          { requires: [SOFT_NEPHEW, SPOKE_FOR_BROTHER], next: 'stays-quiet' },
          { requires: [LENIENT_FATHER], next: 'blessed' },
          { requires: [COUNTING_FATHER, SPOKE_FOR_NEPHEW], next: 'allowed' },
          { requires: [COUNTING_FATHER, HUNGRY], next: 'allowed' },
          { requires: [SOFT_NEPHEW], next: 'stays-quiet' },
        ],
        next: 'stays-sour',
      },
      blessed: {
        id: 'blessed',
        onEnter: [{ type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '亲厚' }],
        blocks: [],
        next: 'leaves',
      },
      defiant: {
        id: 'defiant',
        onEnter: [{ type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '不睦' }],
        blocks: [],
        next: 'leaves',
      },
      allowed: {
        id: 'allowed',
        onEnter: [{ type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '平常' }],
        blocks: [],
        next: 'leaves',
      },
      /** 他走了：人在镇上，户在老屋，营生是他自己的。老屋还是种地的人家 */
      leaves: {
        id: 'leaves',
        onEnter: [
          {
            type: 'person',
            id: 'nephew',
            livelihood: '佣工',
            place: '{province} · {prefecture} · 镇上',
            doing: '在镇上铺子里当学徒',
          },
          { type: 'flag', key: 'nephew-went', value: true },
        ],
        blocks: [],
        branches: [{ requires: [BROTHER_CARPENTER], next: 'father-back' }],
        next: 'done',
      },
      /**
       * 哥在镇上做木匠、儿子又走了，地没人种。地不能荒——哥回来。
       * 他自己的营生清掉（`livelihood: null`），落回老屋的营生；人回到老屋（`backTo`）。
       * 这是「人的营生怎么清」的第一个使用者。
       */
      'father-back': {
        id: 'father-back',
        onEnter: [
          {
            type: 'person',
            id: 'brother',
            livelihood: null,
            backTo: 'old-home',
            doing: '回老屋种地',
          },
        ],
        blocks: [],
        next: 'done',
      },
      'stays-quiet': {
        id: 'stays-quiet',
        onEnter: [{ type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '平常' }],
        blocks: [],
        next: 'done',
      },
      'stays-sour': {
        id: 'stays-sour',
        onEnter: [{ type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '不睦' }],
        blocks: [],
        next: 'done',
      },
      done: {
        id: 'done',
        blocks: [],
      },
    },
  },

  /**
   * 父子和好了。哥病了一冬，是儿子守着的——也是你不在场的事。
   * 没有正文、不进编年；正月里娘告诉你，你才知道。
   */
  'nephew:mend': {
    id: 'nephew:mend',
    title: '那一冬',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'tie', from: 'nephew', to: 'brother', bond: '生父', terms: '亲厚' },
          { type: 'flag', key: 'father-son-mended', value: true },
        ],
        blocks: [],
      },
    },
  },
}

export const nephewEvents: readonly LifeEvent[] = [
  {
    // 精明、刚硬、暴躁的孩子在那几亩地上待不住
    id: 'nephew-restless',
    window: { from: 30, to: 75 },
    requires: [...NEPHEW_ON_THE_LAND, { temper: { id: 'nephew', in: ['精明', '刚硬', '暴躁'] } }],
    scene: 'nephew:restless',
    weight: 12,
  },
  {
    // 荒年谁都可能想走：温和、谨慎、木讷的孩子也会说「家里少一张嘴」
    id: 'nephew-restless-hungry',
    window: { from: 30, to: 75 },
    requires: [...NEPHEW_ON_THE_LAND, { region: { harvest: { atMost: 40 } } }],
    scene: 'nephew:restless',
    weight: 12,
  },
  {
    // 想走之后的下一年。走没走成看分流表；哪一种都把「想走」那面旗收掉
    id: 'nephew-goes',
    window: { from: 30, to: 78 },
    requires: [...TWO_HOUSES, NEPHEW_FARMS, { flag: { key: 'nephew-restless' } }],
    scene: 'nephew:goes',
    weight: 60,
  },
  {
    // 和好：哥老了病了一冬，是儿子守着的
    id: 'nephew-mend',
    window: { from: 36, to: 80 },
    requires: [
      ...TWO_HOUSES,
      FATHER_SON_SOUR,
      { family: { id: 'brother', age: { atLeast: 55 } } },
      { family: { id: 'nephew', alive: true } },
    ],
    scene: 'nephew:mend',
    weight: 8,
  },
]
