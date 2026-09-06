/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
import './lib/seeded'

/**
 * 官与役分开、护送不叫镖局。
 *
 * 跑法：bun scripts/yamen.ts
 *
 * ## 守的是什么
 *
 * 用户 2026-09-06 定的两件事（design/ming-society.md 审查表）：
 *
 * - `office` 拆成两行——官（八品，仕宦）与役（皂隶快手，寻常）**不二选一**。
 *   两家在地位、教育、子女出路、跟衙门的关系上全不一样，从前塞在一个「当差」里。
 *   **尤其不写「役户子孙不得应试」**：明代这一条不如清代明确，不拿一个模糊的概念
 *   推一句永久禁令。
 * - `escort` 不绑「镖局」这个后世固化的机构名，改成宽泛的护送／行商护卫。
 *
 * 分头守：
 *
 *   一、官与役各过各的日子，各记各的第一件事——官家的孩子看见父亲弯腰，
 *       役家的孩子看见腰牌被收；谁也读不到对方那一节
 *   二、役家的孩子念得起书就能去考院试——这是那条禁令**没有**被写进去的实证
 *   三、库里没有「镖」字（正文、征象、称呼、营生），护送人家的孩子读到的是车队和老把头
 *   四、尺子自检：喂一行带镖的假正文得红；把官役两家的期望对调得红
 */
import { createPinia, setActivePinia } from 'pinia'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { lifeEvents, lifeFinale, lifeRoutine, lifeScenes } from '../src/content/life'
import { LIVINGS } from '../src/content/living'
import { ORIGINS } from '../src/content/origins'
import { useStory } from '../src/engine/story'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { useNarrativeStore } from '../src/stores/narrative'
import { useWorldStore } from '../src/stores/world'
import type { OriginId } from '../src/types/game'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

/** 官家孩子记事那一节的标志句 / 役家的 */
const OFFICIAL_MEMORY = '父亲弯着腰，一直没有直起来。'
const RUNNER_MEMORY = '班头收了。'
/** 院试那一卷的头一句 */
const EXAM_OPENS = '今年开院试。'
/** 护送人家记事那一节 */
const ESCORT_MEMORY = '那一趟回来得很晚。'

const YAMEN_LIVES = 40
const OTHER_LIVES = 12
const CAP = 60000

interface Lived {
  origin: OriginId
  living: string
  male: boolean
  schooled: boolean
  text: string
}

function live(origin: OriginId): Lived | null {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  if (household.origin !== origin) return null
  const narrative = useNarrativeStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  story.begin()
  // 采样点：立基之后、一次也没选之前——削爵、投寺都是后来的事
  const living = character.living.id
  const male = household.gender === '男'

  // 正文按块 id 收：流封顶四百块，`slice(seen)` 在长人生里会静默丢掉后半段
  let text = ''
  const kept = new Set<string>()
  const drain = (): void => {
    for (const item of narrative.stream) {
      if (kept.has(item.id)) continue
      kept.add(item.id)
      if (item.block.text) text += item.block.text + '\n'
    }
  }
  drain()
  for (let turns = 0; !narrative.ended && turns < 200; turns += 1) {
    const open = narrative.options.filter((o) => !o.locked)
    if (open.length === 0) break
    story.choose(open[Math.floor(Math.random() * open.length)]!.choice)
    drain()
  }
  return { origin, living, male, schooled: world.hasFlag('schooled'), text }
}

function sample(
  origin: OriginId,
  want: number,
  keep: (one: Lived) => boolean = () => true,
): Lived[] {
  const out: Lived[] = []
  for (let tries = 0; tries < CAP && out.length < want; tries += 1) {
    const one = live(origin)
    if (one && keep(one)) out.push(one)
  }
  return out
}

/** 一行正文有没有那个不该出现的字。写成函数，是为了自检能拿假正文喂它 */
function hasBannedWord(line: string, word: string): boolean {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return false
  return line.includes(word)
}

/** 两家的孩子各读到了什么。写成函数，是为了自检能把期望对调 */
function memoriesWrong(
  officials: readonly Lived[],
  runners: readonly Lived[],
  expect: { official: string; runner: string },
): string[] {
  // 记事那一卷是年表上掷的（三四岁那两年，权重 10），不是每一世都撞上——
  // 所以「自家那一节」要的是有人读到，「对方那一节」要的是一个也没有
  const wrong: string[] = []
  const officialRead = officials.filter((l) => l.text.includes(expect.official))
  const officialLeaked = officials.filter((l) => l.text.includes(expect.runner))
  const runnerRead = runners.filter((l) => l.text.includes(expect.runner))
  const runnerLeaked = runners.filter((l) => l.text.includes(expect.official))
  if (officialRead.length === 0)
    wrong.push(`${officials.length} 世官家的孩子没有一个读到「${expect.official}」`)
  if (officialLeaked.length > 0)
    wrong.push(`${officialLeaked.length} 世官家的孩子读到了役家那一节「${expect.runner}」`)
  if (runnerRead.length === 0)
    wrong.push(`${runners.length} 世役家的孩子没有一个读到「${expect.runner}」`)
  if (runnerLeaked.length > 0)
    wrong.push(`${runnerLeaked.length} 世役家的孩子读到了官家那一节「${expect.official}」`)
  return wrong
}

console.log(
  `\n=== 官与役分开、护送不叫镖局（役 ${YAMEN_LIVES} 世 / 官 ${OTHER_LIVES} 世 / 护送 ${OTHER_LIVES} 世）===\n`,
)
let bad = 0

/**
 * 只量真在这一家长大的孩子。生在衙役家却被寺里收留、被老乞丐捡去的，过的是那个人的日子
 * （`living` 解析顺序：先抚养人，再这个家），跟官役分不分开无关。掷掉的记个数，报在下面。
 */
let adopted = 0
const ownDay = (origin: OriginId) => (l: Lived) => {
  const own = l.living === LIVINGS[origin].id
  if (!own) adopted += 1
  return own
}
const runners = sample('yamen', YAMEN_LIVES, ownDay('yamen'))
const officials = sample('office', OTHER_LIVES, ownDay('office'))
const escorts = sample('escort', OTHER_LIVES, ownDay('escort'))
console.log(`  （另有 ${adopted} 世被人收养，过的是抚养人的日子，不算在内）`)
if (
  runners.length < YAMEN_LIVES ||
  officials.length < OTHER_LIVES ||
  escorts.length < OTHER_LIVES
) {
  console.log(`  ✗ 掷不够：役 ${runners.length}，官 ${officials.length}，护送 ${escorts.length}。`)
  bad += 1
}

// 一、各过各的日子，各记各的第一件事
{
  const rows = ORIGINS.filter((o) => o.id === 'office' || o.id === 'yamen')
  const sameWord = rows.length === 2 && rows[0]!.livelihood === rows[1]!.livelihood
  const sameDay = LIVINGS.office.id === LIVINGS.yamen.id
  const wrong = memoriesWrong(officials, runners, {
    official: OFFICIAL_MEMORY,
    runner: RUNNER_MEMORY,
  })
  if (sameWord) {
    console.log(`  ✗ 一、官与役的业写的是同一个词「${rows[0]!.livelihood}」——两行没拆开。`)
    bad += 1
  } else if (sameDay) {
    console.log(`  ✗ 一、官与役过的是同一种日子「${LIVINGS.office.id}」——日子没拆开。`)
    bad += 1
  } else if (wrong.length > 0) {
    for (const line of wrong) console.log(`  ✗ 一、${line}`)
    bad += 1
  } else {
    const readOwn = runners.filter((l) => l.text.includes(RUNNER_MEMORY)).length
    console.log(
      `  ✓ 一、官家过 office，役家过 yamen；${readOwn} / ${runners.length} 世役家的孩子看见腰牌被收，官家的看见父亲弯腰，谁也读不到对方那一节。`,
    )
  }
}

// 二、役家的孩子能考院试
{
  const boys = runners.filter((l) => l.male && l.schooled)
  // 念了书的男孩掷够数：这一条问的是「有没有禁令」，分母得是够得着考场的人
  const extra = sample('yamen', Math.max(0, 12 - boys.length), (l) => l.male && l.schooled)
  const examined = [...boys, ...extra]
  const sat = examined.filter((l) => l.text.includes(EXAM_OPENS))
  console.log(`  役家念了书的男孩 ${examined.length} 世，其中 ${sat.length} 世走到了院试那一卷`)
  if (examined.length < 12) {
    console.log(`  ✗ 二、役家念得起书的男孩掷不够（${examined.length}），这一条判不了。`)
    bad += 1
  } else if (sat.length === 0) {
    console.log(
      `  ✗ 二、${examined.length} 世役家念了书的男孩没有一个走到院试——像是有人把「役户子孙不得应试」写进去了。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 二、役家的孩子念得起书就能去考院试。那条禁令没有被写进去。`)
  }
}

// 三、库里没有镖
{
  const hits: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (entry.name.endsWith('.ts')) {
        const lines = readFileSync(join(ROOT, rel), 'utf8').split(/\r?\n/)
        for (const [i, line] of lines.entries()) {
          if (hasBannedWord(line, '镖')) hits.push(`${rel}:${i + 1}`)
        }
      }
    }
  }
  walk('src/content')
  walk('src/engine')
  const readMemory = escorts.filter((l) => l.text.includes(ESCORT_MEMORY))
  const readBanned = escorts.filter((l) => l.text.includes('镖'))
  if (hits.length > 0) {
    console.log(
      `  ✗ 三、库里 ${hits.length} 处正文还写着「镖」：${hits.slice(0, 6).join('、')}${hits.length > 6 ? '…' : ''}`,
    )
    bad += 1
  } else if (readBanned.length > 0) {
    console.log(`  ✗ 三、${readBanned.length} 世护送人家的孩子读到了「镖」。`)
    bad += 1
  } else if (readMemory.length === 0) {
    console.log(
      `  ✗ 三、${escorts.length} 世护送人家的孩子没有一个读到记事那一节「${ESCORT_MEMORY}」。`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 三、库里没有「镖」字；${readMemory.length} / ${escorts.length} 世护送人家的孩子读到的是车队和老把头。`,
    )
  }
}

// 四、尺子自检
{
  const caughtBanned = hasBannedWord("  { kind: 'narration', text: '那一趟镖走了两个月' },", '镖')
  const sparedComment = !hasBannedWord('  // 从前这一行叫镖局', '镖')
  const swapped = memoriesWrong(officials, runners, {
    official: RUNNER_MEMORY,
    runner: OFFICIAL_MEMORY,
  })
  if (!caughtBanned || !sparedComment) {
    console.log(
      `  ✗ 四、尺子自检：带镖的正文${caughtBanned ? '抓到了' : '没抓到'}，注释里的镖${sparedComment ? '放过了' : '也被抓了'}。`,
    )
    bad += 1
  } else if (swapped.length === 0) {
    console.log(`  ✗ 四、尺子自检：把官役两家的期望对调，判据照样绿——它量的不是那两节。`)
    bad += 1
  } else {
    console.log(`  ✓ 四、尺子自检：带镖的正文抓得到、注释放得过；期望对调当场红。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log(
    '  八品是官，皂隶是役，两家不共用一个词；役家的孩子照样能去考。护送的人跟车队走，不叫镖局。\n',
  )
}
