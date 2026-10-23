/**
 * 【临时·仅本地开发】交易模块（C）Mock 数据层。
 *
 * 由 VITE_TRADE_MOCK 开关控制（见 api/trade.js 的 isTradeMock）。后端就绪后关闭开关即切真实接口，
 * 页面组件代码不改。开关名刻意区别于 lint-static.mjs 门禁禁用的历史 mock 登录开关写法。
 *
 * 字段严格对照《附件6.1 PC 端接口设计文档》：
 *   2.25-2.29 交易作品/订单，2.35-2.38 合作方/需求标签/商务跟进。
 * 金额单位为「分」，同时提供 *Text 展示值（与文档一致）。
 *
 * ⚠️ 标注「待后端确认」的数据集对应《C模块开发清单》3.2 的文档缺口接口
 *   （询盘/报价/订单状态日志/征集项目），路径与字段以后端最终设计为准，此处仅为 UI 联调占位。
 *
 * 列表统一返回若依 TableDataInfo 解包后的形状 { rows, total }；详情返回实体对象；
 * 写操作返回 { code: 200, data: {...} }。
 */

export function isTradeMock() {
  return import.meta.env.DEV === true && import.meta.env.VITE_TRADE_MOCK === 'true'
}

/** 简单分页 + 关键词/状态过滤，返回 { rows, total } */
function paginate(list, params = {}, filterFn) {
  const pageNo = Number(params.pageNo) || 1
  const pageSize = Number(params.pageSize) || 10
  const filtered = typeof filterFn === 'function' ? list.filter((row) => filterFn(row, params)) : list
  const start = (pageNo - 1) * pageSize
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length }
}

/* ==================== 2.28 / 2.29 授权订单 ==================== */
// 订单状态采用 PRD 9.3 枚举（见 constants/tradeEnum.js ORDER_STATUS）
const orders = [
  { orderId: 1, orderNo: '#ORD-001', workTitle: '《都市迷途》', buyer: '影视公司A', creator: '张编剧', authorizationType: 'exclusive', authorizationTypeLabel: '独家授权', amount: 5000000, amountText: '¥50,000', createdAt: '2026-09-07 10:00', status: 'confirmed', statusLabel: '已确认' },
  { orderId: 2, orderNo: '#ORD-002', workTitle: '《暗夜追踪》', buyer: '制作公司B', creator: '李作者', authorizationType: 'non_exclusive', authorizationTypeLabel: '非独家授权', amount: 2500000, amountText: '¥25,000', createdAt: '2026-09-06 15:30', status: 'quoted', statusLabel: '已报价' },
  { orderId: 3, orderNo: '#ORD-003', workTitle: '《长安旧事》', buyer: '平台C', creator: '王编剧', authorizationType: 'exclusive', authorizationTypeLabel: '独家授权', amount: 8000000, amountText: '¥80,000', createdAt: '2026-09-05 09:20', status: 'inquiry', statusLabel: '询盘中' },
  { orderId: 4, orderNo: '#ORD-004', workTitle: '《孤岛来信》', buyer: '影视公司A', creator: '赵作者', authorizationType: 'non_exclusive', authorizationTypeLabel: '非独家授权', amount: 1800000, amountText: '¥18,000', createdAt: '2026-09-04 14:10', status: 'cancelled', statusLabel: '已取消' }
]

// 订单详情：C 只负责订单主体 + 状态流转记录（statusHistory）。
// contract / escrow / delivery / settlement 属 D 模块，此处不构造，留待 D 接手。
const orderDetails = {
  1: {
    orderId: 1, orderNo: '#ORD-001', workId: 10001, workTitle: '《都市迷途》',
    creator: { creatorId: 2001, nickname: '张编剧', certStatus: 'approved' },
    buyer: { buyerId: 3001, companyName: '影视公司A', certStatus: 'approved' },
    authorizationType: 'exclusive', authorizationTypeLabel: '独家授权',
    amount: 5000000, amountText: '¥50,000',
    status: 'confirmed', statusLabel: '已确认',
    createdAt: '2026-09-07 10:00', updatedAt: '2026-09-07 10:30',
    statusHistory: [
      { fromStatus: 'inquiry', toStatus: 'quoted', operator: '张编剧', remark: '提交报价', createdAt: '2026-09-07 10:05' },
      { fromStatus: 'quoted', toStatus: 'confirmed', operator: '影视公司A', remark: '接受报价，生成订单', createdAt: '2026-09-07 10:30' }
    ]
  }
}

export function mockOrders(params = {}) {
  return paginate(orders, params, (row, p) => {
    if (p.status && row.status !== p.status) return false
    if (p.orderNo && row.orderNo !== p.orderNo) return false
    if (p.workTitle && !row.workTitle.includes(p.workTitle)) return false
    return true
  })
}

export function mockOrderDetail(orderId) {
  const id = Number(orderId)
  if (orderDetails[id]) return orderDetails[id]
  // 回退：由列表项构造详情，creator/buyer 统一为对象形状（与 orderDetails 一致），避免页面渲染歧义
  const o = orders.find((x) => x.orderId === id) || orders[0]
  return {
    ...o,
    creator: { creatorId: null, nickname: o.creator, certStatus: 'approved' },
    buyer: { buyerId: null, companyName: o.buyer, certStatus: 'approved' },
    statusHistory: []
  }
}

/* ==================== 2.37 需求标签 ==================== */

// ⚠️ 编辑/删除标签：文档 2.37 仅定义 GET/POST，PUT/DELETE 为前端预留桩，路径待后端确认

/* ==================== ⚠️ 3.2 缺口接口（待后端确认）==================== */

// 询盘（sys_inquiry）：字段参照《C模块开发清单》1.1，路径为前端预留桩，待后端确认
const inquiries = [
  { inquiryId: 1, inquiryNo: '#INQ-001', workTitle: '《都市迷途》', buyer: '影视公司A', seller: '张编剧', licenseType: 'exclusive', licenseTypeLabel: '独家授权', intendedUse: '院线电影改编', budget: 5000000, budgetText: '¥50,000', message: '希望获得独家改编权', status: 'pending', statusLabel: '待回复', expireAt: '2026-09-20 23:59', createdAt: '2026-09-08 09:00' },
  { inquiryId: 2, inquiryNo: '#INQ-002', workTitle: '《暗夜追踪》', buyer: '制作公司B', seller: '李作者', licenseType: 'non_exclusive', licenseTypeLabel: '非独家授权', intendedUse: '网剧拍摄', budget: 2500000, budgetText: '¥25,000', message: '计划明年开机', status: 'quoted', statusLabel: '议价中', expireAt: '2026-09-25 23:59', createdAt: '2026-09-07 14:00' },
  { inquiryId: 3, inquiryNo: '#INQ-003', workTitle: '《长安旧事》', buyer: '平台C', seller: '王编剧', licenseType: 'adaptation', licenseTypeLabel: '改编授权', intendedUse: '短剧改编', budget: 1800000, budgetText: '¥18,000', message: '需确认改编范围', status: 'quoted', statusLabel: '议价中', expireAt: '2026-09-30 23:59', createdAt: '2026-09-06 11:00' }
]

export function mockInquiries(params = {}) {
  return paginate(inquiries, params, (row, p) => {
    if (p.status && row.status !== p.status) return false
    if (p.keyword && !row.workTitle.includes(p.keyword) && !row.inquiryNo.includes(p.keyword)) return false
    return true
  })
}

export function mockInquiryDetail(inquiryId) {
  const id = Number(inquiryId)
  return inquiries.find((i) => i.inquiryId === id) || inquiries[0]
}

// 2026-09-29 询盘管理「记录跟进」功能下线（非分工清单需求），mockFollowUpInquiry 桩同步移除

// 2026-09-29 「询盘转订单」功能下线（成交统一由接受报价触发），mockConvertInquiryToOrder 桩同步移除

// 报价/议价记录（sys_quote）：卖方报价 status=pending（待买方确认），买方议价 status=pending_seller（待卖方确认）
const quotes = [
  { quoteId: 1, quoteNo: '#QUO-001', inquiryId: 2, inquiryNo: '#INQ-002', workTitle: '《暗夜追踪》', quoterName: '李作者', quoterRole: 'seller', quoterRoleLabel: '卖方报价', price: 2500000, priceText: '¥25,000', licenseType: 'non_exclusive', licenseTypeLabel: '非独家授权', validDays: 15, description: '含一轮修改', status: 'pending', statusLabel: '待买方确认', expireAt: '2026-09-22 23:59', createdAt: '2026-09-07 16:00' },
  { quoteId: 2, quoteNo: '#QUO-002', inquiryId: 2, inquiryNo: '#INQ-002', workTitle: '《暗夜追踪》', quoterName: '制作公司B', quoterRole: 'buyer', quoterRoleLabel: '买方议价', price: 2200000, priceText: '¥22,000', licenseType: 'non_exclusive', licenseTypeLabel: '非独家授权', validDays: 7, description: '买方议价，希望降价', status: 'rejected', statusLabel: '已拒绝', expireAt: '2026-09-18 23:59', createdAt: '2026-09-08 10:00' },
  { quoteId: 3, quoteNo: '#QUO-003', inquiryId: 1, inquiryNo: '#INQ-001', workTitle: '《都市迷途》', quoterName: '张编剧', quoterRole: 'seller', quoterRoleLabel: '卖方报价', price: 5000000, priceText: '¥50,000', licenseType: 'exclusive', licenseTypeLabel: '独家授权', validDays: 30, description: '独家改编全周期', status: 'accepted', statusLabel: '已接受', expireAt: '2026-10-08 23:59', createdAt: '2026-09-08 15:00' },
  { quoteId: 4, quoteNo: '#QUO-004', inquiryId: 1, inquiryNo: '#INQ-001', workTitle: '《都市迷途》', quoterName: '出品方A', quoterRole: 'buyer', quoterRoleLabel: '买方议价', price: 4600000, priceText: '¥46,000', licenseType: 'exclusive', licenseTypeLabel: '独家授权', validDays: 7, description: '买方议价，待卖方在客户端确认', status: 'pending_seller', statusLabel: '待卖方确认', expireAt: '2026-09-26 23:59', createdAt: '2026-09-19 11:00' }
]

export function mockQuotes(params = {}) {
  return paginate(quotes, params, (row, p) => {
    if (p.status && row.status !== p.status) return false
    if (p.quoterRole && row.quoterRole !== p.quoterRole) return false
    if (p.inquiryId && Number(row.inquiryId) !== Number(p.inquiryId)) return false
    if (p.keyword && !row.quoteNo.includes(p.keyword) && !row.inquiryNo.includes(p.keyword) && !row.workTitle.includes(p.keyword)) return false
    return true
  })
}

// 订单状态流转日志（sys_order_status_log）：待后端确认

// 征集项目（sys_demand）：待后端确认
const demands = [
  { demandId: 1, demandNo: '#DEM-001', title: '悬疑短剧剧本征集', client: '影视公司A', genre: '悬疑', budget: 3000000, budgetText: '¥30,000', deadline: '2026-10-01', requirement: '12集，每集10分钟', contactInfo: '李经理 138****8000', submissionCount: 8, status: 'open', statusLabel: '征集中', createdAt: '2026-09-01 09:00' },
  { demandId: 2, demandNo: '#DEM-002', title: '都市情感剧征集', client: '平台C', genre: '都市', budget: 5000000, budgetText: '¥50,000', deadline: '2026-09-28', requirement: '24集长剧', contactInfo: '王制片 139****9000', submissionCount: 15, status: 'selected', statusLabel: '已选定', createdAt: '2026-08-20 09:00' }
]

export function mockDemands(params = {}) {
  return paginate(demands, params, (row, p) => {
    if (p.status && row.status !== p.status) return false
    if (p.keyword && !row.title.includes(p.keyword)) return false
    return true
  })
}

// 投稿明细（sys_demand_submission）：待后端确认
const demandSubmissions = {
  1: [
    { submissionId: 11, demandId: 1, workTitle: '《迷雾之城》', submitter: '陈编剧', status: 'submitted', statusLabel: '已投稿', submitMessage: '原创悬疑', reviewRemark: '', reviewedAt: '', submittedAt: '2026-09-05 10:00' },
    { submissionId: 12, demandId: 1, workTitle: '《暗夜追踪》', submitter: '李作者', status: 'shortlisted', statusLabel: '入围', submitMessage: '已完本', reviewRemark: '题材契合', reviewedAt: '2026-09-09 10:00', submittedAt: '2026-09-04 10:00' }
  ],
  2: [
    { submissionId: 21, demandId: 2, workTitle: '《都市迷途》', submitter: '张编剧', status: 'accepted', statusLabel: '已选用', submitMessage: '都市情感', reviewRemark: '选定', reviewedAt: '2026-09-10 10:00', submittedAt: '2026-09-02 10:00' }
  ]
}

export function mockDemandSubmissions(demandId) {
  const rows = demandSubmissions[Number(demandId)] || []
  return { rows, total: rows.length }
}
