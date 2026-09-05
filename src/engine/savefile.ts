/**
 * 存档闸。
 *
 * ## 这道闸是从一个 undefined 里长出来的
 *
 * 人际面板上出现过「爹 43岁。undefined」。那五个英文字母的来路是这样的：
 * `Person.doing` 这一格从前叫 `trade`，`b27fa1c` 那次改了名。
 * 代码全改对了，可**玩家的存档没跟着改**——`localStorage` 里躺着的还是
 * `trade`，恢复回来 `doing` 就是 `undefined`，而
 * `` `${person.doing}` `` 把它原样印到了脸上。
 *
 * 那一次只是**恰好**漏到了界面上。同一批改动里还有看不见的：
 * `engine/lifespan.ts` 是新加的，旧存档里没有天年那一格——
 * 一个从旧存档恢复出来的人，他这辈子什么时候死是没有答案的。
 * 界面上不会有任何异样。
 *
 * ## 为什么不做逐字段迁移
 *
 * 迁移只救得了想得起来的那几格。`trade → doing` 想得起来是因为它露了馅，
 * 而露馅是运气——它恰好被一个模板字符串直接印了出来。
 * 没露馅的那些（缺了的天年、改了形状的阶段、新加的旗标）
 * 一条迁移规则也不会有人写，因为没有人知道它们坏了。
 *
 * 所以这里的判断是：**存档格式一动，旧存档就不要了。**
 * 一局从出生走到死，本来就该是一口气的事；
 * 拿一个半新半旧的世界接着演，比重开一局坏得多。
 *
 * ## 版本号是手写的，这一点没法自动
 *
 * 试过让它自己算：把各 store 的 `pick` 列表拼一个指纹。**抓不到这次这种**——
 * `people` 的 pick 是 `['roster', 'known', 'relations']`，
 * 而 `trade → doing` 是 `roster` 里每个人身上的一格，pick 一个字没变。
 * 运行时没有类型，算不出「形状」这回事。
 *
 * 于是它只能是一个手写的数，代价是**改了结构忘了 bump，这道闸就等于不存在**。
 * 看住这件事的是 `scripts/savefile.ts`：它存一份旧格式进去，
 * 确认闸真的会清。闸失效的时候那一支会红。
 */

/**
 * 存档格式的版本。
 *
 * **动了任何一处持久化的形状就 +1**：某个 store 的 `pick` 增删、
 * `Person` / `Household` 这类存进去的对象改了字段名或字段含义、
 * 新加一个 `persist` 的 store。拿不准就 +1——重开一局的代价，
 * 远小于一个半新半旧的世界。
 */
export const SAVE_VERSION = 3

/** 版本号存在哪。它自己不属于任何 store，所以不走 pinia */
const VERSION_KEY = 'xiuxian:version'

/** 所有存档键的前缀。八个 store 的 `persist.key` 全是这个开头 */
const SAVE_PREFIX = 'xiuxian:'

/**
 * 存档对不对得上这一版的代码。对不上就清掉。
 *
 * **必须在 `createPinia()` 之前调用**——插件一装上，
 * 各 store 第一次被用到时就会去读 `localStorage`，那时候再清已经晚了：
 * 旧数据已经进了内存。
 *
 * @param storage 存档放在哪。传得进来是为了走查能拿一个假的进去
 * @returns 清掉了旧存档就返回 true
 */
export function guardSaveFile(storage: Storage = localStorage): boolean {
  const stored = storage.getItem(VERSION_KEY)

  if (stored === String(SAVE_VERSION)) return false

  // 一个键也没有：全新的浏览器，没什么可清的，记下版本就走
  const keys: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key?.startsWith(SAVE_PREFIX)) keys.push(key)
  }

  for (const key of keys) storage.removeItem(key)
  storage.setItem(VERSION_KEY, String(SAVE_VERSION))

  // 版本键本身也在前缀里，刚刚被一起清了又写回去。所以「清掉过东西」
  // 要看的是**除它以外**还有没有别的键
  return keys.some((key) => key !== VERSION_KEY)
}
