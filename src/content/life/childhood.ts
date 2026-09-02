import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 幼年（三岁到六岁）。
 *
 * 这几年一个孩子决定不了任何事，所以选项少、时间跨度大。
 * 它不是白写的——你在门口蹲着看什么、跟着谁走，
 * 决定的是七岁那年你对世界已经知道多少。
 */
export const childhoodScenes: SceneLibrary = {
  'child:memory': {
    id: 'child:memory',
    title: '记事',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [{ kind: 'narration', text: '你能记住的第一件事，是一个很平常的下午。' }],
        branches: [
          { requires: [{ trade: '农户' }], next: 'farm' },
          { requires: [{ trade: '猎户' }], next: 'hunt' },
          { requires: [{ trade: '商户' }], next: 'shop' },
          { requires: [{ trade: '客栈' }], next: 'inn' },
          { requires: [{ trade: '酒楼' }], next: 'tavern' },
          { requires: [{ trade: '药铺' }], next: 'herbs' },
          { requires: [{ trade: '镖局' }], next: 'escort' },
          { requires: [{ trade: '官宦' }], next: 'yamen' },
          { requires: [{ trade: '王府' }], next: 'palace' },
          { requires: [{ trade: '皇室' }], next: 'court' },
        ],
        next: 'craft',
      },

      farm: {
        id: 'farm',
        blocks: [
          { kind: 'narration', text: '母亲把你放在田埂上，让你别乱跑。' },
          { kind: 'narration', text: '她弯着腰在前面走，走得很慢，一直没有直起来过。' },
          { kind: 'narration', text: '天很大，田也很大。你坐了一下午。' },
        ],
        next: 'close',
      },

      shop: {
        id: 'shop',
        blocks: [
          { kind: 'narration', text: '你趴在柜台后面，看父亲跟人说话。' },
          { kind: 'narration', text: '那人穿的衣裳跟街上的人不一样，说话也不一样。' },
          { kind: 'narration', text: '他走后你问父亲那是哪里人。父亲说，很远。' },
        ],
        onEnter: [
          {
            type: 'knowledge',
            id: 'far-places',
            title: '很远的地方',
            summary: '铺子里来往的人，有些是从你没听过的地方来的。',
            category: '地理',
          },
        ],
        next: 'close',
      },

      hunt: {
        id: 'hunt',
        blocks: [
          { kind: 'narration', text: '父亲从山里回来，往地上放了一只野兔。' },
          { kind: 'narration', text: '兔子还是热的。你伸手摸了一下，母亲把你的手打开了。' },
          { kind: 'narration', text: '那天晚上家里有肉。你记住了那个味道。' },
        ],
        next: 'close',
      },

      craft: {
        id: 'craft',
        blocks: [
          { kind: 'narration', text: '你坐在满地木屑里，看父亲刨一块板子。' },
          { kind: 'narration', text: '刨花卷起来，一条一条落下去。' },
          { kind: 'narration', text: '你捡起一条闻了闻。松木的味道很冲。' },
        ],
        next: 'close',
      },

      inn: {
        id: 'inn',
        onEnter: [
          {
            type: 'knowledge',
            id: 'far-places',
            title: '很远的地方',
            summary: '住店的人从各处来。他们说的地名，有些你连听都没听过。',
            category: '地理',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你趴在楼梯口，看底下那些歇脚的人。' },
          { kind: 'narration', text: '有人说话你听不懂，有人身上一股说不清的味道。' },
          { kind: 'narration', text: '一个赶车的看见你，笑着丢过来半块饼。' },
          { kind: 'narration', text: '第二天他们就都走了。第三天又换了一批人。' },
        ],
        next: 'close',
      },

      tavern: {
        id: 'tavern',
        onEnter: [
          {
            type: 'knowledge',
            id: 'town-gossip',
            title: '城里的闲话',
            summary: '喝多了的人什么都说。谁家发了财，谁家出了事，衙门里谁又倒了。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你蹲在楼梯拐角，底下有人在划拳。' },
          { kind: 'narration', text: '一个客人喝多了，拍着桌子说个不停，说的都是别人家的事。' },
          { kind: 'narration', text: '母亲上去劝了两句，那人就不说了。' },
          { kind: 'narration', text: '你那时候还不懂，只觉得大人说话真好听。' },
        ],
        next: 'close',
      },

      herbs: {
        id: 'herbs',
        onEnter: [
          // 这一条见闻此刻毫无用处。它要到很多年以后才显出分量——
          // 修行界的灵草也是草，而这世上认得草的人不多
          {
            type: 'knowledge',
            id: 'herb-lore',
            title: '认药',
            summary: '草木各有各的样子和气味。母亲说，认错一味就要出人命。',
            category: '器物',
          },
          { type: 'attribute', key: 'insight', delta: 2 },
        ],
        blocks: [
          { kind: 'narration', text: '后院晒着药。一格一格摊开，晒了满地。' },
          { kind: 'narration', text: '母亲蹲在旁边翻药，你也蹲着看。' },
          { kind: 'narration', text: '她随手拈起一片给你闻。你说：苦的。' },
          { kind: 'dialogue', speaker: '母亲', text: '这个叫黄芩。记住了。' },
          { kind: 'narration', text: '你记住了。那是你认得的第一味药。' },
        ],
        next: 'close',
      },

      escort: {
        id: 'escort',
        onEnter: [
          { type: 'attribute', key: 'will', delta: 2 },
          {
            type: 'knowledge',
            id: 'places-not-to-go',
            title: '不能走的路',
            summary: '走镖的人说，有几个地方是不走的。问为什么，没人答。',
            category: '地理',
          },
        ],
        blocks: [
          { kind: 'narration', text: '父亲那趟镖回来得很晚。' },
          { kind: 'narration', text: '他坐在院里脱衣裳，背上一道口子，母亲正在给他上药。' },
          { kind: 'narration', text: '你站在门槛上看。他回头看见你，把衣裳拉了上去。' },
          { kind: 'dialogue', speaker: '父亲', text: '没事。进去。' },
          { kind: 'narration', text: '那天夜里你听见他跟母亲说，往后那条道不走了。' },
          { kind: 'narration', text: '母亲问为什么。他没有答。' },
        ],
        next: 'close',
      },

      yamen: {
        id: 'yamen',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 2 },
          {
            type: 'knowledge',
            id: 'the-ladder',
            title: '上头还有上头',
            summary: '父亲在衙门里是个官。可是见了别人，他也要弯腰。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '那天家里来了客人，父亲让你出去见礼。' },
          { kind: 'narration', text: '你记不清那人长什么样，只记得父亲的背。' },
          { kind: 'event', text: '父亲弯着腰，一直没有直起来。' },
          { kind: 'narration', text: '你从来没见过他那样。' },
          { kind: 'narration', text: '客人走后，父亲回书房去了，一晚上没出来。' },
        ],
        next: 'close',
      },

      palace: {
        id: 'palace',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 2 },
          {
            type: 'knowledge',
            id: 'the-wall',
            title: '墙外面',
            summary: '王府的墙很高。墙外面有别的孩子，你只听得见，看不见。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你记得住的第一件事，是墙。' },
          { kind: 'narration', text: '院墙很高，晒不到太阳的那一面长着青苔。' },
          { kind: 'narration', text: '墙外头有孩子在跑，在叫，还有人在骂人。' },
          { kind: 'narration', text: '你搬了个凳子想爬上去看看。' },
          { kind: 'narration', text: '嬷嬷把你抱了下来，抱得很紧，一句话也没说。' },
        ],
        next: 'close',
      },

      court: {
        id: 'court',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 3 },
          {
            type: 'knowledge',
            id: 'the-ladder',
            title: '上头还有上头',
            summary: '所有人见了你都要跪。可是你见了父亲，也要跪。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你记得住的第一件事，是所有人都跪着。' },
          { kind: 'narration', text: '你走到哪里，前面的人就矮下去一截。' },
          { kind: 'narration', text: '那时候你以为人本来就是这样走路的。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '后来母妃带你去给父亲问安。' },
          { kind: 'event', text: '你看见母妃跪下了。' },
          { kind: 'narration', text: '她按着你的肩，你也跪了下去。' },
          { kind: 'narration', text: '那是你第一次知道，上头还有上头。' },
        ],
        next: 'close',
      },

      close: {
        id: 'close',
        onEnter: [{ type: 'time', months: 4 }],
        blocks: [{ kind: 'narration', text: '这件事之后，你开始记得住日子了。', tone: 'faint' }],
      },
    },
  },

  'child:sick': {
    id: 'child:sick',
    title: '一场病',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 18 },
          { type: 'household', standing: -3 },
        ],
        blocks: [
          { kind: 'event', text: '你病了。' },
          { kind: 'narration', text: '起先只是咳，后来烧起来，烧了七八天。' },
          { kind: 'narration', text: '母亲抱着你坐了几个通宵。家里请了一趟郎中，抓了三副药。' },
          { kind: 'narration', text: '等你能下地走路，半个多月已经过去了。' },
          {
            kind: 'narration',
            text: '这半个月里外面发生了什么，你一概不知道。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'child:sibling': {
    id: 'child:sibling',
    title: '添丁',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -6 },
          {
            type: 'family',
            id: 'sibling',
            alive: true,
            note: '比你小几岁。整日跟在你后面。',
          },
          { type: 'flag', key: 'has-sibling', value: true },
          { type: 'chronicle', text: '家里添了一个孩子。' },
        ],
        blocks: [
          { kind: 'event', text: '家里添了个孩子。' },
          { kind: 'narration', text: '你多了一个弟妹，也多了一个要看着的人。' },
          { kind: 'narration', text: '母亲说，往后你是当哥哥（姐姐）的了。' },
          { kind: 'narration', text: '饭还是那么多，吃饭的人多了一个。' },
        ],
      },
    },
  },

  'child:hungry': {
    id: 'child:hungry',
    title: '灶',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'narration', text: '那年秋后，家里的米缸见了底。' },
          { kind: 'narration', text: '母亲把粥熬得很稀。她自己那碗更稀。' },
          { kind: 'narration', text: '你还小，不懂这些，只知道饿得快。' },
        ],
        choices: [
          {
            id: 'ask',
            label: '问母亲为什么粥这么稀',
            echo: '你问了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'flag', key: 'asked-about-poverty', value: true },
            ],
            next: 'asked',
          },
          {
            id: 'quiet',
            label: '把碗喝干，不说话',
            echo: '你把碗底舔干净了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'quiet',
          },
        ],
      },

      asked: {
        id: 'asked',
        blocks: [
          { kind: 'narration', text: '母亲愣了一下。' },
          { kind: 'dialogue', speaker: '母亲', text: '今年收成不好。' },
          { kind: 'narration', text: '她说完就去洗锅了，背对着你。' },
          { kind: 'narration', text: '你第一次知道，家里的日子是会好会坏的。' },
        ],
        onEnter: [
          {
            type: 'knowledge',
            id: 'lean-year',
            title: '年景',
            summary: '收成好的年头和收成坏的年头，家里过的日子是不一样的。',
            category: '世事',
          },
        ],
        next: 'close',
      },

      quiet: {
        id: 'quiet',
        blocks: [
          { kind: 'narration', text: '你什么也没问。' },
          { kind: 'narration', text: '母亲看了你一眼，把自己碗里的稠底拨了一半给你。' },
          { kind: 'narration', text: '你也没说谢谢。' },
        ],
        next: 'close',
      },

      close: {
        id: 'close',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [{ kind: 'narration', text: '那个冬天很长。', tone: 'faint' }],
      },
    },
  },

  /**
   * 好年景。
   *
   * 没有这一卷，家境就是一条只跌不涨的斜线——
   * 幼年那几年光是生病、添丁、欠收就能把一户农家从三十几压到二十以下，
   * 于是七岁那年人人都读不起书，「读书」这条路在出生时就已经关死了。
   *
   * 而真实的农家不是这样：收成有好有坏，攒两年就能添件东西。
   * 家道中落之所以是「中落」，前提是它先立得住。
   */
  'child:harvest': {
    id: 'child:harvest',
    title: '好年景',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 7 },
          { type: 'household', standing: 9 },
        ],
        blocks: [
          { kind: 'narration', text: '这一年雨水匀，虫也少。' },
          { kind: 'event', text: '秋后收成比往年好。' },
          { kind: 'narration', text: '交完租还有余，父亲挑了两担去镇上卖，换回来一口新锅。' },
          { kind: 'narration', text: '母亲给你和自己各扯了一块布。' },
          { kind: 'narration', text: '那年过年，桌上有肉。', tone: 'faint' },
        ],
      },
    },
  },
}

export const childhoodEvents: readonly LifeEvent[] = [
  {
    id: 'child-memory',
    window: { from: 3, to: 4 },
    scene: 'child:memory',
    weight: 10,
  },
  {
    id: 'child-sick',
    window: { from: 3, to: 6 },
    scene: 'child:sick',
    weight: 3,
  },
  {
    id: 'child-sibling',
    window: { from: 4, to: 6 },
    scene: 'child:sibling',
    weight: 4,
  },
  {
    // 家底薄的人家才会出这一幕。生在布庄的孩子不会记得饿
    id: 'child-hungry',
    window: { from: 4, to: 6 },
    requires: [{ standing: { atMost: 40 } }],
    scene: 'child:hungry',
    weight: 5,
  },
  /**
   * 好年景要能反复来，所以拆成三件事，各占一年。
   *
   * 只放一件的话，幼年整体仍是净下跌——年表一次只挑一件事，
   * 而扣家底的事有三件。收支两边的次数得对得上，
   * 「家道中落」才是一段可以发生也可以不发生的下坡，不是出厂设定。
   */
  {
    id: 'child-harvest-a',
    window: { from: 3, to: 4 },
    requires: [{ standing: { atMost: 62 } }],
    scene: 'child:harvest',
    weight: 7,
  },
  {
    id: 'child-harvest-b',
    window: { from: 4, to: 5 },
    requires: [{ standing: { atMost: 62 } }],
    scene: 'child:harvest',
    weight: 7,
  },
  {
    id: 'child-harvest-c',
    window: { from: 5, to: 6 },
    requires: [{ standing: { atMost: 62 } }],
    scene: 'child:harvest',
    weight: 7,
  },
]
