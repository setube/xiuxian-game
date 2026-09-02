/* eslint-disable no-console -- 这是一支走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 打听走查。
 *
 * 验三件事：
 *
 * 1. **同一个问题，不同的人给的是不同的局部世界**
 *    ——不是四个版本的正确答案，是四个人各自看见的那一角。
 * 2. **玩家不是全知调查员**：经常问不出来。
 *    「他知道但不肯说」和「他真不知道」是两道独立的闸。
 * 3. **知识分层**：听说 → 见过 → 猜想 → 确信 → 亲历，且只能往上走。
 *
 * 跑法：npx vite-node scripts/inquire.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import { INFORMANTS } from '../src/content/informants'
import { ask } from '../src/engine/inquire'
import { useCharacterStore } from '../src/stores/character'
import { useHouseholdStore } from '../src/stores/household'
import { usePeopleStore } from '../src/stores/people'
import { useWorldStore } from '../src/stores/world'
import type { RegionState, Topic } from '../src/types/game'

/** 旱灾中段：米铺已经关门，官府还在说限价之内 */
function droughtWorld(): RegionState {
  return { rain: 26, harvest: 30, grain: 168, order: 36, plague: 0 }
}

function setup(age = 12) {
  setActivePinia(createPinia())
  const household = useHouseholdStore()
  const world = useWorldStore()
  const character = useCharacterStore()
  const people = usePeopleStore()
  household.trade = '农户'
  world.regions = { [household.prefecture]: { state: droughtWorld(), last: {} } }
  world.bornYear = world.time.year - age
  return { household, world, character, people }
}

// —— 一、同一个问题，四个人 ——
console.log('\n=== 同一个「今年年景如何」，问四个人 ===\n')
console.log('  （世界真相：米价 168，米铺已关门，路上不太平）')
console.log('  （玩家永远看不到上面这一行）\n')

for (const informant of INFORMANTS) {
  const has = informant.answers.some((a) => a.topic === '年景')
  if (!has) continue
  setup()
  // 多问几次，把「他今天肯不肯说」的分布摊开
  const said = new Map<string, number>()
  for (let i = 0; i < 200; i += 1) {
    setup()
    const reply = ask(informant.id, '年景')
    const line = reply.blocks
      .map((b) => ('text' in b ? b.text : ''))
      .filter(Boolean)
      .join('　')
    said.set(line, (said.get(line) ?? 0) + 1)
  }
  console.log(`  【${informant.name}】`)
  for (const [line, n] of [...said.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    console.log(`      ${String(Math.round((n / 200) * 100)).padStart(3)}%  ${line}`)
  }
  console.log()
}

// —— 二、两道闸：知道 ≠ 肯说 ——
console.log('=== 知道 ≠ 肯说 ===\n')
{
  const ROUNDS = 600
  for (const [id, topic, label] of [
    ['grain-dealer', '年景', '米铺掌柜（知道 88，肯说 22）'],
    ['elder', '家里', '家里的大人（知道 95，肯说 40）'],
    ['neighbour', '生人', '村里的老人（知道 66，肯说 88）'],
  ] as [string, Topic, string][]) {
    let got = 0
    for (let i = 0; i < ROUNDS; i += 1) {
      setup()
      if (ask(id, topic).got) got += 1
    }
    console.log(`  ${label.padEnd(28)} 真问出来的：${((got / ROUNDS) * 100).toFixed(0)}%`)
  }
  console.log('\n  掌柜知道得最清楚，却最问不出来——那是他的生意，他不会跟一个孩子交底。')
}

// —— 三、四个人拼出来的世界 ——
console.log('\n=== 一个孩子把四个人都问了一遍 ===\n')
{
  setup(12)
  const character = useCharacterStore()
  const world = useWorldStore()
  for (const [id, topic] of [
    ['elder', '年景'],
    ['neighbour', '年景'],
    ['grain-dealer', '年景'],
    ['clerk', '年景'],
  ] as [string, Topic][]) {
    const reply = ask(id, topic)
    if (reply.learned) {
      character.learn({
        id: reply.learned.id,
        title: reply.learned.title,
        summary: reply.learned.summary,
        category: reply.learned.category,
        at: world.time,
        contact: reply.contact,
        interpretation: reply.interpretation,
      })
    }
    for (const block of reply.blocks) {
      if ('text' in block) {
        const speaker = 'speaker' in block && block.speaker ? `${block.speaker}：` : ''
        console.log(`    ${speaker}${block.text}`)
      }
    }
  }
  console.log('\n  他最后攒下的见闻：\n')
  for (const entry of character.knowledge) {
    console.log(`    〔${entry.contact} · ${entry.interpretation}〕${entry.title}`)
    if (entry.summary) console.log(`        ${entry.summary}`)
  }
  console.log('\n  四句话都不假，四句话拼不出真相。他得自己判断信谁。')
}

// —— 四、认识只能往上走 ——
console.log('\n=== 认识一件事不会倒退 ===\n')
{
  setup()
  const character = useCharacterStore()
  const world = useWorldStore()
  /**
   * 三步各动一根轴：先只是听说，然后亲眼见到（接触往上），
   * 最后自己想出一个解释（解释往上）。**两根轴分开走。**
   */
  const steps: [string, '听说' | '见过' | '亲历' | null, '未理解' | '猜想' | null][] = [
    ['有人说这世上有能飞的人。多半是编的。', '听说', '未理解'],
    ['你亲眼见过一个。他站在船头，水面不动。', '见过', null],
    ['他们大概是修行了什么法门。', null, '猜想'],
  ]
  for (const [summary, contact, interpretation] of steps) {
    character.learn({
      id: 'cultivators-exist',
      title: '修士',
      summary,
      category: '修行',
      at: world.time,
      ...(contact ? { contact } : {}),
      ...(interpretation ? { interpretation } : {}),
    })
    const entry = character.knowledge.find((k) => k.id === 'cultivators-exist')!
    console.log(`    〔${entry.contact} · ${entry.interpretation}〕${entry.summary}`)
  }
  // 再听人说一嘴，不该退回「听说」
  character.learn({
    id: 'cultivators-exist',
    title: '修士',
    summary: '有人说这世上有能飞的人。',
    category: '修行',
    at: world.time,
    contact: '听说',
  })
  const entry = character.knowledge.find((k) => k.id === 'cultivators-exist')!
  console.log(
    `\n  又听人说了一嘴之后：〔${entry.contact} · ${entry.interpretation}〕${entry.summary}`,
  )
  if (entry.contact !== '见过') {
    console.log('  ✗ 认识倒退了——这是重大缺陷。')
    process.exitCode = 1
  } else {
    console.log('  没有倒退。亲眼见过之后，再听人说一嘴也不会退回「只是听说」。')
  }
}

// —— 五、错误但真诚 ——
console.log('\n=== 他说的是真话，可他的解释是错的 ===\n')
{
  setup(12)
  const character = useCharacterStore()
  const world = useWorldStore()
  let shown = 0
  for (let i = 0; i < 60 && shown < 1; i += 1) {
    const reply = ask('neighbour', '生人')
    if (!reply.got || !reply.learned) continue
    shown += 1
    for (const block of reply.blocks) {
      if (!('text' in block)) continue
      const who = 'speaker' in block && block.speaker ? `${block.speaker}：` : '    '
      console.log(`    ${who}${block.text}`)
    }
    character.learn({
      id: reply.learned.id,
      title: reply.learned.title,
      summary: reply.learned.summary,
      category: reply.learned.category,
      at: world.time,
      contact: reply.contact,
      interpretation: reply.interpretation,
      mistaken: reply.mistaken,
    })
  }

  const entry = character.knowledge.find((k) => k.id === 'refugees')
  if (!entry) {
    console.log('  （这一次没问出来。老人也有不肯说的时候。）')
  } else {
    console.log(`\n  他记下的：〔${entry.contact} · ${entry.interpretation}〕${entry.summary}`)
    console.log(`  引擎里的标记：${entry.mistaken ?? '（没有错）'}\n`)
    console.log('  世界真相：北边闹的是旱，不是兵。老人不是撒谎——')
    console.log('  他这辈子听惯了「兵灾」，就这么解释了。')
    console.log('  玩家看不到那个标记。他将带着这个因果走很多年。')
    if (entry.mistaken !== '因果') {
      console.log('  ✗ 没有标记成因果错误——「错误但真诚」没有落地。')
      process.exitCode = 1
    }
  }
}
console.log()
