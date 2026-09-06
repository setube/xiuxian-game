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
 * 跑法：bun scripts/verify.ts
 * 失败会以非零码退出，可以直接挂进 CI。
 */
import './lib/seeded'

import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'

import { BEATS, DOINGS } from '../src/content/days'
import { CIRCUMSTANCES } from '../src/content/circumstances'
import { ERRANDS } from '../src/content/errands'
import { HINDSIGHTS } from '../src/content/hindsight'
import { INFORMANTS } from '../src/content/informants'
import { DAMPERS, SPARKS } from '../src/content/leanings'
import { LIVINGS } from '../src/content/living'
import { OPENINGS } from '../src/content/openings'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { CHAPTERS } from '../src/content/life/chapters'
import { stageOf } from '../src/engine/stages'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import type { Chapter, ChapterCall } from '../src/types/chapter'
import type {
  Bond,
  Condition,
  Effect,
  LifeEvent,
  LifeStage,
  Scene,
  SceneLibrary,
} from '../src/types/game'
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
 *
 * 后来多了第四类：**日子**。它跟前三类不一样，
 * 从前根本不需要来源——出身掷出来是什么就是什么。
 * 直到 `character.livings` 让人生半路上能换日子，
 * 「要一种没人给得出来的日子」才第一次成为可能。见 `NEEDS.living`。
 */
console.log('=== 前置条件验收（要的东西有没有人给）===\n')
{
  const neededItems = new Map<string, string[]>()
  const neededFlags = new Map<string, string[]>()
  const neededKnowledge = new Map<string, string[]>()
  const neededLivings = new Map<string, string[]>()
  const madeItems = new Set<string>()
  const madeFlags = new Set<string>()
  const madeKnowledge = new Set<string>()
  const madeLivings = new Set<string>()

  const note = (map: Map<string, string[]>, key: string, where: string): void => {
    const list = map.get(key) ?? []
    list.push(where)
    map.set(key, list)
  }

  /**
   * 一格条件要不要「有人给」，要的话给的是哪一种东西。
   *
   * `null` 是明确的「这一格不需要来源」——年龄、性别、出身、家境
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
   *
   * ## 取值函数自己也可以说「这一次不需要」
   *
   * 返回 `null` 跟表态成 `null` 不是一回事：前者是**逐条**判断。
   * `living` 那一格逼出了它——`{ living: { hasChore: true } }` 问的是
   * 「他手上有没有一件活」，不指名哪一种日子，自然不必有人给；
   * 而 `{ living: { is: 'market' } }` 指了名，那就得有人给得出来。
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
    /**
     * 出身那五格。**从前是一格 `trade`，现在是五格，五格都得各自表态。**
     *
     * 五个 `null` 看着像是把一行拆成了五行废话，其实这正是拆分在门禁侧
     * 留下的痕迹：`satisfies` 那句话逼着每一格单独回答「要不要有人给」，
     * 于是**哪一天某一格开始需要来源，漏的就是那一格**，不会被另外四格
     * 一起藏在一个笼统的 `trade: null` 底下。
     *
     * 眼下五格答的都是「不需要」，而这句话的出处在 `Effect` 那个联合类型里：
     * 没有任何一种效果写得出籍、业、产、家世。削爵那一节改的是
     * `identity` / `living` / `home` 三样——**玉牒上的名字不是旨意随手划掉的**。
     * 真到了要写「一道旨意改籍」那天，改的是这里的 `census` 那一行，
     * 而那时旁边四行会明明白白地提醒改的人：另外四格没跟着变，是不是漏了。
     */
    origin: null,
    census: null,
    livelihood: null,
    business: null,
    station: null,
    /**
     * 「他过的是哪一种日子」**从前不需要有人给，现在需要了**。
     *
     * 从前这一格表态成 `null`，理由写着「它是 `household.living` 算出来的，
     * 世上没有哪一处效果会产出一种日子」。那句话当时是真的，
     * 而它在 `character.livings` 那一层落地的那一天变成了谎话：
     * `royal:fall` 的削爵那一节挂着 `{ type: 'living', living: 'fallen' }`——
     * **世上从此有了只能由效果给出来的日子。**
     *
     * `fallen` 和 `market` 谁也不是生下来就在过的：十一种出身给不出，
     * 三种抚养人也给不出。它们只有一个来源，就是人生半路上那一处效果。
     * 于是「写了个没人给的日子」成了一种新的坏法，跟 `illness-at-home`
     * 那条永远点不着的火种同一个形状——**条件挂在那儿，一辈子不成立，
     * 而没有任何东西会喊。**
     *
     * 只查指名道姓的那一种。`hasChore` 问的是有没有活干，
     * 那是从日子里读出来的一个属性，不是一种日子。
     */
    living: (living) => (living.is === undefined ? null : [neededLivings, living.is]),
    gender: null,
    stage: null,
  } satisfies {
    [K in keyof Condition]-?:
      ((value: NonNullable<Condition[K]>) => [Map<string, string[]>, string] | null) | null
  }

  const scanConditions = (conditions: readonly Condition[] | undefined, where: string): void => {
    for (const condition of conditions ?? []) {
      for (const key of Object.keys(NEEDS) as (keyof Condition)[]) {
        const value = condition[key]
        if (value === undefined) continue
        // 对应关系由上面那句 satisfies 钉死，遍历时 TS 关联不上两个 key，收口成一次 cast
        const of = NEEDS[key] as ((value: unknown) => [Map<string, string[]>, string] | null) | null
        if (!of) continue
        const asked = of(value)
        // 登记了，但这一条问的东西不需要来源（`{ living: { hasChore: true } }` 那种）
        if (!asked) continue
        const [map, id] = asked
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
    /**
     * 半路上换了日子。**这一格是这张表里唯一「凭空造出一种日子」的地方**——
     * 出身和抚养人给的那些不经过效果，它们由 `LIVINGS` 直接 seed 在下面。
     *
     * 所以这一行也是 `NEEDS.living` 那条判据的另一半：
     * 剧本要 `market`，就得有某一处效果写着 `living: 'market'`。
     * 少了这一行，那条判据会把每一种半路上的日子都判成孤儿。
     */
    living: (effect) => [madeLivings, effect.living],
    time: null,
    attribute: null,
    place: null,
    home: null,
    realm: null,
    /**
     * 天年加减不落任何可被 requires 的键——**它连回执都不出**。
     *
     * 这道门禁数的是「谁给谁」的供需（某一格 requires 的东西有没有人产），
     * 而没有任何一条条件读得到天年：面板上没有它，条件系统里也没有它。
     * 这一格表态成 `null` 不是「拼不出名字」，是**它本来就不在这本账上**。
     */
    lifespan: null,
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
    divide: null,
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
   * 一天里那些去处和落点**要**的东西，同样是前置条件。
   *
   * 上面那一行补的是产出，需求那一半漏了很久——而且漏得没有征兆：
   * 一天里的条件全是 `age` / `flag` / `living` 这几格，
   * 而 `age` 不需要来源，`flag` 那两处（`schooled`）恰好有人给。
   * **它是碰巧对的，不是查过了对的。**
   *
   * 逼出这一行的是日子那一格：临时把「割了半晌草」那几段的
   * `{ living: { is: 'farm' } }` 改成一种没人给的日子，门禁一声没吭——
   * 不是判据不对，是它压根没扫到这儿。判据写完得先问一句
   * 「这个机制根本不存在的话，它还会绿吗」，这一行就是那一问问出来的。
   */
  for (const doing of DOINGS) scanConditions(doing.requires, `一天 · 去处 ${doing.id}`)
  for (const beat of BEATS) scanConditions(beat.requires, `一天 · ${beat.doing}:w${beat.weight}`)

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
   * 生下来就在过的那些日子，不需要谁来给。
   *
   * 两个出处，都不经过效果：**十一种出身**各自摊到一种日子上，
   * 和**三种收养境况**里抚养人自己的营生（讨饭的 / 寺中的老僧 /
   * 逃难路上的人）。剩下的（眼下是 `fallen` 和 `market`）
   * 只能由 `type: 'living'` 的效果给，那一半由 `MAKES` 扫出来。
   *
   * 抚养人那一半从 `CIRCUMSTANCES` 里算，不照着 `living.ts` 抄一份键名：
   * 问的是**这个世界上真有这样一个抚养人**，而不是「那张表里写了几行」。
   * 哪天某种收养境况被删了，这里跟着少一种，
   * 于是「专给寺里孩子写的那一卷」会当场变成孤儿——那正是要报的。
   */
  for (const living of Object.values(LIVINGS)) madeLivings.add(living.id)
  for (const one of CIRCUMSTANCES) {
    for (const kin of one.kin) {
      if (kin.living) madeLivings.add(kin.living)
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
    /**
     * 日子有三个出处：出身、抚养人、半路上那一处效果。
     * 前两个在上面 seed 进 `madeLivings`，第三个由 `MAKES.living` 扫。
     *
     * 底下那句扫源码的兜底对这一类无效——引擎里一个日子 id 也没有，
     * 它认识的只有 `chore` 那一格有没有东西。这不要紧：
     * 三个出处已经把「有人给」说全了，兜底本来就是给拼不出名字的那几类留的。
     */
    ['日子', neededLivings, madeLivings],
  ] as const) {
    for (const [key, wheres] of needed) {
      if (made.has(key)) continue
      if (engineSource.includes(`'${key}'`)) continue
      if (PREFIXES.some((prefix) => key.startsWith(prefix) && engineSource.includes(prefix)))
        continue
      orphanNeeds.push(`${kind}〔${key}〕　没有任何地方产出　被要求于：${wheres.join('、')}`)
    }
  }

  const total = neededItems.size + neededFlags.size + neededKnowledge.size + neededLivings.size
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
   *
   * ## 第三次换，是因为一卷被拆成了三节
   *
   * 削藩那一卷（`royal:demote`）为了让同一个人在三节里被叫三个名字，
   * 从一节拆成了三节。三节连在 `next` 上，走到第一节就一定走完——
   * **可这一卷整卷是稀的**（王府出身，还得掷中「倾」），
   * 于是它进出这份名单的时候，跳的不再是 1 个节点，是 3 个。
   *
   * 拆完之后重新跑十批：
   *
   *     50　43　40　60　41　39　48　51　54　38
   *     均值 46.4　标准差 7.4
   *
   * 均值涨的那 2 个正对得上新添的两节；σ 从 3.9 涨到 7.4，
   * 上面那条「稀卷按卷跳」至少解释了其中一部分，剩下的是重新抽样本身的抖动——
   * 十批估 σ 本来就不稳，这一点不必替它编一个更完整的理由。
   *
   * 这一次是先红后量：56 那个上限在拆节之后当场红了一次（61）。
   * **但重新量的十批是拆节落地之后跑的，不是拿 61 那一批倒推的**——
   * 跟第二次换的做法是同一条。
   */
  const UNVISITED_CEILING = 69

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
      note(`${id} 在做什么`, person?.doing)
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
// 第六道：人生的形状——六段日常各占一段，终点只有一个
// ============================================================
/**
 * 这一道是从「占位内容验收」翻过来的，判据整个反了个面。
 *
 * ## 它从前守着什么
 *
 * 上一版有一卷叫 `routine:adult` 的占位内容，谁也走不到，而这一道
 * 守的正是「它还是走不到吗」。走不到并不是它自己的性质，是别处
 * 四个数字凑出来的结论：渡口那一卷从十六岁起权重 1000、窗口封到 99 岁、
 * 没有前置条件，于是年表候选池永远不空，`pickEvent` 永不返回 null，
 * 日常那个入口根本轮不上；而 `lifeFinale` 又指着渡口，演到它就 `finish()`。
 *
 * 那四个数字合起来只说了一句话：**人生在十六岁那年结束**。
 * 这一道当时把它当成现状钉得死死的——**一条判据长得越结实，
 * 越可能是在替一个不该存在的结构做保。**
 *
 * ## 它今天守什么
 *
 * 反过来的事，两件：人生有六段，每一段都有自己的日常；
 * 终点只有一个，而且只有一条路进得去（天年到了，`engine/lifespan.ts`
 * 出生那天掷的那个数）。六条判据一半对着一件。
 *
 *     ① 阶段跟年龄轴一一对得上　　　　　两档撞在一起，夹在中间那档就没人走得到；
 *     　　　　　　　　　　　　　　　　　反过来漏掉一档，活到那一年就没处落脚
 *     ② 一卷日常只归一档　　　　　　　　同一卷挂两个阶段，那是一格换了两个名字
 *     ③ 每一档的日常都在库里　　　　　　挂了个不存在的卷名，要活到那一档才炸
 *     ④ 落幕不在年表里　　　　　　　　　进得了年表就可能被抽中，人会莫名其妙地死
 *     ⑤ 没有别的卷跳得进落幕　　　　　　有一条这样的边，就有了第二种死法
 *     ⑥ 落幕跳转不出卷，且一定问玩家一句
 *
 * 第 ④ 条是直接钉死旧机制的那一条。从前 `lifeFinale` 指着渡口，
 * 而渡口有年表事件——「演到它人生就结束」正是从那里长出来的。
 * 今后谁再把某一卷同时写成年表事件和落幕，这一条当场红。
 *
 * ## 这一道先验自己的尺子
 *
 * 六条判据全绿说明不了什么——**判据不会因为写得长就有效**。所以判词
 * 写成了一个收世界、吐结论的纯函数，先拿七个手工掰坏的世界喂它一遍：
 * 每个只掰一处，红的位置得正好落在那一处上。底样必须全绿，
 * 七个变体各红且只红对应的那一条，尺子才算准。尺子不准的时候，
 * 真世界那六个绿灯一个也不作数——这一道会先报尺子坏了，再谈内容。
 *
 * ## 这一道不数「有没有人真的走到」
 *
 * 那是存在性，静态判不了——上一轮在第五道那里量明白过：
 * 稀到千分之三的卷，跑三百世也有整批缺席。**存在性归模拟**，
 * 由 `scripts/lifelong.ts` 跑完整人生去数每一档真正停了多少样本。
 * 这一道只管结构：**六个格子是不是真的六个，终点是不是真的一个。**
 */
console.log('=== 人生的形状（六段日常各占一段，终点只有一个）===\n')
{
  /**
   * 120 是扫描的上界，不是规矩：天年由 `lifespan.ts` 掷，扫到这儿
   * 只为让最后一档露出头来。
   */
  const AGE_CEILING = 120

  /** 一个世界的形状。这一道要判的东西全在这四格里，别的一概不看 */
  interface Shape {
    routine: Readonly<Record<string, string>>
    scenes: SceneLibrary
    events: readonly LifeEvent[]
    finale: string
  }

  interface Verdict {
    claims: readonly { holds: boolean; text: string }[]
    homeless: readonly string[]
    uncovered: readonly string[]
    shared: readonly (readonly [string, readonly string[]])[]
    unresolved: readonly string[]
    inTimeline: readonly LifeEvent[]
    intoFinale: readonly string[]
    leaks: readonly string[]
    silent: boolean
    reach: ReadonlyMap<string, { from: number; to: number }>
    scenesSeen: number
    nodesSeen: number
    exitsSeen: number
  }

  /**
   * 这一卷有没有可能从头演到尾都不问玩家一句。
   *
   * 从入口起走出边，撞上带 `choices` 的节点这条路就算停下来过。
   * 只要**存在**一条走到头都没停过的路，就算这一卷可能不问——宁可多算，
   * 因为下面那一格要的是「一句都跑不掉」。
   *
   * 落幕必须问那一句。不问的话，玩家读完最后一段正文卷轴自己停了，
   * 人生像是被系统关掉的；问了，合上眼这件事是他自己做的。
   * 删掉 `gone` 那个「闭上眼睛」，这一格当场红。
   */
  const mayNotAsk = (scenes: SceneLibrary, sceneId: string): boolean => {
    const scene = scenes[sceneId]
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
   * 判一个世界的形状。
   *
   * 写成收世界、吐判词的纯函数，是为了下面那半件事：**这把尺子自己得能被验。**
   * 六条判据只有真的会因为内容变坏而变红才算数，而验这件事的唯一办法
   * 是手工掰坏几个世界喂进来，看它红在该红的那一条上。
   */
  const judge = (world: Shape): Verdict => {
    /**
     * 年龄轴上每一档各占哪一段。问的是 `stageOf` 本人，不抄 `stages.ts` 的分档表——
     * 抄一遍的话，改了分档而忘了改这里，两边一起错，判据照样绿。
     */
    const reach = new Map<string, { from: number; to: number }>()
    for (let age = 0; age <= AGE_CEILING; age += 1) {
      const stage = stageOf(age)
      const seen = reach.get(stage)
      reach.set(stage, { from: seen?.from ?? age, to: age })
    }

    const stages = Object.keys(world.routine)
    /** 声明了这一档，年龄轴上却一岁也占不到——它那卷日常就是死内容 */
    const homeless = stages.filter((stage) => !reach.has(stage))
    /** 反过来：活人会走到这一档，而它没有日常可回。到了那一年就没处落脚 */
    const uncovered = [...reach.keys()].filter((stage) => !(stage in world.routine))

    /** 一卷挂了几档。挂两档就是两格并成了一格，而目录上还写着两格 */
    const owners = new Map<string, string[]>()
    for (const [stage, sceneId] of Object.entries(world.routine)) {
      owners.set(sceneId, [...(owners.get(sceneId) ?? []), stage])
    }
    const shared = [...owners.entries()].filter(([, held]) => held.length > 1)
    const unresolved = [...owners.keys()].filter((sceneId) => !world.scenes[sceneId])

    /** 年表里指着落幕的事件。一件都不该有——这一条钉的就是旧机制 */
    const inTimeline = world.events.filter((event) => event.scene.split('#')[0] === world.finale)

    /**
     * 全库扫一遍出边，一趟分出两种坏事：
     *
     *     别的卷跳进落幕　　那是第二种死法，而人生只该有一种
     *     落幕跳出卷外　　　演到它也不一定收得了尾
     */
    const intoFinale: string[] = []
    const leaks: string[] = []
    let scenesSeen = 0
    let nodesSeen = 0
    let exitsSeen = 0
    for (const [sceneId, scene] of Object.entries(world.scenes)) {
      scenesSeen += 1
      for (const [nodeId, node] of Object.entries(scene.nodes)) {
        nodesSeen += 1
        for (const exit of exitsOf(node)) {
          exitsSeen += 1
          const [head, tail] = exit.to.split('#')
          const stays = tail ? head === sceneId : Boolean(head && scene.nodes[head])
          if (sceneId === world.finale) {
            if (!stays) leaks.push(`${sceneId}#${nodeId} → ${exit.to}`)
          } else if (!stays && head === world.finale) {
            intoFinale.push(`${sceneId}#${nodeId} → ${exit.to}`)
          }
        }
      }
    }

    const silent = mayNotAsk(world.scenes, world.finale)

    return {
      claims: [
        {
          holds: homeless.length === 0 && uncovered.length === 0,
          text: `${stages.length} 个人生阶段跟年龄轴一一对得上，各占一段`,
        },
        {
          holds: shared.length === 0,
          text: `${owners.size} 卷日常对着 ${stages.length} 个阶段，一卷只归一档`,
        },
        {
          holds: unresolved.length === 0,
          text: '每一档的日常都在库里解析得到',
        },
        {
          holds: inTimeline.length === 0,
          text: `年表里没有一件事指着落幕（${world.finale}）`,
        },
        {
          holds: intoFinale.length === 0,
          text: `扫过 ${exitsSeen} 条出边，没有别的卷跳得进落幕`,
        },
        {
          holds: leaks.length === 0 && !silent,
          text: '落幕的跳转都留在卷内，而且一定会问玩家一句',
        },
      ],
      homeless,
      uncovered,
      shared,
      unresolved,
      inTimeline,
      intoFinale,
      leaks,
      silent,
      reach,
      scenesSeen,
      nodesSeen,
      exitsSeen,
    }
  }

  // ----------------------------------------------------------
  // 先验尺子：手工掰坏的世界，红得对不对
  // ----------------------------------------------------------
  /**
   * 底样是一个干干净净的小世界：真库加一卷手搭的落幕。
   *
   * 用手搭的落幕而不是真的那一卷，是为了让掰坏这件事完全可控——
   * 底样必须全绿，六个变体各只掰一处，红的位置才说明得了问题。
   */
  const PROBE_FINALE = 'probe:finale'
  const PROBE_JUMP = 'probe:jump'
  const probeFinale: Scene = {
    id: PROBE_FINALE,
    title: '试',
    entry: 'open',
    nodes: {
      open: { id: 'open', blocks: [], choices: [{ id: 'close', label: '完', next: null }] },
    },
  }
  const baseline: Shape = {
    routine: lifeRoutine,
    scenes: { ...lifeScenes, [PROBE_FINALE]: probeFinale },
    events: lifeEvents,
    finale: PROBE_FINALE,
  }

  /** 每一条：掰哪儿、该红第几条（从 1 数）。掰一处只该红一条 */
  const probes: readonly { hurt: number; what: string; world: Shape }[] = [
    {
      hurt: 1,
      what: '多一个年龄轴上根本不存在的阶段',
      world: { ...baseline, routine: { ...lifeRoutine, 虚设: PROBE_FINALE } },
    },
    {
      hurt: 2,
      what: '两个阶段挂同一卷日常',
      world: { ...baseline, routine: { ...lifeRoutine, 老年: lifeRoutine.壮年 } },
    },
    {
      hurt: 3,
      what: '某一档的日常在库里不存在',
      world: { ...baseline, routine: { ...lifeRoutine, 老年: 'routine:nowhere' } },
    },
    {
      hurt: 4,
      what: '年表里加一件指着落幕的事件（这就是十六岁那条老路）',
      world: {
        ...baseline,
        events: [...lifeEvents, { id: 'probe', window: { from: 0, to: 99 }, scene: PROBE_FINALE }],
      },
    },
    {
      hurt: 5,
      what: '别的卷开一条边跳进落幕',
      world: {
        ...baseline,
        scenes: {
          ...baseline.scenes,
          [PROBE_JUMP]: {
            id: PROBE_JUMP,
            title: '试',
            entry: 'open',
            nodes: { open: { id: 'open', blocks: [], next: PROBE_FINALE } },
          },
        },
      },
    },
    {
      hurt: 6,
      what: '落幕的跳转跑出卷外',
      world: {
        ...baseline,
        scenes: {
          ...baseline.scenes,
          [PROBE_FINALE]: {
            ...probeFinale,
            nodes: { open: { ...probeFinale.nodes.open!, next: 'somewhere-else' } },
          },
        },
      },
    },
    {
      hurt: 6,
      what: '落幕一句也不问玩家',
      world: {
        ...baseline,
        scenes: {
          ...baseline.scenes,
          [PROBE_FINALE]: {
            ...probeFinale,
            nodes: { open: { ...probeFinale.nodes.open!, choices: [] } },
          },
        },
      },
    },
  ]

  const clean = judge(baseline).claims.filter((claim) => !claim.holds)
  const misread: string[] = []
  if (clean.length > 0) {
    misread.push(`底样本该全绿，却红了 ${clean.length} 条：${clean.map((c) => c.text).join('；')}`)
  }
  for (const probe of probes) {
    const red = judge(probe.world)
      .claims.map((claim, index) => (claim.holds ? 0 : index + 1))
      .filter((index) => index > 0)
    if (red.length !== 1 || red[0] !== probe.hurt) {
      misread.push(
        `「${probe.what}」该只红第 ${probe.hurt} 条，实际红了 ${red.length === 0 ? '零条' : `第 ${red.join('、')} 条`}`,
      )
    }
  }

  // ----------------------------------------------------------
  // 再判真世界
  // ----------------------------------------------------------
  const real = judge({
    routine: lifeRoutine,
    scenes: lifeScenes,
    events: lifeEvents,
    finale: lifeFinale,
  })
  const stages = Object.keys(lifeRoutine)
  const broken = real.claims.filter((claim) => !claim.holds)

  if (broken.length === 0 && misread.length === 0) {
    console.log(
      `  尺子自己判得出对错——${probes.length} 个手工掰坏的世界，红的都红在该红的那一条上。\n`,
    )
    console.log('  真世界这六条都成立：\n')
    for (const claim of real.claims) console.log(`    · ${claim.text}`)
    console.log('\n  各档占的年龄段和它那一卷日常：\n')
    for (const stage of stages) {
      const at = real.reach.get(stage)
      const range = !at
        ? '——'
        : at.to === AGE_CEILING
          ? `${at.from} 岁往后`
          : `${at.from}–${at.to} 岁`
      console.log(`    ${stage}　${range.padEnd(12)}${lifeRoutine[stage as LifeStage]}`)
    }
    console.log(
      `\n  覆盖率：${real.scenesSeen} 卷 / ${real.nodesSeen} 节 / ${real.exitsSeen} 条出边 / ` +
        `${lifeEvents.length} 件年表事件，年龄轴扫到 ${AGE_CEILING} 岁。\n` +
        '  这一道只判结构。每一档真的有没有人停在那儿，归 scripts/lifelong.ts。\n',
    )
  } else {
    if (misread.length > 0) {
      console.log(`  ✗ 尺子自己就不准，${misread.length} 处：\n`)
      for (const line of misread) console.log(`    ${line}`)
      console.log('\n    先修尺子。尺子不准的时候，下面那些绿灯一个也不作数。\n')
      process.exitCode = 1
    }
    if (broken.length > 0) {
      console.log(`  ✗ ${broken.length} 条不成立：\n`)
      for (const claim of broken) console.log(`    ${claim.text}`)
      if (real.homeless.length > 0) {
        console.log('\n    年龄轴上一岁也占不到的阶段（它那一卷日常成了死内容）：')
        for (const stage of real.homeless) {
          console.log(`      ${stage} → ${lifeRoutine[stage as LifeStage]}`)
        }
      }
      if (real.uncovered.length > 0) {
        console.log('\n    活人走得到、却没有日常可回的阶段：')
        for (const stage of real.uncovered) console.log(`      ${stage}`)
      }
      if (real.shared.length > 0) {
        console.log('\n    一卷挂了好几档（目录上写着几格，实际是一格）：')
        for (const [sceneId, held] of real.shared) {
          console.log(`      ${sceneId} ← ${held.join('、')}`)
        }
      }
      if (real.unresolved.length > 0) {
        console.log('\n    库里找不到的日常：')
        for (const sceneId of real.unresolved) console.log(`      ${sceneId}`)
      }
      if (real.inTimeline.length > 0) {
        console.log('\n    年表里指着落幕的事件（这是「十六岁没修上仙就结束」那条老路）：')
        for (const event of real.inTimeline) {
          console.log(
            `      ${event.id} → ${event.scene}　窗口 ${event.window.from}–${event.window.to}`,
          )
        }
      }
      if (real.intoFinale.length > 0) {
        console.log('\n    别的卷跳进落幕的边：')
        for (const edge of real.intoFinale) console.log(`      ${edge}`)
      }
      if (real.leaks.length > 0) {
        console.log('\n    落幕跳出卷外的边：')
        for (const leak of real.leaks) console.log(`      ${leak}`)
      }
      if (real.silent) {
        console.log('\n    落幕有一条路从头演到尾不问玩家一句——合上眼那一下得是他自己按的。')
      }
      console.log(
        '\n  人生的终点只该有一个，而且只有天年到了才走得到它。\n' +
          '  上面每一条破掉，都是在往人生里加一个别的出口，或者把某一段日子悄悄抹掉。\n',
      )
      process.exitCode = 1
    }
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
