/**
 * 事实登记表：引擎产、内容读的那几类事实，每一类登记三件事——谁产、谁读、验什么。
 *
 * ## 为什么要有这张表（用户 2026-09-07）
 *
 * 内容里能被 `Condition` 读到的世界事实，不止 `Effect` 落下的那些。年表记「这件事发生过」
 * 是引擎在 `chronology.ts` 里拼一个 `event:<id>` 旗标；念头到了「反复」那一档是 store 拼一个
 * `leaning:<id>`；修士教的那几句是 `rite:<id>` 加四个尾巴。这些键**内容作者知道、runtime 读得到、
 * 门禁不知道**——`verify.ts` 只认字面量，拼出来的键靠一张前缀清单放行，而产 `event:` 的文件
 * 从没被它扫过，第一个拿 `event:` 当条件的内容（侄儿想走得先成了人）才把这个洞踩出来。
 *
 * **任何能被引擎读取的事实，都不能只存在于作者和 runtime 的默契里。** 所以：
 *
 * 1. 拼键一律经这里的 `flagKey` / `knowledgeKey`。命名空间是一个封闭的联合类型，
 *    引擎里想拼一个新前缀，先在 `FACTS` 里登记，否则编译不过。
 * 2. 每一行登记产在哪（`producer`）、谁读（`consumer`）、id 该在哪张内容表上（`ids`）。
 *    `verify.ts` 照 `ids` 去查：`event:kindred-nephew-grownn` 这种打错的 id 当场红，
 *    而不是前缀对了就放行。
 *
 * ## 这张表不做的
 *
 * 它只登记与穷举，不是第二个引擎：不解析、不结算、不替 `Condition` 判真假。
 * 也不把所有世界事实塞进一个万能 `Fact` 联合——`Condition` 各格语义分明，就让它们分明。
 * 不带命名空间的旗标（`knows-bracelet`、`nephew-went`）仍由剧本里的 `flag` 效果产，
 * `verify.ts` 照旧对账，不进这张表。
 */

/** 引擎拼出来的旗标命名空间。加一个，`FACTS` 里就得多一行 */
export type FlagNamespace = 'event' | 'leaning' | 'spark' | 'branched' | 'footing' | 'rite'

/** 引擎拼出来的认知命名空间 */
export type KnowledgeNamespace = 'lead' | 'rite'

/** id 该在哪张内容表上。门禁侧把它换成真的表去查（`scripts/verify.ts`） */
export type IdTable =
  'lifeEvents' | 'LEANINGS' | 'SPARKS+DAMPERS' | 'WISHES' | 'CULTIVATORS' | 'RITES' | 'LEADS'

export interface FactRow {
  /** 谁拼这个键、什么时候 */
  producer: string
  /** 谁读它 */
  consumer: string
  /** 冒号后那一段 id 得在这张表上 */
  ids: IdTable
  /** 键还带不带尾巴（`rite:<id>:hold`）。带的话验 id 时先把尾巴去掉 */
  suffixes?: readonly string[]
}

export const FLAG_FACTS = {
  event: {
    producer: 'engine/chronology.ts markFired——年表上那件事演过了',
    consumer: 'Condition.flag（内容问「那件事发生过没」）、chronology.ts 自己（不重来、链上待续）',
    ids: 'lifeEvents',
  },
  leaning: {
    producer: 'stores/leanings.ts stir——念头到了「反复」那一档置真，退下去置假',
    consumer: 'Condition.flag（他自己的行动才问念头；世界发生的事一个念头也不许问）',
    ids: 'LEANINGS',
  },
  spark: {
    producer: 'engine/leanings.ts——只触一次的火星／泼过一次的冷水',
    consumer: '只有引擎自己读（不再触第二次）；内容不该问它',
    ids: 'SPARKS+DAMPERS',
  },
  branched: {
    producer: 'engine/leanings.ts——一个念头分了岔',
    consumer: '只有引擎自己读；走查读 branched-into（那是普通旗标）',
    ids: 'WISHES',
  },
  footing: {
    producer: 'engine/tutelage.ts——跟某位修士处到了哪一步',
    consumer: 'Condition.flag（师承那几卷问 equals: 使唤／不理会）',
    ids: 'CULTIVATORS',
  },
  rite: {
    producer: 'engine/tutelage.ts——听过／记住／明白；身上那一步；练了几回；谁教的；哪天教的',
    consumer: 'Condition.flag（练功那几卷）、tutelage.ts 自己',
    ids: 'RITES',
    suffixes: ['hold', 'tries', 'by', 'since'],
  },
} as const satisfies Record<FlagNamespace, FactRow>

export const KNOWLEDGE_FACTS = {
  lead: {
    producer: 'engine/effects.ts ask-around、engine/errand.ts——听来的一件事，只进认知层',
    consumer: 'Condition.knowledge（`lead:<id>`）',
    ids: 'LEADS',
  },
  rite: {
    producer: 'engine/tutelage.ts——修士教的那几句，听见了不懂也算知道',
    consumer: 'Condition.knowledge',
    ids: 'RITES',
  },
} as const satisfies Record<KnowledgeNamespace, FactRow>

/** 拼一个旗标键。引擎里唯一的拼法 */
export function flagKey(namespace: FlagNamespace, id: string, suffix?: string): string {
  return suffix === undefined ? `${namespace}:${id}` : `${namespace}:${id}:${suffix}`
}

/** 拼一个认知键。引擎里唯一的拼法 */
export function knowledgeKey(namespace: KnowledgeNamespace, id: string): string {
  return `${namespace}:${id}`
}

/**
 * 把一个键拆回命名空间和 id。门禁用：`rite:quiet-breath:hold` → `{ namespace: 'rite', id: 'quiet-breath', suffix: 'hold' }`；
 * 不带命名空间的键返回 null。
 */
export function parseFlagKey(
  key: string,
): { namespace: FlagNamespace; id: string; suffix?: string } | null {
  const cut = key.indexOf(':')
  if (cut < 0) return null
  const namespace = key.slice(0, cut)
  if (!(namespace in FLAG_FACTS)) return null
  const rest = key.slice(cut + 1)
  const row: FactRow = FLAG_FACTS[namespace as FlagNamespace]
  for (const suffix of row.suffixes ?? []) {
    if (rest.endsWith(`:${suffix}`)) {
      return {
        namespace: namespace as FlagNamespace,
        id: rest.slice(0, -suffix.length - 1),
        suffix,
      }
    }
  }
  return { namespace: namespace as FlagNamespace, id: rest }
}

export function parseKnowledgeKey(
  key: string,
): { namespace: KnowledgeNamespace; id: string } | null {
  const cut = key.indexOf(':')
  if (cut < 0) return null
  const namespace = key.slice(0, cut)
  if (!(namespace in KNOWLEDGE_FACTS)) return null
  return { namespace: namespace as KnowledgeNamespace, id: key.slice(cut + 1) }
}
