/**
 * 交易模块（C）枚举常量集中管理。
 * 供 StatusTag、筛选下拉、表单选项统一取用，杜绝各页各写状态映射。
 *
 * 依据：
 * - 订单状态：PRD 9.3（本次采用）
 * - 合作方类型 / 授权类型 / 跟进状态：附件6.1 接口 2.35 / 2.25 / 2.38
 * - 询盘状态 / 报价状态：已定稿（2026-09-28 决策），后端 Service 状态机与本表一致，
 *   并已同步落若依数据字典（sys_dict_data，见迁移 C_20260928_002__c_trade_dict.sql）。
 * - 征集项目 / 投稿状态：接口文档缺口，取《C模块开发清单》建议值，同步落字典供后台维护。
 *
 * tagType 取值须为 Element Plus el-tag 合法类型：success/info/warning/danger/primary。
 */

/** 订单状态（PRD 9.3）。contract_pending 及之后由 D 接手流转，C 只展示与前置流转 */
export const ORDER_STATUS = [
  { value: 'inquiry', label: '询盘中', tagType: 'info' },
  { value: 'quoted', label: '已报价', tagType: 'warning' },
  { value: 'confirmed', label: '已确认', tagType: 'primary' },
  { value: 'contract_pending', label: '待签约', tagType: 'warning' },
  { value: 'escrow_pending', label: '待托管', tagType: 'warning' },
  { value: 'delivering', label: '交割中', tagType: 'primary' },
  { value: 'completed', label: '已完成', tagType: 'success' },
  { value: 'cancelled', label: '已取消', tagType: 'info' },
  { value: 'refunded', label: '已退款', tagType: 'danger' }
]

/** 合作方类型（接口 2.35） */
export const PARTNER_TYPE = [
  { value: 'investor', label: '投资方' },
  { value: 'studio', label: '制作机构' },
  { value: 'platform', label: '发行平台' }
]

/** 合作方状态 */
export const PARTNER_STATUS = [
  { value: 'active', label: '正常', tagType: 'success' },
  { value: 'inactive', label: '停用', tagType: 'info' },
  { value: 'pending', label: '待审核', tagType: 'warning' }
]

/**
 * 授权类型（接口 2.25 仅给出示例值 exclusive，未列举全集）。
 * 注意文档为下划线 non_exclusive，非连字符。
 *
 * 2026-09-30 决策：移除原第 4 项 negotiable「可议价」。
 * 依据分工第 4 条「完成授权类型、授权价格和**可议价范围**展示」——议价是范围而非授权类型，
 * 且附件6.1 从未把 negotiable 列为授权类型取值。现所有作品一律可议价，
 * 区间由 sys_work.negotiable_min / negotiable_max 表达：填了则出价须落在区间内，留空为不限。
 * 存量 negotiable 数据由 sql/smartscript_full_init.sql 第 7 部分归一为 non_exclusive。
 */
export const LICENSE_TYPE = [
  { value: 'exclusive', label: '独家' },
  { value: 'non_exclusive', label: '非独家' },
  { value: 'adaptation', label: '改编' }
]

/** 商务跟进状态（接口 2.38） */
export const FOLLOW_STATUS = [
  { value: 'ongoing', label: '进行中', tagType: 'success' },
  { value: 'pending', label: '待跟进', tagType: 'warning' },
  { value: 'completed', label: '已完成', tagType: 'info' }
]

/** 询盘状态（2026-09-29 收敛）：任意一方接受报价即生成订单并置 deal；与后端 TradeInquiryService 一致 */
export const INQUIRY_STATUS = [
  { value: 'pending', label: '待回复', tagType: 'warning' },
  // 2026-09-29 用户决策：原 accepted（已接受）与 quoted（已报价）统一为 quoted「议价中」
  { value: 'quoted', label: '议价中', tagType: 'primary' },
  { value: 'rejected', label: '已拒绝', tagType: 'danger' },
  { value: 'closed', label: '已关闭', tagType: 'info' },
  { value: 'deal', label: '已达成', tagType: 'success' }
]

/**
 * 报价状态（2026-09-29 甲方双端拆分后定稿）：
 * pending（待买方确认）由卖方报价产生，甲方 PC 端可接受/拒绝；
 * pending_seller（待卖方确认）由买方议价产生，需卖方在客户端确认，本端不可接受/拒绝；
 * 接受即生成订单并置 accepted；过期由后端校验置 expired。
 */
export const QUOTE_STATUS = [
  { value: 'pending', label: '待买方确认', tagType: 'warning' },
  { value: 'pending_seller', label: '待卖方确认', tagType: 'primary' },
  { value: 'accepted', label: '已接受', tagType: 'success' },
  { value: 'rejected', label: '已拒绝', tagType: 'danger' },
  { value: 'expired', label: '已过期', tagType: 'info' }
]

/** 报价方角色（sys_quote.quoter_role）：卖方报价 / 买方议价 */
export const QUOTER_ROLE = [
  { value: 'seller', label: '卖方报价', tagType: 'primary' },
  { value: 'buyer', label: '买方议价', tagType: 'warning' }
]

/** 交易作品上架状态（接口 2.25：listingStatus） */
export const TRADE_WORK_STATUS = [
  { value: 'listed', label: '已上架', tagType: 'success' },
  { value: 'offline', label: '已下架', tagType: 'info' }
]

/** 商务跟进方式（接口 2.38：method） */
export const FOLLOW_METHOD = [
  { value: 'phone', label: '电话' },
  { value: 'email', label: '邮件' },
  { value: 'meeting', label: '面谈' }
]

/** 任务状态（sys_demand，接单制） */
export const DEMAND_STATUS = [
  { value: 'open', label: '待接单', tagType: 'success' },
  { value: 'in_progress', label: '进行中', tagType: 'primary' },
  { value: 'completed', label: '已完成', tagType: 'primary' },
  { value: 'closed', label: '已关闭', tagType: 'info' },
  { value: 'selected', label: '已选定', tagType: 'primary' },
  { value: 'failed', label: '已失败', tagType: 'danger' }
]

/** 任务类型（sys_demand.task_type，与 APP/企业/创作者端同口径） */
export const DEMAND_TASK_TYPE = [
  { value: 'script', label: '只征集剧本', tagType: 'primary' },
  { value: 'script_storyboard', label: '剧本+分镜', tagType: 'warning' },
  { value: 'storyboard', label: '提供剧本做分镜', tagType: 'success' }
]

/** 任务题材（sys_demand.genre_id，沿用 APP 发布页历史口径；tags 为自由文本另填） */
export const DEMAND_GENRE_OPTIONS = [
  { value: 1, label: '都市情感' },
  { value: 2, label: '古装武侠' },
  { value: 3, label: '悬疑推理' },
  { value: 4, label: '科幻奇幻' },
  { value: 5, label: '家庭伦理' },
  { value: 99, label: '其他' }
]

/** 任务类型交付口径说明（发布/接单/详情三处共用，与 APP/创作者端逐字同口径）
    发布权已收归平台：逐轮验收由运营在管理端处理，不再出现「发布者验收」口径 */
export const DEMAND_TASK_TYPE_HINT = {
  script: '逐轮交付本人未上架的剧本作品，AI 剧本审核通过后进入平台人工验收',
  script_storyboard: '逐轮交付剧本作品，分镜以文件链接或交付说明随本轮一并提交，AI 剧本审核通过后进入人工验收',
  storyboard: '按平台提供的源剧本产出分镜：交付分镜文件或填写交付说明即可（作品可选），提交后直接进入人工验收'
}

/** 脏值/缺值统一回落 script，与后端 normalizeAndValidateTaskType 及 APP DemandTaskType.normalize 同规则，
    否则历史脏数据会把英文原值直接渲染到管理端列表 */
export function normalizeDemandTaskType(value) {
  return DEMAND_TASK_TYPE.some(item => item.value === value) ? value : 'script'
}

/**
 * 验收轮次状态（sys_demand_stage.status），值取自后端 SysDemandStage.STAGE_STATUS_*。
 * 逾期不是状态而是 is_overdue 标记，由页面单独渲染成红色标签。
 */
export const DEMAND_STAGE_STATUS = [
  { value: 'pending', label: '未开始', tagType: 'info' },
  { value: 'ai_reviewing', label: 'AI审核中', tagType: 'warning' },
  { value: 'submitted', label: '待人工验收', tagType: 'warning' },
  { value: 'approved', label: '已通过', tagType: 'success' },
  { value: 'rejected', label: '已驳回', tagType: 'danger' }
]

/** 延时记录来源（sys_demand_extend_apply.apply_type）：创作者申请需发布者裁决，发布者自主延时写入即生效。 */
export const DEMAND_EXTEND_APPLY_TYPE = [
  { value: 'request', label: '申请延时', tagType: 'warning' },
  { value: 'self', label: '自主延时', tagType: 'primary' }
]

/** 延时记录处理态（sys_demand_extend_apply.status 与 sys_demand_stage.extend_status 同源）。 */
export const DEMAND_EXTEND_STATUS = [
  { value: 'pending', label: '待处理', tagType: 'warning' },
  { value: 'approved', label: '已同意', tagType: 'success' },
  { value: 'rejected', label: '已驳回', tagType: 'info' }
]

/** 沙箱收款用途（demand_sandbox_payment.purpose）。 */
export const DEMAND_SANDBOX_PURPOSE = [
  { value: 'escrow', label: '任务托管款', tagType: 'primary' },
  { value: 'deposit', label: '接单押金', tagType: 'warning' }
]

/** 沙箱收款状态（demand_sandbox_payment.status），PENDING 含「已换号失效的旧码当前态」。 */
export const DEMAND_SANDBOX_STATUS = [
  { value: 'PENDING', label: '待支付', tagType: 'warning' },
  { value: 'PAID', label: '已入账', tagType: 'success' },
  { value: 'CLOSED', label: '已关闭', tagType: 'info' }
]

/** 逐轮放款结算状态（sys_income_settle.status）：出账目前仅记账，确认动作由收款创作者完成。 */
export const SETTLE_STATUS = [
  { value: 'pending', label: '待确认', tagType: 'warning' },
  { value: 'confirmed', label: '已确认入账', tagType: 'success' },
  { value: 'disputed', label: '争议中', tagType: 'danger' }
]

/** 投稿状态（sys_demand_submission）⚠️ 临时，待后端确认 */
export const SUBMISSION_STATUS = [
  { value: 'submitted', label: '已投稿', tagType: 'warning' },
  { value: 'shortlisted', label: '入围', tagType: 'primary' },
  { value: 'accepted', label: '已选用', tagType: 'success' },
  { value: 'rejected', label: '未选用', tagType: 'info' }
]

/** 合作记录来源（sys_offline_cooperation.source；分工 15 线上合作意向 / 16 线下谈判） */
export const COOPERATION_SOURCE = [
  { value: 'online', label: '线上合作意向', tagType: 'primary' },
  { value: 'offline', label: '线下谈判', tagType: 'warning' }
]

/** 合作记录状态（sys_offline_cooperation.status）⚠️ C 定义，已落字典 C_20260928_007，待产品确认 */
export const COOPERATION_STATUS = [
  { value: 'pending', label: '待跟进', tagType: 'warning' },
  { value: 'ongoing', label: '洽谈中', tagType: 'primary' },
  { value: 'completed', label: '已达成', tagType: 'success' },
  { value: 'cancelled', label: '已终止', tagType: 'info' }
]

/**
 * 作品状态（sys_work.status）——展示用，区别于交易上架状态 TRADE_WORK_STATUS（trade_enabled）。
 * 值来源（禁止编造，逐项标注出处）：
 * - on_shelf / off_shelf：云端库 sys_work 实测存在的两种值（内容侧上/下架）。
 * - approved / rejected / returned：附件5.1 触发器 T01（trg_sys_review_record_au_sync_work）按 review_result
 *   同步 sys_work.status 的设计值；因该触发器/审核回写链路未落地，实际库中暂无这三种值。
 * - draft / pending：队友 SysWork domain 注释提及的创作/待审核态。
 */
export const WORK_STATUS = [
  { value: 'draft', label: '草稿', tagType: 'info' },
  { value: 'pending', label: '待审核', tagType: 'warning' },
  { value: 'approved', label: '审核通过', tagType: 'success' },
  { value: 'rejected', label: '审核未通过', tagType: 'danger' },
  { value: 'returned', label: '退回修改', tagType: 'warning' },
  { value: 'on_shelf', label: '已上架', tagType: 'success' },
  { value: 'off_shelf', label: '已下架', tagType: 'info' }
]

/** 枚举注册表：StatusTag 按 type 名查表 */
export const ENUM_REGISTRY = {
  order: ORDER_STATUS,
  inquiry: INQUIRY_STATUS,
  quote: QUOTE_STATUS,
  quoterRole: QUOTER_ROLE,
  follow: FOLLOW_STATUS,
  partnerType: PARTNER_TYPE,
  partnerStatus: PARTNER_STATUS,
  license: LICENSE_TYPE,
  tradeWork: TRADE_WORK_STATUS,
  work: WORK_STATUS,
  followMethod: FOLLOW_METHOD,
  demand: DEMAND_STATUS,
  demandTaskType: DEMAND_TASK_TYPE,
  demandStage: DEMAND_STAGE_STATUS,
  demandExtendApplyType: DEMAND_EXTEND_APPLY_TYPE,
  demandExtendStatus: DEMAND_EXTEND_STATUS,
  demandSandboxPurpose: DEMAND_SANDBOX_PURPOSE,
  demandSandboxStatus: DEMAND_SANDBOX_STATUS,
  settleStatus: SETTLE_STATUS,
  submission: SUBMISSION_STATUS,
  cooperationSource: COOPERATION_SOURCE,
  cooperationStatus: COOPERATION_STATUS
}

/** 查枚举项 */
export function findEnum(type, value) {
  const list = ENUM_REGISTRY[type] || []
  return list.find((item) => item.value === value)
}

/** 取中文名，找不到回退原值 */
export function enumLabel(type, value) {
  const item = findEnum(type, value)
  return item ? item.label : (value ?? '-')
}

/** 取 el-tag 类型，找不到回退 info */
export function enumTagType(type, value) {
  const item = findEnum(type, value)
  return item?.tagType || 'info'
}

/** 取下拉选项 [{ value, label }] */
export function enumOptions(type) {
  return (ENUM_REGISTRY[type] || []).map(({ value, label }) => ({ value, label }))
}
