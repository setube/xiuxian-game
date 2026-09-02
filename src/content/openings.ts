import type { Opening } from '@/types/leaning'

/**
 * 机会。
 *
 * ## 念头不得创造世界事实
 *
 * 商队本来就要走，短工本来就在招，那条道本来就在那儿。
 * **世界不因为玩家想要什么而配合玩家。**
 *
 * 所以每一条的 `requires` 里只许写世界条件。一个念头进不了这里，
 * 一个字也进不了——这一条做成了走查门禁。
 *
 * 念头只改一样东西：**他怎么读这个机会。**
 *
 * ## 写新机会时的分寸
 *
 * `plain` 那一句必须是**完整的、不残缺的**。它是绝大多数人读到的
 * 全部内容，不能写成一句故意留白的钩子等着念头来补——
 * 那等于变相强迫玩家去养念头。
 *
 * `readings` 那一句只添注意力，不添信息。「那支商队要往很远的地方去」
 * 是他自己想到的，不是别人多告诉他的。
 */
export const OPENINGS: readonly Opening[] = [
  {
    /**
     * 镇上招短工。
     *
     * 这是最要紧的一条，因为它**对所有人都开着**。
     * 一个想守着家的孩子读到的是「管饭」，一个想走的孩子读到的是
     * 「那支商队要往很远的地方去」——同一件事，同一个选项。
     */
    id: 'hiring',
    requires: [{ age: { atLeast: 12 } }],
    plain: '镇上的货栈在招短工，管饭，按天算钱。',
    readings: [
      { leaning: 'leave', text: '你忽然想到，货栈的活是跟着车队走的。' },
      { leaning: 'rich', text: '你在心里算了算，一个月能有多少。' },
      { leaning: 'settle', text: '你想的是家里这阵子紧。' },
    ],
  },
  {
    /**
     * 商队要走了。
     *
     * `toward-leaving` 是**玩家自己攒出来的**，不是念头给的——
     * 他去问过、去搭过话、去帮过忙，商队的人才认得他。
     * 一个没有「想离开」的念头、却恰好做过这些事的人，
     * 到这一天照样会被问一句。
     */
    id: 'caravan',
    requires: [{ age: { atLeast: 13 } }, { flag: { key: 'toward-leaving' } }],
    plain: '车队后日一早动身，往北。管事的问你要不要跟着去搭把手。',
    readings: [
      { leaning: 'leave', text: '这句话你等了很久，可真听见的时候反而愣住了。' },
      { leaning: 'settle', text: '你想起家里。这一趟少说要走两个月。' },
    ],
  },
  {
    /**
     * 山那面那条道。
     *
     * 它一直在那儿。区别只在于有的人走到山那面就回头了，
     * 有的人站在坡上看了很久。
     */
    id: 'the-road',
    requires: [{ flag: { key: 'saw-the-road' } }],
    plain: '山那面那条道上又过了一队车。',
    readings: [
      { leaning: 'leave', text: '你数了数有几辆，看着它们走到看不见。' },
      { leaning: 'know', text: '你想的是那些车从哪儿来。' },
    ],
  },
]

/** 按 id 取一个机会 */
export function openingById(id: string): Opening | undefined {
  return OPENINGS.find((item) => item.id === id)
}
