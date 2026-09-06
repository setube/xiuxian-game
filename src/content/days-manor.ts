import type { Beat, Doing } from '@/engine/daily'
import type { Condition } from '@/types/game'

/**
 * 王府的一天。
 *
 * ## 不是宫里换个称号，也不是农家换身衣裳
 *
 * 「去镇上」「找村里的孩子玩」「往山那边走走」对王府的孩子不成立——不是不许，
 * 是门房不放。他能去的是园子、前殿、书房；他遇见的不是邻居家的孩子，
 * 是乳母、管事、婢女、门房、长史。**「贵」不在东西上，在人有多少、规矩有多少、
 * 谁替谁办事、什么事不用亲自做**：饭是人端来的，门是人看着的，父王见客有人通报。
 *
 * 用户 2026-09-06 立的三条：王府是另一套生活空间；宗室身份和具体人物分开
 * （管事的脾气是掷的，不因为在王府就体面）；府里的下人是真人（`birth.ts` 立的）。
 * 这一册是第一座真实王府逼出来的，写的只有它要的那几样，不是一套 RoyalLifeSystem。
 */

const MANOR: Condition = { dwelling: { kind: ['王府'] } }

export const MANOR_DOINGS: readonly Doing[] = [
  {
    id: 'garden',
    label: '在园子里待着',
    slots: ['上午', '下午'],
    requires: [MANOR],
    echo: '你在园子里待了半日。',
  },
  {
    id: 'front-hall',
    label: '往前殿那边看看',
    slots: ['上午', '下午'],
    requires: [MANOR],
    echo: '你往前殿去了。',
  },
  {
    id: 'study',
    label: '去书房',
    slots: ['上午'],
    requires: [
      MANOR,
      { flag: { key: 'schooled', equals: true } },
      // 王府的先生是教授（`tutor`），不是村塾那位（`teacher`）
      { family: { id: 'tutor', alive: true } },
    ],
    echo: '你去了书房。',
  },
]

export const MANOR_BEATS: readonly Beat[] = [
  // 园子：府里的人在这儿露面
  {
    doing: 'garden',
    tags: ['王府'],
    tier: '无事',
    weight: 40,
    text: ['桂花开了。婢女在树下扫叶子，见你来了停下手，等你过去了再扫。'],
  },
  {
    doing: 'garden',
    tags: ['王府'],
    tier: '无事',
    weight: 30,
    requires: [{ family: { id: 'nurse', alive: true } }],
    text: ['你在池边看了半天鱼。', '{call:nurse}在后头站着，一步没走开。'],
  },
  {
    doing: 'garden',
    tags: ['王府'],
    tier: '处境',
    weight: 22,
    requires: [{ family: { id: 'steward', alive: true } }],
    text: [
      '{call:steward}领着两个匠人在修廊子。',
      '见你来了，三个人都停下手行礼。你走远了，锤子声才又响起来。',
    ],
  },
  {
    doing: 'garden',
    tags: ['王府'],
    tier: '见闻',
    weight: 12,
    text: ['园子东墙外是街。你听见有人在墙那边卖东西，吆喝了一上午。', '你没见过他。'],
  },
  // 前殿：出入规则、府务、会客
  {
    doing: 'front-hall',
    tags: ['王府'],
    tier: '无事',
    weight: 40,
    text: ['前殿有客。长史在廊下候着，见你来了，弯腰把你劝了回去。'],
  },
  {
    doing: 'front-hall',
    tags: ['王府'],
    tier: '处境',
    weight: 30,
    text: ['{elder}在见府里的属官。你在门外站了一会儿，没人放你进去，也没人赶你。'],
  },
  {
    doing: 'front-hall',
    tags: ['王府'],
    tier: '见闻',
    weight: 16,
    requires: [{ family: { id: 'gatekeeper', alive: true } }],
    text: [
      '{call:gatekeeper}把一个来求见的人挡在门外。那人在门口站到晌午，走了。',
      '你问他那是谁。他说，不是府里的人。',
    ],
  },
  {
    doing: 'front-hall',
    tags: ['王府'],
    tier: '见闻',
    weight: 14,
    text: ['今日府里来了客，是{elder}的堂弟，郡王府的。', '两个人在前殿说到天黑，你一个字也没听见。'],
  },
  // 书房：教授不是先生
  {
    doing: 'study',
    tags: ['王府'],
    tier: '无事',
    weight: 40,
    text: ['教授今日讲的是《孝经》。书房里只有你一个人，念得慢也没人催。'],
  },
  {
    doing: 'study',
    tags: ['王府'],
    tier: '处境',
    weight: 22,
    text: ['你写的字教授看了半晌，没说好也没说不好。', '酉时一到他就走了。他家在城里。'],
    effects: [{ type: 'attribute', key: 'memory', delta: 1 }],
  },
  // 待在家里：起居、用饭、请安——王府的「家里」跟农家的不是一回事
  {
    doing: 'home',
    tags: ['王府'],
    tier: '无事',
    weight: 40,
    requires: [MANOR],
    text: ['清早去给{dam}请安。她还没起，你在外间等了一炷香。'],
  },
  {
    doing: 'home',
    tags: ['王府'],
    tier: '无事',
    weight: 34,
    requires: [MANOR],
    text: ['饭是婢女端来的，四样菜，你一个人吃。', '{elder}今日回府得晚。'],
  },
  {
    doing: 'home',
    tags: ['王府'],
    tier: '处境',
    weight: 18,
    requires: [MANOR, { family: { id: 'nurse', alive: true } }],
    text: ['{call:nurse}今日说起她乡下的孩子，跟你差不多大。', '说了两句，她就不说了。'],
  },
]
