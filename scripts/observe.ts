/* eslint-disable no-console -- 这是一支命令行走查脚本，标准输出就是它的产物；它不进构建 */
/**
 * 观察走查。
 *
 * 这一支回答两个问题，都不是门禁能回答的：
 *
 * 1. **同一个人，不同的人会怎么说他？**
 *    固定一份真实数据，让六个人依次打量他，看那六句话拼起来
 *    是不是一幅有意思的人物画像——而不是六个人复述同一个数字。
 *
 * 2. **判断力低的人，是不是真的会看错？**
 *    同一个人让同一个修士看一百次，看他说过多少种不同的话。
 *    如果永远只说同一句，那「他可能看错了」就是句空话。
 *
 * 跑法：npx vite-node scripts/observe.ts
 */
import { createPinia, setActivePinia } from 'pinia'

import {
  ADEPT,
  ELDER,
  FIGHTER,
  MASTER,
  OBSERVERS,
  PHYSICIAN,
  TEACHER,
} from '../src/content/observers'
import { observe } from '../src/engine/observe'
import { useCharacterStore } from '../src/stores/character'
import type { Attributes, Observer } from '../src/types/game'

/**
 * 用户举的那个例子，一字不改：
 * 记性极好、悟性平平、身子还行、资质其实不错。
 *
 * 这份数据的妙处在于 memory 95 与 insight 48 的落差——
 * 它保证了「先生说聪明、修士说悟性一般」不是巧合，是必然。
 */
const SUBJECT: Attributes = {
  memory: 95,
  insight: 48,
  body: 61,
  will: 55,
  fortune: 50,
  root: 83,
  spirit: 58,
}

function withSubject<T>(run: () => T): T {
  setActivePinia(createPinia())
  const character = useCharacterStore()
  character.attributes = { ...SUBJECT }
  return run()
}

console.log('\n=== 同一个人，六个人怎么说他 ===\n')
console.log('  真实数据（玩家永远看不到）：')
console.log(
  `    记性 ${SUBJECT.memory}   悟性 ${SUBJECT.insight}   体魄 ${SUBJECT.body}   ` +
    `心性 ${SUBJECT.will}   资质 ${SUBJECT.root}   神魂 ${SUBJECT.spirit}\n`,
)

for (const observer of OBSERVERS) {
  const remarks = withSubject(() => observe(observer))
  console.log(`  ${observer.name}`)
  for (const remark of remarks) {
    console.log(`    「${remark.text}」`)
  }
  console.log()
}

console.log('=== 判断力低的人真的会看错吗 ===\n')
console.log('  同一个人看一百次，说过几种话：\n')

function spread(observer: Observer, label: string): void {
  const said = new Map<string, number>()
  for (let i = 0; i < 80; i += 1) {
    const remarks = withSubject(() => observe(observer))
    for (const remark of remarks) {
      if (!remark.text.startsWith(label)) continue
      said.set(remark.text, (said.get(remark.text) ?? 0) + 1)
    }
  }
  const reading = observer.readings.find((r) => r.calls === label)
  console.log(`  ${observer.name}（判断力 ${reading?.acuity}）说「${label}」：`)
  for (const [text, n] of [...said.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}次  「${text}」`)
  }
  console.log()
}

// 炼气修士看悟性最不准，长老最准。两相对照才看得出判断力这一层在起作用
spread(ADEPT, '悟性')
spread(MASTER, '悟性')
spread(ELDER, '悟性')
spread(TEACHER, '记性')

console.log('=== 铁律：观察绝不改写真实属性 ===\n')
const before = withSubject(() => {
  const character = useCharacterStore()
  // 六个人轮流打量他一遍
  for (const observer of OBSERVERS) observe(observer)
  return { ...character.attributes }
})
const same = (Object.keys(SUBJECT) as (keyof Attributes)[]).every(
  (key) => before[key] === SUBJECT[key],
)
console.log(`  六个人依次打量之后，真实属性${same ? '一分未动。' : '被改写了——这是重大缺陷。'}`)
if (!same) process.exitCode = 1

// 郎中与武人看的是同一样东西，说法不同。这一条顺带验证「尺子共用」没写错
console.log('\n=== 同一把尺子，两种说法 ===\n')
for (const observer of [PHYSICIAN, FIGHTER]) {
  const remarks = withSubject(() => observe(observer))
  console.log(`  ${observer.name}：「${remarks[0]?.text}」`)
}
console.log()
