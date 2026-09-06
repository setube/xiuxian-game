/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 他够得着哪些事。
 *
 * 这一支守一条规矩：**选项空间由身份和处境决定，不能拿同一个行为池给所有人换文案。**
 *
 *   宫里的孩子不会「出去做工挣几个钱」——不是因为他不想，
 *   是因为那道门他出不去，而且他家不缺这几个钱。
 *
 * ## 为什么要一支门禁，而不是写选项时记得加条件
 *
 * 因为库里**已经在逐处补了**，而逐处补的东西会漏：
 *
 *     routine.ts  「出去做工，挣几个钱」      写着 living notIn palace/manor  ✓
 *     routine.ts  「出门做工，挣几个钱回来」   写着同样的条件                  ✓
 *     routine.ts  「在外面疯跑」              写着 dwelling 宅/寺/无           ✓
 *     dearth.ts   「你出去做工」              没有条件                        ✗
 *
 * 补一处是一处，没有任何机制保证下一个写选项的人记得补。这跟 `present.ts` 那件事
 * 是同一个形状：**占位符防住的那一层，硬写的字绕过去了**——那里漏的是称谓，
 * 这里漏的是行为。
 *
 * ## 判据问的是 `living`，不是 `origin`
 *
 * 这一条是这支门禁最容易写错的地方，也是它必须写对的地方：
 *
 *   **削爵之后那些选项应该开。** 王府塌了、迁出京城、门第没了，那个人从此
 *   就得自己找活干——15.md 原话是「不是王府子弟也能随时去找活，而是
 *   **他的处境发生了足够大的变化，导致原本不存在的行为空间现在出现了**」。
 *
 * 所以问的是他**此刻过的是什么日子**（`character.living.id`），
 * 不是他生在哪一行（`household.origin`）。`routine.ts` 现有那两处正是这么写的。
 *
 * 跑法：bun scripts/reach.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'

/**
 * 走多少世。
 *
 * 要等的是「高墙里的日子」真的被掷到——宫里和王府两行加起来权重只有 3，
 * 三百世下大约采到十来个。底下第二条会把实际采到多少印出来，采不够就报不出话来。
 */
const RUNS = 300

/** 高墙里头的日子。出不了门，也不缺这几个钱 */
const WALLED: readonly string[] = ['palace', 'manor']

/**
 * 高墙里头不该出现的行为。
 *
 * 只收**明确是为生计出门做事**的那几个词，不收「买东西」「赶集」这类——
 * 王府的人也上街，只是有人跟着。**这张表宁可漏，不可误报**：
 * 一道会无故红的门禁比没有门禁更坏，它训练人无视它。
 *
 * 「下地」单列是因为它跟做工不是一回事：宫里的孩子不下地，
 * 可削爵迁到城南小院之后，他确实可能下地。这一条同样由 `living` 分辨。
 */
const NOT_BEHIND_WALLS: readonly string[] = ['做工', '找活', '挣钱', '短工', '当伙计', '下地']

/**
 * 判据本身。**写成函数，是为了底下第三条能喂它坏数据。**
 *
 * 不这么写的话，这一支跑出绿来什么也证明不了——「库里没有违规」和
 * 「判据根本抓不到违规」印出来是同一行字。
 */
function offendersIn(living: string, labels: readonly string[]): readonly string[] {
  if (!WALLED.includes(living)) return []
  return labels.filter((label) => NOT_BEHIND_WALLS.some((word) => label.includes(word)))
}

interface Reach {
  living: string
  label: string
  scene: string
}

const wrong: Reach[] = []
/** 采到多少个「此刻在高墙里」的回合，用来说明判据有没有真的量到东西 */
let walledTurns = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  story.begin()
  let turns = 0

  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((one) => !one.locked)
    if (open.length === 0) break

    /*
     * 采样点在 `choose` 之前：要问的是「**此刻**摆在他面前的选项」。
     * 放到 choose 之后就成了「下一节的选项配上一节的身份」，那是另一回事。
     */
    const living = character.living.id
    if (WALLED.includes(living)) {
      walledTurns += 1
      for (const label of offendersIn(
        living,
        open.map((one) => one.choice.label),
      )) {
        wrong.push({ living, label, scene: narrative.sceneId ?? '?' })
      }
    }

    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
  }
}

console.log(`\n=== 他够得着哪些事（${RUNS} 世）===\n`)

let bad = 0

/**
 * 一、高墙里头的人，选项里不出现为生计出门做事。
 *
 * 这一条抓到过的那一处值得记：`dearth.ts` 荒年那一卷的「你出去做工」
 * 一条 `requires` 也没有，而同一件事在 `routine.ts` 里是写了
 * `living: { notIn: ['palace', 'manor'] }` 的。**同一条规矩，两处写法**——
 * 那正是这支门禁存在的理由。
 */
{
  const unique = new Map<string, Reach>()
  for (const one of wrong) unique.set(`${one.living}:${one.label}`, one)

  if (unique.size > 0) {
    console.log(`  ✗ ${unique.size} 种说法，高墙里头的人不该够得着：`)
    for (const [, one] of [...unique].slice(0, 8)) {
      console.log(`      〔${one.living}〕${one.scene}：${one.label}`)
    }
    bad += 1
  } else {
    console.log(`  ✓ 采到 ${walledTurns} 个高墙里的回合，没有一处让他出门挣钱。`)
  }
}

/**
 * 二、尺子自检：这一批世里真的走到过高墙里的日子。
 *
 * 缺了这一条，第一条会在「一个宫里的孩子也没掷到」的时候照样打勾——
 * **没查到和查过了长得一模一样**，而这一支的全部价值就在于它查过。
 */
{
  if (walledTurns === 0) {
    console.log(`  ✗ ${RUNS} 世里一个回合也没走到宫里或王府——这一条什么也没量。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：${walledTurns} 个回合确实处在高墙里，判据量到了东西。`)
  }
}

/**
 * 三、尺子自检：喂坏数据抓得到，喂对的放得过。
 *
 * 前两条都绿的时候，这一支印出来的话是「库里没有违规」。可那句话有两种成因：
 * 判据管用而内容干净，或者**判据根本抓不到东西**。两种印出来一模一样。
 *
 * 所以这一条不问被测系统，只问尺子自己：拿手写的假选项喂进 `offendersIn`，
 * 该红的红、该放的放。这跟 `succession.ts` 第七条、`present.ts` 那张
 * `INNOCENT_CONTEXTS` 是同一种自觉——**判据也是代码，它一样会坏。**
 */
{
  const checks: readonly { living: string; label: string; want: boolean; why: string }[] = [
    { living: 'palace', label: '出去做工，挣几个钱', want: true, why: '宫里的孩子不出门挣钱' },
    { living: 'manor', label: '跟着长工下地', want: true, why: '王府的孩子不下地' },
    { living: 'farm', label: '出去做工，挣几个钱', want: false, why: '农户当然可以出去做工' },
    { living: 'fallen', label: '出去找活', want: false, why: '门第塌了以后正该去找活——这一条最要紧' },
    { living: 'palace', label: '跟着先生读书', want: false, why: '读书是宫里该有的事' },
  ]

  const broken = checks.filter(
    (one) => offendersIn(one.living, [one.label]).length > 0 !== one.want,
  )

  if (broken.length > 0) {
    console.log(`  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) {
      console.log(`      〔${one.living}〕「${one.label}」应${one.want ? '红' : '放'}——${one.why}`)
    }
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：高墙里的做工抓得到，农户和落魄户的做工放得过。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  身份决定的是行为空间，不是文案。\n')
}
