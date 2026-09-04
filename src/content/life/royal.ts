import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 宗室。
 *
 * 这一册回答一个问题：**最尊贵的出身，为什么反而最难踏上修行路？**
 *
 * 因为宫墙替他挡住了所有的苦，也替他挡住了所有的机缘。
 * 他不会在山道上撞见濒死的人，不会蹲在货郎摊前翻旧纸，
 * 不会有走北路的商旅在他家檐下喝酒说胡话——
 * 出门有人跟着，那些事一件也轮不到他。
 *
 * 他只有两条路：
 *
 * 1. **钦天监那道门。** 它就在宫里，他每天经过。但那是衙门，
 *    不是机缘——你得自己想去推那扇门，而且推了多半会被拦回来。
 * 2. **墙自己塌。** 夺嫡、削藩、抄家。等他失去一切之后，
 *    他才终于变成一个可以在渡口站着的普通人。
 *
 * 第二条不是惩罚，也不是「为了给你机缘」。它只是发生了。
 * 世界继续运行，而他这一次站在了外面。
 */
const CHAIN = '天家'

export const royalScenes: SceneLibrary = {
  'royal:observatory': {
    id: 'royal:observatory',
    title: '钦天监',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 2 }],
        blocks: [
          { kind: 'narration', text: '那年秋天，钦天监那道门开了三天。' },
          { kind: 'narration', text: '说是要修浑仪，工匠进进出出，牌子摘了下来。' },
          { kind: 'narration', text: '你每天去书房都要从门口过。' },
        ],
        choices: [
          {
            id: 'enter',
            label: '趁没人，走进去看看',
            critical: true,
            hint: '这地方不是你该去的',
            echo: '你走了进去。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 5 },
              { type: 'attribute', key: 'fortune', delta: 3 },
            ],
            next: 'inside',
          },
          {
            id: 'ask',
            label: '拦住一个出来的人，问他里头做什么',
            echo: '你拦下了一个抱着卷宗的老吏。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'insight', delta: 4 },
            ],
            next: 'asked',
          },
          {
            id: 'pass',
            label: '照旧去书房',
            echo: '你从门口过去了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'passed',
          },
        ],
      },

      inside: {
        id: 'inside',
        onEnter: [
          { type: 'time', days: 1 },
          {
            type: 'knowledge',
            id: 'the-observatory',
            title: '钦天监',
            summary:
              '名义上是看星象、定历法的衙门。院子最里头还有一进，那道门连修浑仪的工匠都不许进。',
            category: '世事',
          },
          { type: 'flag', key: 'entered-observatory', value: true },
          { type: 'chronicle', text: '你溜进了钦天监。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '院子里堆着木料，几个工匠正在搭架子。没人拦你。' },
          { kind: 'narration', text: '正屋里立着一架铜的东西，圈套着圈，比你还高。' },
          { kind: 'narration', text: '墙上挂满了图。你认得字，可那些图上的字连起来读不通。' },
          { kind: 'narration', text: '再往里还有一进院子。那道门关着，上着锁。' },
          { kind: 'narration', text: '锁是新的。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '一个穿青袍的老者从后面出来，看见了你。' },
          { kind: 'narration', text: '他没有行礼，也没有惊慌。他只是看着你。' },
          { kind: 'dialogue', text: '这里没有{title}要的东西。' },
          { kind: 'narration', text: '你被送了出来。第二天那块牌子就挂回去了。' },
          {
            kind: 'narration',
            text: '你后来想起，整座宫里只有他一个人见你不跪。',
            tone: 'cinnabar',
          },
        ],
      },

      asked: {
        id: 'asked',
        onEnter: [
          { type: 'time', days: 1 },
          {
            type: 'knowledge',
            id: 'the-observatory',
            title: '钦天监',
            summary: '看星象、定历法的衙门。老吏说，里头还有一进院子，他也没进去过。',
            category: '世事',
          },
        ],
        blocks: [
          { kind: 'narration', text: '老吏抱着卷宗，慌忙要跪。你让他起来。' },
          { kind: 'narration', text: '他说的都是些历法节气的话，你听得没什么意思。' },
          { kind: 'narration', text: '你随口问：里头那道锁着的门呢？' },
          { kind: 'event', text: '他的话停住了。', tone: 'deep' },
          { kind: 'dialogue', text: '……那不归下官管。' },
          { kind: 'narration', text: '他行了个礼，抱着卷宗快步走了。' },
          {
            kind: 'narration',
            text: '你站在原地，觉得这件事有点怪，但也就到此为止。',
            tone: 'faint',
          },
        ],
      },

      passed: {
        id: 'passed',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '三天以后，那块牌子挂了回去，门也关上了。' },
          {
            kind: 'narration',
            text: '此后很多年你每天从门口经过，没有再想起过它。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 墙塌了。
   *
   * 这一卷是宗室这条线的转折，但它不写成一场大戏——
   * 一个十几岁的孩子在这种事里从头到尾都不是主角，
   * 他只是被人从一间屋子挪到另一间屋子。
   *
   * 他失去的东西没有一样是他自己挣来的，
   * 所以严格说来他也没有失去什么。这一点要到很久以后他才明白。
   */
  'royal:fall': {
    id: 'royal:fall',
    title: '那一夜',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', months: 2 }],
        blocks: [
          { kind: 'narration', text: '那阵子宫里很静。' },
          { kind: 'narration', text: '{elder}病了两个月，{dam}去侍疾，回来一句话也不说。' },
          { kind: 'narration', text: '十月里的一夜，外头忽然乱起来。' },
          { kind: 'narration', text: '有人在跑，有人在喊，宫门那边一直响到天亮。' },
          { kind: 'event', text: '天亮的时候，换了一批人守在你门口。', tone: 'cinnabar' },
        ],
        choices: [
          {
            id: 'out',
            label: '推门出去看',
            critical: true,
            echo: '你推开了门。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 5 },
            ],
            next: 'saw',
          },
          {
            id: 'wait',
            label: '坐着等',
            echo: '你在屋里坐着，一直坐到中午。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'attribute', key: 'insight', delta: 2 },
            ],
            next: 'waited',
          },
        ],
      },

      saw: {
        id: 'saw',
        blocks: [
          { kind: 'narration', text: '守门的没有拦你，只是跟着你走。' },
          { kind: 'narration', text: '廊下有血，已经在冲洗了。' },
          { kind: 'narration', text: '你往前殿走了几步，就被人客客气气地请了回去。' },
          { kind: 'dialogue', text: '{title}，外头风大。' },
          { kind: 'narration', text: '那人说话时是笑着的，手却按在你肩上。' },
        ],
        next: 'edict',
      },

      waited: {
        id: 'waited',
        blocks: [
          { kind: 'narration', text: '早膳照常送来了，还热着。' },
          { kind: 'narration', text: '伺候的人换了三个，一个熟脸也没有。' },
          { kind: 'narration', text: '你问{dam}在哪里。没有人回答你。' },
        ],
        next: 'edict',
      },

      edict: {
        id: 'edict',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'household', standing: -60 },
          { type: 'family', id: 'father', alive: false, note: '大行皇帝。你没有见到最后一面。' },
          { type: 'family', id: 'mother', note: '随你迁出京城。头发白了一半。' },
          { type: 'identity', identity: '庶人' },
          // 身份改了不等于日子改了：削了封号他仍然可能住在宫里。
          // 这一行说的是另一件事——**他不再过宫里的日子了**。
          // 少了它，条件上他到死都还在宫里：`{ living: { hasChore: true } }`
          // 那个去处对他一直关着，`{chore}` 也还念着宫里那份空
          { type: 'living', living: 'fallen' },
          { type: 'flag', key: 'the-fall', value: true },
          { type: 'flag', key: 'exiled', value: true },
          // 真的搬家，不只是人到了那里——否则收尾那一卷一句「你回到家」
          // 会把他送回东宫。
          //
          // `takes` 只写母妃一个，因为旨意里只有你们两个名字。
          // **兄长没被列到，不是遗漏，那正是这一格存在的理由**：
          // 他即了位，留在宫里，仍然活着，你跟他那条边一条也没断——
          // 只是从这天起你不会再天天见着他。
          { type: 'home', place: '{province} · {prefecture} · 城南小院', takes: ['mother'] },
          {
            type: 'aspect',
            key: 'learning',
            self: '你在宫里念过书，读的都是好书。可那些书教的东西，出了宫墙就没有用了。',
          },
          { type: 'chronicle', text: '父皇大行。你被除去封号，迁往{province}。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'divider', variant: 'ink' },
          { kind: 'narration', text: '三天后有旨意下来。' },
          { kind: 'narration', text: '很长，读了半炷香。你只听懂了几句。' },
          { kind: 'event', text: '父皇大行。你的一位兄长即了位。', tone: 'cinnabar' },
          {
            kind: 'narration',
            text: '你和{dam}的名字都在旨意里，后面跟着「迁{province}安置」几个字。',
          },
          { kind: 'narration', text: '封号除了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '走的那天下着雪。车队出城时，没有人来送。' },
          { kind: 'narration', text: '路上走了四十天。{dam}一路都很安静。' },
          {
            kind: 'narration',
            text: '到{prefecture}的时候是开春。给你们安置的是城南一处小院，两进，有口井。',
            tone: 'faint',
          },
          { kind: 'narration', text: '院墙很矮。你站在院里，能听见外头街上有人在叫卖。' },
        ],
        choices: [
          {
            id: 'street',
            label: '开门出去，走到街上',
            echo: '你把院门打开了。',
            effects: [
              { type: 'time', months: 4 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'body', delta: 4 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'flag', key: 'walked-out', value: true },
              // 开门出去的那个，两年后手上有东西了——院里那口井从前有人替他打水。
              // 这一格跟隔壁「把门关上」的分别不是文辞上的：
              // `market` 有 chore，`fallen` 没有，于是「帮家里干活」那个去处
              // 只对走出去的这个开
              { type: 'living', living: 'market' },
              {
                type: 'aspect',
                key: 'body',
                self: '你这两年学着自己走路、自己买东西。手上磨出了一点茧。',
              },
            ],
            next: 'outside',
          },
          {
            id: 'inside',
            label: '把门关上',
            echo: '你把门关上了。',
            // 这一支**故意没有** living 效果：把门关上的人日子没有变，
            // 他接着过 `edict` 那一节定下的 `fallen`。
            // 补一句 `living: 'fallen'` 不会出错（同一种日子不记第二笔），
            // 但那样就把「什么也没发生」写成了一件事
            effects: [
              { type: 'time', months: 4 },
              { type: 'attribute', key: 'will', delta: 6 },
              { type: 'attribute', key: 'insight', delta: 3 },
              { type: 'flag', key: 'stayed-in', value: true },
              {
                type: 'aspect',
                key: 'learning',
                self: '你把带出来的书又读了一遍。除了读书，你也不会别的。',
              },
            ],
            next: 'shut',
          },
        ],
      },

      outside: {
        id: 'outside',
        /**
         * 街口那个卖炊饼的。
         *
         * 这一处是「换了地方过日子，就会遇见新的人」在内容层的第一个落点，
         * 而它要紧的地方在于**它什么也没有删**：宫里那些人一个没少，
         * 母妃跟着搬来了，即位的兄长还在京城活着，你跟他们的边一条没断。
         * 新生活只是在这张图上添了一个人。
         *
         * `who` 写全了才算把他记进世界——不写的话他只是人际面板上一行字，
         * 不是一个站在街口的人，也就谈不上「在你身边」。
         * `bond: '友'` 添的是新的一条边，`bind` 只往后添，
         * 不覆盖任何旧的（见 `stores/people.ts`）。
         */
        onEnter: [
          {
            type: 'meet',
            id: 'baker',
            calls: '街口卖炊饼的',
            who: { surname: '周', given: '大', gender: '男', age: 44, trade: '炊饼摊' },
            bond: '友',
            delta: 8,
            note: '头一个不知道你从前是谁的人。他只当你是城南新搬来那家的孩子。',
          },
        ],
        blocks: [
          { kind: 'narration', text: '街上没有人认得你。' },
          { kind: 'narration', text: '你走过去，没有一个人矮下去一截。' },
          { kind: 'event', text: '这是你这辈子第一次一个人走在路上。' },
          { kind: 'narration', text: '卖炊饼的问你要几个。你答不上来，因为你不知道价钱。' },
          { kind: 'narration', text: '他没笑你，掰了半个给你，说下回带钱来。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '此后两年，你学会了很多从前不用学的事。' },
          { kind: 'narration', text: '怎么问价，怎么挑水，怎么在下雨天走泥路不摔跤。' },
          /**
           * 这两句是「称谓语境」那一层唯一一处让读者直接看见的地方。
           *
           * `{dam}` 在这儿落成「娘娘」——宫里长大的孩子就是这么叫娘的
           * （不是戏台上那套「母后」）。而他现在住在城南的巷子里，
           * 身上的封号三天前就除了。**别人怎么称呼他，那天就改了；
           * 他怎么称呼别人，改不掉。** 两个方向的来源本来就不一样：
           * 一个跟着身份走，一个跟着教养走，见 `engine/address.ts`。
           *
           * 上一句「你学会了很多从前不用学的事」说的是他学得会的那些。
           * 这一句说的是学不会的——**口音是最后一件跟着人走的东西。**
           */
          { kind: 'narration', text: '有一回你在巷口叫了一声{dam}，卖菜的回头看了你一眼。' },
          { kind: 'narration', text: '那两个字你从会说话起就这么叫，改不过来。' },
          { kind: 'narration', text: '街口那个摊子你每天都过，后来他见了你会先开口。' },
          {
            kind: 'narration',
            text: '你从前读的那些书，一句也用不上。',
            tone: 'faint',
          },
        ],
      },

      shut: {
        id: 'shut',
        blocks: [
          { kind: 'narration', text: '你把门关上，在院里站了很久。' },
          { kind: 'narration', text: '外头的叫卖声还是听得见。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '此后两年，你很少出那道门。' },
          { kind: 'narration', text: '带出来的书不多，你翻来覆去读了很多遍。' },
          { kind: 'narration', text: '{dam}有时坐在廊下看你，什么也不说。' },
          {
            kind: 'narration',
            text: '你有时候会想，那些人现在在做什么。想完了也就算了。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 削藩。
   *
   * 王府那一条的对应物，比皇室温和些——不死人，只是搬家。
   * 但对一个十几岁的孩子来说，结果是一样的：
   * 他从一个所有人都跪着的地方，搬到了一个没人认得他的地方。
   *
   * ## 这一卷分三节，是为了让同一个人被叫三个名字
   *
   * 三节里 `{elder}` 指的都是他爹，落出来的却是三个词：
   *
   * - `open` 标了 `manner: '礼上'`，爵位还在——**王爷**。
   * - `home` 是家常，爵位还在——**父王**。同一天，隔一道门。
   * - `after` 是家常，爵位换成了查不到的「宗室」——**父亲**。
   *
   * 前两节的分界是**礼**，不是地点：《礼部志稿》卷十六，亲王入朝，
   * 在朝廷则君臣礼，至便殿则叙家人礼。后两节的分界才是那道旨意。
   *
   * 三节各自都不解释这件事，正文里一个字也没提「称呼变了」——
   * 玩家是从那三个词上读出来的。这是这一层唯一说得出口的验收标准。
   */
  'royal:demote': {
    id: 'royal:demote',
    title: '削爵',
    entry: 'open',
    nodes: {
      /**
       * 宣旨。这一节是跪着听完的，所以标礼上。
       *
       * 搬家和爵位那几笔不在这儿落：旨意念完人还没走，
       * 而「街坊都知道搬来了个从前的王爷」得等他真搬过去。
       */
      open: {
        id: 'open',
        manner: '礼上',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'household', standing: -48 },
          { type: 'identity', identity: '寓公之子' },
          { type: 'flag', key: 'the-fall', value: true },
          { type: 'flag', key: 'demoted', value: true },
          { type: 'chronicle', text: '父亲被削了爵。全家迁出王府。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '那一年京里来了两回人。第二回带的是旨意。' },
          { kind: 'narration', text: '罪名有七条，念了很久。{elder}一直跪着，没有辩。' },
          { kind: 'event', text: '爵削了。府邸收回。' },
          { kind: 'narration', text: '没有抄家，也没有下狱——旨意里说，念在宗亲，从宽。' },
        ],
        next: 'home',
      },

      /**
       * 搬过去。爵位这时候还挂在他身上，于是这一节里他还是「父王」。
       *
       * 「你还是照旧叫他{elder}」那一句是有意写出来的：
       * 旨意昨天就念完了，称呼今天还没变。**两件事本来就不同步**，
       * 而下一节才是它真正塌下来的地方。
       */
      home: {
        id: 'home',
        onEnter: [
          // 跟皇室那一卷同一种日子，**虽然身份不是同一个**：
          // 那边叫庶人，这边叫寓公之子，而两家过的都是「屋子还在，营生没有」。
          // 这一处并列正是 identity 与 living 分开的理由本身
          { type: 'living', living: 'fallen' },
          // 「全家迁出王府」——正文明写的，所以这里是举家。
          // 跟隔壁那一卷的分别正在这里：那边只有母子二人走
          { type: 'home', place: '{province} · {prefecture} · 城西旧宅', takes: '举家' },
        ],
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '搬家用了十几天。带走的东西比你想的少得多。' },
          {
            kind: 'narration',
            text: '新住处在{prefecture}城里，三进的院子，比王府小了不知多少倍。',
          },
          { kind: 'narration', text: '街坊都知道搬来了个从前的王爷，头几个月总有人在门口张望。' },
          { kind: 'narration', text: '后来就没人看了。' },
          {
            kind: 'narration',
            text: '你还是照旧叫他{elder}。院子小了，那两个字听着比从前响。',
          },
        ],
        next: 'after',
      },

      /**
       * 爵位这一格在这里换成「宗室」——一个爵位称呼表里查不到的值。
       *
       * 查不到就落回教养那一层，于是「父王」自己变成了「父亲」。
       * **没有一处代码去删那个词**，也没有一句正文说「他不再是亲王了」。
       * 跟 `content/address.ts` 那段注释是同一件事的两面：
       * 削爵不需要清除语义，只需要换一个查不到的值。
       */
      after: {
        id: 'after',
        onEnter: [
          { type: 'family', id: 'father', rank: '宗室' },
          { type: 'family', id: 'father', note: '削爵之后闭门不出。话比从前更少了。' },
        ],
        blocks: [
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '过了年，家里不再提「王府」两个字了。' },
          {
            kind: 'narration',
            text: '你后来管他叫{elder}。改口那天没有人提起，也没有人问。',
            tone: 'faint',
          },
          {
            kind: 'narration',
            text: '{elder}把那身蟒袍收进了箱子。此后你再没见他拿出来过。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const royalEvents: readonly LifeEvent[] = [
  {
    // 钦天监的门只开那么一次。撞不撞得上要看运气，进不进去要看你自己
    id: 'royal-observatory',
    window: { from: 9, to: 14 },
    requires: [{ trade: '皇室' }],
    scene: 'royal:observatory',
    weight: 10,
  },
  {
    /**
     * 墙塌下来的那一年。
     *
     * 入场券是七岁开蒙那天掷出来的那一签，不是权重——
     * 交给年表去掷的话，链优先会让它必然发生，
     * 于是每一个皇子都在十五岁那年被废。那不是命运，那是剧本。
     *
     * 掷中了的，窗口只有三年：赶在渡口那一卷之前，
     * 好让他以一个普通人的身份站到江边。
     *
     * 这不是给他的补偿。这只是发生了。
     */
    id: 'royal-fall',
    window: { from: 13, to: 15 },
    requires: [{ trade: '皇室' }, { flag: { key: 'court-fate', equals: '倾' } }],
    chain: CHAIN,
    scene: 'royal:fall',
    weight: 200,
  },
  {
    // 削藩比夺嫡常见，但同样是早就掷定的。没摊上的，
    // 十六岁那年就以世子的身份站在渡口——那也是一种人生
    id: 'royal-demote',
    window: { from: 12, to: 15 },
    requires: [{ trade: '王府' }, { flag: { key: 'court-fate', equals: '倾' } }],
    chain: CHAIN,
    scene: 'royal:demote',
    weight: 200,
  },
]
