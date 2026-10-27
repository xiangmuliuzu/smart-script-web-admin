/** 开屏上传先缩放、编码；不支持 WebP 或编码失败时保留原文件。 */
export async function optimizeSplashImage(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1080 / bitmap.width, 2400 / bitmap.height)
    if (scale === 1 && file.size <= 300 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.86))
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: blob.type })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
