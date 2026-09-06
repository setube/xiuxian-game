/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 这一步是从哪儿来的。
 *
 * 20.md 那条最高级硬规则：
 *
 * > **任何重大事实、身份、关系、性格、立场和人生方向的变化，都必须存在
 * > 可追溯的前置经历和时间过程；不存在无来源的状态跳转。**
 *
 * 这一支只守这条规则的**第一个可验片段**：身份变了，年表里得有一笔。
 *
 * ## 为什么判「年表有没有记」，而不是判「有没有前置旗标」
 *
 * 因为查旗标是查不出问题的：内容作者写了旗标就过，**而那个旗标本身
 * 可能就是凭空打的**。判据往上多问一层没有尽头，总有一层是没人验的。
 *
 * 年表不一样——它是**写给玩家看的那句话**。「你承了户」「父亲被削了爵」
 * 「家里借了钱，送你进了私塾」，每一笔都是这一生里真的发生过、
 * 并且玩家真的读到过的事。身份变了而年表一个字没有，意味着
 * **玩家眼前这个人换了个身份，而他这辈子没有任何一件事解释得了它**。
 *
 * 20.md 自己也是这么要求的：不规定「必须经过这六步」，
 * 只要求「必须存在一条真实、合理、可解释的因果路径」。
 *
 * ## 这支抓不住什么，写明在这里
 *
 * 它只看**身份**这一格，不看关系、性格、愿望、婚姻。理由是那几格
 * 要么还没有（婚姻、人格），要么变化本身没有明确的时刻（关系是渐变的）。
 * 身份是现在唯一一个「一步跳过去、且跳的那一刻可采样」的东西。
 *
 * 它也不判年表那一笔**说得对不对**——「你承了户」这句话跟身份变成家主
 * 是不是同一件事，机器分不出。它只判**有没有**。
 * 宁可漏，不可误报：这一层再往里做就得读文本，而那是人的活。
 *
 * 跑法：bun scripts/whence.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'

/** 走多少世。身份一生变不了几次，得多走几世才采得到足够多的变化 */
const RUNS = 200

interface Jump {
  from: string
  to: string
  scene: string
  age: number
}

/**
 * 判据本身。**写成函数，是为了底下第三条能喂它坏数据。**
 *
 * 一次身份变化是「有来源的」，当且仅当同一步里年表也长了。
 */
function unexplained(changed: boolean, chronicleGrew: boolean): boolean {
  return changed && !chronicleGrew
}

const jumps: Jump[] = []
/** 一共采到多少次身份变化。没有这个数，第一条会在「一次也没变过」时照样打勾 */
let changes = 0

for (let i = 0; i < RUNS; i += 1) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const character = useCharacterStore()
  const world = useWorldStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })

  story.begin()

  /*
   * 出生那一卷设的头一个身份不算跳转——那不是「变成了什么」，
   * 是「他本来就是什么」。所以基线从 `begin()` 之后取。
   */
  let identity = character.identity
  let chronicled = world.chronicle.length
  let turns = 0

  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((one) => !one.locked)
    if (open.length === 0) break

    const scene = narrative.sceneId ?? '?'
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1

    const now = character.identity
    const grew = world.chronicle.length > chronicled
    if (now !== identity) {
      changes += 1
      if (unexplained(true, grew)) {
        jumps.push({ from: identity, to: now, scene, age: character.age })
      }
    }
    identity = now
    chronicled = world.chronicle.length
  }
}

console.log(`\n=== 这一步是从哪儿来的（${RUNS} 世）===\n`)

let bad = 0

/**
 * 一、身份变了，年表里得有一笔。
 *
 * 报错时把「从什么变成什么、在哪一卷、那年几岁」全打出来——
 * **说不说得通只有人能判断**，门禁能做的是把可疑的那几处挑出来给人看，
 * 不是替人下结论。这一条跟 `shadow.ts` 那句「判不出来和没问题是两回事」
 * 是同一种自觉。
 */
{
  const unique = new Map<string, Jump>()
  for (const one of jumps) unique.set(`${one.from}→${one.to}:${one.scene}`, one)

  if (unique.size > 0) {
    console.log(`  ✗ ${unique.size} 种身份变化，这一生里没有一件事解释得了它：`)
    for (const [, one] of [...unique].slice(0, 8)) {
      console.log(`      ${one.scene}（${one.age} 岁）：${one.from} → ${one.to}，年表无记载`)
    }
    bad += 1
  } else {
    console.log(`  ✓ 采到 ${changes} 次身份变化，每一次年表里都留下了那一笔。`)
  }
}

/**
 * 二、尺子自检：这一批世里身份真的变过。
 *
 * 缺了它，第一条会在「谁的身份都没变过」时照样打勾——
 * **没查到和查过了长得一模一样。**
 */
{
  if (changes === 0) {
    console.log(`  ✗ ${RUNS} 世里没有一个人的身份变过——这一条什么也没量。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：${changes} 次身份变化确实发生了，判据量到了东西。`)
  }
}

/**
 * 三、尺子自检：喂坏数据抓得到，喂对的放得过。
 *
 * 前两条都绿时印出来的是「库里的身份变化都有来源」，而那句话有两种成因：
 * 判据管用而内容干净，或者判据根本抓不到东西。两种印出来一模一样。
 */
{
  const checks: readonly { changed: boolean; grew: boolean; want: boolean; why: string }[] = [
    { changed: true, grew: false, want: true, why: '身份变了而年表没长——这正是要抓的' },
    { changed: true, grew: true, want: false, why: '身份变了且年表记了一笔，有来源' },
    { changed: false, grew: false, want: false, why: '什么都没变，不该报' },
    { changed: false, grew: true, want: false, why: '年表长了但身份没变，跟这一条无关' },
  ]

  const broken = checks.filter((one) => unexplained(one.changed, one.grew) !== one.want)

  if (broken.length > 0) {
    console.log(`  ✗ 尺子自己坏了 ${broken.length} 处：`)
    for (const one of broken) console.log(`      ${one.why}`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：无来源的跳转抓得到，有来源的和没变的都放得过。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  人生不是状态跳转，是连续的因果过程。\n')
}
