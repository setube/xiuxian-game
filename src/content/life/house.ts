import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 承户与分家。
 *
 * ## 这一片是拿来压底座的，不是拿来加系统的
 *
 * 用户 2026-09-06 定的下一步：普通人的商、农、工、生计与成年后分家／继承／自立——
 * 「第一次真正检验 House + Residence + Livelihood + Person 能不能撑起一个普通家庭
 * 几十年的经济生活，而不需要再发明一套职业系统」。
 *
 * 第一个真实使用者是**父亲殁了之后的那两三年**：户主换人（承户）、兄弟分产（分家）、
 * 分出去的那个自立门户。它同时压到：
 *
 *     House.head        户主不能是死人（`people.keepHeads`：殁了就换，寡母当家到儿子成人）
 *     House.members     谁跟谁走（分家时妻儿跟你，娘和哥留在老屋）
 *     Residence         分出去住哪（同一条巷子上新起的两间屋，是一处真实的宅）
 *     Livelihood        铺子归了哥，你的业就变了（`household.business` 头一回有人写 null）
 *     邻居              中人是真人（`{call:east-head}`），不是「两位长辈」四个字
 *     举家              进城那一支带的是你自己这一户，不是老屋里的人
 *
 * ## 史料（design/ming-society.md 4.1）
 *
 * - 【史料·待核原文，《大明律·户律·户役·别籍异财》】「凡祖父母、父母在，而子孙别立户籍、
 *   分异财产者，杖一百」；「其父母许令分析者，听」。→ **父在不分家**；母在，得她点头。
 * - 【史料·待核原文，《大明律·户律·户役·卑幼私擅用财》】「其分析家财田产，不问妻妾婢生，
 *   止依子数均分」。→ **诸子均分**，不是长子独得。
 * - 【推断】铺面、家什分不开，常是一人得铺、余人折银；地按亩分。长子多留老屋。
 *
 * ## 这一片不覆盖谁
 *
 * 官宦（田产、荫）、宗室（分封）、寺里、讨饭、逃难、门第塌了的——各是另一件事，
 * 事件条件里用 `living.notIn` 明写着。它们不是被忘了，是没有第一个使用者。
 *
 * ## 役不是家世
 *
 * 衙役人家承户那一节：差不是家里的东西，腰牌交回衙门，班头另点了人。
 * 这是内容里的一件事，不是「役不世袭」的规则——用户明令两头都不写死。
 */

/** 这一片只写这几种日子。其余各有各的分法，等它们自己的第一个使用者 */
const THIS_PIECE = {
  living: {
    notIn: ['office', 'palace', 'manor', 'fallen', 'market', 'temple', 'begging', 'adrift'],
  },
}

export const houseScenes: SceneLibrary = {
  /**
   * 承户。当家的人没了，这一户从此是你的。
   *
   * 谁没了不写死：`head-passed-from` 那面旗标记着上一任户主的 id（`engine/effects.ts`），
   * 爹、娘、养你的叔父、哥，各是一句。正文点名说谁，条件就问谁。
   */
  'house:succeed': {
    id: 'house:succeed',
    title: '承户',
    entry: 'open',
    nodes: {
      /**
       * 户是怎么到你手上的，由 `head-passed-how` 那面旗说：上一任殁了，或是寡母当家
       * 到你成人那年把家交给你。两件事两种正文，分在两节里，不在一句话里换词。
       */
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 7 },
          { type: 'flag', key: 'heads-the-house', value: true },
          { type: 'chronicle', text: '你承了户。', tone: 'deep' },
        ],
        blocks: [],
        branches: [
          /**
           * 「交」这条路还得问一句：交家的那个人此刻还在不在。
           *
           * 旗是 `keepHeads` 在**交接那一刻**打的（`stores/people.ts`），
           * 而这一卷是年表排期演的，两者之间隔着年。寡母把家交出来，
           * 几年后她没了，这一卷才轮到——于是正文说「交给你那天，她什么也没说」，
           * 而说这话的时候她已经不在了。**旗记得那一刻，人却会往下活。**
           *
           * 问 `family` 不问 `bond`：正文点名说的是娘、是姐，条件就得问那一个人，
           * 不能问「这层关系里还有没有活人」——娘没了而姨母还在，那不是同一件事。
           *
           * 交家的人不在了就落到 `bereaved`：玩家此刻经历的确实是「当家的人没了」。
           */
          {
            requires: [
              { flag: { key: 'head-passed-how', equals: '交' } },
              { flag: { key: 'head-passed-from', equals: 'mother' } },
              { family: { id: 'mother', alive: true } },
            ],
            next: 'handed',
          },
          {
            requires: [
              { flag: { key: 'head-passed-how', equals: '交' } },
              { flag: { key: 'head-passed-from', equals: 'sister' } },
              { family: { id: 'sister', alive: true } },
            ],
            next: 'handed',
          },
        ],
        next: 'bereaved',
      },
      bereaved: {
        id: 'bereaved',
        blocks: [
          { kind: 'narration', text: '当家的人没了。丧事办完，来吊的人散了，屋里忽然很静。' },
          { kind: 'event', text: '这一户从此是你的了。' },
          { kind: 'narration', text: '里长来过一趟，册子上把名字换成了你的。' },
        ],
        seen: [
          {
            requires: [{ flag: { key: 'head-passed-from', equals: 'father' } }],
            text: '爹留下的东西不多。他用过的那几样，你一样也没舍得动。',
          },
          {
            requires: [{ bond: { kind: '生母', alive: true } }],
            text: '娘还在。她不管外头的事了，只管灶上。',
          },
          {
            // 弟弟的年纪从这条边的年头上读：他生下来那年牵的边，牵了十六年就是十六岁
            requires: [{ bond: { kind: '弟', alive: true, years: { atLeast: 16 } } }],
            text: '弟弟也大了。这一户迟早要分，只是不在今年。',
          },
        ],
        next: 'trade',
      },
      handed: {
        id: 'handed',
        /**
         * 打一面旗说「交家那一幕真的演了」。
         *
         * `head-passed-how` 记的是**当年那一刻**是交还是殁，它不会变；
         * 可这一卷什么时候演由年表定，中间隔着年。于是「旗上写着交」
         * 和「玩家此刻正在读交家这一幕」是两件事，从前门禁只问得到前一件，
         * 于是娘交完家又过世的那种人生，被判成了「旗在撒谎」——
         * **旗没撒谎，是判据问错了问题。**
         */
        onEnter: [{ type: 'flag', key: 'head-handed-over', value: true }],
        blocks: [
          { kind: 'narration', text: '你成人那年，当家的把钥匙交给了你。' },
          { kind: 'event', text: '这一户从此是你的了。' },
          // 户籍名义与实际主持是两件事：寡母当家那些年，册子上写的多半早就是儿子的名字
          { kind: 'narration', text: '册子上早就是你的名字。家，从这天起才真是你当。' },
        ],
        seen: [
          {
            requires: [{ flag: { key: 'head-passed-from', equals: 'mother' } }],
            text: '娘当了这么多年的家。交给你那天，她什么也没说。',
          },
          {
            requires: [{ flag: { key: 'head-passed-from', equals: 'sister' } }],
            text: '姐姐拉扯你这么多年。交给你那天，她只说了句：往后你自己看着办。',
          },
        ],
        next: 'trade',
      },
      trade: {
        id: 'trade',
        blocks: [],
        branches: [
          { requires: [{ living: { is: 'farm' } }], next: 'fields' },
          { requires: [{ living: { is: 'shop' } }], next: 'shop' },
          { requires: [{ living: { is: 'clinic' } }], next: 'shop' },
          { requires: [{ living: { is: 'craft' } }], next: 'craft' },
          { requires: [{ living: { is: 'hunt' } }], next: 'hunt' },
          { requires: [{ living: { is: 'yamen' } }], next: 'yamen' },
        ],
        next: 'plain',
      },
      fields: {
        id: 'fields',
        blocks: [
          { kind: 'narration', text: '开春的时候，地里的活是你带着人干的。' },
          { kind: 'narration', text: '那几亩地从前是他的，如今是你的。你头一回一个人去交粮。' },
        ],
      },
      shop: {
        id: 'shop',
        blocks: [
          { kind: 'narration', text: '铺子的账从此是你记。头一个月你算错了两回，没人替你兜着。' },
          { kind: 'narration', text: '老主顾进门，先看一眼柜台后头站的是谁。', tone: 'faint' },
        ],
      },
      craft: {
        id: 'craft',
        blocks: [
          { kind: 'narration', text: '架上那些家什归了你。有几件你还使不顺手。' },
          {
            kind: 'narration',
            text: '来定活的人还是那句「老师傅呢」。你说不在了。他愣了一下，还是把活留下了。',
          },
        ],
      },
      hunt: {
        id: 'hunt',
        blocks: [{ kind: 'narration', text: '山上那几条路你都认得。那张弓如今挂在你的墙上。' }],
      },
      /**
       * 衙役人家的承户：差不是家里的东西。
       *
       * 这一节是「役不是家世」在内容里的落点——腰牌交回衙门，班头另点了人，
       * 这一户名下什么营生也没有了。写的是这一家这一年发生的事，
       * 不是「役不世袭」的规则；哪天写一卷「班头点了你顶你爹的差」，照样成立。
       */
      yamen: {
        id: 'yamen',
        onEnter: [
          { type: 'household', livelihood: '佣工' },
          { type: 'living', living: 'hired' },
        ],
        blocks: [
          { kind: 'narration', text: '他那份差不是家里的东西。腰牌交回了衙门，班头另点了人。' },
          { kind: 'event', text: '这一户名下什么营生也没有了。你得自己找活路。' },
        ],
      },
      plain: {
        id: 'plain',
        blocks: [{ kind: 'narration', text: '家里的事从此都要你拿主意。' }],
      },
    },
  },

  /**
   * 分家：哥当了家，你分出去。
   *
   * 中人得是真人。东邻的户主还在，就是他；不在了，才是「族里的两位长辈」。
   * 分什么按这家过的日子分：地按亩分，铺子归一人余人折银，家什各拿一半。
   * 两条路：就在村里起两间屋，或者把那份折成银子进城——后一条是「自立」，
   * `举家` 带的是你自己这一户（妻儿），老屋里的人一个不动。
   */
  'house:divide': {
    id: 'house:divide',
    title: '分家',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [
          { kind: 'narration', text: '当家的是哥。过了年，他说，该分了。' },
          { kind: 'narration', text: '分书写了两份，各人一份。' },
        ],
        seen: [
          {
            requires: [{ family: { id: 'east-head', alive: true } }],
            text: '中人请的是{call:east-head}，和族里的一位长辈。',
          },
          {
            requires: [{ family: { id: 'east-head', alive: false } }],
            text: '中人请的是族里的两位长辈。',
          },
          {
            requires: [{ bond: { kind: '生母', alive: true } }],
            text: '娘坐在一边没说话，最后点了头。',
          },
        ],
        branches: [
          { requires: [{ living: { is: 'farm' } }], next: 'fields' },
          { requires: [{ living: { is: 'shop' } }], next: 'shop' },
          { requires: [{ living: { is: 'clinic' } }], next: 'shop' },
          { requires: [{ living: { is: 'craft' } }], next: 'craft' },
          { requires: [{ living: { is: 'hunt' } }], next: 'hunt' },
          { requires: [{ living: { is: 'yamen' } }], next: 'yamen' },
        ],
        next: 'choose',
      },
      fields: {
        id: 'fields',
        // 地按亩分。你那一份比整块地小得多，家境跟着落
        onEnter: [{ type: 'household', standing: -9 }],
        blocks: [
          { kind: 'narration', text: '地按亩分。老屋归哥，你分到东头那几亩，还有一头牛的半个。' },
        ],
        next: 'choose',
      },
      shop: {
        id: 'shop',
        /**
         * 铺子分不开。归哥，你折了银子——从这一刻起你家**没有铺面**：
         * `business` 头一回有人写 null，`living` 从铺子里的日子换成给人做工的日子。
         * 「业随时会变」这句话（`types/game.ts`）到这儿才有了第二个使用者。
         *
         * 日子在下一节才换：这一节的正文还在铺子里（那块柜台），`scripts/upbringing.ts`
         * 按节算读者——换了日子再说柜台，就是给人做工的人家里有柜台。
         */
        onEnter: [{ type: 'household', standing: -12 }],
        blocks: [
          { kind: 'narration', text: '铺子分不开。归了哥，你折了银子。' },
          {
            kind: 'narration',
            text: '那块柜台你站了十几年。搬东西出来的时候，你没有回头看。',
            tone: 'faint',
          },
        ],
        next: 'shop-gone',
      },
      'shop-gone': {
        id: 'shop-gone',
        onEnter: [
          { type: 'household', business: null, livelihood: '佣工' },
          { type: 'living', living: 'hired' },
        ],
        blocks: [],
        next: 'choose',
      },
      craft: {
        id: 'craft',
        onEnter: [{ type: 'household', standing: -6 }],
        blocks: [{ kind: 'narration', text: '家什各拿一半。好使的那几件，哥留下了。' }],
        // 学过手艺的自己开张；没学过的，家什拿了也是给人做工
        branches: [{ requires: [{ flag: { key: 'has-craft' } }], next: 'choose' }],
        next: 'craft-hired',
      },
      'craft-hired': {
        id: 'craft-hired',
        onEnter: [
          { type: 'household', livelihood: '佣工' },
          { type: 'living', living: 'hired' },
        ],
        blocks: [{ kind: 'narration', text: '你没学成那门手艺。家什拿了，还是得给人做工。' }],
        next: 'choose',
      },
      hunt: {
        id: 'hunt',
        onEnter: [{ type: 'household', standing: -5 }],
        blocks: [{ kind: 'narration', text: '山上的路分不了。弓归哥，你拿了那把刀。' }],
        next: 'choose',
      },
      yamen: {
        id: 'yamen',
        onEnter: [
          { type: 'household', standing: -4, livelihood: '佣工' },
          { type: 'living', living: 'hired' },
        ],
        blocks: [{ kind: 'narration', text: '没什么可分的。差不是家里的东西，分的只有两间屋。' }],
        next: 'choose',
      },
      choose: {
        id: 'choose',
        blocks: [],
        choices: [
          {
            id: 'stay',
            label: '就在隔壁起两间屋',
            echo: '你在老屋隔壁起了两间屋。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'divide', leaves: 'me' },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'chronicle', text: '分了家。你搬到了隔壁。' },
            ],
            next: 'settled',
          },
          {
            id: 'town',
            label: '把那一份折成银子，进城去',
            hint: '城里活路多，可谁也不认得你',
            echo: '你带着家里人进了城。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'divide', leaves: 'me' },
              // 举家带的是你自己这一户：妻儿。老屋里的娘和哥一个不动
              { type: 'home', place: '{province} · {prefecture} · 城里', takes: '举家' },
              { type: 'household', livelihood: '佣工' },
              { type: 'living', living: 'hired' },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'flag', key: 'moved-to-town', value: true },
              { type: 'chronicle', text: '分了家。你进了城。', tone: 'deep' },
            ],
            next: 'town',
          },
        ],
      },
      settled: {
        id: 'settled',
        blocks: [
          { kind: 'narration', text: '两间屋，隔着一道墙。做饭的时候，那边的动静还听得见。' },
          { kind: 'narration', text: '从这一天起，你是你这一户的当家。', tone: 'faint' },
        ],
      },
      town: {
        id: 'town',
        blocks: [
          { kind: 'narration', text: '城里租的是一间半。头几个月你什么活都接。' },
          {
            kind: 'narration',
            text: '街上没有人认得你。你走过去，也没有人跟你打招呼。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 分家：弟弟成了家，分出去。你是当家的，老屋归你。
   */
  'house:divide-younger': {
    id: 'house:divide-younger',
    title: '弟弟分出去',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [
          { kind: 'narration', text: '弟弟成了家，要分出去。' },
          { kind: 'narration', text: '分书写了两份。' },
        ],
        seen: [
          {
            requires: [{ family: { id: 'east-head', alive: true } }],
            text: '中人请的是{call:east-head}。',
          },
          {
            requires: [{ bond: { kind: '生母', alive: true } }],
            text: '娘要跟着你。她说老屋住惯了。',
          },
        ],
        branches: [
          { requires: [{ living: { is: 'farm' } }], next: 'fields' },
          { requires: [{ living: { is: 'shop' } }], next: 'shop' },
          { requires: [{ living: { is: 'clinic' } }], next: 'shop' },
          { requires: [{ living: { is: 'craft' } }], next: 'craft' },
          { requires: [{ living: { is: 'yamen' } }], next: 'yamen' },
        ],
        next: 'done',
      },
      fields: {
        id: 'fields',
        onEnter: [{ type: 'household', standing: -8 }],
        blocks: [{ kind: 'narration', text: '地按亩分。他要了东头那几亩。' }],
        next: 'done',
      },
      shop: {
        id: 'shop',
        onEnter: [{ type: 'household', standing: -10 }],
        blocks: [{ kind: 'narration', text: '铺子留在你手里，折了银子给他。那笔银子是借的。' }],
        next: 'done',
      },
      craft: {
        id: 'craft',
        onEnter: [{ type: 'household', standing: -5 }],
        blocks: [{ kind: 'narration', text: '家什各拿一半。' }],
        next: 'done',
      },
      yamen: {
        id: 'yamen',
        onEnter: [{ type: 'household', standing: -3 }],
        blocks: [{ kind: 'narration', text: '没什么可分的。分的只有两间屋。' }],
        next: 'done',
      },
      done: {
        id: 'done',
        onEnter: [
          { type: 'divide', leaves: '弟' },
          { type: 'chronicle', text: '弟弟分出去了，就在隔壁。' },
        ],
        blocks: [
          { kind: 'narration', text: '他搬到了隔壁那两间屋。隔着一道墙，做饭的时候还听得见。' },
        ],
      },
    },
  },
}

export const houseEvents: readonly LifeEvent[] = [
  {
    /**
     * 承户。条件问的是**户**（`house.head === 'me'`），不问「爹殁了」——
     * 爹在你出生那天就没了的人生里，养你的叔父才是户主，他没了才轮到你。
     * 户主换人由 `people.keepHeads` 在人殁的那一刻做，这一卷只是把它讲出来。
     */
    id: 'house-succeed',
    window: { from: 16, to: 70 },
    // 户到你手上得是承来的（那面旗只有 `keepHeads` 写）：分家分出去也是户主，那不是承户
    requires: [
      THIS_PIECE,
      { house: { head: 'me' } },
      { flag: { key: 'head-passed-to', equals: 'me' } },
    ],
    scene: 'house:succeed',
    weight: 40,
  },
  {
    // 哥当家、你成了家：分出去。父在不分家——问的是「当家的是哥」，不是「当家的不是我」
    id: 'house-divide',
    window: { from: 18, to: 60 },
    // 只写了成了家的儿子分出去。**这是第一片的内容限制，不是规则**（用户 2026-09-06）：
    // 女儿出嫁、三个以上的儿子、分书上的地亩与债，各是另一卷——尤其女儿出嫁，
    // 别写成「从这一户删掉、加进夫家那一户」，嫁资、户绝女承分、寡妇主持另有一套现实，
    // 等第一个真实使用者来逼，不提前设计
    requires: [
      THIS_PIECE,
      { gender: '男' },
      { house: { head: '兄' } },
      { bond: { kind: '配偶', alive: true } },
    ],
    scene: 'house:divide',
    weight: 30,
  },
  {
    // 你当家、弟弟成人了、他还在你这一户里：他分出去
    id: 'house-divide-younger',
    window: { from: 20, to: 60 },
    requires: [
      THIS_PIECE,
      { gender: '男' },
      { house: { head: 'me', with: '弟' } },
      { bond: { kind: '弟', alive: true, years: { atLeast: 16 } } },
    ],
    scene: 'house:divide-younger',
    weight: 20,
  },
]
