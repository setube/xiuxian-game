import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { usePeopleStore } from '@/stores/people'
import type { Livelihood } from '@/types/game'

/**
 * 你面前有哪几条路。
 *
 * ## 这一支不产生选项，它产生一段话
 *
 * 12.md 那六问（你靠什么生活？和谁一起生活？有没有自己的家？有没有属于
 * 自己的财产？是否受别人支配？是否继续原来的生计？）的答案，从前散在
 * `Household` / `House` / `Person.doing` / `Person.livelihood` 好几处，
 * **没有一处把它们聚起来**。玩家成年那一年读不到「我眼下是个什么处境」。
 *
 * 这一支把它们聚成一段可以念出来的话：
 *
 *     你还做着家里那一行，务农。
 *     家里的事，如今是你说了算。
 *     家里那间药铺还在。
 *
 * （12.md 里举的例子是「铺子归了哥，你手里有一笔折了的银子，没有田，
 * 也没有手艺」——那是期望的形状。地那一格等 `household.tenure` 合进来
 * 才答得出，见底下那段待接说明；「手里有多少银子」世界还没记。）
 * **它不给菜单。** 文档反对的正是那个：建一个 `adultCareerChoice` 让玩家
 * 从「继承父业 / 自己开铺 / 拜师学艺 / 出外谋生」里挑一个，路就成了
 * 游戏菜单，而不是人生的现实结果。哪条路走得通仍旧由后续各卷的 `requires`
 * 决定——手里有本钱才提得起开铺，识字才谈得上功名，这些条件本来就在那儿。
 * 这一段话只是让玩家**看见自己站在什么位置**。
 *
 * ## 用词
 *
 * 「创业」这个现代词不进游戏内部（12.md 明写）。明代人说的是开铺、置业、
 * 开张、自立门户、贩货、做买卖、置产、开作坊、自营。库里已有的
 * 「另立门户」「盘出去」是对的路子。
 */

/** 六问各自的答案。都是事实，不是评价 */
export interface Paths {
  /** 靠什么生活。说不上就是 undefined——没有营生本身是一条信息 */
  livelihood: Livelihood | undefined
  /** 跟你一起过日子的人。空着就是一个人过 */
  household: string[]
  /**
   * 有没有自己的家。
   *
   * 三种：`'自立'` 当着家、`'寄人'` 住在别人的户里、`'无'` 没有着落。
   * **注意「自立」不等于「一个人住」**——娶了亲、生了孩子仍是自立，
   * 当家的是你。
   */
  home: '自立' | '寄人' | '无'
  /** 名下有没有产业。这一格问的是「这一户目前主要靠什么家业维持」 */
  property: string | null
  /** 上头有没有人。当家的不是你，就有 */
  under: string | undefined
  /** 还在做家里原来那一行吗 */
  sameTrade: boolean
}

/*
 * ## 待接：地的那一格（`household.tenure`，xiuxian-game-79 在做）
 *
 * 这个文件顶上那句示例写着「**没有田**，也没有手艺」——而「没有田」这半句
 * 眼下**答不出来**：`Paths` 只有 `property`（那是铺面），地这一格根本不存在。
 * 那句话是照 12.md 写的期望值，不是代码产出的。
 *
 * `tenure` 合进 main 之后这里加一格 `tenure: '自耕' | '佃' | null`，
 * `pathWords` 出两句（措辞 79 定的，村里人说「地」不说「田」）：
 *
 *     自耕  那几亩地是自家的。
 *     佃    种着别人的地，秋后先量租子。
 *     null  不出声
 *
 * **第三档最要紧**：`佃` 从前只能说成「有田」或「没有田」，两个都不对——
 * 人还种着地，地是别人的（79 那一片父债链尾「地抵了债」之后正是这个）。
 *
 * `null` 照现有那条纪律：**说得上的才说**。没有地就不提地，
 * 硬凑一句「你没有地」反而把一件本来无声的事说响了。
 *
 * 出嫁之后 `joined → null`，跟底下 `property` 同一个口径——
 * 业、产、田都看**此刻这一户**，`House` 上没有那几格之前一律「说不上」
 * （79 与 14 2026-09-07 定）。
 *
 * 接的时候**门禁要一起改**（`scripts/lotpath.ts`）：加一条判据验
 * 「说『种着别人的地』时 `tenure` 真的是 `'佃'`」，尺子自检三档各摆一次。
 * 不加的话那两句话跟世界脱钩了不会有人发现，而这一支守的正是
 * 「每一句都能在世界里找到出处」。
 */

/**
 * 你此刻的处境。
 *
 * **不写死 `houses['home']`**：出嫁、入赘之后那一户不再是你的了
 * （`wed-into` 效果把 `me` 迁进 `in-law-<配偶>`）。问的是「`me` 在哪一户」，
 * 答案由 `people.houseOf('me')` 给；它返回 `undefined` 表示你还在自家过
 * （自家不在 `houses` 里，在 `household` 仓库，见 `stores/people.ts`）。
 */
export function pathsNow(): Paths {
  const people = usePeopleStore()
  const household = useHouseholdStore()
  const character = useCharacterStore()

  const joined = people.houseOf('me')
  const head = joined?.head

  // 一起过日子的：迁进别人户里的看那一户的名册，还在自家的看自家有谁在
  const together = joined
    ? joined.members.filter((id) => id !== 'me' && people.isAlive(id))
    : household.members.filter((one) => people.isAlive(one.person)).map((one) => one.person)

  /*
   * 当着家还是寄人篱下。
   *
   * 迁进别人户里的看户主是不是你——入赘的女婿住在妻家，当家的是老丈人，
   * 那是「寄人」；他日老丈人殁了、家交到他手上（`keepHeads`），同一个人
   * 同一处屋子，这一格就变成「自立」。**它问的是眼下谁当家，不是户籍。**
   *
   * 还在自家的：成了年就是自立（爹娘殁后你承户，或者本来就该你当家）。
   * 未成年跟着大人过是「寄人」——这不是贬义，一个十岁的孩子本来就该如此。
   */
  const home: Paths['home'] = joined
    ? head === 'me'
      ? '自立'
      : '寄人'
    : character.age >= 16
      ? '自立'
      : '寄人'

  /*
   * 靠什么过活。
   *
   * **不能问 `livelihoodOf('me')`**：那个函数先查 `Person.livelihood`、
   * 再落回所在户的营生，而**玩家自己压根不在人口册上**（`roster` 里没有 `me`，
   * 他的东西在 `character` / `household` 两个仓库里）。问它 300 世全是
   * `undefined`——门禁第一次跑就是这么红的，那段话人人都在说
   * 「你眼下没有个正经营生」。
   *
   * 问对的地方是：迁进别人户里的看那一户的营生，还在自家的看自家的。
   */
  const livelihood = joined ? joined.livelihood : household.livelihood

  return {
    livelihood,
    household: together,
    home,
    // 迁出去的人不再靠娘家那份产业，那是娘家的
    property: joined ? null : household.business,
    under: head === 'me' ? undefined : head,
    /*
     * 还做不做家里原来那一行。
     *
     * 「原来那一行」指**自家那一户**的营生。迁进别人户里的人，
     * 拿新那一户的营生跟娘家的比——嫁进商户的农家女，这一格是 false。
     */
    sameTrade: livelihood === household.livelihood,
  }
}

/**
 * 把处境念成一段话。
 *
 * **这一段是给玩家读的，不是给他选的。** 读完他知道自己站在哪儿——
 * 手里有什么、上头有没有人、还做不做原来那一行；至于往哪儿走，
 * 由后面各卷自己开口（有本钱才提得起开铺，识字才谈得上功名）。
 *
 * 六问不是六句话：**说得上的才说**。没有产业就不提产业，一个人过就不提
 * 跟谁一起——空着的那一格本身是信息，硬凑一句「你没有铺子」反而把
 * 一件本来无声的事说响了。
 */
export function pathWords(now: Paths = pathsNow()): string[] {
  const people = usePeopleStore()
  const said: string[] = []

  // 一、靠什么过活。这一句最要紧，先说
  if (now.livelihood !== undefined) {
    said.push(
      now.sameTrade ? `你还做着家里那一行，${now.livelihood}。` : `你如今${now.livelihood}。`,
    )
  } else {
    said.push('你眼下没有个正经营生。')
  }

  // 二、上头有没有人。当着家的不必说——那是常态，说了反而像在强调
  if (now.under !== undefined) {
    said.push(`这个家是${people.callOf(now.under)}当的。`)
  } else if (now.home === '自立') {
    said.push('家里的事，如今是你说了算。')
  }

  // 三、名下的产业。没有就不提
  if (now.property !== null) {
    said.push(`家里那间${now.property}还在。`)
  }

  // 四、跟谁一起过。一个人过要说——那件事得说出来才成立
  if (now.household.length === 0) {
    said.push('屋里就你一个。')
  }

  return said
}
