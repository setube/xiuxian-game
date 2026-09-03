import { ERRANDS } from '@/content/errands'
import { useCharacterStore } from '@/stores/character'
import { useDiaryStore } from '@/stores/diary'
import { useWorldStore } from '@/stores/world'
import type { Condition, NarrativeBlock, Topic } from '@/types/game'

import { meetsAll } from './conditions'
import { ask } from './inquire'
import { fillString } from './interpolate'
import { pickWeighted } from './random'
import { askAround } from './seeking'

/**
 * 跑一趟。
 *
 * ## 这一层跟 `seeking.ts` 差的是距离
 *
 * `follow()` 那一层是**远行**：攒够了线索、认准了一处地方、
 * 收拾两件衣裳走上十几日。一辈子多半只有一回，很多人一回也没有。
 *
 * 这一层是他家门口那几步路：去镇上、去渡口、找那个还没走的商旅、
 * 找先生问一句。**半天到三天，可以一趟一趟地去。**
 *
 * 从前这两件事之间是空的。「打听」在剧本里是一个按钮加一个月，
 * 一整年压成一句「这一年你逢人就绕着弯问」——
 * 那读起来像一项任务的进度条，而不像一个人在过日子。
 *
 * ## 三条规矩
 *
 * 1. **念头改变的是他会去哪儿，不是他去了会遇上什么。**
 *    没有那个念头的人，这几条路根本不在他眼里；有那个念头的人，
 *    同一天同一个村子里多出四个去处。而**去了以后世界怎么回应，
 *    跟他心里那个念头一点关系也没有。**
 *
 * 2. **结果只看那地方那天是什么样。** 渡口今天有没有船、
 *    那个商旅走没走，这些事在他动身之前就定了。
 *    跟 `follow()` 里那句「不看他多想找到」是同一条。
 *
 * 3. **他可能越问越远。** 这一层最要紧的一格是「你以为他知道」：
 *    对方摆摆手说不清楚，而一个心里存着念头的人会从这句话里
 *    读出「他清楚，只是不肯说」——于是记下一条根本不存在的线索。
 *    **那不是别人骗他，是他自己听出来的。**
 */

/** 那地方那天是什么样 */
export type Showing =
  /** 白跑一趟。今天没有船，那个人已经走了 */
  | '没碰上'
  /** 人在，可不是那么回事。船来了，船上没有他要找的那个 */
  | '人不对'
  /** 有人提起一个名字。听见了一句，真假不知道 */
  | '听见一句'
  /** 真问着了一个人。接下来是知不知道、肯不肯说 */
  | '问着了人'

/**
 * 一趟寻访。
 *
 * `days` 是这一趟唯一的时间真相——场景里那个 `{ type: 'time' }`
 * 从这里取，选项上的「耗 三日」也从这里取。**手抄第二遍就会漂。**
 */
export interface Errand {
  id: string
  /** 选项上写的那一句 */
  label: string
  /** 选完之后正文里的回响 */
  echo: string
  /**
   * 要花几日。
   *
   * 世界的最小刻度是日，所以「找先生问一句，半天就回来了」记作一日。
   * 四趟的分别不全在天数上——**跑得远的那两趟家里会有话说**，
   * 而那才是一个十几岁的人真正付的代价。
   */
  days: number
  /** 家里的脸面要减多少。跑远路的那两趟才有 */
  standing?: number
  /**
   * 还要满足什么才去得成。
   *
   * **这里是「念头改变他去找什么」那句话的正身。** 四趟都写着
   * 「心里得存着那个念头」，于是同一天同一个村子，有念头的人
   * 多出四个去处，没念头的人一个也看不见——而世界一寸没变。
   */
  requires?: readonly Condition[]
  /** 那地方那天可能是什么样。权重之比就是他这一趟的命 */
  turnouts: readonly Turnout[]
}

/** 那一天的一种样子 */
export interface Turnout {
  id: string
  kind: Showing
  weight: number
  /** 正文。写成数组就是连着几句 */
  text: string | readonly string[]
  /**
   * 「问着了人」才写：去问谁、问什么。
   *
   * 走的是打听那一套原样——知不知道、肯不肯说是两道闸，
   * 而他理解得对不对是第三件事。这一层不另造一套。
   */
  ask?: { who: string; about: Topic }
  /**
   * 「听见一句」才写：他这一趟听着了一条消息。
   *
   * 走 `askAround()`，所以真假由那张表定，玩家照样分不出来。
   */
  hears?: boolean
  /**
   * 他从这一趟里记下了什么。
   *
   * **`mistaken` 那一格是这一层的重头。** 找错了人、把沉默听成了
   * 「他知道但不肯说」——两样都会在认知里留下一条他自己深信不疑的东西，
   * 而世上根本没有那回事。
   */
  takes?: {
    id: string
    title: string
    summary: string
    mistaken?: '事实' | '因果'
  }
  /**
   * 这一趟让他认准了一处地方。
   *
   * 打听那条路上，他要攒到**两条不相干的消息指向同一处**才敢动身。
   * 可有些话不需要第二个人来印证——一个老人说他年轻时替那位道人
   * 挑过水，说得有名有姓有年份，听的人当场就信了。
   *
   * **而「他确信」跟「那是真的」是两回事。**
   */
  points?: string
  /** 这一天沾着什么。日后的新知识靠它把这一天找回来 */
  tags?: readonly string[]
}

/**
 * 此刻他能跑哪几趟。
 *
 * **可做什么，本身就是处境的一部分**——这句话在日常那一层已经写过一遍，
 * 这里是它在念头上的同一条：一个从没想过这些的人，
 * 站在同一个村口，看见的是同一个商旅，而他不会想到去渡口。
 */
export function errandsNow(): Errand[] {
  return ERRANDS.filter((errand) => meetsAll(errand.requires))
}

export function errandById(id: string): Errand | undefined {
  return ERRANDS.find((errand) => errand.id === id)
}

/** 跑完一趟之后 */
export interface Visit {
  errand: Errand
  turnout: Turnout
  blocks: NarrativeBlock[]
  /** 这一趟他手里多了点什么吗。**多了不等于对** */
  got: boolean
}

/**
 * 跑一趟。
 *
 * 掷的那一下**只看那地方那天是什么样**——权重表里没有一项读他的属性，
 * 也没有一项读他的念头。他心思再细，渡口今天也不会因此多来一条船。
 *
 * 这跟打听那一层是有意分开的：`askAround()` 里 `insight` 是算数的，
 * 因为那说的是「他问得多、问得对」；而船来不来是世界的事。
 */
export function goOn(errandId: string): Visit | null {
  const errand = errandById(errandId)
  if (!errand) {
    console.error(`剧本让人去跑一趟不存在的寻访：${errandId}`)
    return null
  }

  const world = useWorldStore()
  const character = useCharacterStore()

  const turnout = pickWeighted(errand.turnouts, (one) => one.weight)
  if (!turnout) return null

  const blocks: NarrativeBlock[] = lines(turnout).map((text) => ({
    kind: 'narration',
    text: fillString(text),
  }))
  let got = false

  // 有人提起一个名字。真假由线索表定，他照样分不出来
  if (turnout.hears) {
    const lead = askAround()
    if (lead) {
      got = true
      character.learn({
        id: `lead:${lead.id}`,
        title: '听来的一件事',
        summary: lead.believes,
        category: '修行',
        at: world.time,
        contact: '听说',
        interpretation: '猜想',
        mistaken: lead.truth === '假' ? '事实' : undefined,
      })
      blocks.push({ kind: 'dialogue', text: lead.says })
      blocks.push({ kind: 'narration', text: '你记住了。', tone: 'faint' })
    } else {
      blocks.push({
        kind: 'narration',
        text: '话头绕了半天，绕到别处去了。',
        tone: 'faint',
      })
    }
  }

  // 真问着了一个人。知不知道、肯不肯说，是两道闸
  if (turnout.ask) {
    const reply = ask(turnout.ask.who, turnout.ask.about)
    blocks.push(...reply.blocks)
    if (reply.learned) {
      got = true
      character.learn({
        id: reply.learned.id,
        title: reply.learned.title,
        summary: reply.learned.summary,
        category: reply.learned.category,
        at: world.time,
        contact: reply.contact,
        interpretation: reply.interpretation,
        mistaken: reply.mistaken,
      })
    }
    blocks.push(...misread(reply.held))
  }

  // 他这一趟记下了点什么。可能整条都是他自己听出来的
  if (turnout.takes) {
    got = true
    character.learn({
      id: turnout.takes.id,
      title: turnout.takes.title,
      summary: turnout.takes.summary,
      category: '修行',
      at: world.time,
      contact: '听说',
      interpretation: '确信',
      mistaken: turnout.takes.mistaken,
    })
  }

  /**
   * 他认准了一处地方。
   *
   * 落的是 `following` 那个旗标——跟「两条对上了」用的是同一个，
   * 于是跑一趟走的也是同一个 `follow()`。**他自己分不出
   * 这一回的把握是从哪儿来的**，引擎这边也不必替他分。
   */
  if (turnout.points) {
    world.setFlag('following', turnout.points)
    world.setFlag('sure-of', turnout.points)
  }

  /**
   * 白跑的那些趟也要记账。
   *
   * 找了这些年一件对得上的也没有，这件事本身会把念头压下去——
   * 而那需要一个数。**「他放弃了」不该是玩家点了「算了」那一下，
   * 应该是这个数攒够了。**
   */
  if (!got) {
    const empty = Number(world.getFlag('errands-empty') ?? 0) + 1
    world.setFlag('errands-empty', empty)
    if (empty >= GAVE_UP_AT) world.setFlag('came-up-empty', true)
  }

  // 这一趟进日录。多年以后那一句要靠它把这一天找回来
  useDiaryStore().jot(
    blocks.map((block) => ('text' in block ? block.text : '')).filter((text) => text.length > 0),
    turnout.tags ?? [],
  )

  return { errand, turnout, blocks, got }
}

/**
 * 白跑几趟算「什么也没找到」。
 *
 * 四趟是量出来的：一趟白跑是运气，两趟是巧，
 * **四趟之后一个十几岁的人真的会开始怀疑这件事本身。**
 * 而念头那一层的压制规则读的就是这个旗标。
 */
export const GAVE_UP_AT = 4

/**
 * 他没问出什么，可他觉得对方知道。
 *
 * ## 这一格是「越问越远」的那条路
 *
 * 打听那一层把「他不知道」和「他不肯说」分成两句话，
 * 说的是**玩家分得出来**。可分得出来不等于他会往对的方向想——
 *
 *     对方摆摆手，说了句「不清楚」。
 *     一个心里没装着这件事的人，转身就忘了。
 *     一个找了两年的人，会记一辈子：他清楚，他只是不肯说。
 *
 * 所以这一格只在他心里存着念头的时候才落，而落下来的是
 * `mistaken: '事实'`——世上根本没有「那个人知道些什么」这回事。
 * **他不是被谁骗了，是他自己听出来的。**
 */
function misread(held: '不知道' | '不肯说' | undefined): NarrativeBlock[] {
  if (held !== '不肯说') return []
  const world = useWorldStore()
  if (!world.hasFlag('leaning:know')) return []

  useCharacterStore().learn({
    id: 'someone-who-knows',
    title: '有个人知道',
    summary: '有个人是知道的，只是不肯跟你说。你记住了他的样子。',
    category: '修行',
    at: world.time,
    contact: '听说',
    interpretation: '确信',
    mistaken: '事实',
  })
  return [{ kind: 'narration', text: '他不肯说。可你看得出来他是知道的。', tone: 'deep' }]
}

/** 把一趟的正文摊成几句 */
export function lines(turnout: Turnout): readonly string[] {
  return typeof turnout.text === 'string' ? [turnout.text] : turnout.text
}
