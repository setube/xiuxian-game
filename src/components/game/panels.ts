import type { PanelKey } from '@/types/game'

/**
 * 底栏六格。
 *
 * 顺序即亲疏：先是自己（人物、行囊），再是自己知道的事（知识、人际），
 * 最后是自己走过的路（编年、世界）。
 */
export interface PanelMeta {
  key: PanelKey
  label: string
}

export const PANELS: readonly PanelMeta[] = [
  { key: 'character', label: '人物' },
  { key: 'inventory', label: '行囊' },
  { key: 'knowledge', label: '知识' },
  { key: 'relations', label: '人际' },
  { key: 'chronicle', label: '编年' },
  { key: 'world', label: '世界' },
]

export function panelLabel(key: PanelKey): string {
  return PANELS.find((panel) => panel.key === key)?.label ?? ''
}
