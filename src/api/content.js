import request, { adminV1Request } from '@/utils/request'

/**
 * B 模块（内容与作品）PC 后台 API
 * 依据：smartscript-content 模块 SysCategoryController / SysTagController
 * 统一前缀 /api/v1/admin/content，鉴权走若依 RBAC（Bearer Token）
 */

const ADMIN_PREFIX = '/api/v1/admin/content'

// ---------------- 剧本分类 ----------------

/** 分类分页列表（categoryName 模糊、categoryType/status 精确） */
export function listCategory(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category/list`,
    method: 'get',
    params: query
  })
}

/** 分类详情 */
export function getCategory(categoryId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category/${categoryId}`,
    method: 'get'
  })
}

/** 新增分类 */
export function addCategory(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category`,
    method: 'post',
    data
  })
}

/** 编辑分类 */
export function updateCategory(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category`,
    method: 'put',
    data
  })
}

/** 启用/停用分类（单一职责：仅改 status） */
export function changeCategoryStatus(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category/changeStatus`,
    method: 'put',
    data
  })
}

/** 调整分类排序（单一职责：仅改 sort） */
export function changeCategorySort(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category/changeSort`,
    method: 'put',
    data
  })
}

/** 删除分类（单个；被作品引用时后端拒绝） */
export function delCategory(categoryId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/category/${categoryId}`,
    method: 'delete'
  })
}

// ---------------- 标签 ----------------

/** 标签分页列表（tagName 模糊、tagType/status 精确） */
export function listTag(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/tag/list`,
    method: 'get',
    params: query
  })
}

/** 标签详情 */
export function getTag(tagId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/tag/${tagId}`,
    method: 'get'
  })
}

/** 新增标签 */
export function addTag(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/tag`,
    method: 'post',
    data
  })
}

/** 编辑标签 */
export function updateTag(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/tag`,
    method: 'put',
    data
  })
}

/** 删除标签（支持批量，tagIds 传逗号拼接字符串或单个 id，物理删除） */
export function delTag(tagIds) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/tag/${tagIds}`,
    method: 'delete'
  })
}

// ---------------- 作品管理 ----------------

/** 作品分页列表（title 模糊，authorId/genreId/status/workType/tradeType 精确） */
export function listWork(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/work/list`,
    method: 'get',
    params: query
  })
}

/** 作品详情 */
export function getWork(workId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/work/${workId}`,
    method: 'get'
  })
}

/** 作品章节分页列表 */
export function listWorkChapters(workId, query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/work/${workId}/chapters`,
    method: 'get',
    params: query
  })
}

// ---------------- 书城作品管理 ----------------

/** 书城作品分页列表（title 模糊，recommendStatus/status/tradeEnabled 精确） */
export function listBookstore(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/bookstore/list`,
    method: 'get',
    params: query
  })
}

/** 书城作品详情 */
export function getBookstore(workId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/bookstore/${workId}`,
    method: 'get'
  })
}

/** 上架/下架书城作品（单一职责：仅改 status） */
export function changeBookstoreStatus(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/bookstore/changeStatus`,
    method: 'put',
    data
  })
}

/** 开启/关闭交易（单一职责：仅改 tradeEnabled） */
export function changeBookstoreTrade(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/bookstore/changeTrade`,
    method: 'put',
    data
  })
}

/** 更新书城扩展信息（extJson 由前端构建为 JSON 字符串） */
export function updateBookstoreExt(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/bookstore/updateExt`,
    method: 'put',
    data
  })
}

// ---------------- 排行榜管理 ----------------

/** 排行榜分页列表（rankingType/periodStart/periodEnd/status 过滤） */
export function listRanking(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/ranking/list`,
    method: 'get',
    params: query
  })
}

/** 排行榜条目详情 */
export function getRanking(rankingId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/ranking/${rankingId}`,
    method: 'get'
  })
}

/** 调整榜单排名（单一职责：仅改 rankNo） */
export function changeRankNo(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/ranking/changeRankNo`,
    method: 'put',
    data
  })
}

/** 重算榜单（指标由榜单类型唯一确定：view/favorite/sale/rating；返回 newSnapshotCount/oldRemovedCount） */
export function recomputeRanking(params) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/ranking/recompute`,
    method: 'post',
    params
  })
}

// ---------------- Banner管理 ----------------

/** Banner 分页列表（title 模糊，position/status 精确） */
export function listBanner(query) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner/list`,
    method: 'get',
    params: query
  })
}

/** Banner 详情 */
export function getBanner(bannerId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner/${bannerId}`,
    method: 'get'
  })
}

/** 新增 Banner */
export function addBanner(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner`,
    method: 'post',
    data
  })
}

/** 编辑 Banner */
export function updateBanner(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner`,
    method: 'put',
    data
  })
}

/** 上架/下架 Banner（单一职责：仅改 status） */
export function changeBannerStatus(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner/changeStatus`,
    method: 'put',
    data
  })
}

/** 调整 Banner 排序（单一职责：仅改 sortOrder） */
export function changeBannerSort(data) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner/changeSort`,
    method: 'put',
    data
  })
}

/** 删除 Banner（物理删除） */
export function deleteBanner(bannerId) {
  return adminV1Request({ url: `${ADMIN_PREFIX}/banner/${bannerId}`,
    method: 'delete'
  })
}

// ---------------- 通用文件上传 ----------------

/**
 * 通用图片上传（若依通用上传 POST /common/upload，multipart/form-data）
 * 依据：ruoyi-admin CommonController#uploadFile，返回 { url, fileName, newFileName, originalFilename }
 * url 为相对路径（/profile/upload/...），展示前需经 utils/request 的 resolveMediaUrl 按当前环境拼接。
 * 文件落盘至 ruoyi.profile（仓库内 uploadPath/，服务器可用 RUOYI_PROFILE 指向绝对路径）。
 */
export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/common/upload',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData
  })
}

// ---------------- 作品上传资料 ----------------

// ---------------- 外部视频-渠道管理 ----------------
export function listDramaChannel(query) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaChannel/list`, method: 'get', params: query }) }
export function getDramaChannel(channelId) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaChannel/${channelId}`, method: 'get' }) }
export function addDramaChannel(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaChannel`, method: 'post', data }) }
export function updateDramaChannel(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaChannel`, method: 'put', data }) }
export function changeDramaChannelStatus(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaChannel/changeStatus`, method: 'put', data }) }

// ---------------- 外部视频-内容管理 ----------------
export function listDrama(query) { return adminV1Request({ url: `${ADMIN_PREFIX}/drama/list`, method: 'get', params: query }) }
export function getDrama(dramaId) { return adminV1Request({ url: `${ADMIN_PREFIX}/drama/${dramaId}`, method: 'get' }) }
export function addDrama(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/drama`, method: 'post', data }) }
export function updateDrama(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/drama`, method: 'put', data }) }

// ---------------- 外部视频-关联剧本（并入视频内容管理详情） ----------------
export function bindDrama(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaBind/bind`, method: 'put', data }) }
export function unbindDrama(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaBind/unbind`, method: 'put', data }) }

// ---------------- 外部视频-上下架/同步（并入视频内容管理列表） ----------------
export function changeDramaStatus(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaStatus/changeStatus`, method: 'put', data }) }
export function syncDrama(data) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaStatus/sync`, method: 'put', data }) }

// ---------------- 外部视频-播放数据（并入视频内容管理详情） ----------------
export function getDramaStats(workId) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaStats/${workId}`, method: 'get' }) }
export function listDramaHistory(query) { return adminV1Request({ url: `${ADMIN_PREFIX}/dramaStats/history`, method: 'get', params: query }) }