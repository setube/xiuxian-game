import type {
  Attributes,
  Business,
  Census,
  Livelihood,
  NarrativeBlock,
  OriginId,
  Station,
} from '@/types/game'

import { CAPITAL } from './geography'

/**
 * 出身。
 *
 * 这不是开局可选的九张卡。玩家看不到这个列表，也不会被问「你想生在哪一家」——
 * 游戏第一句话就是既成事实：「你生在柳溪村，家里有六亩薄田。」
 *
 * 出身决定的不是数值高低，而是**你会遇到谁、会听说什么**。
 * 猎户的儿子从小进山，客栈的儿子从小听南来北往的人吹牛，
 * 药铺的女儿八岁就认得三十味药，护送行商那一家的孩子见过父亲身上的刀口。
 * 他们最后都可能踏上修行路，但为什么遇到、什么时候遇到、遇到的是谁，全然不同。
 *
 * 权重照着真实的社会结构配：种地的占四成，当官的百里挑一。
 * 稀有出身不是「更好的开局」——官宦子弟识字最多，但手无缚鸡之力，
 * 而且他家那点权势在修行者眼里一文不值。
 *
 * ## 一行是四格，不是一个词
 *
 * 上一版每一行只有一个 `trade: '客栈'`，而那个词同时在说四件事：
 * 官府认定这家是民户、这家靠经商过活、家里那处铺面是客栈、这是寻常人家。
 * 四件事挤在一个词里，于是「凡是做买卖的人家」这种条件写不出来——
 * 只能把 `商户 客栈 酒楼` 挨个列一遍，而列漏一个没有任何机器会提醒。
 *
 * 现在四格分开写，各自回答一个问题（见 `types/game.ts` 里那一段）。
 * 看这张表最快的读法是竖着看某一列：
 *
 *     census      十二行里只有四种值，因为籍本来就粗
 *     livelihood  九种，这是这张表真正的骨架
 *     business    四行有铺面，八行是 null——null 那八行整段不成立
 *     station     只有三种，而它是唯一一格人生中途还会变的
 *
 * 竖着看还能看出一件不那么显眼的事：**`livelihood` 一列已经把 `census`
 * 一列决定死了**（务农→民户、木工→匠户、行医→医户、食禄→宗室，
 * 十二行没有例外）。所以籍这一格今天不靠取值养活自己，它靠的是
 * 削爵那天不跟着 `station` 走——静态上它是冗余的，动态上它不是。
 * 哪天「世代军籍那一家」写出来，这句话才会连静态那一半也成立。
 */
export interface Origin {
  /**
   * 主键。剧本要精确到某一行的时候问它。
   *
   * 留一个 id 而不是拿四格拼，是因为宫里那一支和藩府那一支
   * **四格完全相同**，可它们是两卷不同的内容。
   */
  id: OriginId
  /** 籍：官府认定这家是什么户 */
  census: Census
  /** 业：这一家靠什么过活 */
  livelihood: Livelihood
  /** 产：家里那一处铺面。没有就是 null */
  business: Business | null
  /** 家世：这是什么样的人家 */
  station: Station
  weight: number
  /**
   * 家在城里乡里的哪一处，只到街巷村名这一级。
   *
   * 州府是另外掷的（见 geography.ts），两边组合才成完整地址——
   * 于是一个农家子可能生在江陵府的杏花坞，也可能生在东莱府的下河屯，
   * 而不是所有人都挤在临江府。
   */
  locales: readonly string[]
  /**
   * 家不在州府，而在京城。
   *
   * 只有皇室填它。填了之后，`{province}` 与 `{prefecture}` 仍然指向
   * 那个照常掷出来的府——那是他日后被贬去的地方，
   * 在旨意下来之前，他自己也不知道有这么个府。
   */
  capital?: string
  /** 家境初值区间 */
  standing: { from: number; to: number }
  /**
   * 隐藏刻度初值。生在哪一家，身子骨和见识本来就不一样。
   *
   * 唯独不含 root 与 spirit：修行资质与神魂由出生那一刻单独掷，
   * 跟你家做什么营生毫无关系。王府的孩子和农户的孩子在那一掷上平等——
   * 这是全作最要紧的一处平等，凡间的一切在那里都不作数。
   */
  attributes: Omit<Attributes, 'root' | 'spirit'>
  /** 起名用字。识字人家才取雅字，这本身就是家境 */
  given: readonly string[]
  father: string
  mother: string
  /** 出生那一节的正文 */
  opening: readonly NarrativeBlock[]
}

export const SURNAMES = ['沈', '陈', '柳', '周', '方', '许', '苏', '程', '韩', '江'] as const

export const ORIGINS: readonly Origin[] = [
  {
    id: 'farm',
    census: '民户',
    livelihood: '务农',
    business: null,
    station: '寻常',
    weight: 78,
    locales: ['柳溪村', '下河屯', '青石铺', '杏花坞', '王家庄', '桑园里', '芦花荡'],
    standing: { from: 26, to: 38 },
    attributes: { memory: 32, insight: 30, body: 42, will: 40, fortune: 30 },
    given: ['禾', '石', '根', '田', '来', '福'],
    father: '在地里。农忙时天不亮就出门。',
    mother: '操持家中六亩田，也接些针线活。',
    opening: [
      { kind: 'narration', text: '你生在{province}{prefecture}城外三十里，{here}。' },
      { kind: 'narration', text: '家里有六亩薄田，一头牛是跟邻家合养的。' },
      { kind: 'narration', text: '你出生那日下着雨。母亲第二天就下了地。' },
    ],
  },
  {
    id: 'hunt',
    census: '民户',
    livelihood: '打猎',
    business: null,
    station: '寻常',
    weight: 22,
    locales: ['石坳', '北岭', '鹰嘴崖', '黑松坡', '猎户屯'],
    standing: { from: 28, to: 40 },
    attributes: { memory: 40, insight: 34, body: 48, will: 44, fortune: 26 },
    given: ['山', '虎', '岩', '猛', '青', '林'],
    father: '进山。少则三日，多则半月。',
    mother: '在家硝皮子，也认得几味草药。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}北面的山脚下，{here}。' },
      { kind: 'narration', text: '家里靠打猎过活。皮子硝好了拿去镇上换钱。' },
      { kind: 'narration', text: '你出生那年冬天格外冷。父亲后来说，你是听着狼叫长大的。' },
    ],
  },
  {
    /**
     * 匠户。
     *
     * 全表唯一一行籍和业**必须分开写**的：籍是匠户（官府定的，世袭，
     * 要轮班当差），业是木工（他实际在做的活）。上一版这两件事共用
     * 「匠户」一个词，于是「这家人改行去码头扛活」写不出来——
     * 一改就把籍一起改了，而改籍要旨意。
     */
    id: 'craft',
    census: '匠户',
    livelihood: '木工',
    business: null,
    station: '寻常',
    weight: 20,
    locales: ['南关外', '东窑', '铁匠巷', '砖窑口', '锯木场'],
    standing: { from: 38, to: 50 },
    attributes: { memory: 44, insight: 42, body: 36, will: 38, fortune: 28 },
    given: ['木', '直', '规', '斧', '成', '砚'],
    father: '做木工。既做嫁妆，也做棺材。',
    mother: '帮着打下手，家中琐事都归她。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}，匠户聚居的那一片。' },
      { kind: 'narration', text: '父亲是个木匠。既做嫁妆，也做棺材。' },
      { kind: 'narration', text: '你从小闻着木头味长大，很早就分得出松和杉。' },
    ],
  },
  {
    /**
     * 布庄。
     *
     * 上一版这一行叫「商户」，而那个词把业和产压成了一格：
     * 这一家的业是经商，产是一间布庄，**跟客栈酒楼是同一层东西**。
     * 开场正文里那句「家中开着一间布庄」当时只是一句文案，
     * 剧本读不到它，于是铺子里那几卷只能挨个列出身名。
     */
    id: 'cloth',
    census: '民户',
    livelihood: '经商',
    business: '布庄',
    station: '寻常',
    weight: 18,
    locales: ['西街', '南市', '绸缎街', '货栈巷', '通汇坊'],
    standing: { from: 56, to: 70 },
    attributes: { memory: 46, insight: 40, body: 28, will: 34, fortune: 40 },
    given: ['安', '瑞', '丰', '砚', '知', '书'],
    father: '守着铺子。见的人多，话不多。',
    mother: '管着后院和账上的零碎。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}城里，{here}。' },
      { kind: 'narration', text: '家中开着一间布庄。铺面不大，进出的人不少。' },
      {
        kind: 'narration',
        text: '你出生那日，父亲正在盘账。他放下算盘来看了你一眼，又回去把那笔账算完了。',
      },
    ],
  },
  {
    /**
     * 客栈。
     *
     * 这一家的孩子不必出门就见过整个天下：往北出关的、往南下海的、
     * 逃难的、赶考的、押货的，都在他家歇过脚。
     * 所以他的气运高得没道理——那只是因为路过的人足够多。
     */
    id: 'inn',
    census: '民户',
    livelihood: '经商',
    business: '客栈',
    station: '寻常',
    weight: 16,
    locales: ['北门外', '官道旁', '十里铺', '渡口街', '驿马巷'],
    standing: { from: 44, to: 58 },
    attributes: { memory: 44, insight: 42, body: 36, will: 34, fortune: 42 },
    given: ['来', '迎', '安', '顺', '通', '达'],
    father: '守着店。天南地北的人他都见过，话却不多。',
    mother: '灶上、账上、被褥，都是她一个人。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}，一间客栈。' },
      { kind: 'narration', text: '南来北往的人在这里歇脚。一年到头没有真正静下来的时候。' },
      { kind: 'narration', text: '你出生那夜店里住满了人。母亲的动静，混在楼下的划拳声里。' },
    ],
  },
  {
    /**
     * 酒楼。
     *
     * 跟客栈的区别在于：客栈的人是过路的，酒楼的人是本地的。
     * 一个孩子在这里听到的不是远方，是这座城里谁跟谁有过节、
     * 哪家的银子来路不明、去年秋天衙门里死了个人。
     */
    id: 'tavern',
    census: '民户',
    livelihood: '经商',
    business: '酒楼',
    station: '寻常',
    weight: 14,
    locales: ['鼓楼下', '十字街', '状元桥', '望江楼下', '闹市口'],
    standing: { from: 52, to: 66 },
    attributes: { memory: 42, insight: 44, body: 34, will: 32, fortune: 38 },
    given: ['醇', '香', '满', '丰', '酌', '盈'],
    father: '掌勺。一年到头闻着油烟，手上全是烫疤。',
    mother: '在前堂招呼客人。嘴上不饶人，账算得比谁都清。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}，一间酒楼。' },
      { kind: 'narration', text: '铺面两层，楼下散座，楼上雅间。' },
      {
        kind: 'narration',
        text: '你出生那日正逢三月三，楼下坐满了人。父亲在灶上，散席才上来看了你一眼。',
      },
    ],
  },
  {
    /**
     * 药铺。
     *
     * 全作最要紧的一条暗线在这里：这一家的孩子从小认药材。
     * 「认得草木」这件事在凡人阶段只是个营生，
     * 可修行界的灵草也是草——多年以后，他会是唯一一个
     * 看见那株东西时觉得「这不对」的人。
     *
     * 籍是医户——明代确有医户，跟军民匠灶一样是「以籍为定」的一种。
     * 这一行因此是全表唯一一处业和籍**互相印证**的：这家人世代行医，
     * 官府册子上写的也是医户。跟匠户那一行正好相反。
     */
    id: 'herb',
    census: '医户',
    livelihood: '行医',
    business: '药铺',
    station: '寻常',
    weight: 13,
    locales: ['东街', '药王巷', '回春巷', '济世坊', '晒药坪'],
    standing: { from: 50, to: 62 },
    attributes: { memory: 52, insight: 46, body: 30, will: 36, fortune: 32 },
    given: ['芝', '苓', '参', '术', '和', '济'],
    father: '坐堂看诊。三代都是郎中。',
    mother: '管着药柜。认得的药比父亲还多，只是不出诊。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}，一间药铺。' },
      { kind: 'narration', text: '前堂看诊，后院晒药。三代人都是郎中。' },
      { kind: 'narration', text: '你出生那日，父亲正在给人切脉。他让那人等了半刻钟。' },
    ],
  },
  {
    /**
     * 护送行商的人家。
     *
     * 唯一一个从小见过血、也从小听大人说「有些地方不能走」的出身。
     * 那句「不能走」不是迷信——车队真的在山里丢过人。
     * 这一家的孩子比谁都早知道：这世上有凡人惹不起的东西。
     *
     * 从前这一行叫「镖局」。镖局作为成熟的行业组织多系于清代，明代「标客／标行」
     * 之说待核（design/ming-society.md 审查表），所以不绑那个后世固化的机构名：
     * 这一家靠**护送货物、行客、长途行旅**过活，跟车队走，没有一处铺面——
     * 产那一格是 null，院里有的是兵器架和一张走烂了的路图。
     */
    id: 'escort',
    census: '民户',
    livelihood: '护送',
    business: null,
    station: '寻常',
    weight: 11,
    locales: ['西关', '校场后街', '武库巷', '演武场东', '骡马巷'],
    standing: { from: 46, to: 60 },
    attributes: { memory: 38, insight: 32, body: 52, will: 48, fortune: 24 },
    given: ['威', '镇', '雄', '行', '平', '安'],
    father: '跟车队走，护送货物和行客。一趟出去两三个月，回来先脱靴子看脚。',
    mother: '在家管着账，也会两手拳脚。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}。' },
      { kind: 'narration', text: '院里立着兵器架，墙上钉着一张走烂了的路图。' },
      { kind: 'narration', text: '你出生那年父亲正在关外。等他回来，你已经会翻身了。' },
    ],
  },
  {
    /**
     * 官宦。
     *
     * 最稀有，也最容易被误当成「最好的开局」。
     * 他识字最多、家底最厚，但手无缚鸡之力，
     * 而且他家那点权势在修行者眼里一文不值——
     * 八品官的儿子和农户的儿子站在渡口，青衫人看他们的眼神是一样的。
     *
     * 这一行最能说明为什么四格非拆不可：**「官宦」从来不是一种户籍。**
     * 八品官的家在黄册上仍旧是民户，他本人的差事才是官——
     * 所以籍写民户，业写做官，而「这是官宦人家」是第三格的事。
     *
     * 业从前写的是「当差」，跟底下衙役那一行是一行。八品是官，当差可指役，
     * 两种人塞进一类——用户 2026-09-06 定的：**拆成两行，不二选一。**
     *
     * 拆开之后有一处内容立刻变准了：七岁开蒙那一卷里
     * 「官宦人家不送孩子去村塾」问的是家世不是营生，
     * 现在它写的就是 `{ station: '仕宦' }`。
     */
    id: 'office',
    census: '民户',
    livelihood: '做官',
    business: null,
    station: '仕宦',
    weight: 7,
    locales: ['衙后街', '学政巷', '儒林坊', '府前街', '清风巷'],
    standing: { from: 72, to: 88 },
    attributes: { memory: 50, insight: 48, body: 26, will: 30, fortune: 44 },
    given: ['珩', '瑜', '彦', '承', '儒', '旸'],
    father: '在府衙做官，八品。早出晚归，回来多半在书房。',
    mother: '出自书香人家。管着内宅，也教你认字。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}。' },
      { kind: 'narration', text: '父亲在府衙做官，八品。院子不大，种着两株石榴。' },
      {
        kind: 'narration',
        text: '你出生那日父亲在衙门当值。散值回来看了一眼，说了句「好」，就进书房去了。',
      },
    ],
  },
  {
    /**
     * 衙役。
     *
     * 从前这一行跟上面那一行是一行：「在府衙当差，八品」——八品是官，当差可指役，
     * 两种人塞进一类。用户 2026-09-06 定的：**拆成两行，不二选一。** 官与役在地位、
     * 财产、教育、婚姻圈、子女出路、跟普通人的关系、衙门内的权限上全不一样。
     *
     * 役是**在一个制度组织里受约束的人**：差是上头派的，今年有明年不一定有；
     * 点卯、催粮、跑腿，腰牌说收就收。这是「人在某个地方生活」往「人在一个组织里
     * 当差、受它管束」推进的第一行——第一片只写腰牌那一件事，别的等内容来要。
     *
     * **不写「役户子孙不得应试」。** 明代这一条不如清代明确（design/ming-society.md 3.2），
     * 拿一个模糊的「衙役」概念直接推出一句永久世袭禁令，是用户明令不许的。
     * 这一家的孩子念得起书就能去考院试，跟农户的孩子一样。
     */
    id: 'yamen',
    census: '民户',
    livelihood: '当差',
    business: null,
    station: '寻常',
    weight: 9,
    locales: ['衙前街', '县后街', '快手巷', '南门根', '铺司巷'],
    standing: { from: 30, to: 46 },
    attributes: { memory: 30, insight: 36, body: 44, will: 40, fortune: 28 },
    given: ['旺', '顺', '发', '贵', '禄', '安'],
    father: '在衙门当差，快班的。早晚点卯，其余时候在街上。',
    mother: '在家。也帮人浆洗，补贴家用。',
    opening: [
      { kind: 'narration', text: '你生在{prefecture}{here}，衙门后头那条巷子。' },
      { kind: 'narration', text: '父亲在衙门当差。腰牌挂在门后，靴子上总是有土。' },
      { kind: 'narration', text: '你出生那日父亲在外头催粮，三天后才回来。' },
    ],
  },
  {
    /**
     * 王府。
     *
     * 藩王就藩在某一个府，所以这一家的孩子和城外的农户其实同在一片天下，
     * 只是隔着三十里和一道王府的墙。
     *
     * 他什么都有，唯独没有「碰上事」的机会——出门有人跟着，
     * 山道不会让他走，货郎的摊子他这辈子都不会蹲下去看。
     *
     * 它跟底下皇室那一行**四格一模一样**：籍宗室、业食禄、无产、家世宗室。
     * 这不是没填全，是实情——从「这家人是什么样的」这个角度看，
     * 藩府和宫里确实是同一种人家。分得开它们的只有 `id`，
     * 而那正是主键该干的事：合并写 `{ station: '宗室' }`，
     * 分开写 `{ origin: 'manor' }`。
     */
    id: 'manor',
    census: '宗室',
    livelihood: '食禄',
    business: null,
    station: '宗室',
    weight: 4,
    locales: ['靖王府', '恭王府', '庄王府', '肃王府', '宁王府', '睿王府'],
    standing: { from: 88, to: 96 },
    attributes: { memory: 48, insight: 46, body: 28, will: 28, fortune: 50 },
    given: ['琰', '璟', '宸', '瑾', '澈', '昭'],
    father: '就藩在此的王爷。一年到头见不了几面。',
    mother: '王妃。管着王府内外，说话比父亲还有分量。',
    opening: [
      { kind: 'narration', text: '你生在{province}{prefecture}，{here}。' },
      { kind: 'narration', text: '父亲是当今天子的堂弟，封王就藩，开府在此已经十二年。' },
      {
        kind: 'narration',
        text: '你出生那日王府摆了三天流水席。父亲在前殿受贺，天黑才来看你。',
      },
    ],
  },
  {
    /**
     * 皇室。
     *
     * 全作最稀有的一掷，也是最容易被误当成「最强开局」的一个。
     *
     * 它其实是整个凡人阶段最残酷的一条路：你拥有凡间的一切，
     * 而凡间的一切在渡口那条船面前一文不值。宫墙替你挡住了所有的苦，
     * 也替你挡住了所有的机缘——你不会在山道上救人，
     * 不会在庙前买一册看不懂的旧书，不会有人在檐下跟你说起修士。
     *
     * 直到有一天，宫墙自己塌了。
     */
    id: 'court',
    census: '宗室',
    livelihood: '食禄',
    business: null,
    station: '宗室',
    weight: 2,
    /**
     * 住处不写东宫。
     *
     * 东宫是太子那一套体系，有自己的官属；而这一行出身的设定明写着
     * 「你上头有七个兄姐」——**他不是储君**。从前 `locales` 里摆着东宫，
     * 于是一个排行第八的皇子有一半概率生在太子的居所里。
     *
     * 皇子幼年随生母住在后宫。永和宫是明代东六宫之一，摆在这儿合制；
     * 长庆殿仍旧留着。真要按嫡庶、排行、是否储君分配居所是后面的事，
     * 这一处先把「皇子 ≠ 东宫」这一条钉住。
     */
    locales: ['永和宫', '长庆殿'],
    capital: CAPITAL,
    standing: { from: 94, to: 100 },
    attributes: { memory: 52, insight: 50, body: 24, will: 26, fortune: 54 },
    given: ['琮', '玹', '曜', '徽', '宜', '婉'],
    father: '当今天子。你一年见他的次数，数得过来。',
    mother: '你的生母。位分不高不低，在宫里说话轻。',
    opening: [
      { kind: 'narration', text: '你生在京师，皇城{here}。' },
      { kind: 'narration', text: '{elder}是当今天子。你上头有七个兄姐，下头还会有更多。' },
      {
        kind: 'narration',
        // 钦天监报卦、赏缎子、没有过来——三件事没有一件是婴儿看得见的。
        // 补一句转述的框：这一层的通例本来就是这样（打猎那一行写的是「父亲后来说」），
        // 唯独这一行从前是直接报出来的，读着像宫里发给玩家的一张信息面板
        text: '你出生那日，钦天监报了个好卦。{elder}赏了{dam}两匹缎子，没有过来——这些是{dam}后来讲给你听的。',
      },
    ],
  },
]

/**
 * 按主键找一行出身。
 *
 * 找不到就返回 `ORIGINS[0]`，跟从前那句 `?? ORIGINS[0]!` 一样——
 * 但这里是**唯一一处**这么写，别处一律拿到 `Origin` 再读它的格子。
 * 从前 `rollName`、`originAttributes`、`originOpening` 各自 find 一遍，
 * 三处各写一次同样的兜底，而那三处兜底谁也没验过。
 */
export function originById(id: OriginId): Origin {
  return ORIGINS.find((one) => one.id === id) ?? ORIGINS[0]!
}
