import { ref, computed } from 'vue'

export interface GlassPart {
  id: string
  label: string
  width: number
  height: number
  quantity: number
}

export interface PlacedPiece {
  instanceId: string   // unique: `${partId}-${i}`
  partId: string
  label: string
  x: number
  y: number
  w: number
  h: number
  colorIndex: number
  rotated: boolean
}

export const PART_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

// ── MaxRects 2D Bin Packing ─────────────────────────────────────────────────
// Strategy: Best Short Side Fit (BSSF) with rotation + kerf support.
// Each piece occupies (w + kerf) × (h + kerf) in packing space,
// but is rendered at its original w × h dimensions.

interface Rect { x: number; y: number; w: number; h: number }

function maxRectsPack(
  sheetW: number,
  sheetH: number,
  pieces: Array<{
    instanceId: string; partId: string; label: string
    w: number; h: number; colorIndex: number
  }>,
  kerf = 0,
): PlacedPiece[] {
  const placed: PlacedPiece[] = []
  let free: Rect[] = [{ x: 0, y: 0, w: sheetW, h: sheetH }]

  for (const piece of pieces) {
    type Candidate = {
      freeIdx: number; x: number; y: number
      w: number; h: number          // actual render size
      bw: number; bh: number        // block size incl. kerf
      rotated: boolean; score: number
    }
    let best: Candidate | null = null

    const orientations = [
      { w: piece.w, h: piece.h, bw: piece.w + kerf, bh: piece.h + kerf, rotated: false },
      ...(piece.w !== piece.h
        ? [{ w: piece.h, h: piece.w, bw: piece.h + kerf, bh: piece.w + kerf, rotated: true }]
        : []),
    ]

    for (let fi = 0; fi < free.length; fi++) {
      const f = free[fi]
      for (const o of orientations) {
        if (o.bw > f.w || o.bh > f.h) continue
        const score = Math.min(f.w - o.bw, f.h - o.bh)
        if (!best || score < best.score)
          best = { freeIdx: fi, x: f.x, y: f.y, ...o, score }
      }
    }

    if (!best) continue

    placed.push({
      instanceId: piece.instanceId,
      partId: piece.partId,
      label: piece.label,
      x: best.x, y: best.y,
      w: best.w, h: best.h,
      colorIndex: piece.colorIndex,
      rotated: best.rotated,
    })

    // Use block rect (with kerf) for splitting
    const block: Rect = { x: best.x, y: best.y, w: best.bw, h: best.bh }

    const nextFree: Rect[] = []
    for (const f of free) {
      if (!rectsIntersect(block, f)) { nextFree.push(f); continue }
      if (block.x > f.x)
        nextFree.push({ x: f.x, y: f.y, w: block.x - f.x, h: f.h })
      if (block.x + block.w < f.x + f.w)
        nextFree.push({ x: block.x + block.w, y: f.y, w: (f.x + f.w) - (block.x + block.w), h: f.h })
      if (block.y > f.y)
        nextFree.push({ x: f.x, y: f.y, w: f.w, h: block.y - f.y })
      if (block.y + block.h < f.y + f.h)
        nextFree.push({ x: f.x, y: block.y + block.h, w: f.w, h: (f.y + f.h) - (block.y + block.h) })
    }
    free = pruneContained(nextFree)
  }

  return placed
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.x >= b.x + b.w || a.x + a.w <= b.x || a.y >= b.y + b.h || a.y + a.h <= b.y)
}

function pruneContained(rects: Rect[]): Rect[] {
  return rects.filter((r, i) =>
    !rects.some((o, j) =>
      i !== j && o.x <= r.x && o.y <= r.y &&
      o.x + o.w >= r.x + r.w && o.y + o.h >= r.y + r.h,
    ),
  )
}

// ── Singleton state ─────────────────────────────────────────────────────────
const sheet = ref({ width: 1000, height: 2000 })
const parts = ref<GlassPart[]>([])
const editTarget = ref<GlassPart | null>(null)

// Kerf
const kerfEnabled = ref(false)
const kerfSize = ref(2)

// Manual mode
const isManualMode = ref(false)
const manualPlacements = ref<PlacedPiece[]>([])

export function useGlassStore() {
  // ── Area ────────────────────────────────────────────────────────
  const totalArea = computed(() => sheet.value.width * sheet.value.height)

  const partsArea = computed(() =>
    parts.value.reduce((sum, p) => sum + p.width * p.height * p.quantity, 0),
  )

  const remainderArea = computed(() => totalArea.value - partsArea.value)

  const utilizationPct = computed(() =>
    totalArea.value > 0
      ? Math.min(Math.round((partsArea.value / totalArea.value) * 100), 999)
      : 0,
  )

  // ── Auto packing ────────────────────────────────────────────────
  const autoPlacements = computed<PlacedPiece[]>(() => {
    const sw = sheet.value.width
    const sh = sheet.value.height
    const kerf = kerfEnabled.value ? kerfSize.value : 0

    const colorMap = new Map<string, number>()
    parts.value.forEach((p, i) => colorMap.set(p.id, i % PART_COLORS.length))

    const expanded: Array<{
      instanceId: string; partId: string; label: string
      w: number; h: number; colorIndex: number; area: number
    }> = []

    for (const part of parts.value) {
      const fitsN = part.width <= sw && part.height <= sh
      const fitsR = part.height <= sw && part.width <= sh
      if (!fitsN && !fitsR) continue

      const label = part.label || `${part.width}×${part.height}`
      const colorIndex = colorMap.get(part.id) ?? 0

      for (let i = 0; i < part.quantity; i++) {
        expanded.push({
          instanceId: `${part.id}-${i}`,
          partId: part.id, label,
          w: part.width, h: part.height,
          colorIndex,
          area: part.width * part.height,
        })
      }
    }

    expanded.sort((a, b) => b.area - a.area)
    return maxRectsPack(sw, sh, expanded, kerf)
  })

  // Exposed placed pieces: manual or auto
  const placedPieces = computed<PlacedPiece[]>(() =>
    isManualMode.value ? manualPlacements.value : autoPlacements.value,
  )

  // ── Overlap detection (manual mode only) ────────────────────────
  const overlappingInstanceIds = computed((): Set<string> => {
    if (!isManualMode.value) return new Set()
    const pieces = manualPlacements.value
    const result = new Set<string>()
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i], b = pieces[j]
        if (
          a.x < b.x + b.w && a.x + a.w > b.x &&
          a.y < b.y + b.h && a.y + a.h > b.y
        ) {
          result.add(a.instanceId)
          result.add(b.instanceId)
        }
      }
    }
    return result
  })

  // ── Manual mode actions ─────────────────────────────────────────
  function enterManualMode() {
    manualPlacements.value = autoPlacements.value.map(p => ({ ...p }))
    isManualMode.value = true
  }

  function exitManualMode() {
    isManualMode.value = false
    manualPlacements.value = []
  }

  /** Move a piece by instanceId; clamps to sheet bounds. */
  function movePiece(instanceId: string, x: number, y: number) {
    if (!isManualMode.value) return
    const idx = manualPlacements.value.findIndex(p => p.instanceId === instanceId)
    if (idx === -1) return
    const p = manualPlacements.value[idx]
    const sw = sheet.value.width, sh = sheet.value.height
    manualPlacements.value = [
      ...manualPlacements.value.slice(0, idx),
      { ...p, x: Math.max(0, Math.min(Math.round(x), sw - p.w)), y: Math.max(0, Math.min(Math.round(y), sh - p.h)) },
      ...manualPlacements.value.slice(idx + 1),
    ]
  }

  // ── Placement statistics ─────────────────────────────────────────
  const partPlacedCounts = computed((): Record<string, number> => {
    const counts: Record<string, number> = {}
    for (const p of placedPieces.value)
      counts[p.partId] = (counts[p.partId] ?? 0) + 1
    return counts
  })

  const totalRequested = computed(() =>
    parts.value.reduce((s, p) => s + p.quantity, 0),
  )
  const totalPlaced = computed(() => placedPieces.value.length)
  const totalUnplaced = computed(() => totalRequested.value - totalPlaced.value)

  const placedArea = computed(() =>
    placedPieces.value.reduce((s, p) => s + p.w * p.h, 0),
  )
  const sheetRemainder = computed(() => totalArea.value - placedArea.value)
  const placedPct = computed(() =>
    totalArea.value > 0 ? Math.round((placedArea.value / totalArea.value) * 100) : 0,
  )

  const oversizedPartIds = computed(() =>
    new Set(
      parts.value
        .filter(p => {
          const sw = sheet.value.width, sh = sheet.value.height
          return (p.width > sw || p.height > sh) && (p.height > sw || p.width > sh)
        })
        .map(p => p.id),
    ),
  )

  // ── Helpers ─────────────────────────────────────────────────────
  function canFitRotated(part: GlassPart): boolean {
    const { width: sw, height: sh } = sheet.value
    const fits = (w: number, h: number) => w <= sw && h <= sh
    return !fits(part.width, part.height) && fits(part.height, part.width)
  }

  function addPart(data: Omit<GlassPart, 'id'>) {
    if (isManualMode.value) exitManualMode()
    parts.value.push({ ...data, id: Date.now().toString() })
  }

  function updatePart(id: string, data: Omit<GlassPart, 'id'>) {
    if (isManualMode.value) exitManualMode()
    const idx = parts.value.findIndex(p => p.id === id)
    if (idx !== -1) parts.value[idx] = { ...data, id }
  }

  function deletePart(id: string) {
    if (isManualMode.value) exitManualMode()
    parts.value = parts.value.filter(p => p.id !== id)
    if (editTarget.value?.id === id) editTarget.value = null
  }

  function partColorIndex(id: string): number {
    return parts.value.findIndex(p => p.id === id) % PART_COLORS.length
  }

  return {
    sheet, parts, editTarget,
    // kerf
    kerfEnabled, kerfSize,
    // manual mode
    isManualMode, enterManualMode, exitManualMode, movePiece,
    overlappingInstanceIds,
    // area
    totalArea, partsArea, remainderArea, placedArea, sheetRemainder,
    utilizationPct, placedPct,
    // pieces
    totalRequested, totalPlaced, totalUnplaced,
    placedPieces, partPlacedCounts, oversizedPartIds,
    // helpers
    canFitRotated, addPart, updatePart, deletePart, partColorIndex,
  }
}
