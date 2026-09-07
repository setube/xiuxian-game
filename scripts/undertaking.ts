/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 正在做的那件事，是不是还只是一件事。
 *
 * 「过程中状态」这一格（`stores/character.ts` 的 `Undertaking`）是用户 2026-09-07
 * 拍板建的，同时给了三条边界：
 *
 *   一、**只描述「正在发生什么」**
 *   二、**不描述「下一步必须发生什么」**
 *   三、**不拥有自己的流转规则**
 *
 * 原话是「这一格应该很薄，不要发展成第二套状态机」，并且明说验收时会专门查
 * 它有没有偷偷长成状态机。这一支就是替这次验收做的——**而且它守的是以后**：
 * 今天薄不等于明天薄，加一个 `next` 字段只要三十秒。
 *
 * ## 它凭什么判得出「长成状态机」
 *
 * 状态机有三样东西，缺一不成：**下一步是谁**（转移表）、**什么时候转**（触发器）、
 * **转的时候干什么**（动作）。这一格但凡长出其中任何一样，就不再是一条事实了。
 *
 * 所以判据看的是类型本身有没有长出那几样字段。这是静态检查，不跑世界——
 * **它要拦的是「有人在这个接口上加了一格」，那件事在代码里，不在模拟里。**
 *
 * ## 为什么不判「内容用得对不对」
 *
 * 因为那不是这一格的事。守孝期间不许议亲这类规矩由内容层的 `requires` 管
 * （`Condition` 的 `undertaking` 那一格）。判据要是往那儿伸手，
 * 就等于替内容作者规定了礼法——**而礼法是内容，不是基础设施。**
 *
 * 跑法：bun scripts/undertaking.ts
 */
/*
 * 这一支不跑世界，按说用不着播种。仍然照写，是因为 `replay.ts` 有一条判据
 * 盯着「每支门禁第一个 import 都是 ./lib/seeded」——**而那条判据比我这一处例外值钱**：
 * 放我过去，等于给「以后新加的支可以不播种」开了口子，
 * 而下一支很可能是真要跑世界的。一行 import 的代价，换一条不留缺口的纪律。
 */
import './lib/seeded'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), 'utf8')
}

/**
 * 状态机的那三样东西，在字段名上长什么样。
 *
 * 收的是**形状**不是具体拼写：`next` / `then` / `goto` 是转移，
 * `after` / `deadline` / `expires` 是触发器，`onFinish` / `effects` 是动作。
 *
 * 宁可误报也要收全——这一条误报的代价是「有人来读一遍这段注释」，
 * 漏报的代价是这一格已经长成状态机而没人知道。
 */
const MACHINERY: readonly { field: string; why: string }[] = [
  { field: 'next', why: '转移表：下一步是谁' },
  { field: 'then', why: '转移表：下一步是谁' },
  { field: 'goto', why: '转移表：下一步是谁' },
  { field: 'stage', why: '阶段：把一件事切成好几步' },
  { field: 'phase', why: '阶段：把一件事切成好几步' },
  { field: 'step', why: '阶段：把一件事切成好几步' },
  { field: 'deadline', why: '触发器：到时候自己结束' },
  { field: 'expires', why: '触发器：到时候自己结束' },
  { field: 'after', why: '触发器：过多久自己动' },
  { field: 'onFinish', why: '动作：结束时自己干点什么' },
  { field: 'onEnd', why: '动作：结束时自己干点什么' },
  { field: 'effects', why: '动作：自己带一串效果' },
]

/** 取 `interface Undertaking { ... }` 那一段的字段名 */
function fieldsOfUndertaking(): string[] {
  const source = read('src', 'stores', 'character.ts')
  const start = source.indexOf('export interface Undertaking {')
  if (start < 0) return []
  const end = source.indexOf('\n}', start)
  const body = source.slice(start, end)
  // 只取字段声明：行首缩进 + 名字 + 可选问号 + 冒号。注释和 JSDoc 天然不匹配
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]!)
}

console.log('\n=== 正在做的那件事，是不是还只是一件事 ===\n')

let bad = 0

/**
 * 一、这一格身上不许长出状态机的零件。
 *
 * 这一条是用户那三条边界的直接落点：有 `next` 就是在描述「下一步必须发生什么」，
 * 有 `deadline` 或 `onFinish` 就是「拥有自己的流转规则」。
 */
{
  const fields = fieldsOfUndertaking()
  if (fields.length === 0) {
    console.log('  ✗ 找不到 `interface Undertaking`——这一支的判据落空了。')
    bad += 1
  } else {
    const grown = MACHINERY.filter((one) => fields.includes(one.field))
    if (grown.length > 0) {
      console.log(`  ✗ 这一格长出了 ${grown.length} 样状态机的零件：`)
      for (const one of grown) console.log(`      ${one.field}——${one.why}`)
      console.log(
        '\n    用户 2026-09-07 拍板时明说：「这一格应该很薄，不要发展成第二套状态机」。\n' +
          '    谁结束它、什么时候结束、结束后发生什么，**都由对应的真实事件决定**。',
      )
      bad += 1
    } else {
      console.log(`  ✓ 四个字段（${fields.join('、')}），一样状态机的零件也没有。`)
    }
  }
}

/**
 * 二、完了的不许删，只许封口。
 *
 * 跟 `Relation.until`、`LivingSpan.until` 同一条纪律：
 * **「三年前那门亲事没谈成」是这个人一生的一部分。**
 * 删掉它，日后媒人再上门时两家就都不记得上一回了。
 */
{
  const source = read('src', 'stores', 'character.ts')
  const start = source.indexOf('function finish(')
  const body = start < 0 ? '' : source.slice(start, source.indexOf('\n    }', start))
  const deletes = /\.filter\(|splice\(/.test(body)
  if (start < 0) {
    console.log('  ✗ 找不到 `finish()`——这一条判据落空了。')
    bad += 1
  } else if (deletes) {
    console.log('  ✗ `finish()` 里有 filter 或 splice——完了的那条被删掉了，不是封口。')
    bad += 1
  } else {
    console.log('  ✓ `finish()` 只置 until，不删记录——过去的事一件也不少。')
  }
}

/**
 * 三、尺子自检：喂坏数据抓得到。
 *
 * 前两条都绿时印出来的是「这一格还很薄」，而那句话有两种成因：
 * 判据管用而这一格确实薄，或者**判据根本没在看这个文件**。
 * 两种印出来一模一样——这一支的路径是硬编码的，文件改个名它就哑了。
 */
{
  const fake = ['id', 'since', 'until', 'who', 'next', 'onFinish']
  const caught = MACHINERY.filter((one) => fake.includes(one.field)).map((one) => one.field)
  const clean = ['id', 'since', 'until', 'who']
  const quiet = MACHINERY.filter((one) => clean.includes(one.field))

  if (caught.length === 2 && quiet.length === 0) {
    console.log('  ✓ 尺子自检：喂进 next/onFinish 抓得到，喂进四个正当字段放得过。')
  } else {
    console.log(`  ✗ 尺子自己坏了：该抓的抓到 ${caught.length}/2，该放的误报 ${quiet.length} 个。`)
    bad += 1
  }
}

console.log()
if (bad > 0) {
  console.log(`  ✗ ${bad} 项不成立。\n`)
  process.exitCode = 1
} else {
  console.log('  它只说「这件事开始了，还没完」——剩下的交给真实事件。\n')
}
