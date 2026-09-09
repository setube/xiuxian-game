import type { Choice, LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 县试那几年。
 *
 * ## 这一片补的是「念了书通向什么」
 *
 * 库里念书这条线到十三岁就断了：`schooling.ts` 给你 `knowledge: 'literacy'`，
 * 而识字之后能做的只有三件——把字捡起来、替人写写算算、收个徒弟
 * （`routine.ts` 那三条 `requires`）。
 *
 * **念了十年书的人和没念过的人，成年之后除了识字这一条，人生没有任何分岔。**
 *
 * ## 第一个使用者早就在库里，而且是个活人
 *
 * `schooling.ts:197`：
 *
 * > 过了年，{elder}请回来一位西席，姓周，**落第多年的秀才**。
 *
 * 周敬之，五十岁，在别人家教书。**这个世界里已经有落第的人了，
 * 只是玩家自己不能落第。** 他的今天就是玩家可能的明天——
 * 而这一册就是让那条路真的存在。
 *
 * ## 三档，不是三级
 *
 *     童生　考过县试府试，见官不跪，可以往下考
 *     生员　中了秀才，免徭役，进学
 *     落第　考了几回没中，年纪大了
 *
 * **落第不是失败分支。** 这一条在议亲（`match.ts`）、生育（`bearing.ts`）、
 * 修炼（`attempt.ts`）三处都立过：没成跟成了是同一层的两个结局。
 *
 * 而在功名这一格上它尤其要紧——**绝大多数人考不中**。明代生员定额有限，
 * 一个县三年取十几二十个，而应试的以百计。写得薄了，
 * 这一册就成了「读书 → 做官」的阶梯，而那是最不像那个时代的一件事。
 *
 * ## 四条不做
 *
 * 一、**不做考试小游戏。** 中不中由资质、家境、运气掷，玩家不答题。
 * 二、**不碰会试殿试。** 举人以上是另一个世界（要进京、要盘缠、要人脉），
 *     等第一个使用者。
 * 三、**不做名次。** 「第几名」这个世界还记不住，也没有一处内容读它。
 * 四、**不用现代词。** 「学历」「考公」不是那时候的话
 *     （12.md 第 501 行那条用词纪律）。
 */

/** 应考这件事在 `character.undertakings` 里的 id */
const SITTING = 'sitting-exams'

/**
 * 去考还是不去，两节共用。
 *
 * 提出来是因为**先生在与不在是两段正文，可选项是同一对**——
 * 一个人决定去不去考县试，跟劝他的那个人还在不在没有关系。
 */
const CHOICES = {
  go: {
    id: 'go',
    label: '你说好',
    hint: '家里供了这些年，总要有个说法',
    echo: '你说好。',
    effects: [
      { type: 'undertake', undertaking: SITTING },
      { type: 'time', months: 6 },
    ],
    next: 'sat',
  },
  /**
   * 不去考。
   *
   * **这不是「放弃」**，是一个具体的算计：县试要盘缠、要保结、要误农时。
   * 家里穷的人算得过这笔账——念书是一回事，应考是另一回事，中间隔着钱。
   *
   * 年表那一笔从前写「先生劝你去考，你没有去」，**而先生殁了那一路说不通**
   * ——没有人劝他。改成只说他自己的决定。
   */
  no: {
    id: 'no',
    label: '你说家里离不开人',
    hint: '考一趟要花的，够买半年的粮',
    critical: true,
    echo: '你说家里离不开人。',
    effects: [
      { type: 'time', years: 1 },
      { type: 'flag', key: 'never-sat-exams', value: true },
      { type: 'chronicle', text: '那年县里考童生，你没有去。' },
    ],
    next: 'stayed',
  },
} as const satisfies Record<string, Choice>

export const examScenes: SceneLibrary = {
  /**
   * 先生说你可以去试试。
   *
   * 起头不是玩家「决定考科举」，是**先生看出来了**——
   * 跟议亲那一册同一个立场：这个时代里要紧的事，多半由别人先开口。
   */
  'exam:first': {
    id: 'exam:first',
    title: '县试',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 4 }],
        blocks: [],
        /*
         * 先生还在不在，是两段不同的话。
         *
         * **头一版这一卷只写了先生活着那一版**，于是事件的 `requires` 里
         * 挂着 `{ family: { id: 'teacher', alive: true } }`——
         * 正文里他开口说话，条件当然得问他还在不在。那条推理没错，
         * **错在我只写了一半正文，然后拿条件去迁就它。**
         *
         * 后果是 79 用 `identity` 那支门禁量出来的：五颗种子里四颗有
         * **10–15% 的人死时还挂着「学童」**，而那批人里 **96% 是先生已殁**——
         * 先生一没，整章对他关闭，「学童」就成了无期的。
         * 那批人平均死龄只有 33 岁：不是没等到，**是门被锁上了**。
         *
         * 现在两版都写。**念过书这件事不因先生死了而消失**——
         * 这句话是我自己在 `stayed` 那一节写的，而我没把它用在这儿。
         */
        branches: [{ requires: [{ family: { id: 'teacher', alive: true } }], next: 'told' }],
        next: 'alone',
      },

      /** 先生还在，他劝你去试试 */
      told: {
        id: 'told',
        blocks: [
          { kind: 'narration', text: '你把《四书》念完的那一年，先生留你多坐了一会儿。' },
          { kind: 'dialogue', speaker: '先生', text: '开春县里考童生，你去试试。' },
          { kind: 'narration', text: '他说得很平常，像是说明天下雨。' },
        ],
        choices: [CHOICES.go, CHOICES.no],
      },

      /**
       * 先生已经不在了。
       *
       * **没有人劝你**——这一节的分量正在这儿。念完书的第二年、第五年，
       * 你自己想起这件事，而当初那个说「你去试试」的人已经没了。
       */
      alone: {
        id: 'alone',
        blocks: [
          { kind: 'narration', text: '先生殁了以后，那些书还在。' },
          { kind: 'narration', text: '开春县里考童生，你听人说起，忽然想起他从前提过一句。' },
          {
            kind: 'narration',
            text: '没有人劝你去，也没有人拦着你。',
            tone: 'faint',
          },
        ],
        choices: [CHOICES.go, CHOICES.no],
      },

      /**
       * 考了。
       *
       * 掷的是中不中。**这一掷玩家看不见过程**——他只知道自己进了考棚，
       * 出来的时候手是抖的，然后等榜。
       *
       * 两成中。这个数不是难度设计，是照这个时代的实情定的：
       * 县试府试连过才是童生，取中的是少数。
       */
      sat: {
        id: 'sat',
        onEnter: [
          {
            type: 'roll',
            key: 'exam-first',
            among: [
              { value: 'passed', weight: 20 },
              { value: 'failed', weight: 80 },
            ],
          },
        ],
        blocks: [
          { kind: 'narration', text: '县城的考棚里坐了一天。手冷，砚台里的墨结了薄冰。' },
          { kind: 'narration', text: '交卷出来的时候天已经黑了，你想不起自己写了什么。' },
        ],
        /**
         * 那本册子在这里露出来。
         *
         * ## 这是一张空头支票的兑现
         *
         * `life/unrest.ts` 的 `storm-kept` 那一节明写着：
         *
         * > 他们把你的名字记了下来。……
         * > **往后再有事，册子上有你的名字。而你不知道有那本册子。**
         *
         * 那句话承诺了一个下文，**而我写完就没写它**。`unrest-implicated`
         * 那面旗因此零读取——79 扫全库旗标时把它归进「无人读」那 26 面，
         * 而我自查时才看清：这不是「留着以后用」，是我写了一张空头支票。
         *
         * ## 为什么兑现在这一节，而不是别处
         *
         * 因为**县试要保结**（`CHOICES.no` 那条的注释里早写着：
         * 「县试要盘缠、要保结、要误农时」）。保结是童生应考前
         * 由廪生具结担保身家清白的手续——**一个名字在册子上的人，
         * 那一关会卡住**。
         *
         * 而这一节的写法遵着 `unrest` 那一册自己的立场：**不写他被怎样。**
         * 具保的人多要了钱，如此而已。他到死也不知道为什么。
         *
         * ⚠️ 这一条不改中不中（那一掷在 `onEnter` 里，先于这句话）。
         * 一个知情不报被记过名的人**照样可能中童生**——
         * 明代的保结是钱和人情能过去的关，不是一道铁门。
         * 改成扣考中率就成了「污点值」，那是另一种游戏。
         */
        seen: [
          {
            requires: [{ flag: { key: 'unrest-implicated' } }],
            text: '临考前具保那一关卡了两天。替你作保的人多要了两百钱，没说为什么。',
          },
        ],
        branches: [
          { requires: [{ flag: { key: 'exam-first', equals: 'passed' } }], next: 'passed' },
        ],
        next: 'failed',
      },

      /**
       * 中了童生。
       *
       * **它给的东西很少，而那正是准的**：见官不跪，往下可以考。
       * 不给钱、不给地位、不给任何人替你办事——
       * 童生在这个时代是一个起点，不是一个身份。
       */
      passed: {
        id: 'passed',
        onEnter: [
          { type: 'undertake', undertaking: SITTING, done: true },
          { type: 'identity', identity: '童生' },
          { type: 'flag', key: 'is-tongsheng', value: true },
          { type: 'chronicle', text: '你考中了童生。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '榜出来那天，你的名字在中间偏后。' },
          { kind: 'narration', text: '{elder}托人写了红纸贴在门上，贴了半个月才揭。' },
        ],
        /*
         * 去谢先生——**得他还在**。
         *
         * ## 这里换过两次机制，第一次用错了
         *
         * 这一处是我修「先生殁了整章不开」（`262f54b`）时漏掉的那一半：
         * 我放宽了事件的 `requires`、开头那一节分了两支，
         * 可正文里另外两处提到先生的句子没跟着加守，
         * 于是先生殁了之后他照旧在这儿说话（`present` 抓到的）。
         *
         * 头一版的修法是给两句各配一条 `seen`（带 `requires`）。
         * **而 `seen` 是「所见」那一层，它的判据要求同一个节点在不同人生里
         * 长出不同的话**——两句二选一必然违反，`seen` 那一支当场红：
         *
         *     ✗ 过半的人读到的是同一种组合（67.3%）
         *
         * 判据说得对：那两句只有两种可能，**这一节对多数人就是同一段**。
         *
         * 二选一的条件正文该走 `branches` 分节点，跟这一册开头
         * `told` / `alone` 那一对同一个手法。**「所见」和「分岔」是两层东西**：
         * 前者是同一件事被不同的人读出不同的味道，后者是这件事本来就有两种。
         */
        branches: [{ requires: [{ family: { id: 'teacher', alive: true } }], next: 'thank' }],
        next: 'thank-gone',
      },

      /** 先生还在，你去谢他 */
      thank: {
        id: 'thank',
        blocks: [
          {
            kind: 'narration',
            text: '你去谢先生。他说，往上还有院试，别当自己已经是个人物了。',
          },
        ],
      },

      /** 先生不在了，那句话你替他说了 */
      'thank-gone': {
        id: 'thank-gone',
        blocks: [
          {
            kind: 'narration',
            text: '红纸贴出去那天你想起先生。他要是还在，大概会说别当自己是个人物了。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 没中。
       *
       * **这一节写得比中了那一节厚，是有意的**：八成的人落在这儿。
       *
       * 它不给旗标之外的任何东西——不扣属性、不改家境。
       * 没中就是没中，日子照旧过，而**那正是这件事的分量**：
       * 它不惩罚你，它只是没有发生。
       */
      failed: {
        id: 'failed',
        onEnter: [
          { type: 'undertake', undertaking: SITTING, done: true },
          { type: 'flag', key: 'failed-exams', value: true },
          { type: 'chronicle', text: '榜上没有你的名字。' },
        ],
        blocks: [
          { kind: 'narration', text: '榜贴出来那天你去看了。从头看到尾，又从尾看到头。' },
          { kind: 'narration', text: '回来的路上你走得很慢，进门的时候把脸上的表情收拾好了。' },
          { kind: 'narration', text: '{elder}问了一句，你说没中。他哦了一声，就去忙别的了。' },
          {
            kind: 'narration',
            text: '晚上你把书翻开又合上。那些字你都认得，可它们像是不认得你。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 没去考。
       *
       * 跟另外两节同一层。**一个念过书却从没进过考棚的人，
       * 这辈子会一直知道自己没试过**——而那跟试了没中是两种不同的心事。
       */
      stayed: {
        id: 'stayed',
        onEnter: [
          /*
           * 没去考的人也得从「学童」落下来。
           *
           * `exam:done` 那一卷把他们挡在外面（`never-sat-exams absent`），
           * 而**他们跟考过的人一样，念完了就不再是学童**——
           * 少了这一笔，「先生劝你去考，你没有去」那条路上的人
           * 会一辈子挂着「学童」，跟 79 实测的那 450 世是同一个病。
           *
           * 落「识字人」不落「农家子」：**他念过书，那件事不会因为没去考就消失**。
           * 而正文没说他去种地——他家未必有地。
           */
          { type: 'identity', identity: '识字人' },
        ],
        blocks: [
          { kind: 'narration', text: '那年开春你没有去县里。' },
          /*
           * 原先写「地里的活照旧」——`upbringing.ts` 当场抓到，**那默认了务农**。
           *
           * 这是同一个错**第三次**犯：`attempt.ts` 的「地里的活不会自己少」、
           * `afterwards.ts` 的「你起来喂了鸡」，现在是这一句。
           *
           * 三次都是同一个原因，而且是这一族坑里最难自查的一种：
           * **不是我忘了问出身，是我根本没意识到那句话里有一个出身。**
           * 「地里的活」读起来像一句中性的话，除非有人拿尺子量它。
           */
          { kind: 'narration', text: '家里的活照旧，书还在箱子里。' },
        ],
        // 先生没再提——**得他还在**。跟「你去谢先生」那处是同一处漏，
        // 也跟它一样换过两次机制（`seen` → `branches`），理由见那段注释
        branches: [{ requires: [{ family: { id: 'teacher', alive: true } }], next: 'let-be' }],
        next: 'let-be-gone',
      },

      /** 先生还在，他没再提这件事 */
      'let-be': {
        id: 'let-be',
        blocks: [
          {
            kind: 'narration',
            text: '后来先生也没再提这件事。他大概是明白的。',
            tone: 'faint',
          },
        ],
      },

      /** 先生不在了，那些书是他留下的 */
      'let-be-gone': {
        id: 'let-be-gone',
        blocks: [
          {
            kind: 'narration',
            text: '那些书还是先生留下的。他没能看见你去不去。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 又考了几年。
   *
   * 这一卷是这一册的正题：**多数人的功名之路是「一直在考，一直没中」**。
   * 周先生五十岁还是个秀才，而他已经算是考出来的那少数。
   */
  'exam:again': {
    id: 'exam:again',
    title: '又一年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'undertake', undertaking: SITTING },
          { type: 'time', years: 1 },
        ],
        blocks: [
          { kind: 'narration', text: '三年一考，你又去了一趟。' },
          { kind: 'narration', text: '考棚还是那个考棚，只是同坐的面孔换了一批。' },
        ],
        /*
         * 第二次往上考的是院试（中了是生员，也就是秀才）。
         *
         * 一成中。比头一回还低——**童生往上那一道门窄得多**，
         * 而这正是周先生那样的人为什么五十岁还在别人家教书。
         */
        next: 'roll',
      },

      roll: {
        id: 'roll',
        onEnter: [
          {
            type: 'roll',
            key: 'exam-again',
            among: [
              { value: 'passed', weight: 10 },
              { value: 'failed', weight: 90 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'exam-again', equals: 'passed' } }], next: 'xiucai' },
        ],
        next: 'again-failed',
      },

      /**
       * 中了秀才。
       *
       * **这是这一册的天花板，而它够不着「做官」**：秀才免徭役、见官不跪、
       * 可以进学，可他不是官，多半也当不上官。周先生就是中了秀才之后
       * 一辈子在别人家教书的那种人。
       *
       * 所以这一节不给权力，只给两样实的：**免了徭役，和一个从此跟着他的称呼。**
       */
      xiucai: {
        id: 'xiucai',
        onEnter: [
          { type: 'undertake', undertaking: SITTING, done: true },
          { type: 'identity', identity: '生员' },
          { type: 'flag', key: 'is-xiucai', value: true },
          { type: 'household', standing: 8 },
          { type: 'chronicle', text: '你进了学，中了秀才。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '院试的榜上有你。' },
          { kind: 'narration', text: '那以后见了县里的人不用跪，家里的差役也免了。' },
          { kind: 'narration', text: '村里人见你改了称呼。有几个从前不太理你的，如今站住了说话。' },
          {
            kind: 'narration',
            text: '你知道这不算什么。可是那天晚上你睡得很好。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 又没中。
       *
       * 九成落在这儿。**这一节是这一册真正要写的东西**——
       * 不是失败的痛苦，是**重复本身**：同一个考棚、同一个榜、
       * 同一条回家的路，一次又一次。
       */
      'again-failed': {
        id: 'again-failed',
        onEnter: [
          { type: 'undertake', undertaking: SITTING, done: true },
          { type: 'flag', key: 'failed-exams', value: true },
          { type: 'chronicle', text: '又是一年，榜上还是没有你。' },
        ],
        blocks: [
          {
            kind: 'narration',
            text: '看榜这件事你已经很熟了。知道从哪儿看起，也知道什么时候该走。',
          },
          { kind: 'narration', text: '同来的有个后生，头一回，站在榜前哭。你从他身边走过去。' },
          /*
           * 这一句是判据逼出来的：头一版只有三句，而中了那一路有四句——
           * **九成的人落在没中这儿，它不该比稀有的那一路薄。**
           * `scripts/exam.ts` 第一条反着定门槛（落第 ≥ 中了），当场抓到。
           */
          { kind: 'narration', text: '客栈的伙计认得你了，不用问就把那间靠里的房留着。' },
          {
            kind: 'narration',
            text: '回家的路你走了十几年，路边哪块石头松了都记得。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 后来就不考了。
   *
   * 这一卷是收尾，也是这一册跟周先生对上的地方——**他成了那位西席**，
   * 或者别的什么：坐馆教书、替人做幕友、回家种地。
   *
   * 三条路不是「奖励等级」，是**这个功名值多少的实话**：
   * 秀才能坐馆，童生只能替人写写算算，什么也不是的那个回家种地。
   */
  'exam:done': {
    id: 'exam:done',
    title: '不考了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 8 }],
        blocks: [
          { kind: 'narration', text: '有一年开春，你没有再去县里。' },
          { kind: 'narration', text: '不是决定不考了，只是那一年没去，第二年也没去。' },
        ],
        branches: [{ requires: [{ flag: { key: 'is-xiucai', equals: true } }], next: 'teaching' }],
        next: 'letters',
      },

      /**
       * 坐馆教书。
       *
       * **他成了周先生。** 这一节故意跟 `schooling.ts:197` 那句话对上——
       * 那个五十岁的西席是玩家可能变成的人，而现在这条路真的存在了。
       */
      teaching: {
        id: 'teaching',
        onEnter: [
          /*
           * ⚠️ 这里**没有**落 `living: 'teaching'`。
           *
           * 头一版写了，而 `content/living.ts` 里根本没有这种日子
           * （十五种：farm/hunt/craft/shop/clinic/office/yamen/manor/palace/
           * temple/market/hired/fallen/adrift/begging）——**我造了一个
           * 没有写入端的引用**，那正是今天在别处抓了一整轮的那族坑。
           *
           * 该不该新造一种日子，标准是「有没有一句话因为少这一格而写不出来」。
           * 眼下写不出来的只有这一节的四句正文，而它们**已经说清楚了**——
           * 坐馆这件事在正文里是完整的，不需要一格状态替它说话。
           *
           * 真要造它，得等第二处内容问「你是不是靠教书过活」。
           * 那时候 `Livelihood` 那一格也该跟着看一眼（现在十种里没有教书）。
           */
          /*
           * **身份从「学童」落到「塾师」。**
           *
           * 这一笔补的是 xiuxian-game-79 实测出来的一个洞：
           * **450 世的人死的时候身份栏还写着「学童」**——`schooling.ts` 落了它，
           * 而全库只有 `exam` 的两节（考中才有）和 `hardship`（家道中落）
           * 覆盖得到。念过书、没考中、又没家道中落的人，一辈子挂着它。
           *
           * 79 那条链查得很实：念书的人不下地，拿不到 `working` 那面旗，
           * 于是 `youth-apprentice` 那一卷对他们整个关着——**四条本该接手的路，
           * 一个人也没有。**
           *
           * 「学童」是**中间态**：它的语义里含着一个终止条件（不念书了就不是学童）。
           * 「生员」不是——中了秀才不会因为任何事情不再是秀才，
           * 所以那一格没有下家是设计，不是漏写。
           */
          { type: 'identity', identity: '塾师' },
          { type: 'chronicle', text: '你在人家家里坐馆，教几个孩子认字。' },
        ],
        blocks: [
          { kind: 'narration', text: '镇上有人家请西席，托人来问你。' },
          { kind: 'narration', text: '一年束脩几石米，管两顿饭。你答应了。' },
          { kind: 'narration', text: '头一天进那间书房，你想起自己十来岁的时候。' },
          {
            kind: 'narration',
            text: '那孩子把手伸出来给你看。你看了看，什么也没说。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 替人写写算算。
       *
       * 没中秀才的那一路。**识字在这个时代本身就是一门手艺**——
       * 写信、写状子、记账、看契。挣不了大钱，可比不识字的多一条路。
       */
      letters: {
        id: 'letters',
        onEnter: [
          /*
           * 没中的那一路，身份也得从「学童」落下来。
           *
           * 落的不是「他念书之前那个」——**他已经不是那个孩子了**。
           * 落的是他现在实际在做的事：识字的人替不识字的人写字，
           * 这在村里是一个真实的位置。
           */
          { type: 'identity', identity: '识字人' },
          { type: 'chronicle', text: '你替村里人写信、看契、记账。' },
        ],
        blocks: [
          { kind: 'narration', text: '认得字的人不多，总有人来求。' },
          { kind: 'narration', text: '写一封信给几个钱，或者一顿饭，或者什么也不给。' },
          { kind: 'narration', text: '写得最多的是给在外头的人捎话。你替别人说了很多年的想念。' },
          {
            kind: 'narration',
            text: '偶尔也有人来求你写状子。那种你不太敢写。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const examEvents: readonly LifeEvent[] = [
  {
    /**
     * 到了该去考的年纪。
     *
     * 两条 requires：
     *
     *   念过书　　`knowledge: literacy`——这一册的全部前提
     *   没在考　　`undertaking not: sitting-exams`
     *
     * ## 从前还有第三条，而它锁死了一整章
     *
     * 头一版写着 `{ family: { id: 'teacher', alive: true } }`——
     * 因为正文里先生开口说话，条件当然得问他还在不在。
     *
     * **那条推理没错，错在我只写了一半正文，然后拿条件去迁就它。**
     *
     * 后果是 xiuxian-game-79 用 `identity` 那支门禁量出来的：
     * 五颗种子里四颗有 **10–15% 的人死时还挂着「学童」**，
     * 而那批人里 **96% 是先生已殁**——先生一没，整章对他关闭。
     * 那批人平均死龄只有 33 岁：不是没等到，**是门被锁上了**。
     *
     * 现在 `exam:first` 分两支（`told` / `alone`），条件这一层不再问先生死活。
     * **念过书这件事不因先生死了而消失。**
     *
     * 十四起：`schooling` 那一册到十三岁，念完《四书》才谈得上应考。
     */
    id: 'exam-first',
    window: { from: 14, to: 30 },
    requires: [
      { knowledge: 'literacy' },
      { undertaking: { not: SITTING } },
      { undertaking: { not: 'mourning' } },
      { flag: { key: 'never-sat-exams', absent: true } },
      { flag: { key: 'is-tongsheng', absent: true } },
    ],
    scene: 'exam:first',
    weight: 10,
  },
  {
    /**
     * 又考了几年。
     *
     * 只有中过童生的人才往上考——`is-tongsheng` 那面旗是它的门。
     * `repeatable` 让它可以演好几回：**多数人的功名之路就是一直在考。**
     */
    /*
     * 窗口从十六起，不是十八。
     *
     * **实测逼出来的**：中童生的年龄挤在 14–17 岁（400 世里 36 世中过，
     * 岁数分布 `14×7 15×22 16×3 17×1 23 25 26`），
     * 而头一版窗口写 18–55，**中间隔着的那几年把它挤掉了**——
     * 400 世零次演出。
     *
     * 十六是接得上的最早点：`exam-first` 那一卷最早十四岁演，
     * 中了之后要过一两年才谈得上再考。
     */
    id: 'exam-again',
    window: { from: 16, to: 55 },
    requires: [
      { flag: { key: 'is-tongsheng', equals: true } },
      { flag: { key: 'is-xiucai', absent: true } },
      { undertaking: { not: SITTING } },
      { undertaking: { not: 'mourning' } },
    ],
    scene: 'exam:again',
    weight: 12,
    repeatable: true,
  },
  {
    /**
     * 后来就不考了。
     *
     * 进过考棚的人才有这一卷——**没去考的那些人不需要「不考了」这件事**，
     * 他们从来没开始过。
     */
    id: 'exam-done',
    window: { from: 35, to: 65 },
    requires: [
      { knowledge: 'literacy' },
      { flag: { key: 'never-sat-exams', absent: true } },
      { undertaking: { not: SITTING } },
    ],
    scene: 'exam:done',
    weight: 10,
  },
]
