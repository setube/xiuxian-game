/* eslint-disable no-console -- 这是一支命令行门禁脚本，标准输出就是它的产物；它不进构建 */
/**
 * 立基次第门禁。
 *
 * ## 八个 store 里，有四个是有先后的
 *
 * 一个人生出来的次序是定的：**先有你生在哪家，才有你在哪儿，
 * 才有你周围那些人，最后才有你自己。** 这不是实现细节，是世界观——
 * `character.ts` 里那句「先有父母，才有你」说的是人，这一层说的是同一件事。
 *
 * 落到代码上，`household` 是根。`world` 建的时候要读它：
 *
 *     const place = ref(household.home)          // world.ts
 *     const birth = beBorn(household.origin, household.home) // character.ts
 *
 * 这四处是**初始化期跨 store 读值**，跟函数体里读值完全是两回事，
 * 而代码上看不出区别——两者写出来都是 `useHouseholdStore()`。
 *
 * ## 违反了会怎样：一个静默，一个当场炸
 *
 * 试过把 `household` 顶层改成读 `useWorldStore().time.year`，制造一个环：
 *
 *     先建 household  → place=undefined，home 却是好的，**不报错**
 *     先建 world      → TypeError: Cannot read properties of undefined
 *
 * 同一个环，换个入口，一个静默污染一个立刻崩。
 * 静默那条更坏：状态栏上会写着 `undefined`，而没有任何东西吭一声。
 * Pinia 遇到重入不会报错，它把一个**尚未建完的 store** 交给你。
 *
 * ## 判据：单独建一个，看连带建起了谁
 *
 * `pinia.state.value` 的键就是已经建起来的 store。所以单独建 `household`，
 * 那里应该只有它自己；单独建 `world`，应该是它加上 `household`。
 *
 * 这是精确判据，没有「判不出来」的灰色地带——所以这一支是门禁不是走查，
 * 跟 `shadow.ts` 那种只能少说不能说错的走查不同。
 *
 * ## 而「开始一世」有两个入口，第二个曾经漏掉两个 store
 *
 * 第一次建是一个入口，重掷（`restart()`）是另一个。两个入口读的是
 * **同一个次序**，从前却各写了一遍：setup 里靠顶层调用的先后，
 * `restart()` 里靠手写四行。**抄第二遍的时候漏了两行**——
 * `diary` 和 `leanings` 的 `reset()` 写好了没人调，于是重开一世，
 * 日录里还是上一世的日子，念头里还是上一世的倾向。两者都 `persist`，
 * 刷新页面也还在。不报错、不断线，玩家翻开日录读到的是上一个人的一生。
 *
 * 所以次序收拢进了 `src/stores/founding.ts`，两个入口都从那张表推导。
 * 底下第四段守着它：往八个 store 里各塞一枚哨兵，走玩家真正走的那条路
 * （`story.restart()`），看谁还留着上一世的东西。
 *
 * 跑法：npx vite-node scripts/founding.ts
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'

import { lifeScenes, lifeEvents, lifeRoutine, lifeFinale } from '../src/content/life'
import { useStory } from '../src/engine/story'
import { FOUNDING, STORES, foundingOrder } from '../src/stores/founding'
import type { StoreName } from '../src/stores/founding'

/** 传递闭包：建它要先建谁，那些人又要先建谁 */
function closureOf(name: StoreName): Set<string> {
  const all = new Set<string>([name])
  const queue: StoreName[] = [...FOUNDING[name]]
  while (queue.length > 0) {
    const next = queue.shift()!
    if (all.has(next)) continue
    all.add(next)
    queue.push(...FOUNDING[next])
  }
  return all
}

/** 单独建一个，看 pinia 里连带建起了谁 */
function buildAlone(name: StoreName): { built: Set<string>; crashed?: string } {
  const pinia = createPinia()
  setActivePinia(pinia)
  try {
    STORES[name]()
  } catch (error: unknown) {
    // 环的另一种表现就是当场崩。崩了也是一种红，不能让它把整支脚本带走
    const why = error instanceof Error ? error.message : String(error)
    return { built: new Set(Object.keys(pinia.state.value)), crashed: why }
  }
  return { built: new Set(Object.keys(pinia.state.value)) }
}

function sorted(names: Iterable<string>): string {
  return `[${[...names].sort().join(', ')}]`
}

/**
 * 表跟目录对账。
 *
 * 类型上的 `satisfies` 只管表里的键跟 `StoreName` 对得上，
 * 可 `StoreName` 是手写的——新加一个 store 文件，它不会自己长出来。
 * **一道守在没人走的门口的关卡，跟没有这道关卡是一回事**，
 * 这句话在 `tsconfig.scripts.json` 那次已经写过一遍了。
 */
function census(): string[] {
  const dir = join(process.cwd(), 'src', 'stores')
  const ids: string[] = []
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue
    const source = readFileSync(join(dir, file), 'utf8')
    for (const match of source.matchAll(/defineStore\(\s*'([^']+)'/g)) ids.push(match[1]!)
  }
  return ids
}

/** 认得出来的脏值。重掷之后它要是还在，说明那个 store 没被清 */
const MARK = '★上一世★'
const MARK_NUMBER = -987654321

/**
 * 往一个 store 的 state 里塞哨兵。
 *
 * 不列字段名——列了就是又一张手写表，又会漏。按值的形状塞：
 * 数组 push、对象加键、字符串和数字换成认得出来的值。
 *
 * **布尔测不到**（true / false 都是合法值，塞不进哨兵）。
 * 这是已知的缺口，写在这儿而不是假装没有。
 */
function soil(state: object): void {
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) value.push(MARK)
    else if (typeof value === 'string') Reflect.set(state, key, MARK)
    else if (typeof value === 'number') Reflect.set(state, key, MARK_NUMBER)
    else if (value !== null && typeof value === 'object') Reflect.set(value, MARK, MARK)
  }
}

function stillDirty(slice: unknown): boolean {
  const text = JSON.stringify(slice) ?? ''
  return text.includes(MARK) || text.includes(String(MARK_NUMBER))
}

/**
 * 八个 store 各塞一枚哨兵，然后走一遍重掷，看谁还留着上一世的东西。
 *
 * `how` 决定走哪条路：真实入口（`story.restart()`），
 * 还是自检用的那个「手写四行」的旧写法。
 */
function replantThenReset(how: (story: ReturnType<typeof useStory>) => void): {
  survivors: StoreName[]
  crashed?: string
} {
  const pinia = createPinia()
  setActivePinia(pinia)

  const order = foundingOrder()
  for (const name of order) STORES[name]()
  for (const name of order) soil(STORES[name]().$state)

  const story = useStory(lifeScenes, {
    events: lifeEvents,
    routine: lifeRoutine,
    finale: lifeFinale,
  })
  try {
    how(story)
  } catch (error: unknown) {
    const why = error instanceof Error ? error.message : String(error)
    return { survivors: order.filter((name) => stillDirty(pinia.state.value[name])), crashed: why }
  }
  return { survivors: order.filter((name) => stillDirty(pinia.state.value[name])) }
}

console.log('=== 尺子自检（存心写错的必须红）===')
{
  // 少写一条：world 其实要 household，表里说它不用
  const short = new Set(['world'])
  const real = buildAlone('world').built
  console.log(`  ${sorted(short) !== sorted(real) ? '√' : '✗ 漏报'}　表里少写一条依赖`)

  // 多写一条：diary 其实谁也不用，表里说它要 world
  const long = new Set(['diary', 'world', 'household'])
  const bare = buildAlone('diary').built
  console.log(`  ${sorted(long) !== sorted(bare) ? '√' : '✗ 漏报'}　表里多写一条依赖`)

  // 重演改掉的那个写法：手写四行，漏掉 diary 和 leanings。这就是当初那个 bug
  const old = replantThenReset(() => {
    for (const name of ['household', 'world', 'character', 'ui'] as StoreName[]) {
      STORES[name]().reset()
    }
  })
  const caught = old.survivors.includes('diary') && old.survivors.includes('leanings')
  console.log(`  ${caught ? '√' : '✗ 漏报'}　手写次序漏掉两个 store（当初那个 bug）`)
  if (caught) console.log(`      抓到残留 ${sorted(old.survivors)}`)
}

console.log('\n=== 登记表跟目录对账 ===')
const declared = new Set(Object.keys(FOUNDING))
const actual = census()
let missing = 0
for (const id of actual) {
  if (declared.has(id)) continue
  missing += 1
  console.log(`  ✗ src/stores/ 里有 '${id}'，登记表里没有它`)
}
for (const id of declared) {
  if (actual.includes(id)) continue
  missing += 1
  console.log(`  ✗ 登记表里写着 '${id}'，src/stores/ 里找不到`)
}
if (missing === 0) console.log(`  ${actual.length} 个 store 都在表上。`)

console.log('\n=== 立基次第：建的时候 ===')
let broken = 0
for (const name of Object.keys(FOUNDING) as StoreName[]) {
  const want = closureOf(name)
  const { built, crashed } = buildAlone(name)
  if (crashed) {
    broken += 1
    console.log(`  ✗ 建 ${name} 当场崩了：${crashed}`)
    continue
  }
  if (sorted(want) === sorted(built)) {
    const others = [...built].filter((one) => one !== name)
    console.log(
      `  √ ${name.padEnd(10)} ${others.length === 0 ? '自己一个' : `连带 ${sorted(others)}`}`,
    )
    continue
  }
  broken += 1
  console.log(`  ✗ ${name}　连带建起的跟表上写的对不上`)
  console.log(`      表上 ${sorted(want)}`)
  console.log(`      实际 ${sorted(built)}`)
}

console.log('\n=== 立基次第：重掷的时候 ===')
console.log(`  次序 ${foundingOrder().join(' → ')}`)
const again = replantThenReset((story) => story.restart())
if (again.crashed) {
  broken += 1
  console.log(`  ✗ 重掷当场崩了：${again.crashed}`)
} else if (again.survivors.length > 0) {
  broken += 1
  console.log(`  ✗ 重开一世之后，这些 store 还留着上一世的东西：${sorted(again.survivors)}`)
} else {
  console.log('  √ 八个 store 都归零了，一枚哨兵也没剩下')
}

console.log('')
if (broken === 0 && missing === 0) {
  console.log('  两个入口读的是同一张表，八个 store 都对得上。')
  console.log('    · household 是根：建它不连带任何人')
  console.log('    · 有人在 household 顶层读了别的 store，「建的时候」那一段会红')
  console.log('    · 新加一个 store 忘了在重掷里清它，「重掷的时候」那一段会红')
} else {
  console.log(`  ${broken + missing} 处对不上——立基次第变了，或者表该改了。`)
  process.exitCode = 1
}
