<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Sparkles, Check, Download, Upload, Settings } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useDecorations } from '@/composables/useDecorations'
import { exportToJson, importFromJson } from '@/utils/export'
import type { DecorationType, Decoration } from '@/types'

const store = useSavingStore()
const { allDecorations, loadDecorations, getDecorationById } = useDecorations()

const activeCategory = ref<DecorationType>('wallpaper')
const showSettings = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const categories = [
  { key: 'wallpaper' as DecorationType, label: '墙纸', emoji: '🎨' },
  { key: 'floor' as DecorationType, label: '地板', emoji: '🪵' },
  { key: 'item' as DecorationType, label: '摆件', emoji: '🪴' },
]

const filteredDecorations = computed(() => {
  return allDecorations.value.filter(d => d.type === activeCategory.value)
})

const isOwned = (id: string) => store.ownedDecorations.includes(id)

const isActiveItem = (id: string) => {
  const active = store.activeDecorations
  if (active.wallpaper === id) return true
  if (active.floor === id) return true
  if (active.items.includes(id)) return true
  return false
}

function handleBuy(decoration: Decoration) {
  if (isOwned(decoration.id)) {
    applyDecoration(decoration)
    return
  }
  if (store.points < decoration.price) {
    alert('积分不足，再多存一点吧～')
    return
  }
  if (confirm(`确定花费 ${decoration.price} 积分购买「${decoration.name}」吗？`)) {
    const success = store.buyDecoration(decoration)
    if (success) {
      // 可以加个动画效果
    }
  }
}

function applyDecoration(decoration: Decoration) {
  if (decoration.type === 'wallpaper') {
    store.setActiveWallpaper(decoration.id)
  } else if (decoration.type === 'floor') {
    store.setActiveFloor(decoration.id)
  } else if (decoration.type === 'item') {
    store.toggleDecorationItem(decoration.id)
  }
}

function handleExport() {
  exportToJson(store.getExportState())
}

function handleImportClick() {
  fileInputRef.value?.click()
}

async function handleImportFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const data = await importFromJson(file)
    const success = store.importData(data)
    if (success) {
      alert('数据导入成功！')
    } else {
      alert('数据格式不正确，请检查文件。')
    }
  } catch (err) {
    alert('导入失败：' + (err as Error).message)
  }

  target.value = ''
}

onMounted(() => {
  loadDecorations()
})
</script>

<template>
  <div class="workshop">
    <div class="workshop-header">
      <div class="points-card">
        <div class="points-label">我的积分</div>
        <div class="points-value">
          <Sparkles class="points-icon" :size="20" />
          {{ store.points.toFixed(0) }}
        </div>
        <div class="points-hint">储蓄积分 = 累计收入</div>
      </div>

      <button class="settings-btn" @click="showSettings = !showSettings">
        <Settings :size="20" />
      </button>
    </div>

    <div v-if="showSettings" class="settings-panel">
      <h4 class="settings-title">数据管理</h4>
      <div class="settings-actions">
        <button class="setting-btn export" @click="handleExport">
          <Download :size="18" />
          <span>导出备份</span>
        </button>
        <button class="setting-btn import" @click="handleImportClick">
          <Upload :size="18" />
          <span>导入备份</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportFile"
        />
      </div>
      <p class="settings-tip">
        导出 JSON 文件保存到本地，换设备也能继续使用～
      </p>
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="tab-btn"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <span class="tab-emoji">{{ cat.emoji }}</span>
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <div class="decoration-grid">
      <div
        v-for="item in filteredDecorations"
        :key="item.id"
        class="deco-card"
        :class="{
          owned: isOwned(item.id),
          active: isActiveItem(item.id),
        }"
        @click="handleBuy(item)"
      >
        <div class="deco-preview" :class="`type-${item.type}`">
          <template v-if="item.type === 'wallpaper'">
            <div class="preview-wallpaper" :style="{
              background: item.style.gradient || item.style.backgroundColor,
            }"></div>
          </template>
          <template v-else-if="item.type === 'floor'">
            <div class="preview-floor" :style="{
              backgroundColor: item.style.backgroundColor,
            }"></div>
          </template>
          <template v-else>
            <div class="preview-item">{{ item.emoji }}</div>
          </template>
        </div>

        <div class="deco-info">
          <div class="deco-name">{{ item.name }}</div>
          <div class="deco-price">
            <template v-if="isOwned(item.id)">
              <span v-if="isActiveItem(item.id)" class="owned-tag active-tag">
                <Check :size="12" />
                使用中
              </span>
              <span v-else class="owned-tag">已拥有</span>
            </template>
            <template v-else>
              <span class="price-value">
                <Sparkles :size="12" />
                {{ item.price }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="workshop-tip">
      💡 提示：记录收入可获得等额积分，用来装饰你的小屋哦～
    </div>
  </div>
</template>

<style scoped>
.workshop {
  padding: 0 16px 100px;
}

.workshop-header {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}

.points-card {
  flex: 1;
  background: linear-gradient(135deg, #ff9b7b 0%, #ff7e5f 100%);
  border-radius: 20px;
  padding: 18px 20px;
  color: white;
  position: relative;
  overflow: hidden;
}

.points-card::before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

.points-card::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: 30%;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.points-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 4px;
  font-weight: 500;
}

.points-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
}

.points-icon {
  opacity: 0.9;
}

.points-hint {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
}

.settings-btn {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 16px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.settings-btn:hover {
  color: #ff9b7b;
  transform: rotate(15deg);
}

.settings-panel {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.settings-title {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
}

.settings-actions {
  display: flex;
  gap: 10px;
}

.setting-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.setting-btn.export {
  background: rgba(90, 179, 126, 0.12);
  color: #5ab37e;
}

.setting-btn.export:hover {
  background: rgba(90, 179, 126, 0.2);
}

.setting-btn.import {
  background: rgba(156, 125, 212, 0.12);
  color: #9c7dd4;
}

.setting-btn.import:hover {
  background: rgba(156, 125, 212, 0.2);
}

.settings-tip {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 10px;
  text-align: center;
}

.hidden {
  display: none;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: white;
  padding: 4px;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #fff8f0;
  color: #ff9b7b;
  box-shadow: 0 2px 6px rgba(255, 155, 123, 0.15);
}

.tab-emoji {
  font-size: 16px;
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.deco-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
}

.deco-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.deco-card.owned {
  border-color: rgba(90, 179, 126, 0.3);
}

.deco-card.active {
  border-color: #ff9b7b;
  box-shadow: 0 4px 16px rgba(255, 155, 123, 0.2);
}

.deco-preview {
  aspect-ratio: 1;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.preview-wallpaper {
  width: 100%;
  height: 100%;
}

.preview-floor {
  width: 100%;
  height: 100%;
}

.preview-item {
  font-size: 36px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.deco-info {
  padding: 10px 8px;
  text-align: center;
}

.deco-name {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deco-price {
  font-size: 11px;
}

.price-value {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #ff9b7b;
  font-weight: 700;
}

.owned-tag {
  color: #5ab37e;
  font-weight: 600;
  font-size: 11px;
}

.active-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #ff9b7b;
}

.workshop-tip {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  padding: 8px 16px;
  background: rgba(255, 155, 123, 0.08);
  border-radius: 12px;
}
</style>
