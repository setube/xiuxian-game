import type { Choice, SceneLibrary } from '@/types/game'

/**
 * 「日子接着过」。
 *
 * 后三卷里有四节是往关系网里放人的（娶、嫁、添丁、收徒）。
 * 那几节走完不能直接 `next: null`——节点上的 `next` 只收卷名或节点名，
 * 回年表得由玩家自己按一下。
 *
 * 这一下也必须花掉时间。它不是「确认」按钮：`{ type: 'time' }` 是
 * 日常唯一的出口，一个不耗时间的收尾会让「成家」这条路比别的路便宜一年，
 * 而那一年会在这个人的一生里一直算下去。
 */
const SETTLE_IN: Choice = {
  id: 'settle-in',
  label: '日子接着过',
  echo: '日子接着过。',
  effects: [{ type: 'time', years: 1 }],
  next: null,
}

/**
 * 日常。
 *
 * 年表挑不出事的时候，人就回到这里。这不是填充物——
 * 一生中绝大多数年头本来就什么也没发生，你只是在过日子。
 *
 * 两条硬规矩：
 *
 * 1. **每个选项都必须花掉时间。** 时间是这局游戏里唯一真正稀缺的东西，
 *    也是日常的唯一出口：不耗时间，年表永远抽不到下一件事，人就卡在原地。
 * 2. **日常改变的是你是谁，不是你有什么。** 下了三年地和读了三年书，
 *    区别不在数值高低，在于几年之后站在同一件事跟前的是两个不同的人。
 *
 * ## 十七岁往后，第二条规矩多了一层
 *
 * 前三卷（幼年、启蒙、少年）改的确实只是「你是谁」——一个孩子
 * 除了自己什么也支配不了。后三卷不一样：说亲、添丁、收徒
 * 都会往关系网里放进一个真的人，而那个人此后一直在。
 *
 * 这不是把日常改成了发奖品。区别在于**这些人是会走的**：
 * 配偶会先你而去，孩子会长大搬走，徒弟接了活就少来了。
 * 落幕那一卷问「身边有没有人」，问的就是这里放进去的那几个。
 *
 * ## 六卷各自对着一个阶段，每一卷都必须真的有人走到
 *
 * 从前只有四卷，而成年那一卷谁也走不到——十六岁之后年表候选池
 * 永远不空（渡口那件事霸着），日常轮不上。看住这件事的是
 * `verify.ts` 第六道；它今天守的是反过来的判据。
 */
export const routineScenes: SceneLibrary = {
  'routine:child': {
    id: 'routine:child',
    title: '这些日子',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        // 抬头看一眼外头。一年一两句，攒十几年——
        // 玩家那份世界模型就是这么一点一点拼出来的
        onEnter: [{ type: 'signs', limit: 1 }],
        blocks: [
          { kind: 'narration', text: '日子一天一天过去。' },
          { kind: 'narration', text: '你还太小，帮不上什么忙，也没人管你。' },
        ],
        choices: [
          {
            id: 'follow-mother',
            label: '整日跟着{dam}',
            /*
             * 娘还在，才有这一条。
             *
             * 从前它是无条件的，于是**娘没了之后，这一条还在选项里**，
             * 选下去回响一句「你整日跟在母亲身后」，
             * 底下那个 `relation` 还照旧给她加六分好感。
             * 三处错叠在一起：门开着、话说岔了、账记到了一个死人头上。
             *
             * `{dam}` 那个占位符本身是防住了的——`isNearby` 不认死人，
             * 它会落到别的长辈身上。可 `echo` 里的「母亲」是**硬写的**，
             * 占位符防住的那一层，硬写的字直接绕过去了。
             */
            requires: [{ family: { id: 'mother', alive: true } }],
            echo: '你整日跟在{dam}身后。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'relation', id: 'mother', name: '母亲', delta: 6 },
            ],
            next: null,
          },
          {
            id: 'run',
            label: '在外面疯跑',
            // 宫里和王府的孩子出不了那道门——不是不许跑，是门房不放。
            // 第一批内容的事实，不是规则：成年、获准、陪同、溜出去，都出得了（见 `days.ts`）
            requires: [{ dwelling: { kind: ['宅', '寺', '无'] } }],
            echo: '你成天在外面跑。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'body', delta: 3 },
              { type: 'attribute', key: 'fortune', delta: 1 },
            ],
            next: null,
          },
          {
            id: 'nurse',
            label: '整日跟着乳母',
            /*
             * 王府的孩子不是母妃带的，是乳母带的。她是一个真人（`birth.ts` 立的），
             * 有自己留在乡下的孩子——这一条不是「跟着{dam}」换个词，
             * 是另一套照料关系。
             */
            requires: [{ family: { id: 'nurse', alive: true } }],
            echo: '你整日跟在乳母身后。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'insight', delta: 1 },
              { type: 'attribute', key: 'will', delta: 1 },
              { type: 'relation', id: 'nurse', name: '乳母', delta: 8 },
            ],
            next: null,
          },
          {
            id: 'alone',
            label: '一个人待着',
            echo: '你常常一个人待着。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'attribute', key: 'insight', delta: 1 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  'routine:youth': {
    id: 'routine:youth',
    title: '这一年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [{ kind: 'narration', text: '又是一年。' }],
        branches: [{ requires: [{ flag: { key: 'schooled', equals: true } }], next: 'student' }],
        next: 'worker',
      },

      student: {
        id: 'student',
        blocks: [
          { kind: 'narration', text: '早上去私塾，午后散学。回来还要帮家里做点事。' },
          { kind: 'narration', text: '这一年没有什么特别的。' },
        ],
        choices: [
          {
            id: 'study',
            label: '把心思放在书上',
            echo: '这一年你都在念书。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: null,
          },
          {
            id: 'help',
            label: '散学后多帮家里干活',
            echo: '散学之后你都在家里帮工。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'household', standing: 2 },
            ],
            next: null,
          },
          {
            id: 'wander',
            label: '跟同窗到处乱跑',
            echo: '你跟几个同窗把附近跑了个遍。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 2 },
              { type: 'attribute', key: 'body', delta: 2 },
              { type: 'attribute', key: 'fortune', delta: 4 },
            ],
            next: null,
          },
        ],
      },

      worker: {
        id: 'worker',
        blocks: [
          { kind: 'narration', text: '天不亮就起，天黑才回。' },
          { kind: 'narration', text: '这一年没有什么特别的。' },
        ],
        choices: [
          {
            id: 'field',
            label: '一年都在地里',
            echo: '这一年你都在地里。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 7 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'household', standing: 2 },
            ],
            next: null,
          },
          {
            id: 'watch',
            label: '跟着大人学看天色、认路、辨草木',
            echo: '你留心跟人学了些看天认路的门道。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'body', delta: 3 },
            ],
            next: null,
          },
          {
            id: 'hills',
            label: '农闲时往山里跑',
            echo: '农闲的时候你老往山里跑。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'fortune', delta: 4 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  'routine:teen': {
    id: 'routine:teen',
    title: '这一年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [
          { kind: 'narration', text: '你个子高了不少，家里人说话开始带上你了。' },
          { kind: 'narration', text: '这一年要怎么过，多少能由自己说了算。' },
        ],
        choices: [
          {
            id: 'earn',
            label: '出去做工，挣几个钱',
            hint: '家里能松一口气',
            echo: '这一年你在外面做工。',
            /*
             * 高墙里头的人不出去做工。
             *
             * 问的是 `living`（他现在过什么日子）而不是 `station`（玉牒上写着什么）：
             * 削爵之后日子变成 `fallen`，这扇门自己就开了——
             * **门第塌了的宗室，是真的要出去挣这口饭的**，
             * 而那正是那一册要说的话。
             */
            requires: [{ living: { notIn: ['palace', 'manor', 'up-there'] } }],
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'household', standing: 5, debt: -4 },
            ],
            next: null,
          },
          {
            id: 'train',
            label: '天天练力气',
            echo: '你天天在院子里折腾自己。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'body', delta: 9 },
              { type: 'attribute', key: 'will', delta: 4 },
            ],
            next: null,
          },
          {
            id: 'town',
            label: '有空就往城里跑',
            hint: '路远，来回要两日',
            echo: '你一有空就往城里跑。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'fortune', delta: 5 },
              { type: 'household', standing: -2 },
            ],
            next: null,
          },
          {
            id: 'read',
            label: '把认得的那些字捡起来',
            requires: [{ knowledge: 'literacy' }],
            echo: '你把丢下的书又翻了出来。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 8 },
              { type: 'attribute', key: 'will', delta: 2 },
            ],
            next: null,
          },
        ],
      },
    },
  },

  /**
   * 十七岁到二十九岁。
   *
   * ## 这一卷从占位内容变成了真入口
   *
   * 上一版它走不到，而且是被四个数字合起来堵死的：渡口那一卷
   * 从十六岁起一直霸着年表候选池，池子不空就轮不到日常。
   * 那四个数字凑出来的效果只有一个——**人生在十六岁那年结束**。
   * `verify.ts` 第六道当时守着那个凑法，今天它守的是反过来的事：
   * 每一档日常都必须真的有人走到。
   *
   * ## 十六岁改变的是谁在替你做决定
   *
   * 少年那一卷的开场是「家里人说话开始带上你了」——**带上**，
   * 那还是别人在决定。这一卷的选项里有成家、有出远门、有盘下一间铺子，
   * 每一条都是他自己往下按的。这才是十六岁真正的分水岭，
   * 不是「有没有在十六岁以前碰上修仙」。
   *
   * ## 这不是一张职业菜单
   *
   * 选项写的是**这两年你干了什么**，不是「请选择你的职业」。
   * 区别在于它们各自的开关：识字的人才有替人写算这一条，
   * 身子骨结实的人才走得动远路，听说过修行的人才会接着打听。
   * 一个没读过书、没出过村、没听人提过修士的人，
   * 打开这一卷只有守着地和出门做工两条——**那正是他这一生挣来的选项数**。
   *
   * 一件明写的缺口：十七岁之后年表几乎是空的（现有事件的窗口
   * 三十一件封顶在十六岁）。所以这三卷日常眼下独自撑着人生的后半段，
   * 它们承担的分量比前面三卷重得多。
   */
  'routine:adult': {
    id: 'routine:adult',
    title: '这两年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [{ kind: 'narration', text: '又过了一程。' }],
        seen: [
          {
            requires: [{ bond: { kind: '配偶', alive: true } }],
            text: '家里如今有两个人吃饭。有些话不用说完，对方也知道你要说什么。',
          },
          {
            requires: [
              { bond: { kind: '生父', alive: false } },
              { bond: { kind: '生母', alive: false } },
            ],
            text: '爹娘都不在了。有些事情从此没有人可以问。',
          },
          {
            requires: [{ flag: { key: 'heard-of-cultivators', equals: true } }],
            text: '关于那些人的说法，你偶尔还会想起来。这些年你没再见过第二回。',
          },
          // 兼业留在这一家身上：荒年挑起的那副担子，到你成年了还在门后靠着
          {
            requires: [{ sideline: '挑柴' }],
            text: '农闲的时候，挑柴进镇那一趟如今是你去。',
          },
          // 贴补是这一家的，不是娘一个人的：娘没了，灯下那点活计换了人接着做
          {
            requires: [{ sideline: '针线' }, { family: { id: 'mother', alive: true } }],
            text: '家里还接着针线活。灯下那点活计，多半是{dam}的。',
          },
          {
            requires: [{ sideline: '针线' }, { family: { id: 'mother', alive: false } }],
            text: '家里还接着针线活。娘不在了，灯下那点活计换了人。',
          },
        ],
        choices: [
          {
            id: 'keep',
            label: '守着家里的活计',
            echo: '你守着家里的活计过了这两年。',
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'body', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
            ],
            next: null,
          },
          {
            id: 'earn',
            label: '出门做工，挣几个钱回来',
            hint: '在外头的日子不好过，但家里能宽裕些',
            echo: '这两年你多半在外头做工。',
            // 理由同少年那一卷：高墙里头的人不出去做工，削爵之后才开
            requires: [{ living: { notIn: ['palace', 'manor', 'up-there'] } }],
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'body', delta: 5 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'household', standing: 6, debt: -5 },
            ],
            next: null,
          },
          {
            id: 'letters',
            label: '替人写写算算',
            requires: [{ knowledge: 'literacy' }],
            hint: '认得字的人不多，总有人来求',
            echo: '这两年常有人拿着东西来求你写两笔。',
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'household', standing: 2 },
              { type: 'flag', key: 'known-for-letters', value: true },
            ],
            next: null,
          },
          {
            id: 'far',
            label: '往远处走一趟',
            requires: [{ attribute: { key: 'body', atLeast: 40 } }],
            hint: '路远，一去就是一两年',
            echo: '你出了一趟远门。',
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'insight', delta: 7 },
              { type: 'attribute', key: 'fortune', delta: 6 },
              { type: 'attribute', key: 'body', delta: -2 },
              { type: 'flag', key: 'been-far', value: true },
            ],
            next: null,
          },
          {
            id: 'ask',
            label: '接着打听修行的事',
            requires: [{ flag: { key: 'heard-of-cultivators', equals: true } }],
            hint: '这些年问过很多人，多半是些无稽之谈',
            echo: '你还在四处打听。',
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'fortune', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'flag', key: 'still-asking', value: true },
              // 打听了两年，心里那个念头该长一回——成年段没有一卷收日，念头层不在这儿点就一辈子冻着
              // （`leanings.ts` 的 `kept-asking` 那条火种读 `still-asking`）
              { type: 'reflect' },
            ],
            next: null,
          },
          {
            /*
             * 「守着这个家过」——成年那几年最常见的那一种，也是最没有故事的一种。
             *
             * 它是搬走成家那三节之后补进来的。**不是为了凑数**：那三节一走，
             * 这一节只剩「出远门」「打听修行」两条留痕的路，于是八成的人都出了远门，
             * 老年那一节的所见跟着塌成一种（`seen.ts` 当场红：
             * 「过半的人读到的是同一种组合」）。
             *
             * 补它回来的道理跟长尾日常是同一条：**大多数人的成年就是什么也没发生**，
             * 而「什么也没发生」得有个人替它占住位置，否则剩下的人会全被挤到
             * 那几条有故事的路上去。
             */
            id: 'stay',
            label: '守着这个家过',
            hint: '田还是那些田，日子还是那些日子',
            echo: '这几年你没出过远门。',
            effects: [
              { type: 'time', years: 2 },
              /*
               * 这两年过去了，心里那个念头该长一回。
               *
               * **成年段从前一处也没有**（`illness` 8–16、`leaving` 10–16 那两册的
               * `reflect` 都在十六岁之前收），于是处境类的念头在成年之后一根火种
               * 也点不着——2026-09-10 实测：`rich` 八根火种总分 18、门槛正好 18，
               * 200 世里 1 世够到「反复」；`strong` 峰值卡在 17，一次也没越过去。
               *
               * 那不是稀有，是**算术上就差着**：分值最大的三根是 `once`，
               * 一辈子只点一次，而「爹不在家」「家里的债」是持续三十年的处境。
               */
              { type: 'reflect' },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'attribute', key: 'body', delta: 2 },
              { type: 'flag', key: 'stayed-put', value: true },
            ],
            next: null,
          },
          {
            /*
             * 这一条从「说一门亲事」改成了「托人问问」。
             *
             * 从前它是一步跳过去的：选中 → 一年过去 → 屋里多了一个人。
             * 那不是娶亲，是**把结果直接写进世界**——而婚姻恰恰是这个时代里
             * 最不由一个人说了算的事（尊长主婚、媒妁、婚书、聘财都有制度约束）。
             *
             * 现在这一条只表达一个意思：**你托了人，接下来等消息。**
             * 成不成、什么时候有人上门，由 `match:offer` 那一卷定
             * （`content/life/match.ts`），而那一卷可能一辈子也掷不到——
             * 一辈子没人来提亲的人生是成立的。
             *
             * 底下的 `wed` / `wife` / `husband` 三节已经搬进那一册，这里不再有落点。
             */
            id: 'wed',
            label: '托人问问亲事',
            hint: '成不成、什么时候有信，都不由你',
            requires: [
              { age: { atLeast: 18 } },
              { bond: { kind: '配偶', alive: false } },
              // 已经在议的不必再托——这一条是过程中状态在日常里的第一个用处
              { undertaking: { not: 'betrothal' } },
            ],
            echo: '你托了人。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'flag', key: 'asked-for-a-match', value: true },
            ],
            next: null,
          },
        ],
      },

      /*
       * 成家那三节（wed / wife / husband）搬去 `content/life/match.ts` 了。
       *
       * 它们从前挂在「说一门亲事」那条选项底下，选中就是一步到位：
       * 一年过去、拜堂、屋里多个人。搬走不是为了整理文件，是因为
       * **那一步跳过了议亲**——而这个时代里，一门亲事成不成不由当事人一句话定。
       *
       * 那一册里同样的三节还在，只是前面多了：有人来提、长辈打听、
       * 你愿不愿意、成或不成。原来注释里那句「等哪天写出说亲那一卷
       * （相看、议聘、退婚都在里头），那个姓该由那一卷自己掷」——
       * 那一卷现在写出来了，姓仍旧写死一个「秦」，这处将就跟着搬了过去。
       */
    },
  },

  /**
   * 三十到四十九岁。
   *
   * 这一段的重心从「往外闯」挪到「守着已经有的」：手上的活计、
   * 家里的老人、底下的孩子。选项还是那条纪律——
   * **能做什么由你已经有什么决定**，没成家的人这一卷里没有孩子可教。
   *
   * 「收个徒弟」不是职业系统里的师门，是一件很具体的事：
   * 你会点东西，有人愿意跟着学。它的开关是识字或者眼力够——
   * 你得真的有点东西能教。
   */
  'routine:prime': {
    id: 'routine:prime',
    title: '这几年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [{ kind: 'narration', text: '几年一晃就过去了。' }],
        seen: [
          {
            requires: [{ bond: { kind: '子', alive: true } }],
            text: '孩子长得比你想的快。有时候你看他做事的样子，会想起自己那个岁数。',
          },
          {
            requires: [{ bond: { kind: '女', alive: true } }],
            text: '家里那个丫头已经能搭手做事了。',
          },
          {
            requires: [{ flag: { key: 'been-far', equals: true } }],
            text: '你出过一趟远门。这些年提起来，村里人还爱听。',
          },
          {
            // 跟上一条对着的那一面：一辈子没出过远门的人，老了记得的是别的东西。
            // 两条都在，老年那一节的所见才有第二种来源——不然八成的人读到同一句话
            requires: [{ flag: { key: 'stayed-put', equals: true } }],
            text: '你这辈子没走出过几十里地。村口那条路通向哪里，你只听人说过。',
          },
          /*
           * 山上有人这件事，知道了就一直知道——而且没有人可说（27.md：真实存在但极少公开）。
           * 两句各读一层：知道山上有人的；山上也知道有他的。后一句到这儿为止，往下没有下文——
           * 那正是 30.md 那一片的边界，不是漏写。
           */
          {
            requires: [
              { knowledge: 'the-mountain-above' },
              { flag: { key: 'known-on-the-mountain', absent: true } },
              { flag: { key: 'told-spouse-about-the-mountain', absent: true } },
              { flag: { key: 'talked-about-the-mountain', absent: true } },
            ],
            text: '你知道山上有人。这些年你没跟谁说过这件事。',
          },
          {
            requires: [{ flag: { key: 'known-on-the-mountain' } }],
            text: '山上的人问起过你。此后再没有下文，你也没有去问。',
          },
          // 见过一个不老的人（`mountain:unaged`）。稀卷的收尾写在卷上，这儿只留一句，样本凑得齐再判
          {
            requires: [{ knowledge: 'he-does-not-age' }],
            text: '药庐那位还是那个样子。你已经不去想这件事了。',
          },
          /*
           * 「别出去乱说」那条规矩的三种下场（跟配偶说了、瞒住了、被赶出来了）**不写在这儿**：
           * 那三面旗随机人生里千分之一以下，`seen.ts` 那一层判的是「常到的节上哪一句没人读到」，
           * 三千世也凑不齐样本，只会一批红一批绿。三种下场各自的收尾写在那三卷自己身上
           * （`mountain:asked-home` / `asked-lane` / `shut`），`scripts/mountain.ts` 在有心人那一批里验。
           */
        ],
        choices: [
          {
            id: 'steady',
            label: '把手上的事做扎实',
            echo: '这几年你把手上的事做得很稳。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'will', delta: 5 },
              { type: 'household', standing: 2, debt: -3 },
            ],
            next: null,
          },
          {
            /*
             * 从前这一条是「添个孩子」：选中 → 一年过去 → 屋里多个孩子，
             * 一次也没落空过。而那写的是**这个人想不想要孩子**，
             * 不是**这个人有没有孩子**——两件事在这个时代里差着十万八千里。
             *
             * 那一整段搬去了 `bearing.ts`，在那儿它有三个同层的结局
             * （活下来 / 没留住 / 这些年一直没动静）。
             *
             * 这里留下的只表达「你们盼着这件事」，**盼不盼得来不由这一条说了算**。
             * 两条并存的话玩家仍能绕过那一卷直接得到孩子，所以底下不再造人。
             */
            id: 'bear',
            label: '想要个孩子',
            requires: [{ bond: { kind: '配偶', alive: true } }, { age: { atMost: 42 } }],
            hint: '家里人也在等这件事',
            echo: '家里都盼着添个人口。',
            effects: [{ type: 'time', years: 1 }],
            next: null,
          },
          {
            id: 'elders',
            label: '把老人接过来照看',
            // 底下的效果点名 `id: 'mother'`，条件就得问这一个人。
            // `bond: { kind: '生母' }` 问的是「这层关系里还有没有活人」，
            // 那跟「娘还在不在」不是同一句话——**正文点名说谁，条件就问谁。**
            requires: [{ family: { id: 'mother', alive: true } }],
            hint: '她一个人在那边，你不太放心',
            echo: '这几年你把老人接过来照看。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'relation', id: 'mother', name: '母亲', delta: 10 },
              { type: 'household', standing: -3 },
            ],
            next: null,
          },
          {
            id: 'teach',
            label: '收个徒弟',
            requires: [{ knowledge: 'literacy' }],
            hint: '你手上这点东西，总得有人接着',
            echo: '你收了个徒弟。',
            effects: [{ type: 'time', years: 2 }],
            next: 'teach',
          },
          {
            id: 'seek',
            label: '还在琢磨那件事',
            requires: [{ flag: { key: 'still-asking', equals: true } }],
            hint: '这么多年了，你自己也说不清还在等什么',
            echo: '你还在琢磨那件事。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'attribute', key: 'fortune', delta: 3 },
            ],
            next: null,
          },
        ],
      },

      /*
       * 添丁那三节（bear/son/daughter）搬去了 `bearing.ts`。
       *
       * 从前它们在这儿是：选中「添个孩子」→ 一年过去 → 屋里多个孩子，
       * **一次也没落空过**。搬走之后它有三个同层的结局：
       * 孩子活下来、孩子没留住、这些年一直没有动静。
       *
       * 两处旧账跟着搬过去了，都还成立：
       *
       * 一、**生男生女得真的掷一次**。从前写死「是个男孩」，于是全作
       *     生不出女儿——`{ bond: { kind: 女 } }` 这一问在任何地方都不可能成立，
       *     落幕那一行、底下「教孩子认字」那一行，全都白写。
       *     那不是一处偏见，是一处偷懒，可读起来跟偏见没有分别。
       *
       * 二、**`meet.id` 是剧本里写死的字串，同一个 id 只造一次**，
       *     所以一世里最多一儿一女。那是明写的将就，不是模型限制。
       */
      teach: {
        id: 'teach',
        onEnter: [
          {
            type: 'meet',
            id: 'apprentice',
            calls: '徒弟',
            delta: 12,
            name: true,
            who: { surname: '李', given: '小乙', gender: '男', age: 13, doing: '跟着你学' },
            bond: '徒',
          },
        ],
        blocks: [
          { kind: 'narration', text: '是邻村的孩子，家里托了人来问。' },
          { kind: 'narration', text: '教了两年，他学得不算快，但肯下功夫。' },
        ],
        /**
         * 32.md 第 11 节那句，而它不需要长生。
         *
         * > 有人：**开始收徒，把师徒关系作为新的家庭。**
         *
         * 那份文档拿它写长生者（活了几百年之后重新找人作伴），
         * 而实测这件事**在凡人身上就是常态**：收徒那一刻（900 世，
         * 收过徒的 855 世，中位 36 岁）——
         *
         *     没有子女在身边   75%
         *     没有配偶在身边   57%
         *     没有长辈在身边   52%
         *     ★ 三样都没有     29%
         *
         * **将近三成的人，徒弟是他此刻唯一在身边的人。**
         *
         * ## 这一句只写事实，不写「他把他当儿子」
         *
         * 那是替他下结论，而这个库通篇不下结论（`descend` 那一卷同一条纪律：
         * 32.md 说「系统绝对不能自动写『你看到自己的后代，非常亲切』」）。
         *
         * 所以写的是**屋子**：多一个人吃饭、多一双鞋在门口。
         * 「新的家庭」这四个字一个也不出现，而玩家读得出来。
         *
         * ## 而底下那一句是它的反面，同样要有
         *
         * 家里满满当当的人收徒，那是另一件事——**徒弟是多出来的一个，
         * 不是填空的那一个**。两句都在，这一节才分得出这两种人生。
         */
        seen: [
          {
            /*
             * 一辈子没成过家的那一路。
             *
             * ## 这一条从前是「四样都不在身边」，而那把两种人生混成了一档
             *
             * `scripts/seen.ts` 报「50.7% 的人读到同一种组合」——判据说得对：
             * **这一节对多数人是同一段。**
             *
             * 真因是 `near: false` 同时罩住了两种完全不同的人：
             *
             *     从来没有过     没成过家、没有孩子
             *     有而不在身边   孩子出嫁了、儿子在外做工、配偶殁了
             *
             * **后一种人屋里也多一个人吃饭，可那件事对他的意思完全不同**
             * ——他有过一屋子人，如今剩他一个。
             *
             * ## 而分开它们要一格新的：`bond.has`
             *
             * 条件层从前**表达不了「一条边也没有」**：
             *
             *     {}                  有这条边
             *     { near: false }     没有边 **或** 有边而人不在 ⚠️
             *
             * 几个 `{}` 并列是「都有」，而 `Condition` 里没有「非」。
             * 所以加了 `has`（见 `types/game.ts` 那一段）——
             * 这是「先有使用者再抽象」的样子：**这一节就是它的第一个使用者。**
             */
            requires: [
              { bond: { kind: '子', has: false } },
              { bond: { kind: '女', has: false } },
              { bond: { kind: '配偶', has: false } },
              // 爹娘还在。这一句里屋里本来就不止他一个——多的是这个孩子
              { bond: { kind: '抚养', near: true } },
            ],
            text: '{elder}多添了一副碗筷，没说什么。',
          },
          {
            /*
             * 没成过家，爹娘也不在了——**屋里从前只有他一个**。
             *
             * ## 这一条是从原来那一句拆出来的，而拆的理由是判据
             *
             * `scripts/seen.ts` 报「56.1% 的人读到同一种组合」——
             * 那 56% 是「没成过家、没有孩子」的人，**而这一档本来就该厚**
             * （多数人一辈子没成过家）。
             *
             * 判据要的不是把这一档切小，是**这一节对不同的人读出不同的话**。
             * 而这 56% 里最真实的分别是**屋里从前有没有别人**：
             *
             *     爹娘还在   多一副碗筷而已，屋里本来就有人
             *     一个人过   夜里听得见另一个人翻身，那是好些年没有过的事
             *
             * 同一件事（收了个徒弟），两种人读出来完全不同。
             */
            requires: [
              { bond: { kind: '子', has: false } },
              { bond: { kind: '女', has: false } },
              { bond: { kind: '配偶', has: false } },
              { bond: { kind: '抚养', near: false } },
            ],
            text: '屋里从此多一个人吃饭。夜里他在外间翻身，你听得见。',
          },
          {
            /*
             * 有过一屋子人，如今剩他一个。
             *
             * **跟上一条互斥**：那一条问「从来没有过」（三条边一条也没有），
             * 这一条问「有过而此刻都不在身边」。
             *
             * 而这一句的重心是「从前」两个字——他不是不知道
             * 屋里有人是什么样，**他是知道了又没有了**。
             */
            requires: [
              // `has: true` 是这一条跟上一条的分界：**他有过**，只是此刻都不在
              { bond: { kind: '配偶', has: true, near: false } },
              { bond: { kind: '子', near: false } },
              { bond: { kind: '女', near: false } },
            ],
            text: '屋里又有了动静。你有点不习惯——从前屋里也是这样的。',
          },
          {
            requires: [{ bond: { kind: '子', near: true } }],
            text: '你自己的孩子跟他差不多大。两个人一起干活，话却不多。',
          },
        ],
        choices: [SETTLE_IN],
      },
    },
  },

  /**
   * 五十岁往后。
   *
   * 这一档不是「等死」——一个六十岁的人在过六十岁的日子，
   * 不是在倒数。天年几时到由 `engine/lifespan.ts` 掷定，
   * 跟这一档是两件事，混起来就会把老年写成一段临终。
   *
   * 选项的重心是**往下交**：手上的活计、见过的事、还没做完的那一件。
   *
   * ## 这一卷四个选项的家境全是负的，那不是在罚他
   *
   * 人老了没有进项，吃的是老本——这一档往下走才是常态。
   * 「把事情交下去」从前写的是 `standing: +4`，而交班不会让家里更宽裕：
   * **交出去的正是那份进项**。
   *
   * 改这几个数之前，`scripts/standing.ts` 印出来的是：咽气那年家境中位 97，
   * 四成六的人正好停在上限 100 上，八成八的人物面板上写着同一句
   * 「家里不缺什么。」——**人人晚年巨富**。
   *
   * 病根不在哪个数太大，也不在「没有往下拿的东西」：`prime` 那一卷本来就有
   * 把老人接过来照看（-3）和家里添了孩子（-4），后半生一直在跌，
   * 改前也有一成六的步数是往下走的。**跌的不是没有，是跌不过涨**——
   * 这一册最要命的一处是让**维持性**的动作也往上抬家境：
   * 「守着家里的活计」+3、「把手上的事做扎实」+6，而它们一辈子要停二十几次。
   * 守着就是守着，日子还是那样，那两处现在一个归零一个降到 +2。
   *
   * 加上这一卷的四个负数之后，中位落到 59，最挤的那个取值只占三个点，
   * 面板上那五句话最常见的一句占四成四。家业这条线于是有了形状：
   * 少年低，壮年挣上去，老年慢慢用回去。
   * **一个人临终时家里是什么光景，从这里才开始有分别。**
   */
  'routine:old': {
    id: 'routine:old',
    title: '这些年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'signs' }],
        blocks: [{ kind: 'narration', text: '手脚不如从前利索了。' }],
        /**
         * ## 这四句从前只有三句，而三句说的都是「你还行」
         *
         * 徒弟能接活了、你算硬朗、写字的活还找你——一个体面老人的三面。
         * 于是五成二的人读到一模一样的一段（`scripts/seen.ts` 判的就是这个），
         * 而正文头一句明明写着「手脚不如从前利索了」。
         *
         * 缺的不是一句更稀的话，是**另一半人生**：这个岁数也有人起身要扶，
         * 冬天难过，什么也不跟家里说。它跟「你算硬朗」互斥，一头一尾各占两三成，
         * 中间那一半的人两句都读不到——那才是大多数人老下去的样子。
         */
        seen: [
          {
            requires: [{ bond: { kind: '徒', alive: true } }],
            text: '徒弟如今自己也能接活了。他有时还来问你，多半是问过了才自己拿主意。',
          },
          {
            /**
             * 「同龄的人里，你算是硬朗的」——这句话的意思是**少数**。
             *
             * 阈值从前写 60，而走到这一节时 body 的中位数是 69：
             * 四分之三的人都读到这句「你算是硬朗的」，它就成了一句废话。
             *
             * 七十五是从分布上取的，不是拍的：三百世量下来
             * ≥70 是 47.2%、≥75 是 32.6%、≥80 是 21.0%。
             * 三成来读它，跟「同龄的人里」这个说法对得上。
             *
             * **这个数会漂**：日常那几档的选项一旦改了 body 的加减，
             * 分布跟着挪，该重新量一次中位数再定，别照抄这里的 75。
             */
            requires: [{ attribute: { key: 'body', atLeast: 75 } }],
            text: '同龄的人里，你算是硬朗的。',
          },
          {
            /**
             * 另一头。五十五这个数同样从分布上取：
             * 走到这一节时 body 的四分位是 59，所以 ≤55 大约两成。
             *
             * 不写成「你病了」——这个岁数身子垮下来不是一场病，
             * 是很多件小事凑起来的，而且多半不跟家里说。
             */
            requires: [{ attribute: { key: 'body', atMost: 55 } }],
            text: '起身要扶一把了。冬天难过，你不太跟家里人说。',
          },
          {
            requires: [{ flag: { key: 'known-for-letters', equals: true } }],
            text: '这些年村里的红白事，写字的活多半还是找你。',
          },
        ],
        choices: [
          {
            id: 'hand-over',
            label: '把事情交下去',
            echo: '你把手上的事一样一样交了出去。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'household', standing: -3 },
            ],
            next: null,
          },
          {
            id: 'sit',
            label: '坐在门口看人来人往',
            echo: '你多半坐在门口。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'insight', delta: 3 },
              { type: 'attribute', key: 'body', delta: -3 },
              { type: 'household', standing: -2 },
            ],
            next: null,
          },
          {
            id: 'tell',
            label: '跟晚辈讲从前的事',
            requires: [{ bond: { kind: '子', alive: true } }],
            echo: '你跟家里的小辈讲了很多从前的事。',
            effects: [
              { type: 'time', years: 3 },
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'relation', id: 'child', name: '孩子', delta: 8 },
              { type: 'household', standing: -2 },
            ],
            next: null,
          },
          {
            id: 'once-more',
            label: '再走一趟远路',
            requires: [{ attribute: { key: 'body', atLeast: 45 } }],
            hint: '这个岁数出远门，家里人是不同意的',
            echo: '你到底还是又出了一趟门。',
            effects: [
              { type: 'time', years: 2 },
              { type: 'attribute', key: 'insight', delta: 6 },
              { type: 'attribute', key: 'fortune', delta: 5 },
              { type: 'attribute', key: 'body', delta: -8 },
              { type: 'household', standing: -4 },
              /*
               * ⚠️ **这一条比它看起来重得多：61% 的人吃到，最多有人吃五次（-10 年）。**
               *
               * 2026-09-10 实测（800 世真跑）：
               *
               *     天年在人生中被改过的   489 / 800 = 61.1%
               *     改动量  p50 -2   最小 -10   最大 -2
               *
               * 它是**全库唯一的负 `lifespan`**，而唯一的正的是
               * `keeping.ts` 的 `+8`（走到那儿的人千分之一量级）。
               * 于是两者的实际影响差着两个数量级：
               *
               *     熬夜 -2   六成人吃到，是凡人终年分布的一部分
               *     练成 +8   几千世一个人
               *
               * **凡人终年 p50=62、而天年 p50=64，那两岁的差整个是这一条造的**
               * （不是夭折——`engine/lifespan.ts:32` 明写着库里一个夭折也没有，
               * 800 世实测「死时还没到自己最终天年的」是 0 世）。
               *
               * 记在这儿是因为它**曾经被我低估过**：我以为它只影响少数人，
               * 于是把那两岁的差归错了地方，差点去找第三个原因。
               */
              { type: 'lifespan', years: -2 },
            ],
            next: null,
          },
        ],
      },
    },
  },
}
