import MainLayout from '@/layout/MainLayout.vue'
import Dashboard from '@/views/dashboard/Dashboard.vue'
import ModuleScaffold from '@/views/common/ModuleScaffold.vue'
import ReviewWorkbench from '@/views/copyright/ReviewWorkbench.vue'
import AiReviewRules from '@/views/copyright/AiReviewRules.vue'
import CopyrightAssets from '@/views/copyright/CopyrightAssets.vue'
import CopyrightSealReview from '@/views/copyright/SealReview.vue'
import WithdrawReview from '@/views/copyright/WithdrawReview.vue'
import ContractManage from '@/views/copyright/ContractManage.vue'
import SettlementManage from '@/views/copyright/SettlementManage.vue'
import FinanceAbnormal from '@/views/copyright/FinanceAbnormal.vue'
import CopyrightCertManage from '@/views/copyright/CopyrightCertManage.vue'
import CopyrightApplicationManage from '@/views/copyright/CopyrightApplicationManage.vue'
import CopyrightCenterConfig from '@/views/copyright/CopyrightCenterConfig.vue'
import ContentCategory from '@/views/content/category/index.vue'
import ContentTag from '@/views/content/tag/index.vue'
import ContentWork from '@/views/content/work/index.vue'
import ContentBookstore from '@/views/content/bookstore/index.vue'
import ContentRanking from '@/views/content/ranking/index.vue'
import ContentBanner from '@/views/content/banner/index.vue'
import ExternalDramaChannel from '@/views/content/external-drama/channel/index.vue'
import ExternalDramaContent from '@/views/content/external-drama/drama/index.vue'
import AuthOrders from '@/views/trade/AuthOrders.vue'
import Inquiry from '@/views/trade/Inquiry.vue'
import Quote from '@/views/trade/Quote.vue'
import Demand from '@/views/trade/Demand.vue'
import AdConfig from '@/views/operation/AdConfig.vue'
import UserManageProduct from '@/views/user/UserManage.vue'
import UserRealName from '@/views/user/realname/index.vue'
import UserCreatorApply from '@/views/user/creator-apply/index.vue'
import MessagesAnnouncements from '@/views/support/MessagesAnnouncements.vue'
import ReceivedAnnouncements from '@/views/support/ReceivedAnnouncements.vue'
import UserFeedback from '@/views/user/feedback/index.vue'
import RiskManage from '@/views/risk/RiskManage.vue'
import AiOperations from '@/views/system/AiOperations.vue'
import SystemUser from '@/views/system/user/index.vue'
import SystemRole from '@/views/system/role/index.vue'
import SystemMenu from '@/views/system/menu/index.vue'
import SystemDept from '@/views/system/dept/index.vue'
import SystemPost from '@/views/system/post/index.vue'
import SystemDict from '@/views/system/dict/index.vue'
import SystemConfig from '@/views/system/config/index.vue'
import WelfarePoints from '@/views/welfare/WelfarePoints.vue'
import MonitorOperlog from '@/views/monitor/operlog/index.vue'
import MonitorLogininfor from '@/views/monitor/logininfor/index.vue'
import ChatSessions from '@/views/chat/ChatSessions.vue'
import ChatDetail from '@/views/chat/ChatDetail.vue'

/**
 * 服务端 component 标识 → 本地组件显式白名单。
 * 只回答“组件在哪里”；未登记标识一律拒绝。
 */
export const componentMap = {
  Layout: MainLayout,
  ParentView: MainLayout,

  'dashboard/Dashboard': Dashboard,
  'common/ModuleScaffold': ModuleScaffold,
  'copyright/ReviewWorkbench': ReviewWorkbench,
  'copyright/AiReviewRules': AiReviewRules,
  'copyright/CopyrightAssets': CopyrightAssets,
  'copyright/SealReview': CopyrightSealReview,
  'copyright/WithdrawReview': WithdrawReview,
  'copyright/ContractManage': ContractManage,
  'copyright/SettlementManage': SettlementManage,
  'copyright/FinanceAbnormal': FinanceAbnormal,
  'copyright/CopyrightCertManage': CopyrightCertManage,
  'copyright/CopyrightApplicationManage': CopyrightApplicationManage,
  'copyright/CopyrightCenterConfig': CopyrightCenterConfig,
  'content/category/index': ContentCategory,
  'content/tag/index': ContentTag,
  'content/work/index': ContentWork,
  'content/bookstore/index': ContentBookstore,
  'content/ranking/index': ContentRanking,
  'content/banner/index': ContentBanner,
  'content/external-drama/channel/index': ExternalDramaChannel,
  'content/external-drama/drama/index': ExternalDramaContent,
  'trade/AuthOrders': AuthOrders,
  'trade/Inquiry': Inquiry,
  'trade/Quote': Quote,
  'trade/Demand': Demand,
  'operation/AdConfig': AdConfig,
  'user/UserManage': UserManageProduct,
  'user/realname/index': UserRealName,
  'user/creator-apply/index': UserCreatorApply,
  'user/message/index': MessagesAnnouncements,
  'support/MessagesAnnouncements': MessagesAnnouncements,
  'support/ReceivedAnnouncements': ReceivedAnnouncements,
  'user/feedback/index': UserFeedback,
  'risk/RiskManage': RiskManage,
  'system/AiOperations': AiOperations,
  'welfare/WelfarePoints': WelfarePoints,

  'system/user/index': SystemUser,
  'system/role/index': SystemRole,
  'system/menu/index': SystemMenu,
  'system/dept/index': SystemDept,
  'system/post/index': SystemPost,
  'system/dict/index': SystemDict,
  'system/config/index': SystemConfig,

  'monitor/operlog/index': MonitorOperlog,
  'monitor/logininfor/index': MonitorLogininfor,

  // A3 用户沟通（管理端菜单 component 标识，见 A3_20261008_002__chat_menu.sql）
  'chat/ChatSessions': ChatSessions,
  'chat/ChatDetail': ChatDetail
}

export function resolveComponent(component) {
  if (!component || typeof component !== 'string') return null
  return Object.prototype.hasOwnProperty.call(componentMap, component)
    ? componentMap[component]
    : null
}

export default componentMap