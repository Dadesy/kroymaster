<template>
  <div class="card">
    <!-- Header with toggle -->
    <button class="card-header" type="button" @click="open = !open">
      <p class="card-title" style="margin-bottom: 0;">Таблица кроя</p>
      <span class="header-meta">
        <span v-if="placedPieces.length > 0" class="count-badge">{{ placedPieces.length }} шт.</span>
        <span class="chevron" :class="{ rotated: open }">▾</span>
      </span>
    </button>

    <template v-if="open">
      <div v-if="placedPieces.length === 0" class="empty">
        Нет размещённых деталей
      </div>

      <template v-else>
        <!-- Table -->
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Название</th>
                <th>Ш × В, мм</th>
                <th>X, мм</th>
                <th>Y, мм</th>
                <th>↻</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(piece, idx) in placedPieces"
                :key="piece.instanceId"
              >
                <td class="td-num">{{ idx + 1 }}</td>
                <td>
                  <span class="dot" :style="{ background: PART_COLORS[piece.colorIndex] }" />
                  {{ piece.label || `Деталь` }}
                </td>
                <td class="td-dims">{{ piece.w }}&thinsp;×&thinsp;{{ piece.h }}</td>
                <td class="td-coord">{{ piece.x }}</td>
                <td class="td-coord">{{ piece.y }}</td>
                <td class="td-rot">{{ piece.rotated ? '↻' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Copy button -->
        <button class="copy-btn" type="button" @click="copyToClipboard">
          {{ copied ? '✓ Скопировано' : '📋 Копировать список' }}
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGlassStore, PART_COLORS } from '~/composables/useGlassStore'

const { placedPieces } = useGlassStore()

const open = ref(false)
const copied = ref(false)

function copyToClipboard() {
  const header = '#\tНазвание\tШирина\tВысота\tX\tY\tПовёрнута'
  const rows = placedPieces.value.map((p, i) =>
    `${i + 1}\t${p.label}\t${p.w}\t${p.h}\t${p.x}\t${p.y}\t${p.rotated ? 'да' : 'нет'}`,
  )
  navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0;
  text-align: left;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.count-badge {
  font-size: 11px;
  font-weight: 700;
  background: #EFF6FF;
  color: #2563EB;
  padding: 2px 8px;
  border-radius: 99px;
}

.chevron {
  font-size: 18px;
  color: #94A3B8;
  transition: transform 0.2s;
  line-height: 1;
}

.chevron.rotated { transform: rotate(180deg); }

/* Table */
.table-wrap {
  overflow-x: auto;
  margin-top: 12px;
  border-radius: 10px;
  border: 1px solid #F1F5F9;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table thead tr {
  background: #F8FAFC;
}

.table th {
  padding: 8px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border-bottom: 1px solid #F1F5F9;
}

.table td {
  padding: 8px 10px;
  color: #334155;
  border-bottom: 1px solid #F8FAFC;
  white-space: nowrap;
}

.table tbody tr:last-child td { border-bottom: none; }
.table tbody tr:hover { background: #F8FAFC; }

.td-num { color: #94A3B8; font-size: 11px; }
.td-dims { font-weight: 600; color: #1E293B; font-variant-numeric: tabular-nums; }
.td-coord { font-variant-numeric: tabular-nums; color: #475569; }
.td-rot { text-align: center; }

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Copy button */
.copy-btn {
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #2563EB;
  background: #EFF6FF;
  border: 1.5px solid #BFDBFE;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.copy-btn:active { background: #DBEAFE; }

.empty {
  margin-top: 12px;
  text-align: center;
  color: #CBD5E1;
  font-size: 13px;
  padding: 12px 0;
}
</style>
