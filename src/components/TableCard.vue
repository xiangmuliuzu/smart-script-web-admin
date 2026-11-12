<template>
  <el-card class="table-card" shadow="never">
    <template v-if="title || $slots.actions" #header>
      <div class="card-header">
        <span class="card-title">{{ title }}</span>
        <div class="card-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <div v-if="$slots.toolbar" class="card-toolbar">
      <slot name="toolbar" />
    </div>

    <el-table
      v-loading="loading"
      :data="data"
      :row-key="rowKey"
      :tree-props="treeProps"
      :expand-row-keys="expandRowKeys"
      style="width: 100%"
      @selection-change="onSelectionChange"
    >
      <slot />
      <template #empty>
        <el-empty :description="emptyText" :image-size="emptyImage ? 120 : 72" :image="emptyImage || undefined" />
      </template>
    </el-table>

    <div v-if="showPagination" class="table-footer">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </el-card>
</template>

<script setup>
/**
 * 表格卡片：统一表头/表格皮肤 + 加载态 + 空态 + 分页。
 * - #default 放 el-table-column 定义（支持自定义单元格模板）
 * - #actions 放卡片头右侧按钮；#toolbar 放表格上方工具条
 * - 表格/分页视觉沿用 global.css，本组件只负责结构与五态中的「加载/空」。
 * 分页：page / pageSize 支持 v-model:page、v-model:pageSize；并 emit page-change / size-change。
 */
defineOptions({ name: 'TableCard' })
defineProps({
  title: { type: String, default: '' },
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  pageSizes: { type: Array, default: () => [10, 20, 50] },
  showPagination: { type: Boolean, default: true },
  emptyText: { type: String, default: '暂无数据' },
  emptyImage: { type: String, default: '' },
  rowKey: { type: [String, Function], default: undefined },
  treeProps: { type: Object, default: undefined },
  // element-plus 2.14 起：expand-row-keys 只要不是 undefined 就强制要求 row-key，
  // 默认给 [] 会让所有不展开行的列表页在 ElTable setup 里直接抛错整页白屏。
  expandRowKeys: { type: Array, default: undefined }
})
const emit = defineEmits(['update:page', 'update:pageSize', 'page-change', 'size-change', 'selection-change'])

function onSelectionChange(rows) {
  emit('selection-change', rows)
}
function onPageChange(val) {
  emit('update:page', val)
  emit('page-change', val)
}
function onSizeChange(val) {
  emit('update:pageSize', val)
  emit('update:page', 1)
  emit('size-change', val)
}
</script>

<style scoped>
.table-card {
  margin-bottom: 20px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.card-toolbar {
  padding: 14px 18px;
  border-bottom: 1px solid #f0f0f0;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px;
}
</style>
