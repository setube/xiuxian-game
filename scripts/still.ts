/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 静功与侄子——still 和 nephew 各卷走得到吗。
 *
 * `still.ts` 里一个场景：
 *   still:practice  静功练习（open/thirty/forty 三个节点，按年龄分档）
 *
 * `nephew.ts` 里三个场景：
 *   nephew:restless  侄子坐不住了（why-restless/why-hungry/stand 等分叉）
 *   nephew:goes      侄子要走（blessed/defiant/allowed 等分叉）
 *   nephew:mend      侄子和好了
 *
 * 核心判据：
 * 一、still:practice 走进去了
 * 二、nephew:restless 各关键节点可达
 * 三、nephew:goes 走进去了
 * 四、nephew:mend 走进去了
 * 五、尺子自检：四卷各自都走进去了
 *
 * 跑法：bun scripts/still.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { useHouseholdStore } from '../src/stores/household'
import { useWorldStore } from '../src/stores/world'
import { usePeopleStore } from '../src/stores/people'
import type { Choice, SceneNode, Condition, Temper } from '../src/types/game'
import { forkingOf } from './lib/forking'
import { beOf } from './origin'

function stage(age = 25): void {
  setActivePinia(createPinia())
  beOf('farm')
  const household = useHouseholdStore()
  household.standing = 40
  const world = useWorldStore()
  world.advanceTime({ years: age })
}

function enrollNephew(): void {
  const people = usePeopleStore()
  const world = useWorldStore()
  people.enroll({
    id: 'nephew',
    surname: '江',
    given: '小',
    gender: '男',
    bornYear: world.time.year - 18,
    bornMonth: 3,
    temper: '木讷',
    health: 72,
    place: world.place,
    fate: '在',
    history: [],
  })
  people.bind('me', 'nephew', '亲戚')
}

function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 20,
): string[] {
  const s = lifeScenes[scene]
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

function play(scene: string, pick: (options: string[]) => string = (opts) => opts[0]!): string[] {
  return playFrom(scene, lifeScenes[scene]?.entry ?? 'open', pick)
}

console.log('\n=== 静功与侄子——四卷各自走得到吗 ===\n')

let bad = 0

/**
 * 一、still:practice（静功练习）。
 */
{
  stage(25)
  const walked = play('still:weighing')
  if (walked.length === 0) {
    console.log('  ✗ still:practice：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ still:practice：走进去了，走了 ${walked.length} 步（${walked.join(' → ')}）。`)
  }
}

/**
 * 二、nephew:restless（侄子坐不住了）。
 *
 * 关键节点：why-restless/why-hungry/stand 等。
 */
{
  const SCENE = 'nephew:restless'

  stage(40)
  enrollNephew()
  const walked = play(SCENE)
  if (walked.length === 0) {
    console.log('  ✗ nephew:restless：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:restless：走进去了，走了 ${walked.length} 步。`)
  }

  // stand 节点可达（侄子想站出去）
  stage(40)
  enrollNephew()
  const standWalked = playFrom(SCENE, 'stand')
  if (standWalked.length === 0) {
    console.log('  ✗ nephew:restless stand：节点不存在或场景 id 打错。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:restless stand：节点有内容，走了 ${standWalked.length} 步。`)
  }
}

/**
 * 三、nephew:goes（侄子要走）。
 */
{
  stage(40)
  enrollNephew()
  const walked = play('nephew:goes')
  if (walked.length === 0) {
    console.log('  ✗ nephew:goes：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:goes：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 四、nephew:mend（侄子和好了）。
 */
{
  stage(40)
  enrollNephew()
  const walked = play('nephew:mend')
  if (walked.length === 0) {
    console.log('  ✗ nephew:mend：走了零步——场景 id 打错或库里没挂上。')
    bad += 1
  } else {
    console.log(`  ✓ nephew:mend：走进去了，走了 ${walked.length} 步。`)
  }
}

/**
 * 五、尺子自检：四卷各自都走进去了。
 */
{
  const cases: Array<{ scene: string; age: number }> = [
    { scene: 'still:weighing', age: 25 },
    { scene: 'nephew:restless', age: 40 },
    { scene: 'nephew:goes', age: 40 },
    { scene: 'nephew:mend', age: 40 },
  ]
  let allIn = true
  for (const { scene, age } of cases) {
    stage(age)
    enrollNephew()
    const walked = play(scene)
    if (walked.length === 0) {
      console.log(`  ✗ 尺子自检：${scene} 走了零步——场景 id 打错或库里没挂上。`)
      bad += 1
      allIn = false
    }
  }
  if (allIn) console.log('  ✓ 尺子自检：四卷各自都走进去了。')
}

/**
 * 五、条件层：**侄儿要走那一天，七条路各归各的人**。
 *
 * 上面那几条问的是「走了零步吗」——`meetsAll` 恒真它们纹丝不动
 * （2026-09-12 打断实测）。
 *
 * `nephew:goes` 的入口是全库最密的一张分流表：**七档，条件两两组合**，
 * 而**顺序就是全部含义**：
 *
 *     胆子大 + 爹宽厚        → blessed       爹放他走
 *     胆子大                 → defiant       他自己走了
 *     老实 + 我替哥说过话    → stays-quiet   他没吭声
 *     爹宽厚                 → blessed       ← 排在第三条后面，所以这一条
 *                                              只轮得到「爹宽厚而侄儿老实」
 *     爹精明 + 我替侄儿说过  → allowed
 *     爹精明 + 家里饿过      → allowed
 *     老实                   → stays-quiet
 *     （都不是）             → stays-sour
 *
 * 第四条跟第一条同一个去处，**而它们的区别全在顺序上**。
 * 两条对调，「胆子大而爹精明」的孩子会走 `blessed`——他爹根本没松口。
 *
 * ## ⚠️ 旧摆局只立侄儿，哥一个字没有
 *
 * `enrollNephew` 立的是侄儿，性情写死「木讷」，而**哥从来没立过**
 * ——四条问哥性情的分支（`LENIENT_FATHER`/`COUNTING_FATHER`）
 * `temper` 那一格取不到人，**一次也不成立**。
 * 摆局少一个人，三分之二的分流验不了，而判据问的是别处。
 */
{
  const SCENE = 'nephew:goes'
  const fork = forkingOf(SCENE, lifeScenes[SCENE]?.entry ?? 'open')
  const fallback = fork?.fallback

  if (fork === null || fallback === undefined) {
    console.log(`  ✗ 尺子自检：${SCENE} 找不到分流或兜底——结构变了。`)
    bad += 1
  } else {
    const targets = [...fork.branches.map((one) => one.to), fallback]
    const landedOn = (walked: readonly string[]): string | undefined =>
      walked.find((one) => targets.includes(one))

    /**
     * 立一个人，连性情一起立。
     *
     * ⚠️ **`enroll` 对已经在册的人不改写**，而新开一个 pinia 就已经立完基了
     * （父母、兄弟、东西邻都在）——`stage()` 之后 `brother` 多半已经存在，
     * 于是我摆的性情**静默落空**：兜底局里我摆「暴躁」，实际是引擎掷的「木讷」，
     * 而木讷恰好命中第四条分支，判据报「该落兜底却落在 blessed」。
     *
     * 所以 `enroll` 之后再 `amend` 一次，把性情按死。
     * （这跟「`beOf` 摆户籍不立人」是同一族的另一面：**它有时反而已经立了人**。）
     */
    function enrol(id: string, temper: Temper, older: number): void {
      const people = usePeopleStore()
      const world = useWorldStore()
      people.enroll({
        id,
        surname: '江',
        given: id === 'brother' ? '大' : '小',
        gender: '男',
        bornYear: world.time.year - older,
        bornMonth: 3,
        temper,
        health: 72,
        place: world.place,
        fate: '在',
        history: [],
      })
      // 已经在册的人 `enroll` 不改写，补一刀 `amend` 把性情按死
      people.amend(id, { temper })
      people.bind('me', id, id === 'brother' ? '兄' : '亲戚')
    }

    /**
     * 照一条分支的条件摆局。摆不出来回 `false`。
     *
     * 两个人的性情都要摆：一条只问侄儿的分支，哥的性情也得是**确定**的，
     * 否则它恰好落进别的分支里，验出来的是另一档。
     * 所以先给两人各摆一个「不满足任何 temper 条件」的底，再按条件覆盖。
     */
    function put(requires: readonly Condition[]): boolean {
      stage(40)
      // 底：两人性情都取不在任何一档里的那个（`精明`在 COUNTING_FATHER 里，
      // 所以哥的底用 `暴躁`——它只在 BOLD 那一族，而那一族问的是侄儿）
      enrol('brother', '暴躁', 45)
      enrol('nephew', '谨慎', 18)
      const people = usePeopleStore()
      const world = useWorldStore()
      for (const one of requires) {
        if (one.temper?.id !== undefined && one.temper.in !== undefined) {
          const want = one.temper.in[0]
          if (want === undefined) return false
          people.amend(one.temper.id, { temper: want })
          continue
        }
        if (one.flag?.key !== undefined && one.flag.equals === undefined) {
          world.setFlag(one.flag.key, true)
          continue
        }
        return false
      }
      return true
    }

    let checked = 0
    let wrong = 0
    for (const branch of fork.branches) {
      if (!put(branch.requires)) {
        console.log(`  ·  该去 ${branch.to} 的那一档摆不出局，没验。`)
        continue
      }
      checked += 1
      const landed = landedOn(playFrom(SCENE, fork.node))
      if (landed !== branch.to) {
        const how = branch.requires
          .map((c) => (c.temper ? `${c.temper.id}${c.temper.in?.[0]}` : (c.flag?.key ?? '?')))
          .join('+')
        console.log(`  ✗ 侄儿要走〔${how}〕：该落在 ${branch.to}，实际落在 ${landed ?? '没落'}。`)
        bad += 1
        wrong += 1
      }
    }

    // 兜底：两人性情都不在任何一档，旗一面也没有
    if (put([])) {
      checked += 1
      const landed = landedOn(playFrom(SCENE, fork.node))
      if (landed !== fallback) {
        console.log(
          `  ✗ 侄儿要走〔都不沾〕：该落到兜底 ${fallback}，实际落在 ${landed ?? '没落'}。`,
        )
        bad += 1
        wrong += 1
      }
    }

    if (checked === 0) {
      console.log('  ✗ 侄儿要走：一档也没验到——这一条什么也没量。')
      bad += 1
    } else if (wrong === 0) {
      console.log(`  ✓ 侄儿要走：${checked} 档（含兜底）各自落在对的那一节。`)
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  静功与侄子四卷，各自有人走过了。\n')
}
