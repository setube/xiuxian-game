import type { Trade } from '@/types/game'

/**
 * 这家人过的是什么日子。
 *
 * ## 它回答的是 `{elder}` 回答不了的那个问题
 *
 * `interpolate.ts` 的 `{elder}` 只解决「谁在做这件事」。
 * 可是把「父亲在檐下修一把锄头」里的父亲换成皇帝，句子照样是错的——
 * **错的不是主语，是那把锄头。**
 *
 * 从前正文能写出「皇子下地割草」，不是因为哪一句文案写错了，
 * 是因为内容层一直把 `household.trade` 当成默认真相：
 * 父亲 = 农民，母亲 = 农妇，孩子 = 下地，家里 = 小院。
 * 数据层已经掷出了皇室，内容层还在演农户。
 *
 * 这份文件把「这家人过什么日子」从假设变成数据。
 *
 * ## 只有一格，是内容逼出来的
 *
 * 起初想写一张完整的生活百科——农具、住处、吃食、出行、四时。
 * 没有写，因为**还没有第二个使用者**。
 *
 * 头一个使用者是 `kin.ts` 的「北边」那一卷。把它逐句拆开看：
 *
 *     连着下了三天雨，地里去不了。      → 泛化：哪儿也去不了
 *     父亲在檐下修一把锄头              → **承重**：这一句非分不可
 *     他放下锄头，想了很久              → 泛化：他停下手里的活
 *     他说完就不说了，接着修那把锄头    → 泛化：低头接着做手里的事
 *     雨停了，他把锄头扛起来，出门去了  → 泛化：把东西收起来
 *
 * 四处锄头，只有一处是承重的。所以这里只长出一格 `chore`，
 * 而不是「一件活的四个动作」那种排得整整齐齐的阶梯。
 * 排成一列的枚举最可疑——先要有人用，才配有名字。
 *
 * ## 解析顺序：先问抚养人，再落回这家的营生
 *
 * 被老乞丐捡去养大的孩子，`household.trade` 仍然是他生在的那一家，
 * 可他过的是讨饭的日子。所以生活事实的来源有先后：
 *
 *     先看有没有把你养大的人，那个人过的是什么日子
 *     ← 没有，才看这个家做什么营生
 *
 * 这跟 `interpolate.ts` 里 `callByBond(['生父','抚养','生母'])`
 * 「先问关系网，再落笔」是同一条纪律。落点也是现成的：
 * `circumstances.ts` 里只有三种收养境况填了 `Kin.trade`
 * （讨饭的 / 寺中的老僧 / 逃难路上的人），姐姐兄长叔父都留空——
 * 留空是对的，姐姐把你拉扯大，家还是那个农户家。
 *
 * ## 怎么用
 *
 * 剧本里写 `{ living: 'farm' }` 做条件，不写 `if trade === '皇室'`。
 * 十一种出身摊到七种日子上，往后加一种出身只是往这张表里添一行，
 * 不是往全库添几百个 if。
 */
export interface Living {
  id: string
  /**
   * 这家的大人闲下来，手上摆弄的那件活。
   *
   * `null` 是有分量的一格，不是「还没填」：**宫里没有这样一件活。**
   * 皇帝不会在檐下修东西，他的闲不是这种闲。
   * 所以读到 null 的正文不该换个物件接着演，而该整段不成立。
   *
   * 名词和收工那个动作绑在一个对象里，是因为它们**是同一件事的两面**：
   * 锄头是扛起来的，账本是合上的，弓是挂回墙上的。
   * 分成两个可空字段就会出现「有锄头但不知道怎么收」这种半拉状态，
   * 而那种状态在世上不存在。能用类型守住的就别拿门禁去守。
   */
  chore: { holds: string; putsAway: string } | null
  /** 一句话说清这是什么日子。给读代码的人看，不进正文 */
  summary: string
}

/**
 * 七种日子。
 *
 * 十一种出身摊在这七种上，是有意合并的——
 * 匠户和农户不是同一种人家，可就「大人闲下来手上有件活」这一点上，
 * 他们确实是一样的。**合并的依据是这一格问的那个问题，不是身份高低。**
 * 哪天有一卷正文分得出匠户和农户，那时再拆，不是现在。
 */
const HOMESTEAD: Living = {
  id: 'farm',
  chore: { holds: '一把锄头', putsAway: '把锄头扛起来' },
  summary: '靠地吃饭。农具坏了自己修，一年的指望都在天上',
}

const HUNT: Living = {
  id: 'hunt',
  chore: { holds: '一张弓', putsAway: '把弓挂回墙上' },
  summary: '靠山吃饭。进山三日五日，回来先看皮子',
}

const CRAFT: Living = {
  id: 'craft',
  chore: { holds: '一把没开刃的凿子', putsAway: '把家什归回架上' },
  summary: '手艺人。活计堆在院里，什么时候做完什么时候算',
}

const SHOP: Living = {
  id: 'shop',
  chore: { holds: '一本摊开的账', putsAway: '把账合上' },
  summary: '守着铺面。进出的人多，一天的输赢在账上',
}

const CLINIC: Living = {
  id: 'clinic',
  chore: { holds: '一戥子没称完的药', putsAway: '把戥子收进抽屉' },
  summary: '前堂看诊，后院晒药。一家人身上都是苦味',
}

const OFFICE: Living = {
  id: 'office',
  chore: { holds: '一沓看了一半的公文', putsAway: '把公文收进匣子' },
  summary: '在衙门当差。回家还有回家的事，多半在书房',
}

/**
 * 宫里。
 *
 * 唯一一种 `chore` 是 null 的日子，而这正是它要说的话：
 * **皇室不是「农户剧本换个物件」。**
 *
 * 改成「父亲坐在廊下整理文书」并不能救那一卷——
 * 皇子跟父亲之间隔的不是一件活，是通传、礼数、宫人、位分，
 * 是一年见得到几次。所以这一格填 null，让那一整卷对皇室不成立，
 * 而不是让它换身衣裳继续演。宫里那一段人生该另外写，
 * 写的时候它长什么样，由那份内容自己说了算。
 */
const PALACE: Living = {
  id: 'palace',
  chore: null,
  summary: '宫里。你要见父亲得先通传，而多半通传了也见不着',
}

/**
 * 讨饭的。
 *
 * 老乞丐把你捡回来养大——这一条压过 `household.trade`：
 * 你生在哪一家已经不重要了，你过的是他的日子。
 */
const BEGGING: Living = {
  id: 'begging',
  chore: { holds: '一只豁了口的碗', putsAway: '把碗揣进怀里' },
  summary: '沿街讨。一天的饭在别人手上',
}

/**
 * 寺里。
 *
 * 跟宫里一样是「另一种日子」，但它有活可做——
 * 老僧闲下来是在补一件旧僧衣，这跟他修不修行没有关系。
 */
const TEMPLE: Living = {
  id: 'temple',
  chore: { holds: '一件补了又补的旧衣', putsAway: '把针线收进笸箩' },
  summary: '寺里。天不亮起，天黑了睡，一日两餐',
}

/**
 * 路上。
 *
 * 逃难路上收留你的人。他自己也没有家，随身的东西就那么几样。
 */
const ADRIFT: Living = {
  id: 'adrift',
  chore: { holds: '一双走烂了的鞋', putsAway: '把包袱重新系好' },
  summary: '没有落脚的地方。今天在哪儿，明天不一定',
}

/**
 * 出身 → 日子。
 *
 * `Record<Trade, Living>` 是有意的：**加一种出身，这里不表态就编译不过。**
 * 能用类型守住的就别拿门禁去守。
 */
export const LIVINGS: Record<Trade, Living> = {
  农户: HOMESTEAD,
  猎户: HUNT,
  匠户: CRAFT,
  商户: SHOP,
  客栈: SHOP,
  酒楼: SHOP,
  药铺: CLINIC,
  镖局: CRAFT,
  官宦: OFFICE,
  王府: PALACE,
  皇室: PALACE,
}

/**
 * 抚养人的营生 → 日子。
 *
 * 键取的是 `circumstances.ts` 里 `Kin.trade` 那几个字，一字不差。
 * 对不上就返回 undefined，于是自动落回这个家的营生——
 * 姐姐、兄长、叔父把你拉扯大都走这一条，**而那是对的**：
 * 家还是那个家，只是当家的人换了。
 */
const KEEPER_LIVINGS: Readonly<Record<string, Living>> = {
  讨饭的: BEGGING,
  寺中的老僧: TEMPLE,
  逃难路上的人: ADRIFT,
}

/** 把你养大的那个人过的是什么日子。他的营生对不上任何一种，就返回 undefined */
export function livingOfKeeper(trade: string): Living | undefined {
  return KEEPER_LIVINGS[trade]
}

/** 这家的营生对应哪一种日子 */
export function livingOfTrade(trade: Trade): Living {
  return LIVINGS[trade]
}

/** 全部日子，去重。门禁遍历用 */
export const ALL_LIVINGS: readonly Living[] = [
  HOMESTEAD,
  HUNT,
  CRAFT,
  SHOP,
  CLINIC,
  OFFICE,
  PALACE,
  BEGGING,
  TEMPLE,
  ADRIFT,
]
