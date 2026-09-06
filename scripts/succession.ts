/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
import './lib/seeded'

/**
 * 承户与分家。
 *
 * 跑法：bun scripts/succession.ts
 *
 * ## 守的是什么
 *
 * 用户 2026-09-06 定的下一步：拿一个普通家庭几十年的经济生活压底座
 * （House + Residence + Livelihood + Person），不发明职业系统。这一支分头守：
 *
 *   一、户主不留死人——任何一世任何一年，自家和邻居的户主都是活人；殁了当年就有人接
 *   二、承户讲的是真事——走到承户那一卷时户主确实是我；那面旗记的上一任确实殁了
 *   三、分家分的是户——分出去之后是两户、两处宅、一条邻接边；妻儿跟我，娘和哥留在老屋；
 *       铺子归了哥的那个人，产是 null、业是佣工、日子是给人做工
 *   四、进城那一支：举家带的是我这一户，老屋里的人一个没动（`apart.ts` 移交过来的）
 *   五、分完家过的日子（`living.ts` 移交过来的）：铺子归了哥、役不是家里的东西、进城——
 *       这三种人分完家过的是给人做工的日子；种地的分了地照旧种地
 *   六、弟弟分出去那年他多大（`kept.ts` 移交过来的）：年表问「牵够十六年」，他得真满十六
 *   七、尺子自检：把一户的户主手改成死人，第一条得红；把分家后的两户手改成一户，第三条得红
 */
import { createPinia, setActivePinia } from 'pinia'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { House } from '../src/types/game'

const LIVES = 160
const CAP = 4000
/** 走到分家（自己分出去）的世数，掷到够数为止 */
const DIVIDES_WANTED = 8

interface DeadHead {
  year: number
  house: string
  head: string
}

interface Lived {
  origin: string
  deadHeads: DeadHead[]
  /** 分完家（或役家承了户）之后过的日子，和按出身算出来该过的 */
  livingAfter: { is: string; should: string } | null
  /** 弟弟分出去那年他几岁 */
  youngerAge: number | null
  succeeded: boolean
  succeededOk: boolean
  succeedNote: string
  divided: boolean
  divideOk: boolean
  divideNote: string
  wentToTown: boolean
  townOk: boolean
  townNote: string
}

/** 户主是活人吗。写成函数，是为了自检能喂坏数据 */
function deadHeadsOf(
  houses: Readonly<Record<string, House>>,
  alive: (id: string) => boolean,
  year: number,
): DeadHead[] {
  return Object.values(houses)
    .filter((house) => house.members.length > 0 && !alive(house.head))
    .map((house) => ({ year, house: house.id, head: house.head }))
}

/** 分完家像不像两户。写成函数，是为了自检能喂坏数据 */
function dividedWrong(
  houses: Readonly<Record<string, House>>,
  adjacent: readonly { a: string; b: string }[],
  mine: readonly string[],
  theirs: readonly string[],
): string[] {
  const wrong: string[] = []
  const home = houses['home']
  const old = houses['old-home']
  if (!home || !old) return ['分完家只有一户']
  if (home.residence === old.residence) wrong.push('两户住在同一处宅')
  if (
    !adjacent.some(
      (e) => (e.a === 'home' && e.b === 'old-home') || (e.b === 'home' && e.a === 'old-home'),
    )
  )
    wrong.push('两户不相邻')
  for (const id of mine)
    if (!home.members.includes(id)) wrong.push(`${id} 该跟我走，却不在我这一户`)
  for (const id of theirs) if (!old.members.includes(id)) wrong.push(`${id} 该留在老屋，却不在老屋`)
  for (const id of home.members) if (old.members.includes(id)) wrong.push(`${id} 同时在两户`)
  if (home.head !== 'me') wrong.push(`我这一户的户主是 ${home.head}`)
  return wrong
}

function live(): Lived {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const narrative = useNarrativeStore()
  const people = usePeopleStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()

  const alive = (id: string): boolean => id === 'me' || people.isAlive(id)
  const out: Lived = {
    origin: household.origin,
    deadHeads: [],
    livingAfter: null,
    youngerAge: null,
    succeeded: false,
    succeededOk: true,
    succeedNote: '',
    divided: false,
    divideOk: true,
    divideNote: '',
    wentToTown: false,
    townOk: true,
    townNote: '',
  }
  let lastYear = world.time.year
  for (let turns = 0; !narrative.ended && turns < 220; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    // 分家那一卷两条路都要走到：进城那一支掷得少，见到就多走一回
    const town = open.find(
      (o) => o.choice.id === 'town' && (narrative.sceneId ?? '') === 'house:divide',
    )
    const pick = town && Math.random() < 0.5 ? town : open[Math.floor(Math.random() * open.length)]!
    const sceneBefore = narrative.sceneId ?? ''
    const nodeBefore = narrative.nodeId ?? ''
    // 分家之前记下谁在老屋：分完对账
    const membersBefore = people.houses['home']?.members ?? []
    const motherBefore = people.kinOf('生母').filter(alive)
    const brothersBefore = people.kinOf('兄').filter(alive)
    const spouseBefore = people.kinOf('配偶').filter(alive)
    const kidsBefore = [...people.kinOf('子'), ...people.kinOf('女')].filter(alive)
    const oldHomeBefore = household.home

    story.choose(pick.choice)

    // 一、每一年都看一眼：户主是不是活人
    if (world.time.year !== lastYear) {
      out.deadHeads.push(...deadHeadsOf(people.houses, alive, world.time.year))
      lastYear = world.time.year
    }

    // 二、承户。那一卷没有选项，一进一出，采样点看不见它——认年表打的旗
    if (!out.succeeded && world.hasFlag('event:house-succeed')) {
      out.succeeded = true
      const head = people.houses['home']?.head
      const from = world.getFlag('head-passed-from')
      const how = world.getFlag('head-passed-how')
      if (head !== 'me') {
        out.succeededOk = false
        out.succeedNote = `承户那一卷讲完户主是 ${head}`
      } else if (typeof from === 'string' && how === '殁' && people.isAlive(from)) {
        out.succeededOk = false
        out.succeedNote = `旗上写着上一任 ${from} 殁了，可他还活着`
      } else if (typeof from === 'string' && how === '交' && !people.isAlive(from)) {
        out.succeededOk = false
        out.succeedNote = `旗上写着上一任 ${from} 把家交出来了，可他已经不在了`
      }
    }

    // 六、弟弟分出去那年他多大
    if (out.youngerAge === null && world.hasFlag('event:house-divide-younger')) {
      const younger = people.kinOf('弟').filter(alive)[0]
      out.youngerAge = younger === undefined ? -1 : people.ageOf(younger)
    }

    // 五、役家承了户：差不是家里的东西，此后给人做工
    if (
      out.livingAfter === null &&
      household.origin === 'yamen' &&
      world.hasFlag('event:house-succeed')
    ) {
      out.livingAfter = { is: character.living.id, should: 'hired' }
    }

    // 三、分家（自己分出去）
    const chose = `${sceneBefore}#${nodeBefore}:${pick.choice.id}`
    if (chose === 'house:divide#choose:stay' || chose === 'house:divide#choose:town') {
      out.divided = true
      const mine = [...spouseBefore, ...kidsBefore].filter((id) => membersBefore.includes(id))
      const theirs = [...motherBefore, ...brothersBefore].filter((id) => membersBefore.includes(id))
      const wrong = dividedWrong(people.houses, people.adjacent, mine, theirs)
      if (wrong.length > 0) {
        out.divideOk = false
        out.divideNote = wrong.join('；')
      }
      // 铺子归了哥：产得是 null、业是佣工、日子是给人做工
      if (nodeBefore === 'choose' && household.origin !== 'farm' && household.business !== null) {
        const stillShop = household.business
        if (['cloth', 'inn', 'tavern', 'herb'].includes(household.origin)) {
          out.divideOk = false
          out.divideNote += `；铺子分了家还在我名下（${stillShop}）`
        }
      }
      // 五、分完家过什么日子：铺子归了哥、役、进城、没学成手艺的匠家孩子→给人做工；其余照旧
      const shopFamily = ['cloth', 'inn', 'tavern', 'herb'].includes(household.origin)
      const craftless = household.origin === 'craft' && !world.hasFlag('has-craft')
      const should =
        chose === 'house:divide#choose:town' ||
        shopFamily ||
        craftless ||
        household.origin === 'yamen'
          ? 'hired'
          : household.origin === 'farm'
            ? 'farm'
            : household.origin === 'hunt'
              ? 'hunt'
              : character.living.id
      out.livingAfter = { is: character.living.id, should }
      if (chose === 'house:divide#choose:town') {
        out.wentToTown = true
        const nowHome = household.home
        const followed = mine.filter((id) => people.personOf(id)?.place === nowHome)
        const dragged = theirs.filter((id) => people.personOf(id)?.place === nowHome)
        if (nowHome === oldHomeBefore) {
          out.townOk = false
          out.townNote = '进了城，门牌没变'
        } else if (followed.length !== mine.length) {
          out.townOk = false
          out.townNote = `妻儿 ${mine.length} 人只有 ${followed.length} 人跟来了`
        } else if (dragged.length > 0) {
          out.townOk = false
          out.townNote = `老屋里的 ${dragged.join('、')} 被举家带进城了`
        }
      }
    }
  }
  void character
  return out
}

console.log(`\n=== 承户与分家（${LIVES} 世，分家至少 ${DIVIDES_WANTED} 世）===\n`)
let bad = 0

const lives: Lived[] = []
for (let i = 0; i < LIVES; i += 1) lives.push(live())
for (
  let tries = 0;
  tries < CAP && lives.filter((l) => l.divided).length < DIVIDES_WANTED;
  tries += 1
) {
  lives.push(live())
}
const sampled = lives.length
const succeeded = lives.filter((l) => l.succeeded)
const divided = lives.filter((l) => l.divided)
const town = lives.filter((l) => l.wentToTown)
console.log(
  `  ${sampled} 世：承户 ${succeeded.length} 世，分家 ${divided.length} 世（其中进城 ${town.length} 世）`,
)

// 一、户主不留死人
{
  const dead = lives.flatMap((l) => l.deadHeads)
  if (dead.length > 0) {
    const sample = dead.slice(0, 4).map((d) => `${d.house} 的户主 ${d.head}（第 ${d.year} 年）`)
    console.log(`  ✗ 一、${dead.length} 处户主是死人：${sample.join('、')}`)
    bad += 1
  } else console.log(`  ✓ 一、${sampled} 世里每一年，自家和邻居的户主都是活人。`)
}

// 二、承户讲的是真事
{
  const wrong = succeeded.filter((l) => !l.succeededOk)
  if (succeeded.length === 0) {
    console.log(`  ✗ 二、${sampled} 世没有一世走到承户——当家的人从来不殁？`)
    bad += 1
  } else if (wrong.length > 0) {
    console.log(`  ✗ 二、${wrong.length} 世承户讲的不是真事：${wrong[0]!.succeedNote}`)
    bad += 1
  } else
    console.log(
      `  ✓ 二、${succeeded.length} 世承户，讲完户主都是我；殁了的确实殁了，交出来的确实还在。`,
    )
}

// 三、分家分的是户
{
  const wrong = divided.filter((l) => !l.divideOk)
  if (divided.length < DIVIDES_WANTED) {
    console.log(`  ✗ 三、掷了 ${sampled} 世只有 ${divided.length} 世分家，不够判。`)
    bad += 1
  } else if (wrong.length > 0) {
    console.log(`  ✗ 三、${wrong.length} 世分家分得不像两户：${wrong[0]!.divideNote}`)
    bad += 1
  } else {
    console.log(
      `  ✓ 三、${divided.length} 世分家：两户、两处宅、相邻；妻儿跟我，娘和哥留在老屋；铺子归了哥的产是 null。`,
    )
  }
}

// 四、进城那一支
{
  const wrong = town.filter((l) => !l.townOk)
  if (town.length === 0) {
    console.log(`  ✗ 四、${divided.length} 世分家没有一世进城，这一支没人量过。`)
    bad += 1
  } else if (wrong.length > 0) {
    console.log(`  ✗ 四、${wrong.length} 世进城带错了人：${wrong[0]!.townNote}`)
    bad += 1
  } else console.log(`  ✓ 四、${town.length} 世进城：举家带的是我这一户，老屋里的人一个没动。`)
}

// 五、分完家过的日子
{
  const judged = lives.filter((l) => l.livingAfter !== null)
  const wrong = judged.filter((l) => l.livingAfter!.is !== l.livingAfter!.should)
  const hired = judged.filter((l) => l.livingAfter!.should === 'hired')
  if (hired.length === 0) {
    console.log(`  ✗ 五、没有一世分完家该去给人做工——铺子归哥、役、进城这几支一支也没走到。`)
    bad += 1
  } else if (wrong.length > 0) {
    const one = wrong[0]!
    console.log(
      `  ✗ 五、${wrong.length} 世分完家过错了日子：${one.origin} 该过 ${one.livingAfter!.should}，过的是 ${one.livingAfter!.is}`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 五、${judged.length} 世分完家过的日子都对：${hired.length} 世该去给人做工的都在给人做工，种地的照旧种地。`,
    )
  }
}

// 六、弟弟分出去那年他多大
{
  const judged = lives.filter((l) => l.youngerAge !== null)
  const tooYoung = judged.filter((l) => l.youngerAge! < 16)
  if (judged.length === 0) {
    console.log(`  ✗ 六、${sampled} 世没有一世弟弟分出去——那一卷没人走到。`)
    bad += 1
  } else if (tooYoung.length > 0) {
    console.log(
      `  ✗ 六、${tooYoung.length} 世弟弟分出去那年才 ${tooYoung[0]!.youngerAge} 岁（-1 是人没了）。`,
    )
    bad += 1
  } else console.log(`  ✓ 六、${judged.length} 世弟弟分出去，那年都满了十六。`)
}

// 七、尺子自检
{
  const good: Record<string, House> = {
    home: {
      id: 'home',
      surname: '沈',
      head: 'me',
      members: ['me', 'spouse'],
      residence: 'h1',
      livelihood: '务农',
    },
    'old-home': {
      id: 'old-home',
      surname: '沈',
      head: 'elder',
      members: ['elder', 'mother'],
      residence: 'h0',
      livelihood: '务农',
    },
  }
  const aliveAll = (): boolean => true
  const deadElder = (id: string): boolean => id !== 'elder'
  const caughtDead = deadHeadsOf(good, deadElder, 30).length === 1
  const sparedLive = deadHeadsOf(good, aliveAll, 30).length === 0
  const edge = [{ a: 'home', b: 'old-home' }]
  const passGood = dividedWrong(good, edge, ['spouse'], ['mother', 'elder']).length === 0
  const merged: Record<string, House> = {
    home: { ...good['home']!, members: ['me', 'spouse', 'mother'] },
  }
  const caughtMerged = dividedWrong(merged, edge, ['spouse'], ['mother']).length > 0
  const sameRoof = { ...good, 'old-home': { ...good['old-home']!, residence: 'h1' } }
  const caughtRoof = dividedWrong(sameRoof, edge, ['spouse'], ['mother', 'elder']).length > 0
  if (!caughtDead || !sparedLive || !passGood || !caughtMerged || !caughtRoof) {
    console.log(
      `  ✗ 七、尺子自检：死户主${caughtDead ? '抓到' : '没抓到'}，活户主${sparedLive ? '放过' : '误抓'}，` +
        `好的分家${passGood ? '认了' : '误判'}，并成一户${caughtMerged ? '抓到' : '没抓到'}，同一处宅${caughtRoof ? '抓到' : '没抓到'}。`,
    )
    bad += 1
  } else
    console.log(
      `  ✓ 七、尺子自检：死户主抓得到、活户主放得过；并成一户、同住一处宅都红在该红的那条。`,
    )
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log(
    '  户主不留死人；分家分的是户，不是数值；铺子归了哥，业就变了——同一套底座，没有职业系统。\n',
  )
}
