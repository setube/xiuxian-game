import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 机缘。
 *
 * 这一份文件只做一件事：不让「机缘」变成幸运抽奖。
 *
 * 三条守则：
 *
 * 1. **真相在你看见之前就定了。** 山道上躺着的那个人是猎户、是修士、还是邪修，
 *    由 roll 在进场那一刻掷出来，写进旗标。玩家的选择改变的是自己撞上什么，
 *    不是把他变成对自己有利的那一种。
 * 2. **机会摆在面前，看不看得见是另一回事。** 走神的人从这段山道上走过去，
 *    正文里根本不会提有人躺着。他这一生都不会知道那天错过了什么。
 * 3. **抓住了也未必懂。** 你可以捡到一本书、听到一句话、收下一样东西，
 *    然后很多年都不知道那是什么。真正的转折不在拿到的那一刻，
 *    在多年以后有人随口点破的那一刻。
 */
export const encounterScenes: SceneLibrary = {
  'omen:wounded': {
    id: 'omen:wounded',
    title: '山道',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          // 他是谁，在你抬头之前就已经定了。玩家永远看不到这一掷
          {
            type: 'roll',
            key: 'wounded-man',
            among: [
              { value: '猎户', weight: 24 },
              { value: '武人', weight: 18 },
              { value: '死人', weight: 12 },
              { value: '修士', weight: 24 },
              { value: '弟子', weight: 12 },
              { value: '邪修', weight: 10 },
            ],
          },
        ],
        blocks: [
          { kind: 'narration', text: '那天你走山道去邻村。' },
          {
            kind: 'narration',
            text: '路很长，走了大半日。日头偏西的时候，你在下坡那一段歇了歇脚。',
          },
        ],
        branches: [
          // 看得见与看不见，是这一卷唯一的分水岭。
          // 两种人都能留意到路边：心思细的，和常年在山里走的。
          // 看不见的那条路上，正文里根本不会提有人躺着——
          // 那个人这一生都不知道自己错过了什么
          { requires: [{ attribute: { key: 'insight', atLeast: 34 } }], next: 'notice' },
          { requires: [{ attribute: { key: 'body', atLeast: 52 } }], next: 'notice' },
        ],
        next: 'miss',
      },

      miss: {
        id: 'miss',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '歇够了，你接着赶路。' },
          { kind: 'narration', text: '天黑前到了邻村，事情办完，第二天就回去了。' },
          { kind: 'narration', text: '这一趟没有什么可说的。', tone: 'faint' },
        ],
      },

      notice: {
        id: 'notice',
        blocks: [
          { kind: 'event', text: '路旁的草丛里有个人。' },
          { kind: 'narration', text: '他侧躺着，身上有血。看不清脸，也看不出是死是活。' },
          { kind: 'narration', text: '四下无人。风把草吹得哗哗响。' },
        ],
        choices: [
          {
            id: 'approach',
            label: '走过去看看',
            critical: true,
            hint: '不知道他是什么人',
            echo: '你拨开草丛，走了过去。',
            effects: [{ type: 'time', days: 1 }],
            // 这一步只有一个选项能选，但结果早已掷定，从这里分头走
            next: 'sorted',
          },
          {
            id: 'watch',
            label: '远远看一会儿，不过去',
            echo: '你站在路上，看了很久。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'flag', key: 'saw-wounded-man', value: true },
            ],
            next: 'watched',
          },
          {
            id: 'flee',
            label: '掉头就走',
            echo: '你转身，快步走了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'fortune', delta: 1 },
              { type: 'flag', key: 'fled-wounded-man', value: true },
            ],
            next: 'fled',
          },
        ],
      },

      sorted: {
        id: 'sorted',
        blocks: [{ kind: 'narration', text: '你蹲下去，伸手探了探他的鼻息。' }],
        branches: [
          { requires: [{ flag: { key: 'wounded-man', equals: '死人' } }], next: 'dead' },
          { requires: [{ flag: { key: 'wounded-man', equals: '猎户' } }], next: 'hunter' },
          { requires: [{ flag: { key: 'wounded-man', equals: '武人' } }], next: 'fighter' },
          { requires: [{ flag: { key: 'wounded-man', equals: '修士' } }], next: 'adept' },
          { requires: [{ flag: { key: 'wounded-man', equals: '弟子' } }], next: 'disciple' },
        ],
        next: 'wicked',
      },

      dead: {
        id: 'dead',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'attribute', key: 'will', delta: 4 },
          { type: 'chronicle', text: '你在山道上撞见一具尸首。没人认得他。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '没有气了。手是凉的。' },
          { kind: 'event', text: '这是个死人。' },
          { kind: 'narration', text: '你跑回村里叫人。里正带着几个汉子来看，说是个外乡人。' },
          { kind: 'narration', text: '没人认得他。埋在山脚下，坟很小。' },
          { kind: 'narration', text: '那几天你夜里睡不好。', tone: 'faint' },
        ],
      },

      hunter: {
        id: 'hunter',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'attribute', key: 'body', delta: 3 },
          { type: 'attribute', key: 'will', delta: 3 },
          {
            type: 'relation',
            id: 'saved-hunter',
            name: '山那边的猎户',
            delta: 30,
            note: '你在山道上救过他一回。',
          },
          { type: 'flag', key: 'saved-a-man', value: true },
          { type: 'chronicle', text: '你在山道上救了一个人。他是山那边的猎户。' },
        ],
        blocks: [
          { kind: 'narration', text: '还有气。你把他翻过来，是个中年汉子，腿上一道大口子。' },
          { kind: 'dialogue', text: '……野猪。' },
          { kind: 'narration', text: '他只说得出这两个字。' },
          { kind: 'narration', text: '你把他半拖半扶弄下了山，送到最近的村子。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '半个月后，那人拄着棍子找上门来，提了一只野兔。' },
          { kind: 'dialogue', text: '往后进山有事，到山那边打听我。' },
        ],
      },

      fighter: {
        id: 'fighter',
        onEnter: [
          { type: 'time', days: 4 },
          { type: 'attribute', key: 'body', delta: 4 },
          { type: 'attribute', key: 'will', delta: 4 },
          { type: 'flag', key: 'saved-a-man', value: true },
          {
            type: 'knowledge',
            id: 'breathing',
            title: '一个呼吸的法子',
            summary: '走山路时用鼻子换气，脚下踩着数。他说走一天不喘。你试过，好像是有用的。',
            category: '修行',
          },
          {
            type: 'aspect',
            key: 'body',
            self: '你走远路不容易累。有个人教过你一个换气的法子。',
          },
          { type: 'chronicle', text: '你救的那个人教了你一个呼吸的法子。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '还有气。他睁了一下眼，又闭上了。' },
          { kind: 'narration', text: '你把他背到山下的破庙里，找了些水。' },
          { kind: 'narration', text: '他在庙里躺了三天。腰上一直挎着刀，睡着也没解下来。' },
          { kind: 'narration', text: '第四天早上他能坐起来了。' },
          { kind: 'dialogue', text: '我没有钱谢你。' },
          { kind: 'narration', text: '他想了想，让你把手伸出来，按在自己肋下。' },
          { kind: 'dialogue', text: '走山路的时候这样喘气，脚下数着数。走一天不喘。' },
          { kind: 'narration', text: '他教了你两遍，第二天就走了。' },
          { kind: 'narration', text: '你不知道他是谁，也没有问。', tone: 'faint' },
        ],
      },

      adept: {
        id: 'adept',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'attribute', key: 'fortune', delta: 4 },
          { type: 'attribute', key: 'will', delta: 2 },
          { type: 'flag', key: 'met-adept', value: true },
          // 跟货郎摊上那册不是同一件东西，玩家却分不出来——
          // 两本都看不懂，也就都只是「一册书」
          {
            type: 'item',
            id: 'thin-book',
            name: '一册薄书',
            count: 1,
            unit: '册',
            note: '山道上那个人塞给你的。纸很薄，字歪歪扭扭，你一个也认不出。',
          },
          // 只知其名不知其详：他说了一句话，你连那句话是什么意思都不知道
          {
            type: 'knowledge',
            id: 'that-sentence',
            title: '他说的那句话',
            summary: null,
            category: '修行',
          },
          {
            type: 'chronicle',
            text: '山道上那个人给了你一册书，说了一句你听不懂的话。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你的手刚碰到他，他就睁开了眼。' },
          { kind: 'event', text: '他的眼睛很亮。伤成那样，眼睛还是亮的。', tone: 'cinnabar' },
          { kind: 'narration', text: '他看了你很久，久到你想跑。' },
          { kind: 'narration', text: '然后他从怀里摸出一册薄薄的书，塞进你手里。' },
          { kind: 'dialogue', text: '……别给人看见。' },
          { kind: 'narration', text: '后面还有一句，很短，你没听懂。不是本地话，也不像官话。' },
          { kind: 'narration', text: '你眨了一下眼。' },
          { kind: 'event', text: '草丛里没有人了。', tone: 'cinnabar' },
          { kind: 'narration', text: '血还在草叶上。你在原地站了很久，然后跑下了山。' },
          {
            kind: 'narration',
            text: '那本书你翻开过一次，一个字也不认得。回家以后压在了枕头底下。',
            tone: 'faint',
          },
        ],
      },

      disciple: {
        id: 'disciple',
        onEnter: [
          { type: 'time', days: 5 },
          { type: 'attribute', key: 'fortune', delta: 3 },
          { type: 'flag', key: 'saved-a-man', value: true },
          { type: 'flag', key: 'met-sect-people', value: true },
          {
            type: 'item',
            id: 'silver',
            name: '碎银子',
            count: 2,
            unit: '块',
            note: '来接人的那两个人给的。你从没见过这么多钱。',
          },
          // 只听过这个名字。玩家不知道玄清是什么，游戏也不告诉他
          {
            type: 'knowledge',
            id: 'xuanqing',
            title: '玄清',
            summary: null,
            category: '人物',
          },
          { type: 'chronicle', text: '你救的那个人，被两个穿一样衣服的人接走了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '还有气。是个年轻人，比你大不了几岁，衣裳很干净。' },
          { kind: 'narration', text: '你把他弄到路边的草棚里，守了一夜。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '第二天来了两个人，走路很快，穿的衣裳跟他一样。' },
          { kind: 'narration', text: '他们看了你一眼，没多问。其中一个丢下两块碎银子。' },
          { kind: 'dialogue', text: '多谢。' },
          { kind: 'narration', text: '扶人走的时候，你听见其中一个说了两个字：玄清。' },
          { kind: 'narration', text: '你不知道那是人名、地名，还是别的什么。', tone: 'faint' },
        ],
      },

      wicked: {
        id: 'wicked',
        onEnter: [
          { type: 'time', days: 20 },
          { type: 'attribute', key: 'body', delta: -6 },
          { type: 'attribute', key: 'will', delta: 8 },
          { type: 'attribute', key: 'fortune', delta: -4 },
          { type: 'flag', key: 'touched-by-wicked', value: true },
          {
            type: 'aspect',
            key: 'body',
            self: '你左腕上有一圈疤，五个指头的形状。它冬天会疼。',
          },
          {
            type: 'knowledge',
            id: 'the-cold-hand',
            title: '那只手',
            summary: '山道上那个人抓了你一下。手是凉的，凉得不像人的手。你到现在也没想明白。',
            category: '人物',
          },
          {
            type: 'chronicle',
            text: '山道上那个人抓住了你的手腕。你活着回来了。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你的手指刚碰到他的鼻子。' },
          { kind: 'event', text: '他抓住了你的手腕。', tone: 'cinnabar' },
          { kind: 'narration', text: '那只手很凉，凉得不像是人的手。' },
          { kind: 'narration', text: '他抬起头。你看见他在笑。' },
          { kind: 'narration', text: '你没有喊出声。你只记得自己在往后拖，鞋跟在土里划出两道沟。' },
          { kind: 'narration', text: '不知道过了多久，那只手松了。' },
          { kind: 'narration', text: '他说了一句什么，你没听清。然后他闭上眼，不动了。' },
          { kind: 'divider', variant: 'ink' },
          { kind: 'narration', text: '你在床上躺了将近一个月，一直在发热。' },
          { kind: 'narration', text: '{dam}问你在山上遇见了什么，你说没有。' },
          {
            kind: 'narration',
            text: '左腕上留了一圈疤，五个指头的形状。天冷的时候会疼。',
            tone: 'faint',
          },
        ],
      },

      watched: {
        id: 'watched',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '他一动不动。你也一动不动。' },
          { kind: 'narration', text: '太阳又往下落了一截。你终究没有走过去。' },
          { kind: 'narration', text: '天黑前你到了邻村，跟人提了一句。没人当回事。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '第二天回程时你特意看了那一段路。' },
          { kind: 'narration', text: '草丛压平了一片，人不在了。' },
          { kind: 'narration', text: '此后很多年，你偶尔还会想起这件事。', tone: 'faint' },
        ],
      },

      fled: {
        id: 'fled',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '你走出去很远才敢回头。' },
          { kind: 'narration', text: '路上什么也没有。草长得很高，看不见那个地方了。' },
          { kind: 'narration', text: '你没有跟任何人提起。' },
          { kind: 'narration', text: '这件事后来你几乎忘了。几乎。', tone: 'faint' },
        ],
      },
    },
  },

  'omen:book': {
    id: 'omen:book',
    title: '旧书',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '镇上有个货郎在庙前摆摊，卖些针头线脑。' },
          { kind: 'narration', text: '摊角堆着一叠旧纸，说是从一户人家的破屋里收的，论斤称。' },
          { kind: 'narration', text: '最下面压着一册薄书，封皮已经没了。' },
        ],
        branches: [
          // 山道上那个人塞给你的东西还在箱子里：站在同一个摊子前，你看见的不是旧纸。
          // 两件事本来毫不相干，是你自己把它们接上的
          { requires: [{ item: 'thin-book' }], next: 'already' },
        ],
        choices: [
          {
            id: 'buy',
            label: '把那册书买下来',
            hint: '几文钱',
            echo: '你把那册书买了下来。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'household', standing: -1 },
              {
                type: 'item',
                id: 'old-book',
                name: '一册旧书',
                count: 1,
                unit: '册',
                note: '庙前货郎那里论斤买的。上面的字你不认得。',
              },
              { type: 'flag', key: 'has-old-book', value: true },
            ],
            next: 'bought',
          },
          {
            id: 'leaf',
            label: '翻一翻就放回去',
            echo: '你翻了两页，把它放回原处。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 1 },
            ],
            next: 'left',
          },
        ],
      },

      bought: {
        id: 'bought',
        blocks: [
          { kind: 'narration', text: '货郎收钱的时候看了你一眼，没说什么。' },
          { kind: 'narration', text: '回家的路上你翻开看了看。' },
        ],
        branches: [
          // 认得字的人看得懂「这不是普通的字」——
          // 不认字的人连这一层都不知道，那对他只是一册废纸
          { requires: [{ knowledge: 'literacy' }], next: 'literate' },
        ],
        next: 'illiterate',
      },

      illiterate: {
        id: 'illiterate',
        onEnter: [{ type: 'time', months: 1 }],
        blocks: [
          { kind: 'narration', text: '上面全是字。你一个也不认得。' },
          { kind: 'narration', text: '不过纸挺好，比家里糊窗的强。' },
          { kind: 'narration', text: '你把它塞进箱子里，压在旧衣裳底下。' },
          { kind: 'narration', text: '过了几个月，你就不太想得起它了。', tone: 'faint' },
        ],
      },

      literate: {
        id: 'literate',
        onEnter: [
          { type: 'time', months: 1 },
          { type: 'attribute', key: 'insight', delta: 3 },
          {
            type: 'knowledge',
            id: 'strange-glyphs',
            title: '认不出的字',
            summary: '那册书上的字，笔画像字，可是拆开来看，一个也不是你学过的。',
            category: '器物',
          },
        ],
        blocks: [
          { kind: 'narration', text: '你在私塾念过几年，认得的字不算少。' },
          { kind: 'event', text: '可是这一册，你一个字也认不出来。' },
          { kind: 'narration', text: '不是写得潦草。笔画是清楚的，一笔一笔都清楚。' },
          { kind: 'narration', text: '只是拆开来看，没有一个是你学过的字。' },
          { kind: 'narration', text: '你拿去问过先生。先生看了半晌，把书还给你。' },
          { kind: 'dialogue', speaker: '周先生', text: '不认得。' },
          { kind: 'narration', text: '他又补了一句：也别到处给人看。' },
          {
            kind: 'narration',
            text: '你把它收进箱子。此后每隔一阵会拿出来翻一次，还是看不懂。',
            tone: 'faint',
          },
        ],
      },

      left: {
        id: 'left',
        blocks: [
          { kind: 'narration', text: '纸很脆，一翻就往下掉渣。' },
          { kind: 'narration', text: '你把它放回那叠旧纸里，走了。' },
          { kind: 'narration', text: '几天后再去庙前，货郎已经不在了。', tone: 'faint' },
        ],
      },

      /**
       * 箱底已经压着一册看不懂的书的人，站在同一个摊子前，看见的东西不一样。
       * 他没有得到任何新东西——他只是问了一句，然后知道了「这种纸不是本地货」。
       * 一条线索，不是一个答案。
       */
      already: {
        id: 'already',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'attribute', key: 'insight', delta: 2 },
        ],
        blocks: [
          { kind: 'narration', text: '你在那叠旧纸前站住了。' },
          { kind: 'narration', text: '你想起箱子底下压着的那一册。纸的样子，你记得很清楚。' },
          { kind: 'narration', text: '第二天你把书揣着来了，摊开给货郎看。' },
          { kind: 'narration', text: '货郎捻了捻纸角，摇头。' },
          { kind: 'dialogue', text: '不是我这一路的货。' },
          { kind: 'narration', text: '他又捻了一下，忽然凑近了些。' },
          { kind: 'dialogue', text: '这纸……府城当铺里我见过一回。人家不收。' },
          { kind: 'narration', text: '你问为什么不收。' },
          { kind: 'dialogue', text: '不知道。掌柜的看了一眼就摆手，脸都白了。' },
          { kind: 'narration', text: '他把书还给你，转身去招呼别的客人了。' },
          {
            kind: 'narration',
            text: '你把书重新包好。这一天你什么也没得到，只是多了一件不明白的事。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  'omen:merchant': {
    id: 'omen:merchant',
    title: '外乡人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 3 }],
        blocks: [
          { kind: 'narration', text: '入秋以后，铺子里来了个外乡商旅。' },
          { kind: 'narration', text: '他要收一批粗布，说是往北边走。' },
          { kind: 'narration', text: '货谈了三天，晚上就住在后院。' },
          { kind: 'narration', text: '第三天夜里下雨，他坐在檐下喝酒，看见你在旁边。' },
        ],
        choices: [
          {
            id: 'ask-road',
            label: '问他北边是什么样子',
            echo: '你问他，北边是什么样子。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
              {
                type: 'knowledge',
                id: 'the-north',
                title: '北边',
                summary: '出了关往北，是三千里的荒原。他说走一趟要半年，路上死人是常事。',
                category: '地理',
              },
            ],
            next: 'talked',
          },
          {
            id: 'pour',
            label: '给他把酒满上，不说话',
            echo: '你给他把酒满上。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'will', delta: 2 },
              { type: 'flag', key: 'poured-for-merchant', value: true },
            ],
            next: 'talked',
          },
          {
            id: 'away',
            label: '回屋去',
            echo: '你回屋去了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'missed',
          },
        ],
      },

      talked: {
        id: 'talked',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'attribute', key: 'fortune', delta: 2 },
          {
            type: 'relation',
            id: 'merchant',
            name: '走北路的商旅',
            delta: 12,
            note: '在你家住过三天。见过修士。',
          },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '这世上有一种人，不是官，不是江湖人。商旅说他亲眼见过一个，站在船头，船底下的水不动。',
            category: '修行',
          },
          { type: 'flag', key: 'heard-of-cultivators', value: true },
          {
            type: 'chronicle',
            text: '你第一次听人说起修士。说的人是个走北路的商旅。',
            tone: 'deep',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他喝了几杯，话就多了起来。' },
          { kind: 'narration', text: '说北边的荒原，说路上的马贼，说去年冻死在车上的伙计。' },
          { kind: 'narration', text: '说到一半他停了停，往院子外面看了一眼。' },
          { kind: 'dialogue', text: '有一年在渡口，我见过一个人。' },
          { kind: 'dialogue', text: '他站在船头。那条船走得飞快，可是水面上一点波纹都没有。' },
          { kind: 'narration', text: '你问他那是什么人。' },
          { kind: 'dialogue', text: '修士。' },
          { kind: 'event', text: '你第一次听见这两个字。', tone: 'deep' },
          { kind: 'narration', text: '他没有再往下说，把杯子里的酒喝完就进屋了。' },
          { kind: 'narration', text: '第二天他走了。此后再没来过。', tone: 'faint' },
        ],
      },

      missed: {
        id: 'missed',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '夜里你听见檐下有人在自言自语，说了很久。' },
          { kind: 'narration', text: '雨太大，一句也没听清。' },
          { kind: 'narration', text: '第二天他就走了。', tone: 'faint' },
        ],
      },
    },
  },
}

export const encounterEvents: readonly LifeEvent[] = [
  {
    // 走山道的机会人人都有，权重压过散事件——
    // 它是通往这个游戏核心体验的唯一一条路。
    // 看不看得见那个人、他又是谁，才是真正的筛子
    id: 'omen-wounded',
    window: { from: 10, to: 16 },
    scene: 'omen:wounded',
    weight: 14,
  },
  {
    /**
     * 货郎每年都来，那一册在他摊上压了很久。
     *
     * 权重给得比山道低不了多少，是有意的：多数人这一生真正会遇上的，
     * 不是山道上濒死的修士，而是庙前一册几文钱的旧纸。
     * 它十六岁那年也会被人点破——点破的是「这东西没用」。
     * 「多年以后才明白」不保证明白过来的是好消息。
     */
    id: 'omen-book',
    window: { from: 9, to: 16 },
    scene: 'omen:book',
    weight: 9,
  },
  {
    // 铺子里才有外乡人过夜。生在田里的孩子这辈子碰不上这一幕
    id: 'omen-merchant',
    window: { from: 10, to: 16 },
    requires: [{ trade: '商户' }],
    scene: 'omen:merchant',
    weight: 6,
  },
]
