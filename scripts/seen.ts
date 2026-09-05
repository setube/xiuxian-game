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
 * 跑法：bun scripts/seen.ts
 */
import { lifeScenes } from '../src/content/life'
import type { Condition } from '../src/types/game'
import { mapShards } from './lib/parallel'

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
 * ## 三十为什么不够
 *
 * 那个数是按「占比一成的条件几乎必现」定的：0.9³⁰ = 4.2%。
 * 它对**一成以上**的句子成立，可它被拿去判了比一成稀得多的话。
 *
 * 人生模拟那一轮把渡口从 `lifeFinale` 改成普通年表事件之后，
 * 那一卷走到的人从三百世掉到三十一世——**恰好卡在三十上面一点**，
 * 于是它照判不误。而它底下那两句认的是「爹死在外地」（全库 6.3%）
 * 和「爹出门再没音信」（全库 2.0%）：三十一世里期望不到两个人，
 * `hit === 0` 的概率约莫两成。**内容一个字没坏，五批里也会红一批。**
 *
 * 六十的出处：眼下真被判的节点里最稀的一句是 `seek:errand#open`
 * 那个 13.7%（九十五世走到），0.863⁶⁰ 约等于万分之一。
 * 而低于六十世的只有渡口——它底下那种稀有度这一支本来就判不了，
 * 所以让它落进 thin，只印数据不下判语。
 *
 * **这个数跟内容一起漂**：哪天渡口窗口放宽、走到的人多了，
 * 它自己会回到判得动的那一侧；哪天又有一卷缩到六十世以下，
 * 该重新量一次最稀那一句是多少，而不是照抄这里的 60。
 */
const ENOUGH = 60

/** 全库所有写了「所见」的节点 */
interface Watched {
  where: string
  /** 到过这一节的证据：这一节（或它分流去的那几节）正文里的头一句，任一句落纸就算到过 */
  arrivals: string[]
  lines: { text: string; requires: string }[]
}

/** 把条件写成一行人话，印出来好跟内容对得上 */
function describe(requires: readonly Condition[]): string {
  return requires
    .map((one) => {
      if (one.flag)
        return one.flag.equals === undefined ? one.flag.key : `${one.flag.key}=${one.flag.equals}`
      if (one.standing) return `家境 ${one.standing.atLeast ?? ''}–${one.standing.atMost ?? ''}`
      if (one.attribute)
        return `${one.attribute.key} ${one.attribute.atLeast ?? ''}–${one.attribute.atMost ?? ''}`
      if (one.knowledge) return `知道〔${one.knowledge}〕`
      if (one.item) return `身上有〔${one.item}〕`
      if (one.bond) return `有${one.bond.kind}`
      if (one.age) return `${one.age.atLeast ?? ''}–${one.age.atMost ?? ''}岁`
      // 兜底：将来新写的条件类型，至少印得出是哪一格
      return Object.keys(one).join('+')
    })
    .join(' 且 ')
}

/**
 * 一句正文有没有落在这一世的纸上。
 *
 * 正文里可能带占位符（`{dam}`、`{call:east-wife}`），落纸时换成了「娘」「方婶」，
 * 拿原文整句去比永远比不上。所以按占位符把原文切成几段字面，
 * 一段一段都在同一句里就算这一句出现过。
 */
function landed(life: readonly string[], pattern: string): boolean {
  const segments = pattern.split(/\{[^}]+\}/).filter((s) => s.length > 0)
  return life.some((text) => segments.every((s) => text.includes(s)))
}

const watched: Watched[] = []
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  for (const [nodeId, node] of Object.entries(scene.nodes)) {
    if (!node.seen?.length) continue
    /*
     * 「走到了这一节」拿什么认：这一节自己的头一句正文。
     *
     * 没有正文的节（开场交给征象、然后按条件分流的那种，`dearth:price#open`）
     * 拿它分流去的那几节的头一句认——走到它就一定走到了其中一节。
     * 头一版这儿留空，而空串在 `string[]` 上 `includes` 恒为 false，
     * 于是那一节永远「没人走到」，底下的话被判成白写的。
     */
    const firstText = (n: { blocks: readonly { text?: string }[] } | undefined): string | null =>
      n?.blocks.find((block) => typeof block.text === 'string')?.text ?? null
    const own = firstText(node)
    const onward = [...(node.branches ?? []).map((b) => b.next), node.next ?? '']
      .filter((id): id is string => id.length > 0)
      .map((id) => firstText(scene.nodes[id]))
      .filter((text): text is string => text !== null)
    watched.push({
      where: `${sceneId}#${nodeId}`,
      arrivals: own ? [own] : onward,
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

let failed = 0

console.log('\n=== 所见走查：同一个节点，不同人生 ===\n')
console.log(
  `  ${watched.length} 个节点写了「所见」，一共 ${watched.reduce((n, one) => n + one.lines.length, 0)} 句。\n`,
)

const lives = (
  await mapShards<string[][]>({ task: 'scripts/tasks/seen-lives.ts', runs: RUNS })
).flat()

for (const node of watched) {
  const arrived = lives.filter((life) => node.arrivals.some((a) => landed(life, a)))
  console.log(`\n  【${node.where}】${arrived.length} / ${RUNS} 世走到了这一节\n`)

  if (arrived.length === 0) {
    console.log('    ✗ 三百世没有一个人走到这一节，底下的话都是白写的。')
    failed += 1
    continue
  }

  const shapes = new Map<string, number>()
  for (const life of arrived) {
    const got = node.lines.filter((line) => landed(life, line.text)).map((line) => line.text)
    const key = got.length === 0 ? '（白板）' : got.join(' ｜ ')
    shapes.set(key, (shapes.get(key) ?? 0) + 1)
  }

  const thin = arrived.length < ENOUGH
  const pct = (n: number) => ((n / arrived.length) * 100).toFixed(1).padStart(5)
  for (const line of node.lines) {
    const hit = arrived.filter((life) => landed(life, line.text)).length
    const bad = !thin && (hit === 0 || hit === arrived.length)
    const flag = !bad ? '  ' : hit === 0 ? '✗ 没人读到' : '✗ 人人都读到'
    console.log(`    ${pct(hit)}%  ${flag}  ${line.text}`)
    console.log(`             ${line.requires}`)
    if (bad) failed += 1
  }

  const blank = shapes.get('（白板）') ?? 0
  /**
   * 找最常见的那一种额外读法——**白板不算**。
   *
   * 白板过半是这一层本来的样子：三句话各自稀少，多数人一句也没多读到。
   * 把它算进来的话，`day:ordinary#morning`（白板 57%）
   * 和 `seek:errand#open`（白板 91%）会跟着红，而它们恰恰是写对了的。
   */
  const extra = [...shapes.entries()].filter(([key]) => key !== '（白板）')
  const [top, most] = extra.sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  console.log(
    `\n    读到的组合共 ${shapes.size} 种，白板占 ${pct(blank)}%，` +
      `除白板外最常见的一种占 ${pct(most)}%`,
  )
  if (thin) {
    console.log(`    · 只有 ${arrived.length} 世走到这一节，不足 ${ENOUGH}，这一节的话判不了。`)
    console.log('      不判红，但写在这种地方的所见，多半是没人会读到的。')
  } else if (most > arrived.length / 2) {
    /**
     * 除白板之外，没有哪一种额外的读法是过半的人共享的。
     *
     * ## 这一条从前判的是「白板必须最常见」
     *
     * 那个写法预设了一件事：所见永远是少数人的额外一瞥，
     * 而大多数人读到的是白板。它对少年那几卷成立，
     * 对人生日常那几档**不成立**——`routine:prime#open` 底下三句认的是
     * 成过家、有孩子、出过远门，而一个四十岁的人这些多半都有。
     * 白板在那里是**罕见**的读法，不是常见的。那不是所见被稀释了，
     * 那是人生本来的样子。旧判据在那几节上全红，红的是它自己的预设。
     *
     * 换成这一条之后，守的东西反而更贴近这一层的命题——
     * **同一个节点，在不同人生里不是同一件事。** 一旦过半的人读到
     * 一模一样的一批额外的话，这一节对多数人就是同一段，
     * 写不写所见没有区别。
     *
     * 它接得住旧判据接不住的那种退化：五句话各占九成，
     * 一句也没到一百，第二条一声不吭，可最常见的组合（五句全中）
     * 占了将近六成——每个人读到的都差不多是全部。
     *
     * 一半这个数不是拍的，是这条命题唯一的分界：**多数**。
     * 再细就该拍百分比了，而拍出来的门槛自己会烂。
     */
    console.log(`    ✗ 过半的人读到的是同一种组合：${top}`)
    console.log('      这一节对多数人就是同一段，所见这一层在这儿没起作用。')
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
