/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 所见走查：同一个节点，在不同人生里是不是同一件事。
 *
 * ## 这一支量的不是「多少人读到了」
 *
 * 那是内容覆盖率的问法。这一层要看的是**分布的形状**：
 *
 *     每一句都得有人读到　　　　　没人读到的句子，跟没写是一回事
 *     没有一句是人人都读到的　　　那句该写进 blocks，不该摆在这儿
 *     大多数人读到的仍是白板　　　一句也不多。那是这件事本来的样子
 *
 * 头一条第四道门禁管不着：它只查条件有没有出处，
 * **有出处不等于有人满足得了**。这跟第五道「图上连得好好的，
 * 人生里却没人抵达得了」是同一种病，只是长在正文里而不是节点上。
 * 造反例时最能说明问题的一个：`father-dead` 且 `father-missing`——
 * 两个旗标都合法、都有出处，第四道一句话不会说，可爹不能既死了又失踪。
 *
 * 第二条是反过来的病：一句人人都读到的话不是「所见」，是漏写的正文。
 * 它不会报错，只会让这一层慢慢失去意义。第三条守的是同一件事的另一头——
 * **当所有人都特别，就没有人特别。**
 *
 * ## 这道门抓不住什么
 *
 * 只判 `hit === 0`，不判「几乎没人读到」。造反例时拿 `knew-hunger`
 * 试过：三百世里恰好一个人命中，0.3%，于是放行。设计上它跟死句没区别，
 * 可要抓它就得拍一个百分比门槛，而**拍出来的门槛自己会烂**——
 * 一支三十批响一次假警报的门禁，比没有门禁更坏。
 * `hit === 0` 换来的是零假警报，代价就是这条缝。
 *
 * 原先还有第四条「组合不能只有一种」。删了：**造不出只让它红的反例**。
 * 每句都满足 `0 < hit < 总数`，就必然有人读到有人读不到，组合数必然大于一。
 * 它被前两条整个盖住，留着只是在制造「我们检查了」的假象。
 *
 * ## 为什么要从正文里捞，而不是重算一遍条件
 *
 * 走完一世再拿最终状态去算 `seenOf`，量的是「一生结束时他会看见什么」。
 * 可少年那一节是十三岁读的，那时他还没挨过饿。
 * **要问的是他当时看见了什么，所以只能去正文里捞。**
 * 顺带把引擎那一环也验了：句子真落到纸上了没有。
 *
 * 跑法：npx vite-node scripts/seen.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import type { Condition } from '../src/types/game'

/**
 * 走多少世。
 *
 * 照最稀的那一格定：几条所见里最难碰上的是「爹出门再没音信」，
 * 三百世里够得着几十个人，量得住百分比的整数位。
 */
const RUNS = 300

/**
 * 一个节点要有多少人走到，这一支才敢对它下判语。
 *
 * 低于这个数就只印数据，不判红。**样本不够就说判不了，
 * 这比硬判一个数出来诚实**——三百世里只有一世走到的节点，
 * 那一世没触发某句话，说明不了那句话是死的。
 *
 * 三十世能让占比一成的条件几乎必现（落空率 4%），
 * 再低就开始拿噪音当结论了。
 */
const ENOUGH = 30

/** 全库所有写了「所见」的节点 */
interface Watched {
  where: string
  /** 到过这一节的证据：正文里的头一句 */
  arrival: string
  lines: { text: string; requires: string }[]
}

/** 把条件写成一行人话，印出来好跟内容对得上 */
function describe(requires: readonly Condition[]): string {
  return requires
    .map((one) => {
      if (one.flag)
        return one.flag.equals === undefined ? one.flag.key : `${one.flag.key}=${one.flag.equals}`
      if (one.standing) return `家境 ${one.standing.atLeast ?? ''}–${one.standing.atMost ?? ''}`
      if (one.knowledge) return `知道〔${one.knowledge}〕`
      if (one.item) return `身上有〔${one.item}〕`
      if (one.bond) return `有${one.bond.kind}`
      if (one.age) return `${one.age.atLeast ?? ''}–${one.age.atMost ?? ''}岁`
      // 兜底：将来新写的条件类型，至少印得出是哪一格
      return Object.keys(one).join('+')
    })
    .join(' 且 ')
}

const watched: Watched[] = []
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    if (!node.seen?.length) continue
    const first = node.blocks.find((block) => 'text' in block && !block.text.includes('{'))
    watched.push({
      where: `${sceneId}#${nodeId}`,
      arrival: first && 'text' in first ? first.text : '',
      lines: node.seen.map((one) => ({ text: one.text, requires: describe(one.requires) })),
    })
  }
}

/**
 * 走完一世，把落到纸上的每一句原样收回来。
 *
 * **边走边收，不能等走完再读。** 卷轴只留最后四百条，
 * 而少年那一节是十三岁读的——等他走到渡口，那一段早被顶出去了。
 * 按 id 去重，多收几遍也不会重。
 */
function liveALife(): string[] {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  const kept = new Set<string>()
  const texts: string[] = []
  const drain = (): void => {
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if ('text' in item.block) texts.push(item.block.text)
    }
  }

  story.begin()
  drain()
  let turns = 0
  while (!narrative.ended && turns < 500) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    drain()
    turns += 1
  }
  return texts
}

let failed = 0

console.log('\n=== 所见走查：同一个节点，不同人生 ===\n')
console.log(
  `  ${watched.length} 个节点写了「所见」，一共 ${watched.reduce((n, one) => n + one.lines.length, 0)} 句。\n`,
)

const lives: string[][] = []
for (let i = 0; i < RUNS; i += 1) lives.push(liveALife())

for (const node of watched) {
  const arrived = lives.filter((text) => text.includes(node.arrival))
  console.log(`\n  【${node.where}】${arrived.length} / ${RUNS} 世走到了这一节\n`)

  if (arrived.length === 0) {
    console.log('    ✗ 三百世没有一个人走到这一节，底下的话都是白写的。')
    failed += 1
    continue
  }

  const shapes = new Map<string, number>()
  for (const text of arrived) {
    const got = node.lines.filter((line) => text.includes(line.text)).map((line) => line.text)
    const key = got.length === 0 ? '（白板）' : got.join(' ｜ ')
    shapes.set(key, (shapes.get(key) ?? 0) + 1)
  }

  const thin = arrived.length < ENOUGH
  const pct = (n: number) => ((n / arrived.length) * 100).toFixed(1).padStart(5)
  for (const line of node.lines) {
    const hit = arrived.filter((text) => text.includes(line.text)).length
    const bad = !thin && (hit === 0 || hit === arrived.length)
    const flag = !bad ? '  ' : hit === 0 ? '✗ 没人读到' : '✗ 人人都读到'
    console.log(`    ${pct(hit)}%  ${flag}  ${line.text}`)
    console.log(`             ${line.requires}`)
    if (bad) failed += 1
  }

  const blank = shapes.get('（白板）') ?? 0
  console.log(`\n    读到的组合共 ${shapes.size} 种，白板占 ${pct(blank)}%`)
  if (thin) {
    console.log(`    · 只有 ${arrived.length} 世走到这一节，不足 ${ENOUGH}，这一节的话判不了。`)
    console.log('      不判红，但写在这种地方的所见，多半是没人会读到的。')
  } else if (blank < Math.max(...shapes.values())) {
    /**
     * 白板必须是最常见的那一种。
     *
     * 这一条不拍具体百分比——**判据细到自己会烂掉的程度，就该停**。
     * 它只守一件事：这件事本来的样子仍然是大多数人读到的东西。
     * 一旦多数人都多读出点什么，「所见」这一层就自己把自己稀释掉了：
     * **当所有人都特别，就没有人特别。**
     */
    console.log('    ✗ 白板不再是最常见的读法——多数人都多读出了点什么。')
    console.log('      那几句该并回 blocks，或者把条件收紧。')
    failed += 1
  }
}

console.log()
if (failed > 0) {
  console.log(`✗ ${failed} 处不对。\n`)
  console.log('  「所见」这一层坏起来不出声：正文完好、选项照旧、跳转不断，')
  console.log('  只是那一句永远不出现，或者反过来——人人都出现，于是它等于没写。\n')
  process.exitCode = 1
} else {
  console.log('  同一个节点，在不同人生里读到的确实不是同一段。')
  console.log('  而大多数人读到的仍然是那件事本来的样子。\n')
}
