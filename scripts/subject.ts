/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 事件的另一半：入场点了名的人，世界有没有往他身上落过一笔。
 *
 * **这一支只报数，不判成败**（跟 `royal`/`settle`/`perceive`/`shadow` 同一类）。
 * 它产的是候选，而「这个人到底是不是这件事的主体」要人去判——
 * 判完往底下 `CALLED` 里登记一条。
 *
 * ## 由来：配偶那一册四次查下来，形状完全一样
 *
 * ```
 * 性情    引擎给了她，零处内容读                → 补了
 * 过门    别人有那一天，她没有                  → 补了
 * 那条边  立了没人读                            → 补了
 * 添丁    事发生在她身上，效果全落在孩子和编年   → 机制缺口
 * ```
 *
 * 四次都不是「缺一个字段」，是**「这件事的【他那一半】没人写」**。
 * 而四次都靠人顺手看见——**第五次未必有人顺手看那一眼**，所以钉成一支走查。
 *
 * ## ⚠️ 它必然误报，而那是设计如此
 *
 * 「入场点了名」不等于「这件事发生在他身上」。判完 83 条之后是七种角色，
 * **只有最后一种要承接**（前六种的处置一样：都不该往他身上落）：
 *
 * ```
 * 背景      要有个哥才有嫂子、才有分家   ← 卷讲的不是哥
 * 记录者    编年落在玩家名下             ← 这是玩家视角的游戏，本来就该这样
 * 执行者    产婆                        ← 她连 id 都没有，压根不在册
 * 关系双方  tie 的两头
 * 岔口      有他，这件事【走这一支】       ← 判 55 条 branches 时冒出来的
 * 约束      有他，这件事【走不成】         ← 可行性边界（不是他主动阻拦）
 * 【真正经历者】                        ← 只有这一格该问「世界记下了吗」
 * ```
 *
 * **而静态判不出最后一格**。跟 GPT 过这一轮时定的口径：
 *
 * > `bond:兄` 出现在条件里 ≠ 哥是事件主体。
 * > 只有事件语义明确把他作为「经历／承受／状态发生」的对象，才算主体。
 * > **不要为了让候选变少就把背景人物一律白名单消掉**——
 * > 保留候选，在语义层判角色。
 *
 * 所以这一支不判成败：它把候选摆出来，人判完登记，登记里要写清**为什么**。
 *
 * ## 两边都从运行时取，不猜
 *
 * ```
 * PEOPLE      跑 120 世收 roster 的 id   → 「这个 id 是不是一个人」
 * BOND_TO_ID  从 relations 解「兄→brother」 → 「条件点的这个关系，落在谁身上」
 * ```
 *
 * ⚠️ 头一版没有这两张表，82 条候选里大半是尺子自己的毛病：
 * `old-home` 是【户】的 id、`banditry` 是【世道大事】的 id、
 * 而 `bond:兄` 二十条是因为条件问「兄」、效果落 `brother`，我没做映射。
 * 接上人口册之后 82 → 28。
 *
 * ## ⚠️ 这一支的射程只有 37.5%，读这张图之前先知道这件事
 *
 * 它只扫 `lifeEvents` 的 `requires`。而全库 `{ bond: { kind: '配偶' } }` 有 **16 处**，
 * 它只看得见 **6 处**——另外 10 处在**节点分流、日常、落幕**里：
 *
 * ```
 * ending     next: 'spouse'      临终那一节，她在床边     ← 分流
 * going-up   next: 'wife-only'   走不走得了，因为有她     ← 她是【约束】
 * playmate   next: 'both'        分流
 * routine    「家里如今有两个人吃饭」                     ← 处境的一部分
 * ```
 *
 * **那十处全是「因为有她，所以这件事走这一支」——一处也不是主体。**
 *
 * 所以底下那张覆盖地图的数**全是偏的**，而偏的方向是**低估分母**：
 * 真实的「进来过多少次」比图上的大，而「其中几次是主体」几乎没变。
 *
 * 这反过来把三颗真候选说得更准：**内容层几乎从不让配偶成为事件主体**，
 * 而 `bearing-await` / `child-sibling` / `wife-that-winter` 恰好是
 * **三次难得让女人当主体，而三次都发现没有地方可以落**。
 *
 * 扩射程（从事件入场扩到节点分流）是下一轮的事。
 * ⚠️ 而 `branches` 里的条件语义跟 `requires` 不同——那是「走哪一支」，
 * 不是「这一卷开不开」，直接合起来数会把两种东西压成一种。
 *
 * ## 28 条判完之后的总账（2026-09-13）
 *
 * ```
 * 背景            10 条   要有个哥才有嫂子、父亲活着才有这门生意、娘活着才有这个家
 * 主体事实由别处落   2 条   入场就是 alive: false——他殁了是前提，不是这一卷该落的
 * 落了而尺子对不上   3 条   角色记号（elder）× 1、旗标 × 1、其余
 * 关系双方          2 条   重逢、上山同行——没有单方面的承载者
 * 观察者            2 条   玩家看她做事、玩家看父亲做事
 * 执行者            1 条   来敲门报信的邻居，跟产婆同一格
 * ⚠️ 真候选         3 条
 * ```
 *
 * ## ⚠️ 三颗真候选是同一个形状，而那才是这一支查出来的东西
 *
 * ```
 * bearing-await     妻子生    落在 son/daughter 和编年上
 * child-sibling     娘生      落在新弟妹和这一户上
 * wife-that-winter  娘病      落在配偶的照料上
 * ```
 *
 * **三颗都是「生育／病痛发生在一个女人身上，而世界记的是别人」。**
 *
 * 配偶那一册查出来的不是配偶的问题，**是这一类事实的出口一直没有**。
 * 而三颗卡在同一处：要落 `health` 得先定义「生育存在母体身体风险」这条
 * 世界规则，而史料支撑得起「母体死亡风险显著」，支撑不起「幸存后的长期
 * 身体损伤」。`alive=false` 和 `health↓` 是两个世界事实，证据要分别对应。
 * 口径和状态在 `design/the-wife.md` 第八、九节。
 *
 * ## ⚠️ 判准：不是「有没有状态写入」
 *
 * 跟 GPT 定的（审 debt 那条链时定下来的）：
 *
 * ```
 * ✗ 是否存在状态写入？
 * ✓ 【结果事实是否存在与其语义【相称】的承接？】
 * ```
 *
 * 后者比「主体身上有东西」强得多，**而且不会把离散状态误判成缺少程度值**。
 * `debt` 那条链一次给了四种承接型：
 *
 * ```
 * 程度型          health 42 —— 他还活着，而此后每年更可能走
 * 状态型          fate 殁
 * 状态 + 标记型   fate 杳 + flag father-missing
 * 状态 + 认知型   编年「父亲再也没有消息了」
 * ```
 *
 * **所以不能拿「可量化的 health」当模板**——一个完整的承接可以终止于
 * `fate`、`doing`、关系、`flag` 或编年。口径在 `design/subject-facts.md`。
 *
 * ## 尺子的三个盲点，都写在 `CALLED` 里对应那条上
 *
 * ```
 * 只看同一卷      主体事实由别的生产者落下的，它报成缺席
 * 对不上角色记号   条件问 bond:抚养，效果落 id: elder
 * 只数四种效果    flag 和 knowledge 同样是「这个人身上留下了什么」的出口
 * ```
 *
 * 三个都没靠白名单遮——**盲点写下来，比把它消掉更要紧**。
 *
 * 跑法：bun scripts/subject.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useNarrativeStore } from '../src/stores/narrative'
import { useCharacterStore } from '../src/stores/character'
import { usePeopleStore } from '../src/stores/people'

/**
 * 判过的候选，和判成了什么。
 *
 * ⚠️ **这不是白名单，是「判过了，这么判的」的登记。**
 * 每一条要写清：这件事真正经历者是谁、他身上有没有东西、这个人是什么角色。
 * 写不出来就别登记——那说明还没判完。
 */
const CALLED: readonly { key: string; role: string; why: string }[] = [
  {
    key: 'bond:兄',
    role: '背景',
    why: [
      '「要有个哥」是很多卷的结构前提：有哥才有嫂子、才有分家、才有那笔债。',
      '  · kindred-quarrel / kindred-mend  讲的是娘跟嫂子，哥是第三人',
      '  · away-i-repay                    债的另一头是哥，而经历那件事的是玩家',
      '  真正经历者身上【有】东西（kindred-mend 落 brother-wife → mother 的 tie）',
    ].join('\n'),
  },
  {
    key: 'wife-her-own-way',
    role: '观察者',
    why: [
      '认知卷：玩家看见她做一件没教过的事，写完就停。',
      '  它改变的是玩家对这个人的理解，不是世界状态——落任何东西都是错的。',
    ].join('\n'),
  },
  {
    key: 'reunion-homecoming',
    role: '关系双方',
    why: [
      '「回来了」——玩家从镇上回家，那个把他带大的人认出他，说了句「瘦了」。',
      '  抚养的人不是「经历了一件事」，他是这件事的另一头：',
      '  这一卷写的是【重逢】，而重逢本来就没有单方面的承载者。',
    ].join('\n'),
  },
  {
    key: 'reunion-emptied',
    role: '主体事实由【别处】落的',
    why: [
      '「你从镇上赶回来，没赶上。」入场条件是 { bond: 抚养, alive: false }',
      '  ——他殁了这件事是这一卷的【前提】，不是这一卷该落的东西。',
      '',
      '  ⚠️ 而这一条照出这把尺子的一个盲点：它只看【同一卷】里的效果。',
      '  主体事实由别的生产者落下的，它分不出来，会报成缺席。',
      '  没有一般解法（跨卷追因要读语义），所以逐条登记。',
    ].join('\n'),
  },
  {
    key: 'need-illness',
    role: '落了，而尺子对不上',
    why: [
      '这一卷落的正是 { type: person, id: elder, fate: 殁 } + undertake who: elder。',
      '  而它用的是【角色记号 elder】，条件问的是 bond:抚养——',
      '  尺子拿「抚养」去比「elder」，对不上。',
      '',
      '  ⚠️ 这是误报，而病根在尺子：角色记号（elder/dam/child/playmate）',
      '  跟关系种类是两套名字，静态解不开（`{elder}` 落到谁由关系网现算）。',
      '  真要消它得把角色记号也接进 BOND_TO_ID，而那是运行时的事。',
    ].join('\n'),
  },
  {
    key: 'house-divide',
    role: '背景',
    why: [
      '分家：成了家的儿子分出去。入场是 { house: { head: 兄 } } + { bond: 配偶, alive }',
      '  ——「成了家」是分得出去的【前提】，而这一卷讲的是户怎么分，',
      '  真正经历者是这一户和玩家自己。配偶不是这件事的承受者。',
    ].join('\n'),
  },
  {
    key: 'bearing-await',
    role: '⚠️ 真候选（已立案，卡在依据上）',
    why: [
      '添丁：等着的那几年。入场要 { bond: 配偶, alive }，而效果落在',
      '  son / daughter 和编年上——【spouse 身上零笔】。三次掷也没有一次掷她',
      '  （怀上没有 / 孩子活不活 / 男女）。',
      '',
      '  ⚠️ 这一条跟 wife-that-winter 卡在同一处：要落 health 就得先定义',
      '  「生育存在母体身体风险」这条世界规则，而史料支撑得起',
      '  「农村家庭分娩的母体死亡风险显著」，支撑不起「有 X% 的幸存妇女',
      '  留下足以缩短余寿的长期身体损害」。',
      '  **alive=false 和 health↓ 是两个不同的世界事实，证据要分别对应。**',
      '  口径和状态在 design/the-wife.md 第八、九节。',
    ].join('\n'),
  },
  {
    key: 'debt-drought',
    role: '背景',
    why: [
      '「天时」——这一年雨水不足，入夏之后地就旱了。',
      '  { family: { id: father, alive: true } } 点的是「这一户还是他当家」，',
      '  而这一卷的主体是【这一年的天】和这一户。父亲不是承受者。',
    ].join('\n'),
  },
  {
    key: 'debt-fields',
    role: '主体事实由【别处】落的',
    why: [
      '入场是 { family: { id: father, alive: false } }——跟 reunion-emptied 同一种：',
      '  他殁了是这一卷的前提，不是这一卷该落的东西。',
    ].join('\n'),
  },
  {
    key: 'finding-root',
    role: '关系双方',
    why: [
      '「石头缝里」——跟着长辈上山，走到半坡歇脚，看见一株叶子厚的草。',
      '  父亲是同行的那个人，而这一卷的主体是【玩家看见了什么】。',
      '  入场用的是 present: true（他得在跟前），那正是「同行」的写法。',
    ].join('\n'),
  },
  {
    key: 'trade-road',
    role: '背景',
    why: [
      '「不走的道」——那一趟走了两个月，货没丢，人丢了。',
      '  父亲活着是这一户还做这行的前提；丢的那个人不在人口册上。',
      '  效果只落 time / household / attribute，全在玩家身上。',
    ].join('\n'),
  },
  {
    key: 'trade-archive',
    role: '观察者',
    why: [
      '「不记档的案子」——那阵子父亲天天很晚才回来，你起夜看见书房还亮着灯。',
      '  父亲在做事，而这一卷改变的是【玩家的见识】（insight +6、fortune -2）。',
      '',
      '  ⚠️ 这一条我判得不如别的有把握：父亲确实在做一件有风险的事，',
      '  而这一卷只写了玩家看见的那一面。它跟 wife:her-own-way 同形状',
      '  ——**而那一卷我判的是「落任何东西都是错的」**。这儿未必。',
      '  留着这行字，等哪天有人要给父亲写一卷时回来重判。',
    ].join('\n'),
  },
  {
    key: 'child-sibling',
    role: '⚠️ 真候选（第三颗，而它证明这不是配偶一个人的事）',
    why: [
      '「添丁」——家里添了个孩子。落的是 family（新弟妹）、household、chronicle，',
      '  而【生这个孩子的娘身上一笔也没有】。',
      '',
      '  ⚠️ 这一条最要紧的地方不是它本身，是它跟另外两颗同形状：',
      '    bearing-await      妻子生，落在 son/daughter 和编年上',
      '    wife-that-winter   娘病，落在配偶的照料上',
      '    child-sibling      娘生，落在新弟妹和这一户上',
      '  **三颗都是「生育／病痛发生在一个女人身上，而世界记的是别人」。**',
      '  配偶那一册查出来的不是配偶的问题，是这一类事实的出口一直没有。',
      '',
      '  卡在同一处：要落 health 得先定义「生育存在母体身体风险」这条世界规则。',
      '  口径和状态在 design/the-wife.md 第八、九节。',
    ].join('\n'),
  },
  {
    key: 'child-hungry',
    role: '背景',
    why: [
      '「灶」——家里吃不上饭那几天。娘活着是这一户还有人在过日子的前提，',
      '  而这一卷的主体是这一户的境况和玩家。',
    ].join('\n'),
  },
  {
    key: 'school-strength',
    role: '背景',
    why: ['「力气」——写的是玩家自己。娘是家里还有人的前提，不是承受者。'].join('\n'),
  },
  {
    key: 'debt-quit',
    role: '背景',
    why: ['「不读了」——写的是玩家的书念不下去。娘是家里还有人的前提。'].join('\n'),
  },
  {
    key: 'debt-borrow',
    role: '背景',
    why: [
      '「借」——那笔债。父亲活着是「谁去借」的前提，',
      '  而债记在这一户头上（`household`），不是记在他身上。',
    ].join('\n'),
  },
  {
    key: 'mountain-asked-home',
    role: '落了，而尺子对不上（第二种：走的是旗标）',
    why: [
      '「夜里」——熄了灯，{call:spouse}忽然问你「镇西那边到底是个什么去处」。',
      '  这一卷落的是 `flag: told-spouse-about-…`——**那正是落在她身上的事实**',
      '  （她知不知道这件事），只是走的是旗标不是人物效果。',
      '',
      '  ⚠️ 尺子的第三个盲点：它只数 person / meet / tie / undertake，',
      '  **而旗标和认知（knowledge）同样是「这个人身上留下了什么」的出口**。',
      '  没顺手把 flag 加进去，是因为旗标绝大多数记的是玩家自己的事',
      '  （`schooled`、`drought`、`father-away`），加进来会把误报推回去一大截。',
      '  真要消它得判「这面旗说的是谁」，而那要读旗名——又回到语义层。',
    ].join('\n'),
  },
  {
    key: 'unrest-word',
    role: '执行者',
    why: [
      '「夜里那趟」——腊月里的一夜有人敲门，是隔壁那户的人，',
      '  他没进屋，站在门口，手揣在袖子里，来报个信。',
      '',
      '  他是来送这个消息的人，**不是这件事的承受者**',
      '  ——跟产婆同一格（GPT 那五档里的「执行者」）。',
      '  而这一卷落的 roll 和 time 都是关于那趟夜路和玩家的。',
    ].join('\n'),
  },
  {
    key: 'wife-that-winter',
    role: '⚠️ 真候选（第一颗真阳性，2026-09-13）',
    why: [
      '娘病了半个月，她在跟前照应。点了配偶、生母、mother 三个人，一笔也没落。',
      '  **真正经历者是娘**，而世界上一笔也没记——跟 bearing 一模一样的形状。',
      '  写它的时候我想的是「关系不决定她做不做，只决定质地」，',
      '  而那一条只管住了【她】那一侧，娘那一侧压根没想。',
      '',
      '  ⚠️ 暂不修世界机制：给娘落 health 要先有「病一场之后身子骨怎么样」的依据，',
      '  而那跟生育风险那条卡在同一处（见 design/the-wife.md 第八、九节）。',
      '  **不为了过门禁制造 health 损失。**',
    ].join('\n'),
  },
]

/** 条件里点到了谁。`bond:X` 是关系种类，别的是人的 id */
function namedInRequires(node: unknown): Set<string> {
  const out = new Set<string>()
  const walk = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(walk)
    if (one === null || typeof one !== 'object') return
    const rec = one as Record<string, unknown>
    if (typeof rec.kind === 'string') out.add(`bond:${rec.kind}`)
    if (typeof rec.id === 'string') out.add(rec.id)
    if (typeof rec.with === 'string') out.add(`bond:${rec.with}`)
    if (typeof rec.from === 'string') out.add(rec.from)
    if (typeof rec.to === 'string') out.add(rec.to)
    Object.values(rec).forEach(walk)
  }
  walk(node)
  return out
}

/** 这一卷的效果往谁身上落过 */
function touchedByScene(sceneId: string): Set<string> {
  const out = new Set<string>()
  const scene = lifeScenes[sceneId]
  if (!scene) return out
  const walk = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(walk)
    if (one === null || typeof one !== 'object') return
    const rec = one as Record<string, unknown>
    if (['person', 'meet', 'tie', 'undertake'].includes(String(rec.type))) {
      for (const key of ['id', 'who', 'from', 'to']) {
        const v = rec[key]
        if (typeof v === 'string') out.add(v)
      }
    }
    Object.values(rec).forEach(walk)
  }
  for (const node of Object.values(scene.nodes)) walk(node)
  return out
}

const PEOPLE = new Set<string>()
const BOND_TO_ID = new Map<string, Set<string>>()
for (let i = 0; i < 120; i += 1) {
  setActivePinia(createPinia())
  useCharacterStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  // ⚠️ 必须把人生【演完】再收名册，不能只 createPinia 就读。
  // 头一版只读出生那一刻的 roster，收到 24 个人——而嫂子、侄儿、儿子、配偶
  // 这些【人生中途才立起来的人一个都不在里头】。
  // 于是三栏都在拿一张残缺的名单当「这是不是一个人」的判据，
  // 而被滤掉的恰恰是这一族最关心的那些人（B 链的分流承受者就是嫂子）。
  const story = useStory(lifeScenes, { events: lifeEvents, routine: lifeRoutine, finale: lifeFinale })
  story.begin()
  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((option) => !option.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
  for (const one of Object.values(people.roster)) PEOPLE.add(one.id)
  for (const rel of people.relations) {
    if (!BOND_TO_ID.has(rel.bond)) BOND_TO_ID.set(rel.bond, new Set())
    BOND_TO_ID.get(rel.bond)!.add(rel.to)
  }
}

const rows: { event: string; who: string }[] = []
/**
 * 覆盖地图：**每个人被点名几次，其中几次世界往他身上落了东西。**
 *
 * ⚠️ 这一张不是「一个人身上有多少种事实」——那个数会长成
 * 「中位 2、P90 4、最多 7」这种漂亮而**没有作者**的东西，
 * 而下一步自然就会问「那是不是至少 2 种」，又拍出一个阈值。
 *
 * 跟 GPT 定的口径：
 *
 * > 量的是「**一个人作为主体经历了多少事，其中多少事留下了属于这个主体的事实**」。
 * > 这样三颗真候选就是这张地图上的三个红点，而不是三个样本拿来拍一个阈值。
 *
 * **它不需要门槛**：比值本身就是那句话，读的人看得见 0/6 和 5/6 的差别。
 */
const covered = new Map<string, { named: number; landed: number }>()
const bump = (who: string, landed: boolean): void => {
  const one = covered.get(who) ?? { named: 0, landed: 0 }
  one.named += 1
  if (landed) one.landed += 1
  covered.set(who, one)
}
for (const event of lifeEvents) {
  const named = namedInRequires(event.requires ?? [])
  if (named.size === 0) continue
  const touched = touchedByScene(event.scene)
  for (const who of named) {
    if (who.startsWith('bond:')) {
      const ids = BOND_TO_ID.get(who.slice(5))
      // 这一百二十世里没出现过的关系种类，解不出 id——别当成缺席
      if (!ids || ids.size === 0) continue
      const landed = [...ids].some((id) => touched.has(id))
      bump(who, landed)
      if (landed) continue
      rows.push({ event: event.id, who })
      continue
    }
    if (!PEOPLE.has(who)) continue
    const landed = touched.has(who)
    bump(who, landed)
    if (landed) continue
    rows.push({ event: event.id, who })
  }
}

/**
 * 第二种射程：`branches` 里点了名的人。
 *
 * ⚠️ **跟 `requires` 分开统计，两栏不合并。** 它们连「点名」的含义都不同：
 *
 * ```
 * requires   点到的人是「这件事成不成立」的条件
 * branches   点到的人常常【就是分流依据本身】——有他就走这一支
 * ```
 *
 * 所以角色里多一档 **「岔口」**：跟「背景」一样不该落东西，**而理由不同**。
 * 背景说的是「这件事需要他存在」，岔口说的是「**他的存在改变了这件事的样子**」
 * ——后者其实更接近「他在这个世界里有分量」，跟背景混成一档会读丢那一层。
 *
 * ## ⚠️ 而这一档有个真实的风险，防线写在这儿
 *
 * `branches` 里的点名**几乎全部**都是分流依据（那是 `branches` 的定义），
 * 所以「岔口」会一口气吞掉这一栏的绝大多数候选。跟 GPT 定的防线：
 *
 * > **角色分类用于解释候选，不用于预先淘汰候选**；
 * > 只有完成角色判定后，才能决定它是否进入主体缺口统计。
 *
 * 就是说：这一栏 95% 判成岔口也行，**但必须是逐条看过之后**，
 * 不能事先写一条「`branches` 里的都不算」。所以这一栏是【一族一族判下来】的，
 * 而那个数摆在明处——**自动那半永远完整，人工那半永远显式暴露缺口**。
 *
 * ## ⚠️ 候选的身份由「来源位置 + 具体条件实例」共同决定
 *
 * 跟 GPT 定的：**不由它最终指向的那个人决定**。所以
 *
 * ```
 * requires + father    这一卷开不开
 * branches + father    走哪一支
 * ```
 *
 * 是**两条不同的候选**，哪怕解析到同一个人。
 *
 * ⚠️ 而底层候选**绝不按「卷 × 人」归并**——同一卷里同一个人，
 * 可能在一支是岔口、在另一支是主体。归并就把那一维压没了，
 * 然后就得再发明一套「部分覆盖」的状态来补。
 *
 * > **统计单位可以聚合，审计单位不能在聚合时丢失能改变判定的维度。**
 *
 * 展示层可以加「卷 × 人」的汇总视图，但那是 summary，不是审计单位。
 *
 * 而这一栏本身也值得读：要是判完发现「岔口 80 / 主体 20」，
 * 那就得查**为什么有这么多分流条件其实在描述人物自身的经历**。
 */

/**
 * 第二栏（`branches`）判过的候选。
 *
 * ⚠️ **键跟第一栏分开**——按 GPT 定的：候选的身份由「来源位置 + 具体条件实例」
 * 共同决定，`requires + father` 和 `branches + father` 是两条不同的候选，
 * 哪怕解析到同一个人。所以这儿的键前面加 `branch:`。
 *
 * ⚠️ 而**不按「卷 × 人」归并**：同一卷里同一个人可能在一支是岔口、
 * 在另一支是主体。这儿共用一条登记的，是**结论确实同一个**的那些
 * （十三卷出身的 `open → kept` 是同一件事的十三种家境版本）。
 */
const BRANCH_CALLED: readonly { key: string; role: string; why: string }[] = [
  {
    key: 'branch:brother',
    role: '关系双方',
    why: [
      '十一条分布在 kindred:newyear / nephew-grown / nephew-weds / repay / mourning、',
      '  nephew:goes（侄儿想去镇上，爹准不准）、away:i-repay。',
      '  nephew:goes 的 blessed / allowed 那几支【落的正是 tie】（nephew → brother）',
      '  ——哥是那条边的一头，不是单方面的承受者。',
    ].join('\n'),
  },
  {
    key: 'branch:bond:生母',
    role: '关系双方（5 条）+ 岔口（4 条）',
    why: [
      '五条落 tie：match:offer 的 inlaws-*（2026-09-13 我写的过门那一节）四支，',
      '  加 kindred:wedding 的 done——娘是那条边的一头。',
      '',
      '  另四条是岔口：festival:midautumn 的 parent-away、kindred:nephew 的 granny、',
      '  kindred:newyear 的 mother / mother-tells——她在不在决定走哪一支。',
    ].join('\n'),
  },
  {
    key: 'branch:bond:配偶',
    role: '约束（2 条）+ 岔口（2 条）',
    why: [
      'going-up:sent-for 的 cannot-leave / wife-only：「那一趟你没有去成。」',
      '',
      '  ⚠️ 她在这儿是【约束】，而那是第六种角色，前五种都装不下它：',
      '    背景  有她，这件事才成立',
      '    岔口  有她，这件事走这一支',
      '    约束  有她，这件事【走不成】   ← 可行性边界，不是她拦他',
      '',
      '  三者的处置一样（都不该往她身上落），而说的世界事实一层比一层重：',
      '  背景是【存在条件】，岔口是【路径选择】，约束是【可行性边界】。',
      '',
      '  ⚠️ 而措辞要按正文来，不能读成「她主动阻拦」：那一节写的是',
      '  「交代到第三天你就知道交代不完」——**是他自己交代不完**，',
      '  而她在这儿是那件交代不完的事里的一项。落的是 flag could-not-go-up',
      '  和编年「那一趟你没有去成」，承受者始终是玩家。',
      '',
      '  另两条是岔口：playmate:wed 的 both、ending 的 spouse（临终那一节她在床边）。',
    ].join('\n'),
  },
  {
    key: 'branch:landlord',
    role: '关系双方',
    why: [
      'dearth:price 三支：「米价涨了，租子照旧。」',
      '  「{house:landlord}的人来过一趟，站在门口……」',
      '  荒年催不催租，写的就是你跟田主之间那件事。',
    ].join('\n'),
  },
  {
    key: 'branch:east-wife',
    role: '执行者',
    why: [
      'regard:homecoming：「{hail:east-wife}你可算回来了。」',
      '  她来搭话、问起你家往后的打算——跟产婆、跟来敲门报信的邻居同一格。',
      '  这一节的承受者是玩家（他此刻被人怎么称呼）。',
    ].join('\n'),
  },
  {
    key: 'branch:east-head',
    role: '执行者',
    why: ['同上，regard:homecoming 的另一支。'].join('\n'),
  },
  {
    key: 'branch:bond:生父',
    role: '岔口',
    why: [
      'regard:homecoming 的 greeted：爹在不在，决定回村那天谁先开的口。',
      '  承受者是玩家。',
    ].join('\n'),
  },
  {
    key: 'branch:steward',
    role: '岔口',
    why: ['royal:dismissal 的 no-steward：管家在不在，决定这一节走哪一支。'].join('\n'),
  },
  {
    key: 'branch:sister',
    role: '岔口',
    why: ['house:succeed 的 handed：承户那一刻姐姐在不在。承受者是这一户。'].join('\n'),
  },
  {
    key: 'branch:bond:兄',
    role: '关系双方（8 条）+ 岔口（2 条）',
    why: [
      '八条在 kindred:newyear「正月里」和 kindred:nephew-grown / grandnephew 里：',
      '  · father-son-sour  「哥跟{call:nephew}一顿饭没说一句话。」',
      '  · lane-brother     「走的时候哥送你到巷口。」',
      '  · debt-open        「那笔粮，谁也没提。」',
      '  **这些卷写的就是你跟哥之间那件事**——他是另一头，不是单方面的承受者。',
      '  而那几节落的正是 tie（nephew → brother），关系双方那一格有东西。',
      '',
      '  另两条是 festival:midautumn 的 brother-away：',
      '  「哥今年没回来。娘留了半块瓜在碗里。」',
      '  ⚠️ 条件问的是「有个哥」，而**走这一支恰恰因为他不在场**——',
      '  典型的岔口：他的存在（和缺席）改变了这一节的样子，而承受者是玩家和娘。',
    ].join('\n'),
  },
  {
    key: 'branch:mother',
    role: '关系双方（4 条）+ 岔口（4 条）',
    why: [
      '四条关系双方：',
      '  · match:offer 的 inlaws-neither-gave / inlaws-mother-gave（2026-09-13 我写的）',
      '  · kindred:wedding 的 inlaws-sour / inlaws-fond（哥娶妻那一天）',
      '  两处都落 tie（spouse/brother-wife → mother）——**娘是那条边的一头**。',
      '',
      '  四条岔口：match:offer 的 elders / elders-heard（议亲时长辈听说了没有）、',
      '  festival:midautumn 的 brother-away（她留了半块瓜）、',
      '  house:succeed 的 handed（承户那一刻她在不在）。',
      '  ——她在不在决定走哪一支，而那几节的承受者是玩家或这一户。',
    ].join('\n'),
  },
  {
    key: 'branch:father',
    role: '执行者（13 条）+ 岔口（3 条）',
    why: [
      '十三条是各种出身的 birth:* 里同一个分支：{ family: { id: father, present: true } } → kept。',
      '  而那一段的注释自己写着理由：',
      '',
      '    取名这一幕是他在做——提笔、刻在碎木上、抱着你走二里地。',
      '    问 present 不问 alive：出门做工的爹活得好好的，可孩子落地时',
      '    他不在跟前，名字就该是别人取的。',
      '    有爹的孩子，名字是爹在纸上写的、在木头上刻的。',
      '',
      '  **爹是执行者，而事落在【孩子】身上（他的名字）**——跟产婆同一格。',
      '  这一生的第一条信息记在孩子那儿，不该记在爹身上。',
      '',
      '  另三条：match:offer 两条（议亲时长辈听说了没有）、',
      '  mourning:over 一条（「爹的坟在二百里外，清明去不了」）',
      '  ——都是【岔口】：他在不在决定这一节走哪一支，而承受者是玩家。',
    ].join('\n'),
  },
]

/**
 * 第三栏：**效果承受者来源账**——反过来问。
 *
 * ```
 * 第一二栏   点了名 → 有没有落点     「说好要来的人，世界记了吗」
 * 第三栏     落了点 → 【怎么进来的】  「世界记了的这个人，是从哪儿冒出来的」
 * ```
 *
 * ⚠️ 这一栏是 B 链（`away-father-old`）逼出来的：那一卷在前两栏里
 * **一条候选也不产**——哥身上有 `doing`，尺子就放过了整卷。
 * 而它真正的分流承受者是**嫂子**（侄儿不回来，地由她种），
 * 她落了效果**而从没被点名**。
 *
 * > 原尺子只从 `requires` 的人物入口向后走，
 * > 却没有从 `effect` 的人物向前追溯。（GPT 的话）
 *
 * ## 来源分四类，而只有最后一类要人判
 *
 * ```
 * created-in-scene   卷里 meet 立的（caravan-boss、baker 这类路人）  ✓ 来源闭合
 * relation-derived   由关系解析出来的                                ✓
 * branch-derived     家庭分流产生的（嫂子接过那几亩地）              ✓
 * unknown            既非上述，也没有显式入口                        ● 来源异常
 * ```
 *
 * ⚠️ `meet` 那一类**可以事先写死**——跟 GPT 定的：那是**引擎本身明确提供的
 * 人物生产机制**，不是经验归纳。而写死的只是「人从哪来」这一层，
 * **不能顺手关掉这个人后续效果的语义资格**。
 *
 * ## ⚠️ 而这个数不叫「23 个缺口」
 *
 * 叫「**146 件事件里，23 件带着需要解释来源的承受者**」。
 * 经过来源分类，大量会落进 created-in-scene，剩下的 unknown 才值得啃。
 */
const originRows: { event: string; who: string; how: string }[] = []
for (const event of lifeEvents) {
  const named = namedInRequires(event.requires ?? [])
  const scene = lifeScenes[event.scene]
  if (!scene) continue
  // 这一卷里 meet 立过谁——引擎明确的人物生产机制，来源就此闭合
  const created = new Set<string>()
  const dig = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(dig)
    if (one === null || typeof one !== "object") return
    const rec = one as Record<string, unknown>
    if (rec.type === "meet" && typeof rec.id === "string") created.add(rec.id)
    Object.values(rec).forEach(dig)
  }
  for (const node of Object.values(scene.nodes)) dig(node)

  for (const who of touchedByScene(event.scene)) {
    if (named.has(who)) continue
    if ([...named].some((one) => one.startsWith("bond:") && BOND_TO_ID.get(one.slice(5))?.has(who))) continue
    if (!PEOPLE.has(who)) continue
    originRows.push({ event: event.id, who, how: created.has(who) ? "created-in-scene" : "unknown" })
  }
}

const branchRows: { scene: string; who: string }[] = []
for (const [sceneId, scene] of Object.entries(lifeScenes)) {
  const touched = touchedByScene(sceneId)
  for (const node of Object.values(scene.nodes)) {
    for (const branch of node.branches ?? []) {
      for (const who of namedInRequires(branch.requires ?? [])) {
        if (who.startsWith('bond:')) {
          const ids = BOND_TO_ID.get(who.slice(5))
          if (!ids || ids.size === 0) continue
          if ([...ids].some((id) => touched.has(id))) continue
        } else {
          if (!PEOPLE.has(who)) continue
          if (touched.has(who)) continue
        }
        branchRows.push({ scene: sceneId, who })
      }
    }
  }
}

/**
 * 尺子自检：坏掉的尺子跟「库里很干净」印出来一模一样。
 *
 * ⚠️ **而这几条线的数字自己也会画在噪声里，我当天就栽过一次。**
 * 头一版写的是 `PEOPLE.size < 20`，那个 20 是拍的——
 * 而 120 世收到的人数在种子间是 **19–24**（八颗实测
 * `19 · 23 · 24 · 24 · 24 · 24 · 24 · 24`），于是有一颗种子直接报「尺子坏了」。
 *
 * **这一条本意是「尺子一个人也没收到」，那种情形下这个数是 0**，不是 19。
 * 所以线按那个含义画：`< 10` 只抓「压根没收到」，不抓「这颗种子人少」。
 *
 * 同样的毛病这一天在三支门禁上各现一次（`circumstance` 的 240 个样本、
 * `world` 的十几个样本、这儿的 19 个人）——**总量够，而落到这一撮上的数不够**，
 * 而我在写这一条时刚给前两支写完修复注释。
 *
 * ⚠️ **而线该画在 0 上，不是画在一个「安全余量」上。** 头一个修法写的是
 * `< 10`——那还是在估分布，只是估得松一点。跟 GPT 过完定的：
 *
 * > 自检要跟**意图同构**。这一条的意图是「一个人也没收到」，
 * > 那就写 `=== 0`。只有探针本身会有正常噪声时，才需要安全阈值。
 *
 * > **写自检时问的不该是「多少算少」，是「真坏的时候这个数是几」。**
 * > 前者要估分布，后者是确定的。
 */
const broken: string[] = []
if (PEOPLE.size === 0) broken.push('人口册一个人也没收到')

/**
 * ⚠️ **观察宇宙的完备性自证**——这一条比上面那些都重要。
 *
 * 头一版 `PEOPLE` 是 `createPinia()` 之后**直接读 roster**，一世也没演，
 * 收到的是**出生那一刻的名册**（24 人）。而嫂子、侄儿、儿子、配偶这些
 * **人生中途才立起来的人一个都不在里头**——
 * 于是三栏都在拿一张残缺的名单当「这是不是一个人」的判据，
 * **而被滤掉的恰恰是这一族最关心的那些人**（B 链的分流承受者就是嫂子，
 * 我正是因为她才建的第三栏，而她被这把尺子自己滤掉了）。
 *
 * 改成演完再收之后：24 人 → 45 人，7 种关系 → 14 种，三栏的候选数全变。
 *
 * ## 而「45 个人对了」不算自证
 *
 * 跟 GPT 定的：要自证的不是「这次数对了」，是
 *
 * > **演完之后收集的 `PEOPLE`，确实覆盖这一世所有实际进入世界的人物实体。**
 *
 * 否则下次换一条别的出现路径（轮回、事件重建、关系派生），还会再漏一次。
 *
 * 所以这一条拿**内容层写过的人**去对：凡是 `person` / `meet` 效果点过的 id，
 * 都该在 `PEOPLE` 里。对不上的只有两类是正常的：
 *
 * ```
 * 角色记号   elder / dam / child / playmate —— 本来就不是人的 id
 * 稀有出身   baker（royal）、chancellor（invest）—— 120 世撞不上
 * ```
 *
 * **稀有那一类不判红**（它会随种子飘），而角色记号那一类是恒定的。
 */
{
  const written = new Set<string>()
  const dig = (one: unknown): void => {
    if (Array.isArray(one)) return one.forEach(dig)
    if (one === null || typeof one !== "object") return
    const rec = one as Record<string, unknown>
    if (["person", "meet"].includes(String(rec.type)) && typeof rec.id === "string") {
      written.add(rec.id)
    }
    Object.values(rec).forEach(dig)
  }
  for (const scene of Object.values(lifeScenes)) {
    for (const node of Object.values(scene.nodes)) dig(node)
  }
  const ROLE_TOKENS = ["elder", "dam", "child", "playmate"]
  const RARE = ["baker", "chancellor"]
  const lost = [...written].filter(
    (one) => !PEOPLE.has(one) && !ROLE_TOKENS.includes(one) && !RARE.includes(one),
  )
  if (lost.length > 0) {
    broken.push(
      `观察宇宙不完备：内容层写过而名册收不到的有 ${lost.length} 个（${lost.join("、")}）`,
    )
  }
}
if (BOND_TO_ID.size === 0) broken.push('关系一种也没解出来')
if (PEOPLE.has('old-home')) broken.push('「old-home」进了人口册——那是户不是人')
if (!BOND_TO_ID.get('兄')?.has('brother')) broken.push('「兄 → brother」没解出来')
if (!rows.some((one) => one.event === 'wife-that-winter')) {
  broken.push('已知那颗真阳性（wife-that-winter）没被抓到')
}

console.log(`\n=== 事件的另一半（${lifeEvents.length} 件事件）===\n`)

/**
 * ⚠️ **把「这一支实际站在几个样本上」印出来。**
 *
 * 2026-09-13 一天之内三支门禁栽在同一处：`RUNS` 是所有人都看得见的旋钮，
 * **而「落到那一小撮上的样本有几个」没有任何地方印出来**：
 *
 * ```
 * circumstance  4000 世，而「一个血亲也没有」只占 6%  → 240 个样本
 * world          300 世，而撞上旱灾的只有十几世       → 十几个样本
 * ```
 *
 * 两支都因此把阈值画在了噪声里。这一支不判成败，**所以更该把分母印出来**
 * ——读的人得看得见这 28 条是从多大的底子上捞出来的。
 */
console.log(`  底子：${PEOPLE.size} 个人、${BOND_TO_ID.size} 种关系（120 世收的）`)
console.log(
  `  其中 ${lifeEvents.filter((one) => namedInRequires(one.requires ?? []).size > 0).length} 件事件的入场点了名，是这一支的分母\n`,
)

console.log(`  ── 已判候选中的主体缺口分布：被点名几次 / 其中几次落了东西 ──\n`)
/**
 * 记号：**数字是事实，记号是走查结论。一个符号不同时承担两件事。**
 *
 * ```
 * ○   这一行的候选都判过了，而且都合法
 * ⚠️  这一行有还没判过的候选
 * ●   判出来这一行有真缺口
 * ```
 *
 * ⚠️ 这么分是跟 GPT 过完定的，它挡的是一种具体的腐烂：
 * 头一版只用 ⚠️ 标「一次也没落过」，而 `bond:抚养` 那一行的三条候选
 * 我逐条判过、**全是合法的**（关系双方 / 主体事实由别处落的 / 尺子对不上）。
 * 一行永远顶着刺眼记号而永远没问题，**会训练人无视这张图**
 * ——这个库记过「一道会无故红的门禁比没有门禁更坏」。
 *
 * ⚠️ `CALLED` 的 `key` 是**走查记录的归并键**，而不是「人」或「事件」中的某一种。
 * 取哪一种**由结论的粒度决定**，两种形态都合法：
 *
 * ```
 * key: 'bond:兄'              七条共用一条——逐条确认过，而【结论是同一个】
 * key: 'reunion-homecoming'   逐事件各一条——三条的【误报原因各不相同】
 *                             （关系双方 / 主体事实由别处落的 / 尺子对不上）
 * ```
 *
 * 共用得起是因为结论一样；`bond:抚养` 那三条要是共用，
 * **反而会把三个不同的误报原因盖成一个**。
 *
 * 所以底下判「这一行判过没有」时两种都要查。
 * ⚠️ 我头一版注释写成「`bond:抚养` 那三条」，而那个键在 `CALLED` 里压根不存在
 * ——打断验时锚点对不上才发现。
 *
 * 而这么分之后这张图会自己往前走：哪天有人加第四条 `bond:抚养` 的内容，
 * `0/3 ○` 自动变成 `0/4 ⚠️`（多了个没判过的），判完再落回 `○` 或 `●`。
 */
const judgedKeys = new Set(CALLED.map((one) => one.key))
const isReal = new Map(CALLED.map((one) => [one.key, one.role.includes('真候选')] as const))
const judgedOf = (row: { event: string; who: string }): boolean =>
  judgedKeys.has(row.who) || judgedKeys.has(row.event)
const realOf = (row: { event: string; who: string }): boolean =>
  isReal.get(row.who) === true || isReal.get(row.event) === true

for (const [who, one] of [...covered.entries()].sort((a, b) => b[1].named - a[1].named)) {
  const mine = rows.filter((row) => row.who === who)
  const unjudged = mine.filter((row) => !judgedOf(row))
  const real = mine.some(realOf)
  const mark = mine.length === 0 ? '  ✓' : unjudged.length > 0 ? '  ⚠️' : real ? '  ●' : '  ○'
  console.log(
    `    ${who.padEnd(16)} ${String(one.landed).padStart(2)} / ${String(one.named).padEnd(2)}${mark}`,
  )
  // 一行的记号是【多条候选的合取】。把撑着它的那几条印出来——
  // 打断验就能自己回答「我的刀砍中了没有」，不必先去怀疑记号是死的
  for (const row of mine) {
    const tag = !judgedOf(row) ? '未判' : realOf(row) ? '主体' : '非主体'
    console.log(`        └ ${row.event.padEnd(22)} ${tag}`)
  }
}

/**
 * 汇总两行：**「判过几条」和「判为主体的那些落点如何」是两个数，分开报。**
 *
 * ⚠️ 跟 GPT 定的：**「不知道」和「判断为不是」要从数据模型上分开**，
 * 任何没标注的都不许伪装成「合法的非主体」。所以 `⚠️` 只表示**没判过**，
 * 跟「判过了，不是主体」（`○`）是两个记号，不共用。
 *
 * ⚠️ 而四态里有一格这一支**给不出来**，得说在明处：
 *
 * ```
 * ⚠️ 未判          给得出
 * ○  非主体        给得出
 * ●  主体但无落点   给得出   ← 三颗真候选
 * ✓  主体且有落点   【给不出】
 * ```
 *
 * **因为落了点的那些对子根本不会成为候选**——尺子只把「没落点」的挑出来，
 * 于是没有人给它们登记过角色。行末那个 `✓` 说的是「这一行没有候选」，
 * **不是「这一行的主体都有落点」**，两者不是一回事。
 *
 * 要真给出「主体覆盖率」，得把落了点的那些对子也逐条标角色——
 * 配偶 16 处标得完，全库标不完。所以这一支报的是**判过的那部分里**
 * 主体有几条、其中几条没落点，而不是一个全库比值。
 */
const judgedRows = rows.filter(judgedOf)
const subjects = rows.filter(realOf)
const subjectEvents = new Set(subjects.map((one) => one.event))
console.log(
  [
    '',
    `    判过 ${judgedRows.length} / ${rows.length} 条候选；其中判为【主体】的 ${subjects.length} 条，` +
      `分属 ${subjectEvents.size} 卷，而这 ${subjectEvents.size} 卷**一卷也没有落点**`,
    '',
    '    ✓ 这一行没有候选　○ 判过了，不是主体　⚠️ 有还没判过的　● 判过了，是主体而没落点',
    '',
    '    ⚠️ 行末的 ✓ 不等于「这一行的主体都有落点」——落了点的对子不会成为候选，',
    '    没人给它们标过角色。「主体且有落点」这一格这一支给不出来。',
    '',
    '    ⚠️ 而这张图【不能拿行覆盖率排名】：`bond:兄 13/20` 混着两种东西',
    '    ——哥是主体的那些卷，和「只要有个哥」这个前提。同一个人用',
    '    `id: brother` 点名时是 8/8，用 `bond: 兄` 点名时是 13/20，',
    '    差别在内容层怎么点他，不在这个人身上。',
    '',
  ].join('\n'),
)

if (broken.length > 0) {
  console.log('  ✗ 尺子坏了，底下的清单不能当结论读：\n')
  for (const line of broken) console.log(`    ${line}`)
  console.log()
  process.exitCode = 1
} else {
  console.log('  ✓ 尺子自己判得出：人口册和关系表都解出来了，已知那颗真阳性在册。\n')
}

const judged = new Map(CALLED.map((one) => [one.key, one]))
const fresh = rows.filter((one) => !judged.has(one.who) && !judged.has(one.event))

console.log(
  `  候选 ${rows.length} 条，判过 ${rows.length - fresh.length} 条，没判过 ${fresh.length} 条\n`,
)

for (const one of CALLED) {
  const hit = rows.filter((row) => row.who === one.key || row.event === one.key)
  console.log(`  ◇ ${one.key}　〔${one.role}〕　${hit.length} 条`)
  console.log(`    ${one.why.split('\n').join('\n    ')}\n`)
}

if (fresh.length > 0) {
  console.log(`  · 还没判过的 ${fresh.length} 条：\n`)
  for (const one of [...fresh].sort((a, b) => a.who.localeCompare(b.who))) {
    console.log(`      ${one.who.padEnd(14)} ${one.event}`)
  }
  console.log()
}

console.log('  这一支不判成败。「点了名」不等于「这件事发生在他身上」——')
console.log('  背景、记录者、执行者、关系双方、真正经历者，只有最后一格该问')
console.log('  「世界记下了吗」，而那一格静态判不出来。判完往 CALLED 里登记。\n')

/**
 * 第二栏：`branches` 里点了名而没落东西的。**跟上面那栏分开报，不合并。**
 *
 * ⚠️ **55 这个数不要拿去对 135。** 全库带人物条件的分支有 118 条，
 * 展开成「分支 × 谁」的对子 135 个，而进这一栏的只有 55——
 * **另外 80 个是「落了东西的」，被滤掉了**，那正是这支尺子该做的事。
 * 这一栏数的是【没落点的那些】，不是【所有点名】。
 *
 * 这一栏一族一族地判——按 GPT 那条防线，
 * 「角色分类用于解释候选，不用于预先淘汰候选」，
 * 所以不能事先写一条「`branches` 里的都算岔口」把它们消掉。
 */
const branchBy = new Map<string, number>()
for (const one of branchRows) branchBy.set(one.who, (branchBy.get(one.who) ?? 0) + 1)
console.log(`  ── 第二栏：branches 里点了名而没落东西（${branchRows.length} 条）──\n`)
const branchJudged = new Map(BRANCH_CALLED.map((one) => [one.key, one]))
for (const [who, n] of [...branchBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  const seen = branchJudged.get(`branch:${who}`)
  console.log(`    ${who.padEnd(16)} ${String(n).padStart(3)} 条  ${seen ? '○' : '⚠️'}`)
}
for (const one of BRANCH_CALLED) {
  console.log(`\n  ◇ ${one.key}　〔${one.role}〕`)
  console.log(`    ${one.why.split('\n').join('\n    ')}`)
}
const branchLeft = [...branchBy.entries()].filter(([who]) => !branchJudged.has(`branch:${who}`))
const branchLeftCount = branchLeft.reduce((sum, [, n]) => sum + n, 0)
console.log(
  [
    '',
    `    共 ${branchBy.size} 个不同的「谁」，还没判的 ${branchLeftCount} 条（分属 ${branchLeft.length} 个「谁」）——`,
    `    这个数摆在明处是有意的：`,
    '    自动那半永远完整，人工那半永远显式暴露缺口。',
    '',
    '    ⚠️ 这一栏预计绝大多数会判成【岔口】（有他就走这一支），因为那正是',
    '    branches 的定义。而那必须是【逐条看过之后】的结论，不是一条预先的规则。',
    '    判完要是出现「岔口 80 / 主体 20」，就得查为什么这么多分流条件',
    '    其实在描述人物自身的经历。',
    '',
  ].join('\n'),
)

/**
 * 第三栏印出来。**这个数不叫「缺口」，叫「需要解释来源的承受者」。**
 *
 * `created-in-scene`（卷里 `meet` 立的）来源就此闭合——那是引擎明确的
 * 人物生产机制。剩下的 `unknown` 才值得逐条判：它可能是
 * **分流承受者**（嫂子接过那几亩地，合法）、**关系解析出来的**（合法），
 * 也可能是**某一卷顺手改了另一个人**（那才是问题）。
 */
const originBy = new Map<string, { created: number; unknown: number }>()
for (const one of originRows) {
  const cur = originBy.get(one.who) ?? { created: 0, unknown: 0 }
  if (one.how === 'created-in-scene') cur.created += 1
  else cur.unknown += 1
  originBy.set(one.who, cur)
}
const unknownRows = originRows.filter((one) => one.how === 'unknown')
console.log(
  `  ── 第三栏：落了效果而没被点名（${originRows.length} 条，` +
    `其中卷里 meet 立的 ${originRows.length - unknownRows.length} 条）──\n`,
)
for (const [who, one] of [...originBy.entries()]
  .filter(([, x]) => x.unknown > 0)
  .sort((a, b) => b[1].unknown - a[1].unknown)) {
  console.log(`    ${who.padEnd(16)} 待解释 ${String(one.unknown).padStart(2)} 条  ⚠️`)
}
console.log(
  [
    '',
    `    待解释 ${unknownRows.length} 条。⚠️ 这【不是】缺口数——`,
    '    它可能是分流承受者（嫂子接过那几亩地）、关系解析出来的，',
    '    也可能是某一卷顺手改了另一个人。逐条判完才知道。',
    '',
    '    ⚠️ 而 meet 那一类是【事先写死】的：引擎明确的人物生产机制，',
    '    不是经验归纳。写死的只是「人从哪来」，不关他后续效果的语义资格。',
    '',
  ].join('\n'),
)
