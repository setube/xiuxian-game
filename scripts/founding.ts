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
 *     const birth = beBorn(household.trade, ...) // character.ts
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
 * 跑法：npx vite-node scripts/founding.ts
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'

import { useCharacterStore } from '../src/stores/character'
import { useDiaryStore } from '../src/stores/diary'
import { useHouseholdStore } from '../src/stores/household'
import { useLeaningStore } from '../src/stores/leanings'
import { useNarrativeStore } from '../src/stores/narrative'
import { usePeopleStore } from '../src/stores/people'
import { useUiStore } from '../src/stores/ui'
import { useWorldStore } from '../src/stores/world'

type StoreName =
  'household' | 'world' | 'people' | 'character' | 'diary' | 'leanings' | 'narrative' | 'ui'

/**
 * 登记表。**加一个 store 就得在这儿写一行。**
 *
 * 写的是「建它的时候，还得先建谁」——不是运行期谁调谁。
 * 函数体里调别的 store 不算依赖：那时候大家都建好了，怎么调都行。
 */
const FOUNDING = {
  /** 根。家先于一切——出身、府、家境，是这一世最先定下来的东西 */
  household: [],
  /** 你在哪儿，取决于你生在哪家 */
  world: ['household'],
  /** 人活在时间里：记谁什么时候来的、什么时候走的，都要问世界几时了 */
  people: ['world'],
  /** 你是最后成型的那个。名字要问家里，年龄要问世界，父母要落进人口册 */
  character: ['household', 'world', 'people'],

  /** 底下四个不参与立基。它们对别人的引用全在函数体里，建的时候谁也不用等 */
  diary: [],
  leanings: [],
  narrative: [],
  ui: [],
} satisfies Record<StoreName, readonly StoreName[]>

const ENTRIES: Record<StoreName, () => unknown> = {
  household: useHouseholdStore,
  world: useWorldStore,
  people: usePeopleStore,
  character: useCharacterStore,
  diary: useDiaryStore,
  leanings: useLeaningStore,
  narrative: useNarrativeStore,
  ui: useUiStore,
}

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
    ENTRIES[name]()
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

console.log('=== 尺子自检（存心写错的表必须红）===')
{
  // 少写一条：world 其实要 household，表里说它不用
  const short = new Set(['world'])
  const real = buildAlone('world').built
  const caught = sorted(short) !== sorted(real)
  console.log(`  ${caught ? '√' : '✗ 漏报'}　表里少写一条依赖`)
  // 多写一条：diary 其实谁也不用，表里说它要 world
  const long = new Set(['diary', 'world', 'household'])
  const bare = buildAlone('diary').built
  const caught2 = sorted(long) !== sorted(bare)
  console.log(`  ${caught2 ? '√' : '✗ 漏报'}　表里多写一条依赖`)
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

console.log('\n=== 立基次第 ===')
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

console.log('')
if (broken === 0 && missing === 0) {
  console.log('  八个 store 的立基次第跟表上一致。')
  console.log('    · household 是根：建它不连带任何人')
  console.log('    · 有人在 household 顶层读了别的 store，这一行会红')
} else {
  console.log(`  ${broken + missing} 处对不上——立基次第变了，或者表该改了。`)
  process.exitCode = 1
}
