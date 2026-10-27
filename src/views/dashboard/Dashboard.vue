<template>
  <div class="dashboard-container">
    <!-- 顶部统计卡片（业务数据总览） -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="8" :md="6" :lg="4" v-for="(stat, index) in statsData" :key="index">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">{{ stat.title }}</div>
              <div class="stat-value">{{ stat.value }}</div>
              <div v-if="stat.sub" class="stat-sub">{{ stat.sub }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户与作品柱状图 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <span class="chart-title">用户与作品</span>
          </template>
          <div ref="barChartRef" class="bar-chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import adminFetch from '@/utils/adminFetch'

const DASHBOARD_PREFIX = '/api/v1/admin/dashboard'

// 业务数据统计卡
const statsData = ref([])

// 用户与作品柱状图
const barChartRef = ref(null)
let barChartInstance = null

const fetchOverview = async () => {
  try {
    const res = await adminFetch(`${DASHBOARD_PREFIX}/overview`)
    const data = await res.json()
    if (data.code === 200 && data.data) {
      renderBizStats(data.data)
      renderBarChart(data.data.barChart || [])
    }
  } catch (e) {
    ElMessage.error('获取数据总览失败')
  }
}

// 业务数据总览指标卡（用户/作品/订单/合同/交易额/平台收成）
const renderBizStats = (d) => {
  const users = d.users || {}
  const works = d.works || {}
  const orders = d.orders || {}
  const contracts = d.contracts || {}
  const trade = d.trade || {}
  statsData.value = [
    {
      title: '用户总数',
      value: users.total ?? 0,
      sub: `创作者 ${users.creators ?? 0} 人`
    },
    {
      title: '作品总数',
      value: works.total ?? 0,
      sub: `上架 ${works.onShelf ?? 0} · 下架 ${works.offShelf ?? 0} · 审核中 ${works.reviewing ?? 0}`
    },
    {
      title: '订单数',
      value: orders.total ?? 0,
      sub: `已完成 ${orders.completed ?? 0} · 未完成 ${orders.unfinished ?? 0}`
    },
    {
      title: '合同数',
      value: contracts.total ?? 0,
      sub: '全部合同'
    },
    {
      title: '交易额',
      value: fmtAmount(trade.totalAmount ?? 0),
      sub: `已完成成交 ${fmtAmount(trade.completedAmount ?? 0)}`
    },
    {
      title: '平台收成',
      value: fmtAmount(trade.platformFee ?? 0),
      sub: '平台佣金收入'
    }
  ]
}

// 金额格式：万
const fmtAmount = (yuan) => {
  const wan = Number(yuan) / 10000
  if (wan >= 1) {
    return wan % 1 === 0 ? `${wan}万` : `${wan.toFixed(1)}万`
  }
  return `${Math.round(Number(yuan))}`
}

// 用户与作品柱状图
const renderBarChart = (items) => {
  if (!barChartRef.value) return
  if (!barChartInstance) {
    barChartInstance = echarts.init(barChartRef.value)
  }
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#909399', '#F56C6C']
  barChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 50, right: 30, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: items.map(i => i.name),
      axisLabel: { color: '#606266' }
    },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#606266' } },
    series: [{
      type: 'bar',
      barWidth: 44,
      data: items.map((i, idx) => ({
        value: i.value,
        itemStyle: { color: colors[idx % colors.length], borderRadius: [4, 4, 0, 0] }
      })),
      label: { show: true, position: 'top', color: '#303133', fontWeight: 600 }
    }]
  })
}

const handleResize = () => {
  if (barChartInstance) barChartInstance.resize()
}

onMounted(() => {
  fetchOverview()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background-color: #f7f8fa;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card :deep(.el-card__body) {
  padding: 24px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  font-weight: 400;
}

.stat-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.5;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #1f2329;
  letter-spacing: -0.5px;
}

/* 图表区域 */
.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #ffffff;
}

.chart-card :deep(.el-card__header) {
  padding: 18px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.chart-card :deep(.el-card__body) {
  padding: 24px;
}

.chart-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 600;
}

/* 用户与作品柱状图 */
.bar-chart {
  width: 100%;
  height: 320px;
}
</style>
