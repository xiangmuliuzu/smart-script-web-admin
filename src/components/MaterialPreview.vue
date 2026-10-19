<template>
  <el-dialog v-model="visible" title="材料预览" width="min(800px, 90vw)" append-to-body @closed="!visible && clear()">
    <el-image v-if="imageUrl" :src="imageUrl" fit="contain" style="width: 100%; max-height: 70vh">
      <template #error>材料图片无法展示，请重新查看或联系申请人重新上传。</template>
    </el-image>
  </el-dialog>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { adminV1Request as request } from '@/utils/request'
import { redeemMaterialToken } from '@/api/user/feedback'
import { materialImageBlob } from '@/utils/material-preview'

const visible = ref(false)
const imageUrl = ref('')
let generation = 0

function clear() {
  generation++
  visible.value = false
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
}

async function open(token) {
  const current = ++generation
  const result = await redeemMaterialToken(token)
  const accessUrl = result?.accessUrl || result?.data?.accessUrl
  if (!accessUrl) throw new Error('材料访问链接获取失败')
  const blob = await request({ url: accessUrl, method: 'get', responseType: 'blob' })
  const image = await materialImageBlob(blob)
  if (current !== generation) return
  if (image) {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = URL.createObjectURL(image)
    visible.value = true
    return
  }
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'material'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  ElMessage.info('该材料暂不支持图片预览，已下载文件')
}

onBeforeUnmount(clear)
defineExpose({ open, clear })
</script>
