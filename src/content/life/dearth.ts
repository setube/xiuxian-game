import type { Choice, LifeEvent, SceneLibrary, SceneNode } from '@/types/game'

/**
 * 米贵了。
 *
 * 这一册是「世界 → 玩家」那条路的第一次落地，也是整个世界系统的验收点。
 *
 * 它的入场条件不是年龄、不是家世、不是旗标，而是**这个府此刻的粮价**——
 * 而粮价是前面几年少雨、减产、囤粮一环一环推上去的，
 * 跟玩家一点关系也没有。玩家只是恰好活在这条链里。
 *
 * ## 同一场旱灾，长出不同的人生
 *
 * 这一卷刻意不写「你家因此如何」，只写「米贵了」这个事实，
 * 然后按**家里的光景**分流：
 *
 * - 家底厚的：米贵了也就是贵了，大人念叨两句
 * - 过得去的：紧一紧，少吃一顿肉
 * - 紧巴的：要做选择了——卖东西、借钱、还是让孩子出去做工
 * - 揭不开锅的：已经没得选
 *
 * 于是同一个世界事件，在四种家庭里长出四种不同的东西。
 * **这才是「世界事件改变条件，不替玩家决定结果」的样子。**
 */
/**
 * 兼业的第一个写手：荒年靠第二样进项撑过去。
 *
 * 「父亲种田，农闲时进镇做木工；母亲纺纱」（11.md）——从前只有卖、借、送孩子做工
 * 三条路，一家人靠第二样进项撑过去这一条写不出来：`Livelihood` 一格一值。
 * 现在多的是一格 `sideline`，不是把业改成数组：业还是务农，外人照旧叫这家农家，
 * 家里自己知道多了一样贴补。它从此留在这一家身上（成年那一卷读它），
 * 不像做工那一年，年底回来就完了。
 *
 * 紧一年、有得选两档都开这两条路（抽成常量，两处各引一次）：探针量进卷那一刻，
 * 农家荒年掷中的多半落在「紧一年」，「有得选」那一档十世里一世——只挂后者，
 * 这两条路在真世里就成了摆设（`scripts/seen.ts` 抓到「没人读到」）。
 *
 * 生下来娘就接着针线活的人家（出身表那一格，农家四成）没有「接邻家的针线活」这条路——
 * 接的就是那个；爹挑柴那条路照开，走了之后格子里记的是挑柴，针线那一样不再记
 * （一格装不下两样，见 `Sideline` 那段注释）。
 */
const SIDELINE_CHOICES: readonly Choice[] = [
  {
    id: 'peddle',
    label: '{elder}农闲挑柴进镇去卖',
    hint: '来回二十里，换回的米不多，可日子不用塌',
    requires: [{ livelihood: '务农' }, { family: { id: 'father', alive: true } }],
    echo: '{elder}天不亮就挑着担子出门了。',
    effects: [
      { type: 'time', months: 5 },
      { type: 'household', standing: 3, sideline: '挑柴' },
      { type: 'attribute', key: 'will', delta: 2 },
      { type: 'flag', key: 'took-up-sideline', value: true },
      { type: 'chronicle', text: '那年米贵，家里开始挑柴进镇去卖。' },
    ],
    next: 'after-peddle',
  },
  {
    id: 'needle',
    label: '{dam}接邻家的针线活',
    hint: '一针一线换不来多少米',
    requires: [{ livelihood: '务农' }, { family: { id: 'mother', alive: true } }, { sideline: null }],
    echo: '{dam}接了邻家的针线活。',
    effects: [
      { type: 'time', months: 5 },
      { type: 'household', standing: 2, sideline: '针线' },
      { type: 'flag', key: 'took-up-sideline', value: true },
      { type: 'chronicle', text: '那年米贵，家里接起了针线活。' },
    ],
    next: 'after-needle',
  },
]

/**
 * 家里本来就靠着的那一样，荒年里撑得更狠。
 *
 * 生下来娘就接着针线活的人家（出身表那一格）荒年没有「接针线」那条路，可那一样贴补
 * 不是没在——它在这一年比往年更要紧。紧一年、有得选两档各挂一遍，都是同一个读者。
 */
const LEANING_ON_SIDELINE: NonNullable<SceneNode['seen']> = [
  {
    requires: [{ sideline: '针线' }, { family: { id: 'mother', alive: true } }],
    text: '{dam}的针线活那年接得比往常多。灯常常亮到半夜。',
  },
  {
    requires: [{ sideline: '挑柴' }, { family: { id: 'father', alive: true } }],
    text: '{elder}那年挑柴进镇的趟数，比往常多了一倍。',
  },
]

export const dearthScenes: SceneLibrary = {
  'dearth:price': {
    id: 'dearth:price',
    title: '米价',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /**
         * 开场交给感知层。
         *
         * 从前这里写的是「入秋以后，米价一天一个样」——那是**作者知道的世界**。
         * 可玩家未必知道米价，他可能只看见自己碗里的粥稀了。
         *
         * 两套叙事来源不一致，后果不是代码不整洁，是玩家会凭空得到
         * 他本不该有的认知：一个六岁农家孩子不该知道「米价」这个概念。
         */
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'signs', limit: 2 },
        ],
        blocks: [],
        /**
         * 隔壁来借粮。
         *
         * 这是邻居系统的**第一个真实使用者**：荒年到了，东邻那一户的主妇站在门外。
         * 引擎不是随机吐一个「邻居借粮」事件——世界早就知道东邻是谁家、住在隔壁、
         * 主妇是谁；粮价涨到这一步（这一卷的入场条件），她才来。
         *
         * 她叫什么，正文写不出来：邻居的姓是立基时掷的。`{call:east-wife}`
         * 落纸时现算——一个六岁孩子眼里她是「王婶」。
         * 她为什么这样问，玩家不必知道；她家去年减产、粮快见底，这些格子还没有，
         * **等内容再要一次的时候再长**。
         *
         * `requires` 问的是那个人还在不在，不是「有没有邻居」：宫里、寺里、
         * 路上长大的孩子没有东邻，她不在册，这一句就不出。
         */
        seen: [
          {
            requires: [{ family: { id: 'east-wife', alive: true } }],
            text: '傍晚，{call:east-wife}站在门外，没像往常一样进来，只在门口低声问{dam}：「你家……还有没有余粮？」',
          },
        ],
        /*
         * 佃户家先过租子那一关，再按家境分档。
         *
         * 头一版把租子挂在「有得选」那一档（家境 18–38）上——佃户初值 16–28，看着正对。
         * 探针量**进卷那一刻**（2026-09-09，三百世佃户有心人，掷中 23 世）：家境中位 57、
         * 四分位 49–63，落那一档的几乎没有（童年那几年家境涨上去了）。门槛写在一个早就不成立的
         * 数上，是那两天里第五次「量的时刻 ≠ 用的时刻」。所以租子不挂档：家底不到宽裕（≤61，
         * 「家里照常开饭」那一档的下沿）的佃户家，米价一涨租子就压上来；宽裕的交得起，不出这一节。
         */
        branches: [
          {
            requires: [
              { tenure: '佃' },
              { family: { id: 'landlord', alive: true } },
              { standing: { atMost: 61 } },
            ],
            next: 'rent-due',
          },
        ],
        next: 'tiers',
      },

      /** 同一个消息，落在不同的家里是不同的东西 */
      tiers: {
        id: 'tiers',
        blocks: [],
        branches: [
          { requires: [{ standing: { atLeast: 62 } }], next: 'comfortable' },
          { requires: [{ standing: { atLeast: 38 } }], next: 'tighten' },
          { requires: [{ standing: { atLeast: 18 } }], next: 'choose' },
        ],
        next: 'desperate',
      },

      /**
       * 租子。
       *
       * 11.md 说的「没田、租地、欠租、遇旱就借粮的佃户」，从前写不出来——「租谁的地」
       * 没有格，田主不是人。现在他是人口册上的真人（`household.landlord`），有性情，会老会死：
       * 他没了，这一节不出（上面那条分流要他活着）。
       *
       * 求他缓不缓，从他的性情里出（NPC 没有好人／坏人标签，有的是性情、处境、利益）：
       * 温和、谨慎的缓一年，簿上记一笔欠租（`IOU`，欠的是家里当家的那个人）；
       * 木讷的什么也没说，秋后照收；刚硬、精明、暴躁的当场把粮量走。
       * **同一场荒年，租的是谁的地，是四种样子。** 过了这一关，荒年还在——接着按家境分档。
       */
      'rent-due': {
        id: 'rent-due',
        blocks: [
          { kind: 'narration', text: '米价涨了，租子照旧。' },
          { kind: 'narration', text: '{house:landlord}的人来过一趟，站在门口没进来，说的是租子。' },
        ],
        choices: [
          {
            id: 'beg-rent',
            label: '去求{house:landlord}缓一年租',
            hint: '他缓不缓，你不知道',
            echo: '{elder}去了{house:landlord}一趟。',
            effects: [{ type: 'time', months: 1 }],
            next: 'rent',
          },
          {
            id: 'pay-rent',
            label: '照交。租子先量走，家里紧一紧',
            echo: '租子照旧量走了。',
            effects: [
              { type: 'time', months: 1 },
              { type: 'household', standing: -3 },
            ],
            next: 'tiers',
          },
        ],
      },

      comfortable: {
        id: 'comfortable',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -3 },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '收成好的年头和收成坏的年头，外头的米价是不一样的。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '家里照常开饭。' },
          { kind: 'narration', text: '{elder}跟人说话时提过两回米价，语气跟说天气差不多。' },
          { kind: 'narration', text: '你听见了，但没往心里去。' },
          {
            kind: 'narration',
            text: '很多年以后你才知道，那一年有人饿死。',
            tone: 'faint',
          },
        ],
      },

      tighten: {
        id: 'tighten',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -7 },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '收成坏的年头，家里的饭桌是会变样的。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '粥比往常稀了些。' },
          { kind: 'narration', text: '过年没有割肉。{elder}说明年再说。' },
        ],
        seen: LEANING_ON_SIDELINE,
        choices: [
          {
            id: 'endure',
            label: '紧一紧，等年景回来',
            echo: '紧了一年。',
            effects: [{ type: 'time', months: 5 }],
            next: 'tightened',
          },
          ...SIDELINE_CHOICES,
        ],
      },

      tightened: {
        id: 'tightened',
        blocks: [
          { kind: 'narration', text: '也就是紧了一年。第二年秋天，日子又回去了。' },
        ],
      },

      /**
       * 有得选的那一档。
       *
       * 这是整卷的重心——**世界把条件推到这里，然后闭嘴**。
       * 卖东西、借钱、还是让孩子出去做工，三条路都通，
       * 三条路的后果不一样，而世界不替玩家挑。
       */
      choose: {
        id: 'choose',
        blocks: [
          { kind: 'narration', text: '家里的米撑不到开春。' },
          { kind: 'narration', text: '晚饭后没有人说话。{elder}坐在门口，坐了很久。' },
        ],
        seen: LEANING_ON_SIDELINE,
        choices: [
          ...SIDELINE_CHOICES,
          {
            id: 'sell',
            label: '把值钱的东西卖了',
            hint: '换来的钱撑不了太久',
            echo: '家里把能卖的都卖了。',
            effects: [
              { type: 'time', months: 5 },
              { type: 'household', standing: -9 },
              { type: 'flag', key: 'sold-things', value: true },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'after-sell',
          },
          {
            id: 'borrow',
            label: '去借',
            hint: '借了是要还的',
            echo: '{elder}去镇上借了一笔。',
            effects: [
              { type: 'time', months: 5 },
              { type: 'household', standing: 4, debt: 14 },
              { type: 'flag', key: 'family-borrowed', value: true },
              { type: 'attribute', key: 'insight', delta: 2 },
            ],
            next: 'after-borrow',
          },
          {
            id: 'work',
            label: '你出去做工',
            hint: '书就念不成了',
            echo: '你被送去做工了。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'household', standing: 6 },
              { type: 'flag', key: 'schooled', value: false },
              { type: 'flag', key: 'working', value: true },
              { type: 'attribute', key: 'body', delta: 7 },
              { type: 'attribute', key: 'will', delta: 5 },
              {
                type: 'aspect',
                key: 'body',
                self: '你从小就出去做过工。手上有茧，也不怕生人。',
              },
              { type: 'chronicle', text: '那年米贵，你被送出去做工。', tone: 'deep' },
            ],
            next: 'after-work',
          },
        ],
      },

      'after-sell': {
        id: 'after-sell',
        blocks: [
          { kind: 'narration', text: '箱子空了一半。那只镯子是{dam}的陪嫁。' },
          { kind: 'narration', text: '她没说什么，只是把箱子锁上了。' },
          { kind: 'narration', text: '那年冬天家里没有添过一件新东西。', tone: 'faint' },
        ],
      },

      'after-borrow': {
        id: 'after-borrow',
        blocks: [
          { kind: 'narration', text: '钱是借到了。米缸重新满了一半。' },
          { kind: 'narration', text: '此后每年秋后，家里都要先想着还债的事。' },
          { kind: 'narration', text: '{elder}夜里常坐在门槛上。', tone: 'faint' },
        ],
      },

      'after-work': {
        id: 'after-work',
        blocks: [
          { kind: 'narration', text: '你去了镇上一家铺子，管饭，没有工钱。' },
          { kind: 'narration', text: '干了一年。年底回家时，家里的米缸是满的。' },
          { kind: 'event', text: '这一年你没有念书。' },
          {
            kind: 'narration',
            text: '同龄的孩子还在私塾。你从他们门口过，没有停。',
            tone: 'faint',
          },
        ],
      },

      'after-peddle': {
        id: 'after-peddle',
        blocks: [
          {
            kind: 'narration',
            text: '{elder}天不亮就走，挑一担柴走二十里到镇上，回来时担子里是半升米。',
          },
          { kind: 'narration', text: '那年冬天家里没有断过炊。' },
          {
            kind: 'narration',
            text: '开春之后他没有歇。农闲的日子里，那副担子一直在门后靠着。',
            tone: 'faint',
          },
        ],
      },

      'after-needle': {
        id: 'after-needle',
        blocks: [
          { kind: 'narration', text: '灯下多了一样活。{dam}把邻家送来的衣裳一件件补好，第二天送回去。' },
          { kind: 'narration', text: '换回来的米不多，可米缸一直没有见底。' },
          { kind: 'narration', text: '此后家里的灯总比别家熄得晚一点。', tone: 'faint' },
        ],
      },

      /** 求他缓一年租。缓不缓在他的性情里 */
      rent: {
        id: 'rent',
        blocks: [{ kind: 'narration', text: '{elder}回来的时候天已经黑了。' }],
        branches: [
          {
            requires: [{ temper: { id: 'landlord', in: ['温和', '谨慎'] } }],
            next: 'rent-deferred',
          },
          { requires: [{ temper: { id: 'landlord', in: ['木讷'] } }], next: 'rent-silent' },
        ],
        next: 'rent-refused',
      },

      'rent-deferred': {
        id: 'rent-deferred',
        onEnter: [
          { type: 'household', standing: 4 },
          {
            type: 'owe',
            debtor: 'elder',
            creditor: 'landlord',
            what: '一年的租子',
            terms: '来年秋后一并交',
          },
          { type: 'chronicle', text: '荒年租子交不上，田主缓了一年。' },
          { type: 'flag', key: 'rent-answer', value: '缓' },
        ],
        blocks: [
          { kind: 'narration', text: '他说，缓一年。来年秋后一并交。' },
          { kind: 'narration', text: '{elder}回来的路上没有说话。到家把这句话说了一遍，就去睡了。' },
          { kind: 'narration', text: '那笔租子从此挂在家里，谁也没有再提，谁也没有忘。', tone: 'faint' },
        ],
        next: 'tiers',
      },

      'rent-silent': {
        id: 'rent-silent',
        onEnter: [
          { type: 'household', standing: -4 },
          { type: 'flag', key: 'rent-answer', value: '照收' },
        ],
        blocks: [
          { kind: 'narration', text: '他听完了，什么也没说。' },
          { kind: 'narration', text: '秋后来量租子的人照旧来了，一升也没有少量。' },
          { kind: 'narration', text: '{elder}后来再没提过那一趟。', tone: 'faint' },
        ],
        next: 'tiers',
      },

      'rent-refused': {
        id: 'rent-refused',
        onEnter: [
          { type: 'household', standing: -6 },
          { type: 'chronicle', text: '荒年去求田主缓租，他当场把粮量走了。' },
          { type: 'flag', key: 'rent-answer', value: '量走' },
        ],
        blocks: [
          { kind: 'narration', text: '他说，缓不了。' },
          { kind: 'narration', text: '第二天{house:landlord}的人来了，把缸里剩的粮先量走了一半。' },
        ],
        next: 'tiers',
      },

      desperate: {
        id: 'desperate',
        onEnter: [
          { type: 'time', months: 6 },
          { type: 'household', standing: -6 },
          { type: 'attribute', key: 'body', delta: -5 },
          { type: 'attribute', key: 'will', delta: 8 },
          { type: 'flag', key: 'knew-hunger', value: true },
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '荒年是什么样子，你亲身经历过。那不是米贵，是没有米。',
            category: '世事',
          },
          { type: 'chronicle', text: '那一年闹饥荒。你饿过。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '家里没有米了。' },
          { kind: 'narration', text: '那阵子吃的是掺了糠的饼，再后来是野菜。' },
          { kind: 'narration', text: '{dam}把自己那份分得越来越少。' },
          { kind: 'event', text: '你饿过。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '开春以后，日子慢慢回来了。' },
          {
            kind: 'narration',
            text: '此后很多年，你都不肯剩饭。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 路上不太平。
   *
   * 旱灾链走到后段才会有的事。跟米价那一卷一样，
   * 它对不同的人是不同的东西——护送人家的孩子看见父亲往刀上抹油，
   * 客栈的孩子看见店里空了一半。
   */
  'dearth:unrest': {
    id: 'dearth:unrest',
    title: '路上',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 同上：他看见什么由感知层决定。
        // 「那些人是逃荒的」这个判断，得他自己够得着才有
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'signs', limit: 2 },
        ],
        blocks: [],
        branches: [
          { requires: [{ livelihood: '护送' }], next: 'escort' },
          { requires: [{ business: '客栈' }], next: 'inn' },
          { requires: [{ business: '布庄' }], next: 'shop' },
        ],
        next: 'village',
      },

      escort: {
        id: 'escort',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: 5 },
          { type: 'attribute', key: 'will', delta: 4 },
        ],
        blocks: [
          { kind: 'narration', text: '要人护送的货反倒多了。肯走的人少。' },
          { kind: 'narration', text: '{elder}那阵子每天都在磨刀。' },
          { kind: 'narration', text: '走一趟的价钱翻了一倍。他还是接了。' },
          { kind: 'narration', text: '你后来才明白，那一年他为什么总是很晚才睡。', tone: 'faint' },
        ],
      },

      inn: {
        id: 'inn',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -12 },
          { type: 'attribute', key: 'insight', delta: 3 },
        ],
        blocks: [
          { kind: 'narration', text: '店里空了。商队改了道，一个月也来不了几个人。' },
          { kind: 'narration', text: '后来住进来的多是逃荒的，给不出房钱。' },
          { kind: 'narration', text: '{elder}让他们住柴房，一天一碗粥。' },
          { kind: 'narration', text: '那年冬天，柴房里死过一个人。', tone: 'faint' },
        ],
      },

      shop: {
        id: 'shop',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -8 },
          { type: 'attribute', key: 'insight', delta: 5 },
          {
            type: 'knowledge',
            id: 'the-market',
            title: '世道与生意',
            summary: '路不通的时候，货就烂在手里。做买卖的人比谁都关心外头太不太平。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '进货的路断了。铺子里的货卖一件少一件。' },
          { kind: 'narration', text: '{elder}把伙计辞了两个。' },
          { kind: 'narration', text: '你头一回听见他跟人说「撑一撑」这三个字。' },
        ],
      },

      village: {
        id: 'village',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -6 },
          { type: 'attribute', key: 'will', delta: 3 },
        ],
        blocks: [
          { kind: 'narration', text: '村里开始有人守夜。' },
          { kind: 'narration', text: '入冬后丢过两回粮，还伤了人。' },
          { kind: 'narration', text: '那阵子天一黑就没人出门了。' },
        ],
      },
    },
  },
}

export const dearthEvents: readonly LifeEvent[] = [
  {
    /**
     * 入场条件是**这个府的粮价**，不是玩家的年龄或家世。
     *
     * 这就是「世界 → 玩家」那条路：粮价是前面几年少雨、减产、
     * 囤粮一环一环推上去的，跟玩家一点关系也没有。
     * 他只是恰好活在这条链里。
     *
     * 也因此，玩家很可能一辈子碰不上——那正是对的。
     */
    id: 'dearth-price',
    window: { from: 5, to: 16 },
    requires: [{ region: { grain: { atLeast: 138 } } }],
    scene: 'dearth:price',
    weight: 24,
  },
  {
    id: 'dearth-unrest',
    window: { from: 7, to: 16 },
    requires: [{ region: { order: { atMost: 34 } } }],
    scene: 'dearth:unrest',
    weight: 18,
  },
]
