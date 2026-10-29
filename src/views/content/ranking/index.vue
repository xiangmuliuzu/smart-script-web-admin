<template>
  <PageContainer>
    <PageHeader title="排行榜管理" :description="`实时榜单；榜单更新时间：${updatedAt || '—'}`">
    </PageHeader>

    <el-tabs v-model="activeType" class="board-tabs" @tab-change="handleTabChange">
      <el-tab-pane v-for="board in RANKING_TYPE" :key="board.value" :label="board.label" :name="board.value" />
    </el-tabs>

    <TableCard
      :data="list"
      :loading="loading"
      :show-pagination="false"
      empty-text="暂无榜单数据"
    >
      <el-table-column label="排名" width="80">
        <template #default="{ $index }">
          <el-tag size="small" :type="$index < 3 ? 'danger' : 'info'" effect="plain">
            No.{{ $index + 1 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="作品标题" min-width="160" show-overflow-tooltip />
      <el-table-column prop="authorName" label="作者" width="120" show-overflow-tooltip />
      <el-table-column prop="genreName" label="分类" width="100" />
      <el-table-column :label="currentBoard.metricLabel" width="160">
        <template #default="{ row }">
          {{ activeType === 'new' ? (row.shelfTime || '—') : (row.score ?? '—') }}
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default>{{ updatedAt || '—' }}</template>
      </el-table-column>
    </TableCard>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import TableCard from '@/components/TableCard.vue'
import { RANKING_TYPE } from '@/constants/contentEnum'
import { rankingApi } from '@/api/content'

const activeType = ref(RANKING_TYPE[0].value)
const currentBoard = computed(() => RANKING_TYPE.find((b) => b.value === activeType.value) || RANKING_TYPE[0])

const list = ref([])
const updatedAt = ref('')
const loading = ref(false)

const loadList = async () => {
  console.log('loadList called, type:', activeType.value)
  loading.value = true
  try {
    console.log('calling rankingApi.list...')
    const res = await rankingApi.list({ type: activeType.value, limit: 20 })
    console.log('res:', res)
    // 后端返回体为 { list, updatedAt }（App 接口 2.7.7 的 data 结构），故取 res.list
    list.value = Array.isArray(res?.list) ? res.list : []
    updatedAt.value = res?.updatedAt || ''
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  loadList()
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.board-tabs {
  margin-bottom: 16px;
}
</style>