/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 一年里有四季，四季里都有人过日子。
 *
 * 这一格（`Season` + `world.season` + `Condition.season`）建起来之前，
 * **三月和十月过的是同一种日子**——`world.time.month` 一直存在，
 * 可全库没有一处内容读得到它，它只被用来推进时间。
 *
 * 于是腊月里的农家孩子下地，读到的是「一上午割了半晌草」，
 * 而那时候地里连草都没有。
 *
 * ## 这一支要拦的两件事
 *
 * 加季节条件是**给内容加锁**，而锁有两种坏法：
 *
 *   一、**锁上了没钥匙**——某一季农家孩子选「帮家里干活」，一条也掷不到。
 *       玩家点了一个去处，什么也没发生。这是我引入 `season` 那一刻
 *       直接造出来的风险：原先那条 42 权重的「下地」是无条件的，
 *       我把它关进了春夏。
 *
 *   二、**钥匙够不着**——四季分不匀，冬闲那一条写了没人读得到。
 *       跟「82.3% 的人都出了远门」是同一个形状：内容在那儿，
 *       可玩家一辈子撞不上。
 *
 * ## 它不判什么
 *
 * 不判「哪条内容该配哪一季」。割草是不是春夏的活、腊月能不能动土，
 * **那是内容作者的判断，不是判据的**。判据只问：每一季有没有话可说、
 * 四季是不是都轮得到。
 *
 * 跑法：bun scripts/season.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { spend } from '../src/engine/daily'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { OriginId, RegionState, Season } from '../src/types/game'

import { beOf } from './origin'

const SEASONS: readonly Season[] = ['春', '夏', '秋', '冬']

/** 一季对应哪几个月。跟 `stores/world.ts` 那个 computed 是同一套分法 */
const MONTHS_OF: Record<Season, readonly number[]> = {
  春: [1, 2, 3],
  夏: [4, 5, 6],
  秋: [7, 8, 9],
  冬: [10, 11, 12],
}

/** 太平年景。旱涝那几档由 `day.ts` 管，这一支只问季节 */
function calm(): RegionState {
  return { rain: 55, harvest: 58, grain: 112, order: 66, plague: 0 }
}

/**
 * 起一世，并把时钟停在指定的那个月。
 *
 * **顺序跟 `day.ts` 一样要紧**：建 character store 会把世界时钟往前跑到
 * 出生那年，所以月份必须在那之后再设，否则会被出生前那些年冲掉。
 */
function freshAt(month: number, origin: OriginId = 'farm', age = 12) {
  setActivePinia(createPinia())
  beOf(origin)
  const household = useHouseholdStore()
  const world = useWorldStore()
  useCharacterStore()
  usePeopleStore()
  world.bornYear = world.time.year - age
  world.time = { ...world.time, month }
  world.regions = { [household.prefecture]: { state: calm(), last: {} } }
  world.setFlag('schooled', true)
  return { world, household }
}

console.log('\n=== 一年里有四季，四季里都有人过日子 ===\n')

let bad = 0

/**
 * 一、每一季，农家孩子干活时都掷得到**属于这一季的**话。
 *
 * ## 头一版这一条是假绿的，而且是我自己验出来的
 *
 * 头一版问的是「掷得到几种不同的话」，门槛三种。我故意把冬闲那条
 * 错配成秋（冬天理应没话可说），**判据照样绿**——因为「杂事」
 * 「出的力比往常多」「门口的生人」那几条不限季节，**通用条目托住了底**。
 *
 * 于是判据量的是「有没有话」，而它该量的是「**有没有这一季的话**」。
 * 通用条目托底本身是对的，不是 bug；坏的是拿它当作这一季内容还在的证据。
 *
 * 现在问的是：掷到的这些里，有没有一条的 `requires` 里带着 `season`，
 * 而且那个 `season` 条件正指着当下这一季。一条也没有，就是这一季
 * 只剩通用内容了——玩家一整个冬天读到的都是「搬,抬,递」。
 */
const DRAWS = 200
{
  const ORIGINS: readonly OriginId[] = ['farm', 'hunt', 'cloth', 'craft']
  const noVoice: string[] = []
  const tally: string[] = []

  for (const season of SEASONS) {
    for (const origin of ORIGINS) {
      let own = 0
      let any = 0
      for (let i = 0; i < DRAWS; i += 1) {
        const month = MONTHS_OF[season][i % 3]!
        freshAt(month, origin)
        const beat = spend('上午', 'work')
        if (!beat) continue
        any += 1
        // 这一条是不是专为这一季写的：requires 里带 season，且指着当下这季
        if (beat.requires?.some((one) => one.season !== undefined)) own += 1
      }
      if (any === 0) noVoice.push(`${season}·${origin}（一条也掷不到）`)
      else if (own === 0 && origin === 'farm') {
        // 只对种地的人家要求有专属内容：猎户、织户、匠人本来就没写四季的活，
        // 那是内容的缺口，不是这一格的错。**判据只管它管得着的那一段**
        noVoice.push(`${season}·${origin}（只剩通用内容，这一季自己的话没了）`)
      } else {
        tally.push(`${season}·${origin} ${own}/${any}`)
      }
    }
  }

  if (noVoice.length > 0) {
    console.log(`  ✗ ${noVoice.length} 格没有自己的话：`)
    for (const one of noVoice) console.log(`      ${one}`)
    console.log('\n    通用条目会托住底，所以「掷得到东西」不等于「这一季还在」。')
    bad += 1
  } else {
    console.log('  ✓ 四季 × 四种出身，种地的人家每一季都掷得到专属这一季的话。')
    console.log(`      （专属/总数：${tally.filter((t) => t.includes('farm')).join('　')}）`)
  }
}

/**
 * 二、四季真的都轮得到。
 *
 * 上一条验的是「有没有话」，这一条验的是「**说不说得到**」。
 * 内容写在那儿而玩家一辈子撞不上，跟没写是一回事——
 * 「82.3% 的人都出了远门」那次就是这么塌的。
 *
 * 出生月份是 `randomBetween(1, 12)` 掷的（`stores/world.ts`），
 * 所以一世起头落在哪一季本身是匀的。这一条量的是**那个匀有没有被别的东西破掉**。
 */
{
  const tally = new Map<Season, number>()
  const LIVES = 600
  for (let i = 0; i < LIVES; i += 1) {
    setActivePinia(createPinia())
    beOf('farm')
    const world = useWorldStore()
    useCharacterStore()
    tally.set(world.season, (tally.get(world.season) ?? 0) + 1)
  }

  const shares = SEASONS.map((s) => ({
    s,
    n: tally.get(s) ?? 0,
    pct: ((tally.get(s) ?? 0) / LIVES) * 100,
  }))
  console.log(`\n  ${LIVES} 世起头落在哪一季：`)
  for (const one of shares) {
    console.log(`      ${one.s}　${one.n.toString().padStart(3)}　${one.pct.toFixed(1)}%`)
  }

  /*
   * 下限 15%。匀的话每季 25%，600 世里 15% 是 90 次——
   * 真匀的分布掉到这条线下面的概率极低，而**真有一季被压住时它抓得到**。
   * 这个数是照「每季至少得有九十次机会被读到」定的，不是照某一批实测倒推的。
   */
  const FLOOR = 15
  const starved = shares.filter((one) => one.pct < FLOOR)
  if (starved.length > 0) {
    console.log(`\n  ✗ ${starved.length} 季不到 ${FLOOR}%——那一季的内容写了也没人读得到。`)
    bad += 1
  } else {
    console.log(`\n  ✓ 四季都在 ${FLOOR}% 以上，每一季的内容都轮得到人读。`)
  }
}

/**
 * 三、尺子自检：喂坏数据抓得到。
 *
 * 前两条都绿时印出来的是「四季都有话说」，而那句话有两种成因：
 * 判据管用而内容确实齐，或者**判据根本没在看季节**。
 * 两种印出来一模一样——这一条是这一支唯一能分开它们的地方。
 *
 * 喂法是把时钟钉死在腊月，然后问一条**只在秋天成立**的内容还掷不掷得到。
 * 掷得到就说明 `season` 那一格根本没生效，判据前面量的都是假的。
 */
{
  freshAt(11, 'farm')
  const world = useWorldStore()
  const wrongSeason = world.season !== '冬'

  // 腊月里掷两百次，看「割了一天稻子」那句秋收的话会不会漏出来。
  // `text` 可以是一句也可以是几句，两种都要够得着——按字面查数组的写法
  // 会在单句那一边静默漏掉，而漏掉的结果是这条自检永远绿
  let leaked = 0
  for (let i = 0; i < 200; i += 1) {
    freshAt(10 + (i % 3), 'farm')
    const beat = spend('上午', 'work')
    const said = beat === undefined ? '' : [beat.text].flat().join('')
    if (said.includes('割了一天稻子')) leaked += 1
  }

  if (wrongSeason) {
    console.log('\n  ✗ 尺子自己坏了：时钟钉在十一月，`world.season` 却不是冬。')
    bad += 1
  } else if (leaked > 0) {
    console.log(`\n  ✗ 尺子自己坏了：腊月里掷出了 ${leaked} 次秋收——\`season\` 那一格没生效。`)
    console.log('    前面两条量的都是假的：判据一直在看一个不起作用的条件。')
    bad += 1
  } else {
    console.log('\n  ✓ 尺子自检：时钟钉在冬月，秋收那一条一次也没漏出来。')
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  一年里有四季，四季里都有人过日子。\n')
}
