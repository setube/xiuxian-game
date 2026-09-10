import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 守着那件事的那些年，和它头一次真的改了什么。
 *
 * ## 这一册是全作第一个正向的 `lifespan` 使用者
 *
 * `{ type: 'lifespan', years }` 这个效果早就建好了，而在这一册之前
 * **全库唯一的使用者是老年那一卷的「再走一趟远路」**（`routine.ts`，减两年）。
 * 「修仙是一条可能改变生命长度的道路」这句话在代码里一直没有落点——
 * 引擎能改天年，可从来没有一件事真的改过它。
 *
 * 用户 2026-09-10 拍板了这一片该长什么样，四条：
 *
 * 一、**挂在「第一门真正学会并完成关键修行」上**，不挂在「见到修士」，
 *     不挂在「加入宗门」，更不是「突破某境界自动 +100 年」。
 * 二、**不绑到境界。** 一绑就会滑回 `炼气 50 / 筑基 150 / 金丹 500`
 *     那张表，然后世上所有差异都被表格吞掉。这一册**不落 `realm`**。
 * 三、**第一次给的量要小。** 凡人终年 p50 = 62（实测，见下），
 *     这一片给到七十出头，不是五百岁。
 * 四、**玩家未必知道具体增加了多少。** 他读到的是一条征象，
 *     不是「寿命 +8」。
 *
 * ## 那个量是量出来的，不是拍的
 *
 * ⚠️ **头一版这儿引的是「身子骨 50 的人天年 p50 = 67」，而那不是中位数玩家。**
 *
 * 我按三档身子骨各掷两万次，挑了中间那档当代表——**可玩家的 `body`
 * 中位是 42，不是 50**（3000 次开局实测）。`rollSpan` 按 `(body-50)/5`
 * 修正，于是真实的中位数玩家比我引的那个数矮两岁。
 *
 * a8 同一天在 28.md 上犯了同一个错的另一版：它从 `SPAN_MIN/SPAN_MAX`
 * 常量算「活到七十约 42%」，而实测是 27%。**「常量描述的那个人」
 * 和「库里真实的人」不是同一个。**
 *
 * 所以这儿换成真跑出来的数（1500 世，100% 走到落幕）：
 *
 *     天年（掷出来的上限）  p25 56  p50 64  p75 72   活过 70  32.2%
 *     终年（实际死的那年）  p25 56  p50 62  p75 70   活过 70  26.9%
 *
 * 两者差在老年那一卷「再走一趟远路」那条 `−2` 年——
 * **全库唯一的负 `lifespan`，而这一册是唯一的正的。**
 *
 * **而玩家跟 NPC 死法不同，这一点决定了该给多少。**
 * NPC 每年掷一次老病（`people.ts` 的 `frailty`），玩家没有那一掷——
 * `story.ts:237` 只问 `isSpent(age, span)`。所以：
 *
 *     对 NPC   +11 年天年 → 实际只多活 3.6 年（老病那条线压着）
 *     对玩家   +11 年天年 → 实实在在多活 11 年
 *
 * 给 `+8`：**p50 的人从 62 到 70**，活过七十的从 27% 变成约 65%。
 * **那不是长生，那是「老得慢了一点」**，而这一片要写的正是这个。
 *
 * ## 三条不做
 *
 * 一、**不做境界。**（用户第二条）他练成了一件具体的事，
 *     没有人给他划一层。
 * 二、**不做「坚持就有回报」。** 这一卷有一掷，成的是少数——
 *     多数人守了十几年，什么也没有。那不是惩罚，那是这件事的实情。
 * 三、**不做数字回执。** `lifespan` 效果本来就不出回执
 *     （`effects.ts` 那一段：「落这条效果的那一卷，正文里必须自己
 *     写出那件事」）。这一册写的是征象，不是数。
 *
 * ## 征象为什么不是「旧疾没再犯」
 *
 * 用户给的那句是「你原先每到这个时候就犯的旧疾，竟没有再犯」，
 * 而**这个世界里玩家没有旧疾**：`illness.ts` 那几面旗
 * （`illness-at-home` / `illness-lingers`）说的是**家里人**病着，
 * 不是他自己。玩家自己身上唯一的伤是 `attempt` 那 8% 的 `hurt`
 * （盗汗，`body -8`）。
 *
 * 「你起来喂了鸡」那次 `upbringing` 抓到的是同一个形状：
 * **一句话默认了一个这个人未必有的东西。**
 *
 * 所以这一节按有没有那处伤分两支写（`branches`）：
 *
 *     有过那场病   盗汗停了——他自己身上的旧账，最实在的一种征象
 *     没有过       冬天没像往年那样难挨——人人都有的那种参照
 *
 * ## 第三方观察那一层
 *
 * 用户要这一片同时检验四套东西：`lifespan` + 体感征象 + 认知 + 第三方观察。
 * 前三样在 `held` 那一节，第四样在它后面一节 `noticed`：
 * **别人看出来他跟同岁的人不一样，而说这话的人不知道自己在说什么。**
 *
 * 那一句刻意不由修士来说——修士说「你入了门」是一句判词，
 * 而这一片要的是「一个不懂的人碰巧说对了」。
 */

/** 又坐下来做那件事。跟 `attempt.ts` / `afterwards.ts` 同一个 */
const PRACTISING = 'practising'

export const keepingScenes: SceneLibrary = {
  /**
   * 守着那件事的第十几年。
   *
   * 起头不是「决心修炼」，是**习惯**——他每年冬天都坐那么几个月，
   * 像别人年年腌菜、年年修屋顶。他没有「修行」这个词，
   * 只知道自己在做一件说不清的事，而它偶尔来一次。
   */
  'keeping:years': {
    id: 'keeping:years',
    title: '那些年',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'undertake', undertaking: PRACTISING, done: false }],
        blocks: [
          { kind: 'narration', text: '那件事你没跟任何人说过，可你一直没停。' },
          { kind: 'narration', text: '每年入冬到开春，夜里总要坐上一会儿。' },
          {
            kind: 'narration',
            text: '家里人只当你有这个毛病，起初还说过两句，后来也就随你了。',
            tone: 'faint',
          },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '那一点热来过几回，每回都比上一回久一些。' },
          { kind: 'narration', text: '你说不出它是什么，也说不出自己在做什么。' },
        ],
        choices: [
          {
            id: 'keep',
            label: '照旧坐着',
            /*
             * 这一支不是「更努力」，是「什么也没改，接着过」。
             * 一个人守着一件说不清的事十几年，靠的不是决心，是习惯。
             */
            effects: [{ type: 'attribute', key: 'will', delta: 3 }],
            next: 'outcome',
          },
          {
            id: 'ask',
            label: '想找个懂的人问问',
            /*
             * 27.md「真实存在但极少公开」在这儿又落一次：他找不到人。
             * 而这一支**不降低成的机会**——它只是多花了一年。
             * 写成「找人问了就更容易成」的话，这件事就变成了攻略。
             */
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'memory', delta: 2 },
            ],
            next: 'no-one',
          },
        ],
      },

      /**
       * 没人可问。
       *
       * 他问的方式是绕着问的——直接问「你知道修行吗」会被当成疯子。
       * 而绕着问的结果是：**谁也没听懂他在问什么。**
       */
      'no-one': {
        id: 'no-one',
        blocks: [
          { kind: 'narration', text: '你去过镇上的药铺，跟坐堂的说起夜里睡不着。' },
          { kind: 'narration', text: '他给你抓了安神的药，收了十二文。' },
          { kind: 'narration', text: '你又找过写字的先生，绕着问了半天。' },
          { kind: 'event', text: '「你这是想岔了。」他说。' },
          {
            kind: 'narration',
            text: '回来的路上你想，这件事大概到死也没有人能告诉你。',
            tone: 'faint',
          },
        ],
        next: 'outcome',
      },

      /**
       * 成不成。
       *
       * ## 这一掷是这一册的全部分量，而它偏向「不成」
       *
       * ## 三成，而不是头一版的十六成一
       *
       * 「多数人守了十几年，什么也没有」这条纪律不变，变的是「多数」是多少。
       *
       * 十六成一是我照 `attempt` 那一掷（62/30/8）抄的，**而那两掷的分母
       * 完全不同**：`attempt` 掷的是「头一回坐下来的人」，这一卷掷的是
       * 「觉出过、而且此后十几年没放下的人」——**后者已经被筛过两道**
       * （3 成觉出，其中没放下的又是一部分）。
       *
       * 在一个已经筛过两道的池子里再筛掉 84%，那不是「稀有」，
       * 是把这一册筛成不存在（4000 世实测零次到达，见文件头那张漏斗表）。
       *
       * 而「不成」那一支不写成失败——他照旧每年冬天坐着，
       * 那件事照旧偶尔来一次。**他这辈子就停在这儿了，
       * 而他自己并不觉得这是个结局。**
       */
      outcome: {
        id: 'outcome',
        onEnter: [
          {
            type: 'roll',
            key: 'kept-outcome',
            among: [
              { value: 'still-nothing', weight: 70 },
              { value: 'held', weight: 30 },
            ],
          },
        ],
        blocks: [],
        branches: [{ requires: [{ flag: { key: 'kept-outcome', equals: 'held' } }], next: 'held' }],
        next: 'still-nothing',
      },

      /**
       * 成了。**全作第一处正向 `lifespan`。**
       *
       * ## 玩家读到的东西里没有一个数字
       *
       * 他读到的是身上的一处变化，而那个变化**在他自己的尺度上说得通**：
       * 冬天好过了，或者那场病落下的盗汗停了。
       *
       * 他不知道的是：这一年他的天年往后挪了八年。
       * `lifespan` 效果不出回执（`effects.ts` 那一段写着），
       * 面板上也没有天年这一格——**这件事只有世界知道。**
       *
       * ## 为什么落认知，而认知里也不写数
       *
       * 「那一点热」这条认知从 `attempt` 一路带到这儿，
       * 这一节把它推进到第三档：从「不知道那是什么」到「确定它是真的」
       * 到**「它在改我这个人」**。而他仍然不知道那是什么。
       *
       * 这正是三层认知模型里最要紧的那一层差别：
       * **世界事实（天年 +8）≠ 玩家认知（我好像结实了些）。**
       */
      held: {
        id: 'held',
        onEnter: [
          { type: 'undertake', undertaking: PRACTISING, done: true },
          { type: 'flag', key: 'warmth-held', value: true },
          /*
           * 八年。量出来的：凡人终年 p50 = 62（1500 世真跑实测），
           * 而玩家不掷老病（`story.ts:237` 只问 `isSpent`），
           * 所以这八年是实打实的八年——**p50 的人从 62 到 70**。
           *
           * ⚠️ 别拿「身子骨 50 的人」那组数（p50=67）来核这个：
           * 玩家 `body` 中位是 42，那组数描述的不是中位数玩家。
           *
           * **不是拍的，也不是按境界给的。**给到七十出头是因为
           * 「第一次真正的延寿」该让人活到同辈都开始走了的年纪，
           * 而不是活成一个传说。
           */
          { type: 'lifespan', years: 8 },
          { type: 'attribute', key: 'body', delta: 6 },
          {
            type: 'knowledge',
            id: 'that-warmth',
            title: '那一点热',
            summary: '它在改你这个人。你不知道它是什么，可你知道它是真的，而且它有用。',
            contact: '亲历',
            category: '修行',
            interpretation: '确信',
          },
          { type: 'chronicle', text: '那年冬天，你身上有一处变了。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '那年腊月，它来了以后没有走。' },
          { kind: 'event', text: '一整夜。你睁着眼躺到天亮。', tone: 'deep' },
          { kind: 'narration', text: '第二天起来，你觉得身上是空的，又是满的。' },
        ],
        /*
         * ⚠️ 征象按「他身上有没有那处旧伤」分两支——
         * 一句话不能默认一个他未必有的东西（「你起来喂了鸡」那个形状）。
         * 更具体的排在前面：`branches` 取第一条满足的就走。
         */
        branches: [
          { requires: [{ flag: { key: 'first-attempt', equals: 'hurt' } }], next: 'sign-sweat' },
        ],
        next: 'sign-winter',
      },

      /**
       * 征象一：那场病落下的盗汗停了。
       *
       * 走到这儿的是 `attempt` 里试出岔子那 8%——**他自己身上的旧账**。
       * 这是最实在的一种征象：不是「感觉好了些」，是一件他天天在过的事没有了。
       */
      'sign-sweat': {
        id: 'sign-sweat',
        onEnter: [{ type: 'chronicle', text: '那些年的盗汗，从那个冬天起没有再犯。' }],
        blocks: [
          { kind: 'narration', text: '开春以后你才想起来：这些日子夜里没有再出过汗。' },
          { kind: 'narration', text: '那是从当年病过那一场之后，十几年没断过的。' },
          { kind: 'event', text: '它停了。', tone: 'deep' },
          {
            kind: 'narration',
            text: '你坐着想了很久，没想明白，也没跟人说。',
            tone: 'faint',
          },
        ],
        next: 'noticed',
      },

      /**
       * 征象二：冬天没像往年那样难挨。
       *
       * 人人都有的那种参照——**不预设他有病、有伤、有什么特别的东西**，
       * 只预设他过过冬天。
       *
       * ⚠️ 上面那句话写下来的时候，底下正文写的是「你照旧下地、挑水、修屋顶」
       * ——**注释声明了纪律，正文当场就违反了它**，而两者隔着六行。
       * `upbringing` 抓出来的（「下地」得先有地，而这一卷对所有 living 开）。
       *
       * 所以这一节不点具体活计：**点了活计就等于点了一种人家。**
       * 「起早」「忙自己那摊事」谁都成立，宫里那个也成立。
       */
      'sign-winter': {
        id: 'sign-winter',
        onEnter: [{ type: 'chronicle', text: '那个冬天你没有像往年那样难熬。' }],
        blocks: [
          { kind: 'narration', text: '那个冬天格外冷，村里冻病了好几个。' },
          { kind: 'narration', text: '你照旧起早、照旧忙自己那摊事，一天也没歇。' },
          { kind: 'event', text: '开春的时候你才回过味来：这个冬天你一次也没病。', tone: 'deep' },
          {
            kind: 'narration',
            text: '往年这时候你总要躺上几天的。',
            tone: 'faint',
          },
        ],
        next: 'noticed',
      },

      /**
       * 别人看出来了，而说这话的人不知道自己在说什么。
       *
       * ## 这一节是第三方观察那一层，它刻意不由修士来说
       *
       * 修士说「你入了门」是一句判词——**那会替玩家把这件事定性**，
       * 而这一片要的正好相反：一个不懂的人碰巧说对了，
       * 而他说完就转到别的话头上去了。
       *
       * `mountain.ts` 那一片的 `he-does-not-age` 是同一族的东西
       * （凡人看见修士不老），这一节是它的**第一人称版本**：
       * **别人在你身上看见了那件事，而你和他都不知道那是什么。**
       */
      noticed: {
        id: 'noticed',
        onEnter: [{ type: 'flag', key: 'noticed-unaged', value: true }],
        blocks: [
          { kind: 'narration', text: '那年秋里，村口遇见同年生的老李。' },
          { kind: 'narration', text: '他背驼了，走两步要停一停。' },
          { kind: 'event', text: '「你倒是不见老。」他说。' },
          { kind: 'narration', text: '你笑了笑，说是命好。' },
          {
            kind: 'narration',
            text: '他点点头，扯起今年的年景，这件事就过去了。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 什么也没有。八成四落在这儿。
       *
       * **这一节写得不比上面薄**，跟 `afterwards.ts` 的 `nothing-again`
       * 是同一条纪律：多数人的结局不该比稀有的那一路草率。
       *
       * 而它不写成「失败」——他照旧每年冬天坐着，那件事照旧偶尔来一次。
       * **他这辈子就停在这儿了，而他自己并不觉得这是个结局。**
       */
      'still-nothing': {
        id: 'still-nothing',
        onEnter: [
          { type: 'undertake', undertaking: PRACTISING, done: true },
          { type: 'flag', key: 'warmth-stayed-small', value: true },
          { type: 'chronicle', text: '你守着那件事很多年，它一直没有再往前。' },
        ],
        blocks: [
          { kind: 'narration', text: '又是十几年。它还是那样——来一下，就没了。' },
          { kind: 'narration', text: '你渐渐不再指望它变成什么。' },
          { kind: 'divider', variant: 'dots' },
          { kind: 'narration', text: '入冬还是照坐。像一件做惯了的事，不做反倒不习惯。' },
          {
            kind: 'narration',
            text: '有时候你想，这件事大概就是这样了。也没什么不好。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const keepingEvents: readonly LifeEvent[] = [
  {
    /**
     * 守了很多年之后的那一年。
     *
     * ## 挂点为什么是「觉出过」而不是「确信过」
     *
     * 头一版挂在 `warmth-came-back`（`afterwards:again` 里「它又来了一次」
     * 那一支）。**4000 世实测：这一册零次到达。**而漏斗印出来是这样的：
     *
     *     0.4%     riverman#named-true   知道那本书是炼气法门
     *     0.22%    attempt:first#why     坐下来试
     *     0.03%    attempt#flicker       觉出一点热（掷 30%）
     *     0.003%   afterwards#came-back  确信（掷 10%）   ← 4000 世期望 0.12 人
     *     0.0005%  keeping#held          延寿（掷 16%）   ← 二十万世出一个
     *
     * **零次不是稀有，是这一册在真世里不存在。**
     * 而用户要的第三步「跑第一次延寿之后的寿命分布」在那个分母下交付不了。
     *
     * 所以挂点上移一档到 `felt-something`——用户指定的是
     * 「第一门真正学会并完成关键修行」，`came-back` 是我自己选的挂点，
     * 而它在「觉出过」和「练成」之间又插了一道 10% 的掷。
     *
     * **上移之后语义没有变松**：这一册写的是「他守着那件事很多年」，
     * 而守得住的前提是「他觉出过」，不是「他确信过」——
     * `afterwards` 那一卷里 90% 的人第二次什么也没有，
     * 他们照样会在往后的十几年里接着坐。
     *
     * ## 剩下的条件
     *
     *   觉出过　　`felt-something`——`attempt` 那 30%
     *   没放下　　`let-the-warmth-go` 不成立（真放下的人不在这一册里）
     *   没了结　　`warmth-held` / `warmth-stayed-small` 都不成立（只演一次）
     *   没在做别的
     *
     * `window` 从 40 起：`attempt` 最早十六岁、`afterwards-again` 是 22–55，
     * 而这一卷写的是「那之后又守了十几年」——**几卷之间要隔得开**。
     * 到 78 为止是因为凡人终年 p90 = 75、最大 82（4000 世实测），
     * 再往后就没人了。
     *
     * ⚠️ **上游那道真正的颈在 `riverman#named-true`（0.4%）**，
     * 这一册够不着它：要拿到那本书，得先在山道上遇见那个人，
     * 再揣着它走到渡口。拓宽它是另一个决定，不在这一片的范围里。
     */
    id: 'keeping-years',
    window: { from: 40, to: 78 },
    requires: [
      { flag: { key: 'felt-something', equals: true } },
      { flag: { key: 'let-the-warmth-go', absent: true } },
      { flag: { key: 'warmth-held', absent: true } },
      { flag: { key: 'warmth-stayed-small', absent: true } },
      { undertaking: { not: PRACTISING } },
      { undertaking: { not: 'mourning' } },
    ],
    scene: 'keeping:years',
    /*
     * 权重给得高，是因为**这一册的稀有全在 `requires` 里，不该再由抽签筛一道**。
     *
     * 够格的人是 4000 世里的 1 个（`felt-something` 那 0.07% 里活到四十的），
     * 而年表每一年要在几十个事件里抽。weight 16 的话，一个够格的人很可能
     * 一辈子也没抽中它——**那不是「稀有」，那是「够格了还得再中一次彩票」**。
     *
     * 「宽窗口低门槛事件会独占候选」那条纪律在这儿不适用：它的门槛窄到
     * 几千世才有一个人够得着，独占不了任何东西。
     */
    weight: 55,
  },
]
