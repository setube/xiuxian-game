/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一起长大的那个——三卷各自走得到吗，岔口各自有人走到吗。
 *
 * `playmate.ts` 三卷同一个人、三个年纪：
 *
 *   playmate:young   少年一起干的那件事（go → went / later → stayed）
 *   playmate:wed     他成家那年（both / notyet，按你自己成没成家分）
 *   playmate:years   中年还走不走动（close / apart，按 affinity 分）
 *
 * ## 这一支跟我先前那十六支不是同一种门禁
 *
 * 那十六支问的是「选了这个选项，走到那个节点了吗」——而 `next` 写死在内容里，
 * **`meetsAll` 恒真底下一条也不红**（另一个会话的 A 刀实测）。
 * 它们守的是骨架，不是「这一卷会落在对的人生里吗」。
 *
 * 所以这一支的判据分三类，**第二、三类才是条件层**：
 *
 *   一、骨架　　三卷走得进去，各条岔口都有人走到
 *   二、入场　　`family playmate present` 立得起来、撤掉就进不去　　← A 刀要红的
 *   三、岔口　　两个 `branches` 各自**摆两次局**：条件成立走这边、不成立走那边
 *
 * 第三类是要害。一条 `branches` 只验「成立时走对了」等于没验——
 * `next` 那个兜底本来就在，条件整个失效也照样走得到下一节。
 * **两边都摆，才分得出「条件在起作用」和「条件根本没被读」。**
 *
 * ## 还有一条只有真世答得了
 *
 * `playmate:years` 那条 `affinity` 门槛：这一册自己只给得出 8 分
 * （少年跟去 +6、他成亲帮忙 +2）。**摆局验不了这条线画得对不对**——
 * 摆局里我想给多少给多少。所以末尾跑真人生量它的分布。
 *
 * 头一次量就抓到了：那条线原来画在 20，而 200 世里**最高才 8、够到的 0/169**
 * ——`close` 那一支写完就是死的，而所有「走得到吗」的判据照样全绿。
 * 内容层已把门槛改到 6（少年跟没跟他去，正是这一节想分的两种人），
 * 门禁这一头改成守「两支各有各的人走」：全够得着和全够不着都红。
 *
 * 跑法：bun scripts/playmate.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { applyEffects } from '../src/engine/effects'
import { fillString, roleId } from '../src/engine/interpolate'
import { isNearby } from '../src/engine/nearby'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Choice, Condition, SceneNode } from '../src/types/game'

/** 真人生那一问跑多少世。玩伴出现率 84%，三卷窗口合起来盖住 8–70 岁 */
const LIVES = 200

/** 不成立的项数。声明在最前头：底下 CLOSE_AT 那个立即执行的取值也会用它 */
let bad = 0

/**
 * `playmate:years` 分岔那条线画在几分——**从内容里现取，不抄**。
 *
 * 抄一份的话，内容改了门槛而门禁还在守旧数：它会安静地继续绿，
 * 而守的是一个已经不存在的门槛（`ruler-standard-must-come-from-system` 那条）。
 */
const CLOSE_AT = ((): number => {
  const scene = lifeScenes['playmate:years']
  const open = scene?.nodes[scene.entry ?? 'open']
  const cond = open?.branches?.[0]?.requires?.[0]
  const at = cond?.family?.affinity?.atLeast
  if (at === undefined) {
    console.log('  ✗ 尺子自检：从 playmate:years 取不到那条好感门槛——结构变了。')
    bad += 1
    return Number.POSITIVE_INFINITY
  }
  return at
})()

console.log('\n=== 一起长大的那个——三卷走得到吗 ===\n')

// ============================================================
// 摆局：立一户邻居，生一个跟玩家年纪相近的孩子
// ============================================================

/**
 * 摆一局：玩家 `age` 岁，隔壁有一个还在身边的玩伴。
 *
 * ## 不自己造人——掷到有为止
 *
 * ⚠️ 头一版我自己 `enroll` 了一个 `east-child-1`，六次断言里有六次
 * 报「`roleId('playmate')` 认的是 `west-child-1`，不是摆的那个」。
 * 真因是**开一个新 pinia 就已经立完基了**：父母、东西两邻、邻家孩子全在册上。
 * 我摆的那个孩子大玩家一岁，而引擎造的里面有跟玩家同岁的——
 * `gap` 更小，`roleId` 当然挑它。
 *
 * 所以这一版一个人也不造，只**掷到那一世本来就有玩伴为止**。
 * 摆局越接近真实立基越好（`staged-run-skips-engine-steps` 那条）：
 * 自己造的那一户没有引擎造的那些牵连，而判据会把差别算在内容头上。
 *
 * ## 掷不出来要报红，不能安静地一次也不判
 *
 * 上限 `TRIES` 次。掷不出来直接判红——不留这一手的话，哪天玩伴变成必然不在，
 * 这一支会**一次也不判**，而报表上那跟全绿一模一样
 * （`green-report-broken-thing` 里「样本不够它只能沉默」那一种）。
 *
 * 人会老死，所以 `age` 越大越难掷：`playmate:years` 要四十五岁那年他还在。
 */
const TRIES = 200

function stage(age: number): { id: string } | null {
  for (let n = 0; n < TRIES; n += 1) {
    setActivePinia(createPinia())
    const character = useCharacterStore()
    const household = useHouseholdStore()
    const world = useWorldStore()
    const people = usePeopleStore()
    useNarrativeStore()

    world.advanceTime({ years: age })
    household.standing = 40

    const id = roleId('playmate')
    if (id === undefined) continue
    // 逐条断言前提真的立起来了，别让「摆歪了」冒充「内容没走通」
    if (character.age !== age) continue
    if (!people.isAlive(id)) continue
    if (!isNearby(id)) continue
    return { id }
  }
  console.log(`  ✗ 摆局：${TRIES} 次也没掷出「${age} 岁那年玩伴还在」的一世。`)
  bad += 1
  return null
}

function playFrom(
  scene: string,
  from: string,
  pick: (options: string[]) => string = (opts) => opts[0]!,
  stopAfter = 15,
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

/** 这一卷的入场条件 */
function entryOf(eventId: string): readonly Condition[] {
  const found = lifeEvents.find((one) => one.id === eventId)
  if (!found) {
    console.log(`  ✗ 库里没有事件「${eventId}」——id 打错或没注册。`)
    bad += 1
    return []
  }
  return found.requires ?? []
}

// ============================================================
// 一、骨架：三卷走得进去，岔口各自有人走到
// ============================================================
{
  if (stage(10) !== null) {
    const went = play('playmate:young', (opts) => (opts.includes('go') ? 'go' : opts[0]!))
    if (!went.includes('went')) {
      console.log(`  ✗ young went：选了「跟他去」却没走到（走过 ${went.join(' → ')}）。`)
      bad += 1
    } else {
      console.log('  ✓ young went（跟他去）：走到了。')
    }
  }

  if (stage(10) !== null) {
    const stayed = play('playmate:young', (opts) => (opts.includes('later') ? 'later' : opts[0]!))
    if (!stayed.includes('stayed')) {
      console.log(`  ✗ young stayed：选了「让他先走」却没走到（走过 ${stayed.join(' → ')}）。`)
      bad += 1
    } else {
      console.log('  ✓ young stayed（让他先走）：走到了。')
    }
  }
}

// ============================================================
// 二、岔口：两条 branches 各摆两次局，条件成立与不成立各走一边
// ============================================================

/**
 * 他成家那年，按**你**成没成家分两支。
 *
 * 两次局的差别只有一处：有没有配偶。别处一个字不改——
 * 这是「对照组只改一处」那条，改中两处的话两边走不同的路也说明不了什么。
 */
{
  // 你也成了家 → both
  if (stage(24) !== null) {
    const people = usePeopleStore()
    const world = useWorldStore()
    people.enroll({
      id: 'wife',
      surname: '柳',
      given: '巧云',
      gender: '女',
      bornYear: world.time.year - 22,
      bornMonth: 8,
      temper: '温和',
      health: 74,
      place: world.place,
      fate: '在',
      history: [],
    })
    people.bind('me', 'wife', '配偶')
    const both = play('playmate:wed')
    if (!both.includes('both')) {
      console.log(`  ✗ wed both：有配偶却没走到 both（走过 ${both.join(' → ')}）。`)
      bad += 1
    } else {
      console.log('  ✓ wed both（两家都成了家）：走到了。')
    }
  }

  /*
   * 你还没有 → notyet。
   *
   * ⚠️ 掷出来的那一世**可能本来就有配偶**（二十四岁那年多数人已经成家），
   * 那时走 both 是对的，判 notyet 红才是冤枉。所以先问一句再判。
   */
  if (stage(24) !== null) {
    const hasSpouse = meetsAll([{ bond: { kind: '配偶', alive: true } }])
    if (hasSpouse) {
      console.log('  ·  wed notyet：掷出来那一世本来就有配偶，这一次不判（换一颗种子再来）。')
    } else {
      const notyet = play('playmate:wed')
      if (!notyet.includes('notyet')) {
        console.log(`  ✗ wed notyet：没有配偶却没走到 notyet（走过 ${notyet.join(' → ')}）。`)
        bad += 1
      } else {
        console.log('  ✓ wed notyet（你还没成家）：走到了。')
      }
    }
  }
}

/**
 * 中年还走不走动，按 `affinity` 分两支。
 *
 * 同样只差一处：好感给到 20 还是留在那一世本来的数。
 */
{
  // 好感够 → close
  const close1 = stage(45)
  if (close1 !== null) {
    const people = usePeopleStore()
    // 刚好够着再多一点。同样从 CLOSE_AT 算，不写死。
    // `meet` 的 delta 是加法，先看现在多少再补足
    const now = people.known[close1.id]?.affinity ?? 0
    people.meet(close1.id, '邻家的孩子', CLOSE_AT + 4 - now)
    const close = play('playmate:years')
    if (!close.includes('close')) {
      console.log(
        `  ✗ years close：好感 ${CLOSE_AT + 4} 却没走到 close（走过 ${close.join(' → ')}）。`,
      )
      bad += 1
    } else {
      console.log('  ✓ years close（还走动）：走到了。')
    }
  }

  // 好感不够 → apart
  const second = stage(45)
  if (second !== null) {
    const people = usePeopleStore()
    const now = people.known[second.id]?.affinity ?? 0
    /*
     * 差一分就够不着。⚠️ 这个数也从 `CLOSE_AT` 算，不写死——
     * 头一版写死了 8，而内容层把门槛从 20 降到 6 之后 8 就够得着了，
     * 这一条当场红。**判据里的每个数都要跟内容同源**，
     * 否则改内容会红在判据头上，而判据看起来才是坏的那一个。
     */
    people.meet(second.id, '邻家的孩子', CLOSE_AT - 1 - now)
    const apart = play('playmate:years')
    if (!apart.includes('apart')) {
      console.log(
        `  ✗ years apart：好感 ${CLOSE_AT - 1}（差一分够不着）却没走到 apart` +
          `（走过 ${apart.join(' → ')}）。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ years apart（差一分，各走各的）：走到了。`)
    }
  }
}

// ============================================================
// 三、入场：这三卷落在对的人生里吗
// ============================================================

/**
 * 这一类是 A 刀要红的那一类。
 *
 * 问的不是「走得到吗」，是**「没有玩伴的人会不会读到这三卷」**。
 * 摆两次局：有玩伴的必须进得去，没有的必须进不去。
 *
 * ⚠️ `{ family: { id: 'playmate' } }` 里那个 `'playmate'` 是**角色记号**，
 * 不是人口册上的 id。条件层从前不解析它，于是三条入场条件**恒假**、
 * 三卷一卷也演不到，而所有「走得到吗」的判据照样全绿
 * （`conditions.ts` 的 `family` 求值补了 `roleId`，2026-09-12）。
 */
{
  const cases: Array<{ event: string; scene: string }> = [
    { event: 'playmate-young', scene: 'playmate:young' },
    { event: 'playmate-wed', scene: 'playmate:wed' },
    { event: 'playmate-years', scene: 'playmate:years' },
  ]

  for (const { event, scene } of cases) {
    const requires = entryOf(event)
    if (requires.length === 0) continue

    // 有玩伴：进得去
    const at = scene === 'playmate:young' ? 10 : scene === 'playmate:wed' ? 24 : 45
    if (stage(at) === null) continue
    if (!meetsAll(requires)) {
      console.log(`  ✗ ${event} 入场：摆了玩伴却进不去——这一卷在真世里一次也演不到。`)
      bad += 1
      continue
    }

    // 没有玩伴：进不去。只撤掉邻户那一条边，别的一概不动
    usePeopleStore().$patch({ adjacent: [] })
    if (meetsAll(requires)) {
      console.log(`  ✗ ${event} 入场：撤了玩伴还进得去——入场条件没在管事。`)
      bad += 1
    } else {
      console.log(`  ✓ ${event} 入场：有玩伴进得去，没玩伴进不去。`)
    }
  }
}

// ============================================================
// 四、{call:playmate} 落纸的是名字，不是记号也不是「一个陌生人」
// ============================================================
{
  if (stage(10) !== null) {
    const line = fillString('{call:playmate}比你早起，天没亮就在院墙外头喊。')
    if (line.includes('playmate') || line.includes('陌生人')) {
      console.log(`  ✗ {call:playmate} 落纸是「${line}」——没换成人。`)
      bad += 1
    } else {
      console.log(`  ✓ {call:playmate} 落纸：「${line}」`)
    }
  }
}

// ============================================================
// 五、真人生：这三卷演得到吗，那条 affinity 门槛够得着吗
// ============================================================

/**
 * 摆局验不了两件事，只有真世答得了：
 *
 *   一、这三卷在真人生里演到过吗（`gate-must-run-the-real-world` 那条）
 *   二、`affinity atLeast 20` 那条线，走到中年那一刻有几个人够得着
 *
 * 第二问是「拿一生的总数定中途门槛」那个坑的反面：这一册自己只给得出 8 分，
 * 够到 20 的必须在别处跟他有过来往。**够不着就是这一支永远走 apart**，
 * 而那时 `close` 那一节是死的——报表上看不出来，它照样「走得到」。
 */
{
  /**
   * ⚠️ **认这三卷演没演到，看正文不看 `sceneId`。**
   *
   * `playmate:wed` 和 `playmate:years` 没有 `choices`，只有 `branches`——
   * 引擎一步就把它们走完，`sceneId` 在两次 `choose` 之间**从来没停在它们上面**。
   * 拿 `sceneId` 采样这两卷会恒为 0，而那跟「这两卷是死的」印出来一模一样
   * （`festival.ts` 为同一件事绕过四轮，`newyear.ts` 也踩过）。
   *
   * 指纹**从场景库里现取，不手抄**：内容改了字，这支门禁自动跟着改。
   * 手抄的关键词表会安静地不再匹配，而那时它报的是「这一卷没演到」
   * ——一句通顺的假话（`ruler-standard-must-come-from-system` 那条）。
   */
  const SCENES = ['playmate:young', 'playmate:wed', 'playmate:years'] as const

  /** 这一卷入口那句话里，不含占位符的最长一段——拿它当指纹 */
  function fingerprintOf(sceneId: string): string {
    const scene = lifeScenes[sceneId]
    const entry = scene?.nodes[scene.entry ?? 'open']
    const first = entry?.blocks?.find((one) => 'text' in one)
    const text = first !== undefined && 'text' in first ? first.text : ''
    const longest = text
      .split(/\{[^}]*\}/)
      .map((part) => part.replace(/^[。，、]+|[。，、]+$/g, ''))
      .sort((a, b) => b.length - a.length)[0]
    return longest ?? ''
  }

  const prints = new Map<string, string>()
  for (const id of SCENES) {
    const print = fingerprintOf(id)
    if (print.length < 6) {
      console.log(`  ✗ 尺子自检：${id} 取不出指纹（拿到「${print}」）——场景 id 或结构变了。`)
      bad += 1
    }
    prints.set(id, print)
  }

  let lives = 0
  let withPlaymate = 0
  let sawAnyText = 0
  const played = new Map<string, number>()
  const affinities: number[] = []

  for (let i = 0; i < LIVES; i += 1) {
    setActivePinia(createPinia())
    useCharacterStore()
    useHouseholdStore()
    const people = usePeopleStore()
    useWorldStore()
    const narrative = useNarrativeStore()
    const story = useStory(lifeScenes, {
      events: lifeEvents,
      routine: lifeRoutine,
      finale: lifeFinale,
    })
    story.begin()
    lives += 1

    // 收正文用「见过的块 id」，不用下标切片——一步之内可能推进好几块
    const kept = new Set<string>()
    const text: string[] = []
    const drain = (): void => {
      for (const item of narrative.stream) {
        if (kept.has(item.id)) continue
        kept.add(item.id)
        if ('text' in item.block) text.push(item.block.text)
      }
    }
    drain()
    // 对照行：每一世开局那一批正文必然非空（出生章在循环之前就演完了）。
    // 这一条要是红，说明 drain() 这条观测路径坏了，上面所有数一个也不能信
    if (text.length > 0) sawAnyText += 1

    let sawPlaymate = roleId('playmate') !== undefined
    let turns = 0
    while (!narrative.ended && turns < 400) {
      const open = narrative.options.filter((one) => !one.locked)
      if (open.length === 0) break
      story.choose(open[turns % open.length]!.choice)
      turns += 1
      drain()
      if (!sawPlaymate && roleId('playmate') !== undefined) sawPlaymate = true
    }

    if (sawPlaymate) withPlaymate += 1
    const whole = text.join('\n')
    for (const id of SCENES) {
      const print = prints.get(id)
      if (print !== undefined && print.length > 0 && whole.includes(print)) {
        played.set(id, (played.get(id) ?? 0) + 1)
      }
    }

    // 这一世结束时，邻家那个孩子在 known 表里攒到多少好感
    const mate = Object.entries(people.known).find(([key]) => key.includes('child'))
    if (mate) affinities.push(mate[1].affinity)
  }

  if (sawAnyText !== lives) {
    console.log(`  ✗ 对照行：${lives} 世里只有 ${sawAnyText} 世收到了正文——观测路径坏了。`)
    bad += 1
  }

  console.log(`\n  真人生 ${lives} 世，有玩伴的 ${withPlaymate} 世：`)
  for (const id of SCENES) {
    const n = played.get(id) ?? 0
    const pct = ((n / lives) * 100).toFixed(1)
    console.log(`    ${id.padEnd(18)}演到 ${String(n).padStart(3)} 世（${pct}%）`)
    if (n === 0) {
      console.log(`  ✗ ${id}：${lives} 世一次也没演到——这一卷是死的。`)
      bad += 1
    }
  }

  if (affinities.length > 0) {
    const sorted = [...affinities].sort((a, b) => a - b)
    const over = sorted.filter((n) => n >= CLOSE_AT).length
    console.log(
      `\n    邻家孩子的好感：最低 ${sorted[0]}，最高 ${sorted[sorted.length - 1]}，` +
        `够到 ${CLOSE_AT} 的 ${over} / ${sorted.length}`,
    )
    /**
     * ⚠️ **这一条判的是「那条线有人够得着吗」，不是「这一卷走得到吗」。**
     *
     * `playmate:years` 的 `close` 一支要 `affinity atLeast 20`，
     * 而这一册自己只给得出 8 分（少年跟去 +6、他成亲帮忙 +2）。
     * 够到 20 的必须在**别处**跟他有过来往——而库里现在没有那个别处。
     *
     * 头一次实测：**最高 8，够到 20 的 0 / 169**。也就是说 `close` 那一节
     * 在真人生里一个人也读不到，而「走得到吗」那一类判据照样全绿
     * ——摆局里我想给多少给多少。
     *
     * 这是 CLAUDE.md 里「拿一生的总数去定一个中途时刻的门槛」那条的同一形状，
     * 只是这里连一生的总数都够不着。**门槛跟着实测下调到 6**：
     * 少年那一卷跟他去过的人够得着，没去的够不着——那正是这一节想分的两种人。
     *
     * 这一行留着判，是因为**门槛会再次过期**：哪天别处添了跟他来往的内容，
     * 分布整个上移，那时该把线抬回去，而不是让它继续停在一个谁都够得着的数上。
     */
    if (over === 0) {
      console.log(
        `  ✗ years close：${sorted.length} 世里一个人也够不到 ${CLOSE_AT}——` +
          `那一支是死的，摆局验不出来（分布最高才 ${sorted[sorted.length - 1]}）。`,
      )
      bad += 1
    } else if (over === sorted.length) {
      console.log(
        `  ✗ years close：${sorted.length} 世人人都够到 ${CLOSE_AT}——` +
          `门槛形同虚设，apart 那一支才是死的。`,
      )
      bad += 1
    } else {
      console.log(`  ✓ years 那条线：${over} / ${sorted.length} 够得着——两支各有各的人走。`)
    }
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  一起长大的那个人，三个年纪上各自有人见着他了。\n')
}
