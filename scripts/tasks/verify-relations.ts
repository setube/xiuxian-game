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

    /**
     * 在册活人的名字，扫之前要从正文里抹掉。
     *
     * ⚠️ **「娘」既是生母的叫法，也是眼下每一个议亲对象的名字。**
     * `grep -rn "given: '娘'" src/ --include=*.ts` 数出来是
     * `match.ts` 的 496 / 533 / 566 / 584 四条字面量，**`src/engine/` 零处**
     * ——不是引擎的构造，是内容层四个人恰好同名。于是落纸时两个人长得像同一个词：
     *
     * ```
     * 生母   光杆「娘」        「娘在老屋没了」「，娘说给孙子留着」
     * 配偶   姓+娘            「秦娘说都好」「林娘问起过药庐那边」
     * ```
     *
     * 这个区别决定了这段代码该怎么写：**病因在内容层，所以它还会以别的形状回来**。
     * 哪天有人写第五条议亲对象、给她起名「秀娘」或者「阿英」，撞的就是别的词了。
     * 所以这儿抹的是**整个名字**，不是「娘」这一个字——
     * 按「把娘封掉」来理解，下一个名字来的时候这儿就漏了。
     *
     * 而 `生母` 那条 ghost 里有 `娘(说|在|回|走|去|问|叫)`，**它把配偶说的话
     * 报成了「娘还活着」**。这不是内容错，是判据分不开这两个人。
     *
     * 抹名字而不是改正则，因为**认人只能靠身份解析的结果，不能靠哪个字看着像姓**
     * （改成「娘前面不许是汉字」会顺手挡掉「那天娘说」这种真·生母句）。
     * 抹完「秦娘说都好」不剩 `娘说`，而「娘说给孙子留着」原样留着。
     *
     * 姓或名缺一个就跳过：`'' + '娘'` 会把光杆「娘」也抹光，那等于把这条判据关掉。
     *
     * ⚠️ **不问她死没死。** 头一版写了 `people.isAlive(one.id)`，而这段扫的是
     * **一辈子演完之后**的整条流水——她中途殁了，名字就不在排除表里，
     * 于是她生前说的那句话又被报成穿帮。打断验里剩的那 1 次正是这么来的。
     * **名字不因人死而改**，抹的是名字不是活人。
     */
    const aliases = Object.values(people.roster)
      .filter((one) => one.surname && one.given)
      .map((one) => `${one.surname}${one.given}`)

    for (const item of narrative.stream) {
      const block = item.block
      if (!('text' in block)) continue
      // 换成「·」不是删掉：删会把前后两截接起来，接出来的字可能是原文没有的
      let text = block.text
      for (const alias of aliases) text = text.split(alias).join('·')
      for (const rule of missing) {
        if (!rule.ghost.test(text)) continue
        const key = `${rule.bond}::${block.text}`
        shard.counts.set(key, (shard.counts.get(key) ?? 0) + 1)
      }
    }
  }

  return shard
}
