import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 启蒙（七岁到十二岁）。
 *
 * 分水岭在七岁：家里供不供得起你读书。
 * 这不是一个选项——玩家点不了「我要读书」，
 * 那年家里有没有余钱，是前面几年一点一点攒出来或者赔进去的。
 *
 * 两条路都不是好坏之分：进了私塾的认得字，下了地的身子硬。
 * 十几年后遇上那本看不懂的书时，这两样各有各的用处。
 */
export const schoolingScenes: SceneLibrary = {
  'school:threshold': {
    id: 'school:threshold',
    title: '七岁',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [
          { kind: 'heading', title: '七岁' },
          { kind: 'narration', text: '这一年村里几个同龄的孩子开始去私塾了。' },
          { kind: 'narration', text: '你听见{elders}在灶间说话，说的是束脩。' },
        ],
        branches: [
          // 宗室开蒙不问家境。皇子由翰林侍讲，世子有王府西席，
          // 这一步在他生下来那天就定了。
          //
          // 问的是**家世**那一格，不是哪一行出身：上一版这里得写两行
          // （皇室一行、王府一行），漏一行没有任何机器会提醒。
          // 而且它现在还多管一件事——削爵那天 `station` 落到「寻常」，
          // 这一支自己就关了，不必回头改这两行
          { requires: [{ station: '宗室' }], next: 'hall' },
          // 官宦人家不送孩子去村塾。这一条不问家境——
          // 就算八品官家道中落，请西席也是最后才裁的开销
          { requires: [{ station: '仕宦' }], next: 'tutor' },
          // 其余三档，不是一道线。玩家一步也点不了——
          // 那年家里有没有余钱，是前面七年一点一点攒出来或者赔进去的
          { requires: [{ standing: { atLeast: 46 } }], next: 'afford' },
          { requires: [{ standing: { atLeast: 26 } }], next: 'strain' },
        ],
        next: 'cannot',
      },

      /**
       * 上书房。
       *
       * 这一节没有「能不能读」的悬念——宗室开蒙是国事，不是家事。
       * 它真正的分量在最后两句：**钦天监就在这座宫里。**
       *
       * 别家的孩子要走山道、逛庙会、等一个投宿的怪客，
       * 才能撞见修行界的一点边角；这一家的孩子从七岁起，
       * 每天从一个「夜观天象、上达天听」的衙门门口经过。
       * 只是没有人告诉他那里头在做什么。
       */
      hall: {
        id: 'hall',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'flag', key: 'schooled', value: true },
          { type: 'flag', key: 'royal-schooling', value: true },
          { type: 'attribute', key: 'insight', delta: 6 },
          /**
           * 这一世的天下太不太平，在你七岁开蒙那天就已经定了。
           *
           * 不这么掷的话，坠落那一卷靠年表排，而年表的链优先会让它必然发生——
           * 每一个皇子都在十五岁那年被废，每一个王爷都被削爵。
           * 那不是命运，那是剧本。
           *
           * 掷出「安」的那些人，十六岁那年会以世子、皇子的身份站在渡口，
           * 身后跟着两个人。他们同样看得见那条船。
           */
          {
            type: 'roll',
            key: 'court-fate',
            among: [
              { value: '安', weight: 58 },
              { value: '倾', weight: 42 },
            ],
          },
          { type: 'chronicle', text: '你开蒙了。侍讲是翰林出身。' },
        ],
        blocks: [
          { kind: 'narration', text: '开蒙的日子是钦天监选的，连时辰都定好了。' },
          { kind: 'narration', text: '侍讲姓周，翰林出身，行过礼才敢坐下。' },
          { kind: 'narration', text: '书房里只有你一个人，三个伺候的站在门外。' },
          { kind: 'dialogue', speaker: '周侍讲', text: '请把手伸出来。' },
          { kind: 'narration', text: '他没有碰你的手，只是看了一眼，就收回了目光。' },
          { kind: 'event', text: '你开始认字了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '去书房要经过一处偏院，门口挂着牌子，从来关着。' },
          { kind: 'narration', text: '你问过那是什么地方。' },
          { kind: 'dialogue', text: '钦天监。看星星的。' },
          { kind: 'narration', text: '你觉得没什么意思，就没有再问。', tone: 'faint' },
        ],
        next: 'lessons',
      },

      /**
       * 请西席。
       *
       * 识字对这一家不是机会，是理所当然——所以这一节没有「能不能读」的悬念，
       * 只有「读得多认真」。代价换成了另一样：他从来没有跟同龄人一起念过书。
       */
      tutor: {
        id: 'tutor',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -3 },
          { type: 'flag', key: 'schooled', value: true },
          { type: 'flag', key: 'private-tutor', value: true },
          { type: 'identity', identity: '学童' },
          { type: 'attribute', key: 'insight', delta: 4 },
          { type: 'chronicle', text: '家里请了西席，在家中开蒙。' },
        ],
        blocks: [
          { kind: 'narration', text: '开蒙这件事，家里从来没有商量过。' },
          { kind: 'narration', text: '过了年，{elder}请回来一位西席，姓周，落第多年的秀才。' },
          { kind: 'narration', text: '书房收拾出来，你一个人一张桌子。' },
          { kind: 'dialogue', speaker: '周先生', text: '把手伸出来。' },
          { kind: 'narration', text: '他看了看你的手，什么也没说。' },
          { kind: 'event', text: '你开始认字了。' },
          {
            kind: 'narration',
            text: '窗外能听见巷子里别的孩子在跑。你不认得他们。',
            tone: 'faint',
          },
        ],
        next: 'lessons',
      },

      /**
       * 咬牙供。
       *
       * 一道硬门槛会让占人口一半的农家子结构性地读不上书，那不对——
       * 真实的农家会为这件事借钱、卖东西、少吃一年肉。
       * 所以这里不拦人，只记账：书照读，家底掏空，
       * 而掏空的家底几年后自己会回来找你。
       */
      strain: {
        id: 'strain',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -12, debt: 6 },
          { type: 'flag', key: 'schooled', value: true },
          { type: 'flag', key: 'schooled-at-a-price', value: true },
          { type: 'identity', identity: '学童' },
          { type: 'chronicle', text: '家里借了钱，送你进了私塾。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '灶间那场话说了好几个晚上。' },
          { kind: 'narration', text: '后来{dam}把箱底那只银镯子拿了出来，{elder}又去借了一趟。' },
          { kind: 'narration', text: '开春那天，你穿着一身改小的旧衣裳去了村东。' },
          { kind: 'narration', text: '私塾一间旧屋，十来个孩子。先生姓周，五十上下，说话很慢。' },
          { kind: 'dialogue', speaker: '周先生', text: '把手伸出来。' },
          { kind: 'narration', text: '他看了看你的手——那是一双已经干过活的手——又看了看你的脸。' },
          { kind: 'narration', text: '他点了点头，没说什么。' },
          { kind: 'event', text: '你开始认字了。' },
          { kind: 'narration', text: '那年家里没有添过一件新东西。', tone: 'faint' },
        ],
        next: 'lessons',
      },

      afford: {
        id: 'afford',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'household', standing: -4 },
          { type: 'flag', key: 'schooled', value: true },
          { type: 'identity', identity: '学童' },
          { type: 'chronicle', text: '你进了私塾。' },
        ],
        blocks: [
          { kind: 'narration', text: '开春那天，{dam}给你换了身干净衣裳。' },
          { kind: 'narration', text: '私塾在村东，一间旧屋，十来个孩子。' },
          { kind: 'narration', text: '先生姓周，五十上下，说话很慢。' },
          { kind: 'dialogue', speaker: '周先生', text: '把手伸出来。' },
          { kind: 'narration', text: '他看了看你的手，又看了看你的脸，点了点头。' },
          { kind: 'event', text: '你开始认字了。' },
        ],
        next: 'lessons',
      },

      /**
       * 头一年怎么念。四条入学路径共用——进了门以后，
       * 家里出没出得起钱、请的是西席还是翰林，就不重要了。
       *
       * ## 那个教了你六年的人，从前不在关系图上
       *
       * 上面四节各写了一个姓周的：村塾的周先生、王府的周西席、
       * 上书房的周侍讲。有姓、有年纪、有说话的样子、有一句
       * 「把手伸出来」——**可他从来没有被 `meet` 进来过。**
       * 一个陪了你六年的人，在人口册上一行也没有。
       *
       * 这件事是 `scripts/seen.ts` 翻出来的，翻的路子有点绕：
       * 落幕那一卷曾有一句「当年教你的那个人，你到今天还记得
       * 他说话的样子」，认的是 `{ bond: '师' }`——而全库一处也没有
       * 建过这条边，于是三百世零个人读到。那道门禁没有去查
       * 有没有人 bind 过「师」，它只问了一句**「这句话有人读到吗」**。
       *
       * 那句话后来撤了（这个世界人人读得上书，它量出来是 100%，
       * 见 `ending.ts`）。**这条边留着**：它当初不是为那句话建的，
       * 是因为这个人本来就该在册子上——人物面板认他，
       * `kinOf('师')` 找得到他，而他在你十三岁那年就已经五十六了。
       *
       * 放在这一节而不是上面四节各放一次，是因为**这四条路认的是同一个人**。
       * 分开写会在 `scripts/apart.ts` 的覆盖率表上多出三行互斥的门牌号，
       * 而它们量的是同一件事：一个外姓人进了你的生活，教了你六年。
       */
      lessons: {
        id: 'lessons',
        /**
         * 玩家只知道他姓周。
         *
         * `name` 不写，所以人口册里那个「敬之」他一辈子也不会知道——
         * 一个学生记得先生说话的样子，记不得先生的名字，这件事本来就常见。
         */
        onEnter: [
          {
            type: 'meet',
            id: 'teacher',
            calls: '先生',
            delta: 15,
            who: { surname: '周', given: '敬之', gender: '男', age: 50, doing: '教你认字' },
            bond: '师',
          },
        ],
        blocks: [],
        choices: [
          {
            id: 'diligent',
            label: '每天早去一个时辰',
            hint: '天不亮就出门',
            echo: '此后一年，你天不亮就出门。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 8 },
              { type: 'attribute', key: 'body', delta: -2 },
              { type: 'flag', key: 'diligent-student', value: true },
              { type: 'aspect', key: 'learning', self: '你认得不少字，先生说你用功。' },
            ],
            next: 'first-year',
          },
          {
            id: 'ordinary',
            label: '跟大家一样上下学',
            echo: '你跟着大伙儿上学、散学。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'aspect', key: 'learning', self: '你在私塾念书，认得一些字。' },
            ],
            next: 'first-year',
          },
          {
            id: 'skip',
            label: '常常逃学，去河边',
            echo: '你逃过好几回学。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 1 },
              { type: 'attribute', key: 'body', delta: 4 },
              { type: 'attribute', key: 'fortune', delta: 2 },
              { type: 'flag', key: 'truant', value: true },
              { type: 'aspect', key: 'learning', self: '你在私塾挂着名，字认得不全。' },
            ],
            next: 'first-year',
          },
        ],
      },

      'first-year': {
        id: 'first-year',
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '一年过去了。' },
          {
            kind: 'narration',
            text: '你会写自己的名字了：{name}。写得歪，但是是自己写的。',
          },
        ],
        onEnter: [
          {
            type: 'knowledge',
            id: 'literacy',
            title: '识字',
            summary: '你能认一些字了。字是死的，写在纸上就一直在那里。',
            category: '世事',
          },
        ],
      },

      cannot: {
        id: 'cannot',
        onEnter: [
          { type: 'flag', key: 'schooled', value: false },
          { type: 'flag', key: 'working', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '这件事没有再提起。' },
          { kind: 'narration', text: '过了几天，父亲塞给你一把小镰刀。' },
          { kind: 'dialogue', speaker: '{elder}', text: '跟着我。' },
          { kind: 'narration', text: '同龄的孩子背着布包往村东去的时候，你在往田里去。' },
        ],
        choices: [
          {
            id: 'work',
            label: '跟着{elder}下地',
            echo: '你跟着去了。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 8 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'identity', identity: '农家子' },
              { type: 'aspect', key: 'body', self: '你从七岁就下地。手上有茧。' },
            ],
            next: 'worked',
          },
          {
            id: 'peek',
            label: '干完活绕到私塾窗外听一会儿',
            hint: '会晚回家，要挨骂',
            echo: '你绕了远路，在私塾窗外站了几回。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'flag', key: 'listened-outside', value: true },
              { type: 'identity', identity: '农家子' },
              {
                type: 'aspect',
                key: 'learning',
                self: '你没进过私塾。有几个字是在窗外偷听会的，不知道对不对。',
              },
              { type: 'aspect', key: 'body', self: '你从七岁就下地。手上有茧。' },
            ],
            next: 'peeked',
          },
        ],
      },

      worked: {
        id: 'worked',
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '一年过去了。' },
          { kind: 'narration', text: '你能挑起半桶水走一里地，能认出七八种草。' },
          { kind: 'narration', text: '你不认得字。这件事你自己也不觉得有什么。' },
        ],
      },

      peeked: {
        id: 'peeked',
        onEnter: [
          {
            type: 'knowledge',
            id: 'literacy',
            title: '识字',
            summary: null,
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '一年过去了。' },
          { kind: 'narration', text: '你在窗外记住了几个字的样子，但不知道怎么念。' },
          {
            kind: 'narration',
            text: '有一回被先生看见了。他没有赶你，只是看了你一眼，把窗子合上了。',
          },
        ],
      },
    },
  },

  'school:praise': {
    id: 'school:praise',
    title: '先生的话',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 6 },
          { type: 'relation', id: 'teacher', name: '周先生', delta: 8, note: '教你念书的人。' },
          /**
           * 先生说什么，不是写死的，是算出来的。
           *
           * 他量的是「读书快慢」，而那把尺子里记性占七成。
           * 于是一个记性极好、悟性平平的孩子会被他夸「聪明」——
           * 十六年后修士说「悟性一般」，玩家会觉得矛盾。
           * 这个误解就是从这一刻埋下的。
           */
          { type: 'observe', observer: 'teacher' },
          { type: 'attribute', key: 'memory', delta: 3 },
        ],
        blocks: [
          { kind: 'narration', text: '那天散学，先生把你留了一下。' },
          { kind: 'narration', text: '他让你把前天教的一段背一遍。' },
          { kind: 'narration', text: '先生看了你一会儿，说了两句话。' },
          // 说了什么落在「人物」面板的学识一栏下——正文不复述，
          // 免得写死的对话和算出来的评语对不上
          { kind: 'narration', text: '然后他就让你回去了。' },
          { kind: 'narration', text: '你不知道他为什么忽然说这个。', tone: 'faint' },
        ],
      },
    },
  },

  'school:strength': {
    id: 'school:strength',
    title: '力气',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 6 },
          { type: 'attribute', key: 'body', delta: 6 },
          // 老把式看身子骨。他的判断力比郎中低，说法也糙
          { type: 'observe', observer: 'fighter' },
        ],
        blocks: [
          { kind: 'narration', text: '秋收那几天，全村都在地里。' },
          { kind: 'narration', text: '你一个人扛了一捆稻走了半里地，没歇。' },
          { kind: 'narration', text: '同村一个老把式看见了，跟你{dam}说了一句。' },
        ],
        next: 'after',
      },

      after: {
        id: 'after',
        blocks: [{ kind: 'narration', text: '{dam}笑了笑，没接话。' }],
      },
    },
  },

  'school:fair': {
    id: 'school:fair',
    title: '庙会',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'place', place: '{province} · {prefecture} · 城隍庙' },
        ],
        blocks: [
          { kind: 'narration', text: '三月三，城隍庙有庙会。家里让你跟着去。' },
          { kind: 'narration', text: '人多得走不动。有卖糖的，有耍把式的，有说书的。' },
        ],
        choices: [
          {
            id: 'storyteller',
            label: '挤到说书的摊子前',
            echo: '你挤了进去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
              {
                type: 'knowledge',
                id: 'immortal-tale',
                title: '说书人讲的仙人',
                summary:
                  '说书的讲了一段「白日飞升」。据说有人修成了仙，活了几百年。听的人都笑，说是编的。',
                category: '修行',
              },
              { type: 'flag', key: 'heard-immortal-tale', value: true },
            ],
            next: 'tale',
          },
          {
            id: 'acrobat',
            label: '去看耍把式的',
            echo: '你钻到耍把式的圈子外面。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'body', delta: 3 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'acrobat',
          },
          {
            id: 'candy',
            label: '站在卖糖的摊子前不走',
            echo: '你在卖糖的摊子前站了很久。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'fortune', delta: 2 },
              { type: 'household', standing: -1 },
              {
                type: 'item',
                id: 'sugar-figure',
                name: '糖人',
                count: 1,
                unit: '个',
                note: '庙会上买的。舍不得吃，化了。',
              },
            ],
            next: 'candy',
          },
        ],
      },

      tale: {
        id: 'tale',
        blocks: [
          {
            kind: 'dialogue',
            speaker: '说书人',
            text: '……那人一步登天，白日飞升，从此再没人见过。',
          },
          { kind: 'narration', text: '底下有人笑，说这都是编的。' },
          { kind: 'narration', text: '说书人也笑，收了钱，讲下一段去了。' },
          { kind: 'event', text: '你第一次听见「仙」这个字。' },
          { kind: 'narration', text: '回家的路上你想了一路，然后就忘了。', tone: 'faint' },
        ],
        next: 'home',
      },

      acrobat: {
        id: 'acrobat',
        blocks: [
          { kind: 'narration', text: '那人赤着上身，胸口能压断一块青砖。' },
          { kind: 'narration', text: '围观的人往盘子里丢铜钱。' },
          { kind: 'narration', text: '收摊时你看见他在墙角揉自己的肩，揉了很久。' },
        ],
        next: 'home',
      },

      candy: {
        id: 'candy',
        blocks: [
          { kind: 'narration', text: '你站得太久，{dam}回头找你，最后还是买了一个。' },
          { kind: 'narration', text: '那个糖人你舍不得吃，揣了一路。' },
          { kind: 'narration', text: '到家的时候已经化得不成样子了。' },
        ],
        next: 'home',
      },

      home: {
        id: 'home',
        onEnter: [
          { type: 'time', days: 2 },
          { type: 'place', place: '{home}' },
        ],
        blocks: [{ kind: 'narration', text: '庙会散了。日子还是那样过。', tone: 'faint' }],
      },
    },
  },
}

export const schoolingEvents: readonly LifeEvent[] = [
  {
    // 七岁那年必然要面对这件事，所以权重压倒一切
    id: 'school-threshold',
    window: { from: 7, to: 8 },
    scene: 'school:threshold',
    weight: 100,
  },
  {
    id: 'school-praise',
    window: { from: 9, to: 13 },
    /*
     * 先生还在，才有这一节。
     *
     * 这一卷里「先生看了你一会儿」「先生把你留了一下」都是硬写的字——
     * 那是对的，这一卷说的就是他。可这一节从前只问 `schooled` 那个旗标，
     * **旗标不会因为一个人死了就变**，于是先生殁了之后他还在讲台上讲课。
     *
     * 私塾这几节都得问一句：教你的那个人还在不在。
     * 写法照 `school-strength` 那一条（它早就在问生母还在不在）。
     */
    requires: [
      { flag: { key: 'schooled', equals: true } },
      { family: { id: 'teacher', alive: true } },
    ],
    scene: 'school:praise',
    weight: 5,
  },
  {
    id: 'school-strength',
    window: { from: 9, to: 13 },
    requires: [{ flag: { key: 'working' } }, { bond: { kind: '生母', alive: true } }],
    scene: 'school:strength',
    weight: 5,
  },
  {
    id: 'school-fair',
    window: { from: 8, to: 13 },
    // 同 `school-praise`：这一节里说话的是先生，他得还在
    requires: [{ family: { id: 'teacher', alive: true } }],
    scene: 'school:fair',
    weight: 4,
  },
]
