import type { Bond, Person } from '@/types/game'

/**
 * 一个人此刻在玩家眼里是什么样。
 *
 * `engine/address.ts` 管「他此刻在玩家嘴里叫什么」，这一支管
 * 「他此刻怎么样了」——两个面板上跟在称呼后面的那一句。
 *
 * ## 这一支是从一个 undefined 里长出来的
 *
 * 人际面板上出现过「爹 43岁。undefined」。那句话从前是两个组件各自
 * 用模板字符串拼的，`` `${people.ageOf(id)}岁。${person.doing}` ``，
 * 而 `doing` 从存档里读回来是空的（改过名，见 `engine/savefile.ts`）。
 *
 * 光加个兜底不够。真正的毛病是**那句话拼在 `<script setup>` 里，
 * 全套四十几支走查一个也够不着它**——`verify.ts` 里明明有一道
 * 「玩家读到的字里有英文吗」，它绿着放过了这五个字母，
 * 因为它量的是 store 里的字段，不是面板上最终那一行。
 *
 * 所以搬到这里来，不是为了复用（两处确实几乎一样，但那是次要的），
 * 是为了**让它可以被量**。`scripts/savefile.ts` 拿残缺的人喂给它。
 */

/** 拼那一句话要知道的事。全都传进来，这里不碰 store */
export interface NoteInput {
  /** 人口册里的那个人。查不到就是一句空话 */
  person?: Person
  /** 玩家自己记下的印象。有就用它，它比任何推算都准 */
  remembered?: string
  /** 他今年多大 */
  age: number
  /** 知道名字就写在前头，「陈怀山，」。不知道就不写——名字要有人告诉你才知道 */
  name?: string
  /**
   * 没消息了那一句。
   *
   * 家人那一行说「没有消息。」，旁人说「再没有消息。」——
   * 一个字之差，是两个面板本来就有的分别，不在这里统一。
   */
  vanished: string
  /**
   * 说不上营生的自家人，长到能做活的年纪就落回这一句。
   *
   * 传的是这一家靠什么过活（`household.livelihood`）。**只对自家人传**——
   * 街上的掌柜、路过的商旅不做你家的营生，那得由调用方分辨。
   *
   * 为什么要有它：`doing` 说不上就空着（见 `types/game.ts`），
   * 而一个四十三岁的儿子在面板上只剩一个岁数，是个空壳。
   * 长大的孩子跟着家里做活是这个世界的常态，落回它比空着真。
   *
   * 它是**默认**不是**结论**：哪天内容真写了「儿子十五岁那年下了地」，
   * 那一格被填上，这里自然让位。
   */
  fallback?: string
}

/**
 * 从几岁起，说不上营生就算他在做家里的活。
 *
 * 十五岁——照的是这一册的人生时间轴（十岁做学徒读书帮工，
 * 十五岁开始独立做事）。在此之前的孩子不写营生：
 * 一个三岁的孩子不「务农」，而那一行只写岁数是诚实的。
 */
const WORKS_FROM = 15

/**
 * 哪些关系算「同一个家里过活的人」。
 *
 * `fallback` 只该落到这些人身上——街上的掌柜、路过的商旅、
 * 教你念书的先生，都不做你家的营生。
 *
 * 「亲戚」不在里头：祖父母、叔伯、姑舅未必同住，多半各有各的营生。
 * 「师」「徒」「友」「仇」更不是。
 *
 * 这是一张**语义**表——谁算一家人得由人来定，没有哪个字段算得出来。
 * 它现在只有 `RelationshipPanel` 一个使用者，所以先放在这儿；
 * 第二个使用者出现再往上挪。
 */
export const HOUSEHOLD_BONDS: readonly Bond[] = [
  '生父',
  '生母',
  '抚养',
  '兄',
  '姐',
  '弟',
  '妹',
  '配偶',
  '子',
  '女',
]

/**
 * 他现在怎么样了。
 *
 * 先说下落——人不在了、没消息了，这比什么都要紧；
 * 再说玩家自己记下的印象；最后才是他在做什么。
 */
export function noteOf(input: NoteInput): string {
  const { person, remembered, age, name, vanished, fallback } = input

  if (!person) return ''
  if (person.fate === '殁') return '不在了。'
  if (person.fate === '杳') return vanished
  if (remembered) return remembered

  const called = name ? `${name}，` : ''

  /*
   * 营生说不上就只说岁数。
   *
   * 这一格可空是有意的（见 `types/game.ts`）：小孩子没有营生，
   * 而「还没成人」是年龄的另一种说法，年龄就写在它左边。
   *
   * 它也可能是**从旧存档里读回来的空**——那一格从前叫 `trade`，
   * 改过名（见 `engine/savefile.ts`）。玩家读到的字里一个英文字母也不该有
   * （`scripts/verify.ts` 守着这条），所以这里绝不能让 `${undefined}` 落到纸上。
   */
  const doing = person.doing ?? (age >= WORKS_FROM ? fallback : undefined)
  if (!doing) return `${called}${age}岁。`
  return `${called}${age}岁。${doing}`
}
