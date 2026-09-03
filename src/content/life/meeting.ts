import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 照面。
 *
 * ## 找着人了，可他不知道自己找着的是什么
 *
 * 上一册讲的是怎么走到门口。这一册讲的是**门口那个人是谁**——
 * 而这两件事之间隔着的东西比想象的多。
 *
 * 从前这中间是空的：找着了就摸腕子，摸完就收或者不收。
 * 玩家事后连对方姓什么、多大年纪、穿什么颜色的衣裳都说不出，
 * 就好像那个人不是人，是一道门禁。
 *
 * ## 这一册头一回让两个方向同时发生
 *
 *     他怎么看你　　拿他的尺子量。**量得准不准他自己也不知道**
 *          ↕
 *     你怎么看他　　你没有尺子。看得见的只有衣裳、年纪、手上有没有茧
 *
 * 两头都会看错。而**玩家听见的两句话，一句对一句错，
 * 听起来一模一样平淡**——他没有任何办法分出哪句是哪句。
 *
 * ## 这一册刻意不发任何东西
 *
 * 没有鉴定灵根，没有赠功法，没有入宗门，没有开修炼。
 * 一件物事也不给，一格属性也不动，境界仍旧是「凡人」。
 *
 * 因为这一刻真正发生的事情不是「他获得了资格」，
 * 是**他第一次站在一个自己完全不了解的世界跟前，
 * 而且多半连门在哪儿都没看清**。
 */

/**
 * 山道上那个人。
 *
 * ## 他是炼气，他看不见资质
 *
 * `ADEPT` 那把尺子上根本没有 `root` 这一格。于是一个资质九十几的孩子
 * 站在他跟前，他量的是悟性和神魂，量到什么说什么，说完就走了。
 *
 * 他没有说谎，也没有瞧不起谁——**他只是没有那双眼睛**。
 * 而玩家会把那句「悟性一般」记一辈子。
 *
 * ## 跟不跟上去，是玩家的事
 *
 * 他肯多说两句，不等于玩家会跟；他不肯说，也不等于玩家会走。
 * 两边独立，于是有四种收场——而**没跟上去的那两种，
 * 玩家永远不会知道自己错过了什么。**
 */
export const meetingScenes: SceneLibrary = {
  'meet:first': {
    id: 'meet:first',
    title: '照面',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        /**
         * 一批效果是一个时刻。
         *
         * `time` 属上下文相先跑，`meeting` 属事实相后跑——
         * 于是这一面落进 claims 和 knowledge 的时间戳，
         * 是**两个人说完话那一刻**，不是他刚抬头那一刻。
         */
        onEnter: [
          { type: 'time', days: 1 },
          { type: 'meeting', who: 'adept-on-the-path' },
        ],
        blocks: [],
        choices: [
          {
            /**
             * 跟上去问。
             *
             * 走到 `seek:door`——那扇门本来就在那儿，这一卷没有改动它。
             * **变的只是他到门前的时候，已经跟那个人说过话了。**
             */
            id: 'follow-him',
            label: '跟上去，再问一句',
            critical: true,
            echo: '你追了两步。',
            effects: [{ type: 'time', days: 1 }],
            next: 'seek:door',
          },
          {
            /**
             * 没跟上去。
             *
             * **走到这一步的人里，真有一部分会站着不动。**
             * 不是因为怕，也不是因为不想。他事后说不清，
             * 我们也不替他说清。
             */
            id: 'let-him-go',
            label: '看着他走',
            echo: '你没有动。',
            effects: [
              { type: 'time', days: 2 },
              { type: 'flag', key: 'let-him-walk', value: true },
            ],
            next: 'stayed',
          },
        ],
      },

      stayed: {
        id: 'stayed',
        onEnter: [{ type: 'chronicle', text: '你在山下见过一个人，没有跟上去。', tone: 'deep' }],
        blocks: [
          { kind: 'narration', text: '你在原地站了很久，看他从山道拐过去。' },
          { kind: 'narration', text: '回去的路上你把他说的那两句话来回想了几遍。' },
          {
            kind: 'narration',
            text: '你想不明白他是什么意思。你连他姓什么都不知道。',
            tone: 'faint',
          },
        ],
      },
    },
  },

  /**
   * 北边那个观。
   *
   * ## 第二把尺子
   *
   * 观里那位是筑基。**他看得见资质**——这是玩家这辈子头一回
   * 被人量到那一样东西，而他自己完全不知道。
   *
   * 于是两句话会并排落在同一面下：
   *
   *     十三四岁　山道上那个人说「悟性寻常」
   *     十五六岁　观里那位说「资质倒是不错」
   *
   * **两句都是真话，都来自同一份数据，量的不是一样东西。**
   * 玩家看着这两条，只会觉得矛盾——而多年以后他重新翻到这一页，
   * 才可能想明白当年那句「一般」到底说的是什么。
   *
   * 那一刻不需要任何新机制：`claims` 只增不改，两条记录本来就挨着。
   */
  'meet:temple': {
    id: 'meet:temple',
    title: '观里',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', days: 14 },
          { type: 'household', standing: -2 },
        ],
        blocks: [
          { kind: 'narration', text: '你顺着那句「往北三百里」走了半个月。' },
          { kind: 'narration', text: '观真的在。比脚夫说的小得多，墙塌了一角。' },
        ],
        choices: [
          {
            id: 'go-in',
            label: '进去看看',
            critical: true,
            echo: '你在门口站了一会儿才推门。',
            effects: [
              { type: 'time', days: 1 },
              { type: 'meeting', who: 'master-at-the-temple' },
            ],
            next: 'after',
          },
          {
            id: 'turn-back',
            label: '在门口看了看就走了',
            echo: '你没有进去。',
            effects: [{ type: 'time', days: 14 }],
            next: 'walked-away',
          },
        ],
      },

      after: {
        id: 'after',
        onEnter: [
          { type: 'time', days: 14 },
          { type: 'chronicle', text: '你去了北边那个观，见着了里头的道人。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '回来的路走了半个月。' },
          {
            kind: 'narration',
            text: '他说的那几句你记着了，可你不知道该记哪一句。',
            tone: 'faint',
          },
        ],
      },

      'walked-away': {
        id: 'walked-away',
        blocks: [
          { kind: 'narration', text: '你在墙外站了半天，到底没有进去。' },
          {
            kind: 'narration',
            text: '走出去二里地你回头看了一眼。院子里有个人在扫地。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

/**
 * 什么时候会照上面。
 *
 * ## 两次会面隔着年份，这一条是有意的
 *
 * 山道上那次在十三四岁，观里那次要再晚一两年。**中间隔的那些日子
 * 就是这套设计要的东西**：他带着「悟性寻常」那句话过了一阵子，
 * 然后另一个人告诉他一句不一样的。
 *
 * 若两次挨在一起，那不过是同一场鉴定的两个环节。
 *
 * ## 为什么不是「十六岁一次，二十八岁一次」
 *
 * 因为**凡人这一册十六七岁就在渡口收尾了**，那之后的人生还没写。
 * 一件写在二十二岁的事在今天等于死代码：年表永远抽不到它，
 * 而它看起来跟活的一模一样。
 *
 * 所以这里压进十四到十六岁。**要紧的不是隔了几年，是隔着两把尺子**——
 * 两条 claim 并排落在同一面下这件事，跟它们相差一年还是十二年无关。
 * 等成年那一段人生写出来，把这个窗口往后拉就行，机制一个字不用动。
 */
export const meetingEvents: readonly LifeEvent[] = [
  {
    /**
     * 观里那次。
     *
     * 入场要两样：听说过北边那个观，而且**心里那个念头还在**。
     * 念头退了的人不会为一句脚夫的闲话走半个月——而那是绝大多数人。
     */
    id: 'meet-temple',
    window: { from: 14, to: 16 },
    requires: [{ flag: { key: 'leaning:know' } }, { knowledge: 'lead:the-northern-temple' }],
    scene: 'meet:temple',
    weight: 8,
  },
]
