/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 存档与面板落字的走查。
 *
 * ## 这一支是从一个 undefined 里长出来的
 *
 * 人际面板上出现过这么一行：
 *
 *     爹　抚养
 *     43岁。undefined
 *
 * 来路：`Person.doing` 这一格从前叫 `trade`，`b27fa1c` 那次改了名。
 * 代码全改对了，**玩家的存档没跟着改**——`localStorage` 里躺着的还是 `trade`，
 * 恢复回来 `doing` 就是 `undefined`，而 `` `${person.doing}` `` 原样印了出去。
 *
 * ## 为什么四十几支走查一支也没抓到
 *
 * 因为它们量的都是**跑出来的世界**，而这个 bug 出在**读回来的世界**。
 * 走查每一世都从 `story.begin()` 开始，那时候 `doing` 一定有值——
 * 一千个人里没有一个是空的。存档这条路上没有任何一支走查踩过。
 *
 * `verify.ts` 里那道「玩家读到的字里有英文吗」离得最近，也没接住：
 * 它查的是 store 里的字段，而这句话是在 `<script setup>` 里现拼的，
 * **面板上最终那一行字，全套走查一个也够不着**。
 * 所以拼装逻辑搬去了 `engine/note.ts`，这一支才有东西可量。
 *
 * ## 两道判据各守一头
 *
 * 一、二守**存档闸**（`engine/savefile.ts`）：版本对不上就把旧存档清掉。
 * 三守**落字**：一个字段缺了的人喂给 `noteOf`，它不许把英文印出来。
 *
 * 跑法：bun scripts/savefile.ts
 */
import './lib/seeded'

import { SAVE_VERSION, guardSaveFile } from '../src/engine/savefile'
import { noteOf } from '../src/engine/note'
import type { Person } from '../src/types/game'

/** 一个够用的假 localStorage。走查不能碰真的那个，浏览器里也没有 */
function makeStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed))
  return {
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as Storage
}

/** 一份旧存档：`b27fa1c` 之前那一版，人身上那一格还叫 `trade` */
const OLD_SAVE: Record<string, string> = {
  'xiuxian:version': '1',
  'xiuxian:people': JSON.stringify({
    roster: { father: { id: 'father', trade: '务农', bornYear: -13 } },
    known: {},
    relations: [],
  }),
  'xiuxian:character': JSON.stringify({ name: '陈怀山' }),
  'xiuxian:world': JSON.stringify({ flags: {} }),
}

console.log(`\n=== 存档与面板落字（存档格式第 ${SAVE_VERSION} 版）===\n`)

let bad = 0

/**
 * 一、旧存档要被清掉。
 *
 * 这一条是这支的重心。它守的不是「`trade` 这一格」——
 * 逐字段迁移救不了这类事，理由写在 `engine/savefile.ts`：
 * `trade → doing` 想得起来是因为它恰好露了馅，而露馅是运气。
 * 同一批改动里 `lifespan` 是新加的，旧存档里没有天年那一格，
 * 那个人这辈子什么时候死没有答案——**界面上不会有任何异样**。
 */
{
  const storage = makeStorage(OLD_SAVE)
  const cleared = guardSaveFile(storage)
  const left = Object.keys(OLD_SAVE).filter(
    (key) => key !== 'xiuxian:version' && storage.getItem(key) !== null,
  )

  if (!cleared || left.length > 0) {
    console.log(
      `  ✗ 第 1 版的存档摆进去，闸没把它清干净：还剩 ${left.join('、') || '（没剩，但闸说它什么也没做）'}。` +
        `\n    半新半旧的世界会一路演下去，而界面上多半看不出异样。`,
    )
    bad += 1
  } else if (storage.getItem('xiuxian:version') !== String(SAVE_VERSION)) {
    console.log(`  ✗ 清是清了，可版本没记上——下次进来还要再清一遍。`)
    bad += 1
  } else {
    console.log(`  ✓ 第 1 版的存档进来，${Object.keys(OLD_SAVE).length - 1} 个键清光，版本记上了。`)
  }
}

/**
 * 二、版本对得上就一个键也不许动。
 *
 * 这一条是上一条的对照组，缺了它上一条就是空的：
 * **一个「每次进来都清光」的实现同样能让第一条绿**，而那种实现
 * 玩家每刷新一次页面就重开一局。两条一起才说明闸是照版本走的。
 */
{
  const current = { ...OLD_SAVE, 'xiuxian:version': String(SAVE_VERSION) }
  const storage = makeStorage(current)
  const cleared = guardSaveFile(storage)
  const lost = Object.keys(current).filter((key) => storage.getItem(key) === null)

  if (cleared || lost.length > 0) {
    console.log(
      `  ✗ 版本明明对得上，闸还是动了手：丢了 ${lost.join('、') || '（没丢键，但闸说它清过）'}。` +
        `\n    这样的闸等于每次进来都重开一局。`,
    )
    bad += 1
  } else {
    console.log(`  ✓ 版本对得上，${Object.keys(current).length} 个键一个没动。`)
  }
}

/**
 * 三、面板上那一行，缺什么也不许印出英文。
 *
 * 逐格抠掉 `Person` 上的每一个字段，拿去拼那句话，看落到纸上的是什么。
 * **字段名一个也不手写**：从一个完整的人身上现读 `Object.keys`，
 * 将来 `Person` 加一格，这一条自动连它一起量
 * （门禁里不留手写清单——那就是又一张会跟着漏的表）。
 */
{
  const whole: Person = {
    id: 'father',
    surname: '陈',
    given: '守拙',
    gender: '男',
    bornYear: -13,
    doing: '务农',
    temper: '温和',
    health: 60,
    place: 'home',
    fate: '在',
    history: [],
  }

  const fields = Object.keys(whole)
  const offenders: string[] = []

  for (const missing of fields) {
    const crippled = { ...whole } as Record<string, unknown>
    delete crippled[missing]

    for (const named of [true, false]) {
      const line = noteOf({
        person: crippled as unknown as Person,
        age: 43,
        name: named ? `${whole.surname}${whole.given}` : undefined,
        vanished: '再没有消息。',
      })
      // 玩家读到的字里一个英文字母也不该有。`verify.ts` 守着这条,
      // 这里守的是它够不着的那一行
      if (/[A-Za-z]/.test(line)) offenders.push(`缺 ${missing} → 「${line}」`)
    }
  }

  console.log(
    `  覆盖：逐格抠掉 ${fields.length} 个字段 × 知不知道名字 2 种 = ${fields.length * 2} 行字`,
  )

  if (offenders.length > 0) {
    console.log(`  ✗ ${offenders.length} 行字里印出了英文：`)
    for (const one of offenders.slice(0, 6)) console.log(`      ${one}`)
    bad += 1
  } else {
    console.log(`  ✓ ${fields.length * 2} 行字里一个英文字母也没有。`)
  }
}

/**
 * 四、尺子自检：把兜底拆掉，第三条必须红。
 *
 * 不自检的话，第三条可能是空的——比如 `noteOf` 若在人缺字段时
 * 一律返回空串，它同样一个英文字母也印不出来，而那种实现是坏的。
 * 这里直接照着改前那一版重拼一次，确认这把尺子量得到差别。
 */
{
  const before = (person: Record<string, unknown>, age: number) =>
    `${age}岁。${person.doing as string}`
  const line = before({ id: 'father', surname: '陈' }, 43)

  if (!/[A-Za-z]/.test(line)) {
    console.log(`  ✗ 尺子自检没通过：改前那一版拼出来的是「${line}」，这把尺子量不到英文。`)
    bad += 1
  } else {
    console.log(`  ✓ 尺子自检：改前那一版拼出来的正是「${line}」，量得到。`)
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  存档格式一变旧档就清掉，版本对得上一个键不动，')
  console.log('  面板上那一行缺什么也落不下一个英文字母。')
  console.log('  **存档比代码活得久，而界面是它最后一道关口。**\n')
}
