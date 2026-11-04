import { adminV1Request } from '@/utils/request'

/**
 * 作品推广（PC 后台）API
 * 后端：SysPromotionController，前缀 /api/v1/admin/content/promotion
 * Banner 增删改查沿用 api/content.js 的 banner 接口（后端权限已统一为 content:promotion:*）
 */

const PROMOTION_PREFIX = '/api/v1/admin/content/promotion'

/** 坑位总览：slotType = banner / search / hot */
export function getPromotionSlots(slotType) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/slots/${slotType}`,
    method: 'get'
  })
}

/** 申请列表（RuoYi TableDataInfo：rows/total） */
export function listPromotionApplications(query) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/list`,
    method: 'get',
    params: query
  })
}

/** 申请详情 */
export function getPromotionApplication(applyId) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/${applyId}`,
    method: 'get'
  })
}

/** 审核：approved=true 通过 / false 驳回 */
export function auditPromotionApplication(applyId, data) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/${applyId}/audit`,
    method: 'post',
    data
  })
}

/** 下架 / 取消投放 */
export function offlinePromotionApplication(applyId) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/${applyId}/offline`,
    method: 'post'
  })
}

/** 免费直上推荐 */
export function grantPromotion(data) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/grant`,
    method: 'post',
    data
  })
}

/** 位次单价与启停批量保存 */
export function updatePromotionPrices(data) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/slots/price`,
    method: 'put',
    data
  })
}

/** 轮播位绑定素材 */
export function bindPromotionBanner(applyId, bannerId) {
  return adminV1Request({
    url: `${PROMOTION_PREFIX}/applications/${applyId}/banner`,
    method: 'put',
    params: { bannerId }
  })
}
