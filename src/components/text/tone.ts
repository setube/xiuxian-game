import type { InkTone } from '@/types/game'

/**
 * 墨色即信息层级。所有承载文字的组件共用这一张表，
 * 免得同一个「浓墨」在不同组件里深浅不一。
 */
export const TONE_CLASS: Record<InkTone, string> = {
  faint: 'text-ink-faint',
  normal: 'text-ink',
  deep: 'text-ink-deep',
  cinnabar: 'text-cinnabar',
}

export function toneClass(tone: InkTone = 'normal'): string {
  return TONE_CLASS[tone]
}
