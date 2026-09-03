/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 内容门禁：七道。
 *
 * ## 为什么它是门禁而不是走查
 *
 * 第一轮发现：227 个「生下来就没爹」的人生里，227 个的正文
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
 * ## 这份门禁查什么，改过一次
 *
 * 起初它查的是「所有条件有没有来源」。后来撞见两件事，
 * 它们看着像同一类，其实分属两层：
 *
 *     illness-at-home　　火种引用了它，世上没有一处设过它　　　→ 来源问题
 *     omen:wounded#miss　节点连得好好的，三百世零个人走到　　　→ 路径问题
 *
 * 于是这一句正式改成：
 *
 *   **门禁检查所有内容元素是否有「来源」和「可观测路径」。**
 *
 * 一个事件存在，不代表玩家有机会经历它。普通事件表查的是
 * 「事件有没有触发」，这里查的是**这个人的人生轨迹是否可能抵达那儿**。
 * 前四道管来源与连通，第五道管路径。
 *
 * ## 还有一条规矩是量出来的：能静态判的，别拿模拟去判
 *
 * 「新加一卷却忘了接入口」起先指望第五道抓——漏接一卷，
 * 那份「三百世没人走到」的名单该多出五到十个。十二批实测下来它抓不到：
 * 名单自己就在 16 到 37 之间晃（`seek:crossed` 五批整卷缺席，
 * `royal:fall` 三批），**噪声的幅度比要抓的信号还大**。
 * 而同一件事静态判只要问一句：这一卷有没有入边。于是它挪去了第三道。
 *
 * 留下的规矩是：**先问这件事能不能静态判**。模拟是用来量分布的，
 * 不是用来判存在的——判存在，抽样迟早会替你判错。
 *
 * ## 第六道是这条规矩的第二个用处：看住走不到的那一卷
 *
 * 库里有一卷是故意走不到的（`routine:adult`，替「凡人之后」占位）。
 * 它走不到不是自己的性质，是别处四个数字凑出来的结论——**改了哪个都可能
 * 让它悄悄变成一个活的入口**，而玩家会读到一段谁也没设计过的人生。
 *
 * 于是第六道把那四个前提钉住。同样不掷随机数：跑三百世没走到，
 * 证明不了走不到。
 *
 * ## 第七道换了个方向：不再从数据里推事实，而是拿数据去对人说过的话
 *
 * 前六道都在问同一类问题——**这份内容自己是不是自洽的**。
 * 答案全从数据里推：跳转指向存不存在、条件有没有来源、卷有没有入边。
 * 推得越多，门禁就越要懂剧情；再往下加几道，这支脚本会长成半个编辑器。
 *
 * 第七道问的是另一件事：**目录跟内容对不对得上**。
 * `chapters.ts` 里那五格（`called` / `to` / `age` / `purpose` / `marks`）是人手写的意图，
 * 不是从数据摘出来的。所以它能红——推出来的摘要永远不会红，
 * 改了实现它跟着变，什么也证明不了。
 *
 * 顺带把前几道的活也省了：从前「这一卷有没有入边」要把年表、日常、
 * 收尾、跨卷跳转全扫一遍才答得上来，现在目录里就写着。
 *
 * 五格里 `purpose` 是唯一一格机器读不懂的——它写给几年以后：
 * 那时内容有几百件，每一件单看都合理，而「这一卷当初是干什么的」
 * 只剩它能回答。`marks` 是那句话在数据里的影子，
 * **能验的那一半替不能验的那一半站着岗**。
 *
 * 跑法：npx vite-node scripts/verify.ts
 * 失败会以非零码退出，可以直接挂进 CI。
 */
import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS } from '../src/content/days'
import { DAMPERS, SPARKS } from '../src/content/leanings'
import { OPENINGS } from '../src/content/openings'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { CHAPTERS } from '../src/content/life/chapters'
import { stageOf } from '../src/engine/stages'
import { MAX_EVENT_CHAIN, useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import type { Chapter, ChapterCall } from '../src/types/chapter'
import type { Bond, Condition, Effect } from '../src/types/game'

const RUNS = 300

/** 会自己造东西给玩家的那几支引擎。第四道验收要扫它们的源码 */
const ENGINE_FILES = ['wounded.ts', 'book.ts', 'effects.ts', 'seeking.ts'] as const

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

// ============================================================
// 第二道：场景跳转不许有断头路
// ============================================================
/**
 * 节点 id 是字符串，写错一个字 `vue-tsc` 一声不吭。
 *
 * 而它错了也不一定当场炸——`omen:wounded` 那种带 `branches` 的节点，
 * 只有掷到那一支才走得到。**一条打错的跳转可以在库里躺很久，
 * 直到某个玩家刚好走到那里，人生停在半截。**
 *
 * 所以这一条不做随机跑，做静态穷举：把每个 Scene 的每个 next / branches / choices
 * 都拿出来，看指向的地方到底存不存在。
 */
console.log('=== 场景跳转验收（静态穷举全库）===\n')
{
  const dangling: { from: string; to: string; via: string }[] = []
  let edges = 0

  /** `场景id#节点id`：省略 `#节点id` 即从该卷入口进 */
  function resolveTarget(target: string, ownScene: string): boolean {
    if (target.includes('#')) {
      const [sceneId, nodeId] = target.split('#')
      const scene = sceneId ? lifeScenes[sceneId] : undefined
      return Boolean(scene && nodeId && scene.nodes[nodeId])
    }
    // 不带 # 的：先当本卷节点，再当别卷入口
    const own = lifeScenes[ownScene]
    if (own?.nodes[target]) return true
    return Boolean(lifeScenes[target])
  }

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    if (!scene.nodes[scene.entry]) {
      dangling.push({ from: sceneId, to: scene.entry, via: 'entry' })
    }
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const where = `${sceneId}#${nodeId}`
      if (node.next) {
        edges += 1
        if (!resolveTarget(node.next, sceneId)) {
          dangling.push({ from: where, to: node.next, via: 'next' })
        }
      }
      for (const branch of node.branches ?? []) {
        edges += 1
        if (!resolveTarget(branch.next, sceneId)) {
          dangling.push({ from: where, to: branch.next, via: 'branches' })
        }
      }
      for (const choice of node.choices ?? []) {
        if (choice.next === null) continue
        edges += 1
        if (!resolveTarget(choice.next, sceneId)) {
          dangling.push({ from: where, to: choice.next, via: `choice:${choice.id}` })
        }
      }
    }
  }

  const scenes = Object.keys(lifeScenes).length
  if (dangling.length === 0) {
    console.log(`  ${scenes} 卷、${edges} 条跳转，没有断头路。\n`)
  } else {
    console.log(`  ✗ ${dangling.length} 条跳转指向不存在的地方：\n`)
    for (const edge of dangling) {
      console.log(`    ${edge.from}　—[${edge.via}]→　${edge.to}`)
    }
    console.log('\n  玩家走到这里，人生会停在半截。\n')
    process.exitCode = 1
  }
}

// ============================================================
// 第三道：库里不许躺着走不到的节点，也不许躺着接不上的整卷
// ============================================================
/**
 * 断头路的反面。
 *
 * 改剧本时最常留下的垃圾不是打错的跳转，是**没人再指向的旧节点**——
 * 比如 `omen:wounded` 从「真相分流器 + 六个既定结局」改成五节点之后，
 * 那七个节点如果忘了删，会一直躺在库里：编译得过，跑不到，
 * 而下一个人读这份剧本时会以为它还在用。
 *
 * ## 后来这一道又多管了一件事：整卷接不上
 *
 * 「新加一卷内容，却忘了给它接入口」本来指望第五道抓——
 * 那一道数「三百世没人走到的节点」，漏接一卷就该多出五到十个。
 *
 * **量下来发现它抓不到。** 十二批三百世，那份名单自己就在
 * 16 到 37 之间晃（均值 23.3，标准差 5.6）：`seek:crossed` 十二批里
 * 有五批整卷没人走到，`royal:fall` 三批，`birth:皇室` 一批——
 * 一卷稀，它就整卷从名单里进进出出。**噪声的幅度比要抓的信号还大**，
 * 于是那个上限无论定在哪儿，都只能在「随机红灯」和「永远不红」之间挑一个。
 *
 * 可这件事根本不用靠模拟。一卷只有三种进法：年表事件、四个阶段的日常、
 * 收尾那一卷，外加别卷跳过来。`begin()` 也只是 `toNextChapter(0)`，
 * 连出生那一卷都是年表抽出来的——**所以没有哪一卷有资格没有入边**，
 * 而这是纯静态的，一个随机数也不用掷。
 */
console.log('=== 孤儿节点验收 ===\n')
{
  const orphans: string[] = []
  let nodes = 0

  /** 被外面指过的卷。三种外部入口先记下，跨卷跳转在下面的循环里补 */
  const entered = new Set<string>()
  for (const event of lifeEvents) {
    const [head] = event.scene.split('#')
    if (head) entered.add(head)
  }
  for (const sceneId of Object.values(lifeRoutine)) entered.add(sceneId)
  entered.add(lifeFinale)

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    const reachable = new Set<string>([scene.entry])
    /**
     * 本卷内的落点归 `reachable`，指向别卷的归 `entered`。
     *
     * 不带 `#` 的写法先当本卷节点，认不出来才当别卷入口——
     * 跟 `story.ts` 里的 `resolve` 同一个规矩，不然跨卷跳转会被记错帐。
     */
    const mark = (target: string): void => {
      const [head, tail] = target.split('#')
      if (tail) {
        if (head === sceneId) reachable.add(tail)
        else if (head) entered.add(head)
      } else if (head) {
        if (scene.nodes[head]) reachable.add(head)
        else entered.add(head)
      }
    }
    for (const node of Object.values(scene.nodes)) {
      if (node.next) mark(node.next)
      for (const branch of node.branches ?? []) mark(branch.next)
      for (const choice of node.choices ?? []) if (choice.next) mark(choice.next)
    }
    for (const nodeId of Object.keys(scene.nodes)) {
      nodes += 1
      if (!reachable.has(nodeId)) orphans.push(`${sceneId}#${nodeId}`)
    }
  }

  if (orphans.length === 0) {
    console.log(`  ${nodes} 个节点，每一个都走得到。`)
  } else {
    console.log(`  ✗ ${orphans.length} 个节点没人指向：\n`)
    for (const id of orphans) console.log(`    ${id}`)
    console.log('\n  它们要么是改剧本时忘了删的，要么是该接上却漏接了。')
    process.exitCode = 1
  }

  const strays = Object.keys(lifeScenes).filter((sceneId) => !entered.has(sceneId))
  const scenes = Object.keys(lifeScenes).length
  if (strays.length === 0) {
    console.log(`  ${scenes} 卷，每一卷都有人指得到。\n`)
  } else {
    console.log(`\n  ✗ ${strays.length} 卷没有任何入口：\n`)
    for (const id of strays) console.log(`    ${id}`)
    console.log(
      '\n  写好了却没接上：年表里没有事件指向它，日常和收尾也不是它。' +
        '\n  玩家这辈子都读不到这一卷。\n',
    )
    process.exitCode = 1
  }
}

// ============================================================
// 第四道：剧本要的东西，世上得真有人给
// ============================================================
/**
 * 断头路和孤儿节点查的都是**边**，这一道查的是**前置条件**。
 *
 * 这一类死路第二、三道全都抓不到，因为节点本身连得好好的：
 *
 *     山道那一场：「他从怀里摸出一册薄书，塞进你手里。」
 *     可引擎从来没造过这件东西。
 *     十六岁渡口上认得这册书的那个结局，于是永远走不到。
 *
 * 真出过一次：把 `omen:wounded` 改成五节点时，六个旧结局节点被删了，
 * 挂在它们 `onEnter` 上的 `thin-book` 和 `touched-by-wicked` 一起没了。
 * 正文照样在说他给了你一本书，行囊里空的，而渡口四个结局哑掉两个。
 *
 * 所以这一道把剧本**要**的东西和世上**产**的东西对一遍。
 * 产出可能来自剧本（`item` / `flag` 效果），也可能来自引擎代码
 * （`wounded.ts` 的 grants、`book.ts` 的 carry），后者扫源码文本。
 */
console.log('=== 前置条件验收（要的东西有没有人给）===\n')
{
  const neededItems = new Map<string, string[]>()
  const neededFlags = new Map<string, string[]>()
  const madeItems = new Set<string>()
  const madeFlags = new Set<string>()

  const note = (map: Map<string, string[]>, key: string, where: string): void => {
    const list = map.get(key) ?? []
    list.push(where)
    map.set(key, list)
  }

  const scanConditions = (conditions: readonly Condition[] | undefined, where: string): void => {
    for (const condition of conditions ?? []) {
      if (condition.item) note(neededItems, condition.item, where)
      if (condition.flag) note(neededFlags, condition.flag.key, where)
    }
  }

  const scanEffects = (effects: readonly Effect[] | undefined): void => {
    for (const effect of effects ?? []) {
      if (effect.type === 'item') madeItems.add(effect.id)
      if (effect.type === 'flag') madeFlags.add(effect.key)
      if (effect.type === 'roll') madeFlags.add(effect.key)
    }
  }

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const where = `${sceneId}#${nodeId}`
      scanEffects(node.onEnter)
      for (const branch of node.branches ?? []) scanConditions(branch.requires, where)
      /**
       * 他多看见的那几句，条件一样要查。
       *
       * 这一格比别处更容易烂：写错了不会断链、不会少选项、
       * 玩家读到的正文也完好——**只是那一句永远不出现，而没有人在等它**。
       */
      for (const one of node.seen ?? []) scanConditions(one.requires, `${where} · 所见`)
      for (const choice of node.choices ?? []) {
        scanConditions(choice.requires, where)
        scanEffects(choice.effects)
      }
    }
  }
  for (const event of lifeEvents) scanConditions(event.requires, `年表 · ${event.id}`)

  /**
   * 一天里那些落点也会给东西。
   *
   * 头一版漏了这里，于是门禁自己报了个假警：saw-the-road 明明由
   * 「往山那边走走」那一条 beat 设着，扫描却只看场景的 onEnter 和 choices。
   * **门禁漏掉一类产出来源，比没有门禁更糟——它会把对的判成错的。**
   */
  for (const beat of BEATS) scanEffects(beat.effects)

  /**
   * 火种和反向火种的入场条件，同样是前置条件。
   *
   * 这是这道门禁的第二个盲区：illness-at-home 在火种里被引用了很久，
   * 而世上从来没有一个地方设过它——**那条火种一辈子点不着，
   * 却谁也没发现**。念头系统是新加的一层，它的条件一样要查。
   */
  for (const spark of SPARKS) scanConditions(spark.requires, `火种 · ${spark.id}`)
  for (const damper of DAMPERS) scanConditions(damper.requires, `反向火种 · ${damper.id}`)
  for (const opening of OPENINGS) scanConditions(opening.requires, `机会 · ${opening.id}`)

  /**
   * 引擎里造出来的那些。
   *
   * 它们不写在剧本数据里，扫不到——只能在源码文本里找那个字面量。
   * 粗，但正好够用：只要没有任何一处代码提到这个 id，它就一定没人给。
   */
  const engineSource = [
    ...ENGINE_FILES.map((file) =>
      readFileSync(new URL(`../src/engine/${file}`, import.meta.url), 'utf8'),
    ),
    // store 也会造旗标：念头到了「反复」那一档就置一个，供他自己的行动用
    readFileSync(new URL('../src/stores/leanings.ts', import.meta.url), 'utf8'),
  ].join('\n')

  /**
   * 有些旗标是**拼出来的**，字面量搜不到。
   *
   * 比如念头那一层的 `leaning:${id}`——源码里只有前缀，没有整个键。
   * 所以带这些前缀的键，只要源码里提到过那个前缀就算有出处。
   *
   * 这是这道门禁唯一一处放宽：**它换来的是不用把每个念头 id
   * 都在扫描里再写一遍**，而那份重复迟早会跟真实的 id 对不上。
   */
  const PREFIXES = ['leaning:', 'spark:', 'branched:', 'event:', 'lead:']

  const orphanNeeds: string[] = []
  for (const [kind, needed, made] of [
    ['物', neededItems, madeItems],
    ['旗标', neededFlags, madeFlags],
  ] as const) {
    for (const [key, wheres] of needed) {
      if (made.has(key)) continue
      if (engineSource.includes(`'${key}'`)) continue
      if (PREFIXES.some((prefix) => key.startsWith(prefix) && engineSource.includes(prefix)))
        continue
      orphanNeeds.push(`${kind}〔${key}〕　没有任何地方产出　被要求于：${wheres.join('、')}`)
    }
  }

  const total = neededItems.size + neededFlags.size
  if (orphanNeeds.length === 0) {
    console.log(`  ${total} 种前置条件，每一种都有出处。\n`)
  } else {
    console.log(`  ✗ ${orphanNeeds.length} 种前置条件永远满足不了：\n`)
    for (const line of orphanNeeds) console.log(`    ${line}`)
    console.log('\n  正文里说给了玩家，实际没给。那几条路永远走不到。\n')
    process.exitCode = 1
  }
}

// ============================================================
// 第五道：图上走得到，不代表人生里有人走得到
// ============================================================
/**
 * 前四道查的是**内容有没有来源**，这一道查的是**玩家有没有路走到那儿**。
 *
 * 这两件事真的会分开坏。前一轮同时撞见了两个：
 *
 *     illness-at-home　　火种引用了它，世上没有一处设过它　　　→ 来源问题
 *     omen:wounded#miss　节点连得好好的，三百世零个人走到　　　→ 路径问题
 *
 * 第三道那个「孤儿节点」查的是**图上**没人指向；这一道查的是
 * **人生里**没人抵达。`miss` 那个节点第二、三、四道全都放行：
 * 它有人指向、跳转不断头、条件也不缺——可它的入口是
 * `insight ≥ 34 || body ≥ 52` 的反面，而童年那些事到十岁之前
 * 就把每个人的属性都推过了线。三百世三百个人全都绕开了它。
 *
 * **一个事件存在，不代表玩家有机会经历它。** 普通事件表查的是
 * 「事件有没有触发」，这一道查的是「这个人的人生轨迹是否可能抵达这里」。
 *
 * ## 但它不能要求「每个节点都有人走到」
 *
 * 有些节点稀是对的。「被邪修抓过腕子之后那一条」要求
 * `事件概率 × 转化概率 × 行为概率`，乘出来三百世本来就轮不到一个人——
 * **用普通人生模拟去证明这种长尾存在，本身就是错的目标。**
 * 那种节点该由「可达性」那一层交代：把旗标直接构造进去走一遍。
 *
 * 所以这一道只做两件事：把没人走到的名单**印出来**，
 * 以及守住这份名单别越来越长。上限是量出来的，不是拍的。
 */
console.log('=== 可观测路径验收（人生里真走得到吗）===\n')
{
  /**
   * 没人走到的节点上限。
   *
   * ## 这个数换过一次，而换掉的理由比数本身重要
   *
   * 起先它是 32，凭两批实测（19 和 25）定的，还自以为留足了余量。
   * 后来把三百世那一批跑了十二遍，量出来的是另一回事：
   *
   *     16　21　19　22　20　21　22　24　28　30　37　19
   *     均值 23.3　标准差 5.6
   *
   * **十二批里有一批 37。** 也就是说 32 这个上限大约十二分之一的概率
   * 会红一次，而红的原因是抽样，不是内容——那正是这一整套走查
   * 最忌讳的一件事（`probe.ts` 的注释里写过同一句话）。
   *
   * 晃得这么厉害是因为这份名单不按「个」跳，按「卷」跳：
   * `seek:crossed` 十二批里有五批整卷没人走到，`royal:fall` 三批，
   * `birth:皇室` 一批。一卷稀，它就整卷进进出出。
   *
   * ## 于是它不再假装自己能抓「漏接一卷」
   *
   * 那件事本来是这个上限的立身之本——漏接一卷该多出五到十个节点。
   * 可噪声幅度是 ±11，**信号比噪声小，无论上限定在哪儿都抓不到**。
   * 现在那件事归第三道：一卷有没有入边是纯静态的，一个随机数也不用掷。
   *
   * 这一格只剩一个用处：**防灾难性回归**——一次改动把大片内容切下线。
   * 所以 40 = 均值 + 三个标准差，量出来的，不是拍的。
   */
  const UNVISITED_CEILING = 40

  const visits = new Map<string, number>()
  for (let index = 0; index < RUNS; index += 1) {
    setActivePinia(createPinia())
    const narrative = useNarrativeStore()
    useCharacterStore()

    /**
     * 顺着玩家真正走过的路记一笔。
     *
     * 不能从 `narrative.sceneId` 采样：`enterNode` 会一口气自动接好几节，
     * 中间那些节点在等到下一次落笔之前就被覆盖了——**而恰恰是它们最容易漏**，
     * `unseen`、`misread` 这类走到就结束的终端节点全在里头。
     * 所以在这里包一层 `locate`，它是每进一个节点都会被调到的那个。
     */
    const locate = narrative.locate
    narrative.locate = (sceneId: string, nodeId: string): void => {
      const key = `${sceneId}#${nodeId}`
      visits.set(key, (visits.get(key) ?? 0) + 1)
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
  }

  const unvisited: string[] = []
  let nodes = 0
  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const nodeId of Object.keys(scene.nodes)) {
      nodes += 1
      if (!visits.has(`${sceneId}#${nodeId}`)) unvisited.push(`${sceneId}#${nodeId}`)
    }
  }

  const walked = nodes - unvisited.length
  console.log(
    `  ${RUNS} 世里走到过 ${walked} 个节点，一共 ${nodes} 个——` +
      `${((walked / nodes) * 100).toFixed(0)}%。\n`,
  )

  if (unvisited.length > 0) {
    console.log(`  这 ${unvisited.length} 个这一批没人走到：\n`)
    for (const id of unvisited) console.log(`    ${id}`)
    console.log(
      '\n  稀不等于坏。这份名单是给人读的，不是给人清零的——' +
        '\n  读法是去可达性那一层查它：把状态直接构造进去，看那条路通不通。' +
        '\n\n    scripts/attention.ts 头两节　　那天他有没有把注意力放在那儿' +
        '\n    scripts/seeking.ts 第七节　　　 seek:crossed / seek:door 两卷（两千世走进去七回上下）' +
        '\n',
    )
  }

  if (unvisited.length > UNVISITED_CEILING) {
    console.log(
      `  ✗ 走不到的节点有 ${unvisited.length} 个，比上限 ${UNVISITED_CEILING} 多。\n` +
        '    这一格量的是「有没有大片内容一次性掉线」——上限是均值加三个标准差。\n' +
        '    单独漏接一卷它抓不到（噪声比信号大），那件事归第三道的「每一卷都有人指得到」。\n',
    )
    process.exitCode = 1
  }
}

// ============================================================
// 第六道：占位内容，得证明它还是占位
// ============================================================
/**
 * `routine:adult`（成年之后的日子）是一卷占位内容：类型要求四个阶段各有一卷，
 * 而凡人这一段总有一天会往后延，它先替那一天占着位子。
 *
 * 它现在走不到，而这是设计好的——**问题在于「走不到」不是它自己的性质，
 * 是别处四个数字凑出来的结论**。谁哪天动了年龄分档、给收尾事件加个条件、
 * 或者多写两卷不给玩家落笔的事件，它就会突然变成一个活的剧情入口：
 * 玩家读到一段谁也没设计过的人生，而没有任何东西会喊一声。
 *
 * **占位内容没有检查地躺着，就是这么变成隐藏债务的。** 所以这一道把
 * 那四个前提钉住，动了哪个都红灯。
 *
 * ## 为什么不用模拟判
 *
 * 「跑三百世没走到」证明不了走不到——这一轮刚在第五道那里量明白：
 * 稀到千分之三的卷，十二批里有五批整卷缺席。**判存在得静态判。**
 *
 * 而这件事恰好判得动，因为 `enterRoutine()` 只有两个入口：
 * 年表抽不出事（`pickEvent` 返回 null），或者连演的卷数顶到 `MAX_EVENT_CHAIN`。
 * 两条各堵两道，就是下面四条。
 *
 * ## 这四条守的是前提，不是「绝对到不了」
 *
 * 头两条是硬的：收尾事件永远在候选池里，年表就永远抽得出事。
 * 后两条不是——连演那条路上还留着一道窄缝：**假如某一串不落笔的卷
 * 中途把时间推过了十七岁生日**，顶满之后落回来的就是成年那一卷。
 * 现在没有这样的串（不落笔就不花时间，时间几乎只走在选项的 effects 里），
 * 但这一道没有去证明它永远不会有——那要把每条路径上的时间效果都追一遍，
 * 判据会细到自己先烂掉。
 *
 * 所以这一道诚实的说法是：**它盯的是让那一卷保持占位的四个前提，
 * 谁动了谁红灯**，而不是「这一卷数学上不可能被走到」。
 * 最该担心的那件事——哪天调了年龄分档，它就从死内容变成活入口，
 * 而玩家读到的是一段没人设计过的人生——正是第一条盯着的。
 *
 * ## 顺带纠一个错
 *
 * 这里原先写的理由是「十六岁那年收尾事件必被抽中」。**那句是错的**：
 * 十六岁之后还有二十来件散事件，权重合起来两百多，收尾权重 1000——
 * 单轮被挤掉的概率将近两成，人照样能活到十七岁。
 *
 * 真正管用的不是「必被抽中」，是**它永远在候选池里**（没有 requires，
 * 窗口一直开到 99）。池子不空，`pickEvent` 就不会返回 null，
 * 于是「年表抽不出事」这条路根本不会发生——抽中与否无所谓。
 */
console.log('=== 占位内容验收（成年那一卷还走不到吗）===\n')
{
  const PLACEHOLDER = 'routine:adult'

  /** 成年从几岁起。拿 `stageOf` 反推，不抄 `stages.ts` 里的分档 */
  let adultFrom = Number.POSITIVE_INFINITY
  for (let age = 0; age <= 200; age += 1) {
    if (stageOf(age) === '成年') {
      adultFrom = age
      break
    }
  }

  const finaleEvents = lifeEvents.filter((event) => event.scene.split('#')[0] === lifeFinale)
  const finaleFrom = Math.min(...finaleEvents.map((event) => event.window.from))

  /**
   * 这一卷有没有可能从头演到尾都不让玩家落笔。
   *
   * 从入口起走 `next` / `branches`，撞上带 `choices` 的节点这条路就算会停下来。
   * 只要**存在**一条走到头都没停过的路，这一卷就算数——宁可多算，
   * 因为这一格是在数「凑不凑得满连演的上限」，多算才是安全的那一边。
   */
  const mayNotAsk = (sceneId: string): boolean => {
    const scene = lifeScenes[sceneId]
    if (!scene) return false
    const memo = new Map<string, boolean>()
    const walk = (nodeId: string): boolean => {
      const cached = memo.get(nodeId)
      if (cached !== undefined) return cached
      memo.set(nodeId, false) // 环上先记 false，免得自己咬自己
      const node = scene.nodes[nodeId]
      if (!node) return true // 跳去别卷了：本卷一句没问
      let answer = false
      if (!node.choices?.length) {
        const outs: string[] = []
        if (node.next) outs.push(node.next)
        for (const branch of node.branches ?? []) outs.push(branch.next)
        answer =
          outs.length === 0 || // 走到头都没问过
          outs.some((target) => {
            const [head, tail] = target.split('#')
            if (tail) return head === sceneId ? walk(tail) : true
            return head && scene.nodes[head] ? walk(head) : true
          })
      }
      memo.set(nodeId, answer)
      return answer
    }
    return walk(scene.entry)
  }

  /**
   * 可能一句不问、又能在成年那年被抽中的事件。一件都不该有。
   *
   * 连演顶到上限要连着 `MAX_EVENT_CHAIN` 卷不给玩家落笔——而不落笔就不花时间
   * （时间几乎只走在选项的 effects 里），所以这一串演下来年龄基本不动。
   * 库里凑得出这种卷的有六件，全部封顶在收尾那一年：连演真顶满了，
   * 人也还没成年，落回去的是少年那一卷。
   *
   * **所以这一格看的不是件数，是窗口**：哪天有人把其中一件的窗口
   * 往成年之后延一年，这条缝就宽了。
   */
  const silent = lifeEvents.filter((event) => mayNotAsk(event.scene.split('#')[0] ?? ''))
  const silentPastAdult = silent.filter((event) => event.window.to >= adultFrom)

  /** 收尾那一卷的跳转有没有跑出卷外。跑出去了，演到它也不一定收得了尾 */
  const finaleScene = lifeScenes[lifeFinale]
  const finaleLeaks: string[] = []
  for (const [nodeId, node] of Object.entries(finaleScene?.nodes ?? {})) {
    const outs: string[] = []
    if (node.next) outs.push(node.next)
    for (const branch of node.branches ?? []) outs.push(branch.next)
    for (const choice of node.choices ?? []) if (choice.next) outs.push(choice.next)
    for (const target of outs) {
      const [head, tail] = target.split('#')
      const stays = tail ? head === lifeFinale : Boolean(head && finaleScene?.nodes[head])
      if (!stays) finaleLeaks.push(`${lifeFinale}#${nodeId} → ${target}`)
    }
  }

  const claims: readonly { holds: boolean; text: string }[] = [
    {
      holds: adultFrom > finaleFrom,
      text: `收尾从 ${finaleFrom} 岁起可被抽中，而「成年」要到 ${adultFrom} 岁才开始`,
    },
    {
      holds: finaleEvents.every((event) => (event.requires ?? []).length === 0),
      text: '收尾事件没有前置条件，到了年纪就一直在候选池里',
    },
    {
      holds: finaleLeaks.length === 0,
      text: '收尾那一卷的跳转都留在卷内，演到它就一定演到底',
    },
    {
      holds: silentPastAdult.length === 0,
      text:
        `凑得出连演的事件有 ${silent.length} 件（上限 ${MAX_EVENT_CHAIN} 卷），` +
        `窗口都在 ${adultFrom} 岁之前封顶`,
    },
  ]

  const broken = claims.filter((claim) => !claim.holds)
  if (broken.length === 0) {
    console.log(`  ${PLACEHOLDER} 还是走不到，四条前提都在：\n`)
    for (const claim of claims) console.log(`    · ${claim.text}`)
    console.log(
      '\n  前两条堵住「年表抽不出事」，后两条堵住「连演顶到上限」——\n' +
        '  它只能靠这两条路被叫出来。\n',
    )
  } else {
    console.log(`  ✗ ${broken.length} 条前提不成立了：\n`)
    for (const claim of broken) console.log(`    ${claim.text}`)
    if (finaleLeaks.length > 0) {
      console.log('\n    收尾卷跳出卷外的：')
      for (const leak of finaleLeaks) console.log(`      ${leak}`)
    }
    if (silentPastAdult.length > 0) {
      console.log('\n    能演到成年那年、又可能一句不问的：')
      for (const event of silentPastAdult) {
        console.log(
          `      ${event.id} → ${event.scene}　窗口 ${event.window.from}–${event.window.to}`,
        )
      }
    }
    console.log(
      `\n  ${PLACEHOLDER} 现在可能真的走得到了。那是占位内容，不是写好的人生——` +
        '\n  玩家会读到一段谁也没设计过的东西。要么把这一卷补成真内容，' +
        '\n  要么想清楚这次改动是不是本来就打算把成年之后接上。\n',
    )
    process.exitCode = 1
  }
}

/**
 * 第七道：章节拓扑验收。
 *
 * ## 它对的是四句话
 *
 *     章名不重，卷也不重　　`Object.fromEntries` 撞名不报错，后来的直接盖掉前面的
 *     跨章的边都写在目录里　偷偷多接一条，或者删了一条却忘了删声明
 *     事件窗口不越出章界　　把某件事的年龄往外挪一岁，一整章就漂到人生另一段上去
 *     每章都叫得出来　　　　写好了没接入口，或者接了却没在目录上认领
 *     说了要留下的还留着　　这一章还在干它当初存在的那件事吗
 *
 * 前三条各自守着一种**静默失败**——出事的时候没有任何东西会报错，
 * 只是玩家读到的东西悄悄变了。第四条守的是相反的方向：内容写了却没人读到。
 *
 * 第五条守的是最慢的那一种坏法：一章被改了十次，每次都合理，
 * 十次之后它已经不干当初那件事了，而没有任何一次改动看起来像个错误。
 * `purpose` 那句话没法验，`marks` 能验——**能验的那一半替不能验的那一半站着岗**。
 *
 * ## 断言力来自「手写」两个字
 *
 * `to` 和 `called` 完全可以从数据里算出来——算出来的版本永远不会红，
 * 因为它跟着实现走。写下来就不一样：多接一条边，两边对不上，红。
 * 要绕过去得手动去改那份声明，**而改的那一刻，人就看见自己在做什么了**。
 *
 * `age` 是三格里最松的一格，它只管边界不管逐件：往里收不红，越出去才红。
 * 这道松是有意的——调单件事件的窗口是常规内容工作，不该每次都惊动门禁；
 * 但把一件十岁的事挪到十七岁，那不是调窗口，那是改了这一章在人生里的位置。
 */
console.log('=== 章节拓扑验收（目录跟内容对得上吗）===\n')
{
  /** 卷 → 它归哪一章。一卷被两章同时认领，会在这一步露出来 */
  const owner = new Map<string, string>()
  const dupScenes: string[] = []
  const dupChapters: string[] = []
  const known = new Set<string>()
  for (const chapter of CHAPTERS) {
    if (known.has(chapter.id)) dupChapters.push(chapter.id)
    known.add(chapter.id)
    for (const sceneId of Object.keys(chapter.scenes)) {
      const already = owner.get(sceneId)
      if (already) dupScenes.push(`${sceneId}　被 ${already} 和 ${chapter.id} 同时认领`)
      else owner.set(sceneId, chapter.id)
    }
  }

  /**
   * 一个跳转落在哪一卷上。
   *
   * 带 `#` 的，前半截是卷名；不带的先看它是不是别卷的入口，
   * 都不是就当本卷的节点 id——卷名一律带冒号，节点 id 一律不带，撞不上。
   */
  const landsOn = (from: string, target: string): string => {
    const [head, tail] = target.split('#')
    if (!head) return from
    if (tail) return head
    return lifeScenes[head] ? head : from
  }

  /** 实际存在的跨章边，`章→章`，附带是哪几处接的 */
  const realEdges = new Map<string, string[]>()
  for (const chapter of CHAPTERS) {
    for (const [sceneId, scene] of Object.entries(chapter.scenes)) {
      for (const [nodeId, node] of Object.entries(scene.nodes)) {
        const outs: string[] = []
        if (node.next) outs.push(node.next)
        for (const branch of node.branches ?? []) outs.push(branch.next)
        for (const choice of node.choices ?? []) if (choice.next) outs.push(choice.next)
        for (const target of outs) {
          const to = owner.get(landsOn(sceneId, target))
          if (!to || to === chapter.id) continue
          const edge = `${chapter.id} → ${to}`
          realEdges.set(edge, [...(realEdges.get(edge) ?? []), `${sceneId}#${nodeId} → ${target}`])
        }
      }
    }
  }

  const declaredEdges = new Set(CHAPTERS.flatMap((c) => c.to.map((to) => `${c.id} → ${to}`)))
  /** 接了没说的 */
  const undeclared = [...realEdges.keys()].filter((edge) => !declaredEdges.has(edge))
  /** 说了没接的。章名写错也落在这里——那条边当然找不到 */
  const stale = [...declaredEdges].filter((edge) => !realEdges.has(edge))

  /** 窗口跑出章界的事件 */
  const strays: string[] = []
  for (const chapter of CHAPTERS) {
    const [from, to] = chapter.age
    for (const event of chapter.events) {
      if (event.window.from < from || event.window.to > to) {
        strays.push(
          `${chapter.id}　${event.id}　窗口 ${event.window.from}–${event.window.to}，` +
            `而这一章写的是 ${from}–${to}`,
        )
      }
    }
  }

  /** 日常和收尾各落在哪一章 */
  const routineOwners = new Set(
    Object.values(lifeRoutine)
      .map((sceneId) => owner.get(sceneId))
      .filter((id): id is string => id !== undefined),
  )
  const finaleOwner = owner.get(lifeFinale)

  const miscalled: string[] = []
  for (const chapter of CHAPTERS) {
    const real: ChapterCall[] = []
    if (chapter.events.length > 0) real.push('年表')
    if (routineOwners.has(chapter.id)) real.push('日常')
    if (finaleOwner === chapter.id) real.push('收尾')
    if (real.join('、') !== [...chapter.called].join('、')) {
      miscalled.push(
        `${chapter.id}　目录写着「${[...chapter.called].join('、') || '没人叫'}」，` +
          `实际是「${real.join('、') || '没人叫'}」`,
      )
    }
  }

  /** 一种入口都没有的章：年表不叫，日常不叫，收尾不是它，也没有别章跳进来 */
  const orphans = CHAPTERS.filter(
    (chapter) =>
      chapter.called.length === 0 && !CHAPTERS.some((other) => other.to.includes(chapter.id)),
  ).map((chapter) => chapter.id)

  /** 一章实际落下的效果类型 */
  const marksOf = (chapter: Chapter): Set<string> => {
    const found = new Set<string>()
    for (const scene of Object.values(chapter.scenes)) {
      for (const node of Object.values(scene.nodes)) {
        for (const effect of node.onEnter ?? []) found.add(effect.type)
        for (const choice of node.choices ?? []) {
          for (const effect of choice.effects ?? []) found.add(effect.type)
        }
      }
    }
    return found
  }

  /** 说了要留下、实际却一处也没有的痕迹 */
  const unkept: string[] = []
  /** 说不出自己为什么存在的章 */
  const mute: string[] = []
  for (const chapter of CHAPTERS) {
    if (chapter.purpose.length === 0) mute.push(chapter.id)
    const real = marksOf(chapter)
    for (const mark of chapter.marks) {
      if (!real.has(mark)) unkept.push(`${chapter.id}　说要留下 ${mark}，这一章里一处也没落`)
    }
  }
  const markCount = CHAPTERS.reduce((sum, chapter) => sum + chapter.marks.length, 0)

  const countOf = (call: ChapterCall): number =>
    CHAPTERS.filter((chapter) => chapter.called.includes(call)).length

  const claims: readonly { holds: boolean; text: string }[] = [
    {
      holds: dupChapters.length === 0 && dupScenes.length === 0,
      text: `章名不重，卷也不重——${owner.size} 卷各归一章，没有谁被谁盖掉`,
    },
    {
      holds: undeclared.length === 0 && stale.length === 0,
      text: `跨章的边有 ${realEdges.size} 条，目录上写着的正好是这几条`,
    },
    {
      holds: strays.length === 0,
      text: `${lifeEvents.length} 件事件的窗口都落在各自章的年龄段里`,
    },
    {
      holds: miscalled.length === 0 && orphans.length === 0,
      text:
        `每章都叫得出来，叫法也跟目录一致：年表 ${countOf('年表')} 章，` +
        `日常 ${countOf('日常')} 章，收尾 ${countOf('收尾')} 章`,
    },
    {
      holds: unkept.length === 0 && mute.length === 0,
      text: `每章都说得出自己为什么存在，说了要留下的 ${markCount} 处痕迹也都还在`,
    },
  ]

  const broken = claims.filter((claim) => !claim.holds)
  if (broken.length === 0) {
    console.log(`  ${CHAPTERS.length} 章的目录跟内容对得上，五项都在：\n`)
    for (const claim of claims) console.log(`    · ${claim.text}`)
    console.log('')
  } else {
    console.log(`  ✗ ${broken.length} 项对不上：\n`)
    for (const claim of broken) console.log(`    ${claim.text}`)
    const dump = (title: string, lines: readonly string[]): void => {
      if (lines.length === 0) return
      console.log(`\n    ${title}`)
      for (const line of lines) console.log(`      ${line}`)
    }
    dump('章名或卷名撞了：', [...dupChapters.map((id) => `章名 ${id} 写了两遍`), ...dupScenes])
    dump(
      '接了却没写进目录的边：',
      undeclared.flatMap((edge) => [edge, ...(realEdges.get(edge) ?? []).map((at) => `  ${at}`)]),
    )
    dump('目录上写着、实际却不存在的边：', stale)
    dump('窗口跑出章界的事件：', strays)
    dump('叫法跟目录对不上的章：', miscalled)
    dump('一种入口都没有的章：', orphans)
    dump('说了却没兑现的痕迹：', unkept)
    dump('说不出自己为什么存在的章：', mute)
    console.log(
      '\n  目录是手写的，内容是长出来的，两者分岔就说明有一次改动只落了一半。' +
        '\n  要么把改动补齐，要么去 chapters.ts 把新的意图写下来——' +
        '\n  写下来这件事本身就是这一道要的东西。\n',
    )
    process.exitCode = 1
  }
}
