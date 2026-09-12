/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 渡口——各入场路线都走得到吗，as-apprentice 正文干净吗。
 *
 * `riverman.ts` 里只有一个场景（`riverman`），有多条入场路线：
 *
 *   as-escort     护卫出身
 *   as-nobody     白身
 *   as-highborn   贵族/官宦出身
 *   as-healer     医者出身
 *   as-innkeep    客栈出身
 *   as-taverner   酒楼出身
 *   as-gentry     乡绅出身
 *   as-student    念过书（先生还在）
 *   as-reader     念过书（先生没了）
 *   as-apprentice 学过手艺（本轮刚修复：去掉了「师傅」字样）
 *   as-clerk      掌柜的出身
 *   as-hand       普通农户出身
 *
 * 核心判据：
 * 一、as-apprentice 正文里没有「师傅」二字（present.ts 会把殁了的人叫出来）
 * 二、river 节点可达（各入场路线都汇入这里）
 * 三、关键结果节点（watched/approached/named-root/left）各自可达
 * 四、尺子自检：场景真的走进去了
 *
 * 跑法：bun scripts/riverman.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import type { Choice, SceneNode, Condition } from '../src/types/game'
import { checkForking } from './lib/forking'
import { beOf } from './origin'

const SCENE = 'riverman'

function stage(age = 20): void {
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

console.log('\n=== 渡口——各入场路线都走得到吗 ===\n')

let bad = 0

/**
 * 一、as-apprentice 正文里没有「师傅」二字。
 *
 * 这是本轮修复的 bug：原先写「师傅打发你进城交一批活计」，
 * 但这一节在 craft-master 已殁的世里同样触发，present.ts 逼出来。
 * 修成「你进城交了一批活计」——这条判据锁住这个修复不被后人误改。
 */
{
  const scene = lifeScenes[SCENE]
  const node = scene?.nodes['as-apprentice']
  if (!node) {
    console.log('  ✗ as-apprentice 节点不存在——场景里没有这个节点。')
    bad += 1
  } else {
    const texts = [
      ...(node.blocks ?? []).map((b) => ('text' in b ? b.text : '')),
      ...(node.seen ?? []).map((s) => s.text),
    ]
    const hasMasterWord = texts.some((t) => t.includes('师傅'))
    if (hasMasterWord) {
      console.log('  ✗ as-apprentice 正文：出现了「师傅」二字——present.ts 会把殁了的人叫出来。')
      bad += 1
    } else {
      console.log('  ✓ as-apprentice 正文：一次「师傅」也没有，present.ts 不会报红。')
    }
  }
}

/**
 * 二、各入场路线各自走得到 river 节点（核心场景的入口）。
 *
 * 直接从各入场路线节点演，确认走到了 river 节点。
 */
{
  const entryNodes = [
    'as-escort',
    'as-nobody',
    'as-highborn',
    'as-healer',
    'as-innkeep',
    'as-taverner',
    'as-gentry',
    'as-student',
    'as-reader',
    'as-apprentice',
    'as-clerk',
    'as-hand',
  ] as const

  for (const node of entryNodes) {
    stage()
    const walked = playFrom(node)
    if (!walked.includes('river')) {
      console.log(`  ✗ ${node} → river：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ ${node} → river：走到了。`)
    }
  }
}

/**
 * 三、river 节点里的关键选项各自走得到。
 *
 * river 节点里有 watch/approach/shake/leave/recognize 等选项，
 * 直接从 river 节点演，选不同选项，确认结果节点可达。
 */
{
  const riverCases: Array<{ pick: string; node: string; label: string }> = [
    { pick: 'watch', node: 'watched', label: 'watch → watched' },
    { pick: 'approach', node: 'approached', label: 'approach → approached' },
    { pick: 'leave', node: 'left', label: 'leave → left' },
  ]

  for (const { pick, node, label } of riverCases) {
    stage()
    const walked = playFrom('river', (opts) => (opts.includes(pick) ? pick : opts[0]!))
    if (!walked.includes(node)) {
      console.log(`  ✗ river ${label}：没走到（走过 ${walked.join(' → ')}）。`)
      bad += 1
    } else {
      console.log(`  ✓ river ${label}：走到了。`)
    }
  }
}

/**
 * 四、条件层：**两张分流表，不同的人去了不同的地方吗**。
 *
 * 上面那几条问的是「走得到吗」——把 `meetsAll` 整个改成恒真，
 * **它们纹丝不动**（2026-09-12 打断实测）。
 *
 * 这一卷有两张分流表，从前一张也没人验：
 *
 *     open        按身份分   落难的 / 宗室 / 护送出身
 *     approached  按物件分   薄册 / 怪根 / 货郎那本假书 / 身上带着邪气
 *
 * 第二张尤其要紧：**他看的是你，不是你想让他看的东西**——
 * 身上揣着什么，这一眼就定了这一卷的结局。四条各有各的落点，
 * 而「走得到吗」那类判据对它们一视同仁。
 *
 * 摆局用 `scripts/lib/forking.ts`：它自带兜底那一条的验证
 * （`node.next` 没有 `requires`，逐档那一圈碰不到它，
 * 而分流表里再加一档它就永远轮不到了）。
 */
{
  /**
   * 照一条条件摆局。摆不出来回 `false`——**那不是失败，是这一档我摆不了**。
   *
   * 只认这一卷真用到的那几格：身份、营生、物件、旗。
   * 认不出的格子一律回 `false`，宁可少验一档，也不要摆一个自以为对的局
   * ——摆歪了的局报出来的红，指的是内容，而错在摆局的人。
   */
  function put(requires: readonly Condition[]): boolean {
    stage()
    const world = useWorldStore()
    const household = useHouseholdStore()
    const character = useCharacterStore()
    for (const one of requires) {
      if (one.station !== undefined) {
        household.station = one.station
        continue
      }
      if (one.livelihood !== undefined) {
        household.livelihood = one.livelihood
        continue
      }
      if (one.item !== undefined) {
        // `carry` 才是入口（`effects.ts` 的 `case 'item'` 走的也是它）。
        // 名字只在面板上显示，这里给一个够用的
        character.carry(one.item, one.item, 1, '件')
        continue
      }
      if (one.flag?.key !== undefined && one.flag.equals === undefined) {
        world.setFlag(one.flag.key, true)
        continue
      }
      return false // 这一格我不会摆
    }
    return true
  }

  for (const node of ['open', 'approached'] as const) {
    const report = checkForking(SCENE, put, node)
    if (report.faults.length > 0) {
      const real = report.faults.filter((one) => !one.startsWith('·'))
      const skipped = report.faults.filter((one) => one.startsWith('·'))
      for (const line of skipped) console.log(`      ${line}`)
      if (real.length > 0) {
        console.log(`  ✗ ${node} 分流：验了 ${report.checked} 档，${real.length} 处不对。`)
        for (const line of real) console.log(`      ${line}`)
        bad += real.length
      } else {
        console.log(`  ✓ ${node} 分流：验了 ${report.checked} 档，都去了对的那一节。`)
      }
    } else {
      console.log(`  ✓ ${node} 分流：验了 ${report.checked} 档，都去了对的那一节。`)
    }
    if (report.checked === 0) {
      console.log(`  ✗ ${node} 分流：一档也没验到——这一条什么也没量。`)
      bad += 1
    }
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
    console.log(`  ✓ 尺子自检：走了 ${walked.length} 节（${walked.slice(0, 4).join(' → ')}…）。`)
  }
}

/**
 * 效果层：**渡口那一刻你做了什么、想起什么，落下的不是同一样东西**。
 *
 * 上面那几条验的是「各入场路线走得到 river」和「两张分流表」——
 * **把 `applyEffects` 整个改成空转，它们纹丝不动**（2026-09-12 B 刀实测）。
 *
 * `river` 那一节六条选项各有各的收成：
 *
 *     shake          心志 +6、见识 +2，落「甩开了护卫」的旗
 *     recognize      见识 +4                     认出他是什么人
 *     recall-warning 心志 +5、见识 +2            想起有人警告过
 *     recall-tale    见识 +4                     想起听过的传闻
 *     recall-breath  见识 +3、心志 +2            想起那套呼吸法
 *
 * ## 三条「想起」落的不是同一样
 *
 * 想起警告的长心志（他忍住了），想起传闻的长见识（他对上了），
 * 想起呼吸法的两样都长一点——**同一个渡口，想起什么决定他带走什么**。
 *
 * 判「几条互不相同」不判「shake 正好 +6」；
 * `shake` 那面旗单独判——**它是这一卷唯一留到后头的痕迹**。
 */
{
  interface Took {
    insight: number
    will: number
    slipped: boolean
  }

  /**
   * ⚠️ **那几条选项各有各的前提，摆不齐就点不到。**
   *
   *     recall-warning  听说过修士 + 护送出身
   *     recall-tale     知识「说书人讲的那一段」
   *
   * 不摆齐前提，`pick` 会**静默落空**（`playFrom` 里
   * `open.find(...) ?? open[0]!` 那个兜底点第一条），
   * 判据报「想起警告该长心志，实际 0」——**而他想起的是别的事**。
   *
   * 「摆局缺一格」今天第四次（house 的铺子、dearth 的念书、
   * attempt 的 read、这一处）。
   */
  function tookBy(pick: string): Took {
    setActivePinia(createPinia())
    beOf('escort') // 护送出身：recall-warning 那一条要它
    useHouseholdStore().standing = 40
    const world = useWorldStore()
    world.advanceTime({ years: 20 })
    world.setFlag('heard-of-cultivators', true)
    /*
     * `shake`（甩开护卫）只有**还没塌墙的宗室**看得见（`riverman.ts:323`
     * 那段注释：「连走上前去看一眼，他都要比农户的儿子多花一道功夫」）。
     * 那一条要的就是这面旗。三条选项的前提摆在一起互不冲突。
     */
    world.setFlag('guarded', true)
    const character = useCharacterStore()
    applyEffects([
      {
        type: 'knowledge',
        id: 'immortal-tale',
        title: '说书人讲的那一段',
        summary: '庙会上听过一段。',
        contact: '听说',
        category: '修行',
      },
    ])
    const before = { ...character.attributes }
    const walked = playFrom('river', (opts) => (opts.includes(pick) ? pick : opts[0]!))
    void walked
    return {
      // 记增量：每次摆局各起各的 pinia，属性起手是现掷的
      insight: character.attributes.insight - before.insight,
      will: character.attributes.will - before.will,
      slipped: world.getFlag('slipped-the-guards') === true,
    }
  }

  const shake = tookBy('shake')
  const warning = tookBy('recall-warning')
  const tale = tookBy('recall-tale')

  const wrong: string[] = []
  if (!shake.slipped) wrong.push('甩开了护卫，却没落下那面旗——这一卷唯一留到后头的痕迹丢了')
  if (warning.slipped) wrong.push('只是想起有人警告过，却落了「甩开护卫」那面旗')
  if (warning.will <= 0) wrong.push(`想起有人警告过该长心志（他忍住了），实际 ${warning.will}`)
  if (tale.insight <= 0) wrong.push(`想起听过的传闻该长见识（他对上了），实际 ${tale.insight}`)
  if (warning.will === tale.will && warning.insight === tale.insight) {
    wrong.push('想起警告和想起传闻落下同样的东西——那一节几条「想起」没有分别')
  }

  if (wrong.length > 0) {
    console.log(`  ✗ river 效果层：${wrong.length} 处不成立。`)
    for (const one of wrong) console.log(`      ${one}`)
    bad += wrong.length
  } else {
    console.log(
      `  ✓ river 效果层：甩开护卫心志 +${shake.will} 且落了旗；` +
        `想起警告 +${warning.will} 心志、想起传闻 +${tale.insight} 见识——各带走各的。`,
    )
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  渡口那一卷：各路人走到了，as-apprentice 正文干净，那一刻也各带走各的。\n')
}
