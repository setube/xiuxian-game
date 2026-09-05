import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 行当。
 *
 * 每一种出身都该有一条只属于它的路。否则「生在药铺」和「生在镖局」
 * 就只是几个数字不同，那不叫出身，那叫属性面板。
 *
 * 所以这一份文件里的五卷各自回答同一个问题——
 * **这一家的孩子，是怎么第一次撞见修行界的边的？**
 *
 * - 客栈：一个半夜投宿、天亮就走的客人。
 * - 酒楼：一个喝多了说自己见过神仙、被满座哄笑的人。
 * - 药铺：一味谁也认不出的药材。
 * - 镖局：一条镖队再也不走的道。
 * - 官宦：一桩不许记档的案子。
 *
 * 五条路通向的不是同一个答案。有的让你知道「这世上有修士」，
 * 有的只让你知道「有些事不对劲」——而后者其实更常见。
 *
 * ## 这里说的「行当」是哪一格
 *
 * 前四卷问的是**产**（`business`）——有没有那一处铺面。
 * 撞见半夜投宿的客人，前提是家里有个客栈可投；
 * 认不出的那味药材，得先有个药柜摆在那儿。
 * 只有末一卷问的是**家世**（`station`）：不许记档的案子进不了民宅，
 * 它要的不是一间铺子，是这家人够得着那份卷宗。
 */
export const tradeScenes: SceneLibrary = {
  'trade:guest': {
    id: 'trade:guest',
    title: '半夜的客人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '那天夜里下大雨，店里早就上了门板。' },
          { kind: 'narration', text: '三更时分有人叫门。' },
          { kind: 'narration', text: '父亲披衣下去开了门。你从楼上探头看。' },
          { kind: 'narration', text: '进来的人一身黑衣，从头到脚都是干的。' },
          { kind: 'event', text: '外面雨那么大，他身上一点没湿。' },
        ],
        choices: [
          {
            id: 'serve',
            label: '下楼去送壶热水',
            hint: '能近着看一眼',
            echo: '你提了壶热水下楼。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: 'close-look',
          },
          {
            id: 'peek',
            label: '在楼梯上看着，不下去',
            echo: '你趴在楼梯上，一直看着。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
            ],
            next: 'from-afar',
          },
          {
            id: 'sleep',
            label: '回屋睡觉',
            echo: '你缩回被窝里去了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'missed',
          },
        ],
      },

      'close-look': {
        id: 'close-look',
        onEnter: [
          { type: 'time', days: 1 },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '这世上有一种人，不是官，不是江湖人。下雨天他们身上不湿，走了以后房里没有住过人的样子。',
            category: '修行',
          },
          { type: 'flag', key: 'heard-of-cultivators', value: true },
          { type: 'attribute', key: 'fortune', delta: 3 },
          { type: 'chronicle', text: '店里住过一个下雨不湿的客人。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '你把水放在桌上。他说了声谢。' },
          { kind: 'narration', text: '声音很平常。可你离得近，看见他的鞋。' },
          { kind: 'event', text: '鞋底是干净的。外头一路都是泥。', tone: 'cinnabar' },
          { kind: 'narration', text: '他抬眼看了你一下，你就退出去了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '第二天天没亮他就走了，房钱压在桌上。' },
          { kind: 'narration', text: '母亲进去收拾，出来的时候脸色不太对。' },
          { kind: 'dialogue', speaker: '{dam}', text: '被褥是平的。' },
          { kind: 'narration', text: '像是没有人在那张床上躺过。' },
          { kind: 'narration', text: '{elder}说，往后这种客人来了，收钱，别多问。' },
          {
            kind: 'narration',
            text: '你问{elder}那是什么人。他想了半天，说了两个字：修士。',
            tone: 'deep',
          },
        ],
      },

      'from-afar': {
        id: 'from-afar',
        onEnter: [
          { type: 'time', days: 1 },
          // 只知其名不知其详：你看见了不对劲，但没人告诉你那是什么
          {
            type: 'knowledge',
            id: 'the-dry-guest',
            title: '不湿的客人',
            summary: '雨那么大，那个人身上是干的。你不知道为什么。',
            category: '人物',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你在楼梯上趴了很久。' },
          { kind: 'narration', text: '那人上楼时从你身边过去，你闻到一股很冷的味道。' },
          { kind: 'narration', text: '不是雨的味道。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '第二天他就走了。{dam}收拾房间时说，被褥是平的。' },
          { kind: 'narration', text: '你问那是什么人。{elder}说：不该问的别问。' },
          { kind: 'narration', text: '这件事你记了很多年，一直没有答案。', tone: 'faint' },
        ],
      },

      missed: {
        id: 'missed',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '第二天你下楼时，那个人已经走了。' },
          { kind: 'narration', text: '{dam}正在收拾那间房，嘴里念叨着什么。' },
          { kind: 'narration', text: '你没听清，也没有问。', tone: 'faint' },
        ],
      },
    },
  },

  'trade:drunk': {
    id: 'trade:drunk',
    title: '醉话',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '楼下有个客人喝到日头偏西还不走。' },
          { kind: 'narration', text: '他是个跑山的，一个人占了张桌子，说话越来越大声。' },
          { kind: 'dialogue', text: '……我亲眼看见的！那人从山上下来，脚不沾地！' },
          { kind: 'narration', text: '满堂都笑了。有人给他斟酒，让他再讲一遍。' },
        ],
        choices: [
          {
            id: 'listen',
            label: '站在旁边听他说完',
            echo: '你端着抹布，在旁边站住了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
              {
                type: 'knowledge',
                id: 'immortal-tale',
                title: '跑山人说的那件事',
                summary: '他说亲眼见过一个人从山上下来，脚不沾地。满座的人都笑他。他说他没喝多。',
                category: '修行',
              },
              { type: 'flag', key: 'heard-immortal-tale', value: true },
            ],
            next: 'heard',
          },
          {
            id: 'refill',
            label: '给他把酒满上，等他往下说',
            hint: '那壶酒记在自家账上',
            echo: '你给他把酒满上了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -2 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'fortune', delta: 2 },
              {
                type: 'knowledge',
                id: 'immortal-tale',
                title: '跑山人说的那件事',
                summary:
                  '他说亲眼见过一个人从山上下来，脚不沾地，往北边去了。他说那人回头看过他一眼，他病了半个月。',
                category: '修行',
              },
              { type: 'flag', key: 'heard-immortal-tale', value: true },
              { type: 'flag', key: 'poured-for-drunk', value: true },
            ],
            next: 'more',
          },
          {
            id: 'work',
            label: '收自己的桌子去',
            echo: '你去收桌子了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'ignored',
          },
        ],
      },

      heard: {
        id: 'heard',
        blocks: [
          { kind: 'narration', text: '他讲了半晌，越讲越乱，最后趴在桌上睡着了。' },
          { kind: 'narration', text: '第二天他酒醒，付了钱就走。' },
          { kind: 'narration', text: '有人问他昨天说的是真是假。他愣了一下。' },
          { kind: 'dialogue', text: '我说什么了？我喝多了。' },
          { kind: 'narration', text: '他走得很快。', tone: 'faint' },
        ],
      },

      more: {
        id: 'more',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '酒下去，他反而清醒了些，声音也低了。' },
          { kind: 'dialogue', text: '那人回头看了我一眼。就一眼。' },
          { kind: 'dialogue', text: '我回去就病了，躺了半个月。' },
          { kind: 'narration', text: '他说这话的时候手在抖。' },
          { kind: 'narration', text: '旁边的人还在笑。他没有再说下去，把酒喝完就走了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '此后你再没见过他。' },
          {
            kind: 'narration',
            text: '你问过父亲山里有没有这样的人。{elder}说别听酒话。',
            tone: 'faint',
          },
        ],
      },

      ignored: {
        id: 'ignored',
        blocks: [
          { kind: 'narration', text: '你收完三张桌子，那边的笑声也停了。' },
          { kind: 'narration', text: '那个人趴在桌上睡着了。' },
          { kind: 'narration', text: '第二天他付了钱就走。此后没有再来过。', tone: 'faint' },
        ],
      },
    },
  },

  'trade:herb': {
    id: 'trade:herb',
    title: '认不出的药',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '有个采药人挑着担子来卖货。' },
          { kind: 'narration', text: '父亲一样一样验，验到最底下停住了。' },
          { kind: 'narration', text: '那是一小截根，不长，断口是白的，隔了这么久还没干。' },
          { kind: 'dialogue', speaker: '{elder}', text: '这个哪来的？' },
          { kind: 'dialogue', text: '北边山里。石头缝里长的。' },
          { kind: 'narration', text: '{elder}翻了三本药书，一本也没有。' },
        ],
        choices: [
          {
            id: 'buy',
            label: '劝父亲买下来',
            hint: '要花不少钱',
            echo: '你说：留着吧。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -4 },
              { type: 'attribute', key: 'insight', delta: 4 },
              {
                type: 'item',
                id: 'odd-root',
                name: '认不出的根',
                count: 1,
                unit: '截',
                note: '采药人从北边山里石缝里挖的。断口一直是白的，不干，也不烂。',
              },
              {
                type: 'knowledge',
                id: 'the-odd-root',
                title: '那截根',
                summary: null,
                category: '器物',
              },
              { type: 'flag', key: 'has-odd-root', value: true },
              { type: 'chronicle', text: '家里收下了一截谁也认不出的药材。', tone: 'deep' },
            ],
            next: 'kept',
          },
          {
            id: 'record',
            label: '把它画下来，记在册子上',
            echo: '你要来纸笔，把它画了下来。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'insight', delta: 6 },
              {
                type: 'knowledge',
                id: 'the-odd-root',
                title: '那截根',
                summary:
                  '北边山里石缝里长的。断口是白的，放了半个月不干也不烂。三本药书上都没有。你画下来了。',
                category: '器物',
              },
              { type: 'flag', key: 'drew-the-root', value: true },
            ],
            next: 'drawn',
          },
          {
            id: 'pass',
            label: '认不出的东西不收',
            echo: '{elder}摇了摇头，把那截根退了回去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'passed',
          },
        ],
      },

      kept: {
        id: 'kept',
        onEnter: [{ type: 'time', months: 6 }],
        blocks: [
          { kind: 'narration', text: '父亲用油纸包了三层，收进了柜子最上一格。' },
          { kind: 'dialogue', speaker: '{elder}', text: '认不出的东西，不能用在人身上。' },
          { kind: 'narration', text: '过了半年，{dam}拿出来看过一次。' },
          { kind: 'event', text: '断口还是白的。' },
          { kind: 'narration', text: '她把它包回去，什么也没说。', tone: 'faint' },
        ],
      },

      drawn: {
        id: 'drawn',
        onEnter: [{ type: 'time', months: 3 }],
        blocks: [
          { kind: 'narration', text: '你画得不算好，但样子是对的。' },
          { kind: 'narration', text: '{elder}看了一眼，把那张纸夹进了药书里。' },
          { kind: 'dialogue', speaker: '{elder}', text: '往后要是再有人拿来，就认得了。' },
          { kind: 'narration', text: '那截根他还是退了回去。采药人挑着担子走了。' },
          { kind: 'narration', text: '此后再没有人拿这个东西来过。', tone: 'faint' },
        ],
      },

      passed: {
        id: 'passed',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '采药人没说什么，把那截根扔回了担子里。' },
          { kind: 'narration', text: '你看着他挑着担子出了门。' },
          { kind: 'narration', text: '后来听说他去了别处，再也没回{prefecture}。', tone: 'faint' },
        ],
      },
    },
  },

  'trade:road': {
    id: 'trade:road',
    title: '不走的道',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'household', standing: -5 },
        ],
        blocks: [
          { kind: 'narration', text: '那一趟镖走了两个月才回来，回来的人比去的时候少了两个。' },
          { kind: 'narration', text: '货没丢。人丢了。' },
          { kind: 'narration', text: '镖局赔了钱，也办了两场丧事。' },
          { kind: 'narration', text: '此后总镖头在墙上那张舆图上，用朱笔圈掉了一条道。' },
        ],
        choices: [
          {
            id: 'ask',
            label: '问{elder}那两个人是怎么没的',
            critical: true,
            echo: '你还是问了。',
            effects: [
              { type: 'time', days: 3 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'attribute', key: 'insight', delta: 3 },
            ],
            next: 'told',
          },
          {
            id: 'map',
            label: '去看那张舆图，记住被圈掉的地方',
            echo: '你趁没人，把那张舆图看了很久。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'insight', delta: 5 },
              {
                type: 'knowledge',
                id: 'places-not-to-go',
                title: '不能走的路',
                summary:
                  '总镖头在舆图上用朱笔圈掉了几处。最新的一处在北边山里。圈了的道，镖队再也不走。',
                category: '地理',
              },
              { type: 'flag', key: 'knows-the-marked-roads', value: true },
            ],
            next: 'mapped',
          },
          {
            id: 'quiet',
            label: '什么也不问',
            echo: '你没有问。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'unasked',
          },
        ],
      },

      told: {
        id: 'told',
        onEnter: [
          { type: 'time', days: 2 },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '这世上有一种人，不是官，不是江湖人。{elder}说，遇上了别动手，也别跑，站着让他过去。',
            category: '修行',
          },
          { type: 'flag', key: 'heard-of-cultivators', value: true },
          { type: 'relation', id: 'father', name: '父亲', delta: 10 },
          {
            type: 'chronicle',
            text: '父亲告诉你，镖队在山里遇上了不该遇上的人。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '{elder}沉了很久，把院门关上了。' },
          { kind: 'dialogue', speaker: '{elder}', text: '不是马贼。' },
          { kind: 'narration', text: '他说那天雾大，路上站着一个人，谁也没看清是从哪儿冒出来的。' },
          { kind: 'dialogue', speaker: '{elder}', text: '老赵拔了刀。' },
          { kind: 'narration', text: '后面的话他说得很慢。' },
          { kind: 'dialogue', speaker: '{elder}', text: '刀断了。人也断了。' },
          { kind: 'event', text: '「那不是江湖人。那是修士。」', tone: 'cinnabar' },
          { kind: 'narration', text: '你问什么是修士。' },
          { kind: 'dialogue', speaker: '{elder}', text: '不知道。反正惹不起。' },
          {
            kind: 'narration',
            text: '他又交代了一句：往后要是碰上，别动手，也别跑。站着让他过去。',
          },
        ],
      },

      mapped: {
        id: 'mapped',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '舆图上圈了朱笔的地方一共四处。' },
          { kind: 'narration', text: '三处已经很旧了，墨都发暗。最新的那一处在北岭深处。' },
          { kind: 'narration', text: '旁边没有注字。什么也没写。' },
          { kind: 'narration', text: '你看的时候总镖头进来了。他看了你一眼，没赶你。' },
          { kind: 'dialogue', text: '记住就行。别问。' },
        ],
      },

      unasked: {
        id: 'unasked',
        blocks: [
          { kind: 'narration', text: '那几天家里没有人说话。' },
          { kind: 'narration', text: '父亲的刀挂回了架子上，很久没有再取下来。' },
          {
            kind: 'narration',
            text: '你什么也没问。有些事，家里人不说就是不能问。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'trade:archive': {
    id: 'trade:archive',
    title: '不记档的案子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 3 }],
        blocks: [
          { kind: 'narration', text: '那阵子父亲天天很晚才回来。' },
          { kind: 'narration', text: '有一夜你起来喝水，看见书房还亮着灯。' },
          { kind: 'narration', text: '门没关严。他在烧东西。' },
          { kind: 'event', text: '烧的是卷宗。' },
        ],
        choices: [
          {
            id: 'ask',
            label: '推门进去问他',
            critical: true,
            echo: '你推开了门。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'will', delta: 4 },
            ],
            next: 'confronted',
          },
          {
            id: 'read',
            label: '等他睡下，去翻没烧完的',
            critical: true,
            hint: '被发现要挨罚',
            echo: '你等到后半夜才进的书房。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'fortune', delta: -2 },
            ],
            next: 'scavenged',
          },
          {
            id: 'back',
            label: '退回去，当没看见',
            echo: '你退了回去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'unseen',
          },
        ],
      },

      confronted: {
        id: 'confronted',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'relation', id: 'father', name: '父亲', delta: -6 },
          {
            type: 'knowledge',
            id: 'unrecorded-cases',
            title: '不记档的案子',
            summary: '衙门里有些案子是不入档的。{elder}说，上头交代下来的，问了对谁都不好。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '父亲抬起头，手里还捏着半页纸。' },
          { kind: 'narration', text: '他把纸丢进火盆，才开口。' },
          { kind: 'dialogue', speaker: '{elder}', text: '回去睡。' },
          { kind: 'narration', text: '你站着没动。' },
          { kind: 'narration', text: '他又看了你一眼，这一次看得久了些。' },
          { kind: 'dialogue', speaker: '{elder}', text: '有些案子是不入档的。上头交代下来的。' },
          { kind: 'dialogue', speaker: '{elder}', text: '你问了，对谁都不好。' },
          { kind: 'narration', text: '那晚之后，书房上了锁。', tone: 'faint' },
        ],
      },

      scavenged: {
        id: 'scavenged',
        onEnter: [
          { type: 'time', days: 1 },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '半页没烧完的卷宗上写着：全村三十七口，一夜之间没了，尸首无伤。落款处批了两个字——不入档。',
            category: '修行',
          },
          { type: 'flag', key: 'heard-of-cultivators', value: true },
          { type: 'flag', key: 'read-the-burnt-page', value: true },
          {
            type: 'chronicle',
            text: '你在父亲烧剩的卷宗上，读到了一件不许记档的事。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '火盆里剩了些没烧透的。你捡出最大的一片。' },
          { kind: 'narration', text: '字被烧掉了一半，读得断断续续。' },
          { kind: 'dialogue', text: '……村三十七口，一夜之间……' },
          { kind: 'dialogue', text: '……验之，尸首无伤……' },
          { kind: 'narration', text: '再往下烧没了。只有落款处还留着朱批的两个字。' },
          { kind: 'event', text: '不入档。', tone: 'cinnabar' },
          { kind: 'narration', text: '你把那片纸放了回去，回屋躺了半宿没睡着。' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '第二天早饭桌上一切如常。父亲照旧出门，母亲照旧盛粥。',
            tone: 'faint',
          },
          { kind: 'narration', text: '这件事你谁也没说过。', tone: 'faint' },
        ],
      },

      unseen: {
        id: 'unseen',
        blocks: [
          { kind: 'narration', text: '你回屋躺下，听见书房那边响了很久。' },
          { kind: 'narration', text: '第二天早上，院里的火盆是空的，洗得很干净。' },
          { kind: 'narration', text: '父亲照常出门。什么也没有发生过。', tone: 'faint' },
        ],
      },
    },
  },
}

/**
 * 行当事件。
 *
 * 权重都给得不低——一个人生在药铺，这辈子撞上一味认不出的药材
 * 本来就不算稀奇。真正的筛子在卷内：你是站着看，还是走上前去问。
 */
export const tradeEvents: readonly LifeEvent[] = [
  {
    id: 'trade-guest',
    window: { from: 8, to: 16 },
    requires: [{ business: '客栈' }],
    scene: 'trade:guest',
    weight: 10,
  },
  {
    id: 'trade-drunk',
    window: { from: 9, to: 16 },
    requires: [{ business: '酒楼' }],
    scene: 'trade:drunk',
    weight: 10,
  },
  {
    id: 'trade-herb',
    window: { from: 9, to: 16 },
    requires: [{ business: '药铺' }],
    scene: 'trade:herb',
    weight: 10,
  },
  {
    // 镖局丢人这件事不是年年有。它得等到孩子大到能听懂那句话
    id: 'trade-road',
    window: { from: 10, to: 16 },
    requires: [{ business: '镖局' }],
    scene: 'trade:road',
    weight: 9,
  },
  {
    id: 'trade-archive',
    window: { from: 11, to: 16 },
    requires: [{ station: '仕宦' }],
    scene: 'trade:archive',
    weight: 9,
  },
]
