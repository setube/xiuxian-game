import { PRIME_UP } from '@/engine/stages'
import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 山上叫你上去。
 *
 * ## 这一片接在哪儿
 *
 * `mountain.ts` 停在五个字：药庐那位收炉子的时候没让你走，说「上头问起你了」，
 * 然后**他没有往下说**。那一册的边界写得很清楚：收不收、叫不叫你上去，是这一片的事。
 *
 * 所以这一片的第一句话不是玩家说的，是**别人隔了很久之后才说完的下半句**。
 *
 * ## 29.md 那句设计判断
 *
 * > 不要把它设计成【选择】散修 / 宗门，**因为这样又变成玩家菜单**。
 *
 * 落到这一片就是一条：**「上山」这件事玩家点不了**。他能决定的只有
 * 「人家开口之后去不去」，而**开口那一下不由他**——实测随机人生里
 * 走到「上头问起你了」的是 0.3%（800 世 2 世），而那还只是被问起，不是被叫。
 *
 * ## 这一片不做什么
 *
 * 一、**不建 `Sect` 类型。** 29.md 列了一整棵树（山门/长老/掌教/执事/
 *     外门/内门/传承/派系…），照着建就是先造阶梯再找楼。用户那句
 *     「宗门要用跟家族、宗族同一套东西做，不新建组织系统」是这条的依据。
 *     这一片只用现成的格子；真逼出新格子了，那也该是 `House` 长出来的
 *     （22 熟那一层，加之前问它一句）。
 * 二、**不做境界、不做功法、不做资源。** 他上去了也还是那个不识字的人。
 * 三、**不写「山上」是什么。** 玩家看得见的只有：来接他的是谁、走了几天、
 *     到了之后头一件事是什么。**山门什么样、有几个人、叫什么名字，这一片一个字不写**
 *     ——那得等有内容真的需要它。
 *
 * ## 一件从 `footing` 那五档学到的事
 *
 * 那五档里「搭话/使唤/带一段」是**过路档**：`weighUp` 只往上挪，
 * 接着去的人世末停在「教一点」，不去的停在「不理会」。
 * 实测随机 800 世沿途采样，三个过路档一生中到过 14/13/5 世，而世末全是 0。
 *
 * **推论用在这一片上**：往过路的状态上写「一次性的事」是对的，
 * 写「持续的状态」是错的。所以这一片落的是**一笔一笔的事**
 * （他来了、你跟他走了、路上几天、到了），不落任何「你现在是某某」的状态。
 */

/** 上山这件事在 `character.undertakings` 里的 id。它会结束——上去了或者没上去 */
const GOING_UP = 'going-up'

export const goingUpScenes: SceneLibrary = {
  /**
   * 下半句。
   *
   * 「上头问起你了」那句话之后，药庐那位很久没有再提。
   * **这一节起头于沉默被打破，而打破它的人不是玩家。**
   *
   * 为什么隔这么久：山上的人隔几年才下来一趟（`mountain.ts` 那一章的设定）。
   * 上一趟他回去说了一声，这一趟才有下文——**中间那几年玩家什么也做不了，
   * 而那几年他照旧翻他的药**。
   */
  'going-up:sent-for': {
    id: 'going-up:sent-for',
    title: '上头的话',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'undertake', undertaking: GOING_UP },
          { type: 'chronicle', text: '药庐那位说，山上要你上去一趟。' },
        ],
        blocks: [
          { kind: 'narration', text: '又过了两年多。那句话他再没提过，你也没问。' },
          { kind: 'narration', text: '这天收炉子，他忽然说了一句。' },
          { kind: 'dialogue', text: '「你收拾收拾。」' },
          { kind: 'narration', text: '你没听懂。他把炉门关上，才补了半句。' },
          { kind: 'dialogue', text: '「上头要你上去一趟。」' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '你问上去做什么，他说他不知道。你问要去多久，他说这个也不知道。',
          },
          {
            kind: 'narration',
            text: '他知道的只有一件：过些天有人来接你。',
            tone: 'faint',
          },
        ],
        choices: [
          {
            id: 'go',
            label: '你说你去',
            hint: '家里的事得先安顿',
            echo: '你说你去。',
            /*
             * 这儿原先还落一面 `said-yes-to-the-mountain`。**删了。**
             *
             * 它是个**过路态**：答应了之后可能走成（`went-up-the-mountain`），
             * 也可能走不脱（`could-not-go-up`），而那两面才是稳定的。
             * 我在给别人解释这一卷的旗时写过「别用它判长期」——
             * **一面自己都告诫别人别用的旗，落它就是在制造光杆。**
             *
             * 分界（2026-09-09 跟 52 一起归纳的）：
             *
             *     无声的光杆　落了旗，正文没说什么　　→ 多半有意的
             *     有声的光杆　正文明说了「往后……」　→ 那是空头支票
             *
             * 这一面两头都不占：它既没有下文，也不是任何一段人生的结论。
             */
            effects: [{ type: 'time', days: 10 }],
            next: 'settling',
          },
          {
            /*
             * 不去也是一条真路，而且它不是「失败分支」。
             *
             * 29.md 那条硬规则的反面：**宗门不是一定比散修高级**，
             * 否则大家都会「有机会就上」，那不上去的人只是失败者。
             *
             * 一个有田有家小的人不去，是这个时代最正常不过的选择——
             * **他不知道那上头是什么，而他知道自己有什么。**
             */
            id: 'stay',
            label: '你说你不去',
            hint: '你在这儿有一家人',
            critical: true,
            echo: '你说你不去。',
            effects: [
              { type: 'time', days: 3 },
              { type: 'undertake', undertaking: GOING_UP, done: true },
              { type: 'flag', key: 'turned-down-the-mountain', value: true },
            ],
            next: 'stayed',
          },
        ],
      },

      /**
       * 答应了，然后要安顿的是凡人的事。
       *
       * **这一节是 29.md 第 55 行那句话的落点**：
       *
       * > 散修应该天然连接到你前面建立的普通社会。
       *
       * 他要走了，而手上的活、家里的人、欠的账不会因此消失。
       * 这一节不问他愿不愿意——问的是**他走得成走不成**。
       */
      settling: {
        id: 'settling',
        onEnter: [{ type: 'time', days: 20 }],
        blocks: [
          { kind: 'narration', text: '你回家说了这件事。说得很含糊，因为你自己也不清楚。' },
          { kind: 'narration', text: '那几天你把该交代的都交代了。' },
        ],
        /*
         * 三条路，顺序要紧——`branches` 取第一条成立的就走，具体的排在前面。
         *
         * ⚠️ 这一节没有 `choices`，`branches` 才判得到
         * （`engine/story.ts:316`：无可选项则自然续接下一节）。
         * 写在有选项的节点上的 `branches` 是死的，而且不报错。
         */
        branches: [
          {
            // 有妻儿的人走不脱，这不是他不肯——是这一家等着他这双手
            requires: [
              { bond: { kind: '配偶', alive: true } },
              { bond: { kind: '子', alive: true } },
            ],
            next: 'cannot-leave',
          },
          {
            requires: [{ bond: { kind: '配偶', alive: true } }],
            next: 'wife-only',
          },
        ],
        next: 'alone-anyway',
      },

      /**
       * 走不脱。
       *
       * 他答应了，然后发现自己走不了——**而这不是他反悔**。
       * 一个上有老下有小的人，不是他不想去，是这一家没有他就转不动。
       *
       * 这一节的年表落的是「没有去成」，不是「放弃了」。
       */
      'cannot-leave': {
        id: 'cannot-leave',
        onEnter: [
          { type: 'time', months: 2 },
          { type: 'undertake', undertaking: GOING_UP, done: true },
          { type: 'flag', key: 'could-not-go-up', value: true },
          { type: 'chronicle', text: '那一趟你没有去成。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '交代到第三天你就知道交代不完。' },
          /*
           * ⚠️ 原先写的是「地里的活、家里的人、年底的租子」——**`upbringing.ts` 当场抓到**：
           * 那默认了这个人靠地吃饭，而他可能是铺子里的伙计、匠人、宫里出来的。
           *
           * 改的是措辞不是逻辑：「手上的活」对谁都成立——种地的、打铁的、
           * 站柜台的，走之前都有一摊子事撂不下。**而这一节要说的本来就是那个**：
           * 不是「农活多」，是**一个活人身上挂着的事，不是十天半月能交代完的**。
           *
           * 这跟我自己在 `scripts/sequestered.ts` 里守的是同一件事
           * （高墙里头的人不该读到「干活」那一类选项），而我在这儿犯了。
           */
          {
            kind: 'narration',
            text: '手上的活、家里的人、年底的那几笔账，哪一样都不是十天半月的事。',
          },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '来接的人到的那天，你在门口跟他说了几句话。' },
          { kind: 'narration', text: '他听完点了点头，什么也没说，转身走了。' },
          {
            kind: 'narration',
            text: '那天夜里你躺着没睡着。你不知道那上头是什么样子，往后大概也不会知道了。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 家里只有一个人在等他。
       *
       * 走得成，但走得不干净——**他知道自己走了之后她一个人怎么过**。
       */
      'wife-only': {
        id: 'wife-only',
        onEnter: [{ type: 'time', days: 15 }],
        blocks: [
          { kind: 'narration', text: '她问了两遍要去多久，你两遍都答不上来。' },
          { kind: 'narration', text: '第三遍她没有再问，只是把你那件厚的收进了包袱。' },
        ],
        next: 'the-one-who-came',
      },

      'alone-anyway': {
        id: 'alone-anyway',
        onEnter: [{ type: 'time', days: 10 }],
        blocks: [
          { kind: 'narration', text: '要交代的比你以为的少。' },
          {
            kind: 'narration',
            text: '锁上门那一下，你才想起来没有人需要你说一声。',
            tone: 'faint',
          },
        ],
        next: 'the-one-who-came',
      },

      /**
       * 来接的人。
       *
       * **这一节不写他是谁**——他不通名，玩家也没有问的立场。
       * 29.md 那句「进宗门也需要完整的因果过程」在这里体现为：
       * 不是「你去山门报到」，是**有人来把你带走**，而你不知道要走多远。
       */
      'the-one-who-came': {
        id: 'the-one-who-came',
        onEnter: [{ type: 'time', days: 4 }],
        blocks: [
          { kind: 'narration', text: '来的人比你想的年轻，青布衣裳，背一个空篓。' },
          { kind: 'narration', text: '他没有通名。看了你一眼，说了句「走吧」。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '头一天走的是官道，第二天进了山。' },
          { kind: 'narration', text: '你问过一次还有多远。他说快了。' },
          { kind: 'narration', text: '第四天你才知道那个「快了」是什么意思。', tone: 'faint' },
        ],
        next: 'arrived',
      },

      /**
       * 到了。
       *
       * **这一节是这一片的落点，也是它的边界。**
       *
       * 不写山门什么样、有几个人、叫什么名字——那些得等有内容真的需要它。
       * 这一节只写一个凡人到了之后的头一件事：**有人问他叫什么，
       * 然后让他去做活。**
       *
       * 29.md 那句「成为杂役 / 记名 / 外门 / 正式弟子」——**这一片只到杂役**。
       * 而且不落 `identity`：他不是「外门弟子」，他是一个在这儿干活的人，
       * 山上还没有决定拿他怎么办。
       */
      arrived: {
        id: 'arrived',
        onEnter: [
          { type: 'time', months: 1 },
          { type: 'undertake', undertaking: GOING_UP, done: true },
          { type: 'flag', key: 'went-up-the-mountain', value: true },
          {
            type: 'knowledge',
            id: 'up-there',
            title: '上头',
            summary:
              '不是一座山门，是半山上一片屋子，几十号人。有人管着药、有人管着火、有人管着人。你在灶下。',
            category: '修行',
            contact: '亲历',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '你上山了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '不是山门。是半山腰一片屋子，比你想的旧。' },
          { kind: 'narration', text: '有人问了你的名字，写在一本册子上，问完就走了。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '当天下午就有人叫你去挑水。' },
          {
            kind: 'narration',
            text: '你挑到天黑。这地方跟你想的不一样，可是你说不上来哪里不一样。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 没去。
       *
       * **跟去了是同一层的两个结局，不是失败分支。** 年表照记——
       * 他这一辈子真的有过这么一趟机会，他没有去。
       */
      stayed: {
        id: 'stayed',
        onEnter: [
          { type: 'time', months: 1 },
          { type: 'chronicle', text: '山上要你上去，你没有去。' },
        ],
        blocks: [
          { kind: 'narration', text: '他没有劝你，也没有再问一遍。' },
          { kind: 'narration', text: '那天你照旧翻完了药才走。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '过些天真有人来了一趟，在药庐门口站了一会儿就走了。' },
          {
            kind: 'narration',
            text: '你在里屋，没有出去。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const goingUpEvents: readonly LifeEvent[] = [
  {
    /**
     * 山上叫你上去。
     *
     * 三条 requires：
     *
     *   上头问起过你　`flag known-on-the-mountain`——`mountain.ts` 那一册的落点，
     *                 这一片全部的前提
     *   还没上去过　　`flag went-up-the-mountain absent`——这一趟只有一次
     *   没在议这件事　`undertaking not: going-up`
     *
     * ⚠️ **窗口和分母**：`known-on-the-mountain` 在随机人生里是 0.3%
     * （2026-09-09 实测 800 世 2 世，主干 `7b441e1`）。这一支的分母是它的子集，
     * **所以随机人生里这一卷几乎不会演到，那是设计**——照 `ascent`／`mountain`
     * 那两支门禁的规矩：有心人掷到出现为止，随机人生只报数。
     *
     * 窗口下界 15 而不是 13：`mountain.ts` 那一章从 13 岁起，
     * 而这一片要等「上头问起」之后再隔两年多。
     *
     * ⚠️ 上界跟着 `mountain` 走，用 `PRIME_UP`（壮年末，49）**不写死数字**。
     * 头一版我写了 60，而 `chapters.ts` 那一章写的是 `[15, PRIME_UP]`
     * ——**两处我各写各的，`verify` 当场报「窗口跑出章界」**。
     * 语义上也是 49 对：一个过了壮年的人，山上不会再叫他上去。
     */
    id: 'going-up-sent-for',
    window: { from: 15, to: PRIME_UP },
    requires: [
      { flag: { key: 'known-on-the-mountain' } },
      { flag: { key: 'went-up-the-mountain', absent: true } },
      { undertaking: { not: GOING_UP } },
    ],
    scene: 'going-up:sent-for',
    weight: 60,
  },
]
