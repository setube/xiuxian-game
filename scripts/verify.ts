/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 内容门禁：八道。
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
 * ## 第八道守的是最后一层：这些字要给人读
 *
 * 前七道全在问「内容是不是自洽的」，而自洽的内容照样能穿帮：
 * `family` 那条效果把内部 id 当称呼传了出去，于是人际面板上
 * 写着 `sibling`。跳转对、条件全、卷有入边、目录也对得上——
 * **那一世从头到尾没有任何东西报错**。
 *
 * 内部标识和玩家读到的字是同一份 `string`，类型系统分不出来。
 * 能分出来的只有一句话：**这个世界里玩家读得到的东西，没有一个字母是该有的**。
 *
 * 它跟第五道搭同一趟车——那三百世跑完，人还在，顺手扫一眼人际面板就够了。
 *
 * 跑法：npx vite-node scripts/verify.ts
 * 失败会以非零码退出，可以直接挂进 CI。
 */
import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS } from '../src/content/days'
import { ERRANDS } from '../src/content/errands'
import { HINDSIGHTS } from '../src/content/hindsight'
import { INFORMANTS } from '../src/content/informants'
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
import { conditionsOf, effectsOf, exitsOf } from './refs'

const RUNS = 300

/** 会自己造东西给玩家的那几支引擎。第四道验收要扫它们的源码 */
const ENGINE_FILES = [
  'wounded.ts',
  'book.ts',
  'effects.ts',
  'seeking.ts',
  'errand.ts',
  'meeting.ts',
  'tutelage.ts',
] as const

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
      for (const exit of exitsOf(node)) {
        edges += 1
        if (!resolveTarget(exit.to, sceneId)) {
          dangling.push({ from: where, to: exit.to, via: exit.via })
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
      for (const exit of exitsOf(node)) mark(exit.to)
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
  const neededKnowledge = new Map<string, string[]>()
  const madeItems = new Set<string>()
  const madeFlags = new Set<string>()
  const madeKnowledge = new Set<string>()

  const note = (map: Map<string, string[]>, key: string, where: string): void => {
    const list = map.get(key) ?? []
    list.push(where)
    map.set(key, list)
  }

  /**
   * 一格条件要不要「有人给」，要的话给的是哪一种东西。
   *
   * `null` 是明确的「这一格不需要来源」——年龄、性别、行当、家境
   * 都是人物固有的，世上没有哪一处「产出」它们。
   *
   * ## 为什么登记，而不是像从前那样写两行 if
   *
   * 从前这里只有 `item` 和 `flag` 两行。少写的那些当时都对：
   * `age` 确实不需要来源。**可它们是「碰巧对」，不是「说清楚了对」**——
   * 将来 `Condition` 多一格 `technique?`（会某门功法），
   * 那一格是需要来源的，而这里不会有任何东西提醒人补上它。
   *
   * `satisfies` 把这件事变成编译期的：加一格不表态，`vue-tsc --build` 当场红。
   * 表态成 `null` 也行——**但那是明写下来的一句话，不是漏掉的一行**。
   *
   * 头一次登记就逼出了一格漏的：`knowledge`。剧本里 30 处在问
   * 「他知不知道这件事」，而这道门禁从来没查过那些 id 有没有人 learn。
   */
  const NEEDS = {
    item: (id) => [neededItems, id],
    flag: (flag) => [neededFlags, flag.key],
    knowledge: (id) => [neededKnowledge, id],
    attribute: null,
    age: null,
    standing: null,
    family: null,
    bond: null,
    region: null,
    trade: null,
    /**
     * 「这家人过的是什么日子」不需要有人给。
     *
     * 它是 `household.living` 算出来的：先看把你养大的那个人过什么日子，
     * 没有就落回这家的营生。世上没有哪一处效果会「产出」一种日子——
     * 换了抚养人，那个 computed 自己就变了。
     *
     * 但它有另一种坏法：`{ living: { is: 'farmm' } }` 拼错了没人管。
     * 那一道在 `scripts/upbringing.ts`，对着 `ALL_LIVINGS` 查 id。
     */
    living: null,
    gender: null,
    stage: null,
  } satisfies {
    [K in keyof Condition]-?:
      ((value: NonNullable<Condition[K]>) => [Map<string, string[]>, string]) | null
  }

  const scanConditions = (conditions: readonly Condition[] | undefined, where: string): void => {
    for (const condition of conditions ?? []) {
      for (const key of Object.keys(NEEDS) as (keyof Condition)[]) {
        const value = condition[key]
        if (value === undefined) continue
        // 对应关系由上面那句 satisfies 钉死，遍历时 TS 关联不上两个 key，收口成一次 cast
        const of = NEEDS[key] as ((value: unknown) => [Map<string, string[]>, string]) | null
        if (!of) continue
        const [map, id] = of(value)
        note(map, id, where)
      }
    }
  }

  /**
   * 一种效果产不产出前置条件，产出的是哪一种。
   *
   * `null` 是明确的「这一种不产出」——涨属性、过时间、写编年，
   * 都不会让「某个 id 从此有人给了」。
   *
   * ## 这里原本是三行 if
   *
   *     if (effect.type === 'item') madeItems.add(effect.id)
   *     if (effect.type === 'flag') madeFlags.add(effect.key)
   *     if (effect.type === 'roll') madeFlags.add(effect.key)
   *
   * 三行都对，**漏掉的那一行才是问题**：`knowledge`。
   * 剧本里 30 处在问「他知不知道这件事」，产出那一半却从来没扫过，
   * 于是这道门禁一边不查、一边看着五条认知在库里躺着。
   * 补上之后当场报出六条，其中五条是这个漏扫造成的假空白，
   * 剩下一条 `breathing` 是真的没人给。
   *
   * 换成登记表之后，`Effect` 多一个变体就必须在这儿表态。
   * 表态成 `null` 也行——**那是明写下来的一句话，不是漏掉的一行**。
   */
  const MAKES = {
    item: (effect) => [madeItems, effect.id],
    flag: (effect) => [madeFlags, effect.key],
    roll: (effect) => [madeFlags, effect.key],
    knowledge: (effect) => [madeKnowledge, effect.id],
    time: null,
    attribute: null,
    place: null,
    home: null,
    realm: null,
    identity: null,
    aspect: null,
    claim: null,
    reveal: null,
    reflect: null,
    observe: null,
    relation: null,
    chronicle: null,
    household: null,
    family: null,
    person: null,
    meet: null,
    recall: null,
    signs: null,
    ask: null,
    'ask-around': null,
    attend: null,
    knock: null,
    /**
     * 一次会面落的认知是 `met:{谁}`，**效果参数里只有一个 `who`**。
     *
     * 拼得出来，可拼出来就是把引擎里那行模板在门禁里再抄一遍——
     * 抄的那一份不会红，它只会跟着我改。所以这一格表态成 `null`，
     * 产出交给下面扫源码那一关，**`meeting.ts` 因此列进 `ENGINE_FILES`**。
     *
     * 另一半产出（他说出口的那几句进 `aspects.claims`）根本不在这道门禁的账上：
     * 这里数的是「谁给谁」的供需，而 claim 没有任何一处剧本会去 requires。
     */
    meeting: null,
    /**
     * 这三格产出的东西都拼不出静态名字。
     *
     * `tutelage` 落的是 `footing:{谁}`。剩下两格落的键更碎——
     * `teaching` 一次落三个（`rite:{哪一样}` 是他脑子里到了哪一层、
     * `:by` 是谁教的、`:since` 是哪一天教的），`practice` 落两个
     * （`:hold` 是他身上到了哪一步、`:tries` 是练了几回），
     * 外加一条认知。
     *
     * 参数里倒是有 `who` 和 `rite`，可拼出来仍旧是把 `tutelage.ts`
     * 里那几行模板在门禁里抄第二遍，**抄的那一份不会红**：
     * 哪天引擎多落一个键，抄的这一份照样绿着。
     *
     * 所以照 `meeting` 的老规矩表态成 `null`，产出交给下面扫源码那一关，
     * `tutelage.ts` 因此列进 `ENGINE_FILES`。
     */
    tutelage: null,
    teaching: null,
    practice: null,
    /**
     * 寻访这一趟到底落下什么，**效果参数里读不出来**——那儿只有一个 id。
     *
     * 真正的产出散在两处：落点表里写着的（`takes` 是认知，`points`
     * 落 `following` 和 `sure-of` 两个旗标），和引擎自己攒的
     * （`errands-empty` 数着白跑了几趟，够了就落 `came-up-empty`）。
     *
     * 所以这一格只能表态成 `null`，产出那一半交给下面扫源码那一关——
     * **`errand.ts` 因此必须列进 `ENGINE_FILES`**，
     * 否则「反向火种要 `came-up-empty`，可没人给」会当场误报。
     */
    errand: null,
    follow: null,
    glance: null,
    encounter: null,
    appraise: null,
    book: null,
    'book-named': null,
    hearsay: null,
    daily: null,
    diary: null,
    reading: null,
  } satisfies {
    [K in Effect['type']]: ((effect: Extract<Effect, { type: K }>) => [Set<string>, string]) | null
  }

  const scanEffects = (effects: readonly Effect[] | undefined): void => {
    for (const effect of effects ?? []) {
      // 对应关系由上面那句 satisfies 钉死，遍历时 TS 关联不上 type 与取值函数，收口成一次 cast
      const of = MAKES[effect.type] as ((effect: Effect) => [Set<string>, string]) | null
      if (!of) continue
      const [set, id] = of(effect)
      set.add(id)
    }
  }

  for (const [sceneId, scene] of Object.entries(lifeScenes)) {
    for (const [nodeId, node] of Object.entries(scene.nodes)) {
      const where = `${sceneId}#${nodeId}`
      /**
       * 条件和效果都从登记表取，节点的格子一格也不会漏。
       *
       * 从前这里手写「onEnter、branches、seen、choices」四行。
       * 而 `seen` 那一行是补上去的——**头一版忘了写，
       * 于是我编的那个旗标在库里躺着，门禁一声没吭**。
       * 现在忘不了了：加一格而不在 `refs.ts` 登记，编译就过不去。
       */
      for (const ref of conditionsOf(node)) {
        scanConditions(ref.requires, ref.tag ? `${where} · ${ref.tag}` : where)
      }
      scanEffects(effectsOf(node))
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
   * 认知还有两个出处，都在数据表里，剧本效果扫不到。
   *
   * - **问人问出来的**：`informants.ts` 每个答案的 `learns`。
   * - **跑一趟撞上的**：`errands.ts` 每个落点的 `takes`。
   *
   * 两处都遍历数据结构，而不是在源码文本里搜那个 id——
   * 文本搜是给引擎硬编码那几处兜底用的粗办法，
   * 数据既然是结构化的，就该结构化地读。
   *
   * 补这两处是让后见规则那一行有意义的前提：南山那一条要的
   * `the-daoist-in-nanshan` 正是从寻访落点里来的。
   */
  for (const informant of INFORMANTS) {
    for (const answer of informant.answers) {
      if (answer.learns) madeKnowledge.add(answer.learns.id)
    }
  }
  for (const errand of ERRANDS) {
    for (const turnout of errand.turnouts) {
      if (turnout.takes) madeKnowledge.add(turnout.takes.id)
    }
  }

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
   * 后见规则要的东西，同样是前置条件。
   *
   * 这是第三个盲区，跟前两个同一个形状：**一条永远点不亮的后见规则
   * 比没写更坏——它看着像在工作。** `hindsight.ts` 自己的注释里
   * 写着「`after` 定太大就等于写了一条永远点不亮的规则」，
   * 而那句话从前没有任何东西守着。
   *
   * `tags` 那一格这里查不了（日录标记来自 `days.ts` 的落点和
   * 场景 jot，眼下没有统一登记处），缺口明写在这儿：
   * **点不亮的第二种原因是标记打不上，这一道抓不到。**
   */
  for (const rule of HINDSIGHTS) scanConditions(rule.needs, `后见 · ${rule.id}`)

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
   *
   * `footing:` 和 `rite:` 是师承那一层加进来的，形状一样：
   * `tutelage.ts` 里只有模板，具体是哪个修士、哪一样东西要到运行时才知道。
   * `rite:` 底下如今挂着五个键（层数、身上那一步、练了几回、谁教的、
   * 哪天教的），**而这里只认那三个字符的前缀**——正因为如此，
   * 引擎再多挂一个键，这道门禁也不必跟着改。
   */
  const PREFIXES = ['leaning:', 'spark:', 'branched:', 'event:', 'lead:', 'footing:', 'rite:']

  const orphanNeeds: string[] = []
  for (const [kind, needed, made] of [
    ['物', neededItems, madeItems],
    ['旗标', neededFlags, madeFlags],
    /**
     * 认知有两个出处：剧本里 `type: 'knowledge'` 的效果，
     * 和引擎里硬编码的那几处 `learn`（问答、货郎的书、路上那个人）。
     * 前者进 `madeKnowledge`，后者靠下面扫源码那一关兜住。
     */
    ['认知', neededKnowledge, madeKnowledge],
  ] as const) {
    for (const [key, wheres] of needed) {
      if (made.has(key)) continue
      if (engineSource.includes(`'${key}'`)) continue
      if (PREFIXES.some((prefix) => key.startsWith(prefix) && engineSource.includes(prefix)))
        continue
      orphanNeeds.push(`${kind}〔${key}〕　没有任何地方产出　被要求于：${wheres.join('、')}`)
    }
  }

  const total = neededItems.size + neededFlags.size + neededKnowledge.size
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
/**
 * 第八道要用的两份采样，跟第五道搭同一趟车。
 *
 * 三百世跑一趟要十几秒。第八道要的东西——每一世结束时人际面板上
 * 那些字——正好是第五道跑完就能顺手扫一眼的，没有理由再跑三百世。
 * 声明写在这儿而不是第八道那一节里，是因为**填它的地方在第五道**，
 * 而 JS 的块作用域不会让第八道看见第五道块里的变量。
 */
/** 玩家读得到、却混进了英文字母的那些字。文本 → 头一回在哪儿见到 */
const romanLeaks = new Map<string, string>()
/** 三百世里有多少世家里真的添过丁。为零就说明这一道在空转 */
let livesWithNewKin = 0

/**
 * 这段字里混着英文字母吗。
 *
 * 尺子就这么短，因为**这个世界里玩家读得到的东西没有一个字母是该有的**：
 * 称呼是中文，关系是中文，营生是中文，门牌是中文加间隔号。
 * 一旦冒出 `a`–`z`，那就只能是内部标识漏了出来。
 *
 * 不查数字：年龄、年份本来就写成阿拉伯数字。
 */
const hasRoman = (text: string): boolean => /[A-Za-z]/.test(text)

/** 记一笔。同一段字只记头一回见到的地方，不然三百世能刷出几千行 */
const note = (where: string, text: string | undefined): void => {
  if (text === undefined || !hasRoman(text)) return
  if (!romanLeaks.has(text)) romanLeaks.set(text, where)
}

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
   * 所以它一直是「均值 + 三个标准差」，量出来的，不是拍的。
   *
   * ## 第二次换，是因为内容真的变多了
   *
   * 师承那一章进来之后（`tutor:` 五卷、`meet:` 那几卷），再跑十批：
   *
   *     45　44　40　45　44　44　54　41　39　46
   *     均值 44.2　标准差 3.9
   *
   * 新内容天生就比老内容稀——`tutor:words` 要先叩到「教一点」才走得到，
   * 那本来就是少数人生。**上限跟着内容量走是对的，跟着一次红去调是不对的**：
   * 这十批是在改动落地之后重新量的，不是拿 41 那一批倒推出来的。
   */
  const UNVISITED_CEILING = 56

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

    // 这一世走完了，趁人还在，把人际面板上那些字扫一遍（第八道用）
    const people = usePeopleStore()
    if (people.personOf('sibling') !== undefined) livesWithNewKin += 1
    for (const id of Object.keys(people.known)) {
      const person = people.personOf(id)
      note(`${id} 的称呼`, people.callOf(id))
      note(`${id} 的身份`, person?.trade)
      note(`${id} 那一句`, people.known[id]?.note)
      for (const bond of people.bondsWith(id)) note(`${id} 的关系`, bond)
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
        '\n    scripts/tutelage.ts 第三、五节　tutor: 那几卷（得先叩到「带一段」「教一点」）' +
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
        /**
         * 这里的出边不含选项——**因为进得来这一支就说明选项是空的**。
         * 从前这两行手写 `next` 和 `branches`，读着像是「故意只看这两格」；
         * 其实是「这一节没有第三格」。换成登记表之后语义一模一样，
         * 而将来多一种不问玩家的去向，这里自动跟着看。
         */
        const outs = exitsOf(node).map((exit) => exit.to)
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
    for (const exit of exitsOf(node)) {
      const [head, tail] = exit.to.split('#')
      const stays = tail ? head === lifeFinale : Boolean(head && finaleScene?.nodes[head])
      if (!stays) finaleLeaks.push(`${lifeFinale}#${nodeId} → ${exit.to}`)
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
        for (const exit of exitsOf(node)) {
          const to = owner.get(landsOn(sceneId, exit.to))
          if (!to || to === chapter.id) continue
          const edge = `${chapter.id} → ${to}`
          realEdges.set(edge, [...(realEdges.get(edge) ?? []), `${sceneId}#${nodeId} → ${exit.to}`])
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
        for (const effect of effectsOf(node)) found.add(effect.type)
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

// ============================================================
// 第八道：玩家读到的字里不许有英文
// ============================================================
/**
 * 第八道：内部标识不许漏到脸上。
 *
 * ## 它是为一个真出过的错写的
 *
 * `family` 那条效果从前写的是 `people.meet(effect.id, effect.id, ...)`——
 * **把内部 id 当成了玩家嘴里的称呼**。爹娘没露馅，因为出生那一刻
 * 就已经 `meet` 过，`meet()` 对已认识的人不改称呼；家里添的那个孩子露了：
 * 人际面板上明晃晃写着 `sibling`。
 *
 * 类型系统对此一无所知——`id` 是 string，`calls` 也是 string。
 * 走查也抓不到：所有跳转都对，所有前置条件都有人给，那一世从头到尾没有报错。
 * 玩家是唯一会发现这件事的人。
 *
 * ## 尺子短，是因为这个世界不该有字母
 *
 * 称呼、关系、营生、附注——玩家在人际面板上读到的全部四样，
 * 没有一样该出现 `a`–`z`。于是判据可以短到一行正则，
 * 而**短不等于弱**：`Bond` 里那个 `'friend'` 也是这一道抓的同一类东西。
 *
 * ## 三件事一起说，缺一件这一道就不算数
 *
 *     尺子自己判得出对错　　手工喂它五段字，该红的红、该绿的绿
 *     这三百世真走到过添丁　一次都没走到，那扫得再干净也只是没扫到东西
 *     扫出来的名单是空的　　前两件成立，这一件才是个结论
 */
console.log('=== 称呼验收（玩家读到的字里有英文吗）===\n')
{
  /**
   * 尺子自检。
   *
   * 判据写完先问一句：**如果这个毛病根本没被修好，它会红吗？**
   * 光看三百世扫出来是空的证明不了什么——正则写错一个字，
   * 它同样是空的，而且看上去还挺勤快。所以先拿手工构造的字喂它一遍。
   */
  const rulerCases: readonly { text: string; leaks: boolean; why: string }[] = [
    { text: 'sibling', leaks: true, why: '内部 id 当称呼——这一道就是为它写的' },
    { text: 'friend', leaks: true, why: '关系名写成英文' },
    { text: '沈家的Xiao弟', leaks: true, why: '夹在中文里的英文，一样得抓出来' },
    { text: '弟弟', leaks: false, why: '正常的中文称呼' },
    { text: '云州 · 临江府 · 柳溪村', leaks: false, why: '门牌里有间隔号和空格，那不是字母' },
    { text: '十七岁。药铺', leaks: false, why: '阿拉伯数字是该有的，不查' },
  ]
  const misjudged = rulerCases.filter((one) => hasRoman(one.text) !== one.leaks)

  const claims: readonly { holds: boolean; text: string }[] = [
    {
      holds: misjudged.length === 0,
      text: `尺子自己判得出对错——${rulerCases.length} 段手工构造的字，该红的红，该绿的绿`,
    },
    {
      holds: livesWithNewKin > 0,
      text:
        `这三百世里有 ${livesWithNewKin} 世家里添过丁——` +
        '「添丁」正是当初露馅的那条路，它得真被走到过',
    },
    {
      holds: romanLeaks.size === 0,
      text: '三百世的人际面板上，称呼、关系、营生、附注里一个英文字母也没有',
    },
  ]

  const broken = claims.filter((claim) => !claim.holds)
  if (broken.length === 0) {
    console.log('  三项都在：\n')
    for (const claim of claims) console.log(`    · ${claim.text}`)
    console.log('')
  } else {
    console.log(`  ✗ ${broken.length} 项不成立：\n`)
    for (const claim of broken) console.log(`    ${claim.text}`)
    if (misjudged.length > 0) {
      console.log('\n    尺子判错的：')
      for (const one of misjudged) {
        console.log(`      「${one.text}」——${one.why}，可尺子说${one.leaks ? '没漏' : '漏了'}`)
      }
    }
    if (romanLeaks.size > 0) {
      console.log('\n    漏出来的字：')
      for (const [text, where] of romanLeaks) console.log(`      「${text}」　${where}`)
    }
    console.log(
      '\n  内部标识跟玩家读到的字是同一份 string，类型系统分不出来，走查也不会报错——' +
        '\n  玩家是唯一会发现这件事的人。要么把落到认知层那一步补上称呼，' +
        '\n  要么这个值本来就不该上界面。\n',
    )
    process.exitCode = 1
  }
}
