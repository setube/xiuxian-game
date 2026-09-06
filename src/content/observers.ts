import type { Lens, Observer } from '@/types/game'

/**
 * 尺子与看人的人。
 *
 * 这份文件回答一个问题：**为什么先生说的「聪明」和修士说的「悟性」不是一回事？**
 *
 * 因为他们手里的尺子不同。先生只能从背书快慢去推断，
 * 所以他量的「聪慧」里记性占七成；修士说的「悟性」才是单独那一样。
 * 一个记性 95、悟性 48 的孩子，在先生的尺子上是 81 分，
 * 在修士的尺子上是 48 分——两个人都没说谎。
 *
 * 再叠上判断力：炼气修士看悟性只有五十几分的准头，
 * 他说「悟性一般」的时候可能真的看错了，而玩家永远不会知道他看错了。
 */

// ============================================================
// 尺子
// ============================================================

/** 读书快慢。先生能看见的就这个，他管它叫「聪慧」 */
const BOOKISH: Lens = {
  id: 'bookish',
  weights: { memory: 7, insight: 3 },
  aspect: 'learning',
}

/** 身子骨。郎中和武人都看这个，说法不同 */
const PHYSIQUE: Lens = {
  id: 'physique',
  weights: { body: 9, will: 1 },
  aspect: 'body',
}

/** 悟性。修行界说的那个「悟」，凡人几乎无从判断 */
const COMPREHENSION: Lens = {
  id: 'comprehension',
  weights: { insight: 10 },
  aspect: 'cultivation',
}

/** 神魂。修士才看得见 */
const SPIRIT: Lens = {
  id: 'spirit',
  weights: { spirit: 8, will: 2 },
  aspect: 'cultivation',
}

/** 修行资质。这一样凡人一辈子都不会有人告诉他 */
const APTITUDE: Lens = {
  id: 'aptitude',
  weights: { root: 10 },
  aspect: 'root',
}

/**
 * 肯不肯守着。
 *
 * 这把尺子要紧在**它量的东西跟修行没有关系**。
 * 心志七成、身子三成——一个能天天卯时起来劈半个时辰柴的孩子，
 * 在这把尺子上是高分，而他的 `root` 可能薄得可怜。
 *
 * 药庐那位一辈子用这一把。他量得很准，可他把量到的数
 * 连到了一个错的结论上——「肯守着的人学得会」。
 * 呼吸法碰不碰得着那个地方看的是 `root` 和 `spirit`，跟肯不肯守着毫无关系。
 * **他不是看错了数，他是把数和结论连错了。**
 */
const PERSEVERANCE: Lens = {
  id: 'perseverance',
  weights: { will: 7, body: 3 },
  aspect: 'body',
}

// ============================================================
// 看人的人
// ============================================================

/**
 * 私塾先生。
 *
 * 判断力给到 78 不是因为他高明，是因为**他量的那样东西他确实内行**——
 * 一个教了三十年书的人，看谁背书快是很准的。
 * 他不准的地方在于：他以为自己在看「聪明」。
 */
export const TEACHER: Observer = {
  id: 'teacher',
  name: '周先生',
  readings: [
    {
      lens: BOOKISH,
      acuity: 78,
      calls: '记性',
      phrasing: [
        { atLeast: 85, says: '极好，一遍就能背下来。' },
        { atLeast: 70, says: '比旁人好些。' },
        { atLeast: 50, says: '还算过得去。' },
        { atLeast: 30, says: '要多念几遍才记得住。' },
        { atLeast: 0, says: '实在不大灵光。' },
      ],
      doubt: '你不知道这算不算一句夸奖。',
    },
    {
      /**
       * 第二句话，也是最要紧的一句。
       *
       * 先生量的还是同一样东西（读书快慢），但他说出口时用的词变了——
       * 从「记性」变成了「聪明」。玩家听到的是后者。
       *
       * 十六年后修士说「悟性一般」，玩家会觉得矛盾：
       * 明明先生说我聪明。他不会想到这两个词量的根本不是一回事。
       * 这个误解就是从这一行长出来的。
       */
      lens: BOOKISH,
      acuity: 62,
      calls: '',
      phrasing: [
        { atLeast: 85, says: '这孩子聪明。' },
        { atLeast: 70, says: '读书倒是不慢。' },
        { atLeast: 50, says: '还肯用功。' },
        { atLeast: 0, says: '要下些苦功才行。' },
      ],
      doubt: '「聪明」是什么意思？你说不上来，但你记住了这两个字。',
    },
  ],
}

/** 乡下郎中。看身体比宗门长老还准，看别的一概不看 */
export const PHYSICIAN: Observer = {
  id: 'physician',
  name: '坐堂的郎中',
  readings: [
    {
      lens: PHYSIQUE,
      acuity: 84,
      calls: '底子',
      phrasing: [
        { atLeast: 80, says: '很扎实，一年到头难得病一场。' },
        { atLeast: 60, says: '还算不错。' },
        { atLeast: 40, says: '寻常。' },
        { atLeast: 0, says: '有些虚，得将养。' },
      ],
    },
  ],
}

/** 乡间武者。也看身子骨，但他的话糙，档位也粗 */
export const FIGHTER: Observer = {
  id: 'fighter',
  name: '护送行商的把式',
  readings: [
    {
      lens: PHYSIQUE,
      acuity: 66,
      calls: '身子骨',
      phrasing: [
        { atLeast: 72, says: '硬朗，是块料。' },
        { atLeast: 45, says: '还行。' },
        { atLeast: 0, says: '太单薄了。' },
      ],
    },
  ],
}

/**
 * 炼气修士。
 *
 * 他是这套系统里最要紧的一个人——**第一个看得见「悟性」的人，
 * 也是最看不准的那一个**。判断力只有 52，他说「悟性一般」的时候
 * 很可能是错的，而玩家没有任何办法知道他错了。
 *
 * 多年以后遇上筑基修士，玩家才会发现两个人说的不一样。
 * 那一刻不是系统给玩家纠错，是玩家自己开始怀疑「一般」这两个字。
 */
export const ADEPT: Observer = {
  id: 'adept',
  name: '一名炼气修士',
  readings: [
    {
      lens: COMPREHENSION,
      acuity: 52,
      calls: '悟性',
      phrasing: [
        { atLeast: 78, says: '倒是不错。' },
        { atLeast: 55, says: '尚可。' },
        { atLeast: 35, says: '一般。' },
        { atLeast: 0, says: '差了些。' },
      ],
      doubt: '你不知道「悟性」指的是什么，也不知道「{}」是跟谁比。',
    },
    {
      lens: SPIRIT,
      acuity: 46,
      calls: '神魂',
      phrasing: [
        { atLeast: 70, says: '还算稳。' },
        { atLeast: 40, says: '尚可。' },
        { atLeast: 0, says: '有些散。' },
      ],
      doubt: '神魂是什么？你连自己有没有那样东西都不知道。',
    },
  ],
}

/**
 * 筑基修士。
 *
 * 他是第一个能看见「资质」的人，而且比炼气修士准得多。
 * 于是玩家会撞上那个最有意思的时刻：
 * 「资质倒是不错，可惜悟性不高」——两句话互相打架，
 * 而它们出自同一个人、同一次打量。
 */
export const MASTER: Observer = {
  id: 'master',
  name: '一名筑基修士',
  readings: [
    {
      lens: APTITUDE,
      acuity: 74,
      calls: '资质',
      phrasing: [
        { atLeast: 80, says: '很好。' },
        { atLeast: 60, says: '倒是不错。' },
        { atLeast: 40, says: '寻常。' },
        { atLeast: 0, says: '薄了些。' },
      ],
      doubt: '「资质」和「悟性」是同一样东西吗？你分不清。',
    },
    {
      lens: COMPREHENSION,
      acuity: 71,
      calls: '悟性',
      phrasing: [
        { atLeast: 78, says: '也高。' },
        { atLeast: 55, says: '尚可。' },
        { atLeast: 35, says: '不高。' },
        { atLeast: 0, says: '很钝。' },
      ],
    },
  ],
}

/**
 * 宗门长老。
 *
 * 全作判断力最高的人。他说的话最接近真实数据——
 * 但即便是他，说出口的也只是「不错」「普通」这样的词，
 * 而不是「资质 83、悟性 48」。
 *
 * 这是整套设计的底线：**没有任何人、在任何时候，会把数字告诉玩家。**
 */
export const ELDER: Observer = {
  id: 'elder',
  name: '宗门长老',
  readings: [
    {
      lens: APTITUDE,
      acuity: 92,
      calls: '资质',
      phrasing: [
        { atLeast: 80, says: '不错。' },
        { atLeast: 60, says: '还算可以。' },
        { atLeast: 40, says: '中等。' },
        { atLeast: 20, says: '偏下。' },
        { atLeast: 0, says: '不必修行了。' },
      ],
    },
    {
      lens: COMPREHENSION,
      acuity: 88,
      calls: '悟性',
      phrasing: [
        { atLeast: 78, says: '很高。' },
        { atLeast: 55, says: '中上。' },
        { atLeast: 35, says: '普通。' },
        { atLeast: 0, says: '偏低。' },
      ],
      doubt: '他说得平平淡淡，可你听出来这两句话分量不一样。',
    },
  ],
}

/**
 * 药庐那位。
 *
 * 他量得很准——88 的判断力，全作第三高，仅次于长老。
 * 可他量的是「肯不肯守着」，不是「能不能修行」。
 *
 * 他这辈子挑过很多人，挑得都对：他说能守住的，后来确实都守住了。
 * 所以他很信自己那把尺子。他不知道的是，
 * **他信的从来不是那把尺子，是他给那把尺子接上的那句结论。**
 *
 * 他身上还有一处跟别人不同：他不问「资质」这两个字。
 * 他甚至不觉得那是个正经问题。
 */
export const HERBALIST: Observer = {
  id: 'herbalist',
  name: '药庐里那位',
  readings: [
    {
      lens: PERSEVERANCE,
      acuity: 88,
      calls: '性子',
      phrasing: [
        { atLeast: 78, says: '沉得住。' },
        { atLeast: 58, says: '还坐得住。' },
        { atLeast: 38, says: '毛躁了些。' },
        { atLeast: 0, says: '一刻也待不下。' },
      ],
      doubt: '他打量你的时候没有问你的名字，也没问你识不识字。',
    },
    {
      lens: PHYSIQUE,
      acuity: 71,
      calls: '手脚',
      phrasing: [
        { atLeast: 70, says: '有力气。' },
        { atLeast: 45, says: '够用。' },
        { atLeast: 0, says: '拎不动药篓。' },
      ],
    },
  ],
}

const ALL: readonly Observer[] = [TEACHER, PHYSICIAN, FIGHTER, ADEPT, MASTER, ELDER, HERBALIST]

/** 按 id 取一个看人的人。剧本里写 `{ type: 'observe', observer: 'teacher' }` */
export function observerById(id: string): Observer | undefined {
  return ALL.find((item) => item.id === id)
}

export const OBSERVERS = ALL
