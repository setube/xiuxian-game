/**
 * 固定随机源。
 *
 * ## 为什么
 *
 * 四十八支门禁跑的是随机人生：世界随机、皇帝随机、寿数随机、人物随机、家庭随机、
 * 地域随机、关系随机。全套偶尔一支红、单跑又绿——从前只能记一句「既有闪红」。
 * 状态空间越大这种红越多，而查不到的红会训练人无视门禁。
 *
 * 所以每一世都从一颗种子长出来：**同一颗种子，同一段人生，同一行输出。**
 * 红了就把种子记下来；修完拿同一颗种子重跑，绿了才算修好。
 *
 * ## 怎么装
 *
 * 门禁脚本第一行 `import './lib/seeded'`，它把 `Math.random` 和 `crypto.randomUUID`
 * 换成从种子长出来的序列。种子从 `SEED` 环境变量读，没有就现掷一颗并打印出来。
 * `gates.ts` 给每一支派一颗（主种子 + 门禁名），分片（`lib/parallel.ts`）再给每一片派一颗
 * （门禁种子 + 片序号）。
 *
 * ## 这一层不管的
 *
 * - 分片数。片数变了，每一片拿到的种子就变了。复现要连 `GATE_SHARDS` 一起写
 *   （`gates.ts` 打印复现命令时带上）。
 * - 挂钟。`Date.now` 只在 `gates.ts` 计时和 `engine/id.ts` 的降级路径里出现，
 *   `scripts/replay.ts` 守着这一条不长回来。
 */

/** 把一串字符搅成四个 32 位数。cyrb128，bryc 的公有领域实现 */
function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < text.length; i += 1) {
    const k = text.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0]
}

/** sfc32：小、快、够用。返回 32 位无符号整数 */
function sfc32(seed: [number, number, number, number]): () => number {
  let [a, b, c, d] = seed
  return () => {
    a |= 0
    b |= 0
    c |= 0
    d |= 0
    const t = (((a + b) | 0) + d) | 0
    d = (d + 1) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    c = (c + t) | 0
    return t >>> 0
  }
}

const HEX = '0123456789abcdef'

/** 从随机序列拼一个 v4 形状的 uuid。`engine/id.ts` 用它给人和事编号 */
function uuidFrom(next: () => number): `${string}-${string}-${string}-${string}-${string}` {
  const bytes: number[] = []
  for (let i = 0; i < 4; i += 1) {
    const word = next()
    bytes.push(word & 255, (word >>> 8) & 255, (word >>> 16) & 255, (word >>> 24) & 255)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.map((b) => HEX[b >> 4]! + HEX[b & 15]!).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let installed: string | undefined

/**
 * 把这个进程（或这个 worker）的随机源换成从 `seed` 长出来的序列。
 *
 * 装第二次会覆盖第一次——分片 worker 靠这一点拿到自己那颗种子。
 */
export function installSeed(seed: string): string {
  const next = sfc32(cyrb128(seed))
  /**
   * 编号走自己的一条流。从前跟世界的骰子共用一条：`people.tie()` 每牵一条边就 `createId()` 一次，
   * 吃掉一个随机数，**内容里多立一条边，整个世界的掷骰全部推偏**——另一个会话在出生那一刻
   * 给爹娘、兄弟姐妹补了几条边，`kindred` 的随机采样就换了一批世（种子 1959t641pabs）。
   * 分开之后，加边、加债只动编号那条流，世界的骰子照旧；同一颗种子的世界不再因为多记了一件事实而变样。
   */
  const ids = sfc32(cyrb128(`${seed}#id`))
  Math.random = () => next() / 4294967296
  crypto.randomUUID = () => uuidFrom(ids)
  installed = seed
  return seed
}

/** 这个进程正用着的种子。没装过就是 undefined */
export function currentSeed(): string | undefined {
  return installed
}

/** 从主种子派生一颗子种子：门禁名、片序号都走这里，派生规则只此一处 */
export function deriveSeed(parent: string, ...parts: readonly (string | number)[]): string {
  return [parent, ...parts].join('/')
}

/** 现掷一颗种子。只在没人指定的时候用——掷出来的那颗会被打印，好拿去复现 */
export function freshSeed(): string {
  const word = () => Math.floor(Math.random() * 4294967296).toString(36)
  return `${word()}${word()}`.slice(0, 12)
}

/** `SEED` 环境变量里那颗；没有就现掷一颗 */
export function seedFromEnv(): string {
  const asked = process.env.SEED
  return asked !== undefined && asked !== '' ? asked : freshSeed()
}
