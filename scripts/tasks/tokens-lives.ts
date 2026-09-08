/**
 * 占位符走查那一支的单世模拟，从 `scripts/tokens.ts` 原样搬出来。
 *
 * 走法一步没动——同样跑满一世、同样把会上界面的字符串全翻一遍。
 *
 * ## 判据没有跟着搬过来
 *
 * 这里只把漏网的字符串取回去。「什么算漏」（`check`：字符串里还剩一个 `{`）
 * 那一行看着简单，但它是这支门禁要说的话，留在 `tokens.ts`。
 *
 * ## 出身轮转要按全局序号，不能按片内序号
 *
 * 原来是 `beOf(ORIGINS[i % ORIGINS.length])`——用循环变量轮着钉死出身，
 * 好让每一种都被扫匀。**摊开之后每一片的 `i` 都从 0 重来**，于是各片都从
 * 第一种出身开始轮，扫到的**分布偏了**：靠前的出身被多扫，靠后的被少扫。
 *
 * ## 偏的是分布，不是覆盖——这一点我验错过一次
 *
 * 头一版判据问的是「每种出身都扫到了没有」，然后拿「把偏移改回片内序号」
 * 去打断它——**判据没红**。因为 400 世分三片、每片一百三十多世，
 * `133 % 12` 早绕完好几圈，**每片自己就能扫全十二种**。
 * 「有没有扫到」在这个世数下永远是真，那条判据问的是一个不会失败的问题。
 *
 * 真正会坏的是**每种各扫多少世**：偏移错了，靠前的出身多扫、靠后的少扫，
 * 而十二种出身的内容厚薄差得远（`court` 那一册比 `farm` 长得多），
 * 分布一偏，某几册的占位符就查得比别册稀。所以这里记的是**计数**不是集合。
 *
 * 偏移不能拿 `index × 每片世数` 推——`splitRuns` 把除不尽的余数摊给前几片，
 * 各片大小不一定整齐，那么推会错位。主脚本把**每片各跑多少世**（`shardsOf`
 * 算出来的那张表）当 `payload` 递进来，这里按 `index` 之前各片的和求偏移，
 * 分片怎么切都对得上。
 */
import { createPinia, setActivePinia } from 'pinia'

import { ORIGINS } from '../../src/content/origins'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useHouseholdStore } from '../../src/stores/household'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import { useWorldStore } from '../../src/stores/world'

import { beOf } from '../origin'

export interface TokensShard {
  leaks: string[]
  /**
   * 每种出身各扫了多少世。判据量的是**分布匀不匀**，不是「扫到了没有」——
   * 后者抓不住分片带来的偏斜（见文件头）。
   */
  origins: Map<string, number>
  runs: number
}

export function runShard(runs: number, sizes: readonly number[], index: number): TokensShard {
  const shard: TokensShard = { leaks: [], origins: new Map<string, number>(), runs }
  // 我前面那几片一共跑了多少世——那就是我第一世的全局序号
  const offset = sizes.slice(0, index).reduce((sum, n) => sum + n, 0)

  const check = (where: string, text: string | null | undefined): void => {
    if (typeof text === 'string' && text.includes('{')) shard.leaks.push(`${where}: ${text}`)
  }

  for (let i = 0; i < runs; i += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const world = useWorldStore()
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const people = usePeopleStore()
    // 轮着钉死出身，好让每一种都被扫匀。序号要用全局的，见文件头
    const origin = ORIGINS[(offset + i) % ORIGINS.length]!
    shard.origins.set(origin.id, (shard.origins.get(origin.id) ?? 0) + 1)
    beOf(origin.id)
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      // 选项上的字也要查——它和正文一样是给玩家读的
      for (const option of narrative.options) {
        check('选项', option.choice.label)
        check('选项提示', option.choice.hint)
        check('锁定提示', option.choice.lockedHint)
      }
      const open = narrative.options.filter((o) => !o.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    // 正文
    for (const item of narrative.stream) {
      const block = item.block
      if ('text' in block) check('正文', block.text)
      if (block.kind === 'heading') check('标题', block.title)
      if (block.kind === 'dialogue') check('说话人', block.speaker)
    }
    // 状态栏与足迹
    check('所在', world.place)
    for (const place of world.visited) check('足迹', place)
    // 各个面板
    check('身份', character.identity)
    check('姓名', character.name)
    check('家乡', household.home)
    for (const entry of world.chronicle) check('编年', entry.text)
    for (const k of character.knowledge) {
      check('见闻标题', k.title)
      check('见闻', k.summary)
    }
    for (const it of character.inventory) {
      check('物件', it.name)
      check('物件注', it.note)
      check('物件旧名', it.formerName)
    }
    // 人际现在只有一个来源：人口册。玩家自己也是图里的一个节点
    for (const [id, acquaintance] of Object.entries(household ? people.known : {})) {
      check('称呼', acquaintance.calls)
      check('人际注', acquaintance.note)
      const person = people.personOf(id)
      if (person) {
        check('姓', person.surname)
        check('名', person.given)
        check('手上的活', person.doing)
        check('所在', person.place)
        for (const chapter of person.history) check('往事', chapter.what)
      }
    }
    for (const m of household.members) check('家人', m.relation)
    for (const aspect of Object.values(character.aspects)) {
      check('自述', aspect.self)
      for (const claim of aspect.claims) {
        check('评说', claim.text)
        check('评说来源', claim.source)
        check('疑问', claim.doubt)
      }
    }
  }

  return shard
}
