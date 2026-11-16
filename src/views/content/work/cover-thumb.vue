<template>
  <el-image
    v-if="url"
    :src="resolveMediaUrl(url)"
    fit="cover"
    style="width: 44px; height: 58px; border-radius: 4px; display: block"
    :preview-src-list="[resolveMediaUrl(url)]"
  >
    <template #error>
      <div class="cover-empty">无图</div>
    </template>
  </el-image>
  <div v-else class="cover-empty">无图</div>
</template>

<script setup>
import { resolveMediaUrl } from '@/utils/request'

defineProps({
  /** 作品封面（后端原始地址，展示前经 resolveMediaUrl 归一） */
  url: { type: String, default: '' }
})
</script>

<style scoped>
.cover-empty {
  width: 44px;
  height: 58px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #a8abb2;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
