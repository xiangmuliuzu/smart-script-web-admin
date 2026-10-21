<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="80%"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="preview-container">
      <!-- 图片预览 -->
      <div v-if="isImage && !error" class="image-preview">
        <el-image
          :src="materialUrl"
          fit="contain"
          :preview-src-list="[materialUrl]"
          style="max-width: 100%; max-height: 70vh;"
        >
          <template #error>
            <div class="image-error">
              <el-icon><Picture /></el-icon>
              <p>图片加载失败</p>
            </div>
          </template>
        </el-image>
      </div>

      <!-- 文本预览 -->
      <div v-else-if="isText && !error" class="text-preview">
        <el-scrollbar height="70vh">
          <pre>{{ textContent }}</pre>
        </el-scrollbar>
      </div>

      <!-- PDF：同源直链 iframe（不依赖 Google Docs，服务器/国内网络可用） -->
      <div v-else-if="isPdf && !error" class="document-preview">
        <iframe
          :src="materialUrl"
          frameborder="0"
          style="width: 100%; height: 70vh;"
          @load="loading = false"
        />
      </div>

      <!-- Office 等：提示下载 -->
      <div v-else-if="isOffice && !error" class="unsupported-preview">
        <el-icon size="48"><Document /></el-icon>
        <p>该 Office 文档请下载后查看</p>
        <el-button type="primary" @click="downloadFile">下载文件</el-button>
      </div>

      <!-- 不支持的格式 -->
      <div v-else-if="!error" class="unsupported-preview">
        <el-icon size="48"><Document /></el-icon>
        <p>该文件格式不支持在线预览</p>
        <el-button type="primary" @click="downloadFile">下载文件</el-button>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-preview">
        <el-icon size="48" color="#F56C6C"><WarningFilled /></el-icon>
        <p>{{ error }}</p>
        <el-button @click="retryLoad">重试</el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="downloadFile">下载文件</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Document, WarningFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  materialUrl: {
    type: String,
    default: ''
  },
  materialName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const textContent = ref('')
const error = ref('')

const title = computed(() => props.materialName || '材料预览')

/** 从文件名或 URL 提取扩展名（去掉 query/hash） */
function extractExt(value) {
  if (!value) return ''
  const clean = String(value).split('?')[0].split('#')[0].toLowerCase()
  const match = clean.match(/\.([a-z0-9]+)$/)
  return match ? match[1] : ''
}

const fileExtension = computed(() => {
  return extractExt(props.materialName) || extractExt(props.materialUrl)
})

const isImage = computed(() =>
  ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension.value)
)

const isText = computed(() =>
  ['txt', 'log', 'md', 'json', 'xml', 'csv'].includes(fileExtension.value)
)

const isPdf = computed(() => fileExtension.value === 'pdf')

const isOffice = computed(() =>
  ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension.value)
)

const loadTextContent = async () => {
  if (!isText.value || !props.materialUrl) return

  loading.value = true
  error.value = ''

  try {
    const response = await axios.get(props.materialUrl, {
      responseType: 'text',
      timeout: 30000
    })
    textContent.value = response.data
  } catch (err) {
    error.value = '文本加载失败: ' + (err.message || '未知错误')
    console.error('加载文本失败:', err)
  } finally {
    loading.value = false
  }
}

const downloadFile = () => {
  if (!props.materialUrl) {
    ElMessage.warning('文件地址无效')
    return
  }

  const link = document.createElement('a')
  link.href = props.materialUrl
  link.download = props.materialName || 'material'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const retryLoad = () => {
  error.value = ''
  if (isText.value) {
    loadTextContent()
  } else if (isPdf.value) {
    loading.value = true
  }
}

const handleClose = () => {
  textContent.value = ''
  error.value = ''
  loading.value = false
}

watch(() => props.materialUrl, (newUrl) => {
  if (newUrl && visible.value) {
    if (isText.value) {
      loadTextContent()
    } else if (isPdf.value) {
      loading.value = true
    }
  }
}, { immediate: true })

watch(visible, (newVal) => {
  if (newVal && props.materialUrl) {
    if (isText.value) {
      loadTextContent()
    } else if (isPdf.value) {
      loading.value = true
    }
  }
})
</script>

<style scoped>
.preview-container {
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview {
  width: 100%;
  text-align: center;
}

.image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #909399;
}

.image-error .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.text-preview {
  width: 100%;
}

.text-preview pre {
  margin: 0;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.document-preview {
  width: 100%;
}

.unsupported-preview,
.error-preview {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #909399;
}

.unsupported-preview .el-icon,
.error-preview .el-icon {
  margin-bottom: 16px;
}

.unsupported-preview p,
.error-preview p {
  margin: 0 0 16px;
  font-size: 14px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>
