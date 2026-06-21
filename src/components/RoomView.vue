<script setup lang="ts">
import { computed } from 'vue'
import { useSavingStore } from '@/stores/saving'
import { useDecorations } from '@/composables/useDecorations'

const store = useSavingStore()
const { getDecorationById } = useDecorations()

const activeWallpaper = computed(() => {
  const id = store.activeDecorations.wallpaper
  return id ? getDecorationById(id) : null
})

const activeFloor = computed(() => {
  const id = store.activeDecorations.floor
  return id ? getDecorationById(id) : null
})

const activeItems = computed(() => {
  return store.activeDecorations.items
    .map((id) => getDecorationById(id))
    .filter((d) => d && d.type === 'item')
})

const wallpaperStyle = computed(() => {
  const wp = activeWallpaper.value
  if (!wp) return { backgroundColor: '#FFF8F0' }

  const style: Record<string, string> = {}
  if (wp.style.gradient) {
    style.background = wp.style.gradient
  } else if (wp.style.backgroundColor) {
    style.backgroundColor = wp.style.backgroundColor
  }
  if (wp.style.pattern) {
    style.backgroundImage = getPatternImage(wp.style.pattern)
    style.backgroundSize = getPatternSize(wp.style.pattern)
  }
  return style
})

const floorStyle = computed(() => {
  const fl = activeFloor.value
  if (!fl) return { backgroundColor: '#E8D5B7' }

  const style: Record<string, string> = {}
  if (fl.style.backgroundColor) {
    style.backgroundColor = fl.style.backgroundColor
  }
  if (fl.style.pattern) {
    style.backgroundImage = getPatternImage(fl.style.pattern)
    style.backgroundSize = getPatternSize(fl.style.pattern)
  }
  return style
})

function getPatternImage(pattern: string): string {
  const patterns: Record<string, string> = {
    'stripe-pink': 'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(255,155,123,0.15) 28px, rgba(255,155,123,0.15) 30px)',
    'dots-mint': 'radial-gradient(circle, rgba(124,196,154,0.3) 3px, transparent 3px)',
    'flower-soft': 'radial-gradient(circle at 20% 30%, rgba(255,182,193,0.4) 8px, transparent 8px), radial-gradient(circle at 70% 60%, rgba(255,218,185,0.4) 6px, transparent 6px), radial-gradient(circle at 40% 80%, rgba(221,208,239,0.4) 7px, transparent 7px)',
    'cloud-sky': 'radial-gradient(ellipse 40px 20px at 20% 25%, rgba(255,255,255,0.8) 0%, transparent 70%), radial-gradient(ellipse 50px 25px at 70% 45%, rgba(255,255,255,0.7) 0%, transparent 70%), radial-gradient(ellipse 35px 18px at 50% 70%, rgba(255,255,255,0.6) 0%, transparent 70%)',
    'wood-light': 'repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(139,119,101,0.15) 48px, rgba(139,119,101,0.15) 50px), linear-gradient(180deg, rgba(0,0,0,0.03) 0%, transparent 10%)',
    'wood-warm': 'repeating-linear-gradient(90deg, transparent, transparent 45px, rgba(100,70,40,0.2) 45px, rgba(100,70,40,0.2) 47px), linear-gradient(180deg, rgba(0,0,0,0.04) 0%, transparent 8%)',
    'tile-white': 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
    'rug-cozy': 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%), repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 16px)',
    'marble': 'linear-gradient(135deg, rgba(200,200,200,0.1) 25%, transparent 25%), linear-gradient(225deg, rgba(200,200,200,0.1) 25%, transparent 25%), linear-gradient(45deg, rgba(200,200,200,0.08) 25%, transparent 25%), linear-gradient(315deg, rgba(200,200,200,0.08) 25%, transparent 25%)',
  }
  return patterns[pattern] || ''
}

function getPatternSize(pattern: string): string {
  const sizes: Record<string, string> = {
    'stripe-pink': 'auto',
    'dots-mint': '20px 20px',
    'flower-soft': '120px 120px',
    'cloud-sky': '180px 180px',
    'wood-light': 'auto',
    'wood-warm': 'auto',
    'tile-white': '40px 40px',
    'rug-cozy': 'auto',
    'marble': '30px 30px',
  }
  return sizes[pattern] || 'auto'
}
</script>

<template>
  <div class="room-container">
    <div class="room">
      <div class="wall" :style="wallpaperStyle">
        <div class="wall-shadow"></div>
        <div
          v-for="item in activeItems.filter(i => (i?.position?.y ?? 100) < 55)"
          :key="item!.id"
          class="wall-item"
          :style="{
            left: `${item?.position?.x}%`,
            top: `${item?.position?.y}%`,
            width: `${item?.size?.width}px`,
            height: `${item?.size?.height}px`,
            fontSize: `${Math.min(item?.size?.width || 40, item?.size?.height || 40) * 0.85}px`,
          }"
        >
          {{ item?.emoji }}
        </div>
      </div>

      <div class="floor" :style="floorStyle">
        <div class="floor-shadow"></div>
        <div
          v-for="item in activeItems.filter(i => (i?.position?.y ?? 0) >= 55)"
          :key="item!.id"
          class="floor-item"
          :style="{
            left: `${item?.position?.x}%`,
            top: `${((item?.position?.y ?? 55) - 55) * 2.2}%`,
            width: `${item?.size?.width}px`,
            height: `${item?.size?.height}px`,
            fontSize: `${Math.min(item?.size?.width || 40, item?.size?.height || 40) * 0.85}px`,
          }"
        >
          {{ item?.emoji }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 16px;
}

.room {
  width: 100%;
  max-width: 380px;
  aspect-ratio: 4 / 3;
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  position: relative;
}

.wall {
  flex: 0 0 65%;
  position: relative;
  overflow: hidden;
}

.wall-shadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.06));
  pointer-events: none;
}

.wall-item {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.floor {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.floor-shadow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.08), transparent);
  pointer-events: none;
}

.floor-item {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.5);
  }
  60% {
    transform: translateX(-50%) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

.wall-item {
  animation-name: pop-in-wall;
}

@keyframes pop-in-wall {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  60% {
    transform: translate(-50%, -50%) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
