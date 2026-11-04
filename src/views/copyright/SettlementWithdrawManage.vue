<template>
  <PageContainer>
    <PageHeader
      title="结算与提现"
      description="结算单与提现审核同页管理：订单完成后自动生成结算单，作者确认入账；超 1 万元提现需人工审核。"
    />
    <el-tabs v-if="allowedTabs.length" v-model="activeTab" @tab-change="refreshTab">
      <el-tab-pane v-if="canSettlement" label="结算单" name="settlement" lazy>
        <SettlementPanel ref="settlementPanel" />
      </el-tab-pane>
      <el-tab-pane v-if="canWithdraw" label="提现审核" name="withdraw" lazy>
        <WithdrawPanel ref="withdrawPanel" />
      </el-tab-pane>
    </el-tabs>
    <el-empty v-else description="暂无结算或提现查询权限，请联系管理员授权" />
  </PageContainer>
</template>

<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import SettlementPanel from '@/views/copyright/panels/SettlementPanel.vue'
import WithdrawPanel from '@/views/copyright/panels/WithdrawPanel.vue'

defineOptions({ name: 'SettlementWithdrawManage' })

const userStore = useUserStore()
const route = useRoute()
const settlementPanel = ref(null)
const withdrawPanel = ref(null)

const canSettlement = computed(() => userStore.hasPermission('smartscript:copyright:settlement:list'))
const canWithdraw = computed(() => userStore.hasPermission('smartscript:copyright:withdraw:list'))
const allowedTabs = computed(() => [
  canSettlement.value && 'settlement',
  canWithdraw.value && 'withdraw'
].filter(Boolean))

const activeTab = ref('')

function refreshTab(name) {
  const view = name === 'settlement' ? settlementPanel.value : name === 'withdraw' ? withdrawPanel.value : null
  if (view) nextTick(() => view.refresh?.())
}

watch([() => route.query.tab, allowedTabs], ([tab, allowed]) => {
  const requested = tab === 'withdraw' ? 'withdraw' : 'settlement'
  activeTab.value = allowed.includes(requested) ? requested : (allowed[0] || '')
}, { immediate: true })
</script>
