import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 江上人。
 *
 * 它不发奖品，也不宣布你「觉醒」了什么——它只做一件事：
 * 把你这些年攒下的东西，第一次拿到明白人面前过一眼。
 *
 * 于是同一条船、同一个人，落在不同的人眼里是不同的东西：
 *
 * - 什么也没带的人，看见一条走得快的船。
 * - 听说过修士的人，认出那是什么。
 * - 怀里揣着一册看不懂的书的人，会听见有人第一次说出它的名字——
 *   那本东西他已经带了好几年，一直当它是废纸。
 *
 * 这是全作最迟到的一次反馈：
 * **你没有变强，你只是终于明白了自己身上早就发生过什么。**
 *
 * ## 这一卷不再是终点
 *
 * 从前它同时是年表事件和 `lifeFinale`，权重 1000、窗口封到 99 岁——
 * 那个组合的效果是十六岁之后候选池永远不空，人人必到渡口，演完即卷终。
 * **「十六岁没修上仙就结束」这条规则就长在那三个数字里。**
 *
 * 现在它跟别的事一样去争年表，争不到就轮不到它；
 * 演完也不结束，人接着往下活。遇见修士是一生里的一件大事，
 * 不是一生的终点——而这一生本来也可以完全不经过它。
 *
 * 所以卷里那些「你今年十六岁」的话都改了：这件事二十几岁才撞上
 * 完全正常，写死一个岁数会当场穿帮。
 */
export const rivermanScenes: SceneLibrary = {
  riverman: {
    id: 'riverman',
    title: '江上人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [{ kind: 'heading', title: '江上' }],
        // 进城的理由各不相同。这些年怎么过的、生在哪一家，
        // 决定你为什么会在那个下午站到那个渡口上。
        // 营生先于门第：护送人家的孩子就算念过书，那一年也是跟着车队去的
        branches: [
          // 墙塌过的人排在最前：他现在什么也不是，来渡口不需要理由。
          //
          // 这一行如今是**双保险**：削爵那一卷把 `station` 落到了「寻常」，
          // 底下那条宗室的岔自己就关了。留着它是因为两件事不是一回事——
          // 旗标记的是「他身上出过那件事」，家世记的是「他现在是什么人家」
          { requires: [{ flag: { key: 'the-fall' } }], next: 'as-nobody' },
          { requires: [{ station: '宗室' }], next: 'as-highborn' },
          { requires: [{ livelihood: '护送' }], next: 'as-escort' },
          { requires: [{ business: '药铺' }], next: 'as-healer' },
          { requires: [{ business: '客栈' }], next: 'as-innkeep' },
          { requires: [{ business: '酒楼' }], next: 'as-taverner' },
          { requires: [{ station: '仕宦' }], next: 'as-gentry' },
          { requires: [{ flag: { key: 'has-craft' } }], next: 'as-apprentice' },
          { requires: [{ flag: { key: 'has-shopwork' } }], next: 'as-clerk' },
          { requires: [{ flag: { key: 'schooled', equals: true } }], next: 'as-student' },
        ],
        next: 'as-hand',
      },

      'as-escort': {
        id: 'as-escort',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，有一趟短活走水路，{elder}带上了你。' },
          { kind: 'narration', text: '货交上船，众人在渡口等回程的车。' },
        ],
        next: 'river',
      },

      /**
       * 什么也不是的人。
       *
       * 这一节是宗室那条线真正的落点——他终于可以一个人站在江边了。
       * 从前不行：出门有人跟着，江边风大，殿下不该去那种地方。
       */
      'as-nobody': {
        id: 'as-nobody',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，你一个人出了门。' },
          { kind: 'narration', text: '没有人问你去哪里。这两年一直是这样。' },
          { kind: 'narration', text: '你走到渡口，是因为想不出别的地方可去。' },
        ],
        next: 'river',
      },

      /**
       * 还没塌的那一种。
       *
       * 他也到了渡口，可是身后跟着两个人。
       * 这一节和上一节的区别，会在他决定要不要走上前的那一刻显出来。
       */
      'as-highborn': {
        id: 'as-highborn',
        onEnter: [
          { type: 'time', days: 2 },
          // 王府开在藩地，皇城在京师。渡口这一卷落在他家那个府，
          // 所以得先把人挪过来——别业是暂住，不改「家在哪」
          { type: 'place', place: '{province} · {prefecture} · 别业' },
          // 这一步留下的旗标，是下面那条选项唯一的入场券。
          // 不能用「没塌墙」去写条件——旗标只在塌了的时候才置起来，
          // 「没有置起来」这件事条件系统里表达不出来
          { type: 'flag', key: 'guarded', value: true },
        ],
        blocks: [
          { kind: 'narration', text: '入秋那几日，你随行去{prefecture}的别业小住。' },
          { kind: 'narration', text: '午后闷得慌，你说要去江边走走。' },
          { kind: 'narration', text: '跟着的两个人落后你三步，一直没有走开。' },
        ],
        next: 'river',
      },

      'as-healer': {
        id: 'as-healer',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，{elder}让你去渡口收一批从南边运来的药材。' },
          { kind: 'narration', text: '药点清了，挑夫还没到。' },
        ],
        next: 'river',
      },

      'as-innkeep': {
        id: 'as-innkeep',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，店里托你去渡口接一位早就订了房的客人。' },
          { kind: 'narration', text: '船误了时辰。你在岸上等着。' },
        ],
        next: 'river',
      },

      'as-taverner': {
        id: 'as-taverner',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，楼里要办席，你去渡口挑今年的头道鲜。' },
          { kind: 'narration', text: '鱼挑好了，你没有急着回。' },
        ],
        next: 'river',
      },

      'as-gentry': {
        id: 'as-gentry',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，{elder}让你去渡口送一位同僚上船。' },
          { kind: 'narration', text: '客套话说完，船开了。你留在岸上。' },
        ],
        next: 'river',
      },

      'as-student': {
        id: 'as-student',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，先生让你去县学送一份文书。' },
          { kind: 'narration', text: '事情办完还早，你没有直接回去。' },
        ],
        next: 'river',
      },

      'as-apprentice': {
        id: 'as-apprentice',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，师傅打发你进城交一批活计。' },
          { kind: 'narration', text: '交完货，你在城里多待了半日。' },
        ],
        next: 'river',
      },

      'as-clerk': {
        id: 'as-clerk',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，掌柜的让你去渡口盘一批到岸的货。' },
          { kind: 'narration', text: '货点清了，船还没走。' },
        ],
        next: 'river',
      },

      'as-hand': {
        id: 'as-hand',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '入秋那几日，家里让你挑两担粮进城去卖。' },
          { kind: 'narration', text: '卖完了，你没有急着回。' },
        ],
        next: 'river',
      },

      river: {
        id: 'river',
        onEnter: [{ type: 'place', place: '{province} · {prefecture} · 渡口' }],
        blocks: [
          { kind: 'narration', text: '你在江边站了很久。' },
          { kind: 'narration', text: '江面今日格外安静。' },
          { kind: 'narration', text: '远处，一叶乌篷船顺流而下。' },
          { kind: 'narration', text: '船头站着一个穿青衫的人。' },
        ],
        /**
         * 同一个人站在同一条江边，看见的不是同一件事。
         *
         * 这四句谁都读得到——**船是真的，人是真的，跟他想什么无关**。
         * 底下这几句添的全是他自己的东西：一个埋过人的孩子、一个
         * 一辈子没出过村的孩子、一个饿过的孩子，站在这里想的本来就不一样。
         *
         * 一个字也没多告诉他那人是谁。认出修士要靠 `recognize` 那几条
         * 选项，各有各的知识门槛——**多看一眼不等于看懂**。
         * 这一格若敢写「你认出那是修士」，家里死过人的孩子就凭空多知道了
         * 一件事，而他这十六年里根本没有任何地方教过他。
         */
        seen: [
          {
            // 埋过人的孩子站在江边，想的是那个人还能站多久
            requires: [{ flag: { key: 'father-dead' } }],
            text: '你想的是他站在那儿，能站多少年。',
          },
          {
            // 没等到消息的，比埋过人的更难受——他不知道该不该收手
            requires: [{ flag: { key: 'father-missing' } }],
            text: '船是从北边来的。你多看了那船一眼。',
          },
          {
            // 见过山那面那条道的孩子，知道路通向别处，也知道自己没走
            requires: [{ flag: { key: 'saw-the-road' } }],
            text: '这条江往下走，是你没去过的地方。',
          },
          {
            // 家里紧的孩子，先看见的是那身衣裳值多少
            requires: [{ standing: { atMost: 35 } }],
            text: '那身青衫是好料子。你一眼就看出来了。',
          },
        ],
        choices: [
          {
            id: 'watch',
            label: '站着不动，看他过去',
            echo: '你没有动。',
            effects: [{ type: 'time', days: 1 }],
            next: 'watched',
          },
          {
            id: 'approach',
            label: '朝渡口走过去',
            critical: true,
            hint: '你不知道他是什么人',
            echo: '你朝渡口走了几步。',
            effects: [{ type: 'time', days: 1 }],
            next: 'approached',
          },
          {
            id: 'shake',
            /**
             * 只有还没塌墙的宗室看得见这一条。
             *
             * 别人朝渡口走过去只需要抬脚，他得先甩掉两个人——
             * 这是全作对「最尊贵的出身机缘最少」最直接的一次表达：
             * 连走上前去看一眼，他都要比农户的儿子多花一道功夫。
             */
            label: '支开跟着的人，再走过去',
            critical: true,
            requires: [{ flag: { key: 'guarded' } }],
            hint: '他们不会走远',
            echo: '你说要买碗茶，把他们支开了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 6 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'flag', key: 'slipped-the-guards', value: true },
            ],
            next: 'approached',
          },
          {
            id: 'leave',
            label: '转身回家',
            echo: '你转身往回走。',
            effects: [{ type: 'time', days: 2 }],
            next: 'left',
          },
          /**
           * 认出来，靠的是这十六年里听过、见过的某一件事。
           *
           * 来源各不相同：商旅在你家檐下说的、庙会上说书人讲的、
           * 山道上那个挎刀的人教你的、父亲关起院门告诉你的。
           * 都没写 lockedHint——一件也没经历过的人，
           * 连这里有一条路都不该看见。
           *
           * 经历过不止一件的人会同时看见几条。这不是冗余：
           * 一个人在关键时刻想起的，本来就可能不止一件事。
           */
          {
            id: 'recognize',
            label: '你想起有人跟你说过这样的船',
            requires: [{ knowledge: 'cultivators-exist' }],
            echo: '你想起有人说过这样的船。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
            ],
            next: 'recognized',
          },
          {
            // 护送人家的孩子不是「想起」，是身体先反应过来——
            // 父亲交代过：别动手，也别跑，站着让他过去
            id: 'recall-warning',
            label: '你想起父亲交代过的那句话',
            requires: [{ flag: { key: 'heard-of-cultivators' } }, { livelihood: '护送' }],
            echo: '你站住了，两只手都松开着。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 5 },
              { type: 'attribute', key: 'insight', delta: 2 },
            ],
            next: 'recognized',
          },
          {
            id: 'recall-tale',
            label: '你想起庙会上说书人讲的那一段',
            requires: [{ knowledge: 'immortal-tale' }],
            echo: '你想起很多年前庙会上，说书人讲的那一段。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
            ],
            next: 'recognized',
          },
          {
            id: 'recall-breath',
            label: '你想起那个教你换气的人',
            requires: [{ knowledge: 'breathing' }],
            echo: '你想起山道上那个挎着刀睡觉的人。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 3 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: 'recognized',
          },
        ],
      },

      watched: {
        id: 'watched',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 3 },
          {
            type: 'knowledge',
            id: 'boat-no-ripple',
            title: '不起波纹的船',
            summary: '有些船行过水面，水面是不动的。凡人的船不会这样。',
            // 亲眼看到了这个现象——「见过」，而不是「听说」
            contact: '见过',
            category: '世事',
          },
          { type: 'chronicle', text: '你在渡口看见一叶不起波纹的船。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '船行得很慢，慢得不像是顺流。' },
          { kind: 'narration', text: '青衫人始终没有回头，可你有一种被看着的感觉。' },
          { kind: 'event', text: '船过渡口时，江面上没有起一丝波纹。' },
          { kind: 'narration', text: '你在岸上站到天快黑，才想起该回去了。' },
        ],
        next: 'close',
      },

      recognized: {
        id: 'recognized',
        onEnter: [
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary:
              '这世上有一种人，不是官，不是江湖人。他们的船行过水面，水面是不动的。你亲眼见了一次。',
            contact: '见过',
            category: '修行',
          },
          { type: 'flag', key: 'saw-a-cultivator', value: true },
          { type: 'chronicle', text: '你在渡口认出了一个修士。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '很多年前的一句话，忽然回到你耳朵里。' },
          { kind: 'narration', text: '你低头看江面。' },
          { kind: 'event', text: '水是平的。', tone: 'cinnabar' },
          { kind: 'narration', text: '船在往前走，走得不慢。可是水面上什么也没有。' },
          { kind: 'narration', text: '你在原地站着，忽然明白自己这一刻在看什么。' },
          { kind: 'narration', text: '船越来越近了。' },
        ],
        choices: [
          {
            id: 'call',
            label: '叫住他',
            critical: true,
            echo: '你朝江面喊了一声。',
            effects: [{ type: 'time', days: 1 }],
            next: 'approached',
          },
          {
            id: 'hold',
            label: '不出声，把他的样子记下来',
            echo: '你没有出声。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 5 },
              { type: 'attribute', key: 'insight', delta: 3 },
              {
                type: 'knowledge',
                id: 'green-robe',
                title: '青衫人',
                summary: '船头立着一个穿青衫的人。他从头到尾没有回过头。',
                category: '人物',
              },
              { type: 'chronicle', text: '你怕过，但没有走。你记住了那个人。', tone: 'deep' },
            ],
            next: 'close',
          },
        ],
      },

      approached: {
        id: 'approached',
        blocks: [
          { kind: 'dialogue', speaker: '你', text: '敢问——' },
          { kind: 'narration', text: '话没有说完。' },
          { kind: 'event', text: '那人转过头来。', tone: 'cinnabar' },
          { kind: 'narration', text: '你看清了他的眼睛。' },
          { kind: 'narration', text: '那不是一双活人应该有的眼睛。' },
          { kind: 'narration', text: '他看着你，从上到下看了一遍。' },
        ],
        // 他看的是你，不是你想让他看的东西。
        // 身上揣着什么，这一眼就定了这一卷的结局
        branches: [
          { requires: [{ item: 'thin-book' }], next: 'named-true' },
          { requires: [{ item: 'odd-root' }], next: 'named-root' },
          { requires: [{ item: 'pedlar-book' }], next: 'named-false' },
          { requires: [{ flag: { key: 'touched-by-wicked' } }], next: 'named-scar' },
        ],
        next: 'unnamed',
      },

      /**
       * 药铺那条线的落点。
       *
       * 那截根他家收了好些年，一直当它是「认不出的药材」。
       * 这一刻它有了名字——而名字带来的不是喜悦，是一个更麻烦的事实：
       * 家里柜子最上一格放着的，是别人会为之杀人的东西。
       */
      'named-root': {
        id: 'named-root',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 6 },
          { type: 'attribute', key: 'fortune', delta: 3 },
          {
            type: 'reveal',
            item: 'odd-root',
            name: '灵草（残根）',
            note: '北边山里石缝里挖的。有人告诉你，这东西沾了灵气，所以不腐。他还说：收好，别让人看见。',
          },
          {
            type: 'knowledge',
            id: 'spirit-herbs',
            title: '灵草',
            summary:
              '有些草木长在灵气足的地方，采下来很久也不腐不干。凡人的药书上一味都没有。你家柜子里就有一截。',
            category: '器物',
          },
          {
            type: 'knowledge',
            id: 'cultivators-exist',
            title: '修士',
            summary: '这世上有一种人，不是官，不是江湖人。他一眼就认出了你家那截根。',
            category: '修行',
          },
          { type: 'flag', key: 'knows-the-root', value: true },
          {
            type: 'chronicle',
            text: '有人告诉你，你家收了多年的那截根，是灵草。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他的目光在你腰间的药囊上停了一下。' },
          { kind: 'dialogue', text: '你身上带着东西。' },
          { kind: 'narration', text: '你把那个油纸包取了出来——{elder}让你随身带着，说渡口人杂。' },
          { kind: 'narration', text: '三层油纸拆开，那截根还是老样子。断口白的，不干，也不烂。' },
          { kind: 'narration', text: '这东西在你家柜子最上一格放了好些年，谁也认不出。' },
          { kind: 'narration', text: '他只看了一眼。' },
          { kind: 'event', text: '「灵草。残的。」', tone: 'cinnabar' },
          { kind: 'narration', text: '你问什么是灵草。' },
          { kind: 'dialogue', text: '长在灵气足的地方，所以不腐。' },
          { kind: 'narration', text: '他顿了顿，又补了一句。' },
          { kind: 'dialogue', text: '收好。别让人看见。' },
          { kind: 'narration', text: '船过去了。' },
          { kind: 'divider', variant: 'ink' },
          { kind: 'narration', text: '你把油纸重新包了三层，一路攥在手心里。' },
          {
            kind: 'narration',
            text: '这些年你家一直觉得那是个认不出的怪东西。现在你知道它是什么了。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '你也知道了，这东西不能让人看见。',
            tone: 'deep',
          },
        ],
        next: 'close',
      },

      'named-true': {
        id: 'named-true',
        onEnter: [
          { type: 'attribute', key: 'fortune', delta: 6 },
          { type: 'attribute', key: 'will', delta: 4 },
          // 全作等了最久的一句话。那本书他带了好几年，一直当它是废纸
          {
            type: 'reveal',
            item: 'thin-book',
            name: '炼气法门',
            note: '山道上那个人给你的。有人告诉你，这是修行的入门之法。你还是看不懂。',
          },
          {
            type: 'knowledge',
            id: 'that-sentence',
            title: '他说的那句话',
            summary:
              '山道上那个人说的最后一句，是修士之间的话。青衫人听你学了一遍，只说：他把命交给你了。',
            // 这件事直接发生在他身上——他跟修士说过话，被对方点破了手里的东西
            contact: '亲历',
            category: '修行',
          },
          {
            type: 'knowledge',
            id: 'qi-refining',
            title: '炼气',
            summary: '修行的第一步。你手里那册书，写的就是这个。你一个字也认不出来。',
            contact: '亲历',
            category: '修行',
          },
          {
            type: 'claim',
            key: 'root',
            source: '渡口的青衫人',
            text: '你身上有那个人的气。他死了？',
            doubt: '你不知道「气」是什么，也不知道自己身上为什么会有别人的东西。',
          },
          /**
           * 他顺带打量了你一眼。
           *
           * 这是全作第一次有人看见「悟性」和「神魂」——玩家活了十六年，
           * 听过的评价全是记性、力气、读书快慢，此刻忽然多出两个他
           * 连词义都不懂的说法。
           *
           * 而说这话的是个炼气修士，判断力只有五十几分。
           * 他很可能看错了，玩家却会把这句话记一辈子。
           */
          { type: 'observe', observer: 'adept' },
          { type: 'flag', key: 'knows-the-book', value: true },
          {
            type: 'chronicle',
            text: '有人告诉你，你揣了好几年的那册书，是炼气法门。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他的目光在你怀里停了一下。' },
          { kind: 'dialogue', text: '你身上有那个人的气。' },
          { kind: 'narration', text: '你没听懂。你下意识按住了怀里那本书。' },
          { kind: 'narration', text: '他看见了这个动作。' },
          { kind: 'dialogue', text: '拿出来。' },
          { kind: 'narration', text: '你把那册薄书拿了出来。就是山道上那个人塞给你的那一册。' },
          { kind: 'narration', text: '这些年你翻过很多次，一个字也没认出来过。' },
          { kind: 'narration', text: '他只看了一眼。' },
          { kind: 'event', text: '「炼气法门。」', tone: 'cinnabar' },
          { kind: 'narration', text: '你站在那里，忽然想起很多年前山道上的那个下午。' },
          { kind: 'narration', text: '想起那个人睁开眼睛看着你，说了一句你听不懂的话。' },
          { kind: 'event', text: '你终于知道那不是一本普通的书了。', tone: 'cinnabar' },
          { kind: 'narration', text: '你抬起头想问点什么。' },
          { kind: 'narration', text: '船已经过去了。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '你手里还是那一册书。字还是一个也不认得。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '不一样的是，从今天起你知道它是什么了。',
            tone: 'deep',
          },
        ],
        next: 'close',
      },

      /**
       * 庙前那册书的落点，也是这一支机缘真正的终点。
       *
       * 玩家花了钱、揣了好几年、翻过无数次，一直管它叫自己给的那个名字。
       * 这一刻有人扫了一眼，说出它真正是什么——**而那可能跟他想的完全不是一回事。**
       *
       * 整段由 `book-named` 算出来，因为答案取决于当年那一掷：
       * 写坏的符书、早已散掉的商号的账、抄漏的方子、看不出来路的残卷、
       * 或者一样他压根不该留在箱子里的东西。六种收尾的余味完全不同，
       * 一句通用的结语会把它们抹平成同一种人生。
       */
      'named-false': {
        id: 'named-false',
        onEnter: [
          { type: 'attribute', key: 'insight', delta: 5 },
          { type: 'book-named' },
          // 日录靠它回头点亮「在镇上买下那册书」的那一天
          { type: 'flag', key: 'named-by-riverman', value: true },
        ],
        blocks: [],
        next: 'close',
      },

      'named-scar': {
        id: 'named-scar',
        onEnter: [
          { type: 'attribute', key: 'will', delta: 6 },
          { type: 'attribute', key: 'fortune', delta: -2 },
          {
            type: 'knowledge',
            id: 'the-cold-hand',
            title: '那只手',
            summary:
              '山道上那个人抓了你一下，留了一圈疤。青衫人看了一眼就变了脸色，说你命大。你还是不知道那是什么。',
            category: '人物',
          },
          {
            type: 'claim',
            key: 'body',
            source: '渡口的青衫人',
            text: '这印子……你还活着？',
            doubt: '他问得像是你本来不该活着。你不敢往下想。',
          },
          { type: 'flag', key: 'marked-known', value: true },
          { type: 'chronicle', text: '青衫人看见了你腕上那圈疤，脸色变了。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '他的目光落在你的左腕上。' },
          { kind: 'narration', text: '那里有一圈疤，五个指头的形状。' },
          { kind: 'event', text: '他的神色变了。', tone: 'cinnabar' },
          { kind: 'dialogue', text: '这印子……你还活着？' },
          { kind: 'narration', text: '你不知道该怎么答。' },
          { kind: 'narration', text: '他盯着那圈疤看了很久，然后问：那人现在在哪。' },
          { kind: 'narration', text: '你说你不知道。你说那是好多年前的事了。' },
          { kind: 'narration', text: '他没有再问。' },
          { kind: 'dialogue', text: '离水边远一点。' },
          { kind: 'narration', text: '船过去了。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '你低头看自己的手腕。这圈疤跟了你好多年，你早就习惯了。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '今天你才知道，它在别人眼里是另一样东西。',
            tone: 'deep',
          },
        ],
        next: 'close',
      },

      unnamed: {
        id: 'unnamed',
        onEnter: [
          { type: 'attribute', key: 'will', delta: 4 },
          { type: 'attribute', key: 'fortune', delta: 2 },
          { type: 'flag', key: 'met-stranger', value: true },
          {
            type: 'knowledge',
            id: 'green-robe',
            title: '青衫人',
            summary: '渡口那人回过头。他的眼睛不像活人的眼睛。',
            category: '人物',
          },
          {
            type: 'chronicle',
            text: '你在渡口叫住了那个青衫人。他回头看了你一眼。',
            tone: 'cinnabar',
          },
        ],
        blocks: [
          { kind: 'narration', text: '他看了你一眼，就把头转了回去。' },
          { kind: 'narration', text: '像是看了一块石头，一棵树。' },
          { kind: 'narration', text: '等你回过神，江面上什么也没有。' },
          { kind: 'narration', text: '你在渡口一直站到天黑。' },
          { kind: 'divider', variant: 'ink' },
          {
            kind: 'narration',
            text: '你说不清刚才发生了什么。你只知道，那不是个普通人。',
            tone: 'faint',
          },
        ],
        next: 'close',
      },

      left: {
        id: 'left',
        onEnter: [
          { type: 'attribute', key: 'will', delta: 1 },
          { type: 'place', place: '{home}' },
        ],
        blocks: [
          { kind: 'narration', text: '走出十几步，你回头看了一眼。' },
          { kind: 'narration', text: '江面上什么也没有。' },
          { kind: 'narration', text: '那船像是从来没有来过。' },
        ],
        next: 'fade',
      },

      close: {
        id: 'close',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'place', place: '{home}' },
        ],
        blocks: [
          { kind: 'narration', text: '你回到家的时候，天已经黑透了。' },
          { kind: 'narration', text: '有人问你怎么回来得这样晚。你说路上耽搁了。' },
          { kind: 'narration', text: '那天夜里你没有睡着。' },
          {
            kind: 'narration',
            text: '到今天为止，你的人生和村里所有人都一样。',
            tone: 'faint',
          },
          { kind: 'narration', text: '只是你现在知道，这世上还有别的活法。', tone: 'deep' },
        ],
        choices: [{ id: 'end', label: '合卷', next: null }],
      },

      fade: {
        id: 'fade',
        onEnter: [{ type: 'time', days: 4 }],
        blocks: [
          { kind: 'narration', text: '之后几日，江上再没有来过外乡人。' },
          { kind: 'narration', text: '日子照旧。挑水，做活，吃饭，睡觉。' },
          { kind: 'narration', text: '你几乎要以为，那天下午是自己想出来的。' },
          {
            kind: 'narration',
            text: '你的人生和村里所有人都一样。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '只是每次路过渡口，你还是会往江上看一眼。',
            tone: 'deep',
          },
        ],
        choices: [{ id: 'end', label: '合卷', next: null }],
      },
    },
  },
}

/**
 * 渡口那一卷的入口。
 *
 * 三个数字合起来说的是同一句话：**遇见修士是走出来的，不是发下来的。**
 *
 *     weight 120　　跟别的事一起去争，抽不中就是没碰上
 *     16–28　　　　 往外闯的那些年才会撞见；再往后人已经安顿下来了
 *     fortune ≥ 55　命数不够的人这辈子路过不了那个渡口
 *
 * 那道 `fortune` 门槛是这次改动的重心。命数不是天上掉的：
 * 往城里跑、农闲往山里跑、出一趟远门、跟同窗到处乱跑——
 * 涨命数的全是**把自己往村子外面推**的那些选择。
 * 一辈子守着地的人过不了这道坎，于是他的一生完全不经过修行这条路，
 * 而那是一种完整的人生，不是一次失败。
 *
 * 这个数会漂（涨命数的选项一多，人人都过得去；一少，谁也过不去），
 * 所以门禁不写死它，`scripts/lifelong.ts` 只守两头：
 * **不是 0%，也不是 100%。**
 */
export const rivermanEvents: readonly LifeEvent[] = [
  {
    id: 'riverman',
    window: { from: 16, to: 28 },
    scene: 'riverman',
    weight: 120,
    requires: [{ attribute: { key: 'fortune', atLeast: 55 } }],
  },
]
