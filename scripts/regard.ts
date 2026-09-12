/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 情义——regard:homecoming 走得到吗。
 *
 * `regard.ts` 里只有一个场景（`regard:homecoming`），是回到村子里
 * 被邻居迎面碰上的那一刻：东邻主妇（east-wife）或东邻主事（east-head）
 * 会在 seen 块里出现（有活人检查守着）。
 *
 * 关键节点：
 *   open         → gate-east-wife / gate-east-head / indoors（按条件分流）
 *   gate-east-wife  东邻主妇
 *   gate-east-head  东邻主事
 *   indoors      没有遇到东邻
 *   greeted      被人打招呼
 *   empty        空的（人都散了）
 *   after        结束
 *
 * 核心判据：
 * 一、indoors（没遇到东邻）可达
 * 二、greeted（被人打招呼）可达
 * 三、after（结束）可达
 * 四、尺子自检：场景 id 打对了，真的走进去了
 *
 * 跑法：bun scripts/regard.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useStory } from '../src/engine/story'
import { callMeBy, mayAsk } from '../src/engine/address'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode } from '../src/types/game'
import { standing } from './lib/standing'
import { beOf } from './origin'

const SCENE = 'regard:homecoming'

function stage(age = 28): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function playFrom(
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[SCENE]
  if (!s) return []
  const walked: string[] = []
  let at: string | undefined = from

  for (let guard = 0; at !== undefined && guard < stopAfter; guard += 1) {
    const node: SceneNode | undefined = s.nodes[at]
    if (!node) break
    walked.push(at)
    if (node.onEnter) applyEffects(node.onEnter)

    const open: Choice[] = (node.choices ?? []).filter((one) => meetsAll(one.requires))
    if (open.length > 0) {
      const want = pick(open.map((o) => o.id))
      const chosen: Choice = open.find((one) => one.id === want) ?? open[0]!
      if (chosen.effects) applyEffects(chosen.effects)
      at = chosen.next ?? undefined
      continue
    }
    const branch = node.branches?.find((one) => meetsAll(one.requires))
    at = branch?.next ?? node.next ?? undefined
  }
  return walked
}

function play(pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(lifeScenes[SCENE]?.entry ?? 'open', pick)
}

console.log('\n=== 情义——regard:homecoming 走得到吗 ===\n')

let bad = 0

/**
 * 一、indoors（没遇到东邻）→ 继续走。
 */
{
  stage()
  const walked = playFrom('indoors')
  if (walked.length === 0) {
    console.log('  ✗ indoors：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ indoors：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 二、greeted（被人打招呼）可达。
 */
{
  stage()
  const walked = playFrom('greeted')
  if (walked.length === 0) {
    console.log('  ✗ greeted：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ greeted：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 三、after（结束）可达。
 */
{
  stage()
  const walked = playFrom('after')
  if (walked.length === 0) {
    console.log('  ✗ after：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ after：节点有内容，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、条件层：**回到家门口，迎着你的是谁**。
 *
 * 上面几条问的是「这个节点有内容吗」——`meetsAll` 恒真它们纹丝不动。
 *
 * 入口那一节按**谁还在**分三档，而**顺序是从远到近**：
 *
 *     east-wife 还在   → gate-east-wife    邻家的妇人
 *     east-head 还在   → gate-east-head    她男人
 *     （都不在）        → indoors           只有家里人
 *
 * 内容里那段注释写着为什么远的排前面：**这一卷要看的恰恰是
 * 「不相干的人怎么叫你」**——那是身份真正落地的地方。
 * 两条对调，这一卷的立意就没了，而「走得到吗」那类判据一声不响。
 *
 * ## 摆局要走真出生流程
 *
 * 邻居是 `birth.ts` 在出生流程里立的，`beOf` 只摆户籍五格不立人
 * （2026-09-12 在 `routine` 的王府局上栽过一次：`beOf('manor')` 之后
 * 人口册里一个乳母也没有）。所以掷到东邻那一户真的有人为止，
 * 再按要验的那一档把人送走。
 */
{
  /** 掷一世东邻齐全的，回报摆成功没有 */
  function stageWithNeighbours(): boolean {
    for (let n = 0; n < 300; n += 1) {
      setActivePinia(createPinia())
      useCharacterStore()
      useHouseholdStore()
      const people = usePeopleStore()
      useNarrativeStore()
      const story = useStory(lifeScenes, {
        events: lifeEvents,
        routine: lifeRoutine,
        finale: lifeFinale,
      })
      story.begin()
      if (people.personOf('east-wife') === undefined) continue
      if (people.personOf('east-head') === undefined) continue
      useWorldStore().advanceTime({ years: 28 })
      // 推了二十八年，人可能已经殁了——这一档要的是两个都还在
      if (!people.isAlive('east-wife') || !people.isAlive('east-head')) continue
      return true
    }
    return false
  }

  const cases: Array<{ label: string; gone: readonly string[]; to: string }> = [
    { label: '邻家的妇人还在', gone: [], to: 'gate-east-wife' },
    { label: '她没了，她男人还在', gone: ['east-wife'], to: 'gate-east-head' },
    { label: '两个都不在了', gone: ['east-wife', 'east-head'], to: 'indoors' },
  ]

  const entry = lifeScenes[SCENE]?.entry ?? 'open'
  /**
   * 走到的**第一个**分流目标是哪一个。
   *
   * ⚠️ 不能用 `walked.includes(to)`——**那三个目标在路径上是串着的**：
   * `gate-east-wife` 演完接 `indoors`，于是「该去 indoors」那一档
   * 在条件层整个失效时**照样成立**（路径确实流过了 indoors）。
   *
   * A 刀实测证实了这一点：三档里只有中间那一档红，
   * 头一档因为排在最前面、末一档因为路径流经，两头都逃掉了。
   *
   * 所以问的是**第一个落点**，不是「路过没路过」。
   */
  const targets = ['gate-east-wife', 'gate-east-head', 'indoors'] as const
  function landedOn(walked: readonly string[]): string | undefined {
    return walked.find((one) => (targets as readonly string[]).includes(one))
  }

  /**
   * 这一档要活着的那个人是谁。摆局之后要**再验一次**，理由见底下。
   */
  const mustLive: Record<string, string | undefined> = {
    'gate-east-wife': 'east-wife',
    'gate-east-head': 'east-head',
    indoors: undefined,
  }

  let checked = 0
  for (const { label, gone, to } of cases) {
    /*
     * ⚠️ **`open` 的 `onEnter` 推一个月，人会在这一个月里殁。**
     *
     * 摆局摆的是「此刻他还在」，而引擎判分流是在 `applyEffects(onEnter)`
     * 之后——中间隔着一个月。2026-09-12 实测：第二档摆局时
     * 东邻主事活着、条件为真，推完那一个月他殁了，于是落在 `indoors`。
     * 判据报「该落在 gate-east-head」，**读着像那条分流坏了**。
     *
     * 这一支先前一直绿是因为流位置恰好没掷中；全库跑一轮就红了。
     *
     * 所以掷到「**推完那一个月他还在**」为止——
     * 判据的采样点要跟引擎判分流的那一刻对齐
     * （`gate-sampling-point`：采错点会诬告被测系统）。
     */
    let ready = false
    for (let tries = 0; tries < 60 && !ready; tries += 1) {
      if (!stageWithNeighbours()) break
      const people = usePeopleStore()
      for (const id of gone) people.die(id, '病')
      const who = mustLive[to]
      if (who === undefined) {
        ready = true
        break
      }
      // 演一遍 open 的 onEnter，看那一个月过去他还在不在
      const probe = usePeopleStore()
      applyEffects(lifeScenes[SCENE]?.nodes[entry]?.onEnter)
      if (probe.isAlive(who)) {
        ready = true
        break
      }
    }
    if (!ready) {
      console.log(`  ✗ 摆局〔${label}〕：掷不出推完那一个月人还在的一世——这一条什么也没量。`)
      bad += 1
      continue
    }
    checked += 1
    /*
     * ⚠️ 从 `entry` 起演会**再推一个月**（`onEnter` 又跑一遍）。
     * 摆局那一步已经推过了，这里从分流本身起演：
     * 直接问 `branches` 此刻落在哪，不重复推时间。
     */
    const node = lifeScenes[SCENE]?.nodes[entry]
    const branch = node?.branches?.find((one) => meetsAll(one.requires))
    const walked = [entry, ...playFrom(branch?.next ?? node?.next ?? 'indoors')]
    const landed = landedOn(walked)
    if (landed !== to) {
      console.log(
        `  ✗ 门口分流〔${label}〕：该落在 ${to}，实际落在 ${landed ?? '哪儿也没落'}` +
          `（走过 ${walked.join('→')}）。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ 门口分流〔${label}〕：落在 ${to}。`)
    }
  }
  if (checked === 0) {
    console.log('  ✗ 门口分流：一档也没验到。')
    bad += 1
  }
}

/**
 * 五、尺子自检：场景 id 打对了，真的走进去了。
 */
{
  stage()
  const walked = play()
  if (walked.length < 2) {
    console.log(`  ✗ 尺子自检：只走了 ${walked.length} 节——场景 id 打错或库里没挂上。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.join(' → ')}）。`)
  }
}

/**
 * 称谓层：**一个人的身份变了，最先变的从来不是他自己**。
 *
 * ## 为什么这一支补的不是效果层
 *
 * 全库这一轮在给各卷补效果层判据（B 刀：`applyEffects` 空转，判据该红）。
 * 而这一卷**通篇只有五处效果，全是推时间，外加一条年表**
 * ——文件头自己写着：
 *
 * > 这一卷不给任何东西。没有属性、没有旗标、没有家底变化。
 * > 中了秀才那一节该给的都给过了。
 *
 * 所以 B 刀在这儿不红**不是缺陷**，是这一卷本来就不落东西。
 * 硬造一条效果层判据只会立一把量不到东西的尺子。
 *
 * ## 它真正的分量在两个记号上，而那一层一直没人验
 *
 *     {hail:谁}   那个人开口时怎么称呼你
 *     mayAsk      那个人够不够格说这一档的话
 *
 * 上面那几条验的是「走得到吗」和「谁迎着你」——
 * **两个记号全砍掉，它们照样全绿**。
 *
 * 这一卷存在的理由是把 `exam.ts` 里那句旁白变成真的：
 *
 * > 村里人见你改了称呼。有几个从前不太理你的，如今站住了说话。
 *
 * 在这一卷之前，`identity` 换成了「生员」、正文报了一句「改了称呼」，
 * **而库里每一处称呼照旧**。16.md 点的正是这个。
 *
 * ## 判两件事，各对着一个记号
 *
 *     同一个称呼记号，没有边的邻家妇人和十六年的家里人，叫出两种话
 *     同一档家常，她问不出口，家里人张口就问
 *
 * ⚠️ **后一句一个称呼也没有，而那正是对的**——中文里熟人开口不带称呼。
 * 所以判据问的是「两个人叫出来的不一样」，不是「都得有个称呼」。
 * 问「都得有」会把这一整层的用意判反。
 */
{
  const wrong: string[] = []

  /*
   * ⚠️ **先牵边，再推时间**——这条边要牵够十六年。
   *
   * `callMeBy` 第二档判的是 `boundFor(speakerId, bond) >= OLD_ENOUGH`，
   * 而 `OLD_ENOUGH = 16` 正是文件头说的那个「十六年」。
   * `bind` 记的 `since` 是牵边**当时**的年份，所以摆到 28 岁再牵，
   * 那条边只牵了零年——他会跟陌生人一样叫你「相公」。
   *
   * 头一版正是这么写的，判据报「两个人叫出来的是同一句」，
   * **读着像那个称呼记号坏了**，而坏的是我摆局的顺序。
   */
  stage(12)
  const character = useCharacterStore()

  // 中了秀才，身份那一格翻过去了——这一卷讲的就是这之后的事
  character.setIdentity('生员')

  /*
   * 摆两个人，差别只在一处：**跟你有没有那条牵了十六年的边**。
   *
   * 邻家的妇人立在册上、没有任何一条关系边；
   * 家里的大人牵上「生父」。
   */
  standing({ id: 'east-wife', older: 6, given: '氏', gender: '女' })
  standing({ id: 'kin-elder', bond: '生父', older: 30, given: '大' })
  // 牵完再推：这十六年是那条边的年头，不是他的岁数
  useWorldStore().advanceTime({ years: 16 })

  const strangerCall = callMeBy('east-wife')
  const kinCall = callMeBy('kin-elder')

  if (strangerCall === kinCall) {
    wrong.push(
      `邻家的妇人和家里的大人叫出来的是同一句（都是「${String(strangerCall)}」）` +
        '——那个称呼记号没在认人',
    )
  }
  if (strangerCall === undefined) {
    wrong.push('没有交情的邻家妇人开口不带称呼——她还没熟到那一步')
  }

  /*
   * 同一档家常：她够不够格问，跟家里人够不够格问，不该是一回事。
   *
   * ⚠️ `mayAsk` 回的是 `{ can, because }` 这个对象，**不是一句话**。
   * 头一版直接 `strangerMay === kinMay` 比的是引用，两个新对象
   * 永远不相等——**那条判据恒绿，而且报出来的话里印着
   * `[object Object]`**。恒绿的判据比没有判据更坏：它占着位置。
   *
   * 所以比 `can` 和 `because` 两格，报话也印这两格。
   */
  const strangerMay = mayAsk('east-wife', '家常')
  const kinMay = mayAsk('kin-elder', '家常')
  const sameStanding =
    strangerMay.can === kinMay.can && strangerMay.because === kinMay.because
  if (sameStanding) {
    wrong.push(
      `邻家的妇人和家里的大人问同一档家常的资格一样（都是「${strangerMay.because}」）` +
        '——「凭什么能问这句话」那一层没在管事',
    )
  }
  if (kinMay.can !== true) {
    wrong.push(`家里的大人问一句家常也不够格（「${kinMay.because}」）——他本来就在那个位置上`)
  }
  if (strangerMay.can === true && strangerMay.because === '家里人') {
    wrong.push('隔壁的妇人被当成了家里人')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ 称谓层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ 称谓层：邻家的妇人叫「${String(strangerCall)}」、家里的大人` +
        `${kinCall === undefined ? '开口不带称呼' : `叫「${kinCall}」`}；` +
        `同一档家常，她${strangerMay.can ? '' : '问不出口'}「${strangerMay.because}」，` +
        `而他${kinMay.can ? '张口就问' : '问不出口'}「${kinMay.because}」。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  情义那一卷，各条路各自有人走过了。\n')
}
