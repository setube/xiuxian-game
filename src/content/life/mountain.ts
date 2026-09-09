import { PRIME_UP } from '@/engine/stages'
import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 山上下来的人。
 *
 * ## 这一册回答的是：修仙界在哪儿，一个凡人能看见它的哪一面
 *
 * 30.md 那句话：**修仙世界同样先有世界、组织、人物、资源、规则和因果，玩家再进入其中。**
 * 从前库里三个修士各是一个人，谁也不属于哪儿——药庐那位为什么在镇上开药庐，
 * 山道上那个人为什么从山上下来，世界里没有答案。这一册补的是那个答案的第一片：
 *
 *     山上有人。药庐那位是山上的，替上头看着这间药庐几十年了。
 *     山上隔几年打发一个人下来，把备好的药背上去。
 *
 * 玩家在药庐里翻了几年的药，翻的就是往山上送的那几筐——**而他不知道。**
 * 这一册让他撞见一次：某天卯时门关着，里头有人说话，门开了，出来一个背篓子的年轻人。
 *
 * ## 三条不做
 *
 * 一、**不写「山上」是什么。** 叫什么、几个人、什么规矩，一样也不写。一个凡人能看见的
 *     是一个下来取药的人和一只篓子——「历史上存在 ≠ 当前要实例化」（王府那一片定的）。
 * 二、**不收人。** 下来的那个人没有资格挑人，他只是来取药的。走到最后拿到的是一句
 *     「上头问起你了」——山上知道有你这么个人。收不收，是 29.md 那一片的事。
 * 三、**不给认知层任何他没亲眼见、没亲耳听的东西。** 没问的人只知道「有人下山来取药」；
 *     问了而处得不够的人，药庐那位不答；处到了带一段往后他才说那两个字。
 *
 * ## 公开度：真实存在但极少公开（27.md 拍板）
 *
 * 药庐那位说完就是一句「别出去乱说」。玩家知道了山上有人，**没有人可说**——
 * 壮年那一卷读到的是「这些年你没跟谁说过」。
 *
 * ## 第二片：「别出去乱说」是一条规矩，规矩要有后果
 *
 * 30.md：修仙界先有规则和因果，玩家再进入。门内的第一条规矩是陶仲那句「别出去乱说」——
 * 头一片里它只是一句嘱咐。这一片让它咬人：有人问起药庐那边是做什么的（夜里是 {call:spouse}，
 * 巷口是邻家户主），你说了还是没说。跟自家人说，那件事留在家里；跟邻家说，镇上的话传得快，
 * 有一天你到药庐门口，他把戥子放下：「往后不用来了。」——`footing` 回到「不理会」，
 * 师承那条链上的每一件事自然落空，山上也不会再问起你。
 *
 * 后果**只发生在门这一侧**：凡间不知道发生过什么，里长的册子上什么也没变。
 * 那正是「寄生、嵌入、不显形」的意思（`design/cultivation-society.md`）。
 *
 * ## 第三片：他不老——凡人看得见的第一样超凡的东西
 *
 * 30.md 第一层是寿命。引擎里这件事早就成立（`people.live` 跳过有 realm 的人：陶仲比玩家
 * 大七十一岁，玩家从十三岁翻到四十岁他一天也没老），可库里没有一处让凡人**看见**它。
 * 这一卷让他看见：你十几岁头一回进药庐他在称药，二十多年后的今天他还是那个样子；
 * 而你爹背驼了、你自己的手已经不是十几岁的手。**不老是征象，读出来的意思多半是错的**——
 * 知道山上有人的读成「跟山上有关」（见过·确信），不知道的读成「山里人身子骨硬朗」（见过·猜想）。
 * 谁也说不出「修士」两个字（地基文档第 2 条）。
 *
 * 它是 28.md 那句「凡人认为修仙是为了长生」的第一个凡间入口：见过一个不老的人，
 * 「想活得久一点」那个愿望多一根火种（`wishes.ts`）。不通向修行——愿望不必通向任何地方。
 *
 * ## 为什么挂在药庐那条上，不挂在「觉出了一点什么」上
 *
 * 52 建议这一片从 flicker 之后起头。量过（2026-09-09，600 世有心人）：觉出了什么 9 世，
 * 跟药庐那位处到「使唤」62 世、「教一点」47 世。修仙界的接触点得挂在真世里走得到的地方，
 * 而药庐那条是眼下唯一一条有心人十个里一个走得到的路。
 */

const SHED = 'herbalist-at-the-shed'
const FOOTING = `footing:${SHED}`
/** 山上下来的那个人。见 `content/cultivators.ts` */
const VISITOR = 'the-one-who-comes-down'
/** 他上回肯多说两句了没有。`engine/meeting.ts` 记的 */
const OPENED = `opened:${VISITOR}`

/** 处到了这几格，他才在药庐里——下山的人来的时候他才看得见 */
const AT_THE_SHED = ['使唤', '带一段', '教一点'] as const

export const mountainScenes: SceneLibrary = {
  /**
   * 第一回。门关着，里头有人说话。
   *
   * `meeting` 写在 `onEnter` 里：先看见门开了、人出来了，再轮到他看你、你看他。
   * 他理不理你看他量到什么（`opensAt`）——多数时候他从头到尾没看你一眼。
   */
  'mountain:down': {
    id: 'mountain:down',
    title: '山上下来的人',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'meeting', who: VISITOR },
        ],
        blocks: [
          { kind: 'narration', text: '卯时你到的时候，门关着。' },
          { kind: 'narration', text: '里头有人说话。药庐那位的声音你听得出来，另一个不是。' },
          { kind: 'narration', text: '你在门外站了一刻。门开了。' },
        ],
        choices: [
          {
            /**
             * 问他那是谁。
             *
             * 答不答看处到了哪一格：使唤那一格他不答，带一段往后他答两个字。
             * **正文里不说这是为什么**——玩家只会觉得他今天不想说话。
             */
            id: 'ask-who',
            label: '问药庐那位那是谁',
            echo: '你问了。',
            effects: [{ type: 'time', days: 1 }],
            next: 'asked',
          },
          {
            id: 'say-nothing',
            label: '什么也没问',
            echo: '你没有问。',
            effects: [{ type: 'time', days: 1 }],
            next: 'quiet',
          },
        ],
      },

      asked: {
        id: 'asked',
        blocks: [],
        branches: [{ requires: [{ flag: { key: FOOTING, in: ['带一段', '教一点'] } }], next: 'told' }],
        next: 'brushed',
      },

      /**
       * 他答了。两个字，外加一句嘱咐。
       *
       * `recall` 翻的是他身上那一页——「从山上下来，替上头看着这间药庐」。
       * 那件事从他入册那一刻起就是真的（`Cultivator.history`），玩家今天才知道。
       * **认知跟事实分两层**，跟「原来爹年轻时去过北方」是同一套。
       */
      told: {
        id: 'told',
        onEnter: [
          { type: 'recall', id: SHED, chapter: 'keeps-the-shed' },
          // 他嘱咐过你别出去乱说。第二片问的是这面旗：没被嘱咐过的人说出去，不算犯他的规矩
          { type: 'flag', key: 'told-by-the-shed', value: true },
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '山上有人。药庐那位是替他们看着这间药庐的，那些药是往山上送的。',
            category: '修行',
            contact: '亲历',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '药庐那位说，他是替山上看着这间药庐的。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'dialogue', text: '「山上的。」' },
          { kind: 'narration', text: '他没有抬头。' },
          { kind: 'dialogue', text: '「我替他们看着这儿。」' },
          { kind: 'narration', text: '你想问山上是哪儿。他已经低头去称下一味了。' },
          { kind: 'dialogue', text: '「别出去乱说。」' },
          { kind: 'narration', text: '你翻了几年的那几筐药，原来是往山上送的。', tone: 'deep' },
        ],
      },

      /**
       * 他没答。
       *
       * 这一节跟「他今天没理你」是同一种东西：**不答也是一种答**。
       * 认知层落的是「有人下山来取药，你问了，他没说」——不多一个字。
       */
      brushed: {
        id: 'brushed',
        onEnter: [
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '有人从山上下来取药。你问药庐那位那是谁，他没说。',
            category: '修行',
            contact: '见过',
            interpretation: '猜想',
          },
          { type: 'chronicle', text: '有人从山上下来，取走了两筐药。' },
        ],
        blocks: [
          { kind: 'narration', text: '他称完了那一味才抬头。' },
          { kind: 'dialogue', text: '「翻你的药。」' },
          { kind: 'narration', text: '你翻你的药。那天他一句话也没再说。', tone: 'faint' },
        ],
      },

      quiet: {
        id: 'quiet',
        onEnter: [
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '有人从山上下来取药。你没有问那是谁。',
            category: '修行',
            contact: '见过',
            interpretation: '猜想',
          },
          { type: 'chronicle', text: '有人从山上下来，取走了两筐药。' },
        ],
        blocks: [
          { kind: 'narration', text: '药庐那位回来的时候看了你一眼，什么也没说。' },
          { kind: 'narration', text: '你接着翻药。那两筐是空的了。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 再下来。
   *
   * 隔几年，还是那只篓子。这一回要紧的不是他，是**他走之前跟药庐那位说了什么**——
   * 处到了「教一点」的人，药庐那位会提一句；提了，山上就知道有你这么个人。
   *
   * 这一节到「上头问起你了」为止。问起之后怎样——收不收、叫不叫你上去——一个字不写。
   */
  'mountain:again': {
    id: 'mountain:again',
    title: '又下来了',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '隔了几年，那个人又下来了。' },
          { kind: 'narration', text: '还是那只篓子。' },
        ],
        /*
         * 三处分流写成 `branches` 不写成 `seen`：随机人生里走到这一卷的不足千分之二，
         * `seen.ts` 那一层判的是「常到的节上哪一句没人读到」，这里的样本它永远凑不齐，
         * 只会一批红一批绿。这几句该不该出，由 `scripts/mountain.ts` 在有心人那一批里验。
         *
         * 上回他肯多说两句的（`opened:` 那面旗，量到的数够着门槛那一刻世界记下的），这回进门先看了你一眼。
         */
        branches: [
          { requires: [{ flag: { key: OPENED } }], next: 'recognised' },
        ],
        next: 'split',
      },

      recognised: {
        id: 'recognised',
        blocks: [{ kind: 'narration', text: '他进门的时候朝你这边看了一眼，像是认出来了。' }],
        next: 'split',
      },

      /** 处到了教一点的，药庐那位会跟他提一句；身上有了那样东西的，他进门时你正坐着 */
      split: {
        id: 'split',
        blocks: [],
        branches: [
          {
            requires: [
              { flag: { key: FOOTING, equals: '教一点' } },
              { flag: { key: 'rite:quiet-breath:hold', in: ['摸着了', '拿得住'] } },
            ],
            next: 'sitting',
          },
          { requires: [{ flag: { key: FOOTING, equals: '教一点' } }], next: 'noticed' },
        ],
        next: 'same',
      },

      /**
       * 他进门的时候你正坐着。
       *
       * 不写「门槛」：`upbringing.ts` 那张表把它归给有自家门的人——这儿是药庐的门，可机器分不出。
       */
      sitting: {
        id: 'sitting',
        blocks: [
          {
            kind: 'narration',
            text: '他进门的时候你正在门边坐着，照那五句坐着。你没听见他进来，是他站在你跟前你才睁开眼的。',
          },
        ],
        next: 'noticed',
      },

      /**
       * 上头问起你了。
       *
       * 药庐那位跟他说了什么，你没听见。走的时候那个人在门口站了一会儿。
       * 几天后药庐那位说了五个字——**这五个字是这一册的落点**，也是它的边界。
       */
      noticed: {
        id: 'noticed',
        onEnter: [
          { type: 'time', days: 5 },
          { type: 'flag', key: 'known-on-the-mountain', value: true },
          {
            type: 'knowledge',
            id: 'the-mountain-above',
            title: '山上',
            summary: '山上有人，药庐那位是替他们看着这间药庐的。他们知道有你这么个人了。',
            category: '修行',
            contact: '亲历',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '山上的人问起了你。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '他清点的时候，药庐那位在他旁边说了几句。你没听见说的是什么。' },
          { kind: 'narration', text: '走的时候他在门口站了一会儿，看着你。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '过了几天，药庐那位收炉子的时候没让你走。' },
          { kind: 'dialogue', text: '「上头问起你了。」' },
          { kind: 'narration', text: '你等他往下说。他没有往下说。', tone: 'faint' },
        ],
      },

      same: {
        id: 'same',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '他清点，背篓，走。跟上回一样。' },
          { kind: 'narration', text: '你翻你的药。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 他不老。
   *
   * 壮年、还在药庐里的人。这一卷没有选项：看见是一回事，看出什么是另一回事，
   * 而后者由他知不知道山上定，不由他选。三条路只有正文不同，落的都是同一条认知 `he-does-not-age`。
   *
   * 不写「他一根白头发也没有」那种正面描写——凡人看见的是**差**：爹变了、自己的手变了、
   * 他没变。写变的那两样，让不变的那个自己显出来。
   */
  'mountain:unaged': {
    id: 'mountain:unaged',
    title: '药庐 · 他',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '你进去的时候他在称药。称完了拿手指把戥子上的一点碎末抹平。' },
          { kind: 'narration', text: '你头一回进这扇门的时候，他也是这么称的。那时候你得踮着脚才看得见戥子上的星。' },
          { kind: 'narration', text: '你低头看自己的手。虎口那一块也有了茧，指节比从前粗了一圈。' },
        ],
        // 你身边的人老了：爹还在的读爹，爹不在了的读自己的鬓角
        seen: [
          {
            requires: [{ family: { id: 'father', alive: true } }],
            text: '今年春上你爹背驼了，起身要人扶一把。',
          },
          {
            requires: [{ family: { id: 'father', alive: false } }],
            text: '你鬓角去年起有了白的。',
          },
          {
            /*
             * **`Condition.unaged` 的第一个使用者。**
             *
             * 这一句问的是世界事实——「他看着比岁数年轻二十年以上」，
             * 而在这一格之前引擎答不出这个问题：`span: 200` 只说得了
             * 「他能活很久」，说不了「他不老」（`cultivators.ts` 那段注释）。
             *
             * ## 为什么这一句要问，而上头那一卷是写死的
             *
             * `mountain:unaged` 整卷绑死了药庐那位（入场条件写着他的 id），
             * 所以正文里说「他还是那个样子」不会说错人。**可那是靠
             * 内容作者记得，不是靠引擎知道**——换一个不老的人来演这一卷，
             * 它一个字也不认得他。
             *
             * 这一句是引擎第一次自己认出「这个人不老」。它落在 `seen` 上
             * 而不是 `branches`：这一节人人都到（`mountain:unaged`
             * 是走到药庐的人都会碰上的），而这句话只给察觉得到的那些人。
             *
             * ⚠️ 门槛 20 年不是拍的：药庐那位 `bornBefore` 让他初见时
             * 八十四、`seemsAge: 45`，差距一开始就有三十九年——
             * **这一句从第一次见面起就成立**，而它偏偏要等到这一卷
             * （玩家二十多年后再进那扇门）才读得到。**世界事实先成立，
             * 玩家察觉在很多年以后**，那正是这一片要写的东西。
             */
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 } } }],
            text: '他手上没有老人斑。你想起你爹那双手，最后那几年上头全是。',
          },
          /*
           * ## 同一件事，认识得越久读出来的越重
           *
           * 用户 2026-09-10 指出的那个用法：**「他不老」这件事头一次
           * 见面就成立，可察觉它要花很多年。**
           *
           * 玩家十三岁头一回进药庐，这一卷最早三十岁——认识十七年起步。
           * 三句话各自要一段够长的交情才读得到，而它们说的是同一件事：
           *
           *     认识 20 年   还在拿他跟自己比
           *     认识 30 年   开始拿他跟别人比（同辈的都老了）
           *     认识 40 年   不再找解释了
           *
           * ⚠️ 三条都在 `seen` 里，`seen` 是全都判、都成立就都读到——
           * 所以门槛高的那句读到时，底下两句也在。**那正是对的**：
           * 一个认识他四十年的人，二十年前那个念头并没有消失，
           * 只是又压上了两层。
           */
          {
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 }, knownFor: { atLeast: 20 } } }],
            text: '你认识他二十年了。这二十年里你换了两回住处，他还在这间屋子里称药。',
          },
          {
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 }, knownFor: { atLeast: 30 } } }],
            text: '跟他同一辈的人，你能想起来的都已经拄拐了。',
          },
          {
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 }, knownFor: { atLeast: 40 } } }],
            text: '你不再去想这是为什么。你只是每回来都看他一眼，看他还是不是那个样子。',
          },
        ],
        branches: [{ requires: [{ knowledge: 'the-mountain-above' }], next: 'he-is-of-it' }],
        next: 'hardy',
      },

      /** 知道山上有人的：这件事跟山上有关。他不知道怎么有关 */
      'he-is-of-it': {
        id: 'he-is-of-it',
        onEnter: [
          {
            type: 'knowledge',
            id: 'he-does-not-age',
            title: '他不老',
            summary: '药庐那位二十多年没有变样。这跟山上有关，你不知道怎么有关。',
            category: '修行',
            contact: '见过',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '你发觉药庐那位这些年没有老。', tone: 'deep' },
          /*
           * 停下来掂量一回。壮年那一段没有日结、没有一卷收日，念头和愿望那层不在这儿点就一辈子冻着
           * （`routine:adult` 的「接着打听」那条也是为这个加的 reflect）。头一版没加，
           * 有心人三百世发觉了 47 世、长生那根火种点着 0 世——写了火种没人点，有一头是空的。
           */
          { type: 'reflect' },
        ],
        blocks: [
          { kind: 'narration', text: '他还是那个样子。' },
          { kind: 'narration', text: '你想起他说过山上的事。你想这两件事是一件事，可你说不出是怎么一件事。' },
          { kind: 'narration', text: '他称完那一味，抬头看了你一眼，低头去称下一味。', tone: 'faint' },
        ],
      },

      /** 不知道的：山里人身子骨硬朗。这是他能想到的最合理的解释 */
      hardy: {
        id: 'hardy',
        onEnter: [
          {
            type: 'knowledge',
            id: 'he-does-not-age',
            title: '他不老',
            summary: '药庐那位二十多年没有变样。你想山里人身子骨硬朗。',
            category: '修行',
            contact: '见过',
            interpretation: '猜想',
          },
          { type: 'chronicle', text: '你发觉药庐那位这些年没有老。' },
          { type: 'reflect' },
        ],
        blocks: [
          { kind: 'narration', text: '他还是那个样子。' },
          { kind: 'narration', text: '你想山里人身子骨硬朗，也是有的。' },
          { kind: 'narration', text: '他称完那一味，抬头看了你一眼，低头去称下一味。', tone: 'faint' },
        ],
      },

    },
  },

  /**
   * 夜里，{call:spouse}问起药庐那边。
   *
   * 跟自家人说，那件事留在家里——听完只说一句「别跟旁人说」。这一条没有门内的后果，
   * 有的是一句实话落在家里；读者在壮年那一卷。
   */
  'mountain:asked-home': {
    id: 'mountain:asked-home',
    title: '夜里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '夜里熄了灯，{call:spouse}忽然问你。' },
          { kind: 'dialogue', text: '「镇西那边，到底是个什么去处？你天天去。」' },
        ],
        choices: [
          {
            id: 'tell-mountain',
            label: '说了',
            echo: '你说了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'told-spouse-about-the-mountain', value: true },
              { type: 'chronicle', text: '山上的事，你跟{call:spouse}说了。' },
            ],
            next: 'told-home',
          },
          {
            id: 'keep-mountain',
            label: '说就是个抓药的地方',
            echo: '你说没什么。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'kept-the-mountain', value: true },
              // 瞒住了也是这一世发生过的事：「没说」那条路也得在年表上留一笔（79 在 schooling 上抓到的形状——
              // 五笔年表全给了「念上了」，人最多的「没念上」那条一笔也没有）
              { type: 'chronicle', text: '{call:spouse}问起过药庐那边。你没说。' },
            ],
            next: 'kept-home',
          },
        ],
      },
      'told-home': {
        id: 'told-home',
        blocks: [
          { kind: 'narration', text: '你说得很含糊，因为你自己也说不清。' },
          { kind: 'narration', text: '{call:spouse}听完很久没有说话。' },
          { kind: 'dialogue', text: '「别跟旁人说。」' },
          { kind: 'narration', text: '此后{call:spouse}再没有问过。', tone: 'faint' },
        ],
      },
      'kept-home': {
        id: 'kept-home',
        blocks: [
          { kind: 'narration', text: '{call:spouse}「嗯」了一声，翻过身去了。' },
          { kind: 'narration', text: '你在黑里睁着眼躺了一会儿。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 巷口，邻家的人叫住你。
   *
   * 跟邻家说，话就出了家门。这一条有门内的后果——不是当场，是有一天（`mountain-shut`）。
   *
   * 叫住你的是「{house:east}的人」，不点名：东邻那一户的户主比你大二十四到五十岁，你二十岁时
   * 四十局里三十四局他已经没了（人口册照凡人的公式老死），钉死他这一卷就死在窗口后三分之二
   * （79 在 `unrest-word` 上量出的同一个形状）。问话的是那一户，谁当家谁问——户在人不在。
   */
  'mountain:asked-lane': {
    id: 'mountain:asked-lane',
    title: '巷口',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '傍晚回来，{house:east}的人在巷口叫住你。' },
          { kind: 'dialogue', text: '「你天天往镇西跑，那药庐是个什么去处？我怎么没见它挂过招牌。」' },
        ],
        choices: [
          {
            id: 'tell-mountain',
            label: '说了',
            echo: '你说了。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'talked-about-the-mountain', value: true },
              { type: 'chronicle', text: '山上的事，你跟{house:east}的人说了。' },
            ],
            next: 'told-lane',
          },
          {
            id: 'keep-mountain',
            label: '说就是个药铺，帮着翻翻药',
            echo: '你说就是个药铺。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'flag', key: 'kept-the-mountain', value: true },
              { type: 'chronicle', text: '{house:east}的人问起过药庐那边。你没说。' },
            ],
            next: 'kept-lane',
          },
        ],
      },
      'told-lane': {
        id: 'told-lane',
        blocks: [
          { kind: 'narration', text: '你说了。说的时候你觉得自己声音很小。' },
          { kind: 'narration', text: '那人听完笑了一声，说山上要是真有那样的人，他倒想去看看。' },
          { kind: 'narration', text: '那天晚上你想起药庐那位说的最后一句。你想他大概不会知道。', tone: 'faint' },
        ],
      },
      'kept-lane': {
        id: 'kept-lane',
        blocks: [
          { kind: 'narration', text: '那人点点头，没有再问。' },
          { kind: 'narration', text: '你进了门才发觉手心有汗。', tone: 'faint' },
        ],
      },
    },
  },

  /**
   * 他知道了。
   *
   * 镇上的话传得快。这一节没有解释，也没有第二次机会——他把戥子放下，说了一句，
   * 就低头去称下一味了。`footing` 回到「不理会」：师承那条链上的每一件事自然落空，
   * 山上也不会再问起你。**规矩的后果落在关系上，不落在凡间的任何账上。**
   */
  'mountain:shut': {
    id: 'mountain:shut',
    title: '药庐 · 门',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 3 },
          { type: 'flag', key: FOOTING, value: '不理会' },
          { type: 'flag', key: 'shut-out-by-the-shed', value: true },
          { type: 'chronicle', text: '药庐那位不再让你去了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '那天你到的时候门开着，他在称药。' },
          { kind: 'narration', text: '他称完那一味，把戥子放下了。' },
          { kind: 'dialogue', text: '「说出去了？」' },
          { kind: 'narration', text: '你没答。' },
          { kind: 'dialogue', text: '「往后不用来了。」' },
          { kind: 'narration', text: '他低头去称下一味。你在门口站了一会儿，退了出来。' },
          { kind: 'narration', text: '后来你从镇西过，几次都没往那边看。', tone: 'faint' },
        ],
      },
    },
  },
}

/**
 * 什么时候下来。
 *
 * 两条都在 `tutelage` 那条链上：他下来取药的时候你得在药庐里，而你在不在药庐里，
 * 看的是跟药庐那位处到了哪一格（`footing` 在使唤／带一段／教一点三格里的任一格——
 * `flag.in` 那一格就是为这儿加的，三格演的是同一件事，不必写成三条事件）。
 *
 * `chance` 是发条：这条链一开头就排在所有散事件前面（`pickEvent` 第二道闸），
 * 少了它就是回回都来。山上几年才下来一趟人。
 */
export const mountainEvents: readonly LifeEvent[] = [
  {
    id: 'mountain-down',
    window: { from: 13, to: PRIME_UP },
    requires: [
      // 药庐那位（herbalist-at-the-shed）在这一卷里在场、开口——他得还在（天年在他身上，`Cultivator.span`）
      { family: { id: SHED, alive: true } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
    ],
    scene: 'mountain:down',
    chain: 'tutelage',
    weight: 5,
    chance: 0.3,
  },
  {
    /**
     * 再下来。要头一回下来过（`event:` 旗），而你还在药庐里。
     *
     * 不写「处到了教一点」——没处到的人也看得见他再来一趟，只是那一趟跟上回一样。
     * 「上头问起你了」那一支在卷里分，不在事件上分。
     */
    id: 'mountain-again',
    window: { from: 14, to: PRIME_UP },
    requires: [
      // 药庐那位（herbalist-at-the-shed）在这一卷里在场、开口——他得还在（天年在他身上，`Cultivator.span`）
      { family: { id: SHED, alive: true } },
      { flag: { key: 'event:mountain-down' } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
    ],
    scene: 'mountain:again',
    chain: 'tutelage',
    weight: 4,
    chance: 0.25,
  },
  {
    /**
     * 他不老。壮年、还在药庐里、跟他处到使唤往后（十几岁就进过这扇门的人）。
     * 三十岁起：二十多年的差才看得出来，二十岁看不出一个五十岁的人有没有老。
     */
    id: 'mountain-unaged',
    window: { from: 30, to: PRIME_UP },
    requires: [
      // 药庐那位（herbalist-at-the-shed）在这一卷里在场、开口——他得还在（天年在他身上，`Cultivator.span`）
      { family: { id: SHED, alive: true } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
      { flag: { key: 'shut-out-by-the-shed', absent: true } },
    ],
    scene: 'mountain:unaged',
    chain: 'tutelage',
    weight: 5,
    chance: 0.4,
  },
  {
    /**
     * 夜里，{call:spouse}问起。要他嘱咐过你（`told-by-the-shed`），要有配偶在。
     * 问过一回就不再问（不 `repeatable`）；说了、瞒了各落一面旗，壮年那一卷读。
     */
    id: 'mountain-asked-home',
    window: { from: 16, to: PRIME_UP },
    requires: [
      { flag: { key: 'told-by-the-shed' } },
      { bond: { kind: '配偶', alive: true } },
      { flag: { key: 'told-spouse-about-the-mountain', absent: true } },
      { flag: { key: 'kept-the-mountain', absent: true } },
    ],
    scene: 'mountain:asked-home',
    weight: 5,
    chance: 0.3,
  },
  {
    /**
     * 巷口，邻家的人问起。要有东邻那一户（宫里、寺里、路上长大的没有），谁当家谁问。
     */
    id: 'mountain-asked-lane',
    window: { from: 16, to: PRIME_UP },
    requires: [
      { flag: { key: 'told-by-the-shed' } },
      { house: { id: 'east' } },
      { flag: { key: 'talked-about-the-mountain', absent: true } },
      { flag: { key: 'kept-the-mountain', absent: true } },
    ],
    scene: 'mountain:asked-lane',
    weight: 5,
    chance: 0.3,
  },
  {
    /**
     * 他知道了。要你说出去过、而你还在药庐里（处到使唤往后）。
     * 在师承那条链上：链开了头它就排在散事件前面，`chance` 是「话传到他耳朵里要些日子」。
     */
    id: 'mountain-shut',
    window: { from: 16, to: PRIME_UP },
    requires: [
      // 药庐那位（herbalist-at-the-shed）在这一卷里在场、开口——他得还在（天年在他身上，`Cultivator.span`）
      { family: { id: SHED, alive: true } },
      { flag: { key: 'talked-about-the-mountain' } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
    ],
    scene: 'mountain:shut',
    chain: 'tutelage',
    weight: 6,
    chance: 0.5,
  },
]
