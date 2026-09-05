import type { Beat, Doing } from '@/engine/daily'

import { CITY_BEATS, CITY_DOINGS } from './days-city'
import { MANOR_BEATS, MANOR_DOINGS } from './days-manor'

/**
 * 一天里可以去的地方，和去了之后可能发生的事。
 *
 * ## 权重是这一册的立场
 *
 * 「无事」那一档的权重压过其余所有档加起来——**这不是配平，是立场**。
 * 一生中绝大多数日子本来就什么也没发生，而正因为如此，
 * 那些真的改变了什么的日子才显得要紧。
 *
 * 每加一条新的「见闻」或「转折」，都要顺手把同一个去处的
 * 「无事」补厚一点。否则这一册会慢慢滑成一台老虎机。
 */

/** 今天可以去哪儿 */
export const DOINGS: readonly Doing[] = [
  ...MANOR_DOINGS,
  ...CITY_DOINGS,
  {
    /**
     * 「帮家里干活」这句话本身就有前提：**这家得有活。**
     *
     * 从前这一条对谁都开着，于是皇子也能选，选完抽到的是
     * 「你跟着下了地，割了半晌草」——不是不合出身，是世界事实自相矛盾。
     *
     * 问的不是营生，是 `living.chore`：大人闲下来手上摆弄得着一件活的人家，
     * 孩子就搭得上手。种地的、打猎的、开铺子的、当差的都算；
     * 宫里不算——那不是「不用干活」，是宫里的孩子跟「干活」这件事
     * 隔着一整套人事，那一段该另外写。
     */
    id: 'work',
    label: '帮家里干活',
    slots: ['上午', '下午'],
    requires: [{ living: { hasChore: true } }],
    echo: '你去帮家里干活。',
  },
  {
    id: 'school',
    label: '去私塾',
    slots: ['上午', '下午'],
    /*
     * 念得起书，而且教你的那个人还在。
     *
     * 从前只问 `schooled` 那个旗标，而**旗标不会因为一个人死了就变**：
     * 先生殁了之后，「去私塾」这个去处照旧开着，底下那七八段
     * 「先生今天讲的是旧课」「天快黑了先生才发现你还在」也照旧演。
     *
     * 问的是 `family`（那一个人还在不在），不是 `bond: { kind: '师' }`
     * （这层关系里有没有活人）。两者在多数人生里同真同假，
     * **分岔在拜了第二个师父的那些人生上**：药庐那位还在，
     * 于是「有活着的师」为真，而底下这几段说的偏偏是周先生。
     * 正文点名说谁，条件就得问谁。
     *
     * 换了个先生接着教，是另一件事——那得有人写出来。
     * 在那之前，先生不在了就是没学上了，而那本身就是这个世界的真相。
     */
    requires: [
      { flag: { key: 'schooled', equals: true } },
      { family: { id: 'teacher', alive: true } },
    ],
    echo: '你去了私塾。',
  },
  {
    id: 'town',
    // 镇上要走半天。傍晚再动身，天黑前回不来
    label: '去镇上',
    slots: ['上午', '下午'],
    // 村里镇上的人才「去镇上」；住城里的是「上街」，宫和王府出不了门
    requires: [{ dwelling: { settlement: ['村', '镇'], kind: ['宅', '无'] } }],
    echo: '你往镇上去了。',
  },
  {
    id: 'hill',
    label: '往山那边走走',
    slots: ['上午', '下午'],
    requires: [{ dwelling: { settlement: ['村'], kind: ['宅', '无'] } }],
    echo: '你往山那边去了。',
  },
  {
    id: 'elder',
    label: '找{elder}说话',
    slots: ['下午', '傍晚'],
    /**
     * 问的是 `near` 而**不是** `alive`——「今天找谁说话」要的是
     * 一个此刻就在这个院子里的人，不是名册上还活着的人。
     *
     * 削爵迁出京城之后，留在宫里的那位仍然活着，那条边也仍然在；
     * 爹去外县修河堤的那两年也一样。只问死活的话，这个去处会一直开着，
     * 而 `{elder}` 落笔时已经换成了别人——玩家点的是一个人，
     * 说上话的是另一个人。
     *
     * 这里**不再并列写 `alive: true`**：`near` 已经蕴含它
     * （死了的一律不算在身边）。留着那一格反而会把「near 忘了查死活」
     * 这种实现错误替引擎遮住。
     */
    requires: [{ bond: { kind: '抚养', near: true } }],
    echo: '你去找{elder}说话。',
  },
  {
    id: 'kids',
    label: '找村里的孩子玩',
    slots: ['上午', '下午'],
    // 城里的孩子玩的是巷子里的孩子——那是另一句，不在这儿用记号掩盖
    requires: [{ dwelling: { settlement: ['村'], kind: ['宅', '无'] } }],
    echo: '你跑出去找人玩。',
  },
  {
    id: 'home',
    label: '待在家里',
    slots: ['上午', '下午', '傍晚'],
    echo: '你待在家里。',
  },
  {
    id: 'idle',
    label: '什么也不做',
    slots: ['上午', '下午', '傍晚'],
    echo: '你什么也没做。',
  },
]

/**
 * 每一段可能的落点。
 *
 * 写新的时，先问自己一句：**这一条真的需要改变什么吗？**
 * 多数时候答案是不需要——那就写成「无事」，让它只负责把这一天写实。
 */
export const BEATS: readonly Beat[] = [
  ...MANOR_BEATS,
  ...CITY_BEATS,
  // ============================================================
  // 帮家里干活
  //
  // 这一组分两层，分法就是这次「出身无假设」要立的规矩：
  //
  // - 标记 `替家里干活` 是**这件事**：谁家的孩子搭手都算。
  // - 标记 `替家里下地` 是**这种日子**：只有种地的人家才有。
  //
  // 从前只有后一个标记，于是猎户、商户、当差人家的孩子干完活，
  // 心念里回响的是「收工的时候你又回头看了一眼地里」——他家没有地。
  // 现在下地那几条各自写明 `living.is === 'farm'`，
  // 挂在 `替家里下地` 上的火种也就自动只落在种地的人家身上了。
  //
  // 写新的一条之前先问一句：**这句话里的东西，这家人有吗？**
  // 有就写 `替家里干活`，只有某一种日子才有就再加一个专属标记，
  // 并且把 requires 写上——不写 requires 的专属内容等于没分流。
  // ============================================================
  {
    doing: 'work',
    tags: ['替家里干活', '替家里下地'],
    tier: '无事',
    weight: 42,
    requires: [{ living: { is: 'farm' } }],
    text: ['你跟着下了地。', '一上午割了半晌草，手心磨出个泡。', '没人夸你，也没人说什么。'],
  },
  {
    doing: 'work',
    tags: ['替家里干活', '替家里下地', '旱年'],
    tier: '无事',
    weight: 30,
    requires: [{ living: { is: 'farm' } }],
    when: { rain: { atMost: 34 } },
    // 同一块地，旱年和丰年不是一件事。玩家读的每一句无事，也是在读这一年的光景
    text: [
      '地是干的。锄头下去，土块碎成面。',
      '{elder}半天没说话。',
      '傍晚收工时天还亮着，可是没什么活好干了。',
    ],
  },
  {
    doing: 'work',
    tags: ['替家里干活', '替家里下地'],
    tier: '无事',
    weight: 28,
    requires: [{ living: { is: 'farm' } }],
    when: { harvest: { atLeast: 62 } },
    text: [
      '今年的活比往年多。',
      '场院上摊得满满的，翻一遍要小半天。',
      '你晒得脖子发疼，可是心里是松快的。',
    ],
  },
  {
    doing: 'work',
    tags: ['替家里干活'],
    tier: '无事',
    weight: 22,
    text: ['做的是些谁都能做的杂事。', '搬,抬,递。一上午过去了。'],
  },
  {
    doing: 'work',
    tags: ['替家里干活'],
    tier: '处境',
    weight: 18,
    text: ['今天出的力比往常多。', '晚上躺下的时候，腰是酸的。'],
    effects: [{ type: 'attribute', key: 'body', delta: 1 }],
  },
  {
    doing: 'work',
    tags: ['替家里干活'],
    tier: '处境',
    weight: 12,
    text: ['你手脚快，多做了一份。', '{elder}没说什么，可是晚饭时给你多盛了半勺。'],
    effects: [
      { type: 'attribute', key: 'body', delta: 1 },
      { type: 'meet', id: 'elder', delta: 3 },
    ],
  },
  {
    doing: 'work',
    tags: ['替家里干活', '门口的生人'],
    tier: '无事',
    weight: 24,
    /**
     * 钩子：机制上什么也没变，可玩家知道有事在发生。
     *
     * 「无事」和「空转」的分界线就在这种句子上——
     * 他这一天没碰上什么，但他感觉到了。
     */
    text: [
      '你回来的时候，看见{elder}站在门口跟一个人说话。',
      '你一走近，他们就不说了。',
      '那人你没见过。他走的时候看了你一眼。',
    ],
  },
  {
    doing: 'work',
    tags: ['替家里干活', '替家里下地'],
    tier: '见闻',
    weight: 7,
    // 田埂上蹲着说米价的是种地的人。铺子里、衙门里听见的是另一套话，那要另写
    requires: [{ living: { is: 'farm' } }],
    when: { grain: { atLeast: 138 } },
    text: [
      '歇晌的时候，几个人蹲在田埂上说话。',
      '说的是米价，说的是隔壁村谁家把地押出去了。',
      '你听了半晌，没插嘴。',
    ],
    effects: [
      {
        type: 'knowledge',
        id: 'land-pledged',
        title: '押出去的地',
        summary: '田埂上听人说，隔壁村有人家把地押出去换粮了。',
        category: '世事',
        contact: '听说',
        interpretation: '猜想',
      },
    ],
  },
  {
    doing: 'work',
    tags: ['替家里干活'],
    tier: '转折',
    weight: 9,
    // 「还想不想接着念」得先有在念的书。没进过学堂的孩子，这句问不出口
    requires: [{ age: { atLeast: 12 } }, { flag: { key: 'schooled', equals: true } }],
    text: [
      '收工的时候{elder}叫住了你。',
      '他问你，明年还想不想接着念。',
      '你没有立刻答。他也没有再问。',
      '这句话你记了很久。',
    ],
    effects: [{ type: 'flag', key: 'asked-about-school', value: true }],
  },

  // ============================================================
  // 去私塾
  // ============================================================
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '无事',
    weight: 44,
    text: ['先生今天讲的是旧课。', '你跟着念了一上午，字都认得。', '窗外有人吆喝着走过去。'],
  },
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '无事',
    weight: 30,
    text: [
      '你走神了。',
      '等回过神来，先生已经讲到下一段。',
      '你没敢问，只把那一页记下了，打算晚上自己看。',
    ],
  },
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '无事',
    weight: 22,
    text: ['今天少了两个人。', '先生没有问，接着讲。', '你知道那两家是什么光景。'],
  },
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '处境',
    weight: 16,
    text: ['今天的字写得比往常稳。', '先生在你的本子上点了一下，没说话。'],
    effects: [{ type: 'attribute', key: 'memory', delta: 1 }],
  },
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '处境',
    weight: 10,
    text: ['散学后你没有走，把上午那一段又抄了两遍。', '天快黑了先生才发现你还在。'],
    effects: [
      { type: 'attribute', key: 'memory', delta: 1 },
      { type: 'attribute', key: 'will', delta: 1 },
      { type: 'meet', id: 'teacher', calls: '周先生', delta: 4 },
    ],
  },
  {
    doing: 'school',
    tags: ['私塾'],
    tier: '见闻',
    weight: 7,
    text: [
      '先生讲到一句，忽然停了。',
      '他说这一段是前朝的书，后来不许讲了。',
      '你问为什么。他说，你还小。',
    ],
    effects: [
      {
        type: 'knowledge',
        id: 'forbidden-page',
        title: '不许讲的那一段',
        summary: '先生说有一段是前朝的书，后来不许讲了。他没说是为什么。',
        category: '世事',
        contact: '听说',
        interpretation: '未理解',
      },
    ],
  },

  // ============================================================
  // 去镇上
  // ============================================================
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '无事',
    weight: 40,
    text: ['镇上跟上回来没什么两样。', '你在街上走了一圈，什么也没买。', '回来的路上下了点小雨。'],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '无事',
    weight: 26,
    when: { order: { atMost: 44 } },
    text: ['街上的人比上回少。', '有两家铺子上了板，不知道是关了还是没开。', '你没有多待。'],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '无事',
    weight: 20,
    text: ['庙前有人摆摊，卖的是针头线脑。', '你蹲着看了一会儿，什么也没买。', '摊主没赶你。'],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '处境',
    weight: 14,
    text: ['来回走了大半天。', '回到家天已经黑了，脚底板疼。'],
    effects: [{ type: 'attribute', key: 'body', delta: 1 }],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '见闻',
    weight: 9,
    when: { grain: { atLeast: 148 } },
    text: ['街口那家米铺关着门。', '门口蹲着几个人，不知道在等什么。', '你问了一句，没人理你。'],
    effects: [
      {
        type: 'knowledge',
        id: 'shut-granary',
        title: '关门的米铺',
        summary: '街口那家米铺关了门。门口蹲着人，没人说话。',
        category: '世事',
        contact: '见过',
        interpretation: '未理解',
      },
    ],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '见闻',
    weight: 6,
    text: [
      '你在街上撞见一个同村的人，他在给人做工。',
      '他说这活是按天算的，不好干，可是给钱。',
      '他让你别跟家里说见过他。',
    ],
    effects: [
      { type: 'meet', id: 'villager-hand', calls: '在镇上做工的同村人', delta: 6 },
      {
        type: 'knowledge',
        id: 'day-labour',
        title: '按天算的活',
        summary: '镇上有按天给钱的短工。同村有人在干，不想让家里知道。',
        category: '世事',
        contact: '听说',
        interpretation: '猜想',
      },
    ],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '转折',
    weight: 9,
    requires: [{ age: { atLeast: 12 } }],
    text: [
      '有个货栈的伙计问你识不识字。',
      '你说认得一些。他说，那你过些日子来，兴许有活给你。',
      '他没说是什么活，也没说给多少。',
    ],
    effects: [{ type: 'flag', key: 'offered-shopwork', value: true }],
  },
  {
    doing: 'town',
    tags: ['镇上'],
    tier: '大事',
    weight: 3,
    requires: [{ age: { atLeast: 10 } }],
    omen: 'book',
    text: ['庙前那个货郎的摊角，堆着一叠旧纸。'],
  },

  // ============================================================
  // 往山那边走走
  // ============================================================
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '转折',
    weight: 8,
    /**
     * 他知道了村子不是全部。
     *
     * 这一条什么属性也不给，只留一个旗标——**而那正是「转折」这一档的样子**：
     * 它不让你变强，它让你后面能走的路多了一条。
     */
    text: [
      '你绕到了山那一面。',
      '底下有一条道，比村口那条宽。上面有车辙。',
      '你顺着看了很久，看不到头。',
      '回去的路上你一直在想那条道通到哪里。',
    ],
    effects: [{ type: 'flag', key: 'saw-the-road', value: true }],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '无事',
    weight: 40,
    text: ['山路上没有人。', '你走到能看见村子的地方就坐下了。', '坐了很久，什么也没想。'],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '无事',
    weight: 26,
    when: { rain: { atMost: 34 } },
    text: ['山泉比上回细了。', '接了半天才接满一竹筒。', '你把水喝了，坐在石头上晾了会儿。'],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '无事',
    weight: 22,
    text: [
      '你在林子边上捡了些干柴。',
      '捆好背回来，肩膀勒了两道红印。',
      '{elder}看了一眼，说下回别走那么远。',
    ],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '处境',
    weight: 16,
    text: ['你走得比平常远，绕到了山那一面。', '回来的时候腿是软的。'],
    effects: [
      { type: 'attribute', key: 'body', delta: 1 },
      { type: 'attribute', key: 'insight', delta: 1 },
    ],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '见闻',
    weight: 8,
    text: [
      '半路上你看见一个背篓的人，走得很快。',
      '他没有走大路，从林子里穿过去了。',
      '你在原地站了一会儿。这一带没什么人往那边去。',
    ],
    effects: [
      {
        type: 'knowledge',
        id: 'the-side-path',
        title: '林子里那条道',
        summary: '有人不走大路，从林子里穿过去。那边你没去过。',
        category: '地理',
        contact: '见过',
        interpretation: '未理解',
      },
    ],
  },
  {
    doing: 'hill',
    tags: ['山那边'],
    tier: '大事',
    weight: 4,
    requires: [{ age: { atLeast: 10 } }],
    omen: 'wounded',
    text: ['转过那道弯，你看见路边的草丛压平了一片。'],
  },

  // ============================================================
  // 找家里的大人说话
  // ============================================================
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '转折',
    weight: 7,
    /**
     * 他头一回被当成大人说话。
     *
     * 「转折」不一定是遇上了什么，也可以是**别人看你的方式变了**——
     * 而那之后，很多事情就不一样了。
     */
    text: [
      '这一晚他说的话比平常多。',
      '他说起家里这两年的难处，说得很细，像是在跟大人说话。',
      '你听着，不知道该接什么。',
      '他说完了，两个人坐了很久。',
    ],
    effects: [
      { type: 'flag', key: 'told-the-truth-at-home', value: true },
      { type: 'meet', id: 'elder', delta: 8 },
      { type: 'attribute', key: 'insight', delta: 2 },
    ],
  },
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '无事',
    weight: 40,
    text: ['{elder}在忙自己的事，没顾上你。', '你在旁边坐了一会儿，起身走了。'],
  },
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '无事',
    weight: 26,
    text: ['你们说了几句家里的事。', '说的都是些谁都知道的事。', '说完就没话了，两个人坐着。'],
  },
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '处境',
    weight: 20,
    text: ['你陪着说了一晚上话。', '他说得不多，可是没有赶你去睡。'],
    effects: [{ type: 'meet', id: 'elder', delta: 5 }],
  },
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '见闻',
    weight: 10,
    text: ['你问起他年轻时候的事。', '他讲了一段，讲到一半自己笑了，说都是老黄历了。'],
    effects: [
      { type: 'meet', id: 'elder', delta: 4 },
      { type: 'attribute', key: 'insight', delta: 1 },
    ],
  },
  {
    doing: 'elder',
    tags: ['家里的大人'],
    tier: '无事',
    weight: 18,
    // 又一个钩子。这一条不改任何东西，可它会让玩家记住今年
    text: ['你想问家里今年的事，话到嘴边又咽回去了。', '他也像是有话要说，最后只说了句早点睡。'],
  },

  // ============================================================
  // 找村里的孩子玩
  // ============================================================
  {
    doing: 'kids',
    tags: ['找孩子玩'],
    tier: '转折',
    weight: 7,
    text: [
      '不知道为着什么，你跟人动了手。',
      '两边都挂了彩。大人来了，各自骂了几句。',
      '此后好些日子，那一伙人没有再叫过你。',
      '你一个人的时候多了起来。',
    ],
    effects: [
      { type: 'flag', key: 'fell-out-with-kids', value: true },
      { type: 'attribute', key: 'will', delta: 2 },
    ],
  },
  {
    doing: 'kids',
    tags: ['找孩子玩'],
    tier: '无事',
    weight: 44,
    text: ['一群人在打谷场上疯了半天。', '出了一身汗，回家挨了一句骂。'],
  },
  {
    doing: 'kids',
    tags: ['找孩子玩'],
    tier: '无事',
    weight: 26,
    text: ['今天人不齐。', '你们在河边扔了会儿石头，就各自散了。'],
  },
  {
    doing: 'kids',
    tags: ['找孩子玩'],
    tier: '处境',
    weight: 18,
    text: ['疯跑了一天，膝盖上蹭破一块皮。', '不疼，就是回家不好交代。'],
    effects: [{ type: 'attribute', key: 'body', delta: 1 }],
  },
  {
    doing: 'kids',
    tags: ['找孩子玩'],
    tier: '见闻',
    weight: 8,
    text: [
      '有个孩子说他哥去年跟着人走了，去了很远的地方。',
      '他说他哥托人捎过一次信。',
      '你问信上说什么。他说他不认字。',
    ],
    effects: [
      {
        type: 'knowledge',
        id: 'those-who-left',
        title: '走出去的人',
        summary: '村里有人跟着外路人走了，去了很远的地方。捎回来的信没人认得。',
        category: '世事',
        contact: '听说',
        interpretation: '猜想',
      },
    ],
  },

  // ============================================================
  // 待在家里
  // ============================================================
  {
    doing: 'home',
    tags: ['在家'],
    tier: '无事',
    weight: 46,
    text: ['你在家待了半天。', '扫了地，喂了鸡，剩下的时间坐着。'],
  },
  {
    doing: 'home',
    tags: ['在家'],
    tier: '无事',
    weight: 30,
    text: ['屋里闷。', '你把门槛上那块松了的木头按了按，没按住。', '一天就这么过去了。'],
  },
  {
    doing: 'home',
    tags: ['在家', '粥稀了'],
    tier: '无事',
    weight: 20,
    when: { grain: { atLeast: 138 } },
    text: ['晚饭的粥比前些日子稀。', '没有人说什么。', '你把碗底舔干净了。'],
  },
  {
    doing: 'home',
    tags: ['在家'],
    tier: '处境',
    weight: 12,
    text: ['你把家里的东西归置了一遍。', '翻出几样早就忘了的旧物。'],
    effects: [{ type: 'attribute', key: 'insight', delta: 1 }],
  },

  // ============================================================
  // 什么也不做
  // ============================================================
  {
    doing: 'idle',
    tags: ['闲着'],
    tier: '无事',
    weight: 50,
    text: ['你什么也没做。', '躺着看了半天房梁。'],
  },
  {
    doing: 'idle',
    tags: ['闲着'],
    tier: '无事',
    weight: 30,
    text: ['你在门槛上坐着，看外面。', '过去几个人，都是认得的。', '天就这么黑了。'],
  },
  {
    doing: 'idle',
    tags: ['闲着'],
    tier: '处境',
    weight: 14,
    text: ['一整天什么也没干。', '晚上躺下的时候，脑子里反而清楚。'],
    effects: [{ type: 'attribute', key: 'will', delta: 1 }],
  },
  {
    doing: 'idle',
    tags: ['闲着'],
    tier: '见闻',
    weight: 5,
    text: ['坐了一天，你把这些日子听来的事在心里过了一遍。', '有几件对不上。'],
    effects: [{ type: 'attribute', key: 'insight', delta: 2 }],
  },
]
