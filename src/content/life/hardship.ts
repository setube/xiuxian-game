import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 家道中落。
 *
 * 这不是一个词条，也不是「家产 -50」。它是连着好几年发生的一串事：
 *
 *   连年雨水不足 → 收成不佳 → 父亲欠下一笔债 → 父亲为还债离开家乡
 *   → 村中传来消息，父亲死在了外地 → 家里少了个劳力 → 你不能再读书了
 *
 * 每一环都写了 requires，靠上一环留下的旗标才进得来。
 * 所以它是长出来的，不是排好号一件件放出来的——
 * 中间任何一环条件没凑上，这条链就断在那里，
 * 而一个人的一生里，它本来就常常不会走完。
 */
const CHAIN = '父债'

export const hardshipScenes: SceneLibrary = {
  'debt:drought': {
    id: 'debt:drought',
    title: '天时',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 8 },
          { type: 'household', standing: -8 },
          { type: 'flag', key: 'drought', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '这一年雨水不足。' },
          { kind: 'narration', text: '开春时还看不出来，入夏之后地就干了。' },
          {
            kind: 'narration',
            text: '父亲每天傍晚都去地里站一会儿，站着不说话，然后回来吃饭。',
          },
          { kind: 'event', text: '秋后收成不到往年的六成。' },
          { kind: 'narration', text: '这不是头一年了。去年也差。' },
        ],
      },
    },
  },

  'debt:borrow': {
    id: 'debt:borrow',
    title: '借',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 5 },
          { type: 'household', debt: 12, standing: -6 },
          { type: 'flag', key: 'father-in-debt', value: true },
          {
            type: 'family',
            id: 'father',
            note: '欠着一笔债。夜里常坐在门槛上。',
          },
          { type: 'chronicle', text: '父亲欠下了一笔债。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '开春要买种子，家里拿不出钱。' },
          { kind: 'narration', text: '父亲去了一趟镇上，回来时手里有一小串铜钱。' },
          { kind: 'narration', text: '他没说是从哪儿来的。母亲问了一句，他没答。' },
          { kind: 'event', text: '后来你才知道，那是借的。' },
          {
            kind: 'narration',
            text: '那阵子父亲夜里常坐在门槛上，坐到很晚。',
          },
        ],
        choices: [
          {
            id: 'sit',
            label: '陪父亲坐一会儿',
            echo: '你走过去，在他旁边坐下。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'relation', id: 'father', name: '父亲', delta: 8, note: '欠着一笔债。' },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'sat',
          },
          {
            id: 'sleep',
            label: '回屋睡觉',
            echo: '你回屋去了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'slept',
          },
        ],
      },

      sat: {
        id: 'sat',
        blocks: [
          { kind: 'narration', text: '父亲侧头看了你一眼，没有赶你回去。' },
          { kind: 'narration', text: '你们坐了很久，谁也没说话。' },
          { kind: 'dialogue', speaker: '父亲', text: '睡吧。' },
          { kind: 'narration', text: '他说这两个字的时候，声音是哑的。' },
        ],
      },

      slept: {
        id: 'slept',
        blocks: [
          { kind: 'narration', text: '你躺下之后，还能听见门口有动静。' },
          { kind: 'narration', text: '很久很久都没有停。' },
          { kind: 'narration', text: '第二天早上，门槛上有一层露水。', tone: 'faint' },
        ],
      },
    },
  },

  'debt:leave': {
    id: 'debt:leave',
    title: '出门',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          {
            type: 'family',
            id: 'father',
            note: '去外地做工还债。走了快两年了。',
          },
          { type: 'flag', key: 'father-away', value: true },
          /**
           * 他回不回得来，在他走出村口的那一刻就定了。
           *
           * 不能靠年表去掷——链上的事件优先于散事件，一旦排上就必然发生，
           * 那样出门做工的父亲会个个死在外面。而这件事真正的样子是：
           * 大多数人只是走了，几年后回来，人瘦了，债还了一半。
           *
           * 玩家看不到这一掷。他和母亲一样，只能等消息。
           */
          {
            type: 'roll',
            key: 'father-fate',
            among: [
              { value: '归', weight: 62 },
              { value: '亡', weight: 24 },
              { value: '杳', weight: 14 },
            ],
          },
          { type: 'chronicle', text: '父亲为了还债，离开了家乡。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '债还不上。' },
          { kind: 'narration', text: '有人说邻县在修河堤，管饭，工钱也高些。' },
          { kind: 'event', text: '父亲决定去。' },
          { kind: 'narration', text: '走的那天天没亮。他背了一个包袱，母亲送到村口。' },
          { kind: 'dialogue', speaker: '父亲', text: '过年就回来。' },
        ],
        choices: [
          {
            id: 'follow',
            label: '跟到村口',
            echo: '你追了出去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'relation', id: 'father', name: '父亲', delta: 6 },
              { type: 'flag', key: 'saw-father-leave', value: true },
            ],
            next: 'followed',
          },
          {
            id: 'stay',
            label: '在门口站着，没有跟出去',
            echo: '你没有动。',
            effects: [{ type: 'time', days: 1 }],
            next: 'stayed',
          },
        ],
      },

      followed: {
        id: 'followed',
        onEnter: [
          { type: 'time', months: 10 },
          { type: 'household', standing: -4 },
        ],
        blocks: [
          { kind: 'narration', text: '你一直跟到村口那棵老槐树下。' },
          { kind: 'narration', text: '父亲回头看了你一眼，摆摆手，让你回去。' },
          { kind: 'narration', text: '天还是黑的，你只看见一个背影往路那头去了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '那一年他没回来。捎回来过两次钱。' },
        ],
      },

      stayed: {
        id: 'stayed',
        onEnter: [
          { type: 'time', months: 10 },
          { type: 'household', standing: -4 },
        ],
        blocks: [
          { kind: 'narration', text: '你站在门口，看着他和母亲往村口去。' },
          { kind: 'narration', text: '后来母亲一个人回来了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '那一年他没回来。捎回来过两次钱。' },
        ],
      },
    },
  },

  /**
   * 父亲回来了。
   *
   * 这一卷没有任何戏剧性，这正是它存在的理由——
   * 出门做工的人大多数就是这样：几年后回来，人瘦一圈，债还了一半，
   * 然后接着下地。一条因果链不该只有一个惨烈的终点。
   */
  'debt:return': {
    id: 'debt:return',
    title: '回来',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 9 },
          { type: 'household', standing: 6, debt: -8 },
          { type: 'family', id: 'father', note: '从外地做工回来了。腰不太好。' },
          { type: 'flag', key: 'father-home', value: true },
          { type: 'flag', key: 'father-away', value: false },
          { type: 'chronicle', text: '父亲从外地回来了。' },
        ],
        blocks: [
          { kind: 'narration', text: '腊月里的一天下午，院子外面有人叫门。' },
          { kind: 'event', text: '父亲回来了。' },
          { kind: 'narration', text: '他瘦了一圈，脸是黑的，手上多了几道口子。' },
          { kind: 'narration', text: '母亲从灶间跑出来，站在那里没动，也没说话。' },
          { kind: 'narration', text: '他把一个布包放在桌上，解开，里面是钱。' },
          { kind: 'dialogue', speaker: '父亲', text: '还了一半。' },
          { kind: 'narration', text: '那天晚上家里煮了肉。' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '他的腰从此就不太好了。阴天下雨要坐着歇好几回。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 再也没有消息。
   *
   * 比死讯更常见的一种结局：什么也没有传回来。
   * 家里既不能办丧事，也不能指望他回来——这个人就那样悬在那里。
   * 玩家永远不会知道他是死了、还是在别处活着。
   */
  'debt:silence': {
    id: 'debt:silence',
    title: '没有消息',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', years: 1 },
          { type: 'household', standing: -7 },
          { type: 'family', id: 'father', note: '出门做工，此后再无音信。' },
          { type: 'flag', key: 'father-missing', value: true },
          { type: 'chronicle', text: '父亲再也没有消息了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '第三年过年，父亲没有回来。' },
          { kind: 'narration', text: '钱也不捎了。' },
          { kind: 'narration', text: '母亲托人去邻县打听过一次。回话说，工早就散了，人都走光了。' },
          { kind: 'event', text: '没有人知道他去了哪里。' },
          { kind: 'narration', text: '家里没有办丧事。人没了消息，不算死。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '此后很多年，母亲还是习惯在年三十多摆一副碗筷。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'debt:death': {
    id: 'debt:death',
    title: '消息',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 7 },
          { type: 'family', id: 'father', alive: false, note: '死在外地。没有回来。' },
          { type: 'household', standing: -10 },
          { type: 'flag', key: 'father-dead', value: true },
          { type: 'chronicle', text: '父亲死在了外地。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '第二年冬天，村里回来一个人，是跟父亲一起出去做工的。' },
          { kind: 'narration', text: '他先去了里正家，然后才来你家。' },
          { kind: 'event', text: '父亲死在了外地。', tone: 'cinnabar' },
          { kind: 'narration', text: '说是塌方，压住了，抬出来的时候人已经不行了。' },
          { kind: 'narration', text: '尸首没有运回来。太远了。' },
          { kind: 'narration', text: '母亲听完，问了一句：什么时候的事。' },
          { kind: 'dialogue', text: '八月里。' },
          { kind: 'narration', text: '那时候家里还在等他捎钱回来。' },
        ],
        choices: [
          {
            id: 'ask-where',
            label: '问那人，父亲埋在哪里',
            echo: '你追着问了一句。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 3 },
              {
                type: 'knowledge',
                id: 'father-grave',
                title: '父亲埋骨之处',
                summary: '邻县往北，河堤旁边的一片荒地。那人说，没有立碑。',
                category: '地理',
              },
              { type: 'flag', key: 'knows-grave', value: true },
            ],
            next: 'after',
          },
          {
            id: 'silent',
            label: '什么也没问',
            echo: '你站在那里，一句话也没说出来。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 1 },
            ],
            next: 'after',
          },
        ],
      },

      after: {
        id: 'after',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [
          { kind: 'divider', variant: 'ink' },
          { kind: 'narration', text: '那年冬天，家里没有办丧事，只在门上挂了白。' },
          { kind: 'narration', text: '债还欠着。' },
          {
            kind: 'narration',
            text: '母亲一个人下地。她的腰弯得比从前更低了。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'debt:quit': {
    id: 'debt:quit',
    title: '不读了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '开春该交束脩了。' },
          { kind: 'narration', text: '母亲把家里能凑的都凑了一遍，还是差着。' },
          { kind: 'narration', text: '她坐在灶前算了很久，然后叫你过去。' },
          { kind: 'dialogue', speaker: '母亲', text: '今年……先不去了。' },
          { kind: 'narration', text: '她说完就低下头去拨灶里的火。' },
        ],
        choices: [
          {
            id: 'accept',
            label: '说好',
            echo: '你说：好。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'will', delta: 4 },
            ],
            next: 'leave-school',
          },
          {
            id: 'beg',
            label: '说自己还想读',
            echo: '你说：我还想读。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'flag', key: 'wanted-to-stay-in-school', value: true },
            ],
            next: 'begged',
          },
        ],
      },

      begged: {
        id: 'begged',
        blocks: [
          { kind: 'narration', text: '母亲没有抬头。' },
          { kind: 'narration', text: '过了很久她说：我知道。' },
          { kind: 'narration', text: '再往后就没有话了。灶里的火噼啪响。' },
          { kind: 'narration', text: '你自己站起来，出去了。' },
        ],
        next: 'leave-school',
      },

      /**
       * 辍学之后干什么，得看家里是做什么的。
       *
       * 这一节原先直接写死了「跟着母亲下地」——可辍学不是农户的专利，
       * 城里的破落户一样供不起书，而他家没有地。
       * 两支的落点是一样的（不再念书、开始做活、身子结实起来），
       * 但一个是下地，一个是进作坊、站柜台。
       */
      'leave-school': {
        id: 'leave-school',
        onEnter: [
          { type: 'flag', key: 'schooled', value: false },
          { type: 'flag', key: 'left-school', value: true },
          { type: 'flag', key: 'working', value: true },
          {
            type: 'aspect',
            key: 'learning',
            self: '你在私塾念过几年，认得一些字。后来家里供不起，就没再去了。',
          },
        ],
        blocks: [
          { kind: 'divider', variant: 'ink' },
          { kind: 'narration', text: '你没有再去私塾。' },
        ],
        branches: [{ requires: [{ trade: '农户' }], next: 'to-fields' }],
        next: 'to-work',
      },

      'to-fields': {
        id: 'to-fields',
        onEnter: [
          { type: 'time', years: 1 },
          { type: 'identity', identity: '农家子' },
          { type: 'attribute', key: 'body', delta: 8 },
          { type: 'attribute', key: 'will', delta: 4 },
          { type: 'aspect', key: 'body', self: '你下了一年地。手上起了茧，比同龄人壮实些。' },
          { type: 'chronicle', text: '你没有再去私塾。这一年你在地里。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '这一年你跟着母亲下地。挑水、除草、收割，一样一样学会。' },
          { kind: 'narration', text: '手上磨出了茧，破了又长。' },
          { kind: 'event', text: '年底照镜子，你发现自己比去年壮了一圈。' },
          {
            kind: 'narration',
            text: '书本上的字你还记得一些，但已经很久没有拿笔了。',
            tone: 'faint',
          },
        ],
      },

      'to-work': {
        id: 'to-work',
        onEnter: [
          { type: 'time', years: 1 },
          { type: 'identity', identity: '帮工' },
          { type: 'attribute', key: 'body', delta: 6 },
          { type: 'attribute', key: 'will', delta: 5 },
          { type: 'aspect', key: 'body', self: '你做了一年杂活。人瘦，但有力气，也不怕累。' },
          { type: 'chronicle', text: '你没有再去私塾。这一年你在做工。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '这一年你去了街口一家铺子做杂活。' },
          { kind: 'narration', text: '搬货、扫地、跑腿，天不亮开门，上了门板才回家。' },
          { kind: 'narration', text: '掌柜的话不多，只在你搬错东西的时候骂一句。' },
          { kind: 'event', text: '年底结工钱，你数了两遍。' },
          {
            kind: 'narration',
            text: '书本上的字你还记得一些，但已经很久没有拿笔了。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const hardshipEvents: readonly LifeEvent[] = [
  {
    /**
     * 链头。跟散事件一样按权重争，争不上就这辈子没这回事。
     *
     * 限定农户，是因为这一整条链写的都是靠地吃饭的人家的事：
     * 雨水、收成、种子钱、去邻县修河堤。不加这条限制，
     * 任何一个家道中落的人都会掉进农户的剧本里——
     * 一个被削了爵的王爷，家底跌到线下之后，
     * 也会开始「每天傍晚去地里站一会儿」。可他家没有地。
     *
     * 别的出身破落下去该有别的样子。那是另外的链，这里不冒充。
     */
    id: 'debt-drought',
    window: { from: 7, to: 10 },
    requires: [{ trade: '农户' }, { standing: { atMost: 46 } }],
    chain: CHAIN,
    scene: 'debt:drought',
    weight: 6,
  },
  {
    id: 'debt-borrow',
    window: { from: 8, to: 12 },
    requires: [{ flag: { key: 'drought' } }, { standing: { atMost: 40 } }],
    chain: CHAIN,
    scene: 'debt:borrow',
  },
  {
    id: 'debt-leave',
    window: { from: 9, to: 14 },
    requires: [{ flag: { key: 'father-in-debt' } }, { family: { id: 'father', alive: true } }],
    chain: CHAIN,
    scene: 'debt:leave',
  },
  /**
   * 父亲出门之后的三个结局，各凭那一掷的旗标入场，互斥。
   *
   * 权重在这里已经不起作用了——同一时刻只有一条的条件成立，
   * 因为命在他走出村口那天就定了。年表只是把它送到你面前。
   */
  {
    id: 'debt-return',
    window: { from: 10, to: 15 },
    requires: [
      { flag: { key: 'father-fate', equals: '归' } },
      { family: { id: 'father', alive: true } },
    ],
    chain: CHAIN,
    scene: 'debt:return',
  },
  {
    id: 'debt-death',
    window: { from: 10, to: 15 },
    requires: [
      { flag: { key: 'father-fate', equals: '亡' } },
      { family: { id: 'father', alive: true } },
    ],
    chain: CHAIN,
    scene: 'debt:death',
  },
  {
    id: 'debt-silence',
    window: { from: 11, to: 15 },
    requires: [
      { flag: { key: 'father-fate', equals: '杳' } },
      { family: { id: 'father', alive: true } },
    ],
    chain: CHAIN,
    scene: 'debt:silence',
  },
  /**
   * 读不下去了。
   *
   * 这一环不写 chain，也不问父亲的死活——它只问一件事：家里还供不供得起。
   * 挂在「父亲死了」上是把因果说窄了：父亲失踪、连年欠收、家里添了两张嘴，
   * 一样会让一个孩子从私塾里退出来。而父亲要是回来了，这一幕就不该发生。
   *
   * 于是「家道中落」终于不是一个词条，是 standing 连着几年往下掉之后，
   * 你被叫到灶前听母亲说那半句话。
   */
  {
    id: 'debt-quit',
    window: { from: 9, to: 15 },
    requires: [{ flag: { key: 'schooled', equals: true } }, { standing: { atMost: 24 } }],
    scene: 'debt:quit',
    weight: 20,
  },
]
