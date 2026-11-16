/** 仅把签名匹配的位图交给 img；HTML/SVG/PDF 等保持下载，避免执行上传内容。 */
export async function materialImageBlob(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  const matches = (signature, offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte)
  let type = ''
  if (matches([137, 80, 78, 71, 13, 10, 26, 10])) type = 'image/png'
  else if (matches([255, 216, 255])) type = 'image/jpeg'
  else if (matches([71, 73, 70, 56, 55, 97]) || matches([71, 73, 70, 56, 57, 97])) type = 'image/gif'
  else if (matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8)) type = 'image/webp'
  return type ? new Blob([blob], { type }) : null
}
