/**
 * 「关系穿帮验收」那一段的单世模拟，从 `scripts/verify.ts` 原样搬出来。
 *
 * 走法一步没动：出生当下先记下这一世缺了哪几条关系（爹娘兄弟里谁一开始就
 * 不在），缺了才往下跑；跑完把正文里提到那几条关系的句子挑出来。
 *
 * ## 判据没有跟着搬过来
 *
 * 这里只把穿帮的句子取回去。`RULES`（哪条关系配哪个正则）留在 `verify.ts`——
 * 它是这一段要说的话，而且判据段要拿它去数、去印。
 *
 * ## 恒定的那两格编进 key，不另开一张表
 *
 * `sumTallies` 合并 `Map` 时做的是 `(merged.get(k) ?? 0) + n`——**无条件加法**。
 * 拿探针实测过四种形状，只有一种活着：
 *
 *     Map 值是对象    两片相加 → "[object Object][object Object]"
 *     Map 值是数组    两片相加 → "0兄|甲兄|甲"（被 `0 + [...]` 强转成字符串）
 *     普通对象        **只取头一片，根本不合并键**
 *                     片一 {k1}、片二 {k1,k2}、片三 {k2} 合出来只有 {k1}
 *     Map 值是数字    ✓ 按键相加，唯一对的
 *
 * 四种坏法**都不报错**：合并照样返回东西，判据照样跑，报表上只是数字变小
 * 或者字变乱。第三种最阴——只在后面几片出现的 key 整个消失，
 * 而**那正是「新冒出来的穿帮」最可能待的地方**。我头一版写的就是普通对象，
 * 是先拿探针量了一遍才拦下来的。
 *
 * 所以只留一张 `Map<string, number>`，把 `bond` 和 `text` 编进 key
 * （`${bond}::${text}`，原来就是这么编的），主脚本切回来。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'
import type { Bond } from '../../src/types/game'

/** 一条关系配一个正则。由 `verify.ts` 递进来——`RegExp` 过不了结构化克隆，所以传源码 */
export interface GhostRule {
  bond: Bond
  ghost: string
}

export interface VerifyRelationsShard {
  /**
   * `${bond}::${text}` → 撞见几次。
   *
   * 值只能是数字，理由见文件头。`bond` 和 `text` 编在 key 里，主脚本切回来。
   */
  counts: Map<string, number>
  /** 这一片里有几世是缺了某条关系的。判据靠它说明自己量到了东西 */
  checked: number
}

export function runShard(runs: number, rules: readonly GhostRule[]): VerifyRelationsShard {
  const shard: VerifyRelationsShard = { counts: new Map(), checked: 0 }
  // 正则在这儿编一次，不要每世重编
  const compiled = rules.map((rule) => ({ bond: rule.bond, ghost: new RegExp(rule.ghost) }))

  for (let index = 0; index < runs; index += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    const people = usePeopleStore()
    useCharacterStore()

    // 出生当下就记下：这一世哪几条关系一开始就不存在
    const missing = compiled.filter(
      (rule) => !people.kinOf(rule.bond).some((id) => people.isAlive(id)),
    )
    if (missing.length === 0) continue
    shard.checked += 1

    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()

    let turns = 0
    while (!narrative.ended && turns < 200) {
      const open = narrative.options.filter((option) => !option.locked)
      if (open.length === 0) break
      story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
      turns += 1
    }

    for (const item of narrative.stream) {
      const block = item.block
      if (!('text' in block)) continue
      for (const rule of missing) {
        if (!rule.ghost.test(block.text)) continue
        const key = `${rule.bond}::${block.text}`
        shard.counts.set(key, (shard.counts.get(key) ?? 0) + 1)
      }
    }
  }

  return shard
}
