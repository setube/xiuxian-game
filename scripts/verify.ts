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
import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS } from '../src/content/days'
import { DAMPERS, SPARKS } from '../src/content/leanings'
import { OPENINGS } from '../src/content/openings'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
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
// 第三道：库里不许躺着走不到的节点
// ============================================================
/**
 * 断头路的反面。
 *
 * 改剧本时最常留下的垃圾不是打错的跳转，是**没人再指向的旧节点**——
 * 比如 `omen:wounded` 从「真相分流器 + 六个既定结局」改成五节点之后，
 * 那七个节点如果忘了删，会一直躺在库里：编译得过，跑不到，
 * 而下一个人读这份剧本时会以为它还在用。
 */
console.log('=== 孤儿节点验收 ===\n')
{
  const orphans: string[] = []
  let nodes = 0

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    const reachable = new Set<string>([scene.entry])
    /** 只收本卷内的落点：跨卷跳转由第二道保证目标存在 */
    const mark = (target: string): void => {
      const [head, tail] = target.split('#')
      if (tail) {
        if (head === sceneId) reachable.add(tail)
      } else if (head) {
        reachable.add(head)
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
    console.log(`  ${nodes} 个节点，每一个都走得到。\n`)
  } else {
    console.log(`  ✗ ${orphans.length} 个节点没人指向：\n`)
    for (const id of orphans) console.log(`    ${id}`)
    console.log('\n  它们要么是改剧本时忘了删的，要么是该接上却漏接了。\n')
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
