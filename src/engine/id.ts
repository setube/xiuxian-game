/** 生成稳定唯一 id。持久化后重载仍不冲突，故不用自增计数器。 */
export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  // 非安全上下文（如 http 部署）下的降级方案
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
