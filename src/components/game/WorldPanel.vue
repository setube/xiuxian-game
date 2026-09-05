<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'

import { describeStamp } from '@/engine/describe'
import { useWorldStore } from '@/stores/world'

/**
 * 世界：此刻与足迹。
 *
 * 没有地图，也没有未探索区域的灰块——一个人对世界的认识就是
 * 「我此刻在哪」和「我到过哪些地方」。没去过的地方不在这里，
 * 它们只可能出现在「知识」里：听说过，但没去过。
 */
const emit = defineEmits<{ restart: [] }>()

const world = useWorldStore()
const { place, time, visited } = storeToRefs(world)

/** 弃掉这一生是不可逆的，问一次再动手 */
const asking = ref(false)
</script>

<template>
  <div>
    <section>
      <h3 class="ink-label">此刻</h3>
      <p class="now">{{ place }}</p>
      <p class="ink-note">{{ describeStamp(time) }}</p>
    </section>

    <section class="block">
      <h3 class="ink-label">足迹</h3>
      <ul class="trail">
        <li v-for="spot in visited" :key="spot" :class="{ here: spot === place }">
          {{ spot }}
          <span v-if="spot === place" class="tail">此刻在此</span>
        </li>
      </ul>
    </section>

    <section class="block danger">
      <h3 class="ink-label">重来</h3>
      <template v-if="asking">
        <p class="ink-note warn">这一生的经历、见闻与所记之事都会散去，不可复得。</p>
        <div class="row">
          <button type="button" class="act keep" @click="asking = false">【再想想】</button>
          <button type="button" class="act drop" @click="emit('restart')">【确认重来】</button>
        </div>
      </template>
      <template v-else>
        <p class="ink-note">弃掉这一生，从十六岁那个清晨重新开始。</p>
        <div class="row">
          <button type="button" class="act" @click="asking = true">【重开此生】</button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 0.35rem;
  font-weight: normal;
}

.block {
  margin-top: 1.3rem;
}

.now {
  margin: 0;
  color: var(--color-ink-deep);
  line-height: 1.6;
}

.trail {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-note);
  line-height: 1.9;
}

.trail > li {
  color: var(--color-ink-faint);
}

/* 正身处的那一处：朱砂，且左侧多一道短标记 */
.trail > li.here {
  color: var(--color-cinnabar);
}

.tail {
  color: var(--color-ink-faint);
  font-size: var(--text-micro);
  letter-spacing: 0.08em;
}

.tail::before {
  content: '　·　';
}

.danger {
  border-top: 1px solid var(--color-rule);
  padding-top: 1rem;
}

.warn {
  color: var(--color-cinnabar-soft);
}

.row {
  display: flex;
  margin-top: 0.5rem;
}

/* 间距走相邻兄弟的 margin，不用 gap——弹性盒的 gap 要 Chrome 84，
   而这个项目的下限是 51。这一行没有换行，所以两者完全等价 */
.row > * + * {
  margin-left: 1.4rem;
}

.act {
  border: 0;
  background: none;
  color: var(--color-ink-faint);
  font-family: inherit;
  font-size: var(--text-note);
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.act:hover {
  color: var(--color-ink-deep);
}

.act.drop:hover {
  color: var(--color-cinnabar);
}

.act:focus-visible {
  outline: 1px solid var(--color-ink-faint);
  outline-offset: 2px;
}
</style>
