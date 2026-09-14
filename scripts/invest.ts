/* eslint-disable no-console -- 这是一支门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 之国：受了封，然后真的走了吗。
 *
 * 跑法：`bun scripts/invest.ts`
 *
 * ## 这一支从一处审计盲区来
 *
 * `invest.ts`（328 行）在库里跑着，而**它的场景 id 一支门禁也没点过名**
 * ——2026-09-14 一手量的：`grep -rl "'royal:invest" scripts/` 零命中。
 *
 * 它补的是「什么也不发生」那五成八：开蒙掷 `court-fate`（安 58 · 倾 42），
 * 掷「倾」的那四成二有下文（废、削爵、迁出京城），
 * **而掷「安」的那五成八从前一辈子什么也不会发生**。
 *
 * ## 它问五件事，每一件都钉在那一卷自己写下的话上
 *
 * ```
 * 一  入场三条各自挡得住吗      origin / court-fate / gender
 * 二  公主不之国                「少写一卷，好过写一卷假的」
 * 三  爵位落在旨意那一节        「封是这道旨意本身封的」
 * 四  搬家【不】落在旨意那一节  「旨意念完人还在京里，之国要等」
 * 五  府是空的                  「新拨的人，一个都不是他从小认得的」
 * ```
 *
 * ⚠️ 第四条是**否定式**的：它守的是「这一笔不该在这儿」。
 * 这种判据最容易写成永远为真——所以第三节（爵位／搬家落点）
 * 抽成了函数，自检喂三份改坏的 `nodes` 副本进去，一份也不许放过。
 * 第一节的 `gender` 用同一世的男女去打断，第三节的「府是空的」
 * 靠真世里数新人（不打断，因为它的失败方式是【多】不是【无】）。
 */
import './lib/seeded'

import { born, play } from './lib/staged'
import { lifeEvents, lifeScenes } from '../src/content/life'
import { meetsAll } from '../src/engine/conditions'
import { useWorldStore } from '../src/stores/world'

import { usePeopleStore } from '../src/stores/people'
import type { Condition, Effect } from '../src/types/game'

const SCENE = 'royal:invest'
const scene = lifeScenes[SCENE]
const event = lifeEvents.find((one) => one.id === 'royal-invest')
let bad = 0

console.log(`\n=== 之国：受了封，然后真的走了吗 ===\n`)

/*
 * 尺子自检：那一卷还在库里，而且结构没变。
 *
 * 这一段先跑——底下每一条都从这个结构里取东西，
 * 结构变了而判据照跑，报出来的话会指着不存在的东西。
 */
if (scene === undefined || event === undefined) {
  console.log(`  ✗ 尺子自检：库里找不到 ${SCENE} 或事件 royal-invest——结构变了。`)
  process.exitCode = 1
  process.exit(1)
}

// —— 一、入场那三条，各自挡得住吗 ——
{
  const asked = event.requires ?? []
  const want = ['origin', 'flag', 'gender'] as const
  const missing = want.filter((key) => !asked.some((one) => one[key] !== undefined))
  if (missing.length > 0) {
    console.log(`  ✗ 入场少了 ${missing.join('、')} 那几条——这一卷会演给不该演的人。`)
    bad += 1
  } else {
    console.log(`  ✓ 入场三条都在：出身、开蒙那一掷、男女。`)
  }

  /*
   * 打断验：把 `gender` 那一条单独拎出来，看它跟不跟这一世的男女走。
   *
   * ⚠️ 男女读的是 `household.gender`，不是 `character`——
   * 头一版写 `useCharacterStore().gender`，印出来是 `undefined`，
   * 而判据照样说 `true`：**一个不存在的字段跟「条件恒真」印出来一样。**
   * 出处是条件层自己那一行：`gender: (gender, { household }) => …`。
   */
  const genderOnly = asked.filter((one) => one.gender !== undefined)
  const her = born('court', 16, [])
  if (her === null) {
    console.log(`  ⚠️ 掷不出 court 出身的世界，gender 那一条没验成。`)
  } else {
    const mine = her.household.gender
    const passes = meetsAll(genderOnly as readonly Condition[])
    if (passes !== (mine === '男')) {
      console.log(`  ✗ gender 那一条失灵：这一世是「${String(mine)}」而它说 ${passes}。`)
      bad += 1
    } else {
      console.log(
        `  ✓ 公主不之国：gender 那一条跟着这一世的男女走（这一世是「${String(mine)}」）。`,
      )
    }
  }
}

// —— 二、爵位落在旨意那一节，搬家不落在那儿 ——
/**
 * 抽成函数是为了**打断得动**。
 *
 * 内联写死 `scene.nodes['open']` 的话，这一条只能靠人去改 `invest.ts`
 * 再跑一遍来验——而那要动被测系统（共享工作区里改 `src/` 得先备份再还原）。
 * 接一个 `nodes` 进来，自检就能喂一份改坏的副本，**不碰库里那一份**。
 *
 * 返回的是「哪儿不对」，`null` 表示三样都对。
 */
type Nodes = typeof scene.nodes
const whereItGoesWrong = (nodes: Nodes): string | null => {
  const has = (node: string, type: string): boolean =>
    (nodes[node]?.onEnter ?? []).some((one: Effect) => one.type === type)
  if (!has('open', 'identity')) return '爵位没落在 open——那一卷写着「封是这道旨意本身封的」'
  if (has('open', 'home')) return '搬家落在了 open——而「旨意念完人还在京里，之国要等」'
  if (!has('arrive', 'home')) return '搬家没落在 arrive——到了封地却没换地方'
  return null
}

{
  const wrong = whereItGoesWrong(scene.nodes)
  if (wrong !== null) {
    console.log(`  ✗ ${wrong}。`)
    bad += 1
  } else {
    console.log(`  ✓ 封在旨意那一节，家在到了封地那一节——两笔没挤在一起。`)
  }

  /*
   * 尺子自检：喂三份改坏的副本，一份也不许放过去。
   *
   * ⚠️ 这一段不是摆设。第三条（`home` 挪到 `open`）是**否定式**判据
   * ——它守的是「这一笔不该在这儿」，而否定式判据不打断根本看不出
   * 它是真在看还是永远为真。
   */
  const clone = (patch: (n: Nodes) => void): Nodes => {
    const copy = JSON.parse(JSON.stringify(scene.nodes)) as Nodes
    patch(copy)
    return copy
  }
  const drills: [string, Nodes][] = [
    [
      '把爵位从 open 拿掉',
      clone((n) => {
        const node = n['open']
        if (node) node.onEnter = (node.onEnter ?? []).filter((one) => one.type !== 'identity')
      }),
    ],
    [
      '把搬家挪进 open',
      clone((n) => {
        const node = n['open']
        if (node)
          node.onEnter = [...(node.onEnter ?? []), { type: 'home', place: '假的' } as Effect]
      }),
    ],
    [
      '把搬家从 arrive 拿掉',
      clone((n) => {
        const node = n['arrive']
        if (node) node.onEnter = (node.onEnter ?? []).filter((one) => one.type !== 'home')
      }),
    ],
  ]
  const slipped = drills.filter(([, nodes]) => whereItGoesWrong(nodes) === null)
  if (slipped.length > 0) {
    console.log(
      `  ✗ 尺子自检：${slipped.map(([name]) => name).join('、')}——判据没红，它守不住这几样。`,
    )
    bad += 1
  } else {
    console.log(
      `  ✓ 尺子自检：三种改坏法（${drills.map(([n]) => n).join('／')}）各打断一次，三次都红。`,
    )
  }
}

// —— 三、府是空的：跟着去的人，只该有奶大他的那一个 ——
{
  const TRIES = 60
  let played = 0
  let overwritten = 0
  const strangers: string[] = []

  for (let n = 0; n < TRIES; n += 1) {
    const staged = born('court', 16, [])
    if (staged === null) continue
    const world = useWorldStore()
    /*
     * ⚠️ `court-fate` 得喂，因为 `born` 只推时间【不演任何卷】
     * ——开蒙那一节没演过，那一掷根本没发生。
     * 头一版指望它自己掷，60 次一个也没掷出来，
     * 印出来的话是「掷不出这样的世界」，读着像这一卷太稀有。
     *
     * 喂是安全的，因为 `royal:invest` 自己不掷这面旗。
     * 而「安全」这两个字不能光靠我说——演完之后回头问一次，
     * 被覆盖了就报出来（`illness` 那一支正是栽在喂进去的值被重掷上）。
     */
    world.setFlag('court-fate', '安')
    played += 1

    const people = usePeopleStore()
    const before = new Set(Object.keys(people.known))
    play(SCENE)
    if (world.getFlag('court-fate') !== '安') overwritten += 1

    const fresh = Object.keys(people.known).filter((id) => !before.has(id))
    for (const id of fresh) {
      if (id !== 'chancellor' && !strangers.includes(id)) strangers.push(id)
    }
  }

  if (played === 0) {
    console.log(`  ⚠️ ${TRIES} 次一个 court 出身的世界也没掷出来——这一条没验成。`)
  } else if (overwritten > 0) {
    console.log(`  ✗ 喂进去的 court-fate 被这一卷改掉了 ${overwritten}/${played} 次——摆局不成立，`)
    console.log(`      底下那条「府是空的」验的是另一种世界，不作数。`)
    bad += 1
  } else {
    console.log(`  ·  ${played}/${TRIES} 世走完了这一卷（喂进去的那面旗一次也没被改）。`)
    if (strangers.length > 0) {
      console.log(`  ✗ 府里冒出了长史以外的新人：${strangers.slice(0, 5).join('、')}`)
      console.log(`      ——那一卷写着「这一卷只立一个长史，因为他在正文里真的说了话」。`)
      bad += 1
    } else {
      console.log(`  ✓ 府是空的：新认得的只有长史一个，没有第二个没戏的人被立起来。`)
    }
  }
}

console.log(bad === 0 ? `\n  ✓ 之国这一卷，五件事都对。\n` : `\n  ✗ ${bad} 项不成立。\n`)
if (bad > 0) process.exitCode = 1
