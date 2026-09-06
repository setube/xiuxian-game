/* eslint-disable no-console -- 种子要打印出来，不然红了没法复现 */
/**
 * 门禁脚本的第一行：`import './lib/seeded'`。
 *
 * 它做一件事：装种子。放在第一个 import 的位置是有意的——ESM 按出现顺序求值，
 * 这一行在 `../src/content/*` 之前跑完，内容模块加载期若有随机（掷名字、洗牌），
 * 也已经在种子之下。
 *
 * 打印的那一行是给人看的：单跑红了，把 `SEED=…` 抄回去就能复现。
 * `gates.ts` 里跑的那些，复现命令由它统一打印。
 */
import { installSeed, seedFromEnv } from './seed'

const seed = installSeed(seedFromEnv())
console.log(`种子 ${seed}`)
