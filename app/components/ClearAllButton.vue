<template>
  <button
    v-if="parts.length > 0"
    class="btn btn-danger clear-btn"
    type="button"
    @click="confirmClear"
  >
    Сбросить все детали
  </button>
</template>

<script setup lang="ts">
import { useGlassStore } from '~/composables/useGlassStore'

const { parts, clearAll } = useGlassStore()

function confirmClear() {
  if (confirm(`Удалить все ${parts.value.length} деталей?`)) clearAll()
}
</script>

<style scoped>
.clear-btn {
  opacity: 0.7;
  font-size: 14px;
  height: 44px;
}
</style>
