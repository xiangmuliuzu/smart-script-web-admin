<template>
  <div class="ai-operations-container">
    <div class="page-header">
      <h2 class="page-title">AI次数配置</h2>
    </div>
    <el-card shadow="never" style="max-width: 720px">
      <el-result icon="info" title="该功能已下线" sub-title="AI 创作已改为按实际消耗的 token 直接从用户积分中扣减，不再存在「次数」概念（次数显示、兑换、记录均已下线）。">
        <template #extra>
          <div class="hint-list">
            <p>· 1 积分可抵扣多少 token 请在「福利与积分」页的「AI创作积分消耗」中配置。</p>
            <p>· 用户剩余积分可在「福利与积分 → 积分账户」中查看。</p>
            <p>· 积分消耗记录在「福利与积分 → 积分流水」（来源为 AI）中查看。</p>
          </div>
        </template>
      </el-result>
    </el-card>
  </div>
</template>

<script setup>
</script>

<style scoped>
.ai-operations-container { padding: 8px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #303133; }
.hint-list p { margin: 6px 0; color: #606266; font-size: 14px; }
</style>
