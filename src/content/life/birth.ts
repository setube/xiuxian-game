import { ORIGINS } from '@/content/origins'
import type { LifeEvent, NarrativeBlock, Scene, SceneLibrary, Trade } from '@/types/game'

/**
 * 出生。
 *
 * 玩家不选出身，也看不到有得选。游戏第一句话就是既成事实：
 * 「你生在柳溪村，家里有六亩薄田。」
 *
 * 这一卷只有两节：睁开眼，然后被取了个名字。
 * 之后直接跳到三岁——一个人记不住三岁以前的事，
 * 那几年在这个游戏里也就不该有正文。
 */

export function birthSceneId(trade: Trade): string {
  return `birth:${trade}`
}

/** 取名这一节。识字人家自己提笔，不识字的要去求人——名字本身就是家世 */
const NAMING: Record<Trade, readonly NarrativeBlock[]> = {
  农户: [
    { kind: 'narration', text: '满月那天，父亲抱着你走了二里地，去村东找识字的老先生。' },
    { kind: 'narration', text: '老先生问：想要个什么意思的？' },
    { kind: 'dialogue', speaker: '父亲', text: '好养活就行。' },
    { kind: 'narration', text: '老先生在纸上写了两个字：{name}。' },
    { kind: 'narration', text: '父亲看不懂，但收好了那张纸。那张纸后来一直压在箱底。' },
  ],
  猎户: [
    { kind: 'narration', text: '你的名字是{dam}叫出来的。' },
    { kind: 'narration', text: '她在灶前哄你，随口叫了一声，就那么叫下去了：{name}。' },
    { kind: 'narration', text: '父亲从山里回来，听了一遍，点了点头。' },
    { kind: 'narration', text: '这个名字很多年都没有写在纸上过。' },
  ],
  匠户: [
    { kind: 'narration', text: '父亲在一块碎木上刻了你的名字：{name}。' },
    { kind: 'narration', text: '刻完他吹掉木屑，端详了很久。' },
    { kind: 'dialogue', speaker: '父亲', text: '笔画多，将来自己会写就好。' },
    { kind: 'narration', text: '那块木头放在窗台上。日头晒了几年，字还在。' },
  ],
  商户: [
    { kind: 'narration', text: '满月那天，父亲从账房里取出笔。' },
    { kind: 'narration', text: '他写了三个名字，划掉两个，留下一个：{name}。' },
    { kind: 'dialogue', speaker: '父亲', text: '这个字，写起来利落。' },
    { kind: 'narration', text: '他把纸贴在铺子后堂的柱子上。来往的伙计都识得那两个字。' },
  ],
  客栈: [
    { kind: 'narration', text: '满月那天，店里恰好住着个赶考的书生。' },
    { kind: 'narration', text: '父亲免了他两日房钱，请他取个名字。' },
    { kind: 'narration', text: '书生想了半晌，蘸着茶水在桌上写了两个字：{name}。' },
    { kind: 'dialogue', text: '取个来去平安的意思。' },
    { kind: 'narration', text: '第二天他就走了。此后再没来过。' },
  ],
  酒楼: [
    { kind: 'narration', text: '满月摆了两桌，来的都是街坊。' },
    { kind: 'narration', text: '名字是账房先生取的，写在红纸上，贴在柜台后面。' },
    { kind: 'narration', text: '{name}。' },
    { kind: 'narration', text: '那天父亲喝多了，抱着你在楼下走了一圈，逢人就念一遍。' },
  ],
  药铺: [
    { kind: 'narration', text: '满月那天，父亲翻了半宿的药书。' },
    { kind: 'narration', text: '他说药名里的字都是好字，草木都有性情。' },
    { kind: 'narration', text: '最后写下的是：{name}。' },
    { kind: 'narration', text: '{dam}在旁边看了看，说：这个字，写起来倒也不难。' },
    { kind: 'narration', text: '那张纸夹进了药书里。你后来自己翻到过。' },
  ],
  镖局: [
    { kind: 'narration', text: '你出生时父亲不在。名字是总镖头取的。' },
    { kind: 'narration', text: '老爷子提笔就写，一点没犹豫：{name}。' },
    { kind: 'dialogue', text: '走镖的人家，名字硬气些好。' },
    { kind: 'narration', text: '父亲回来听说了，也没改。' },
  ],
  官宦: [
    { kind: 'narration', text: '你的名字父亲想了七天。' },
    { kind: 'narration', text: '他翻了书，又写信问过一位同年，来回折腾了大半个月。' },
    { kind: 'narration', text: '最后定下来的是：{name}。' },
    { kind: 'dialogue', speaker: '父亲', text: '这个字，往上数三代都没人用过。' },
    { kind: 'narration', text: '他把名字写进族谱那天，还特意换了身衣裳。' },
  ],
  王府: [
    { kind: 'narration', text: '取名这件事，家里一个人也做不了主。' },
    { kind: 'narration', text: '宗正寺按族谱排了字辈，报上去，等了一个月才批下来。' },
    { kind: 'narration', text: '{name}。' },
    { kind: 'narration', text: '父亲看了一眼那道文书，说了句「就这样吧」。' },
    { kind: 'narration', text: '名字入了玉牒。那一页纸你这辈子都不会看见。' },
  ],
  皇室: [
    { kind: 'narration', text: '你的名字是父亲圈的。' },
    { kind: 'narration', text: '宗正寺拟了八个，钦天监核过生辰，一并呈了上去。' },
    { kind: 'narration', text: '御笔在其中一个上画了个圈：{name}。' },
    { kind: 'narration', text: '母妃后来跟你说，那天她跪着听完了整道旨。' },
    { kind: 'narration', text: '这个名字从一开始就写在纸上，写在很多张纸上。' },
  ],
}

/**
 * 名字是谁给的——生下来就没爹的孩子，这一段完全不同。
 *
 * 这不是「补一段孤儿文案」。名字由谁取，本身就是这个人一生的第一条信息：
 * 有爹的孩子，名字是爹在纸上写的、在木头上刻的；
 * 没爹的孩子，名字是庙里排的、是捡到他的人随口叫的，
 * 甚至根本没人正经给过他一个名字。
 */
const NAMELESS: readonly NarrativeBlock[] = [
  { kind: 'narration', text: '你的名字不是爹娘给的。' },
  { kind: 'narration', text: '养你的那个人识不得几个字，想了两天，随口定下两个字：{name}。' },
  { kind: 'narration', text: '没有写在纸上，也没有报进族谱。' },
  {
    kind: 'narration',
    text: '很多年以后你才想到，自己其实不知道爹娘给没给过你名字。',
    tone: 'faint',
  },
]

/** 生下来就没有生父的开场。不写「家里有六亩薄田」——那不是他的家 */
const ORPHAN_OPENING: readonly NarrativeBlock[] = [
  { kind: 'narration', text: '关于你怎么来的，没有人说得清。' },
  { kind: 'narration', text: '后来听说，那年冬天有人在门口发现了你。' },
  { kind: 'narration', text: '你活下来了。这件事本身就已经很不容易。' },
]

/** 从出生跳到能记事那年。四种出身共用 */
const AWAKENING: readonly NarrativeBlock[] = [
  { kind: 'divider', variant: 'ink' },
  { kind: 'narration', text: '再往后的事，你就记得住了。' },
]

/**
 * 宗室生下来就有封号，而封号分男女。
 *
 * 这是全作唯一一处非分性别不可的地方——别处一律不分，
 * 不是因为古代女子的人生和男子一样，而是因为写一半比不写更糟。
 */
const TITLES: Partial<Record<Trade, { 男: string; 女: string }>> = {
  王府: { 男: '世子', 女: '郡主' },
  皇室: { 男: '皇子', 女: '公主' },
}

function birthScene(trade: Trade): Scene {
  const origin = ORIGINS.find((item) => item.trade === trade) ?? ORIGINS[0]!
  const title = TITLES[trade]
  return {
    id: birthSceneId(trade),
    title: '出生',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        blocks: [{ kind: 'heading', title: '生' }],
        // 生下来就没爹的孩子，读到的是另一段。
        // 不这么分流的话，弃儿的第一屏是「父亲抱着你走了二里地去取名」
        branches: [{ requires: [{ bond: { kind: '生父', alive: true } }], next: 'kept' }],
        next: 'abandoned',
      },

      kept: {
        id: 'kept',
        blocks: [...origin.opening, { kind: 'divider', variant: 'dots' }, ...NAMING[trade]],
        // 封号跟着性别走。生在别家的孩子这一步什么也不发生
        ...(title
          ? {
              branches: [{ requires: [{ gender: '女' as const }], next: 'titled-female' }],
              next: 'titled-male',
            }
          : { next: 'wake' }),
      },

      /**
       * 生下来就没有生父的那一支。
       *
       * 不是「补一段孤儿文案」——这里连开场都换了：
       * 「你生在柳溪村，家里有六亩薄田」对他不成立，那不是他的家。
       * 名字由谁取更是这个人一生的第一条信息：
       * 有爹的孩子，名字是爹在纸上写的、在木头上刻的；
       * 没爹的孩子，名字是捡到他的人随口定的，没写在纸上，也没进族谱。
       */
      abandoned: {
        id: 'abandoned',
        blocks: [...ORPHAN_OPENING, { kind: 'divider', variant: 'dots' }, ...NAMELESS],
        next: 'wake',
      },
      ...(title
        ? {
            'titled-male': {
              id: 'titled-male',
              onEnter: [{ type: 'identity', identity: title.男 }],
              blocks: [],
              next: 'wake',
            },
            'titled-female': {
              id: 'titled-female',
              onEnter: [{ type: 'identity', identity: title.女 }],
              blocks: [],
              next: 'wake',
            },
          }
        : {}),
      wake: {
        id: 'wake',
        // 三岁以前没有正文，因为没有记忆。时间照走
        onEnter: [{ type: 'time', years: 3 }],
        blocks: [...AWAKENING],
      },
    },
  }
}

export const birthScenes: SceneLibrary = Object.fromEntries(
  ORIGINS.map((origin) => [birthSceneId(origin.trade), birthScene(origin.trade)]),
)

/** 出生是第零年唯一会发生的事。按出身分四卷，条件互斥 */
export const birthEvents: readonly LifeEvent[] = ORIGINS.map((origin) => ({
  id: `birth-${origin.trade}`,
  window: { from: 0, to: 0 },
  requires: [{ trade: origin.trade }],
  scene: birthSceneId(origin.trade),
}))
