import { LEADS, placeById } from '@/content/leads'
import { useCharacterStore } from '@/stores/character'
import { useWorldStore } from '@/stores/world'
import type { NarrativeBlock } from '@/types/game'
import type { AtTheDoor, Following, Lead } from '@/types/lead'

import { meetsAll } from './conditions'
import { pickWeighted, randomBetween } from './random'

/**
 * 找。
 *
 * ## 修行的第一关不是学不会，是不知道去哪找
 *
 * 一个凡人有了「想弄明白修行」这个念头之后，他能做的只有打听。
 * 而他打听到的东西里绝大多数是假的——**他手里没有任何工具可以分辨**。
 *
 * 唯一的两样办法都要花时间，而且都可能白花：
 *
 *     跑一趟看看
 *     听第二个人说同一件事
 *
 * ## 这一册刻意不碰的东西
 *
 * 没有功法，没有炼气，没有境界。**因为那些是门里的事**，
 * 而这一册讲的是一个人怎么走到门口——
 * 而绝大多数人一辈子也没走到。
 */

/** 他打听了一回。多半什么也没听着 */
export function askAround(): Lead | null {
  const world = useWorldStore()
  const character = useCharacterStore()

  const heard = (world.getFlag('leads-heard') as string | undefined) ?? ''
  const pool = LEADS.filter((lead) => !heard.includes(lead.id) && meetsAll(lead.requires))
  if (pool.length === 0) return null

  /**
   * 多半什么也没听着。
   *
   * 心思细的人问得多、问得对，可这一条**帮不了他分辨真假**——
   * 它只让他听到更多消息，而消息里假的仍然占大头。
   */
  const luck = randomBetween(1, 100)
  if (luck > 30 + character.attributes.insight * 0.35) return null

  const lead = pickWeighted(pool, (item) => item.weight)
  if (!lead) return null
  world.setFlag('leads-heard', `${heard}|${lead.id}`)
  return lead
}

/** 他攒下的线索 */
export function leadsHeard(): Lead[] {
  const heard = (useWorldStore().getFlag('leads-heard') as string | undefined) ?? ''
  return LEADS.filter((lead) => heard.includes(lead.id))
}

/**
 * 有没有哪一处被两条不相干的消息指到了。
 *
 * **这是玩家唯一能用的工具。** 他分不出真假，可他数得清有几个人
 * 说了同一件事——而假消息是各说各的，真消息会撞在一起。
 *
 * 这一条不是保证：说书人那一段和卖符的那一段也可能凑巧撞上，
 * 那时候他会满怀把握地跑去一个根本不存在的地方。
 */
export function crossed(): string | null {
  const counts = new Map<string, number>()
  for (const lead of leadsHeard()) {
    if (!lead.points) continue
    counts.set(lead.points, (counts.get(lead.points) ?? 0) + 1)
  }
  for (const [place, n] of counts) {
    if (n >= 2) return place
  }
  return null
}

/** 跑一趟的结果 */
export interface Trip {
  outcome: Following
  blocks: NarrativeBlock[]
  /** 这一趟之后他离门口更近了吗 */
  closer: boolean
}

/**
 * 跟着一条线索跑一趟。
 *
 * **世界怎么回应，只看那地方到底是什么，不看他多想找到。**
 * 这跟机缘那边是同一条：他的选择改变的是自己撞上什么，
 * 不是把那地方变成他希望的样子。
 */
export function follow(placeId: string): Trip {
  const place = placeById(placeId)
  const world = useWorldStore()
  const insight = useCharacterStore().attributes.insight

  if (!place) {
    return {
      outcome: '扑了个空',
      closer: false,
      blocks: [
        { kind: 'narration', text: '你按人说的地方找了三天。' },
        { kind: 'narration', text: '没有这个地方。问了好几个人，都说没听过。' },
        { kind: 'narration', text: '你在路边坐了很久才往回走。', tone: 'faint' },
      ],
    }
  }

  if (!place.real) {
    /**
     * 那地方在，可什么也没有。
     *
     * 有一小半的时候，那儿还站着个等生意的人——**去那种地方的
     * 都是他这样的**，而那正是骗子挑地方的道理。
     */
    if (randomBetween(1, 100) <= 35) {
      world.setFlag('was-cheated', true)
      return {
        outcome: '被人骗了',
        closer: false,
        blocks: [
          { kind: 'narration', text: `你找到了${place.calls}。` },
          { kind: 'narration', text: '那儿有个人像是等了很久。他说他就知道会来人。' },
          { kind: 'dialogue', text: '缘法这种事，讲究一个诚。' },
          { kind: 'narration', text: '你把带的钱给了他一半。他说过些日子来接你。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '你去了三回。第三回连那个人也不在了。', tone: 'faint' },
        ],
      }
    }
    return {
      outcome: '不是那么回事',
      closer: false,
      blocks: [
        { kind: 'narration', text: `你找到了${place.calls}。` },
        { kind: 'narration', text: '就是个寻常地方。跟人说的一点也不像。' },
        { kind: 'narration', text: '你围着转了两圈，什么也没有。' },
        { kind: 'narration', text: '回来的路上你没跟人提这一趟。', tone: 'faint' },
      ],
    }
  }

  /**
   * 那地方是真的。
   *
   * 可**看不看得出来，是另一回事**——它没有牌子，也没有人迎出来。
   * 心思不够细的人会觉得那只是一座山、一间关着的屋。
   */
  const notices = insight + randomBetween(-12, 12)
  if (notices < 48) {
    return {
      outcome: '不是那么回事',
      closer: false,
      blocks: [
        { kind: 'narration', text: `你找到了${place.calls}。` },
        { kind: 'narration', text: '看了半天，也就是个山头。' },
        { kind: 'narration', text: '你在底下待了两日，没等到什么。' },
        {
          kind: 'narration',
          text: '走的时候你回头看了一眼。什么也没有。',
          tone: 'faint',
        },
      ],
    }
  }

  world.setFlag('found-the-way', placeId)
  return {
    outcome: '对上了',
    closer: true,
    blocks: [
      { kind: 'narration', text: `你找到了${place.calls}。` },
      { kind: 'narration', text: '你在底下等了四天。' },
      { kind: 'event', text: '第五天早上，山道上下来一个人。', tone: 'cinnabar' },
      { kind: 'narration', text: '他走得不快，可是很快就到了你跟前。' },
      { kind: 'narration', text: '他看了你一眼，问你在这儿做什么。' },
      { kind: 'narration', text: '你说不出话。', tone: 'faint' },
    ],
  }
}

/** 站到门前之后 */
export interface Door {
  outcome: AtTheDoor
  blocks: NarrativeBlock[]
}

/**
 * 他站在门前。
 *
 * ## 收不收，玩家永远不知道是凭什么
 *
 * 那个人看了他一眼，说了一句话——而**那句话他听不懂**。
 * 有的听起来像好话，有的像坏话，可结果只有收和不收。
 *
 * 引擎这边看的是 `root`：那个数在他出生那一刻就定了，
 * 跟出身、跟努力、跟他有多想都没有关系。**王府的孩子和农户的孩子
 * 在这一掷上平等**——而两个人谁也不知道自己的那一个数是多少。
 */
export function knock(enter: boolean): Door {
  const character = useCharacterStore()
  const world = useWorldStore()

  if (!enter) {
    world.setFlag('turned-away-myself', true)
    return {
      outcome: '没进去',
      blocks: [
        { kind: 'narration', text: '你说你只是路过。' },
        { kind: 'narration', text: '他点了点头，往山下去了。' },
        { kind: 'divider', variant: 'ink' },
        { kind: 'narration', text: '你在原地站到天黑。' },
        {
          kind: 'narration',
          text: '这件事你后来想起过很多回。每一回都想不明白自己那天为什么那样说。',
          tone: 'deep',
        },
      ],
    }
  }

  const root = character.attributes.root
  const taken = root >= 72

  if (!taken) {
    world.setFlag('was-turned-down', true)
    return {
      outcome: '没收',
      blocks: [
        { kind: 'narration', text: '你说你是来找他们的。' },
        { kind: 'narration', text: '他没有笑，也没有赶你走。他让你把手伸出来。' },
        { kind: 'narration', text: '他两根指头搭在你腕子上，停了大约两息。' },
        { kind: 'event', text: '「不成。」', tone: 'deep' },
        { kind: 'narration', text: '你问哪里不成。' },
        {
          kind: 'dialogue',
          text: root >= 55 ? '差得不多，可差着就是差着。' : '你回去吧。这条路不是人人走得。',
        },
        { kind: 'narration', text: '他说完就走了，没有再回头。' },
        { kind: 'divider', variant: 'ink' },
        {
          kind: 'narration',
          text: '你在山下坐了一夜。你到今天也不知道他摸的是什么。',
          tone: 'deep',
        },
      ],
    }
  }

  world.setFlag('was-taken-in', true)
  return {
    outcome: '收下了',
    blocks: [
      { kind: 'narration', text: '你说你是来找他们的。' },
      { kind: 'narration', text: '他让你把手伸出来。两根指头搭在你腕子上。' },
      { kind: 'narration', text: '这一回停得久些。' },
      { kind: 'event', text: '「跟上。」', tone: 'cinnabar' },
      { kind: 'narration', text: '他转身就走，没有等你。' },
      { kind: 'narration', text: '你跟了上去。' },
      { kind: 'divider', variant: 'ink' },
      {
        kind: 'narration',
        text: '上山的路很长。你一直没敢问他为什么肯收你。',
        tone: 'deep',
      },
    ],
  }
}
