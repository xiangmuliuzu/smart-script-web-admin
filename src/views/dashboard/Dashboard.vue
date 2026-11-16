<template>
  <div v-loading="loading" class="dashboard">
    <header class="head">
      <div>
        <h1>数据总览</h1>
        <p>平台经营核心指标</p>
      </div>
      <div class="head-actions">
        <span v-if="updatedAt">{{ updatedAt }}</span>
        <el-button :loading="loading" @click="refreshAll">刷新</el-button>
      </div>
    </header>

    <!-- 核心指标 -->
    <section class="kpi-row">
      <article v-for="m in metrics" :key="m.key" class="kpi">
        <div class="kpi-label">
          <el-icon :size="16"><component :is="m.icon" /></el-icon>
          <span>{{ m.label }}</span>
        </div>
        <div class="kpi-value">{{ m.value }}</div>
        <div v-if="m.parts?.length" class="kpi-parts">
          <span v-for="p in m.parts" :key="p.label">
            <i :style="{ background: p.color }" />{{ p.label }} {{ p.value }}
          </span>
        </div>
        <p v-else class="kpi-desc">{{ m.desc }}</p>
      </article>
    </section>

    <!-- 运营关注 + 待办 -->
    <section class="mid-row">
      <div class="card">
        <div class="card-head">
          <h2>运营关注</h2>
          <span>较上期</span>
        </div>
        <div class="focus-grid">
          <div v-for="item in focusStats" :key="item.title" class="focus-item">
            <span class="focus-label">{{ item.title }}</span>
            <strong>{{ item.value }}</strong>
            <em :class="trendClass(item.trend)">{{ formatTrend(item.trend) }}</em>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>待办入口</h2>
          <span>审核队列</span>
        </div>
        <div class="todo-grid">
          <button
            v-for="item in quickItems"
            :key="item.route"
            type="button"
            class="todo-item"
            @click="goQuick(item.route)"
          >
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.label || '待审核' }}</span>
            </div>
            <b :class="{ hot: Number(item.count) > 0 }">{{ item.count }}</b>
          </button>
        </div>
      </div>
    </section>

    <!-- 图表 -->
    <section class="chart-row">
      <div class="card trend-card">
        <div class="card-head">
          <div>
            <h2>成交趋势</h2>
            <p>已完成订单 · 单位万元</p>
          </div>
          <el-radio-group v-model="trendPeriod" size="small" @change="fetchTrend">
            <el-radio-button value="week">7日</el-radio-button>
            <el-radio-button value="month">30日</el-radio-button>
            <el-radio-button value="year">12月</el-radio-button>
          </el-radio-group>
        </div>
        <div class="trend-stats">
          <div><span>合计</span><strong>{{ trendSum }}</strong></div>
          <div><span>均值</span><strong>{{ trendAvg }}</strong></div>
          <div><span>峰值</span><strong>{{ trendMax }}</strong></div>
        </div>
        <div ref="trendChartRef" class="chart h320" />
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h2>作品状态</h2>
            <p>在库结构分布</p>
          </div>
        </div>
        <div ref="statusChartRef" class="chart h240" />
        <ul class="legend">
          <li v-for="item in statusDist" :key="item.name">
            <i :style="{ background: item.color }" />
            <span>{{ item.name }}</span>
            <b>{{ item.value }}</b>
            <em>{{ item.percent }}%</em>
          </li>
        </ul>
      </div>
    </section>

    <section class="bottom-row">
      <div class="card">
        <div class="card-head">
          <div>
            <h2>用户与作品</h2>
            <p>构成对比</p>
          </div>
        </div>
        <div ref="mixChartRef" class="chart h280" />
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h2>最近审核</h2>
            <p>最新提审</p>
          </div>
          <el-button link type="primary" @click="goQuick('/copyright/ai-review/review')">工作台</el-button>
        </div>
        <div class="review-list">
          <button
            v-for="(row, idx) in recentReviews"
            :key="idx"
            type="button"
            class="review-item"
            @click="goQuick('/copyright/ai-review/review')"
          >
            <div>
              <strong>{{ row.name || '未命名作品' }}</strong>
              <span>{{ row.author || '—' }} · {{ row.submitTime || '—' }}</span>
            </div>
            <el-tag size="small" :type="reviewTagType(row.status)" effect="plain">
              {{ reviewStatusText(row.status) }}
            </el-tag>
          </button>
          <el-empty v-if="!recentReviews.length" description="暂无审核记录" :image-size="56" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Document, Money, Notebook, Sell, User, Wallet } from '@element-plus/icons-vue'
import adminFetch from '@/utils/adminFetch'

defineOptions({ name: 'Dashboard' })

const DASHBOARD_PREFIX = '/api/v1/admin/dashboard'
const router = useRouter()

const C = {
  blue: '#3b82f6',
  teal: '#14b8a6',
  orange: '#f59e0b',
  slate: '#64748b',
  sky: '#0ea5e9',
  amber: '#d97706',
  green: '#22c55e',
  red: '#ef4444'
}

const STATUS_COLORS = {
  待审核: C.orange,
  已通过: C.green,
  已上架: C.blue,
  已下架: C.slate,
  草稿: '#94a3b8'
}

const AUDIT_QUICK_DEFAULTS = [
  { title: '作品审核', label: '待审核', route: '/copyright/ai-review/review', count: 0 },
  { title: '印章审核', label: '待审核', route: '/copyright/seals', count: 0 },
  { title: '提现审核', label: '待审核', route: '/copyright/withdraw-review', count: 0 },
  { title: '实名审核', label: '待审核', route: '/appuser/realname', count: 0 },
  { title: '创作者审核', label: '待审核', route: '/appuser/creator-apply', count: 0 }
]

const loading = ref(false)
const updatedAt = ref('')
const focusStats = ref([])
const quickItems = ref(AUDIT_QUICK_DEFAULTS.map((item) => ({ ...item })))
const statusDist = ref([])
const barChart = ref([])
const overviewBiz = ref({})
const recentReviews = ref([])
const trendPeriod = ref('week')
const trendRows = ref([])

const trendChartRef = ref(null)
const statusChartRef = ref(null)
const mixChartRef = ref(null)
let trendChart
let statusChart
let mixChart

const fmtAmount = (yuan) => {
  const n = Number(yuan) || 0
  const wan = n / 10000
  if (wan >= 1) return wan % 1 === 0 ? `${wan}万` : `${wan.toFixed(1)}万`
  return `${Math.round(n)}`
}

const metrics = computed(() => {
  const d = overviewBiz.value
  const users = d.users || {}
  const works = d.works || {}
  const orders = d.orders || {}
  const contracts = d.contracts || {}
  const trade = d.trade || {}
  return [
    {
      key: 'users',
      label: '用户',
      value: users.total ?? 0,
      icon: User,
      parts: [{ label: '创作者', value: users.creators ?? 0, color: C.teal }]
    },
    {
      key: 'works',
      label: '作品',
      value: works.total ?? 0,
      icon: Document,
      parts: [
        { label: '上架', value: works.onShelf ?? 0, color: C.blue },
        { label: '下架', value: works.offShelf ?? 0, color: C.slate },
        { label: '审核', value: works.reviewing ?? 0, color: C.orange }
      ]
    },
    {
      key: 'orders',
      label: '订单',
      value: orders.total ?? 0,
      icon: Sell,
      parts: [
        { label: '完成', value: orders.completed ?? 0, color: C.green },
        { label: '未完成', value: orders.unfinished ?? 0, color: C.red }
      ]
    },
    {
      key: 'contracts',
      label: '合同',
      value: contracts.total ?? 0,
      icon: Notebook,
      desc: '累计签署'
    },
    {
      key: 'trade',
      label: '交易额',
      value: fmtAmount(trade.totalAmount ?? 0),
      icon: Money,
      parts: [{ label: '已成交', value: fmtAmount(trade.completedAmount ?? 0), color: C.sky }]
    },
    {
      key: 'fee',
      label: '平台收成',
      value: fmtAmount(trade.platformFee ?? 0),
      icon: Wallet,
      desc: '订单分成合计'
    }
  ]
})

const trendValues = computed(() => trendRows.value.map((r) => Number(r.value) || 0))
const trendSum = computed(() => Number(trendValues.value.reduce((a, b) => a + b, 0).toFixed(1)))
const trendAvg = computed(() => {
  if (!trendValues.value.length) return 0
  return Number((trendSum.value / trendValues.value.length).toFixed(1))
})
const trendMax = computed(() => {
  if (!trendValues.value.length) return 0
  return Number(Math.max(...trendValues.value).toFixed(1))
})

function formatTrend(trend) {
  const n = Number(trend) || 0
  if (n === 0) return '持平'
  return `${n > 0 ? '+' : ''}${n}%`
}

function trendClass(trend) {
  const n = Number(trend) || 0
  if (n > 0) return 'up'
  if (n < 0) return 'down'
  return 'flat'
}

function reviewStatusText(status) {
  const map = {
    pending: '待审核',
    ai_reviewing: 'AI审核中',
    manual_review: '待复核',
    approved: '已通过',
    rejected: '已驳回',
    on_shelf: '已上架',
    off_shelf: '已下架'
  }
  return map[status] || status || '—'
}

function reviewTagType(status) {
  if (status === 'approved' || status === 'on_shelf') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending' || status === 'manual_review') return 'warning'
  return 'info'
}

function goQuick(route) {
  if (!route) return
  router.push(route).catch(() => {})
}

function ensureChart(el, existing) {
  if (!el) return existing
  return existing || echarts.init(el)
}

function renderTrendChart() {
  trendChart = ensureChart(trendChartRef.value, trendChart)
  if (!trendChart) return
  const labels = trendRows.value.map((r) => r.label)
  const values = trendValues.value
  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,.9)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12 },
      valueFormatter: (v) => `${v} 万`
    },
    grid: { left: 42, right: 16, top: 20, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [{
      type: 'line',
      smooth: 0.3,
      symbol: values.length <= 14 ? 'circle' : 'none',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: C.sky },
      itemStyle: { color: C.sky, borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(14,165,233,.18)' },
          { offset: 1, color: 'rgba(14,165,233,0)' }
        ])
      },
      data: values
    }]
  }, true)
}

function renderStatusChart() {
  statusChart = ensureChart(statusChartRef.value, statusChart)
  if (!statusChart) return
  const items = statusDist.value
  const total = items.reduce((s, i) => s + Number(i.value || 0), 0)
  statusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '48%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 4 },
      label: { show: false },
      data: items.map((i) => ({
        name: i.name,
        value: i.value,
        itemStyle: { color: i.color }
      }))
    }],
    graphic: total ? [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: { text: String(total), fill: '#0f172a', fontSize: 22, fontWeight: 700, textAlign: 'center' }
      },
      {
        type: 'text',
        left: 'center',
        top: '54%',
        style: { text: '合计', fill: '#94a3b8', fontSize: 12, textAlign: 'center' }
      }
    ] : []
  }, true)
}

function renderMixChart() {
  mixChart = ensureChart(mixChartRef.value, mixChart)
  if (!mixChart) return
  const items = barChart.value || []
  const colors = [C.blue, C.teal, C.sky, C.slate, C.orange]
  mixChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 48, right: 16, top: 24, bottom: 36 },
    xAxis: {
      type: 'category',
      data: items.map((i) => i.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [{
      type: 'bar',
      barWidth: 26,
      data: items.map((i, idx) => ({
        value: i.value,
        itemStyle: {
          color: colors[idx % colors.length],
          borderRadius: [8, 8, 0, 0]
        }
      })),
      label: {
        show: true,
        position: 'top',
        color: '#334155',
        fontSize: 12,
        fontWeight: 600
      }
    }]
  }, true)
}

async function fetchOverview() {
  const res = await adminFetch(`${DASHBOARD_PREFIX}/overview`)
  const data = await res.json()
  if (data.code !== 200 || !data.data) throw new Error(data.msg || 'overview failed')
  const d = data.data
  focusStats.value = d.stats || []
  // 五项审核入口始终展示；接口无数据时显示灰色 0
  const countByRoute = new Map(
    (d.quick || []).map((item) => [String(item?.route || ''), Number(item?.count) || 0])
  )
  quickItems.value = AUDIT_QUICK_DEFAULTS.map((item) => ({
    ...item,
    count: countByRoute.has(item.route) ? countByRoute.get(item.route) : 0
  }))
  statusDist.value = (d.statusDist || []).map((item) => ({
    ...item,
    color: STATUS_COLORS[item.name] || item.color
  }))
  barChart.value = d.barChart || []
  overviewBiz.value = {
    users: d.users || {},
    works: d.works || {},
    orders: d.orders || {},
    contracts: d.contracts || {},
    trade: d.trade || {}
  }
}

async function fetchTrend() {
  const res = await adminFetch(`${DASHBOARD_PREFIX}/trend?period=${trendPeriod.value}`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.msg || 'trend failed')
  trendRows.value = data.rows || []
  await nextTick()
  renderTrendChart()
}

async function fetchRecentReviews() {
  const res = await adminFetch(`${DASHBOARD_PREFIX}/recent-reviews?limit=6`)
  const data = await res.json()
  if (data.code !== 200) throw new Error(data.msg || 'recent failed')
  recentReviews.value = data.rows || []
}

async function refreshAll() {
  loading.value = true
  try {
    await Promise.all([fetchOverview(), fetchTrend(), fetchRecentReviews()])
    updatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
    await nextTick()
    renderStatusChart()
    renderMixChart()
    renderTrendChart()
  } catch (e) {
    console.error(e)
    ElMessage.error('获取数据总览失败')
  } finally {
    loading.value = false
  }
}

function handleResize() {
  trendChart?.resize()
  statusChart?.resize()
  mixChart?.resize()
}

onMounted(() => {
  refreshAll()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  statusChart?.dispose()
  mixChart?.dispose()
  trendChart = statusChart = mixChart = null
})
</script>

<style scoped>
.dashboard {
  min-height: 100%;
  padding: 22px 24px 32px;
  background: #f7f8fa;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 18px;
}

.head h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.kpi {
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 14px;
  padding: 16px;
  min-height: 126px;
}

.kpi-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.kpi-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 720;
  color: #0f172a;
  letter-spacing: -0.4px;
  line-height: 1.1;
}

.kpi-parts {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kpi-parts span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #64748b;
}

.kpi-parts i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.kpi-desc {
  margin: 12px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.mid-row,
.chart-row,
.bottom-row {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.mid-row {
  grid-template-columns: 1.2fr 1fr;
}

.chart-row {
  grid-template-columns: 1.55fr 1fr;
}

.bottom-row {
  grid-template-columns: 1.15fr 1fr;
}

.card {
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 14px;
  overflow: hidden;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 0;
}

.card-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.card-head p,
.card-head > span {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.focus-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 16px 16px;
}

.focus-item {
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.focus-label {
  font-size: 12px;
  color: #64748b;
}

.focus-item strong {
  font-size: 24px;
  color: #0f172a;
  font-weight: 720;
}

.focus-item em {
  font-style: normal;
  font-size: 12px;
  font-weight: 650;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
}

.focus-item em.up {
  color: #15803d;
  background: #dcfce7;
}

.focus-item em.down {
  color: #b45309;
  background: #ffedd5;
}

.focus-item em.flat {
  color: #64748b;
  background: #e2e8f0;
}

.todo-grid {
  display: grid;
  gap: 8px;
  padding: 14px 16px 16px;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}

.todo-item:hover {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.todo-item strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
}

.todo-item span {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: #94a3b8;
}

.todo-item b {
  font-size: 22px;
  color: #94a3b8;
  font-weight: 720;
}

.todo-item b.hot {
  color: #ef4444;
}

.trend-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px 18px 0;
}

.trend-stats > div {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.trend-stats span {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}

.trend-stats strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  color: #0f172a;
}

.chart {
  width: 100%;
}

.h320 { height: 320px; }
.h280 { height: 280px; }
.h240 { height: 240px; }

.legend {
  list-style: none;
  margin: 0;
  padding: 0 18px 16px;
  display: grid;
  gap: 8px;
}

.legend li {
  display: grid;
  grid-template-columns: 8px 1fr auto auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend span { color: #475569; }
.legend b { color: #0f172a; }
.legend em {
  font-style: normal;
  color: #94a3b8;
  min-width: 40px;
  text-align: right;
}

.review-list {
  padding: 10px 12px 14px;
  display: grid;
  gap: 4px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.review-item:hover {
  background: #f8fafc;
}

.review-item strong {
  display: block;
  font-size: 13px;
  color: #0f172a;
}

.review-item span {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .kpi-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .mid-row,
  .chart-row,
  .bottom-row { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .dashboard { padding: 14px; }
  .kpi-row { grid-template-columns: 1fr 1fr; }
  .focus-grid { grid-template-columns: 1fr; }
}
</style>
