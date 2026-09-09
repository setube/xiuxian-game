import { PRIME_UP } from '@/engine/stages'
import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 他还在那里称药。
 *
 * ## 这一册写的不是他不老，是玩家自己开始进入另一个时间尺度
 *
 * 用户 2026-09-10 定的形状——**参照物是玩家身边的人，不是那个修士**：
 *
 *     你认识他的时候，他已经是一个年轻人。
 *     二十年以后，你的父亲死了。
 *     十年以后，你的兄长老了。
 *     又过十年，你自己已经头发花白。
 *     他仍然在那里称药。
 *
 * > **不是他活得特别久，而是自己已经开始进入另一个时间尺度。**
 *
 * 而这件事**不需要等「长生」**。库里三个不老的修士全都会死
 * （`span` 200/160），可这一册照样成立——它写的是三十年、
 * 四十年这个尺度上的落差，不是五百年。
 *
 * ## 跟 `mountain:unaged` 的分工
 *
 * 那一卷（窗口 30–49）写的是**察觉**：认识二十年、三十年、四十年，
 * 同一件事读出来一层比一层重（`Condition.unaged.knownFor` 那三句）。
 *
 * 这一册（窗口 50 起）写的是**代价**：察觉完了之后又过了很多年，
 * 而这些年里死的、老的、变样的全是玩家这边的人。
 *
 *     unaged   他没变          ← 看的是他
 *     still    我这边全变了    ← 看的是自己
 *
 * ## 三条不做
 *
 * 一、**不做「他透露了什么」。** 他一个字也没多说。二十年前
 *     「别出去乱说」那条规矩到今天还管着，而他从来没有解释过。
 * 二、**不做羡慕，也不做怨。** 玩家读到的是一个事实，不是一种情绪——
 *     那是他自己的事。
 * 三、**不做「所以我也要去修行」。** 五十几岁才动这个念头是另一卷，
 *     而且多数人不会。这一册到「他还在那里称药」为止。
 */

/** 药庐那位。见 `content/cultivators.ts` */
const SHED = 'herbalist-at-the-shed'
const FOOTING = `footing:${SHED}`

/** 在药庐立得住脚的那几档。跟 `mountain.ts` 同一份名单 */
const AT_THE_SHED = ['使唤', '带一段', '教一点'] as const

export const stillScenes: SceneLibrary = {
  /**
   * 又过了很多年。
   *
   * 起头是他称药——跟 `mountain:down` 头一节、`mountain:unaged` 头一节
   * 是同一个动作。**三卷相隔几十年，而他做的是同一件事**，
   * 这一册的全部分量就在这个重复上。
   */
  'still:weighing': {
    id: 'still:weighing',
    title: '他还在那里称药',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [{ type: 'time', days: 1 }],
        blocks: [
          { kind: 'narration', text: '你进去的时候他在称药。称完了拿手指把戥子上的一点碎末抹平。' },
          {
            kind: 'narration',
            text: '你在门口站了一会儿才进去。这几年走这段路要歇一次。',
          },
        ],
        /*
         * 这些年里变了的全是玩家这边的人。
         *
         * ⚠️ **每一条都问了前提**，不预设玩家有爹、有兄、有子——
         * 「你起来喂了鸡」那个形状。一个孤身的人读到的是最后那两条，
         * 而那两条一个人也不问，只问他自己。
         */
        seen: [
          {
            requires: [{ bond: { kind: '生父', has: true, alive: false } }],
            text: '你爹埋在坡上，坟头的草你今年春上才去割过。',
          },
          {
            requires: [{ bond: { kind: '兄', has: true, alive: true, near: true } }],
            text: '你哥比你大三岁，去年起耳朵背了，说话要凑到跟前。',
          },
          {
            requires: [{ bond: { kind: '子', near: true } }],
            text: '你儿子如今是当家的了。家里的事你已经好几年不管。',
          },
          {
            requires: [{ outlived: { atLeast: 8 } }],
            text: '这些年送走的人，你已经数不清了。',
          },
          {
            // 谁都读得到的那一条。头发花白不问家里有谁
            requires: [],
            text: '你自己的头发全白了。低头的时候看得见落在戥子盘上的那几根。',
          },
        ],
        branches: [
          /*
           * ⚠️ 更具体的排在前面（`branches` 取第一条满足的就走）。
           *
           * 认识四十年以上的那一支要排在三十年前面，否则永远轮不到——
           * 那是「写了走不到的分支」那一族。
           */
          {
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 }, knownFor: { atLeast: 40 } } }],
            next: 'forty',
          },
          {
            requires: [{ unaged: { who: SHED, by: { atLeast: 20 }, knownFor: { atLeast: 30 } } }],
            next: 'thirty',
          },
        ],
        next: 'thirty',
      },

      /**
       * 认识三十年以上。
       *
       * **他这一节一个字也没多说**——问了一句药，然后各干各的。
       * 那正是这一卷要的：不是他隐瞒，是这件事对他根本不值一提。
       */
      thirty: {
        id: 'thirty',
        onEnter: [
          { type: 'flag', key: 'still-weighing', value: true },
          { type: 'chronicle', text: '你又去了一趟药庐。他还是那个样子。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '他问你今年的腿还疼不疼。' },
          { kind: 'event', text: '「入冬之前来拿。」他说。' },
          { kind: 'narration', text: '你说好。' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '出门的时候你回头看了一眼。他低着头在称下一味。',
            tone: 'faint',
          },
        ],
      },

      /**
       * 认识四十年以上。**这一节多一样东西：他记得。**
       *
       * 而他记得的是玩家十三岁那年的事——那是这一卷唯一一处
       * 让玩家意识到「在他那边，这四十年是一段短得可以随口提起的日子」。
       *
       * ⚠️ 他仍然没有解释任何事。他只是提了一句。
       */
      forty: {
        id: 'forty',
        onEnter: [
          { type: 'flag', key: 'still-weighing', value: true },
          { type: 'flag', key: 'still-he-remembers', value: true },
          {
            type: 'chronicle',
            text: '他提起你头一回来的时候，说你那会儿够不着戥子。',
            tone: 'deep',
          },
          /*
           * 停下来掂量一回。老年那一段没有日结，念头那层不在这儿点就一辈子冻着
           * ——`mountain:unaged` 的 `he-is-of-it` 那一节也是为这个加的 reflect。
           */
          { type: 'reflect' },
        ],
        blocks: [
          { kind: 'narration', text: '他称完那一味，忽然说了一句。' },
          { kind: 'event', text: '「你头一回来，够不着这个戥子。」', tone: 'deep' },
          { kind: 'narration', text: '你说是，那年十三。' },
          { kind: 'narration', text: '他点点头，没再说什么，低头去称下一味。' },
          { kind: 'divider', variant: 'dots' },
          {
            kind: 'narration',
            text: '你忽然想到，那是四十年前的事。而他说起来，像是说上个月。',
            tone: 'faint',
          },
        ],
      },
    },
  },
}

export const stillEvents: readonly LifeEvent[] = [
  {
    /**
     * 又去了一趟药庐。
     *
     * ## 窗口从五十起，接在 `mountain:unaged` 后面
     *
     *     mountain-unaged   30 – 49   察觉：他没变
     *     still-weighing    50 起     代价：我这边全变了
     *
     * 五十不是随手取的：`PRIME_UP`（壮年那一段的末岁）就是 49，
     * 这一册整个落在老年那一段——**而它要的正是那一段**，
     * 因为「你自己的头发全白了」在四十岁说不出口。
     *
     * ## 条件
     *
     *   立得住脚　`footing` 在那三档里（跟 `mountain` 同一份名单）
     *   他还在　　`family alive`——他会死（`span: 200`，但内容可以杀他）
     *   没被赶走　`shut-out-by-the-shed` 不成立
     *   只演一次　`still-weighing` 不成立
     *
     * ⚠️ **不问 `unaged`**：那一条留给 `branches` 分岔。
     * 写进入场条件的话，一个「认识他但没察觉」的人整卷读不到——
     * 而这一册最底下那几句（爹埋在坡上、头发白了）对他一样成立。
     */
    id: 'still-weighing',
    window: { from: PRIME_UP + 1, to: 90 },
    requires: [
      { family: { id: SHED, alive: true } },
      { flag: { key: FOOTING, in: [...AT_THE_SHED] } },
      { flag: { key: 'shut-out-by-the-shed', absent: true } },
      { flag: { key: 'still-weighing', absent: true } },
    ],
    scene: 'still:weighing',
    /*
     * 权重高，理由跟 `keeping` 那一册同一条：**这一册的稀有全在
     * `requires` 里**（要在药庐立得住脚、要活到五十、他还得在），
     * 不该再由抽签筛一道。
     */
    weight: 45,
  },
]
