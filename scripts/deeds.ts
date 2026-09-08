/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 行为史：做过的事一件一笔，「做过几次」数出来，第四回起正文变了。
 *
 * 5/7/8 三份文档反对的是人格标签和善恶值；它们要的「习惯形成」——第一次骗人愧疚、
 * 十次之后觉得没什么——建在「这类事做过几次」上，而旗标只记得住有没有（`setFlag` 覆盖）。
 * 现在做过的事一件一笔记进 `character.deeds`（`Deed { kind, at, text }`，跟念头、日录同构），
 * 次数是数出来的；条件层 `deeds: { kind, atLeast }` 读它。第一个读者是「一句话」那一卷
 * （`candour:small`）：前三回说不是实话，那天晚上睡得比平常晚、第二天绕开了那个人；
 * 第四回起，转身去做别的事了，那天晚上睡得跟平常一样。**引擎不说他变了，正文变了。**
 *
 *   一、摆好的局：演三回「你说都花完了」→ 行为史三笔、各有时候、原话里 `{elder}` 填成了真人、
 *       时间不倒流；`deeds lie atLeast 3` 真、`atLeast 4` 假、`truth atLeast 1` 假；旗标里没有旧占位。
 *   二、读者：前三回正文有「绕开了那个人」没有「跟平常一样」，第四回起反过来；说实话那条路落
 *       truth 不落 lie、正文照旧；说过四回不是实话之后再说一回实话，实话那节不受影响。
 *   三、不外显、能存：`src/components` 里一个 `deeds` 也没有；`deeds` 在 persist 的 pick 里；
 *       存档版本 ≥ 17。
 *   四、随机人生只报数：一生说过几回不是实话的分布；掷到有一世到了第四回为止（上限十倍）；
 *       次数到了四正文还留痕迹、次数没到正文已磨平、原话没填干净、时间倒流——四种都不许有。
 */
import './lib/seeded'

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { SAVE_VERSION } from '../src/engine/savefile'
import { meetsAll } from '../src/engine/conditions'
import { useCharacterStore } from '../src/stores/character'
import { mapShards } from './lib/parallel'
import { born, play, type Staged } from './lib/staged'
import { FRESH_LINE, WORN_AT, WORN_LINE, type DeedsLife } from './tasks/deeds-lives'

const LIVES = 66
const SCENE = 'candour:small'
/**
 * 十七岁起，任何一卷事件占回合的上限。
 *
 * 从系统取：`chance: 0.25` 下 66 世，占得最多的那卷是「一句话」，23%；第二名落幕 3%
 * （2026-09-08 量的，见下面报数）。上限放在它的两倍上——它要抓的是下一次「回回都是它」
 * （头一版是 87–91%），不是几个点的漂移。
 */
const EVENT_CEILING = 0.5
/**
 * 一生里「一句话」演过的中位上限。
 *
 * 那一册要的是六回上下（`chance: 0.25` 下实测：80 世中位 6、四分位 5–9；66 世中位 9，2026-09-08）：
 * 够攒出「做过很多次」，又不至于每年都在撒谎。头一版没有 `chance` 时中位 74——
 * 上限要抓的是那个，不是 6 和 9 之间的漂移。
 */
const PLAYS_MEDIAN_CEILING = 20

/** 十八岁的农家孩子，娘还在：钱那一支的 `{elder}` 得有人可填 */
function youngster(): Staged | null {
  return born('farm', 18, ['mother'])
}

const ordinal = (at: { year: number; month: number }): number => at.year * 12 + at.month

let bad = 0

// ============================================================
// 一、三回不是实话：三笔，各是各的
// ============================================================
{
  const wrong: string[] = []
  const s = youngster()
  if (!s) wrong.push('掷不出局')
  else {
    const character = useCharacterStore()
    if (character.deeds.length !== 0)
      wrong.push(`才十八岁，行为史里已经有 ${character.deeds.length} 笔`)
    for (let round = 1; round <= 3; round += 1) play(SCENE, 'lie', 'money')
    const lies = character.deeds.filter((one) => one.kind === 'lie')
    if (lies.length !== 3) wrong.push(`说了三回不是实话，行为史记了 ${lies.length} 笔`)
    if (character.did('lie') !== 3) wrong.push(`did('lie') 数出 ${character.did('lie')}`)
    for (const one of lies) {
      if (!one.text.includes('你说都花完了')) wrong.push(`原话该是行为本身：${one.text}`)
      if (one.text.includes('{')) wrong.push(`原话没填干净：${one.text}`)
      if (one.text.includes('谎')) wrong.push(`原话里不该出现那个字：${one.text}`)
    }
    for (let i = 1; i < lies.length; i += 1) {
      if (ordinal(lies[i]!.at) < ordinal(lies[i - 1]!.at)) wrong.push('行为史里时间倒流')
    }
    if (lies.length === 3 && ordinal(lies[2]!.at) === ordinal(lies[0]!.at))
      wrong.push('三回隔着几个月，记下的时候却一样')
    if (!meetsAll([{ deeds: { kind: 'lie', atLeast: 3 } }])) wrong.push('atLeast 3 该真')
    if (meetsAll([{ deeds: { kind: 'lie', atLeast: 4 } }])) wrong.push('atLeast 4 该假')
    if (!meetsAll([{ deeds: { kind: 'lie', atMost: 3 } }])) wrong.push('atMost 3 该真')
    if (meetsAll([{ deeds: { kind: 'truth', atLeast: 1 } }]))
      wrong.push('一回实话没说过，truth atLeast 1 却真')
    if (s.world.hasFlag('times-lied') || s.world.hasFlag('times-truthful'))
      wrong.push('旧的旗标占位还在落')
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 一、三笔：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      '  ✓ 一、说了三回不是实话：行为史三笔，各有时候、原话是行为本身且填好了；atLeast 3 真、4 假；旧旗标不再落。',
    )
}

// ============================================================
// 二、读者：第四回起正文变了
// ============================================================
{
  const wrong: string[] = []
  const s = youngster()
  if (!s) wrong.push('掷不出局')
  else {
    const character = useCharacterStore()
    for (let round = 1; round <= WORN_AT + 1; round += 1) {
      const texts = play(SCENE, 'lie', round % 2 === 0 ? 'where' : 'blame')
      const fresh = texts.some((line) => line.includes(FRESH_LINE))
      const worn = texts.some((line) => line.includes(WORN_LINE))
      if (round < WORN_AT) {
        if (!fresh) wrong.push(`第 ${round} 回该还留着痕迹：${texts.join(' / ')}`)
        if (worn) wrong.push(`第 ${round} 回就磨平了`)
      } else {
        if (fresh) wrong.push(`第 ${round} 回还留着痕迹：${texts.join(' / ')}`)
        if (!worn) wrong.push(`第 ${round} 回该磨平了：${texts.join(' / ')}`)
      }
    }
    // 说过五回不是实话之后说一回实话：落 truth 不落 lie，实话那节照旧
    const before = character.did('lie')
    const honest = play(SCENE, 'truth', 'where')
    if (character.did('lie') !== before) wrong.push('说实话那条路记成了不是实话')
    if (character.did('truth') !== 1) wrong.push(`说了一回实话，记了 ${character.did('truth')} 笔`)
    if (!honest.some((line) => line.includes('没有人再提')))
      wrong.push(`实话那节该照旧：${honest.join(' / ')}`)
    if (honest.some((line) => line.includes(FRESH_LINE) || line.includes(WORN_LINE)))
      wrong.push('实话那节串到了不是实话的收尾')
    const truth = character.deeds.find((one) => one.kind === 'truth')
    if (!truth?.text.includes('你照实说了'))
      wrong.push(`实话那一笔的原话：${truth?.text ?? '（空）'}`)
  }
  if (wrong.length > 0) {
    console.log(`\n  ✗ 二、读者：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 二、前 ${WORN_AT - 1} 回睡得比平常晚、绕开了那个人；第 ${WORN_AT} 回起转身去做别的事、睡得跟平常一样；实话那条路各记各的。`,
    )
}

// ============================================================
// 三、不外显、能存
// ============================================================
{
  const wrong: string[] = []
  const shown: string[] = []
  for (const name of readdirSync('src/components', { recursive: true })) {
    const file = String(name)
    if (!file.endsWith('.vue') && !file.endsWith('.ts')) continue
    const source = readFileSync(join('src/components', file), 'utf8')
    if (/\bdeeds\b|\.did\(/.test(source)) shown.push(file)
  }
  if (shown.length > 0) wrong.push(`面板不该显示行为史，这几处读了它：${shown.join('、')}`)
  const store = readFileSync('src/stores/character.ts', 'utf8')
  const pick = store.slice(store.indexOf('pick: ['))
  if (!/'deeds'/.test(pick.slice(0, pick.indexOf(']')))) wrong.push('deeds 不在 persist 的 pick 里')
  if (SAVE_VERSION < 17) wrong.push(`行为史进了存档，版本却还是 ${SAVE_VERSION}`)
  if (wrong.length > 0) {
    console.log(`\n  ✗ 三、不外显、能存：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 三、src/components 里没有一处读行为史；deeds 在 pick 里；存档格式第 ${SAVE_VERSION} 版。`,
    )
}

// ============================================================
// 四、随机人生只报数
// ============================================================
{
  const wrong: string[] = []
  const CAP = LIVES * 10
  const batch = (runs: number) =>
    mapShards<DeedsLife[]>({ task: 'scripts/tasks/deeds-lives.ts', runs }).then((all) => all.flat())
  let lives: DeedsLife[] = await batch(LIVES)
  const worn = (all: DeedsLife[]) => all.filter((one) => one.lies >= WORN_AT)
  // 存在性：掷到有一世到了第四回为止；分布用首批，补掷不进百分比
  const first = lives
  while (worn(lives).length === 0 && lives.length < CAP) lives = [...lives, ...(await batch(LIVES))]
  const n = first.length
  const none = first.filter((one) => one.lies === 0).length
  const few = first.filter((one) => one.lies >= 1 && one.lies < WORN_AT).length
  const many = worn(first).length
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`
  const median = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
  }
  if (worn(lives).length === 0)
    wrong.push(`${lives.length} 世里没有一世说到第 ${WORN_AT} 回不是实话`)
  const wornLives = worn(lives)
  if (wornLives.length > 0 && !wornLives.some((one) => one.wornSeen))
    wrong.push(`${wornLives.length} 世到了第 ${WORN_AT} 回，没有一世见过磨平了的那节正文`)
  const stale = lives.reduce((sum, one) => sum + one.freshAfterWorn, 0)
  if (stale > 0) wrong.push(`${stale} 处次数已到第 ${WORN_AT} 回、正文却还留着痕迹`)
  const early = lives.reduce((sum, one) => sum + one.wornEarly, 0)
  if (early > 0) wrong.push(`${early} 处次数没到、正文已经磨平`)
  const unfilled = lives.flatMap((one) => one.unfilled)
  if (unfilled.length > 0) wrong.push(`${unfilled.length} 笔原话没填干净：${unfilled[0]}`)
  const backwards = lives.reduce((sum, one) => sum + one.backwards, 0)
  if (backwards > 0) wrong.push(`${backwards} 笔时间倒流`)
  /*
   * 没有哪一卷把成年段挤光。
   *
   * `pickEvent` 有候选就出事件、没候选才过日常，所以一卷宽窗口、低门槛的事会成为唯一候选、
   * 回回都来：头一版「一句话」一世演 137–199 回、十七岁起九成回合是它（2026-09-08），
   * 而报表上看不出「这一卷把别人挤光了」——别的门禁只量自己那一卷。这一条替所有人看着：
   * 十七岁起，任何一卷事件占的回合不超过 EVENT_CEILING。
   */
  const adult: Record<string, number> = {}
  for (const one of first)
    for (const [scene, turns] of Object.entries(one.adultTurns))
      adult[scene] = (adult[scene] ?? 0) + turns
  const adultTotal = Object.values(adult).reduce((sum, x) => sum + x, 0)
  const events = Object.entries(adult)
    .filter(([scene]) => !scene.startsWith('routine:'))
    .map(([scene, turns]) => ({ scene, share: turns / adultTotal }))
    .sort((a, b) => b.share - a.share)
  const crowding = events.filter((one) => one.share > EVENT_CEILING)
  if (crowding.length > 0)
    wrong.push(
      `十七岁起有一卷占了 ${Math.round(crowding[0]!.share * 100)}% 的回合（上限 ${EVENT_CEILING * 100}%）：${crowding[0]!.scene}`,
    )
  console.log(
    `  · 十七岁起占回合最多的三卷事件：${events
      .slice(0, 3)
      .map((one) => `${one.scene} ${Math.round(one.share * 100)}%`)
      .join('，')}（日常不计）`,
  )
  console.log(
    `  · ${n} 世：一回不是实话也没说过 ${none}（${pct(none)}），一到三回 ${few}（${pct(few)}），到了第 ${WORN_AT} 回 ${many}（${pct(many)}）；` +
      `一生说过的中位 ${median(first.map((one) => one.lies))} 回、实话中位 ${median(first.map((one) => one.truths))} 回` +
      (lives.length > n ? `；补掷到 ${lives.length} 世` : ''),
  )
  // 太多就成了骗子模拟器：一生演过的中位不超过 PLAYS_MEDIAN_CEILING
  const playsMedian = median(first.map((one) => one.lies + one.truths))
  if (playsMedian > PLAYS_MEDIAN_CEILING)
    wrong.push(
      `一生里「一句话」演过的中位 ${playsMedian} 回，超过 ${PLAYS_MEDIAN_CEILING}——骗子模拟器`,
    )
  if (wrong.length > 0) {
    console.log(`\n  ✗ 四、随机人生：${wrong[0]}（共 ${wrong.length} 处）`)
    bad += 1
  } else
    console.log(
      `  ✓ 四、${lives.length} 世里到了第 ${WORN_AT} 回的 ${wornLives.length} 世都见过磨平了的正文；次数与正文没有一处对不上；原话都填了、时间不倒流；一生演过的中位 ${playsMedian} 回，没有一卷挤光成年段。`,
    )
}

if (bad > 0) {
  console.log(`\n${bad} 条红。`)
  process.exitCode = 1
} else console.log('\n行为史：四条全绿。')
