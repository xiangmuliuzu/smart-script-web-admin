<template>
  <PageContainer>
    <PageHeader title="标签管理" description="维度（热门/主题/角色/情节）→ 分组 → 标签，作品归属与 App 标签墙按此展示">
      <template #actions>
        <BlackButton v-permission="['content:tag:add']" @click="openCreate()">新增标签</BlackButton>
      </template>
    </PageHeader>

    <div class="tag-toolbar">
      <div class="toolbar-left">
        <div class="channel-tabs">
          <button
            v-for="tab in CHANNEL_TABS"
            :key="tab.value"
            type="button"
            class="channel-tab"
            :class="{ active: channelTab === tab.value }"
            @click="channelTab = tab.value"
          >{{ tab.label }}</button>
        </div>
        <div class="dim-tabs">
          <button
            v-for="item in TAG_TYPE"
            :key="item.value"
            type="button"
            class="dim-tab"
            :class="{ active: activeDim === item.value }"
            @click="selectDim(item.value)"
          >{{ item.label }}</button>
        </div>
      </div>
      <div class="toolbar-right">
        <el-input v-model="keyword" placeholder="搜索标签名称" clearable style="width: 180px" />
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 120px">
          <el-option label="正常" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </div>
    </div>

    <div v-loading="loading" class="tag-board">
      <div v-for="card in groupCards" :key="card.key" class="tag-card">
        <div class="card-head">
          <div class="card-title">
            <span class="card-name">{{ card.name }}</span>
            <span class="card-count">{{ card.tags.length }}</span>
          </div>
          <button
            v-permission="['content:tag:add']"
            type="button"
            class="mini-btn"
            @click="openCreate({ tagType: activeDim, groupName: card.groupName })"
          >+ 新增</button>
        </div>
        <div class="chip-grid">
          <div
            v-for="tag in card.tags"
            :key="tag.tagId"
            class="chip"
            :class="{ off: tag.status === '1' }"
            @click="openEdit(tag)"
          >
            <span class="chip-name">{{ tag.tagName }}</span>
            <span v-if="tag.useCount > 0" class="chip-count">{{ tag.useCount }}</span>
            <span
              v-permission="['content:tag:remove']"
              class="chip-remove"
              title="删除"
              @click.stop="handleDelete(tag)"
            >×</span>
          </div>
        </div>
      </div>
      <div v-if="!groupCards.length" class="board-empty">{{ emptyText }}</div>
    </div>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="520px"
      @closed="handleClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标签名称" prop="tagName">
          <el-input v-model="form.tagName" placeholder="请输入标签名称，不可重复" />
        </el-form-item>
        <el-form-item label="维度" prop="tagType">
          <el-radio-group v-model="form.tagType">
            <el-radio v-for="item in TAG_TYPE" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分组" prop="groupName">
          <el-select
            v-model="form.groupName"
            placeholder="不选则归入「未分组」"
            style="width: 100%"
            filterable
            allow-create
            default-first-option
            clearable
          >
            <el-option v-for="name in formGroupOptions" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="频道" prop="channelId">
          <el-select v-model="form.channelId" style="width: 100%">
            <el-option label="男生" :value="146" />
            <el-option label="女生" :value="147" />
          </el-select>
        </el-form-item>
        <el-form-item label="位次" prop="sort">
          <el-input-number v-model="form.sort" :min="1" />
          <div class="form-tip">数字越小越靠前；留空则追加到末尾；改为已存在位次时其他标签自动顺延</div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="form.status"
            active-value="0"
            inactive-value="1"
            active-text="正常"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import BlackButton from '@/components/BlackButton.vue'
import { TAG_TYPE, TAG_GROUP_SUGGESTIONS } from '@/constants/contentEnum'
import { listTag, addTag, updateTag, delTag } from '@/api/content'

defineOptions({ name: 'ContentTag' })

const CHANNEL_TABS = [
  { label: '全部', value: '' },
  { label: '男生', value: 146 },
  { label: '女生', value: 147 }
]
const UNGROUPED = '未分组'

const loading = ref(false)
const rows = ref([])

const channelTab = ref('')
const activeDim = ref('hot')
const keyword = ref('')
const statusFilter = ref('')

/** 标签数量升序取位次，空位次排末尾 */
function sortOf(row) {
  return row.sort === null || row.sort === undefined || row.sort === '' ? Number.MAX_SAFE_INTEGER : Number(row.sort)
}

function normalize(row) {
  const cid = row.channelId
  return {
    ...row,
    tagId: Number(row.tagId),
    channelId: cid === null || cid === undefined || cid === '' ? null : Number(cid),
    tagType: row.tagType || 'hot',
    groupName: row.groupName || '',
    status: String(row.status ?? '0'),
    useCount: Number(row.useCount || 0)
  }
}

/** 当前维度的全部标签 */
const dimRows = computed(() => rows.value.filter((row) => row.tagType === activeDim.value))

const filteredRows = computed(() =>
  dimRows.value.filter((row) => {
    // 频道为前端过滤：只展示对应频道的标签，不允许通用标签
    if (channelTab.value && row.channelId !== Number(channelTab.value)) {
      return false
    }
    if (statusFilter.value && row.status !== statusFilter.value) return false
    const key = keyword.value.trim()
    if (key && !(row.tagName || '').includes(key)) return false
    return true
  })
)

/** 先按频道分组（男生/女生/通用），再按 group_name 分组 */
const groupCards = computed(() => {
  const map = new Map()
  filteredRows.value
    .slice()
    .sort((a, b) => sortOf(a) - sortOf(b) || a.tagId - b.tagId)
    .forEach((row) => {
      // 先确定频道分组
      let channelKey, channelName
      if (row.channelId === 146) {
        channelKey = 'channel_146'
        channelName = '男生频道'
      } else {
        channelKey = 'channel_147'
        channelName = '女生频道'
      }
      // 再确定分组名
      const groupName = row.groupName || ''
      const cardKey = `${channelKey}__${groupName || 'ungrouped'}`
      const cardName = groupName ? `${channelName} · ${groupName}` : channelName
      if (!map.has(cardKey)) {
        map.set(cardKey, { key: cardKey, groupName, name: cardName, tags: [] })
      }
      map.get(cardKey).tags.push(row)
    })
  return [...map.values()].sort((a, b) => {
    // 男生频道排最前，然后女生
    const channelOrder = (key) => {
      if (key.startsWith('channel_146')) return 0
      return 1
    }
    return channelOrder(a.key) - channelOrder(b.key) || a.name.localeCompare(b.name)
  })
})

const emptyText = computed(() => {
  if (!dimRows.value.length) return '暂无标签，点击新增标签创建'
  return '没有符合条件的标签，试试调整筛选条件'
})

function selectDim(value) {
  if (activeDim.value === value) return
  activeDim.value = value
}

async function loadList() {
  loading.value = true
  try {
    const res = await listTag({ pageNum: 1, pageSize: 1000 })
    rows.value = (res?.rows || []).map(normalize)
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

const dialog = reactive({ visible: false, title: '新增标签', mode: 'create' })
const submitting = ref(false)
const formRef = ref()
const form = reactive({
  tagId: null,
  tagName: '',
  tagType: 'hot',
  groupName: '',
  channelId: '',
  sort: null,
  status: '0',
  remark: ''
})

const rules = {
  tagName: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { whitespace: true, message: '标签名称不能为空', trigger: 'blur' }
  ],
  tagType: [{ required: true, message: '请选择维度', trigger: 'change' }],
  channelId: [{ required: true, message: '请选择频道', trigger: 'change' }]
}

/** 分组选项：当前维度的建议分组 ∪ 已存在分组 */
const formGroupOptions = computed(() => {
  const names = new Set(TAG_GROUP_SUGGESTIONS[form.tagType] || [])
  rows.value.forEach((row) => {
    if (row.tagType === form.tagType && row.groupName) names.add(row.groupName)
  })
  return [...names]
})

function openCreate(options = {}) {
  Object.assign(form, {
    tagId: null,
    tagName: '',
    tagType: options.tagType || activeDim.value,
    groupName: options.groupName || '',
    channelId: channelTab.value === '' ? 146 : Number(channelTab.value),
    sort: null,
    status: '0',
    remark: ''
  })
  dialog.mode = 'create'
  dialog.title = '新增标签'
  dialog.visible = true
}

function openEdit(row) {
  Object.assign(form, {
    tagId: row.tagId,
    tagName: row.tagName || '',
    tagType: row.tagType || 'hot',
    groupName: row.groupName || '',
    channelId: row.channelId === null || row.channelId === undefined ? '' : Number(row.channelId),
    sort: row.sort ?? null,
    status: row.status || '0',
    remark: row.remark || ''
  })
  dialog.mode = 'edit'
  dialog.title = '编辑标签'
  dialog.visible = true
}

function handleClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    const payload = {
      tagName: form.tagName.trim(),
      tagType: form.tagType,
      groupName: form.groupName ? form.groupName.trim() : null,
      channelId: form.channelId === '' || form.channelId === null ? null : Number(form.channelId),
      sort: form.sort ?? null,
      status: form.status,
      remark: form.remark || ''
    }
    try {
      if (dialog.mode === 'create') {
        await addTag(payload)
        ElMessage.success('新增成功')
      } else {
        await updateTag({ ...payload, tagId: form.tagId })
        ElMessage.success('编辑成功')
      }
      dialog.visible = false
      await loadList()
    } catch {
      // 名称重复等错误信息已由 request 拦截器统一提示
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除标签「${row.tagName}」吗？删除后不可恢复。`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await delTag(row.tagId)
    ElMessage.success('删除成功')
    await loadList()
  } catch {
    // 被作品引用等错误信息已由 request 拦截器统一提示
  }
}

onMounted(loadList)
</script>

<style scoped>
.tag-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.channel-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #f2f3f5;
  border-radius: 8px;
}

.channel-tab {
  padding: 6px 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #4e5969;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-tab.active {
  background: #fff;
  color: #1f2329;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.dim-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: #f2f3f5;
  border-radius: 8px;
}

.dim-tab {
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #4e5969;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dim-tab.active {
  background: #fff;
  color: #254e90;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
  min-height: 320px;
}

.tag-card {
  background: #fff;
  border: 1px solid #f0f1f3;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f6f8;
}

.card-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.card-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #86909c;
  background: #f2f3f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.mini-btn {
  border: none;
  background: #f2f7ff;
  color: #254e90;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  background: #e0eaff;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.chip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid #f0f1f3;
  color: #4e5969;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  background: #f0f5ff;
  border-color: #c6d8ff;
  color: #254e90;
}

.chip.off {
  background: #fafafa;
  border-color: #f0f1f3;
  color: #c9cdd4;
}

.chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-count {
  position: absolute;
  top: 1px;
  right: 4px;
  font-size: 10px;
  line-height: 1.4;
  color: #c98a2d;
}

.chip-remove {
  display: none;
  position: absolute;
  top: 0;
  right: 5px;
  font-size: 14px;
  line-height: 1.4;
  color: #a9aeb8;
}

.chip:hover .chip-remove {
  display: block;
}

.chip:hover .chip-count {
  display: none;
}

.chip-remove:hover {
  color: #d54941;
}

.board-empty {
  grid-column: 1 / -1;
  padding: 80px 0;
  text-align: center;
  font-size: 13px;
  color: #a9aeb8;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}
</style>
