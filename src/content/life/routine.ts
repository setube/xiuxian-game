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
            echo: '你整日跟在母亲身后。',
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
            echo: '你成天在外面跑。',
            effects: [
              { type: 'time', months: 8 },
              { type: 'attribute', key: 'body', delta: 3 },
              { type: 'attribute', key: 'fortune', delta: 1 },
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
        ],
        choices: [
          {
            id: 'keep',
            label: '守着家里的活计',
            echo: '你守着家里的活计过了这两年。',
            effects: [
              { type: 'time', years: 2 },
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
            effects: [
              { type: 'time', years: 2 },
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
              { type: 'attribute', key: 'insight', delta: 4 },
              { type: 'attribute', key: 'fortune', delta: 4 },
              { type: 'attribute', key: 'will', delta: 3 },
              { type: 'flag', key: 'still-asking', value: true },
            ],
            next: null,
          },
          {
            id: 'wed',
            label: '说一门亲事',
            requires: [{ age: { atLeast: 18 } }, { bond: { kind: '配偶', alive: false } }],
            echo: '家里托人给你说了一门亲。',
            effects: [{ type: 'time', years: 1 }],
            next: 'wed',
          },
        ],
      },

      /**
       * 成家。
       *
       * 分流按玩家的性别，不是让玩家挑——**「你要娶还是要嫁」不是一道选择题**，
       * 那是这个时代替他定好的事。这一卷里玩家能决定的是要不要说这门亲，
       * 不是说给谁。
       *
       * 配偶的姓写死一个「秦」，这是一处明写的将就：`meet.who` 省略 surname
       * 表示跟本家同姓，而娶进门的人本来就是外姓，得有个姓。
       * 等哪天写出「说亲」那一卷（相看、议聘、退婚都在里头），
       * 那个姓该由那一卷自己掷。
       */
      wed: {
        id: 'wed',
        blocks: [
          { kind: 'narration', text: '过礼、迎亲、拜堂，几个月就过去了。' },
          { kind: 'narration', text: '从这一天起，{home}这间屋子里多了一个人。' },
        ],
        branches: [{ requires: [{ gender: '女' }], next: 'husband' }],
        next: 'wife',
      },

      wife: {
        id: 'wife',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '妻子',
            delta: 20,
            name: true,
            who: { surname: '秦', given: '娘', gender: '女', age: 18, doing: '操持家务' },
            bond: '配偶',
          },
        ],
        blocks: [{ kind: 'narration', text: '她话不多，手脚很快。' }],
        choices: [SETTLE_IN],
      },

      husband: {
        id: 'husband',
        onEnter: [
          {
            type: 'meet',
            id: 'spouse',
            calls: '丈夫',
            delta: 20,
            name: true,
            who: { surname: '秦', given: '大', gender: '男', age: 22, doing: '做工' },
            bond: '配偶',
          },
        ],
        blocks: [{ kind: 'narration', text: '他话不多，天不亮就出门。' }],
        choices: [SETTLE_IN],
      },
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
            id: 'bear',
            label: '添个孩子',
            requires: [{ bond: { kind: '配偶', alive: true } }, { age: { atMost: 42 } }],
            echo: '家里添了口人。',
            effects: [{ type: 'time', years: 1 }],
            next: 'bear',
          },
          {
            id: 'elders',
            label: '把老人接过来照看',
            requires: [{ bond: { kind: '生母', alive: true } }],
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

      /**
       * 添丁。孩子不写姓——`meet.who` 省略 surname 就是跟本家同姓，
       * 而剧本写不出玩家姓什么（那是出生那一刻掷的，还分嫡出抱养随母姓）。
       *
       * ## 生男生女得真的掷一次
       *
       * 这一卷从前只有一节，写死「是个男孩」，于是全作**生不出女儿**：
       * `{ bond: { kind: '女' } }` 这一问在任何地方都不可能成立，
       * 落幕那一行、这一卷底下「教孩子认字」那一行，全都白写。
       * 那不是一处偏见，是一处偷懒——可读起来跟偏见没有分别。
       *
       * 掷法照 `kin.ts` 那一节的老规矩：空节点掷一次，再按 flag 分流。
       * 儿女各用各的 id，所以一世里两样都添得上——
       * 只是同一样添第二回不会再多一个人（`meet` 认 id，同一个 id 只造一次），
       * 那是**明写的将就**：`meet.id` 是剧本里写死的字串，
       * 眼下没有「生第三个」这种事要它支持。
       */
      bear: {
        id: 'bear',
        onEnter: [
          // 这一掷玩家看不见，只看得见结果
          {
            type: 'roll',
            key: 'newborn',
            among: [
              { value: '男', weight: 50 },
              { value: '女', weight: 50 },
            ],
          },
          { type: 'household', standing: -4 },
        ],
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'newborn', equals: '女' } }], next: 'daughter' }],
        next: 'son',
      },

      son: {
        id: 'son',
        onEnter: [
          {
            type: 'meet',
            id: 'son',
            calls: '孩子',
            delta: 25,
            name: true,
            who: { given: '安', gender: '男', age: 0, doing: '还在襁褓里' },
            bond: '子',
          },
        ],
        blocks: [
          { kind: 'narration', text: '是个男孩。' },
          { kind: 'narration', text: '家里多一张嘴，日子紧了些。你倒是不太在意。' },
        ],
        choices: [SETTLE_IN],
      },

      daughter: {
        id: 'daughter',
        onEnter: [
          {
            type: 'meet',
            id: 'daughter',
            calls: '孩子',
            delta: 25,
            name: true,
            who: { given: '宁', gender: '女', age: 0, doing: '还在襁褓里' },
            bond: '女',
          },
        ],
        blocks: [
          { kind: 'narration', text: '是个女孩。' },
          { kind: 'narration', text: '家里多一张嘴，日子紧了些。你倒是不太在意。' },
        ],
        choices: [SETTLE_IN],
      },

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
              { type: 'lifespan', years: -2 },
            ],
            next: null,
          },
        ],
      },
    },
  },
}
