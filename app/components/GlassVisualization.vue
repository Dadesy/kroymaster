<template>
  <div class="card">
    <p class="card-title">Схема раскроя листа</p>

    <!-- Controls bar -->
    <div class="controls-bar">
      <!-- Mode toggle -->
      <div class="mode-toggle">
        <button
          class="mode-btn"
          :class="{ active: !isManualMode }"
          type="button"
          @click="isManualMode ? exitManualMode() : null"
        >⚡ Авто</button>
        <button
          class="mode-btn"
          :class="{ active: isManualMode }"
          type="button"
          @click="!isManualMode ? enterManualMode() : null"
        >✋ Ручной</button>
      </div>

      <!-- Kerf toggle + stepper -->
      <div class="kerf-group">
        <button
          class="icon-btn"
          :class="{ active: kerfEnabled }"
          type="button"
          @click="kerfEnabled = !kerfEnabled"
          title="Пропил (зазор на рез)"
        >✂ Пропил</button>
        <template v-if="kerfEnabled">
          <button class="stepper-btn" type="button" @click="kerfSize = Math.max(1, kerfSize - 1)">−</button>
          <span class="kerf-val">{{ kerfSize }} мм</span>
          <button class="stepper-btn" type="button" @click="kerfSize = Math.min(20, kerfSize + 1)">+</button>
        </template>
      </div>
    </div>

    <!-- Second row: overlays + export -->
    <div class="controls-bar" style="margin-top: -2px;">
      <button
        class="icon-btn"
        :class="{ active: showGaps && !isManualMode }"
        :disabled="isManualMode"
        type="button"
        @click="showGaps = !showGaps"
        title="Показать свободные остатки"
      >🟩 Остатки</button>

      <button
        class="icon-btn"
        :class="{ active: showPositions }"
        type="button"
        @click="showPositions = !showPositions"
        title="Показать координаты X/Y каждой детали"
      >📍 Позиции</button>

      <button
        class="icon-btn export-btn"
        type="button"
        @click="exportSVG"
        title="Скачать схему как SVG"
      >⬇ SVG</button>
    </div>

    <!-- Manual mode hint -->
    <div v-if="isManualMode" class="manual-hint">
      ✋ Ручной режим — перетаскивайте детали
      <span v-if="overlappingInstanceIds.size > 0" class="overlap-warn"> · {{ overlappingInstanceIds.size }} шт. пересекаются!</span>
    </div>

    <!-- Scraps summary -->
    <div v-if="showGaps && !isManualMode && freeRects.length > 0" class="gaps-summary">
      <span class="gaps-label">Свободные остатки (≥50×50 мм):</span>
      <span v-for="(fr, i) in freeRects.slice(0, 4)" :key="i" class="gap-chip">
        {{ fr.w }}×{{ fr.h }}
      </span>
      <span v-if="freeRects.length > 4" class="gap-more">+{{ freeRects.length - 4 }}</span>
    </div>

    <div ref="wrapRef" class="svg-wrap">
      <svg
        v-if="sheet.width > 0 && sheet.height > 0 && containerW > 0"
        ref="svgRef"
        :viewBox="`0 0 ${sheet.width} ${sheet.height}`"
        :width="containerW"
        :height="svgH"
        style="display: block; border-radius: 8px;"
        xmlns="http://www.w3.org/2000/svg"
        @pointermove.prevent="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <!-- Sheet background -->
        <rect
          x="0" y="0"
          :width="sheet.width" :height="sheet.height"
          fill="#EFF6FF"
          stroke="#BFDBFE"
          :stroke-width="sw(6)"
        />

        <!-- Grid lines -->
        <g opacity="0.25">
          <template v-for="gx in gridLines.x" :key="`gx-${gx}`">
            <line :x1="gx" y1="0" :x2="gx" :y2="sheet.height" stroke="#93C5FD" :stroke-width="sw(2)" />
          </template>
          <template v-for="gy in gridLines.y" :key="`gy-${gy}`">
            <line x1="0" :y1="gy" :x2="sheet.width" :y2="gy" stroke="#93C5FD" :stroke-width="sw(2)" />
          </template>
        </g>

        <!-- Free/scrap areas -->
        <g v-if="showGaps && !isManualMode">
          <g v-for="(fr, i) in freeRects" :key="`fr-${i}`">
            <rect
              :x="fr.x + sw(2)" :y="fr.y + sw(2)"
              :width="fr.w - sw(4)" :height="fr.h - sw(4)"
              fill="#10B981" opacity="0.13"
              stroke="#10B981" :stroke-width="sw(2)"
              stroke-dasharray="6 4"
              rx="3"
              pointer-events="none"
            />
            <!-- Dimension label inside scrap if big enough -->
            <text
              v-if="fr.w * scale > 60 && fr.h * scale > 26"
              :x="fr.x + fr.w / 2"
              :y="fr.y + fr.h / 2"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#065F46"
              :font-size="Math.max(sw(18), Math.min(fr.w, fr.h) / 6)"
              font-weight="600"
              font-family="-apple-system, sans-serif"
              opacity="0.8"
              pointer-events="none"
            >{{ fr.w }}×{{ fr.h }}</text>
          </g>
        </g>

        <!-- Placed pieces -->
        <g
          v-for="piece in placedPieces"
          :key="piece.instanceId"
          :style="{ cursor: isManualMode ? (dragging?.instanceId === piece.instanceId ? 'grabbing' : 'grab') : 'default' }"
        >
          <!-- Kerf dashed border -->
          <rect
            v-if="kerfEnabled"
            :x="piece.x"
            :y="piece.y"
            :width="piece.w + kerfSize"
            :height="piece.h + kerfSize"
            fill="none"
            stroke="#F59E0B"
            :stroke-width="sw(2)"
            stroke-dasharray="4 3"
            opacity="0.6"
            rx="2"
            pointer-events="none"
          />

          <!-- Shadow -->
          <rect
            :x="piece.x + sw(8)"
            :y="piece.y + sw(8)"
            :width="piece.w - sw(4)"
            :height="piece.h - sw(4)"
            :fill="PART_COLORS[piece.colorIndex]"
            opacity="0.15"
            rx="4"
            pointer-events="none"
          />
          <!-- Fill (drag target) -->
          <rect
            :x="piece.x + sw(3)"
            :y="piece.y + sw(3)"
            :width="piece.w - sw(6)"
            :height="piece.h - sw(6)"
            :fill="PART_COLORS[piece.colorIndex]"
            :opacity="overlappingInstanceIds.has(piece.instanceId) ? 0.5 : 0.85"
            :stroke="overlappingInstanceIds.has(piece.instanceId) ? '#EF4444' : PART_COLORS[piece.colorIndex]"
            :stroke-width="sw(overlappingInstanceIds.has(piece.instanceId) ? 5 : 3)"
            rx="4"
            @pointerdown.prevent="startDrag($event, piece.instanceId)"
          />

          <!-- Overlap red tint -->
          <rect
            v-if="overlappingInstanceIds.has(piece.instanceId)"
            :x="piece.x + sw(3)"
            :y="piece.y + sw(3)"
            :width="piece.w - sw(6)"
            :height="piece.h - sw(6)"
            fill="#EF4444"
            opacity="0.2"
            rx="4"
            pointer-events="none"
          />

          <!-- Label -->
          <text
            v-if="piece.w * scale > 48 && piece.h * scale > 22"
            :x="piece.x + piece.w / 2"
            :y="piece.y + piece.h / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="white"
            :font-size="labelSize(piece.w, piece.h)"
            font-weight="700"
            font-family="-apple-system, sans-serif"
            pointer-events="none"
          >{{ piece.label }}</text>

          <!-- Rotation indicator -->
          <text
            v-if="piece.rotated && piece.w * scale > 30 && piece.h * scale > 30"
            :x="piece.x + piece.w - sw(18)"
            :y="piece.y + sw(22)"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="white"
            :font-size="sw(20)"
            opacity="0.8"
            pointer-events="none"
          >↻</text>

          <!-- Position label (X, Y from top-left corner) -->
          <text
            v-if="showPositions && piece.w * scale > 50"
            :x="piece.x + sw(6)"
            :y="piece.y + piece.h - sw(8)"
            dominant-baseline="auto"
            fill="white"
            :font-size="sw(16)"
            font-family="-apple-system, sans-serif"
            opacity="0.75"
            pointer-events="none"
          >{{ piece.x }},{{ piece.y }}</text>
        </g>

        <!-- Dimension labels -->
        <text
          :x="sheet.width / 2"
          :y="sheet.height - sw(14)"
          text-anchor="middle"
          :fill="dimColor"
          :font-size="sw(28)"
          font-family="-apple-system, sans-serif"
          font-weight="600"
          pointer-events="none"
        >{{ sheet.width }} мм</text>

        <text
          :x="sw(28)"
          :y="sheet.height / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="dimColor"
          :font-size="sw(28)"
          font-family="-apple-system, sans-serif"
          font-weight="600"
          :transform="`rotate(-90, ${sw(28)}, ${sheet.height / 2})`"
          pointer-events="none"
        >{{ sheet.height }} мм</text>
      </svg>

      <div v-else class="empty-state">
        Укажите размеры листа
      </div>
    </div>

    <p v-if="totalUnplaced > 0" class="warn">
      ⚠️ {{ totalUnplaced }} шт. не разместились — не хватает места на листе
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGlassStore, PART_COLORS } from '~/composables/useGlassStore'

const {
  sheet, placedPieces, totalUnplaced,
  kerfEnabled, kerfSize,
  isManualMode, enterManualMode, exitManualMode, movePiece,
  overlappingInstanceIds,
  showGaps, showPositions,
  freeRects,
} = useGlassStore()

const wrapRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const containerW = ref(0)

const scale = computed(() =>
  sheet.value.width > 0 ? containerW.value / sheet.value.width : 1
)

const svgH = computed(() =>
  sheet.value.height > 0 && sheet.value.width > 0
    ? Math.round(containerW.value * sheet.value.height / sheet.value.width)
    : 0
)

function sw(px: number): number {
  return scale.value > 0 ? px / scale.value : px
}

function labelSize(w: number, h: number): number {
  return Math.max(sw(12), Math.min(w, h) / 7)
}

const dimColor = '#94A3B8'

const gridLines = computed(() => {
  const xs: number[] = []
  const ys: number[] = []
  const step = 5
  for (let i = 1; i < step; i++) {
    xs.push(Math.round(sheet.value.width * i / step))
    ys.push(Math.round(sheet.value.height * i / step))
  }
  return { x: xs, y: ys }
})

// ── Drag ─────────────────────────────────────────────────────────────────────
interface DragState {
  instanceId: string
  pointerId: number
  offsetX: number
  offsetY: number
}

const dragging = ref<DragState | null>(null)

function svgPoint(e: PointerEvent): { x: number; y: number } | null {
  const svg = svgRef.value
  if (!svg) return null
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const svgPt = pt.matrixTransform(ctm.inverse())
  return { x: svgPt.x, y: svgPt.y }
}

function startDrag(e: PointerEvent, instanceId: string) {
  if (!isManualMode.value) return
  const pt = svgPoint(e)
  if (!pt) return
  const piece = placedPieces.value.find(p => p.instanceId === instanceId)
  if (!piece) return
  ;(e.target as Element).setPointerCapture(e.pointerId)
  dragging.value = {
    instanceId,
    pointerId: e.pointerId,
    offsetX: pt.x - piece.x,
    offsetY: pt.y - piece.y,
  }
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== dragging.value.pointerId) return
  const pt = svgPoint(e)
  if (!pt) return
  movePiece(dragging.value.instanceId, pt.x - dragging.value.offsetX, pt.y - dragging.value.offsetY)
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== dragging.value.pointerId) return
  dragging.value = null
}

// ── Export SVG ────────────────────────────────────────────────────────────────
function exportSVG() {
  const svg = svgRef.value
  if (!svg) return
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svg)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `raskroj-${sheet.value.width}x${sheet.value.height}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

// ── ResizeObserver ────────────────────────────────────────────────────────────
let ro: ResizeObserver | null = null

function measure() {
  if (wrapRef.value) containerW.value = wrapRef.value.clientWidth
}

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (wrapRef.value) ro.observe(wrapRef.value)
})

onUnmounted(() => ro?.disconnect())
</script>

<style scoped>
.controls-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

/* Mode toggle */
.mode-toggle {
  display: flex;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.mode-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: #F8FAFC;
  color: #64748B;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  line-height: 1.4;
}

.mode-btn:first-child { border-right: 1.5px solid #E2E8F0; }
.mode-btn.active { background: #2563EB; color: white; }

/* Icon buttons */
.icon-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 600;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  background: #F8FAFC;
  color: #64748B;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.icon-btn:disabled { opacity: 0.4; cursor: default; }

.icon-btn.active {
  background: #F0FDF4;
  border-color: #10B981;
  color: #065F46;
}

.kerf-group .icon-btn.active {
  background: #FFFBEB;
  border-color: #F59E0B;
  color: #B45309;
}

.export-btn.icon-btn {
  margin-left: auto;
  background: #EFF6FF;
  border-color: #BFDBFE;
  color: #2563EB;
}

/* Kerf group */
.kerf-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stepper-btn {
  width: 26px;
  height: 26px;
  border: 1.5px solid #E2E8F0;
  border-radius: 8px;
  background: #F8FAFC;
  font-size: 16px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.1s;
}

.stepper-btn:active { background: #E2E8F0; }

.kerf-val {
  font-size: 13px;
  font-weight: 700;
  color: #B45309;
  min-width: 36px;
  text-align: center;
}

/* Hints */
.manual-hint {
  font-size: 12px;
  color: #475569;
  background: #F1F5F9;
  padding: 6px 10px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.overlap-warn {
  color: #DC2626;
  font-weight: 700;
}

/* Gaps summary chips */
.gaps-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
  font-size: 12px;
}

.gaps-label {
  color: #64748B;
  font-weight: 500;
}

.gap-chip {
  background: #D1FAE5;
  color: #065F46;
  font-weight: 700;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 99px;
}

.gap-more {
  color: #94A3B8;
  font-size: 11px;
}

/* SVG wrap */
.svg-wrap {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #F8FAFC;
  min-height: 80px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: #CBD5E1;
  font-size: 14px;
}

.warn {
  margin-top: 10px;
  font-size: 13px;
  color: #D97706;
  background: #FFFBEB;
  padding: 8px 12px;
  border-radius: 8px;
}
</style>
