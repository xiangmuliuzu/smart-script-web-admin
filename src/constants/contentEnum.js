/**
 * B 模块（内容与作品）枚举常量集中管理。
 * 供 PC「内容管理」各页筛选下拉与表单选项统一取用，杜绝各页各写映射。
 *
 * 取值出处（禁止编造，逐项标注）：
 * - WORK_TYPE（作品类型）：云端库 sys_work.work_type 实测值只有 script，取库内实际值。
 * - TRADE_TYPE（交易类型）：与若依字典 trade_license_type 对齐
 *   （exclusive 独家 / non_exclusive 非独家 / adaptation 改编）。
 *   依据 sql/smartscript_full_init.sql：negotiable「可议价」已退役为所有作品共有能力。
 * - TAG_TYPE：标签墙维度（热门/主题/角色/情节），话题材与分组由 sys_tag 承载；
 *   作品归属只走 sys_work_tag，作品不再设置分类（频道仅由 sys_category 顶层记录提供）。
 *   App 端分类页走 /content/categories/nav，按标签维度取数。
 * - DRAMA_SOURCE_TYPE / DRAMA_AUTH_STATUS / DRAMA_SHELF_STATUS / BANNER_POSITION：
 *   取云端库 sys_external_drama / sys_banner 对应列实测值。
 * - RANKING_TYPE：榜单四类（App 与 PC 一致；交易热度榜因剧本通常只交易一次已下线），
 *   方案 A「时间窗口 + 分级」，type 与主指标强绑定：
 *   view 近 7 天阅读量 / favorite 近 7 天收藏数 /
 *   rating 平均评分 / new 近 30 天上架按阅读量。
 */

/** 标签维度（sys_tag.tag_type）：hot 热门标签 / theme 主题 / role 角色 / plot 情节 */
export const TAG_TYPE = [
  { value: 'hot', label: '热门标签' },
  { value: 'theme', label: '主题' },
  { value: 'role', label: '角色' },
  { value: 'plot', label: '情节' }
]

/** 标签分组建议（sys_tag.group_name）：各维度下常用的分区块标题 */
export const TAG_GROUP_SUGGESTIONS = {
  hot: ['热门标签'],
  theme: ['男频主题', '女频主题', '通用主题'],
  role: ['人物身份', '情感关系'],
  plot: ['逆袭爽感', '穿越重生', '情感关系', '题材设定']
}

/** 作品类型（sys_work.work_type）：库内实际值 */
export const WORK_TYPE = [{ value: 'script', label: '剧本' }]

/** 交易类型（sys_work.trade_type）：与字典 trade_license_type 对齐 */
export const TRADE_TYPE = [
  { value: 'exclusive', label: '独家' },
  { value: 'non_exclusive', label: '非独家' },
  { value: 'adaptation', label: '改编' }
]

/** 外部视频来源类型（sys_external_drama.source_type） */
export const DRAMA_SOURCE_TYPE = [{ value: 'douyin', label: '抖音' }]

/** 外部视频授权状态（sys_external_drama.authorization_status） */
export const DRAMA_AUTH_STATUS = [{ value: 'authorized', label: '已授权' }]

/** 外部视频上/下架状态（sys_external_drama.status） */
export const DRAMA_SHELF_STATUS = [
  { value: 'on_shelf', label: '已上架' },
  { value: 'off_shelf', label: '已下架' }
]

/** Banner 展示位置（sys_banner.position） */
export const BANNER_POSITION = [
  { value: 'home_top', label: '首页顶部' }
]

/** 榜单类型（type 与主指标强绑定） */
export const RANKING_TYPE = [
  { value: 'view', label: '热门榜', metricLabel: '累计浏览量' },
  { value: 'favorite', label: '收藏榜', metricLabel: '近7天收藏' },
  { value: 'rating', label: '评分榜', metricLabel: '综合评分' },
  { value: 'new', label: '新书榜', metricLabel: '上架时间' }
]
/** 取中文名，找不到回退原值 */
export function contentEnumLabel(list, value) {
  const item = (list || []).find((i) => i.value === value)
  return item ? item.label : (value ?? '—')
}
