/**
 * 「可观测路径验收」那一段的单世模拟，从 `scripts/verify.ts` 原样搬出来。
 *
 * 走法一步没动，采样点也照旧——**包在 `narrative.locate` 上，不读
 * `narrative.sceneId`**。`enterNode` 会一口气自动接好几节，中间那些节点在
 * 等到下一次落笔之前就被覆盖了，而恰恰是它们最容易漏（`unseen`、`misread`
 * 这类走到就结束的终端节点全在里头）。
 *
 * ## 一趟跑喂两段判据
 *
 * 这一趟同时采三样：走过哪些节点（第六段用）、人际面板上混了英文的字
 * （第八段用）、有几世家里添过丁（第八段的尺子自检用）。
 * 原来就是一个循环干这三件事，搬过来照旧——**不为了「一段一个任务」
 * 把它拆成三趟**，那会把三百世跑成九百世。
 *
 * ## 两处地方不能照抄形状，`sumTallies` 会把它们悄悄弄坏
 *
 * 合并 `Map` 时做的是 `(merged.get(k) ?? 0) + n`——**无条件加法**。
 * 拿探针实测过四种形状，只有「`Map` 值是数字」活着：值是对象拼成
 * `"[object Object]"`，值是数组被 `0 + [...]` 强转成字符串，
 * 而**普通对象根本不合并键**——片一 {k1}、片二 {k1,k2}、片三 {k2}
 * 合出来只有 {k1}，后面几片独有的 key 整个消失。
 *
 * 四种坏法都不报错。所以：
 *
 *   - `visits` 的值是数字，原样合适。
 *   - `romanLeaks` 原来是 `Map<string, string>`（那段字 → 头一回在哪见到），
 *     值是字符串，会被拼成 `"甲的称呼乙的称呼"`。改成把「在哪见到」编进 key
 *     （`${text}${SEP}${where}`），值放次数——**同一段字可能在几处见到，
 *     各片见到的地方还不一样**，编进 key 就一处也不丢，主脚本再挑头一处。
 *     分隔符用 `␟`（Unit Separator 的可见形）：正文和 `where` 里都不会有它，
 *     而且**不是 NUL**——真 NUL 会让 `grep` 把整个源文件当二进制，
 *     一行匹配都不打印（`src/engine/kinTree.ts` 正踩着这个坑）。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../../src/content/life'
import { useStory } from '../../src/engine/story'
import { useCharacterStore } from '../../src/stores/character'
import { useNarrativeStore } from '../../src/stores/narrative'
import { usePeopleStore } from '../../src/stores/people'

export interface VerifyPathsShard {
  /** `${sceneId}#${nodeId}` → 走到过几次 */
  visits: Map<string, number>
  /** `${那段字}␟${在哪见到}` → 撞见几次。值只能是数字，见文件头 */
  romanLeaks: Map<string, number>
  /** 有几世家里添过丁。第八段的尺子自检靠它说明自己量到了东西 */
  livesWithNewKin: number
}

/**
 * key 里那个分隔符。写成转义而不是字面的那个字符——**字面量在编码不一致的
 * 环境里会走样**，而这一个字符错了，主脚本就切不开 key。
 *
 * 用 U+241F（Unit Separator 的可见形），不用真 NUL：NUL 会让 `grep` 把整个
 * 源文件当二进制，一行匹配都不打印（`src/engine/kinTree.ts` 正踩着这个坑）。
 */
export const SEP = '␟'

/**
 * 这段字里混着英文字母吗。
 *
 * 尺子就这么短，因为**这个世界里玩家读得到的东西没有一个字母是该有的**：
 * 称呼是中文，关系是中文，营生是中文，门牌是中文加间隔号。
 * 一旦冒出 `a`–`z`，那就只能是内部标识漏了出来。
 *
 * 不查数字：年龄、年份本来就写成阿拉伯数字。
 *
 * 这一支跟着搬过来，是因为它在循环里逐字调用——留在主脚本就得把每一段字
 * 都搬回主线程，那比搬这四行贵得多。判据（第八段怎么报、报几条）仍在主脚本。
 */
const hasRoman = (text: string): boolean => /[A-Za-z]/.test(text)

export function runShard(runs: number): VerifyPathsShard {
  const shard: VerifyPathsShard = { visits: new Map(), romanLeaks: new Map(), livesWithNewKin: 0 }

  /**
   * 记一笔。
   *
   * 原来只记头一回见到的地方（「不然三百世能刷出几千行」）。摊开之后
   * 「头一回」在每一片里各是各的，合并时留谁都不对——所以这儿全记下来，
   * 由主脚本按 key 去重之后挑一处。刷出来的行数由那边管。
   */
  const note = (where: string, text: string | undefined): void => {
    if (text === undefined || !hasRoman(text)) return
    const key = `${text}${SEP}${where}`
    shard.romanLeaks.set(key, (shard.romanLeaks.get(key) ?? 0) + 1)
  }

  for (let index = 0; index < runs; index += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    useCharacterStore()

    // 采样点包在 locate 上，不读 sceneId——理由见文件头
    const locate = narrative.locate
    narrative.locate = (sceneId: string, nodeId: string): void => {
      const key = `${sceneId}#${nodeId}`
      shard.visits.set(key, (shard.visits.get(key) ?? 0) + 1)
      locate(sceneId, nodeId)
    }

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

    // 这一世走完了，趁人还在，把人际面板上那些字扫一遍（第八道用）
    const people = usePeopleStore()
    if (people.personOf('sibling') !== undefined) shard.livesWithNewKin += 1
    for (const id of Object.keys(people.known)) {
      const person = people.personOf(id)
      note(`${id} 的称呼`, people.callOf(id))
      note(`${id} 在做什么`, person?.doing)
      note(`${id} 那一句`, people.known[id]?.note)
      for (const bond of people.bondsWith(id)) note(`${id} 的关系`, bond)
    }
  }

  return shard
}
