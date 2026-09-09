import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 试着照书上说的做。
 *
 * 这是施工决议第 ⑤ 件——修仙第一条纵切的最后一段：
 *
 *     凡人 → 听说修士 → 主动寻找 → 真正遇见 → 认识一个修士
 *     → 产生修行愿望 → **尝试学习 → 第一次修炼 → 成功 / 失败**
 *
 * 前面几步库里都有了（`kin` 听说、`seeking` 找、`meeting` 照面、
 * `riverman` 那本书）。**唯独最后一步是空的**：他揣着一册炼气法门，
 * 知道那是修行的入门之法，然后这辈子再没打开过它。
 *
 * ## 到此收住
 *
 * 用户拍板时明说：第一条纵切**终点就是第一次实际修炼，成功或失败**。
 * 不碰宗门、境界、丹药、法宝、秘境。所以这一册里：
 *
 *   没有「炼气一层」——境界是修行世界用来划分层次的制度语言，
 *   而他连门都还没进，谁也没资格给他划一个层
 *   没有功法列表——他手里就这一本，看不看得懂另说
 *   没有灵石灵药——那是有了门路之后的事
 *
 * 它只回答一个问题：**这个人试了，然后呢。**
 *
 * ## 为什么大多数人试了也没成
 *
 * 不是因为掷骰对他不利，是因为三样东西他多半没有：认得字、
 * 有人点过、身子骨撑得住。三样齐了也未必成——**但一样没有，
 * 那本书就只是一册看不懂的纸**。
 *
 * 这跟这个世界对修行的整个立场是一回事：修仙不是主线，
 * 是极难碰上又极难走通的一条路。
 */
export const attemptScenes: SceneLibrary = {
  'attempt:first': {
    id: 'attempt:first',
    title: '照着做',
    entry: 'why',
    nodes: {
      /**
       * 他为什么坐下来。
       *
       * ## 28.md 那句话落到这一节上
       *
       *   > 财富、权力、长生，是修仙最核心的三类现实目的；修仙本身不是目的。
       *
       * 从前这一册的入场只问三样——手里有那册书、知道那是什么、没在试。
       * **一次也没问过他图什么。** 于是同一个人，办完丧事那夜起过念头的，
       * 和被人踩了半辈子的，坐下来时读到的是同一句「那册书你翻过很多回」。
       *
       * 三类目的在库里早有对应物，都是从真经历里长出来的（`content/leanings.ts`）：
       *
       *     live-long   守在旁边帮不上忙、办完丧事那一夜　→ 长生
       *     rich        家底跌破线、看着别人家的院子　　　→ 财富
       *     strong      被人踩、说不上话　　　　　　　　　→ 权力
       *
       * ## 这一节只改「他为什么坐下来」，不改「坐下来之后成不成」
       *
       * 分完岔一律汇进 `open`，`outcome` 那一掷一个字没动。念头要是能提高
       * 成功率，它就成了隐藏加成——那是属性系统，而 28.md 第五节反对的
       * 正是把「我想修仙」写成一个 `true`。
       *
       * ## 为什么问 `atLeast: '反复'` 而不是「明白」
       *
       * 「明白」是他自己把话说出来了，那种人有，但少。「反复」是他开始
       * 总往那边看却说不出为什么——**一个揣着说不清的念头去试的人，
       * 才是这一册最常见的样子**。
       *
       * 「埋着」问不了：`peakStageOf` 对从没长过的念头也返回「埋着」，
       * 那一条对每个人都成立（类型层已排除，见 `Condition.leaning`）。
       *
       * ## 排在前面的更具体
       *
       * `branches` 取第一条满足的就走。一个人可能同时揣着两个念头
       * （想活久、也想过得好），这时候取哪一个都对——**排在前面的是
       * 更少见的那个**，让稀有的念头有机会被说出来，而不是永远被
       * 「想过得好」盖过去。
       */
      why: {
        id: 'why',
        blocks: [],
        branches: [
          { requires: [{ leaning: { id: 'live-long', atLeast: '反复' } }], next: 'for-long' },
          { requires: [{ leaning: { id: 'strong', atLeast: '反复' } }], next: 'for-strong' },
          { requires: [{ leaning: { id: 'rich', atLeast: '反复' } }], next: 'for-rich' },
        ],
        next: 'open',
      },

      /** 长生。他见过人怎么没的，而书上说有人能不那样 */
      'for-long': {
        id: 'for-long',
        blocks: [
          { kind: 'narration', text: '你想起那几天守在旁边，什么忙也帮不上。' },
          { kind: 'narration', text: '书上那几页说的，好像是另一种活法。' },
        ],
        next: 'open',
      },

      /** 权力。不是「想掌权」，是「不愿意再被人那样看着」 */
      'for-strong': {
        id: 'for-strong',
        blocks: [
          { kind: 'narration', text: '你想起有些话你说了不算，有些人看你的眼神。' },
          { kind: 'narration', text: '书上写的那些人，大约不必受这个。' },
        ],
        next: 'open',
      },

      /** 财富。落到明代一个普通人身上，是「家里那点底子经不起一次病」 */
      'for-rich': {
        id: 'for-rich',
        blocks: [
          { kind: 'narration', text: '你想起家里那点底子，经不起一场病、一个荒年。' },
          { kind: 'narration', text: '要是真有点旁人没有的本事，日子大概不一样。' },
        ],
        next: 'open',
      },

      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 4 },
          { type: 'undertake', undertaking: 'practising' },
          { type: 'chronicle', text: '你开始照着那册书上说的做。' },
        ],
        blocks: [
          { kind: 'narration', text: '那册书你翻过很多回，认得的字连不成句。' },
          { kind: 'narration', text: '有几页画着人，坐着，手放在膝上。' },
          { kind: 'event', text: '你试着照那个样子坐了。' },
          { kind: 'narration', text: '头一回坐了半炷香，腿麻得站不起来。' },
        ],
        choices: [
          {
            /**
             * 认字的那一条路。
             *
             * 它不保证成——**读过书只是让他看得懂那几行字**，
             * 而看得懂和做得到是两件事。
             */
            id: 'read',
            label: '一个字一个字地认',
            requires: [{ flag: { key: 'schooled', equals: true } }],
            hint: '你念过几年书，认得的字比多数人多',
            echo: '你一个字一个字地认。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'insight', delta: 5 },
              { type: 'attribute', key: 'will', delta: 4 },
              { type: 'flag', key: 'read-the-book', value: true },
            ],
            next: 'outcome',
          },
          {
            id: 'copy',
            label: '照着画上的样子坐',
            hint: '字看不懂，画总看得懂',
            echo: '你照着画上的样子坐。',
            effects: [
              { type: 'time', years: 1 },
              { type: 'attribute', key: 'will', delta: 6 },
              { type: 'attribute', key: 'body', delta: -2 },
            ],
            next: 'outcome',
          },
          {
            /**
             * 收起来不看了。
             *
             * 这一条不是失败，是**大多数人真实的选择**——手里的活不会自己少，
             * 而那册书三年五载看不出名堂。收起来的人后来多半也就那样了，
             * 可这件事仍旧留在他这一生里（年表记着，书还在箱子里）。
             */
            id: 'shelve',
            label: '收起来，先过日子',
            echo: '你把书收回了箱底。',
            effects: [
              { type: 'time', months: 6 },
              { type: 'undertake', undertaking: 'practising', done: true },
              { type: 'chronicle', text: '你把那册书收了起来。' },
            ],
            next: 'shelved',
          },
        ],
      },

      /**
       * 成没成。
       *
       * 掷一次，而三样东西改变分布：认得字、有人点过（山道那个人）、
       * 身子骨。**三样齐了也未必成**——这一掷玩家看不见，
       * 他只知道自己坐了一年，有没有觉出什么不一样。
       */
      outcome: {
        id: 'outcome',
        onEnter: [
          {
            type: 'roll',
            key: 'first-attempt',
            among: [
              { value: 'nothing', weight: 62 },
              { value: 'a-flicker', weight: 30 },
              { value: 'hurt', weight: 8 },
            ],
          },
        ],
        blocks: [],
        branches: [
          { requires: [{ flag: { key: 'first-attempt', equals: 'a-flicker' } }], next: 'flicker' },
          { requires: [{ flag: { key: 'first-attempt', equals: 'hurt' } }], next: 'hurt' },
        ],
        next: 'nothing',
      },

      /**
       * 什么也没有。最常见的那一种。
       *
       * 议亲那一册的立场在这儿再说一遍：**「没成」跟「成了」是同一层的
       * 两个结局，不是失败分支。** 他试过了，这件事真发生过。
       */
      nothing: {
        id: 'nothing',
        onEnter: [
          { type: 'undertake', undertaking: 'practising', done: true },
          { type: 'chronicle', text: '坐了一年，什么也没有。' },
        ],
        blocks: [
          { kind: 'narration', text: '一年下来，腿是坐得住了，别的什么也没有。' },
          { kind: 'narration', text: '你有时候想，那个人给你这本书，会不会只是随手。' },
          { kind: 'narration', text: '书还在箱子里。你偶尔还翻。', tone: 'faint' },
        ],
      },

      /**
       * 觉出了一点什么。
       *
       * **这一节是这条纵切的终点，也到此为止。** 不给境界、不给功法、
       * 不开宗门——他只是在某个清早觉出胸口有一点异样，而且他不确定
       * 那是不是自己想出来的。
       *
       * 用户拍板：「到这里收住。先证明修仙真的可以从凡人世界自然长出来。」
       */
      flicker: {
        id: 'flicker',
        onEnter: [
          { type: 'undertake', undertaking: 'practising', done: true },
          { type: 'flag', key: 'felt-something', value: true },
          {
            type: 'knowledge',
            id: 'that-warmth',
            title: '那一点热',
            summary: '某个清早坐着的时候，胸口有一点热，很轻，一会儿就没了。你不确定那是什么。',
            contact: '亲历',
            category: '修行',
          },
          { type: 'chronicle', text: '某个清早，你觉出了一点什么。', tone: 'deep' },
        ],
        blocks: [
          { kind: 'narration', text: '第二年入春的一个清早，天还没大亮。' },
          { kind: 'event', text: '胸口有一点热。很轻，一会儿就没了。', tone: 'deep' },
          { kind: 'narration', text: '你睁开眼坐了很久，想再试一次，没有再来。' },
          { kind: 'narration', text: '你没跟任何人说这件事。说了也没有人听得懂。', tone: 'faint' },
        ],
      },

      /**
       * 坐出毛病来了。
       *
       * 没有人教，照着一册看不懂的书瞎坐，本来就可能出事。
       * 这一节不写「走火入魔」那种词——**他只是伤了身子，
       * 而且他自己也不知道是不是因为那件事。**
       */
      hurt: {
        id: 'hurt',
        onEnter: [
          { type: 'undertake', undertaking: 'practising', done: true },
          { type: 'attribute', key: 'body', delta: -8 },
          { type: 'chronicle', text: '那一年你病了一场，此后夜里常盗汗。', tone: 'cinnabar' },
        ],
        blocks: [
          { kind: 'narration', text: '入夏之后你常觉得胸闷，坐久了眼前发黑。' },
          { kind: 'narration', text: '郎中问你近来做了什么，你说没什么。' },
          { kind: 'event', text: '那一年你病了一场。', tone: 'cinnabar' },
          { kind: 'narration', text: '好了以后夜里常盗汗。你把书收了起来。', tone: 'faint' },
        ],
      },

      shelved: {
        id: 'shelved',
        blocks: [
          // 原先写「地里的活不会自己少」——那默认了这个人务农，而他可能是
          // 铺子里的伙计、匠人、宫里出来的。`upbringing.ts` 当场抓到了这一处：
          // **正文默认出身是这一册最容易犯的错，因为写的人自己有一个默认的人**
          { kind: 'narration', text: '手里的活不会自己少，那册书三年五载也看不出名堂。' },
          { kind: 'narration', text: '你把它压在箱底，上头很快摞了别的东西。' },
          { kind: 'narration', text: '后来有几回你想起它，也就是想起而已。', tone: 'faint' },
        ],
      },
    },
  },
}

export const attemptEvents: readonly LifeEvent[] = [
  {
    /**
     * 试着照书上说的做。
     *
     * 三条 `requires` 是这条纵切前面几步留下的东西，一样不能少：
     *
     *   手里有那册书　　`item: thin-book`——山道上那个人给的
     *   知道那是什么　　`knowledge: qi-refining`——青衫人点破的那一句
     *   没在试　　　　　`undertaking not: practising`——一次只试一回
     *
     * **前两条决定了这一卷极其稀有**：得先在山道上救过人、
     * 得先走到渡口、得先遇见那个青衫人。绝大多数人生里它一次也不出现，
     * 而那正是修仙在这一册里该有的样子。
     */
    id: 'attempt-first',
    window: { from: 16, to: 60 },
    requires: [
      { item: 'thin-book' },
      { knowledge: 'qi-refining' },
      { undertaking: { not: 'practising' } },
    ],
    scene: 'attempt:first',
    weight: 10,
  },
]
