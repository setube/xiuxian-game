import { pick, pickWeighted, randomBetween } from '@/engine/random'
import type { Bond, Constitution } from '@/types/game'

/**
 * 出生境况。
 *
 * 一个人睁开眼时，世界已经是那个样子了：
 *
 *   出生时代 + 出生地区 + 出生家庭 + 出生身体 + 抚养关系 + 早期环境
 *
 * 玩家不选这些，也看不到有得选。它们是**世界生成出来的事实**，
 * 不是一张【出身：豪门】【体质：先天圣体】的卡。
 *
 * ## 「父母」只是其中一种情况
 *
 * 从前的写法是「出生 → 父亲 + 母亲 → 家庭事件」，那等于假定了
 * 每个人都有爹娘且爹娘都活着。真实的世界不是这样：
 * 有人生下来娘就没了，有人跟着长姐过，有人被丢在庙门口，
 * 有人是老乞丐从雪地里捡回来的。
 *
 * 所以这一层的产物不是「一对父母」，是**一张初始的关系网**——
 * 它可能有四个人，也可能只有一个，甚至一个都没有。
 *
 * ## 关于「哪个开局最强」
 *
 * 这是这套设计真正的生死线。堵法不是给苦出身发补偿，而是：
 * **决定你能走多远的那样东西，跟出生境况完全无关。**
 *
 * `root`（修行资质）和 `spirit`（神魂）在出生那一刻独立掷出，
 * 跟家世、体质、爹娘死活一律无关。所以不存在「富家子弟资质更好」。
 *
 * 出生决定的只是**谁在你身边、你能做什么、你会撞见什么**：
 * 富家子弟教育好，但一辈子碰不到修士；孤儿早早独立，跟着商队
 * 走南闯北，反倒见过世面。这不是补偿，是不同的路由。
 */

/** 关系网里的一个位置。谁来填、填不填得上，由境况决定 */
export interface Kin {
  /** 人口册里的 id */
  id: string
  bond: Bond
  /** 玩家管他叫什么 */
  calls: string
  /** 他比玩家大几岁。负数就是比玩家小 */
  older: number
  /** 一开始就不在了。这个人存在过，只是玩家没见过 */
  goneAtBirth?: boolean
  /**
   * 他做什么营生。留空就跟着这家人的**业**走。
   *
   * 这一格只管**面板上给人读的那句话**。它从前还兼着一个差事：
   * `living.ts` 拿它当键查「这个人过的是什么日子」，于是改一个字
   * 那边就静默落回这个家。那个差事现在归 `living` 那一格。
   *
   * 填之前问一句：**这句话十年后还成立吗？**「寺中的老僧」成立，
   * 「讨饭的」成立，「逃难路上的人」不成立——逃难会结束，
   * 而这一格出生那天写下就再也不动（见 `types/game.ts` 的 `Person.doing`）。
   */
  doing?: string
  /**
   * 他过的是什么日子（`content/living.ts` 里那一格的 id）。
   *
   * 写了这一格的抚养人，他的日子**盖过这个家**：老乞丐捡去养大的孩子，
   * 籍和业仍然是他生在的那一家的，可他过的是讨饭的日子。
   *
   * 留空是常态——姐姐把你拉扯大的，她身上没有单独的日子，
   * 自然落回这个家，而那正是对的：家还是那个家。
   */
  living?: string
}

export interface Circumstance {
  id: string
  /** 一句话说清这是个什么境况。只进走查，不上界面 */
  summary: string
  weight: number
  /** 这一世开局的关系网 */
  kin: readonly Kin[]
  /** 家境的加减。孤儿没有家底，但也没有债 */
  standing?: number
  /** 开局就有的旗标，供剧本分流 */
  flags?: readonly string[]
}

/**
 * 境况池。
 *
 * 权重照着真实的人口结构配：绝大多数人有爹有娘，
 * 但「绝大多数」不是「所有」——这一整套东西存在的理由，
 * 就是那剩下的两三成。
 */
export const CIRCUMSTANCES: readonly Circumstance[] = [
  {
    id: 'both-parents',
    summary: '父母健在',
    weight: 100,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 28 },
      { id: 'father', bond: '抚养', calls: '爹', older: 28 },
      { id: 'mother', bond: '生母', calls: '娘', older: 25 },
      { id: 'mother', bond: '抚养', calls: '娘', older: 25 },
    ],
  },
  {
    id: 'with-siblings',
    summary: '父母健在，上头有个哥哥或姐姐',
    weight: 62,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 29 },
      { id: 'father', bond: '抚养', calls: '爹', older: 29 },
      { id: 'mother', bond: '生母', calls: '娘', older: 26 },
      { id: 'mother', bond: '抚养', calls: '娘', older: 26 },
      { id: 'elder', bond: '兄', calls: '哥', older: 5 },
    ],
    standing: -4,
    flags: ['has-elder'],
  },
  {
    id: 'mother-died-birthing',
    summary: '母亲难产而亡，父亲把你带大',
    weight: 22,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 27 },
      { id: 'father', bond: '抚养', calls: '爹', older: 27 },
      // 她存在过。玩家没见过她，但她是这个人的生母，这件事永远成立
      { id: 'mother', bond: '生母', calls: '娘', older: 24, goneAtBirth: true },
    ],
    standing: -6,
    flags: ['motherless'],
  },
  {
    id: 'father-died-early',
    summary: '父亲早亡，母亲一个人把你拉扯大',
    weight: 20,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 28, goneAtBirth: true },
      { id: 'mother', bond: '生母', calls: '娘', older: 25 },
      { id: 'mother', bond: '抚养', calls: '娘', older: 25 },
    ],
    standing: -14,
    flags: ['fatherless'],
  },
  {
    /**
     * 长姐当家。
     *
     * 这一条是「抚养 ≠ 血缘」最直白的一次示范：
     * 姐姐同时连着两条边——「姐」和「抚养」。
     * 做成槽位的话这里就没处放了。
     */
    id: 'raised-by-sister',
    summary: '父母双亡，与长姐相依为命',
    weight: 10,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 28, goneAtBirth: true },
      { id: 'mother', bond: '生母', calls: '娘', older: 25, goneAtBirth: true },
      { id: 'sister', bond: '姐', calls: '姐', older: 9 },
      { id: 'sister', bond: '抚养', calls: '姐', older: 9 },
    ],
    standing: -22,
    flags: ['orphan', 'raised-by-kin'],
  },
  {
    id: 'raised-by-brother',
    summary: '父母双亡，跟着兄长过',
    weight: 8,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 28, goneAtBirth: true },
      { id: 'mother', bond: '生母', calls: '娘', older: 25, goneAtBirth: true },
      { id: 'brother', bond: '兄', calls: '哥', older: 11 },
      { id: 'brother', bond: '抚养', calls: '哥', older: 11 },
    ],
    standing: -20,
    flags: ['orphan', 'raised-by-kin'],
  },
  {
    id: 'raised-by-uncle',
    summary: '父母双亡，被叔父收养',
    weight: 9,
    kin: [
      { id: 'father', bond: '生父', calls: '爹', older: 28, goneAtBirth: true },
      { id: 'mother', bond: '生母', calls: '娘', older: 25, goneAtBirth: true },
      { id: 'uncle', bond: '亲戚', calls: '叔父', older: 33 },
      { id: 'uncle', bond: '抚养', calls: '叔父', older: 33 },
    ],
    standing: -12,
    flags: ['orphan', 'raised-by-kin', 'fostered'],
  },
  {
    /**
     * 生父生母一栏是空的。
     *
     * 不是「未知」这个值，是**这两条边根本不存在**——
     * 世上确实有他爹娘，但世界没记住他们是谁，玩家也永远查不到。
     * 这跟「爹死了」是完全不同的两件事。
     */
    id: 'temple-foundling',
    summary: '生下来就被丢在庙门口，寺里收留了',
    weight: 6,
    kin: [
      { id: 'monk', bond: '抚养', calls: '师父', older: 40, doing: '寺中的老僧', living: 'temple' },
    ],
    standing: -18,
    flags: ['foundling', 'no-parents', 'in-temple'],
  },
  {
    id: 'beggar-foundling',
    summary: '幼年被遗弃，老乞丐把你捡了回去',
    weight: 5,
    kin: [
      { id: 'beggar', bond: '抚养', calls: '老丈', older: 46, doing: '讨饭的', living: 'begging' },
    ],
    standing: -28,
    flags: ['foundling', 'no-parents', 'begging'],
  },
  {
    /**
     * 战乱失散。
     *
     * 唯一一个「爹娘还活着，但玩家不知道」的境况——
     * 他们的 fate 是「在」，只是不在这一册的关系网里。
     * 多年以后玩家可能在某处遇到一个中年男人……
     */
    id: 'war-separated',
    summary: '战乱中出生，与父母失散，被陌生人带走',
    weight: 4,
    // 营生那一格空着，日子那一格写着。他从前只有一格，写的是
    // 「逃难路上的人」——那一个字符串同时干着两件事：面板上给人读，
    // 和当键去查这个孩子过什么日子。而**逃难会结束**，
    // 那句话二十年后还挂在面板上就跟「28岁。还在襁褓里」一样荒唐，
    // 可删掉它，`adrift` 那种日子会跟着一起没了，界面上什么也看不出来。
    // 拆成两格之后：营生说不上就空着（面板落回这家的业），
    // 日子明写着 adrift——它是**开局**的日子，往后允许被内容改掉
    kin: [{ id: 'keeper', bond: '抚养', calls: '收留你的人', older: 38, living: 'adrift' }],
    standing: -24,
    flags: ['separated', 'unknown-origin'],
  },
]

/**
 * 掷体质。
 *
 * 绝大多数人生下来没什么毛病，但不是所有人。
 * 这一掷跟资质、跟家世都无关——**它不决定你能走多远，
 * 只决定你走的是哪条路。**
 */
export function rollConstitution(): Constitution {
  const outcome = pickWeighted(
    [
      { value: '康健' as Constitution, weight: 880 },
      { value: '体弱' as Constitution, weight: 74 },
      { value: '跛' as Constitution, weight: 22 },
      { value: '聋' as Constitution, weight: 10 },
      { value: '喑' as Constitution, weight: 8 },
      { value: '盲' as Constitution, weight: 6 },
    ],
    (item) => item.weight,
  )
  return outcome?.value ?? '康健'
}

/**
 * 体质带来的隐藏刻度偏移。
 *
 * 注意这些数字的形状：**没有一种体质是净减的**。
 *
 * 腿脚不便的人身板确实差，可他常年在屋里，摸到书的机会比谁都多，
 * 心性也磨得更硬——那不是补偿，是这种人生真实的样子。
 * 看不见的人耳朵和记性都好得出奇，因为他只能靠这两样活着。
 *
 * 而 root 与 spirit 一律不碰。修行资质跟身子骨没有关系，
 * 这是全作最要紧的一条：**一个瞎子可能是天生的修行胚子。**
 */
export function constitutionShift(
  constitution: Constitution,
): Partial<Record<'body' | 'memory' | 'insight' | 'will' | 'fortune', number>> {
  switch (constitution) {
    case '体弱':
      return { body: -18, memory: 4, will: 6 }
    case '跛':
      // 下不了地、走不了山道，可是有的是时间看书
      return { body: -26, memory: 10, insight: 6, will: 10 }
    case '盲':
      // 认不了字，但记性和心性是常人比不了的
      return { body: -10, memory: 22, insight: 8, will: 16, fortune: -4 }
    case '聋':
      return { body: -4, memory: 8, insight: 10, will: 8 }
    case '喑':
      return { memory: 6, insight: 8, will: 12, fortune: -2 }
    default:
      return {}
  }
}

/** 掷这一世的出生境况 */
export function rollCircumstance(): Circumstance {
  return pickWeighted(CIRCUMSTANCES, (item) => item.weight) ?? CIRCUMSTANCES[0]!
}

/** 收养你的人叫什么。不跟你同姓——这也是一条信息 */
export function keeperName(): { surname: string; given: string } {
  const surnames = ['陈', '孙', '吴', '郑', '王', '冯', '褚', '卫']
  const givens = ['七', '福生', '守拙', '德山', '老实', '有田', '三', '大成']
  return {
    surname: pick(surnames) ?? '陈',
    given: pick(givens) ?? '七',
  }
}

/** 兄姐比你大几岁，掷一个 */
export function siblingGap(base: number): number {
  return Math.max(2, base + randomBetween(-3, 4))
}
