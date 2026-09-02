/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 关系穿帮验收。
 *
 * ## 为什么它是门禁而不是走查
 *
 * 上一轮发现：227 个「生下来就没爹」的人生里，227 个的正文
 * 仍在写「父亲每天傍晚去地里站一会儿」。
 *
 * **那不是一个内容 bug，是藏在剧本里的系统假设**——
 * 写剧本的人默认了「玩家有爹娘」，而这个假设不会自己消失，
 * 只要还有人往里加正文，它就会重新长出来。
 *
 * 所以它必须是一条能跑的验收，不能是文档里的一句话：
 *
 *   **任何重要事件，在没有对应关系节点时，都不能产生关系穿帮。**
 *
 * 跑法：npx vite-node scripts/verify.ts
 * 失败会以非零码退出，可以直接挂进 CI。
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import type { Bond } from '../src/types/game'

const RUNS = 1200

/**
 * 一条关系不在场时，正文里不该出现的说法。
 *
 * 只抓「把这个人当成在场的活人来写」，不抓单纯提到这个词——
 * 「你的名字不是爹娘给的」是合法的，「父亲说」不是。
 */
interface Rule {
  bond: Bond
  label: string
  ghost: RegExp
}

const RULES: readonly Rule[] = [
  {
    bond: '生父',
    label: '父亲',
    ghost:
      /父亲(在|从|把|抱|说|看|回|走|去|正|每天|决定|喝|放|拿|沉|又|想|侧|带|请|让|问|摇|点|笑|翻|叹|的手|的背)|爹(说|在|回|走|去|问|带|让|把|拿)|跟着父亲|陪父亲|问父亲|给父亲/,
  },
  {
    bond: '生母',
    label: '母亲',
    ghost:
      /母亲(在|从|把|抱|说|看|回|走|去|正|每天|笑|愣|把|拿|端|问|叫|听|摇|点|收|翻|蹲)|娘(说|在|回|走|去|问|叫)|跟着母亲|陪母亲|问母亲|给母亲/,
  },
]

interface Leak {
  bond: Bond
  text: string
  count: number
}

const leaks = new Map<string, Leak>()
let checked = 0

for (let index = 0; index < RUNS; index += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  useCharacterStore()

  // 出生当下就记下：这一世哪几条关系一开始就不存在
  const missing = RULES.filter((rule) => !people.kinOf(rule.bond).some((id) => people.isAlive(id)))
  if (missing.length === 0) continue
  checked += 1

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
      const existing = leaks.get(key)
      if (existing) existing.count += 1
      else leaks.set(key, { bond: rule.bond, text: block.text, count: 1 })
    }
  }
}

console.log(`\n=== 关系穿帮验收（${RUNS} 世，其中 ${checked} 世缺了某条关系）===\n`)

if (leaks.size === 0) {
  console.log('  没有穿帮。缺了哪条关系，正文里就不会把那个人当活人写。\n')
} else {
  const sorted = [...leaks.values()].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((sum, leak) => sum + leak.count, 0)
  console.log(`  ✗ ${sorted.length} 种穿帮，共 ${total} 次：\n`)
  for (const leak of sorted.slice(0, 20)) {
    console.log(`    〔缺${leak.bond}〕${String(leak.count).padStart(4)}次  ${leak.text}`)
  }
  if (sorted.length > 20) console.log(`    ……另有 ${sorted.length - 20} 种`)
  console.log(
    '\n  修法不是逐句改写：正文里写 {elder} / {elders}，' +
      '\n  落纸时由关系网决定那个人是谁。真要写只有父亲才做的事，' +
      '\n  就给那一卷加上 requires: [{ bond: { kind: 生父, alive: true } }]。\n',
  )
  process.exitCode = 1
}
