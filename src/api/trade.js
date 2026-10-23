import { adminV1Request as request } from '@/utils/request'
import {
  isTradeMock,
  mockOrders, mockOrderDetail,
  mockInquiries, mockInquiryDetail,
  mockQuotes,
  mockDemands, mockDemandSubmissions
} from '@/api/trade.mock'
import {
  adaptOrders, adaptOrderDetail, adaptInquiries, adaptInquiryDetail, adaptQuotes,
  adaptDemands, adaptDemandSubmissions
} from '@/api/trade.adapter'

/**
 * 交易商务（C 模块）PC 管理端 API。
 * 前缀 /api/v1/admin，返回兼容若依 AjaxResult(code/msg/data) 与 TableDataInfo(code/msg/rows/total)。
 *
 * 数据接入：由 VITE_TRADE_MOCK 开关控制（仅本地开发生效）。开关开启时返回 trade.mock.js 假数据，
 * 关闭后走真实请求，页面组件代码不改。
 *
 * 路径依据：
 * - 已定义接口（附件6.1）：2.25-2.29 交易作品/订单，2.35-2.38 合作方/需求标签/商务跟进。
 * - ⚠️ 文档缺口接口（《C模块开发清单》3.2，路径待后端确认）：询盘、报价/议价、订单状态日志、征集项目。
 */
const PREFIX = '/api/v1/admin'

/**
 * 分页参数适配：前端统一用 pageNo（附件6.1 接口口径），但若依 startPage() 读取的是 pageNum，
 * 取不到会默认 pageNum=1，导致「翻页仍返回第一页」。此处在真实请求前把 pageNo 映射为 pageNum；
 * mock 分支仍传原始 pageNo（见 trade.mock.js paginate），故不受影响。
 */
function withPageNum(params) {
  if (params && params.pageNo !== undefined && params.pageNum === undefined) {
    const { pageNo, ...rest } = params
    return { ...rest, pageNum: pageNo }
  }
  return params
}

/* ==================== 授权订单（2.28 / 2.29）==================== */

/** 2.28 授权订单列表 GET /trade/orders */
export function getOrderList(params) {
  if (isTradeMock()) return Promise.resolve(mockOrders(params))
  return request({ url: `${PREFIX}/trade/orders`, method: 'get', params: withPageNum(params) }).then(adaptOrders)
}

/**
 * 2.29 订单详情 GET /trade/orders/{orderId}
 * 后端详情端点不含状态流转记录，需并行拉取 status-log 端点后合并（合同/托管/结算属 D）。
 */
export function getOrderDetail(orderId) {
  if (isTradeMock()) return Promise.resolve(mockOrderDetail(orderId))
  return Promise.all([
    request({ url: `${PREFIX}/trade/orders/${orderId}`, method: 'get' }),
    request({ url: `${PREFIX}/trade/orders/${orderId}/status-log`, method: 'get' }).catch(() => ({ rows: [] }))
  ]).then(([detail, log]) => adaptOrderDetail(detail, log))
}

/* ==================== ⚠️ 询盘（文档缺口 3.2，前端预留桩，路径待后端确认）==================== */

/** 询盘列表 GET /trade/inquiry/list */
export function getInquiryList(params) {
  if (isTradeMock()) return Promise.resolve(mockInquiries(params))
  return request({ url: `${PREFIX}/trade/inquiry/list`, method: 'get', params: withPageNum(params) }).then(adaptInquiries)
}

/** 询盘详情 GET /trade/inquiry/detail/{id} */
export function getInquiryDetail(id) {
  if (isTradeMock()) return Promise.resolve(mockInquiryDetail(id))
  return request({ url: `${PREFIX}/trade/inquiry/detail/${id}`, method: 'get' }).then(adaptInquiryDetail)
}

// 2026-09-29 用户决策：取消「询盘转订单」功能，订单一律在接受报价时生成；
// 后端 POST /trade/inquiry/convert-order/{id} 仅为兼容文档保留（仅 deal 可调），前端不再封装。

/* ==================== ⚠️ 报价/议价（文档缺口，路径待后端确认）==================== */

/** 报价/议价记录列表 GET /trade/quote/list */
export function getQuoteList(params) {
  if (isTradeMock()) return Promise.resolve(mockQuotes(params))
  return request({ url: `${PREFIX}/trade/quote/list`, method: 'get', params: withPageNum(params) }).then(adaptQuotes)
}

/* ==================== ⚠️ 征集项目（文档缺口，对应 sys_demand / sys_demand_submission）==================== */

/** 征集项目列表 GET /trade/demand/list */
export function getDemandList(params) {
  if (isTradeMock()) return Promise.resolve(mockDemands(params))
  return request({ url: `${PREFIX}/trade/demand/list`, method: 'get', params: withPageNum(params) }).then(adaptDemands)
}

/** 征集项目投稿作品 GET /trade/demand/{demandId}/submissions */
export function getDemandSubmissions(demandId) {
  if (isTradeMock()) return Promise.resolve(mockDemandSubmissions(demandId))
  return request({ url: `${PREFIX}/trade/demand/${demandId}/submissions`, method: 'get' }).then(adaptDemandSubmissions)
}

/** 发布征集令 POST /trade/demand */
export function createDemand(data) {
  if (isTradeMock()) return Promise.resolve({ code: 200, msg: 'success' })
  return request({ url: `${PREFIX}/trade/demand`, method: 'post', data })
}
