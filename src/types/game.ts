/**
 * 游戏核心数据模型。
 *
 * 两条铁律：
 *
 * 1. 这是一款游戏，不是一篇散文。状态、选择、反馈都必须是能查、能点、能看见的结构。
 *
 * 2. 玩家只能看到角色此刻能够合理认知的信息。
 *    十六岁的私塾学生不知道自己「悟性 48」，也不知道「气运平平」——
 *    他只知道「我读过几年书」「我不知道灵根是什么」。
 *    数值（Attributes）是引擎判定用的内部刻度，永远不出现在界面上；
 *    玩家读到的是 Aspect：角色的自述，以及别人对他说过的话。
 */

// ============================================================
// 时间
// ============================================================

/** 游戏内时间。以「人间第 N 年」纪年，一年十二月，一月三十日。 */
export interface GameTime {
  year: number
  /** 1–12 */
  month: number
  /** 1–30 */
  day: number
}

// ============================================================
// 角色 · 内部刻度
// ============================================================

/**
 * 引擎判定用的隐藏刻度，0–100。绝不渲染，只供 Condition 与观察系统取用。
 *
 * `memory` 与 `insight` 必须分开，这是整个认知层的地基：
 * 私塾先生凭读书快慢夸你「聪慧」，他量的其实是记性；
 * 修士说的「悟性」是另一样东西。一个记性极好、悟性平平的人，
 * 会在十六岁之前被所有人当作聪明孩子，然后在修行上撞墙——
 * 两个词合成一个刻度，这个故事就讲不出来了。
 */
export type AttributeKey =
  /** 体魄 */
  | 'body'
  /** 记性。背书、认药、记路，凡人世界里最容易被看见的一样 */
  | 'memory'
  /** 悟性。修行界说的那个「悟」，凡人几乎无从判断 */
  | 'insight'
  /** 心性 */
  | 'will'
  /** 气运 */
  | 'fortune'
  /** 修行资质（灵根）。从没测过，所以初值为 0 */
  | 'root'
  /** 神魂。修士才看得见 */
  | 'spirit'

export type Attributes = Record<AttributeKey, number>

export type Realm = '凡人' | '炼气' | '筑基' | '金丹' | '元婴'

// ============================================================
// 家世
// ============================================================

/**
 * 出身行当。不是开局可选的词条，是你睁开眼时家里就在做的事。
 *
 * 它决定的不是数值高低，是你会遇到谁、会听说什么：
 * 猎户的儿子从小进山，客栈的儿子从小听南来北往的人吹牛，
 * 药铺的女儿八岁认得三十味药，镖局的孩子见过父亲身上的刀口。
 *
 * 王府和皇室排在最后，也最稀有。它们不是「更好的开局」——
 * 宫墙里的孩子见不到山道上濒死的人，也见不到货郎摊上那册旧书。
 * **最尊贵的出身，机缘最少。**
 */
export type Trade =
  '农户' | '猎户' | '匠户' | '商户' | '客栈' | '酒楼' | '药铺' | '镖局' | '官宦' | '王府' | '皇室'

/**
 * 男女。
 *
 * 这一版只在两处真正分岔：宗室的称谓（太子/公主、世子/郡主），
 * 以及院试——本朝女子不应举。其余场景一律不分性别，
 * 不是因为古代女子的人生和男子一样，而是因为写一半比不写更糟。
 */
export type Gender = '男' | '女'

/**
 * 家人。
 *
 * 这里只记「他是我什么人」，不记他是谁——姓名、年岁、脾性、此刻在哪，
 * 全在 Person 那边。一个人不会因为你是他儿子就变成另一个人。
 */
export interface FamilyMember {
  /** 指向人口册里的那个人 */
  person: string
  /** 称谓：父、母、兄、姐 */
  relation: string
}

// ============================================================
// 关系网络
// ============================================================

/**
 * 一条关系。
 *
 * 关系是**两个人之间的一条边**，不是某个人身上的一个槽位。
 *
 * 这个区别是根本性的。做成槽位（fatherId / guardianId）的话，
 * 「姐姐当了家」就没处放——她既是姐又是抚养人，一个槽装不下两样；
 * 「老乞丐死了又来了个新的」也没处放。做成边就全都是免费的：
 * 加一条边而已，一个人可以同时连着好几种关系。
 */
export type Bond =
  /** 生父 */
  | '生父'
  /** 生母 */
  | '生母'
  /** 把你养大的人。跟生父生母是两回事 */
  | '抚养'
  | '兄'
  | '姐'
  | '弟'
  | '妹'
  /** 祖父母、叔伯、姑舅一类 */
  | '亲戚'
  /** 师承 */
  | '师'
  | '徒'
  /** 成家之后 */
  | '配偶'
  | '子'
  | '女'
  /** 说得上话的人 */
  | 'friend'
  | '仇'

export interface Relation {
  id: string
  /** 从谁 */
  from: string
  /** 到谁 */
  to: string
  bond: Bond
  /** 这条关系从哪一年起 */
  since: number
  /**
   * 到哪一年为止。null 表示还在延续。
   *
   * 关系断了也不从图里删——**老乞丐养过你这件事，
   * 不因为他死了就没发生过**。日后有人问起「谁把你养大的」，
   * 答案仍然是他。
   */
  until: number | null
}

// ============================================================
// 人
// ============================================================

/** 脾性。它决定这个人自己会怎么选，不是决定他对你多好 */
export type Temper = '谨慎' | '温和' | '刚硬' | '精明' | '木讷' | '暴躁'

/**
 * 身子骨的底子。
 *
 * **它不是 debuff，是人生的形状。**
 *
 * 一个腿脚不便的孩子下不了地、走不了山道、习不了武——那是关掉的门。
 * 可他因此常年待在家里，摸到书的机会比谁都多；家里也更愿意送他去念书，
 * 因为他反正干不了活。那是打开的门。
 *
 * 反过来，一个身板极好的人未必适合修行——**体魄、记性、悟性、资质
 * 本来就是四样东西**，这一条在观察系统里已经立住了，这里只是接着用。
 *
 * 所以没有哪一种体质是「更强的开局」。它们通向不同的路。
 */
export type Constitution =
  /** 没什么毛病 */
  | '康健'
  /** 底子薄，常生病 */
  | '体弱'
  /** 腿脚不便 */
  | '跛'
  /** 目不能视 */
  | '盲'
  /** 耳背 */
  | '聋'
  /** 不会说话 */
  | '喑'

/** 一个人此刻的下落 */
export type Fate =
  /** 在世，知道在哪 */
  | '在'
  /** 死了 */
  | '殁'
  /** 活不见人死不见尸。跟「殁」是两回事——家里不能办丧事，也不能改嫁 */
  | '杳'

/**
 * 他这辈子发生过的一件事。
 *
 * `known` 是玩家知不知道，不是发生没发生。
 * 父亲十八岁跟商队去过北方，这件事从他十八岁那年起就是真的了，
 * 而玩家可能到十六岁才第一次听说——甚至一辈子不知道。
 */
export interface Chapter {
  id: string
  /** 他那年多大 */
  atAge: number
  what: string
  known: boolean
}

/**
 * 一个真实存在的人。
 *
 * 不是事件触发器，也不是「父亲」这个位置上插着的一块牌子。
 * 他有名有姓、有年纪、有脾气，有自己的去处——
 * **而且玩家不在场的时候他照样活着**。
 *
 * 父亲离家做工，不是把 `father` 置成 `dead` 就完了：
 * 他人在青州某县，是个商队伙计，穷，还以为自己的孩子在老家等他。
 * 几年后玩家在茶摊边看见一个中年男人跟伙计争价钱——
 * 系统不会跳出「【发现父亲】」，玩家得自己认出来，也可能认不出来。
 */
export interface Person {
  id: string
  surname: string
  given: string
  gender: Gender
  /** 生于世界纪年第几年。年龄由它和当下时序算出来，不单独存 */
  bornYear: number
  /** 营生 */
  trade: string
  temper: Temper
  /** 身子骨，隐藏刻度。跟玩家的属性一样绝不上界面 */
  health: number
  /** 此刻人在哪。玩家不在场也照样会变 */
  place: string
  fate: Fate
  /** 他这辈子的事。玩家只看得见 known 的那些 */
  history: Chapter[]
}

/**
 * 玩家认识的这个人。
 *
 * 世界事实 ≠ 玩家认知，在这里第二次落地：
 * Person 是他本人，Acquaintance 是玩家眼里的他。
 *
 * 所以「知道他叫什么」是一个独立的开关。渡口那个青衫人有名有姓，
 * 玩家却只会叫他「渡口的青衫人」——直到某天有人当着他的面喊出那个名字。
 */
export interface Acquaintance {
  person: string
  /** 玩家此刻怎么称呼他：「爹」「周先生」「渡口的青衫人」 */
  calls: string
  /** 知道他姓名吗。不知道就一直用 calls */
  knowsName: boolean
  /** -100 仇怨，100 生死之交。只用于判定 */
  affinity: number
  /** 玩家对这个人的一句话印象 */
  note?: string
}

/**
 * 家境。
 *
 * standing 与 debt 是隐藏刻度，和 Attributes 一样绝不上界面。
 * 玩家读到的是「今年的米撑不到开春」，不是「家产 -50」——
 * 「家道中落」不是一个词条，是这两个数连着几年往下走之后，
 * 你被叫去下地干活、私塾再没去成的那一串后果。
 */
export interface Household {
  trade: Trade
  /** 家境，0–100。隐藏 */
  standing: number
  /** 欠债，0 起。隐藏 */
  debt: number
  members: FamilyMember[]
}
// ============================================================
// 人生阶段
// ============================================================

/**
 * 人生阶段。
 *
 * 年龄只是刻度，阶段才决定这一年你可能撞上什么。
 * 「私塾」不在其列——不是所有人都读得起书，
 * 那是「启蒙」这一段里的一条岔路，不是人人必经的一站。
 */
export type LifeStage = '幼年' | '启蒙' | '少年' | '成年'

// ============================================================
// 角色 · 认知层
// ============================================================

/** 角色会去打量自己的几个方面。 */
export type AspectKey = 'body' | 'learning' | 'cultivation' | 'root'

/**
 * 他人之言。
 *
 * 认知层的关键：一名炼气修士说你「不错」，宗门执事说你「中下」，
 * 两句话都会留在这里。玩家日后翻看，才会发现当初那个「不错」
 * 根本不是自己理解的意思。所以评价只增不改。
 */
export interface AspectClaim {
  id: string
  /** 谁说的：「一名炼气修士」「宗门执事」 */
  source: string
  /** 他说了什么 */
  text: string
  /** 你对这句话的理解——通常是不理解 */
  doubt?: string
  at: GameTime
}

// ============================================================
// 观察：真实属性 → 观察能力 → 观察结果 → 语言 → 玩家理解
// ============================================================

/**
 * 一把尺子。
 *
 * 它量的东西**不等于任何一个真实属性**——这是整套系统的立足点。
 * 私塾先生眼里的「聪慧」，记性占七成、悟性占三成，
 * 因为他只能从背书快慢去推断；修士说的「悟性」才是那一样单独的东西。
 *
 * 于是「先生说的聪明和修士说的悟性根本不是一回事」不再是一句设定，
 * 而是两把权重不同的尺子量出来的两个数。
 */
export interface Lens {
  /** 这把尺子的名字，只用于调试与走查 */
  id: string
  /** 量的是哪几样真实属性，各占多重 */
  weights: Partial<Record<AttributeKey, number>>
  /** 量出来的话挂到哪一面下 */
  aspect: AspectKey
}

/**
 * 一个会开口评价你的人。
 *
 * `acuity` 是他的判断力，不是他的地位：
 * 乡下郎中看身体比宗门长老准，长老看资质比郎中准。
 * 判断力低的人不是会说谎，是会看错——他说的是他真看到的。
 */
export interface Observer {
  id: string
  /** 玩家会怎么称呼他 */
  name: string
  /** 他会看哪几样，各有多准 */
  readings: readonly Reading[]
}

export interface Reading {
  lens: Lens
  /**
   * 判断力，0–100。
   *
   * 它决定观察结果偏离真值多远。一个炼气修士看「悟性」只有五十几分的准头，
   * 所以他说「悟性一般」的时候，可能真的看错了——
   * 而玩家永远不会知道他看错了。
   */
  acuity: number
  /** 他管这把尺子叫什么：先生叫「聪慧」，修士叫「悟性」 */
  calls: string
  /** 分档措辞。同一个数，不同的人说法不同 */
  phrasing: readonly Phrase[]
  /** 玩家听完这句话之后的困惑。不写就是听懂了 */
  doubt?: string
}

/** 一档措辞。自上而下取第一个够得着的 */
export interface Phrase {
  atLeast: number
  says: string
}

export interface Aspect {
  /** 角色的自述。null 表示他连这回事都不知道 */
  self: string | null
  claims: AspectClaim[]
}

export type Aspects = Record<AspectKey, Aspect>

/** 人际。affinity 为 -100（仇怨）至 100（生死之交），同样只用于判定。 */
export interface Relationship {
  id: string
  name: string
  affinity: number
  note?: string
}

/**
 * 随身之物。
 *
 * name 是你此刻会怎么称呼它，不是它究竟是什么。
 * 山道上捡的那本书，在你眼里很多年都只是「一册旧书」；
 * 直到某个修士瞥了一眼说出它的名字，它才变成「炼气法门」——
 * 东西一直没变，变的是你。改名靠 reveal 效果，见下。
 */
export interface InventoryItem {
  id: string
  name: string
  count: number
  /** 量词：枚、册、把…… */
  unit: string
  note?: string
  /** 曾被人点破过。面板据此标出「原先你叫它……」 */
  formerName?: string
}

// ============================================================
// 世界认知
// ============================================================

export type KnowledgeCategory = '世事' | '修行' | '地理' | '人物' | '器物'

/**
 * 见闻。玩家「知道」某件事，本身就是一种游戏状态。
 *
 * summary 为 null 表示「只听过这个名字，还不知道是什么」——
 * 这一档不能省，它是「玩家知道什么 ≠ 世界真实存在什么」的具体形态。
 */
export interface KnowledgeEntry {
  id: string
  title: string
  summary: string | null
  category: KnowledgeCategory
  learnedAt: GameTime
}

export type FlagValue = boolean | number | string

/** 编年：人生大事记，与逐字正文分开，供回看这一生。 */
export interface ChronicleEntry {
  id: string
  time: GameTime
  text: string
  tone?: InkTone
}

// ============================================================
// 叙事
// ============================================================

/**
 * 墨色即信息层级：
 *   faint 淡墨（次要）· normal 墨色（正文）· deep 浓墨（重要）· cinnabar 朱砂（关键/危险）
 */
export type InkTone = 'faint' | 'normal' | 'deep' | 'cinnabar'

/** 分隔符样式：细线（章节）· 三点（停顿）· 墨迹（场景转换） */
export type DividerVariant = 'line' | 'dots' | 'ink'

export type NarrativeBlock =
  /** 叙事正文 */
  | { kind: 'narration'; text: string; tone?: InkTone; indent?: boolean }
  /** 对话。speaker 省略时表示上下文已点明是谁在说 */
  | { kind: 'dialogue'; speaker?: string; text: string; tone?: InkTone }
  /** 事件：发生了什么，区别于「你看见什么」 */
  | { kind: 'event'; text: string; tone?: InkTone }
  /** 回执：引擎结算出的状态变化。以〔〕括起，与叙事分明——这是游戏反馈，不是文学 */
  | { kind: 'record'; text: string; tone?: InkTone }
  /** 场景标题 */
  | { kind: 'heading'; title: string; subtitle?: string }
  /** 印章：一卷的收束。全局罕用 */
  | { kind: 'seal'; text: string }
  /** 回响：玩家刚做出的选择，留在正文里使卷轴连贯 */
  | { kind: 'echo'; text: string }
  | { kind: 'divider'; variant?: DividerVariant }

/** 卷轴中的一条。id 用于稳定的 :key。 */
export interface StreamItem {
  id: string
  block: NarrativeBlock
}

// ============================================================
// 条件与效果
// ============================================================

export interface Condition {
  flag?: { key: string; equals?: FlagValue }
  attribute?: { key: AttributeKey; atLeast: number }
  knowledge?: string
  item?: string
  /** 年龄闭区间 */
  age?: { atLeast?: number; atMost?: number }
  /** 家境刻度闭区间。隐藏刻度，只在这里露面 */
  standing?: { atLeast?: number; atMost?: number }
  /** 某位家人是否在世 */
  family?: { id: string; alive: boolean }
  /**
   * 有没有某一层关系，那个人还在不在。
   *
   * 剧本必须能问「你还有爹吗」——否则孤儿会读到自己死去的父亲下地干活。
   * 这一条是关系网做出来之后，剧本层必须跟上的守门人。
   */
  bond?: { kind: Bond; alive?: boolean }
  trade?: Trade
  gender?: Gender
  stage?: LifeStage
}

/**
 * 状态变化的唯一表达方式。
 * 剧本只声明「发生了什么」，怎么落到 store 由 engine/effects.ts 统一结算。
 */
export type Effect =
  | { type: 'time'; years?: number; months?: number; days?: number }
  | { type: 'attribute'; key: AttributeKey; delta: number }
  | { type: 'flag'; key: string; value: FlagValue }
  | { type: 'place'; place: string }
  /**
   * 搬家。
   *
   * 跟 place 的区别：place 是「你此刻人在哪」，home 是「你家在哪」。
   * 抄家、削爵、逃荒之后，回家这个动作指向的地方就变了——
   * 只改 place 的话，收尾那一卷一句「你回到家」会把废太子送回东宫。
   */
  | { type: 'home'; place: string }
  | { type: 'realm'; realm: Realm }
  | { type: 'identity'; identity: string }
  /** 改写角色对自己某一面的看法 */
  | { type: 'aspect'; key: AspectKey; self: string | null }
  /** 别人对你的评说。只增不改，认知的错位就藏在这里 */
  | { type: 'claim'; key: AspectKey; source: string; text: string; doubt?: string }
  /**
   * 有人打量了你一眼。
   *
   * 跟 claim 的区别是根本性的：claim 是剧本作者写死的一句话，
   * observe 是**算出来的**——拿这个人的尺子去量你的真实属性，
   * 按他的判断力加上偏差，再按他的说话习惯选一档措辞。
   *
   * 所以同一个角色，先生说「记性极好」，炼气修士说「悟性一般」，
   * 宗门长老说「资质不错，悟性普通」。三句话都是真话，
   * 都来自同一份真实数据，只是量的东西和量的准头不同。
   *
   * 铁律：它只往认知层写，一个字也不碰真实属性。
   */
  | { type: 'observe'; observer: string }
  | { type: 'relation'; id: string; name: string; delta: number; note?: string }
  | {
      type: 'knowledge'
      id: string
      title: string
      /** null 表示只听过名字 */
      summary: string | null
      category: KnowledgeCategory
    }
  | { type: 'item'; id: string; name: string; count?: number; unit?: string; note?: string }
  | { type: 'chronicle'; text: string; tone?: InkTone }
  /** 家境涨落。隐藏刻度，不出回执——玩家该从叙事里读出来，不是从账单上 */
  | { type: 'household'; standing?: number; debt?: number }
  /** 家人境况改写。alive 转 false 即此人不在了 */
  | { type: 'family'; id: string; alive?: boolean; note?: string }
  /**
   * 改写一个人的下落。
   *
   * 跟 family 的区别：family 说的是「我家那位怎么样了」，
   * person 说的是「这个人现在在哪、干什么、还在不在」——
   * 后者对世界上任何一个人都成立，跟他是不是你爹无关。
   *
   * 父亲离家做工不是把他删掉，是 `{ place: '青州某县', trade: '商队伙计' }`。
   * 他还在那儿，只是不在你眼前。
   */
  | {
      type: 'person'
      id: string
      place?: string
      trade?: string
      fate?: Fate
      health?: number
    }
  /**
   * 玩家认识了一个人，或者跟已经认识的人又亲近／疏远了一点。
   *
   * `calls` 是玩家此刻怎么称呼他——「渡口的青衫人」而不是他的名字。
   * 只在头一次遇见时需要写；对已经认识的人调好感，省掉它就行。
   *
   * 名字要另外由 `name: true` 才算知道，因为「认识一个人」和
   * 「知道他叫什么」本来就是两回事：你可以跟人打十年交道只知道他叫老周。
   */
  | { type: 'meet'; id: string; calls?: string; delta?: number; note?: string; name?: boolean }
  /**
   * 玩家得知了某人过去的一件事。
   *
   * 「原来爹年轻时去过北方」——那件事从他十八岁那年起就是真的，
   * 玩家今天才知道。这是人身上的「多年以后才明白」。
   */
  | { type: 'recall'; id: string; chapter: string }
  /**
   * 世界在幕后掷一次骰，把结果写进旗标。
   *
   * 「机缘」不翻车的关键就在这里：山道上躺着的那个人是猎户、是修士、还是邪修，
   * 在你看见他之前就已经定了。你的选择改变的是自己撞上什么，
   * 不是把他变成对你有利的那一种。玩家永远看不到这一掷。
   */
  | { type: 'roll'; key: string; among: readonly { value: FlagValue; weight: number }[] }
  /**
   * 你终于认出手里这东西是什么。
   * 「多年以后才明白当年捡到的不是普通书」全靠它落地，
   * 所以它是少数几个会以朱砂回执报账的效果之一。
   */
  | { type: 'reveal'; item: string; name: string; note?: string }

// ============================================================
// 剧本
// ============================================================

export interface Choice {
  id: string
  label: string
  /** 朱砂标记：危险、异常，或再无回头路 */
  critical?: boolean
  /** 常驻于选项右侧的小字说明 */
  hint?: string
  /**
   * 条件不满足时的灰置理由。
   * 写了它，这条路就以「够不到」的样子留在选项里，让玩家知道此处有路；
   * 不写，条件不满足时整条选项隐去。
   */
  lockedHint?: string
  /** 选后留在正文中的回响文字；缺省则回响 label */
  echo?: string
  requires?: Condition[]
  effects?: Effect[]
  /** null 表示本卷终了 */
  next: string | null
}

/** 呈交给界面的选项：附带「此刻能不能选」与「要花掉多少时间」。 */
export interface ChoiceOption {
  choice: Choice
  locked: boolean
  /** 时间代价，如「三年」「半月」。不花时间的选项为 null */
  cost: string | null
}

export interface SceneNode {
  id: string
  /** 进入本节点即结算 */
  onEnter?: Effect[]
  blocks: NarrativeBlock[]
  choices?: Choice[]
  /**
   * 按条件分流，自上而下取第一个满足的。
   *
   * 用在「同一个动作，结果取决于玩家不知道的事」：你上前查看倒在山道上的人，
   * 选项只有一条，但他是猎户还是邪修早已掷定，从这里分头走。
   */
  branches?: { requires: Condition[]; next: string }[]
  /** 无选项时自动续接的下一节点，用于把长段落切分成有呼吸的几节 */
  next?: string
}

export interface Scene {
  id: string
  title: string
  /** 起始节点 id */
  entry: string
  nodes: Record<string, SceneNode>
}

/** 场景库。跨卷跳转写作 `场景id#节点id`，省略 `#节点id` 即从该卷入口进。 */
export type SceneLibrary = Record<string, Scene>

// ============================================================
// 年表
// ============================================================

/**
 * 人生事件：某一年可能落到你头上的一件事。
 *
 * 这里是本作最容易翻车的地方——事件池 + 掷骰 = 随机事件模拟器。
 * 三条约束把它拉回「人生」：
 *
 * 1. **链优先**。写了 chain 的事件排在散事件前面。父亲欠了债，
 *    接下来该来的是他去外地做工，不是随机撞上的一场庙会。
 * 2. **条件即因果**。事件靠 requires 串起来，前一件事留下的旗标
 *    是后一件事的入场券。链条是长出来的，不是编号排出来的。
 * 3. **窗口不是日程**。window 只说「这事最早最晚可能在几岁发生」，
 *    条件不满足就永远不发生——很多人的一生里它确实没发生过。
 */
export interface LifeEvent {
  id: string
  /** 可能发生的年龄闭区间 */
  window: { from: number; to: number }
  requires?: Condition[]
  /** 因果链的名字。同链事件优先于散事件 */
  chain?: string
  /** 同级候选中的相对权重，缺省为 1 */
  weight?: number
  /** 要演的那一卷，写法同 next */
  scene: string
}

// ============================================================
// 界面
// ============================================================

/** 底栏六个面板。第三层信息（认知）与第二层（状态）都从这里进。 */
export type PanelKey = 'character' | 'inventory' | 'knowledge' | 'relations' | 'chronicle' | 'world'
