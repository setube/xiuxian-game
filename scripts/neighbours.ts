/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 东邻西舍的走查。
 *
 * ## 这一支守的是三条拆开的线
 *
 * 用户 2026-09-06 定的：**邻接属于户，关系属于人，空间是独立事实。**
 * 三条线各有各的坏法，这一支分头守：
 *
 *   一、谁家有邻居——住在宫、王府、寺里、没有居所的孩子没有东邻；住在宅里的有两户。
 *       这一条读的是 `world.residence`（地域层立的那一处），不是出身也不是日子
 *   二、户是户——邻接边两头都是真的户，户主在成员里，成员都在人口册上，
 *       邻居不跟自家同姓，东邻西邻不同姓
 *   三、称呼是算出来的——九岁叫「王婶」，三十岁叫「王嫂」，七十岁的她是「王婆婆」；
 *       文书里是「王氏」。同一个人，落纸的字跟着两边的年纪一起变
 *   四、真人生里那一句有人读到——荒年那一卷「{call:east-wife}站在门外」
 *       得真有人读到，读到的字里是「王婶」不是「east-wife」
 *
 * 跑法：bun scripts/neighbours.ts
 */
import './lib/seeded'

import { createPinia, setActivePinia } from 'pinia'

import { houseSurname } from '../src/content/birth'
import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { neighbourCall } from '../src/engine/address'
import { useStory } from '../src/engine/story'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { Adjacency, House, ResidenceKind } from '../src/types/game'

/** 只立基不活下去。一次几毫秒，一千五百次把十一种出身、十种境况都掷到 */
const BIRTHS = 1500
/**
 * 活完整世的至少这么多。荒年那一句要等粮价涨到那一步、东邻主妇还在，
 * 一百二十世里只落两三回——固定一百二十世判「零世读到」，四十次会无故红一次。
 * 所以再往下掷，掷到读到两回为止，封顶四百世。
 */
const LIVES = 120
const LIVES_CAP = 400
const BORROWINGS_WANTED = 2

// ============================================================
// 判据本体
// ============================================================

/** 二、户是户。写成函数，是为了自检能拿坏数据喂它 */
function faultsOfHouses(
  houses: Readonly<Record<string, House>>,
  adjacent: readonly Adjacency[],
  roster: ReadonlySet<string>,
  ownSurname: string,
): string[] {
  const faults: string[] = []
  for (const edge of adjacent) {
    if (edge.a === edge.b) faults.push(`${edge.a} 跟自己相邻`)
    for (const end of [edge.a, edge.b]) {
      if (!houses[end]) faults.push(`邻接边指着一户不存在的「${end}」`)
    }
  }
  const surnames = new Set<string>()
  for (const house of Object.values(houses)) {
    // 自家那一户（`home`）姓当然跟自家同；户主在成员里这一条对它也成立
    const own = house.id === 'home'
    if (!house.members.includes(house.head)) faults.push(`${house.id} 的户主不在自家成员里`)
    for (const id of house.members) {
      if (!roster.has(id)) faults.push(`${house.id} 的成员 ${id} 不在人口册上`)
    }
    if (!own && house.surname === ownSurname) faults.push(`${house.id} 跟自家同姓「${ownSurname}」`)
    if (surnames.has(house.surname)) faults.push(`两户邻居都姓「${house.surname}」`)
    surnames.add(house.surname)
  }
  return faults
}

// ============================================================
// 一、二：一千五百次立基
// ============================================================
console.log(`\n=== 东邻西舍（立基 ${BIRTHS} 次 / 活完 ${LIVES} 世）===\n`)

let bad = 0

type Kind = ResidenceKind
const byKind = new Map<Kind, { lives: number; wrong: number }>()
const houseFaults: string[] = []

for (let i = 0; i < BIRTHS; i += 1) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  useNarrativeStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  // 照住处分：脚下那一处是宅、宫、王府、寺，还是没有居所。
  // 这一格现在是世界里的真事（`world.residence`），不再从出身境况猜
  const kind = world.residenceKind()
  const count = people.neighbourHouses().length
  const expected = kind === '宅' ? 2 : 0
  const slot = byKind.get(kind) ?? { lives: 0, wrong: 0 }
  slot.lives += 1
  if (count !== expected) slot.wrong += 1
  byKind.set(kind, slot)

  houseFaults.push(
    ...faultsOfHouses(
      people.houses,
      people.adjacent,
      new Set(Object.keys(people.roster)),
      houseSurname(people),
    ),
  )
}

{
  console.log('  住处　　　　立基次数　邻户数不对的')
  const missing: Kind[] = []
  for (const kind of ['宅', '宫', '王府', '寺', '无'] as const) {
    const slot = byKind.get(kind)
    if (!slot) {
      missing.push(kind)
      continue
    }
    console.log(
      `    ${kind.padEnd(10)}${String(slot.lives).padStart(6)}${String(slot.wrong).padStart(10)}`,
    )
  }
  const wrong = [...byKind.values()].reduce((sum, slot) => sum + slot.wrong, 0)
  if (missing.length > 0) {
    console.log(`  ✗ 一、${BIRTHS} 次立基没掷到 ${missing.join('、')}，这一条没验全。`)
    bad += 1
  } else if (wrong > 0) {
    console.log(
      `  ✗ 一、${wrong} 次立基的邻户数不对——住在户里的该有两户，皇城／王府／寺／路上该一户没有。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 一、住在宅里的两户邻居，宫、王府、寺里、没有居所的一户也没有。`)
  }
}

if (houseFaults.length > 0) {
  console.log(`  ✗ 二、户不像户，${houseFaults.length} 处，例如：`)
  for (const one of [...new Set(houseFaults)].slice(0, 4)) console.log(`      ${one}`)
  bad += 1
} else {
  console.log(`  ✓ 二、邻接边两头都是真的户，户主在成员里，成员都在册，邻居不跟自家同姓。`)
}

// ============================================================
// 三：称呼是算出来的
// ============================================================
{
  const she = { surname: '王', gender: '女' as const }
  const he = { surname: '周', gender: '男' as const }
  const cases: { got: string; want: string; why: string }[] = [
    { got: neighbourCall(she, 35, 9, '家常'), want: '王婶', why: '九岁孩子叫三十五岁的邻妇' },
    { got: neighbourCall(she, 35, 30, '家常'), want: '王嫂', why: '三十岁的人叫三十五岁的邻妇' },
    { got: neighbourCall(she, 70, 30, '家常'), want: '王婆婆', why: '三十岁的人叫七十岁的邻妇' },
    { got: neighbourCall(he, 40, 9, '家常'), want: '周叔', why: '九岁孩子叫四十岁的邻人' },
    { got: neighbourCall(he, 40, 30, '家常'), want: '老周', why: '三十岁的人叫四十岁的邻人' },
    { got: neighbourCall(he, 62, 9, '家常'), want: '周老爹', why: '九岁孩子叫六十二岁的邻人' },
    { got: neighbourCall(she, 35, 9, '礼上'), want: '王氏', why: '文书里写她' },
    { got: neighbourCall(he, 8, 9, '家常'), want: '周家的', why: '叫邻家的孩子——名字要玩过才知道' },
  ]
  const wrong = cases.filter((c) => c.got !== c.want)
  if (wrong.length > 0) {
    console.log(`  ✗ 三、称呼算错 ${wrong.length} 处：`)
    for (const c of wrong) console.log(`      ${c.why}：得到「${c.got}」，该是「${c.want}」`)
    bad += 1
  } else {
    console.log(
      `  ✓ 三、${cases.length} 种叫法各归各：谁在叫、叫谁、多大、什么场合，四维都在起作用。`,
    )
  }
}

// ============================================================
// 四：真人生
// ============================================================
interface Lived {
  hasEastWife: boolean
  callAtBirth: string | null
  callAtDeath: string | null
  /** 荒年那一句落纸的样子 */
  borrowing: string | null
  /** 邻居的称呼里有没有英文或 id */
  leaked: string[]
}

const lives: Lived[] = []
const borrowingsSoFar = (): number => lives.filter((l) => l.borrowing !== null).length
while (
  lives.length < LIVES ||
  (borrowingsSoFar() < BORROWINGS_WANTED && lives.length < LIVES_CAP)
) {
  setActivePinia(createPinia())
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  const hasEastWife = people.personOf('east-wife') !== undefined
  const callAtBirth = hasEastWife ? people.callOf('east-wife') : null

  let borrowing: string | null = null
  let seen = 0
  let turns = 0
  while (!narrative.ended && turns < 200) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    turns += 1
    for (const item of narrative.stream.slice(seen)) {
      const text = item.block.text
      if (text && text.includes('还有没有余粮') && borrowing === null) borrowing = text
    }
    seen = narrative.stream.length
  }

  const leaked: string[] = []
  for (const house of people.neighbourHouses()) {
    for (const id of house.members) {
      const call = people.callOf(id)
      if (/[A-Za-z]/.test(call) || call.length === 0) leaked.push(`${id} → 「${call}」`)
    }
  }

  lives.push({
    hasEastWife,
    callAtBirth,
    callAtDeath: hasEastWife && people.isAlive('east-wife') ? people.callOf('east-wife') : null,
    borrowing,
    leaked,
  })
}

{
  const withWife = lives.filter((l) => l.hasEastWife)
  const birthWrong = withWife.filter(
    (l) => !(l.callAtBirth?.endsWith('婶') || l.callAtBirth?.endsWith('婆婆')),
  )
  const deathWrong = withWife.filter(
    (l) =>
      l.callAtDeath !== null && !(l.callAtDeath.endsWith('嫂') || l.callAtDeath.endsWith('婆婆')),
  )
  const borrowed = lives.filter((l) => l.borrowing !== null)
  const rawInText = borrowed.filter((l) => /[{}A-Za-z]/.test(l.borrowing ?? ''))
  const leaked = lives.flatMap((l) => l.leaked)

  console.log(
    `\n  覆盖：${lives.length} 世 / 有东邻主妇的 ${withWife.length} 世 / 荒年那一句读到 ${borrowed.length} 世`,
  )
  if (borrowed.length > 0) console.log(`  那一句落纸的样子：${borrowed[0]!.borrowing}`)

  if (withWife.length === 0) {
    console.log(`  ✗ 四、${lives.length} 世里没有一世有东邻主妇——后面几条根本没被验过。`)
    bad += 1
  } else if (leaked.length > 0) {
    console.log(
      `  ✗ 四、邻居的称呼里露出了英文或 id：${[...new Set(leaked)].slice(0, 3).join('；')}`,
    )
    bad += 1
  } else if (birthWrong.length > 0) {
    console.log(
      `  ✗ 四、${birthWrong.length} 世生下来叫东邻主妇既不是「某婶」也不是「某婆婆」（她可能已经五十多了），例如「${birthWrong[0]!.callAtBirth}」。`,
    )
    bad += 1
  } else if (deathWrong.length > 0) {
    console.log(
      `  ✗ 四、${deathWrong.length} 世到老了还管东邻主妇叫「${deathWrong[0]!.callAtDeath}」——` +
        `称呼没跟着人一起变老。`,
    )
    bad += 1
  } else if (borrowed.length === 0) {
    console.log(
      `  ✗ 四、${lives.length} 世没有一世读到荒年借粮那一句——邻居系统的第一个使用者没人读到。`,
    )
    bad += 1
  } else if (rawInText.length > 0) {
    console.log(`  ✗ 四、荒年那一句落纸时没换干净：${rawInText[0]!.borrowing}`)
    bad += 1
  } else {
    console.log(
      `  ✓ 四、生下来叫「某婶」，老了叫「某嫂」或「某婆婆」；荒年那一句 ${borrowed.length} 世读到，字里没有 id。`,
    )
  }
}

// ============================================================
// 五：尺子自检
// ============================================================
{
  // 「说话的是谁」这一维要是空的，孩子和大人叫出来会是同一个词
  const she = { surname: '王', gender: '女' as const }
  const dimensionLive = neighbourCall(she, 35, 9, '家常') !== neighbourCall(she, 35, 30, '家常')
  // 邻接边指着一户不存在的——第二条必须红
  const caughtGhost =
    faultsOfHouses({}, [{ a: 'home', b: 'east', since: 0 }], new Set(), '沈').length > 0
  // 邻居跟自家同姓——第二条必须红
  const caughtSame =
    faultsOfHouses(
      {
        east: {
          id: 'east',
          surname: '沈',
          head: 'h',
          members: ['h'],
          residence: '村',
          livelihood: '务农',
        },
      },
      [],
      new Set(['h']),
      '沈',
    ).length > 0

  if (!dimensionLive || !caughtGhost || !caughtSame) {
    console.log(
      `  ✗ 尺子自检没通过：说话人这一维${dimensionLive ? '在' : '是空的'}，` +
        `不存在的户${caughtGhost ? '抓到了' : '没抓到'}，同姓${caughtSame ? '抓到了' : '没抓到'}。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：说话人这一维是活的；不存在的户、同姓的邻居，都红在该红的那一条。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  邻接归户，关系归人，相邻是一件独立的事实；她叫什么，看谁在叫。')
  console.log('  **邻居是真人，不是一个 neighborCount。**\n')
}
