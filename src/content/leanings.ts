import type { Damper, Leaning, Spark } from '@/types/leaning'

/**
 * 念头，和点着念头的那些事。
 *
 * ## 写新火种时的三条规矩
 *
 * 1. **火种不许自带剧情。** 它只认已经发生过的事：日录里的标记、
 *    身上的旗标、认识的人、知道的事。念头必须从人生里长出来，
 *    不能是另一套平行的剧本。
 *
 * 2. **`text` 写行为，不写心理。** 「你在那儿站了很久」可以，
 *    「你心中涌起一股向往」不行——后者是替玩家把话说完了。
 *
 * 3. **权重要小。** 一件事点不着一个念头，一个人的方向是几十件
 *    小事磨出来的。单条超过 6 就该问问自己是不是在走捷径。
 */

/** 七种念头。最后一种最常见，而且它不是失败路线 */
export const LEANINGS: readonly Leaning[] = [
  {
    id: 'leave',
    says: '你想离开这里。',
    stirring: '你时常望着村子外面。',
    echoes: [
      { tags: ['山那边'], text: '你在能看见远处的地方站了很久才回来。' },
      { tags: ['镇上'], text: '回来的路上你走得很慢。' },
      { tags: ['在家'], text: '你在门槛上坐着，看的是村口那条道。' },
    ],
  },
  {
    id: 'heal',
    says: '你想学看病。',
    stirring: '你对药和病症上心得反常。',
    echoes: [
      { tags: ['镇上'], text: '路过药铺时你往里看了一眼，闻见一股苦味。' },
      { tags: ['山那边'], text: '你顺手拔了几株认得的草，回来晾在窗台上。' },
      { tags: ['在家'], text: '家里谁咳嗽了一声，你回头看了很久。' },
    ],
  },
  {
    id: 'know',
    says: '你想弄明白那些说不通的事。',
    stirring: '有几件事你一直没想通。',
    echoes: [
      { tags: ['山那边'], text: '你又绕到上回那个地方看了看。什么也没有。' },
      { tags: ['私塾'], text: '你把先生不肯讲的那一段又翻了一遍。' },
      { tags: ['闲着'], text: '你把听来的几件事在心里翻来覆去对了半天。' },
    ],
  },
  {
    id: 'strong',
    says: '你不想再被人按住。',
    stirring: '你比从前更在意谁的拳头硬。',
    echoes: [
      { tags: ['找孩子玩'], text: '推搡起来的时候，你没有先松手。' },
      { tags: ['替家里下地'], text: '你有意挑了重的那一担。' },
      { tags: ['山那边'], text: '回来的时候你没有走大路，绕了远的那一条。' },
    ],
  },
  {
    id: 'rich',
    says: '你想让家里过得松快些。',
    stirring: '你算得比同龄人细。',
    echoes: [
      { tags: ['镇上'], text: '你把几家的价钱都问了一遍，虽然什么也不买。' },
      { tags: ['在家'], text: '你数了数家里还剩多少，没有跟人说。' },
    ],
  },
  {
    id: 'long',
    says: '你想活得久一点。',
    stirring: '你怕的东西跟从前不一样了。',
    echoes: [
      { tags: ['在家'], text: '你半夜醒过一次，听了很久屋里的动静。' },
      { tags: ['家里的大人'], text: '你留意到他今年比去年瘦。' },
    ],
  },
  {
    /**
     * 好好过日子。
     *
     * **这不是「没有目标」的委婉说法，它是一个真正的方向。**
     * 一辈子把地种好、把孩子拉扯大、平平安安走完——
     * 这是绝大多数人真实的一生，不是失败路线。
     *
     * 它也是七种里最容易长起来的一个，这一点是有意的。
     */
    id: 'settle',
    says: '你想把日子过安稳。',
    stirring: '你越来越见不得家里出事。',
    echoes: [
      { tags: ['替家里下地'], text: '收工的时候你又回头看了一眼地里。' },
      { tags: ['家里的大人'], text: '你陪着多坐了一会儿才去睡。' },
      { tags: ['在家'], text: '你把松了的那块门槛垫了垫，这回垫住了。' },
    ],
  },
]

/**
 * 点着念头的那些事。
 *
 * 权重都很小，是有意的：**一个人的方向是几十件小事磨出来的**，
 * 不是某一天忽然想通的。
 */
export const SPARKS: readonly Spark[] = [
  // ============================================================
  // 想离开
  // ============================================================
  {
    id: 'saw-the-road',
    leaning: 'leave',
    weight: 5,
    requires: [{ flag: { key: 'saw-the-road' } }],
    once: true,
    text: '你看见了那条通到别处去的道。此后每回上山，你都往那边看一眼。',
  },
  {
    id: 'heard-of-far',
    leaning: 'leave',
    weight: 3,
    requires: [{ knowledge: 'the-north' }],
    once: true,
    text: '商旅说起北边那三千里荒原时，你一句也没有打断。',
  },
  {
    id: 'to-town-often',
    leaning: 'leave',
    weight: 1,
    tags: ['镇上'],
    chance: 0.2,
    text: '你又往镇上跑了一趟。',
  },
  {
    id: 'up-the-hill',
    leaning: 'leave',
    weight: 1,
    tags: ['山那边'],
    chance: 0.2,
    text: '你往山那边走了走。',
  },
  {
    id: 'those-who-left',
    leaning: 'leave',
    weight: 4,
    requires: [{ knowledge: 'those-who-left' }],
    once: true,
    text: '听说有人跟着外路人走了，去了很远的地方。你问了好几遍那是哪儿。',
  },
  {
    id: 'fell-out',
    leaning: 'leave',
    weight: 3,
    requires: [{ flag: { key: 'fell-out-with-kids' } }],
    once: true,
    text: '那一伙人不叫你了。你一个人待着的时候，想的是别处。',
  },

  // ============================================================
  // 想学看病
  // ============================================================
  {
    id: 'born-to-herbs',
    leaning: 'heal',
    weight: 4,
    requires: [{ trade: '药铺' }],
    once: true,
    text: '你八岁就认得三十味药。别人家的孩子认不得。',
  },
  {
    id: 'someone-fell-ill',
    leaning: 'heal',
    weight: 6,
    requires: [{ flag: { key: 'illness-at-home' } }],
    once: true,
    text: '家里病倒一个人的那些天，你守在旁边，什么忙也帮不上。',
  },
  {
    id: 'the-odd-root',
    leaning: 'heal',
    weight: 3,
    requires: [{ knowledge: 'the-odd-root' }],
    once: true,
    text: '柜上那一味谁也认不出的药，你记了很久。',
  },

  // ============================================================
  // 想弄明白
  // ============================================================
  {
    id: 'strange-glyphs',
    leaning: 'know',
    weight: 4,
    requires: [{ knowledge: 'the-pedlar-book' }],
    once: true,
    text: '那册书上的字你一个也不认得。你翻了很多遍。',
  },
  {
    id: 'forbidden-page',
    leaning: 'know',
    weight: 4,
    requires: [{ knowledge: 'forbidden-page' }],
    once: true,
    text: '先生不肯讲的那一段，你自己回去翻了。',
  },
  {
    id: 'heard-of-adepts',
    leaning: 'know',
    weight: 3,
    requires: [{ knowledge: 'cultivators-exist' }],
    once: true,
    text: '有人说起那种不是江湖人的人。你追着问了很多句。',
  },
  {
    id: 'the-man-on-the-road',
    leaning: 'know',
    weight: 4,
    requires: [{ knowledge: 'the-man-on-the-road' }],
    once: true,
    text: '山道上那个人的事，你后来又想起过好几回。',
  },
  {
    id: 'idle-thinking',
    leaning: 'know',
    weight: 1,
    tags: ['闲着'],
    chance: 0.2,
    text: '你坐着想了半天事。',
  },

  // ============================================================
  // 不想再被人按住
  // ============================================================
  {
    id: 'the-fall',
    leaning: 'strong',
    weight: 6,
    requires: [{ flag: { key: 'the-fall' } }],
    once: true,
    text: '墙塌下来的那些日子，从前对你哈腰的人换了一副面孔。',
  },
  {
    id: 'scared-off',
    leaning: 'strong',
    weight: 4,
    requires: [{ flag: { key: 'wounded-outcome', equals: 'lift-fail-fighter' } }],
    once: true,
    text: '他一摸刀你就跑了。跑出很远才发现自己在发抖。',
  },
  {
    id: 'rough-play',
    leaning: 'strong',
    weight: 1,
    tags: ['找孩子玩'],
    chance: 0.2,
    text: '又是疯跑了一天。',
  },

  // ============================================================
  // 想让家里松快些
  // ============================================================
  {
    id: 'the-debt',
    leaning: 'rich',
    weight: 5,
    requires: [{ flag: { key: 'father-left' } }],
    once: true,
    text: '{elder}是为着一笔债走的。你听见过那个数目。',
  },
  {
    id: 'day-labour',
    leaning: 'rich',
    weight: 3,
    requires: [{ knowledge: 'day-labour' }],
    once: true,
    text: '镇上有按天给钱的活。你把这件事记住了。',
  },
  {
    id: 'offered-shopwork',
    leaning: 'rich',
    weight: 4,
    requires: [{ flag: { key: 'offered-shopwork' } }],
    once: true,
    text: '货栈那个伙计说过些日子来。你记着日子。',
  },
  {
    id: 'lean-year',
    leaning: 'rich',
    weight: 2,
    tags: ['粥稀了'],
    chance: 0.2,
    text: '今天的粥又稀了。',
  },

  // ============================================================
  // 想活得久一点
  // ============================================================
  {
    id: 'someone-died',
    leaning: 'long',
    weight: 6,
    requires: [{ bond: { kind: '生父', alive: false } }],
    once: true,
    text: '办完丧事的那天夜里，你想的是人怎么就没了。',
  },
  {
    id: 'famine-years',
    leaning: 'long',
    weight: 3,
    requires: [{ knowledge: 'old-famine' }],
    once: true,
    text: '老人说早年饿死过不少人。他说的时候很平常。',
  },
  {
    id: 'the-adept-lives',
    leaning: 'long',
    weight: 4,
    requires: [{ knowledge: 'immortal-tale' }],
    once: true,
    text: '山里那种人据说不吃不喝也能活。你想的是「活」这个字。',
  },

  // ============================================================
  // 想把日子过安稳
  // ============================================================
  {
    id: 'farm-day',
    leaning: 'settle',
    weight: 1,
    tags: ['替家里下地'],
    chance: 0.2,
    text: '又下了一天地。',
  },
  {
    id: 'sat-with-elder',
    leaning: 'settle',
    weight: 1,
    tags: ['家里的大人'],
    chance: 0.2,
    text: '晚上又陪着坐了一会儿。',
  },
  {
    id: 'kept-house',
    leaning: 'settle',
    weight: 1,
    tags: ['在家'],
    chance: 0.2,
    text: '在家待了一天。',
  },
  {
    id: 'told-the-truth',
    leaning: 'settle',
    weight: 5,
    requires: [{ flag: { key: 'told-the-truth-at-home' } }],
    once: true,
    text: '他头一回把家里的难处跟你说了。那天以后你就没再当自己是孩子。',
  },
  {
    id: 'good-year',
    leaning: 'settle',
    weight: 2,
    tags: ['替家里下地'],
    requires: [{ region: { harvest: { atLeast: 62 } } }],
    chance: 0.2,
    text: '场院上晒得满满的。你站着看了一会儿。',
  },
]

/**
 * 反向的火种：把念头压下去的那些事。
 *
 * **念头不能只会越来越强。** 一个人想离开家乡十年，可能最后真的走了，
 * 也可能因为爹娘老了留下来，也可能出去一趟发现外面并不像自己想的那样。
 *
 * 这跟认知系统里那条「解释可以往下掉」是同一个立场：
 * 玩家对世界的认识会改变，**玩家对自己想要什么的认识也会改变。**
 *
 * `instead` 那一项尤其要紧：一个念头被压下去的时候，
 * 顶上来的往往是另一个念头，而不是一片空白。
 */
export const DAMPERS: readonly Damper[] = [
  {
    /**
     * 家里离不得人。
     *
     * 这是最常见的那一种——他没有改主意，他只是走不开。
     * 而年复一年地走不开，跟改了主意其实差不多。
     */
    id: 'needed-at-home',
    leaning: 'leave',
    weight: 5,
    instead: { leaning: 'settle', weight: 3 },
    requires: [{ flag: { key: 'illness-at-home' } }],
    once: true,
    text: '家里病倒一个人的那阵子，你没有再提过出门的话。',
  },
  {
    /**
     * 他老了。
     *
     * 一句「你留意到他今年比去年瘦」，比任何劝阻都管用。
     */
    id: 'elder-aging',
    leaning: 'leave',
    weight: 2,
    instead: { leaning: 'settle', weight: 2 },
    tags: ['家里的大人'],
    chance: 0.14,
    text: '你留意到他今年比去年瘦。你想的是自己要是不在，谁来管。',
  },
  {
    /**
     * 走过一趟之后。
     *
     * **这一条是 D 那种人生的枢纽。** 他真的走了，也真的回来了——
     * 而回来的人跟走之前不是同一个人：他现在知道外面是什么样子了。
     */
    id: 'been-out-there',
    leaning: 'leave',
    weight: 8,
    instead: { leaning: 'settle', weight: 5 },
    requires: [{ flag: { key: 'came-back' } }],
    once: true,
    text: '你回来了。路上那两个月，你想起家里的次数比想起别处多。',
  },
  {
    /**
     * 那一伙人又叫你了。
     *
     * 「想离开」里有一部分是「这儿没什么好留恋的」。
     * 这一条把那部分抽掉。
     */
    id: 'made-up-with-kids',
    leaning: 'leave',
    weight: 2,
    tags: ['找孩子玩'],
    requires: [{ flag: { key: 'fell-out-with-kids' } }],
    chance: 0.12,
    text: '打谷场上有人喊了你一声。你过去了，谁也没提从前那件事。',
  },
]
