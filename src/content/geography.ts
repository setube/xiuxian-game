/**
 * 地理。
 *
 * 一条大江自西向东，贯穿数州，沿岸设府。这不是装饰性的设定，
 * 是一条硬约束——收尾那一卷靠「渡口」和「江面」立住，
 * 所以每一个府都必须临水。古时设府本来也多在漕运要冲上，
 * 这一条既省事又不假。
 *
 * 州府和乡里是分开的：`PREFECTURES` 管到府，出身管到街巷。
 * 两边组合，一个农家子就可能生在江陵府的杏花坞，
 * 也可能生在东莱府的下河屯——而不是所有人都挤在临江府。
 */
export interface Prefecture {
  /** 州 */
  province: string
  /** 府 */
  name: string
  /** 掷中的相对权重。大府人多，小府人少 */
  weight: number
}

/**
 * 十府，四州。
 *
 * 权重按「人多的地方生下来的人也多」配：通都大邑重，边远的府轻。
 * 这一掷和出身是分开掷的——生在哪个府，跟你家做什么营生没有关系。
 */
export const PREFECTURES: readonly Prefecture[] = [
  // 云州 · 中游，江面最宽的一段
  { province: '云州', name: '临江府', weight: 16 },
  { province: '云州', name: '清河府', weight: 11 },
  { province: '云州', name: '白鹭府', weight: 8 },
  // 荆州 · 上游，多山，水急
  { province: '荆州', name: '江陵府', weight: 13 },
  { province: '荆州', name: '汉阳府', weight: 10 },
  // 扬州 · 下游，最富庶
  { province: '扬州', name: '姑苏府', weight: 15 },
  { province: '扬州', name: '钱塘府', weight: 14 },
  { province: '扬州', name: '广陵府', weight: 12 },
  // 青州 · 东北，入海口一带
  { province: '青州', name: '东莱府', weight: 7 },
  { province: '青州', name: '历城府', weight: 9 },
]

/** 京城。不属任何州，皇室生在这里 */
export const CAPITAL = '天启 · 皇城'
