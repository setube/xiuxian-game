import type { Along } from './daily'

/**
 * 今天这一趟是跟谁去的。
 *
 * ## 为什么它在一个单独的文件里，而不是在 store 里
 *
 * 「今天跟谁去」**不是一种世界状态**——它是一次抽取的参数，
 * 只在 `spend()` 挑 beat 的那一瞬间有意义。
 *
 * 存进 store 的话就得记着什么时候清掉它，而漏清一次，
 * 一个死了三年的人还在陪你上山。这个库里有过一模一样的教训：
 * 「写死的字段活得比事实久」——人生拉长到六十年之后，
 * 「还在襁褓里」成了 28 岁儿子的营生。
 *
 * ## 为什么不在 `daily.ts` 里
 *
 * `conditions.ts` 要读它，而 `daily.ts` 引 `conditions.ts`（`meetsAll`）。
 * 放在一起就是一个环。**一格上下文自己一个文件，两头都引得到。**
 *
 * ## 默认「独自」是有分量的默认
 *
 * 一天之外问它恒为「独自」——**没出门就没有同伴**，那不是兜底，
 * 那是真的。而实测十岁那年有 6% 的人身边一个同龄的也没有，
 * 对他们来说「独自」是唯一的答案。
 */
let along: Along = '独自'

/** `spend()` 挑 beat 之前放下这一格，挑完立刻收回 */
export function withAlong<T>(who: Along, run: () => T): T {
  const before = along
  along = who
  try {
    return run()
  } finally {
    // finally 不是讲究：`meetsAll` 里任何一格抛了，这一格也得还原，
    // 否则下一次抽取会读到上一次残留的同伴
    along = before
  }
}

export function currentAlong(): Along {
  return along
}
