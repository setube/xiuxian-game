<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { ASPECTS } from '@/engine/aspects'
import { describeAge, describeStamp } from '@/engine/describe'
import { useCharacterStore } from '@/stores/character'
import { useHouseholdStore } from '@/stores/household'
import { useWorldStore } from '@/stores/world'
import type { AspectKey } from '@/types/game'

/**
 * 人物：第二层信息。
 *
 * 这里没有「悟性 尚可」「气运 平平」——一个十六岁的私塾学生
 * 凭什么知道自己的气运？他只知道「我读过几年书」「我不知道灵根是什么」。
 * 数值留在引擎里做判定，界面上呈现的是角色对自己的认知，
 * 以及别人对他说过的话（只增不改，落差自己会显形）。
 *
 * 家世同理：standing 与 debt 一个字也不上界面。
 * 一个孩子对家境的全部认识就是饭桌上有没有肉、父亲这几年在哪——
 * 「家道中落」要从这两行读出来，不是从一个数字上看出来。
 */
const character = useCharacterStore()
const household = useHouseholdStore()
const world = useWorldStore()

const { name, age, identity, realm, aspects } = storeToRefs(character)
const { trade, gender, home, members, outlook } = storeToRefs(household)
const { place } = storeToRefs(world)

function selfOf(key: AspectKey, fallback: string): string {
  return aspects.value[key].self ?? fallback
}

function isUnknown(key: AspectKey): boolean {
  return aspects.value[key].self === null
}
</script>

<template>
  <div>
    <dl class="facts">
      <dt>姓名</dt>
      <dd>{{ name }}</dd>
      <dt>年龄</dt>
      <dd>{{ describeAge(age) }} · {{ gender }}</dd>
      <dt>身份</dt>
      <dd>{{ identity }}</dd>
      <!-- 凡人不会用「境界」想自己。等真入了门，这一行才有意义 -->
      <template v-if="realm !== '凡人'">
        <dt>修为</dt>
        <dd class="text-cinnabar">{{ realm }}</dd>
      </template>
      <dt>所在</dt>
      <dd>{{ place }}</dd>
    </dl>

    <!-- 家世。人没了也不从名册里删，只是那一行变浅——
         父亲死在外地那年你十四岁，这件事此后一直在你的人生里 -->
    <section class="household">
      <h3 class="ink-label">家世</h3>
      <p class="self">你家在{{ home }}，{{ trade }}。</p>
      <p class="self outlook">{{ outlook }}</p>
      <ul class="kin">
        <li v-for="member in members" :key="member.id" :class="{ gone: !member.alive }">
          <span class="who">{{ member.relation }}</span>
          <span class="what">{{ member.note }}</span>
        </li>
      </ul>
    </section>

    <section v-for="aspect in ASPECTS" :key="aspect.key" class="aspect">
      <h3 class="ink-label">{{ aspect.label }}</h3>
      <p class="self" :class="{ blank: isUnknown(aspect.key) }">
        {{ selfOf(aspect.key, aspect.unknown) }}
      </p>

      <ul v-if="aspects[aspect.key].claims.length > 0" class="claims">
        <li v-for="claim in aspects[aspect.key].claims" :key="claim.id">
          <p class="ink-branch">
            <span>{{ claim.source }}说：「{{ claim.text }}」</span>
          </p>
          <p v-if="claim.doubt" class="doubt">{{ claim.doubt }}</p>
          <p class="ink-stamp when">{{ describeStamp(claim.at) }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* 四项事实，两列对齐。这一块要一眼扫完，不该有阅读的节奏 */
.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 1.1rem;
  margin: 0 0 1.4rem;
  font-size: var(--text-note);
}

.facts dt {
  color: var(--color-ink-faint);
  letter-spacing: 0.16em;
}

.facts dd {
  margin: 0;
  color: var(--color-ink-deep);
}

.aspect + .aspect {
  margin-top: 1.1rem;
}

.household {
  margin-bottom: 1.4rem;
}

.household h3,
.aspect h3 {
  margin: 0 0 0.25rem;
  font-weight: normal;
}

/* 家中光景比出身那一行重：出身十六年不变，光景年年在动 */
.outlook {
  color: var(--color-ink-deep);
}

.kin {
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-note);
}

.kin > li {
  display: grid;
  grid-template-columns: 3.2em 1fr;
  gap: 0 0.8rem;
  line-height: 1.75;
}

.kin .who {
  color: var(--color-ink-faint);
  letter-spacing: 0.16em;
}

.kin .what {
  color: var(--color-ink-deep);
}

/* 不在了的人不从名册里删，只是整行退到淡墨——这一生他还在里面 */
.kin > li.gone .what {
  color: var(--color-ink-faint);
}

.self {
  margin: 0;
  line-height: 1.8;
}

/* 「你不知道那是什么」本身就是一条信息，但它比自述更轻 */
.self.blank {
  color: var(--color-ink-faint);
}

.claims {
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

.claims > li + li {
  margin-top: 0.6rem;
}

/* 你对这句话的理解——通常是不理解。缩到连接符之后，说明它从属于上一句 */
.doubt {
  margin: 0.1rem 0 0;
  padding-inline-start: 1.4em;
  color: var(--color-ink-faint);
  font-family: var(--font-kai);
  font-size: var(--text-note);
  line-height: 1.75;
}

.when {
  margin: 0.1rem 0 0;
  padding-inline-start: 1.4em;
}
</style>
