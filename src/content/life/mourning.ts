import type { LifeEvent, SceneLibrary } from '@/types/game'

/**
 * 服丧。
 *
 * 这一册只做一件事：**让守孝有个尽头。**
 *
 * 守孝是「过程中状态」的第二个使用者（第一个是议亲），也是它头一回
 * 让两件事撞上——`match:offer` 那一卷问 `{ undertaking: { not: 'mourning' } }`，
 * 于是守孝这几年媒人不上门。
 *
 * 可 `Undertaking` 上没有 deadline（用户拍板的三条边界之一：
 * **不拥有自己的流转规则**），三年到了它自己不会停。所以得有一卷真的走到，
 * 由它落那一笔 `undertake done`。少了它，守孝就是无期的——
 * 而那不是礼法，是漏写。
 *
 * ## 为什么单独一册，不塞进 illness.ts
 *
 * 头一版塞在那儿，`verify` 当场红：
 *
 *     illness　mourning-over　窗口 11–70，而这一章写的是 8–16
 *
 * 判据说得对。那一章讲的是「家里病倒一个人的那阵子」，八到十六岁；
 * 而守孝服的可能是爹、是娘、是哥，一辈子里哪一年都可能撞上。
 * **章界不是分类抽屉，是「这一段人生里会发生什么」**——
 * 一件横跨六十年的事塞进八年的章里，那一章就不再说得清自己是什么了。
 *
 * ## 什么时候孝满，这一册故意不精确
 *
 * 散事件掷到才演，可能第三年，也可能第五年。这不是偷懒——
 * **孝满在这个世界里本来就不是一个日子**，是家里人某一天忽然发现
 * 门上那块白布早就取下来了。
 *
 * 真要精确到月，得先有「这件事开始几年了」的问法，而条件层现在没有
 * （`Undertaking.since` 存着年份，但没有一格去问它过了多久）。
 * **等第一个真需要它的内容出现再加。**
 */
export const mourningScenes: SceneLibrary = {
  'mourning:over': {
    id: 'mourning:over',
    title: '服满',
    entry: 'open',
    nodes: {
      open: {
        id: 'open',
        onEnter: [
          { type: 'time', months: 3 },
          { type: 'undertake', undertaking: 'mourning', who: 'elder', done: true },
          { type: 'chronicle', text: '孝满了。' },
        ],
        blocks: [
          { kind: 'narration', text: '门上那块白布早就取下来了，只是没人提这件事。' },
          {
            kind: 'narration',
            text: '这一年清明你去了一趟，回来的路上遇见几个熟人，都问你近来如何。',
          },
          { kind: 'event', text: '孝满了。' },
          { kind: 'narration', text: '往后再有人来说亲，家里就不必推了。', tone: 'faint' },
        ],
      },
    },
  },
}

export const mourningEvents: readonly LifeEvent[] = [
  {
    /**
     * 孝满。
     *
     * 权重给得高（12），因为它不是一件「可能发生的事」，
     * 是一件**必须收尾的事**——它挂着的时候，媒人一直不上门。
     * 权重低了，守孝会拖得比礼法长得多，而那种拖不是内容，是漏接。
     */
    id: 'mourning-over',
    window: { from: 11, to: 70 },
    requires: [{ undertaking: { is: 'mourning' } }],
    scene: 'mourning:over',
    weight: 12,
  },
]
