/**
 * Tailwind v3 配置。
 *
 * ## 令牌只有一份，在 `src/styles/main.css` 的 `:root` 里
 *
 * v4 那会儿这些令牌写在 `@theme {}` 块里，一处声明同时干两件事：
 * 生成 `--color-ink` 这样的 CSS 变量，和生成 `text-ink` 这样的工具类。
 * v3 没有 `@theme`，两件事得分开写。
 *
 * 分开之后有两种写法：把色值抄一份到这里，或者让这里指回 CSS 变量。
 * 取后者——**抄一份的那天起，两处就开始各自漂**，而漂了不会有任何机器提醒：
 * 改了 `:root` 忘了改这里，`var(--color-ink)` 和 `text-ink` 会是两个颜色，
 * 而两处都「正常显示」。
 *
 * 代价是 `text-cinnabar/50` 这种透明度修饰符用不了（Tailwind 拆不开
 * `var()` 里的颜色）。全库没有一处用它，真要用的时候再把那一格摊开成实色。
 *
 * ## 用到的工具类其实只有十来个
 *
 * `flex`、`flex-col`、`justify-center`、`text-center`、`mb-1`、`mt-0.5`、
 * `mt-3`、`pb-2`、`py-3`、`block`、`text-cinnabar`、`tracking-[0.22em]`。
 * 界面骨架靠的是 `main.css` 里那些 `ink-*` 类，Tailwind 在这个项目里
 * 只管零碎的间距和排列。
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-aged': 'var(--color-paper-aged)',
        'ink-deep': 'var(--color-ink-deep)',
        ink: 'var(--color-ink)',
        'ink-faint': 'var(--color-ink-faint)',
        'ink-ghost': 'var(--color-ink-ghost)',
        cinnabar: 'var(--color-cinnabar)',
        'cinnabar-soft': 'var(--color-cinnabar-soft)',
        rule: 'var(--color-rule)',
        wash: 'var(--color-wash)',
      },
      fontFamily: {
        serif: 'var(--font-serif)',
        kai: 'var(--font-kai)',
      },
      fontSize: {
        micro: 'var(--text-micro)',
        note: 'var(--text-note)',
        body: 'var(--text-body)',
        title: 'var(--text-title)',
      },
      maxWidth: {
        frame: 'var(--container-frame)',
      },
    },
  },
  plugins: [],
}
