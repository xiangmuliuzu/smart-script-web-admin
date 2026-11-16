<template>
  <PageContainer>
    <PageHeader title="提现审核" description="超过 1 万元的申请需人工审核（通过/驳回）；1 万元及以下申请自动通过，仅可查看记录。" />
    <WithdrawPanel />
  </PageContainer>
</template>

<script setup>
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import WithdrawPanel from '@/views/copyright/panels/WithdrawPanel.vue'

defineOptions({ name: 'WithdrawReview' })
</script>
