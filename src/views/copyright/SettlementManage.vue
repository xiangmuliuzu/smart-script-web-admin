<template>
  <PageContainer>
    <PageHeader title="结算管理" description="与 App 同源结算单：订单完成后自动生成，作者确认入账；管理员仅处理作者异议。" />
    <SettlementPanel />
  </PageContainer>
</template>

<script setup>
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import SettlementPanel from '@/views/copyright/panels/SettlementPanel.vue'

defineOptions({ name: 'SettlementManage' })
</script>
