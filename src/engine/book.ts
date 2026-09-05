import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock, OriginId } from '@/types/game'

import { pickWeighted } from './random'

/**
 * 庙前货郎那一册书。
 *
 * 跟山道上那个人（`wounded.ts`）走的是同一套五节点，
 * 但它验的是**完全相反的一种机缘**：
 *
 *   山道：看见人 → 判断 → 是否管 → 行动 → 当场知道结果
 *   旧书：看见书 → 判断 → 是否在意 → 是否取得 → 揣十年 → 多年后才明白
 *
 * ## 所以这一支真正要证明的是
 *
 * **抓住机会 ≠ 当场获得答案。**
 *
 * 山道上的误读通常在伸手那一刻就被戳破——你以为是醉汉，
 * 他睁开眼，你立刻知道自己错了。
 *
 * 而这一册书的误读**可以揣着走十年**。你管它叫「外乡人的账册」，
 * 每隔一阵翻一次，越翻越笃定，直到十六岁那年渡口上有人扫了一眼，
 * 说出它真正的名字。在那之前，你的认知是完整的、自洽的、错的。
 *
 * 这让 `mistaken` 从一次剧情判定变成**人物长期认知的一部分**。
 */

/** 那册书究竟是什么。世界事实，玩家永远看不到这一行 */
export type BookTruth = '废纸' | '符书' | '账册' | '药方' | '残卷' | '禁书'

/** 玩家翻了两页之后，认定它是什么 */
export type BookReading = '废纸' | '古怪的字' | '账册' | '药方' | '值钱的' | '不该看的'

const TRUTH_ODDS: readonly { value: BookTruth; weight: number }[] = [
  { value: '废纸', weight: 26 },
  { value: '符书', weight: 22 },
  { value: '账册', weight: 18 },
  { value: '药方', weight: 12 },
  { value: '残卷', weight: 12 },
  { value: '禁书', weight: 10 },
]

/** 掷定这一册是什么。在玩家伸手翻开之前就已经定了 */
export function rollBookTruth(): BookTruth {
  return pickWeighted(TRUTH_ODDS, (item) => item.weight)?.value ?? '废纸'
}

interface Guess {
  reading: BookReading
  /** 他心里那句话 */
  says: string
  /** 他会管它叫什么。买下来之后行囊里就是这个名字 */
  calls: string
  /** 他会怎么跟自己解释这件事。这句会进知识面板 */
  believes: string
  /** 哪几种真相下这算读对了 */
  fits: readonly BookTruth[]
  base: number
}

const GUESSES: readonly Guess[] = [
  {
    reading: '废纸',
    says: '看着也没什么特别的。就是旧了点。',
    calls: '一册旧纸',
    believes: '庙前货郎那里论斤称的旧纸。没什么特别的。',
    fits: ['废纸'],
    base: 30,
  },
  {
    reading: '古怪的字',
    says: '这些字……笔画是清楚的，可一个也不像自己认识的。',
    calls: '一册看不懂的书',
    believes: '上面的字笔画清楚，却一个也不认得。不知道是什么。',
    fits: ['符书', '残卷', '禁书'],
    base: 20,
  },
  {
    reading: '账册',
    says: '一行一行的，像是谁家记账的本子。',
    calls: '一册旧账',
    believes: '像是哪家铺子的旧账本。不知道怎么流落到这儿的。',
    fits: ['账册'],
    base: 16,
  },
  {
    reading: '药方',
    says: '一味一味往下排。像手抄的方子。',
    calls: '一册手抄方子',
    believes: '像是谁手抄的药方。有几味听都没听过。',
    fits: ['药方'],
    base: 12,
  },
  {
    reading: '值钱的',
    says: '这纸比家里糊窗的强得多。说不定值几个钱。',
    calls: '一册好纸的书',
    believes: '纸很好，比家里用的强得多。留着，兴许值钱。',
    fits: [],
    base: 14,
  },
  {
    reading: '不该看的',
    says: '这东西不像附近人家会有的。最好别声张。',
    calls: '一册不该声张的书',
    believes: '这不是本地人家该有的东西。你没跟人提过。',
    fits: ['禁书', '残卷'],
    base: 10,
  },
]

/** 翻了两页之后看出来的东西 */
export interface Appraisal {
  reading: BookReading
  says: string
  calls: string
  believes: string
  /** 他读错了。玩家看不见 */
  mistaken: boolean
}

/**
 * 他翻了两页，心里有了个判断。
 *
 * 跟山道那一支同样的立场：**误读不是随机发错答案，是从见识里长出来的。**
 * 但这里多一条山道上没有的东西——**出身直接塑造误读的形状**：
 *
 * - 药铺的孩子从小认药，看见一册手抄本第一反应是方子
 * - 做买卖的人家，孩子成天见账，一行一行的就是账
 * - 不认字的人根本走不到「这些字很怪」那一层，对他只是纸
 *
 * 三个人站在同一个摊子前，看见的是三册不同的书。
 */
/** 从小在官府文书边上长大的那三行出身。见下面「不该看的」那一段 */
const BRED_NEAR_OFFICE: readonly OriginId[] = ['office', 'manor', 'court']

export function appraise(truth: BookTruth): Appraisal {
  const character = useCharacterStore()
  const household = useHouseholdStore()
  const attributes = character.attributes
  const literate = character.knows('literacy')

  const weighted = GUESSES.map((guess) => {
    let weight = guess.base

    /**
     * 认字是一道硬闸。
     *
     * 不认字的人翻开只看见一片墨，他读不出「这些字很怪」，
     * 也读不出「像账」「像方子」——那三种判断都要求先认得字是什么样。
     * **他这一生都不会知道自己错过了什么。**
     */
    if (
      !literate &&
      (guess.reading === '古怪的字' || guess.reading === '账册' || guess.reading === '药方')
    ) {
      return { guess, weight: 0 }
    }

    if (guess.reading === '古怪的字') {
      weight += Math.max(0, attributes.insight - 40) * 0.8
    }

    if (guess.reading === '账册') {
      // 成天见账的人家。问的是**业**：布庄、客栈、酒楼三家的柜台上
      // 摆的是同一样东西，上一版这里得把三个行当各点一次
      if (household.livelihood === '经商') weight += 26
      if (household.station === '仕宦') weight += 10
    }

    if (guess.reading === '药方') {
      // 问的是**产**。行医的未必坐堂，可药柜是实打实摆在那儿的
      if (household.business === '药铺') weight += 34
    }

    if (guess.reading === '不该看的') {
      /**
       * 见过官府脸色的人家，孩子对「这东西不该留」格外敏感。
       *
       * 这一条问的是**出身主键**，跟上面两条不是一个路子，理由值得写下来：
       * 这份敏感是在那个院子里养出来的，而家世那一格会被一道旨意改掉。
       * 写成 `station !== '寻常'` 更短，可削爵那天他就「忘了」
       * 从小听惯的那句「这个不许往外说」——一个人不会那样忘事。
       */
      if (BRED_NEAR_OFFICE.includes(household.origin)) weight += 18
      weight += Math.max(0, attributes.insight - 48) * 0.6
    }

    if (guess.reading === '值钱的') {
      // 紧巴的人家先看见的是纸，不是字
      if (household.standing < 40) weight += 12
    }

    if (guess.reading === '废纸') {
      weight -= Math.max(0, attributes.insight - 38) * 0.7
      weight = Math.max(3, weight)
    }

    return { guess, weight }
  }).filter((item) => item.weight > 0)

  const chosen = pickWeighted(weighted, (item) => item.weight)?.guess ?? GUESSES[0]!

  return {
    reading: chosen.reading,
    says: chosen.says,
    calls: chosen.calls,
    believes: chosen.believes,
    mistaken: !chosen.fits.includes(truth),
  }
}

/**
 * 问货郎。
 *
 * 这一节是这支机缘最要紧的地方：**玩家问的问题由他的误读决定，
 * 而答案由真相决定。** 他以为那是账册，就会去问「这是哪家铺子的账」——
 * 于是他得到的是一条关于铺子的线索，而不是关于这册书的。
 *
 * 他的错误理解不会被戳破，只会把他领到别处去。
 * 有时候那个别处比原路更有意思。
 */
export interface PedlarReply {
  blocks: NarrativeBlock[]
  /** 问出来的那条线索。可能跟这册书毫无关系 */
  learned?: { id: string; title: string; summary: string; category: '世事' | '地理' | '器物' }
  /** 他问完之后对这册书的说法有没有变 */
  hardens: boolean
}

const ASKS: Record<BookReading, string> = {
  废纸: '这纸是哪来的？',
  古怪的字: '这上头写的是什么字？',
  账册: '这是哪家铺子的账？',
  药方: '这方子是谁抄的？',
  值钱的: '这书能值几个钱？',
  不该看的: '这东西……留着要紧吗？',
}

export function askPedlar(truth: BookTruth, reading: BookReading): PedlarReply {
  const blocks: NarrativeBlock[] = [
    { kind: 'narration', text: '你把书翻给货郎看。' },
    { kind: 'dialogue', speaker: '你', text: ASKS[reading] },
  ]

  // 货郎是个走街串巷的人。他认得纸、认得路，不认得字
  if (reading === '账册' || reading === '药方') {
    /**
     * 他问错了问题，于是得到一个跟这册书无关的答案——
     * **但那个答案本身是真的，而且有用。**
     */
    blocks.push(
      { kind: 'narration', text: '货郎凑过来看了一眼，笑了。' },
      { kind: 'dialogue', text: '我不识字。这一叠是从西头那户破屋里收的。' },
      { kind: 'narration', text: '他说那户人家早几年就没人了，屋子塌了半边。' },
      { kind: 'dialogue', text: '听说男人是外路来的，在这儿住了没几年。' },
      { kind: 'narration', text: '你把书收好。这一趟你没问出书的来历，倒问出了一户人家。' },
    )
    return {
      blocks,
      hardens: true,
      learned: {
        id: 'the-ruined-house',
        title: '西头那户破屋',
        summary: '货郎那一叠旧纸是从西头一户破屋里收的。男人是外路来的，住了没几年就没人了。',
        category: '地理',
      },
    }
  }

  if (reading === '不该看的' || reading === '古怪的字') {
    // 问对了方向，可他问的人不懂。真相还在原地
    blocks.push(
      { kind: 'narration', text: '货郎捻了捻纸角，摇头。' },
      { kind: 'dialogue', text: '不是我这一路的货。' },
      { kind: 'narration', text: '他又捻了一下，忽然凑近了些。' },
      { kind: 'dialogue', text: '这纸……府城当铺里我见过一回。人家不收。' },
      { kind: 'narration', text: '你问为什么不收。' },
      { kind: 'dialogue', text: '不知道。掌柜的看了一眼就摆手，脸都白了。' },
      { kind: 'narration', text: '他把书还给你，转身去招呼别的客人了。' },
      {
        kind: 'narration',
        text: '你什么也没得到，只是多了一件不明白的事。',
        tone: 'faint',
      },
    )
    return {
      blocks,
      hardens: true,
      learned: {
        id: 'pawnshop-refused',
        title: '当铺不收的纸',
        summary: '货郎说府城当铺见过这种纸，掌柜的看一眼就摆手，脸都白了。他不知道为什么。',
        category: '器物',
      },
    }
  }

  // 问「值几个钱」「哪来的」——货郎按生意回答，一句实话
  blocks.push(
    { kind: 'narration', text: '货郎瞥了一眼，随口应了。' },
    { kind: 'dialogue', text: '论斤称的。你要就拿去。' },
    { kind: 'narration', text: '他忙着招呼别人，没再理你。' },
    {
      kind: 'narration',
      text: truth === '废纸' ? '看来真就是一叠废纸。' : '你把书翻来覆去看了一会儿，还是那样。',
      tone: 'faint',
    },
  )
  return { blocks, hardens: false }
}

/**
 * 多年之后，这册书在他心里变成了什么。
 *
 * **不是把认知修正，是把认知固化。**
 * 他每隔一阵拿出来翻一次，一次也没看懂，于是那个最初的判断
 * 一年比一年结实——从「大概是」变成「就是」。
 *
 * 引擎在这里只升 `grasp`，不碰 `mistaken`：
 * 他更确信了，但他没有更接近真相。这两件事在这套系统里是正交的。
 */
export function hardened(believes: string): string {
  return believes.replace(/^像是/, '就是').replace(/^大概是/, '就是')
}

/** 十六岁那年，有人说出它真正的名字 */
export interface Naming {
  /** 那件东西真正的名字。行囊里的名字会换成它 */
  name: string
  /** 换名之后的注脚 */
  note: string
  /** 他这一刻对这册书的说法 */
  summary: string
  /** 青衫人说的那句 */
  said: string
  /**
   * 他站在渡口上，最后明白过来的那一句。
   *
   * **每种真相的余韵完全不同**：写坏的符书是白揣了几年，
   * 残卷是从此有了一件要追下去的事，禁书是背上了一样甩不掉的东西。
   * 一句通用的收尾会把这六种人生抹平成同一种。
   */
  aftermath: string
  /** 这一句值不值得他往后一直记着 */
  chronicle: string
}

const NAMINGS: Record<BookTruth, Naming> = {
  废纸: {
    name: '一叠旧纸',
    note: '庙前货郎那里论斤买的。有人看过，说什么也不是。',
    summary: '那册书什么也不是。有人看了一眼就说，废纸。',
    said: '「废纸。谁家的旧簿子。」',
    aftermath: '这些年你把它当成一件要紧的东西。它不是。而那几文钱，也就是几文钱。',
    chronicle: '你揣了几年的那册书，什么也不是。',
  },
  符书: {
    name: '写坏的符书',
    note: '庙前货郎那里买的。有人说，是写坏的。没有用。',
    summary: '那册是符书。写坏的，没有用。',
    said: '「符书。写坏的。」',
    aftermath: '你揣了几年的东西没有用。可你也知道了——世上真有写得对的那一种。',
    chronicle: '你揣了几年的那册书，是写坏的符书。',
  },
  账册: {
    name: '外乡商号的旧账',
    note: '庙前货郎那里买的。有人认出是北边一家商号的账。',
    summary: '那册是北边一家商号的旧账。那家早没了。',
    said: '「账。北边的号，早没了。」',
    aftermath: '一本死了的铺子的账。可它是从西头那户破屋里出来的——那家人是打北边来的。',
    chronicle: '你揣了几年的那册书，是一家早已散掉的商号的账。',
  },
  药方: {
    name: '手抄药方',
    note: '庙前货郎那里买的。有人说方子是真的，只是抄漏了几味。',
    summary: '那册是手抄的药方。方子是真的，抄漏了几味。',
    said: '「方子。抄漏了。」',
    aftermath: '方子是真的。抄漏的那几味，得有人补得上才行。',
    chronicle: '你揣了几年的那册书，是一册抄漏了的药方。',
  },
  残卷: {
    name: '不知名的残卷',
    note: '庙前货郎那里买的。有人看了很久，只说不全。',
    summary: '那册是某样东西的残页。有人看了很久，说它不全。',
    said: '「……哪来的。」',
    aftermath: '他看了很久才把书还给你，只说了两个字：不全。他没说那是什么。',
    chronicle: '你揣了几年的那册书，有人看了很久，只说不全。',
  },
  禁书: {
    name: '不该留的书',
    note: '庙前货郎那里买的。有人说，别叫人看见。',
    summary: '那册书不该留。有人叮嘱过，别叫人看见。',
    said: '「收起来。别叫人看见。」',
    aftermath: '你把书塞回怀里，手心是汗。这些年它一直在你箱子底下，而你不知道。',
    chronicle: '你揣了几年的那册书，有人叮嘱你别叫人看见。',
  },
}

/** 那一刻他终于知道那是什么 */
export function nameIt(truth: BookTruth): Naming {
  return NAMINGS[truth] ?? NAMINGS['废纸']
}

/** 把这一趟的判断写进世界。真相与认知分开存 */
export function recordBook(seen: Appraisal, truth: BookTruth): void {
  const world = useWorldStore()
  world.setFlag('pedlar-book', truth)
  world.setFlag('pedlar-book-reading', seen.reading)
  world.setFlag('pedlar-book-misread', seen.mistaken)
}

/**
 * 按当初那个判断查表。
 *
 * `appraise()` 是带权重的一掷，**再调一次会得到别的答案**。
 * 所以「他管它叫什么」「他怎么跟自己解释」必须从旗标里那个
 * 已经定下来的 reading 查回来，不能重算——
 * 否则同一个人在同一件事上会有两种说法。
 */
function guessOf(reading: BookReading): Guess {
  return GUESSES.find((guess) => guess.reading === reading) ?? GUESSES[0]!
}

/** 他管这册书叫什么 */
export function bookCalls(reading: BookReading): string {
  return guessOf(reading).calls
}

/** 他会怎么跟自己解释这册书 */
export function bookBelieves(reading: BookReading): string {
  return guessOf(reading).believes
}
