/**
 * 交易模块（C）真实接口响应适配层。
 *
 * 目的：后端 domain 字段名（如 buyerName/sellerName/totalAmount/licenseType/followTime）
 * 与各交易页面沿用的展示字段名（buyer/creator/amountText/authorizationTypeLabel/followUpAt）
 * 存在差异。按《C模块开发清单》§9.4「数据层收敛到 api/trade.js，页面组件代码不改」的约定，
 * 差异在此层集中消化，避免逐个改页面。
 *
 * 约定：
 * - 列表接口经 request 拦截器解包后为若依 TableDataInfo 形状 { code, msg, rows, total }，
 *   适配器仅重写 rows；详情接口解包后为实体对象本身。
 * - mock 分支不走适配器（trade.mock.js 已直接产出页面字段），故此处只处理真实响应。
 * - 金额：后端为 BigDecimal（单位「元」），页面展示值统一格式化为 ¥ + 千分位两位小数。
 * - 幂等：所有映射使用 `页面字段 ?? 后端字段` 兜底，重复适配或字段已对齐时不会破坏数据。
 */
import { enumLabel } from '@/constants/tradeEnum'

/** 题材 ID → 名称（与 Demand.vue 发布表单内置题材选项保持一致；接口未返回题材名时兜底） */
const GENRE_MAP = {
  1: '都市情感',
  2: '古装武侠',
  3: '悬疑推理',
  4: '科幻奇幻',
  5: '家庭伦理',
  99: '其他'
}

/** 金额格式化：后端 BigDecimal（元）→「¥50,000.00」 */
function formatMoney(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return ''
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 统一处理列表响应：接受 TableDataInfo { rows, total } 或裸数组，返回同形状（rows 已映射）。
 * 非列表结构原样透传，保证幂等与健壮。
 */
function mapRows(res, fn) {
  if (!res) return res
  if (Array.isArray(res)) return res.map(fn)
  if (Array.isArray(res.rows)) return { ...res, rows: res.rows.map(fn) }
  return res
}

/* ==================== 授权订单（2.28 / 2.29）==================== */
/** SysOrder → AuthOrders.vue 列表：buyerName→buyer, sellerName→creator, totalAmount→amount/amountText, licenseType→authorizationTypeLabel */
export function adaptOrders(res) {
  return mapRows(res, (o) => ({
    ...o,
    buyer: o.buyer ?? o.buyerName,
    creator: o.creator ?? o.sellerName,
    authorizationType: o.authorizationType ?? o.licenseType,
    authorizationTypeLabel: o.authorizationTypeLabel || enumLabel('license', o.licenseType ?? o.authorizationType),
    amount: o.amount ?? o.totalAmount,
    amountText: o.amountText || formatMoney(o.totalAmount ?? o.amount)
  }))
}

/** 单条状态流转日志：operatorName/operatorRole → operator */
function adaptStatusItem(log) {
  return {
    ...log,
    operator: log.operator || log.operatorName || log.operatorRole || '',
    remark: log.remark || ''
  }
}

/**
 * 订单详情 → AuthOrders.vue 详情。
 * @param {object} detail 已解包订单实体
 * @param {Array|object} statusRows 状态流转日志（数组或 { rows }），详情端点不含此字段，由调用方并行拉取后传入
 */
export function adaptOrderDetail(detail, statusRows) {
  if (!detail) return detail
  const history = Array.isArray(statusRows)
    ? statusRows
    : (statusRows && Array.isArray(statusRows.rows) ? statusRows.rows : detail.statusHistory || [])
  return {
    ...detail,
    authorizationType: detail.authorizationType ?? detail.licenseType,
    authorizationTypeLabel: detail.authorizationTypeLabel || enumLabel('license', detail.licenseType ?? detail.authorizationType),
    amount: detail.amount ?? detail.totalAmount,
    amountText: detail.amountText || formatMoney(detail.totalAmount ?? detail.amount),
    buyer: detail.buyer && typeof detail.buyer === 'object'
      ? detail.buyer
      : { companyName: detail.buyerName ?? detail.buyer ?? '' },
    creator: detail.creator && typeof detail.creator === 'object'
      ? detail.creator
      : { nickname: detail.sellerName ?? detail.creator ?? '' },
    statusHistory: history.map(adaptStatusItem)
  }
}

/* ==================== 询盘（缺口接口）==================== */
/** SysInquiry → Inquiry.vue：buyerName→buyer, sellerName→seller, licenseType→licenseTypeLabel, budget→budgetText */
export function adaptInquiries(res) {
  return mapRows(res, (i) => ({
    ...i,
    buyer: i.buyer ?? i.buyerName,
    seller: i.seller ?? i.sellerName,
    licenseTypeLabel: i.licenseTypeLabel || enumLabel('license', i.licenseType),
    budgetText: i.budgetText || formatMoney(i.budget)
  }))
}

/** 询盘详情（实体对象）→ 复用列表映射 */
export function adaptInquiryDetail(detail) {
  return detail ? adaptInquiries([detail])[0] : detail
}

/* ==================== 报价/议价（缺口接口）==================== */
/** SysQuote → Quote.vue：price→priceText, licenseType→licenseTypeLabel, quoterRole→quoterRoleLabel */
export function adaptQuotes(res) {
  return mapRows(res, (q) => ({
    ...q,
    priceText: q.priceText || formatMoney(q.price),
    licenseTypeLabel: q.licenseTypeLabel || enumLabel('license', q.licenseType),
    quoterRoleLabel: q.quoterRoleLabel || enumLabel('quoterRole', q.quoterRole)
  }))
}

/* ==================== 征集项目（缺口接口）==================== */
/** SysDemand → Demand.vue：clientName→client, tags→tags, budget→budgetText */
export function adaptDemands(res) {
  return mapRows(res, (d) => ({
    ...d,
    client: d.client ?? d.clientName,
    tags: d.tags || '',
    budgetText: d.budgetText || formatMoney(d.budget)
  }))
}

/** SysDemandSubmission → Demand.vue 投稿明细：submitterName→submitter, createdAt→submittedAt */
export function adaptDemandSubmissions(res) {
  return mapRows(res, (s) => ({
    ...s,
    submitter: s.submitter ?? s.submitterName,
    submittedAt: s.submittedAt ?? s.createdAt
  }))
}
