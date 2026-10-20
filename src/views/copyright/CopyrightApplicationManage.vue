<template>
  <PageContainer>
    <PageHeader title="版权申请管理" description="管理作品的版权登记申请，跟踪审核状态及证书发放情况" />

    <FilterBar @query="handleQuery" @reset="handleReset">
      <el-form-item>
        <el-select v-model="query.status" placeholder="申请状态" clearable style="width: 160px">
          <el-option label="待审核" value="pending" />
          <el-option label="待提交" value="approved" />
          <el-option label="待提交到第三方" value="submitted" />
          <el-option label="审核中" value="reviewing" />
          <el-option label="已驳回" value="rejected" />
          <el-option label="已发证" value="certificated" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="query.copyrightCenter" placeholder="版权中心" clearable style="width: 160px">
          <el-option label="国家版权中心" value="national" />
          <el-option label="地方版权中心" value="local" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="query.applyNo"
          clearable
          placeholder="申请编号"
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
    </FilterBar>

    <TableCard
      v-model:page="query.pageNo"
      v-model:pageSize="query.pageSize"
      :data="applications"
      :loading="loading"
      :total="total"
      :empty-text="emptyText"
      @page-change="loadApplications"
      @size-change="loadApplications"
      @selection-change="handleSelectionChange"
    >
      <template #actions>
        <el-button 
          v-permission="'smartscript:copyright:application:submit'"
          type="primary"
          :disabled="selectedRows.length === 0"
          @click="handleBatchSubmit"
        >
          批量提交
        </el-button>
      </template>
      <el-table-column type="selection" width="55" />
      <el-table-column prop="applyNo" label="申请编号" width="180" show-overflow-tooltip />
      <el-table-column prop="workName" label="作品名称" width="200" show-overflow-tooltip />
      <el-table-column prop="centerName" label="版权中心" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tooltip v-if="row.centerName" :content="`中心代码: ${row.copyrightCenter || '未知'}`" placement="top">
            <span>{{ row.centerName }}</span>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column prop="externalApplyNo" label="外部申请号" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tooltip v-if="row.externalApplyNo" :content="`在${centerLabel(row.copyrightCenter)}的申请编号`" placement="top">
            <span>{{ row.externalApplyNo }}</span>
          </el-tooltip>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="申请状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="light" size="small">
            {{ row.statusText || statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitTime" label="提交时间" width="170" />
      <el-table-column prop="certNo" label="证书编号" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.certNo || '—' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button size="small" type="primary" @click="handleDetail(row)">详情</el-button>
            
            <!-- pending状态：显示审核按钮 -->
            <template v-if="row.status === 'pending'">
              <el-button
                v-permission="'smartscript:copyright:application:approve'"
                size="small"
                type="success"
                @click="handleReview(row)"
              >
                审核
              </el-button>
            </template>
            
            <!-- approved状态：显示提交按钮 -->
            <template v-if="row.status === 'approved'">
              <el-button
                v-permission="'smartscript:copyright:application:submit'"
                size="small"
                type="primary"
                @click="handleSubmitToCenter(row)"
              >
                提交
              </el-button>
            </template>
            
            <!-- submitted/reviewing状态：显示同步按钮 -->
            <template v-if="row.status === 'submitted' || row.status === 'reviewing'">
              <el-button
                v-permission="'smartscript:copyright:application:sync'"
                size="small"
                type="warning"
                :loading="syncingId === row.applyId"
                :disabled="syncingId !== null && syncingId !== row.applyId"
                @click="handleSync(row)"
              >
                状态查询
              </el-button>
            </template>
            
            <!-- rejected状态：显示重新提交按钮 -->
          </div>
        </template>
      </el-table-column>
    </TableCard>

    <!-- 详情抽屉 -->
    <el-drawer 
      v-model="detailVisible" 
      :title="`版权申请详情 - ${currentRecord?.applyNo || ''}`"
      size="65%"
      destroy-on-close
    >
      <div v-loading="detailLoading" style="min-height: 400px; padding: 0 20px 20px">
        <div v-if="currentRecord && currentRecord.applyId" class="detail-content">
          
          <!-- 申请基本信息 -->
          <el-card shadow="never" class="detail-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Document /></el-icon>
                  申请信息
                </span>
              </div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="申请编号">{{ currentRecord.applyNo }}</el-descriptions-item>
              <el-descriptions-item label="申请状态">
                <el-tag :type="statusType(currentRecord.status)">
                  {{ statusLabel(currentRecord.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="版权中心" :span="2">
                {{ currentRecord.centerName || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="外部申请号" :span="2">
                {{ currentRecord.externalApplyNo || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="申请时间">
                {{ currentRecord.createTime || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="提交时间">
                {{ currentRecord.submitTime || '—' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentRecord.certNo" label="证书编号" :span="2">
                {{ currentRecord.certNo }}
              </el-descriptions-item>
              <el-descriptions-item v-if="currentRecord.certUrl" label="证书文件" :span="2">
                <el-link type="primary" :href="currentRecord.certUrl" target="_blank">
                  <el-icon><Document /></el-icon> 查看证书
                </el-link>
              </el-descriptions-item>
              <el-descriptions-item v-if="currentRecord.rejectReason" label="驳回原因" :span="2">
                <div class="reject-reason">{{ currentRecord.rejectReason }}</div>
              </el-descriptions-item>
              <el-descriptions-item v-if="currentRecord.remark" label="备注" :span="2">
                {{ currentRecord.remark }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 申请人信息 -->
          <el-card shadow="never" class="detail-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><User /></el-icon>
                  申请人信息
                </span>
              </div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="用户ID">{{ currentRecord.userId || '—' }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ currentRecord.userName || '—' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ currentRecord.userPhone || '—' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ currentRecord.userEmail || '—' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 作品信息 -->
          <el-card shadow="never" class="detail-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><Reading /></el-icon>
                  作品详细信息
                </span>
              </div>
            </template>
            <div class="work-display">
              <div v-if="currentRecord.workCoverUrl" class="work-cover">
                <el-image
                  :src="currentRecord.workCoverUrl"
                  :preview-src-list="[currentRecord.workCoverUrl]"
                  fit="cover"
                  class="work-cover-img"
                  :preview-teleported="true"
                >
                  <template #error>
                    <div class="img-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div v-else class="work-cover">
                <div class="img-placeholder">
                  <el-icon><Picture /></el-icon>
                  <div>暂无封面</div>
                </div>
              </div>
              <div class="work-info-section">
                <h3 class="work-title-text">{{ currentRecord.workName || '未命名作品' }}</h3>
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="作品ID">
                    {{ currentRecord.workId || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="作品类型">
                    <el-tag size="small" type="primary">{{ workTypeLabel(currentRecord.workType) }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="作品分类">
                    {{ currentRecord.workCategory || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="作品规模">
                    <span v-if="currentRecord.workWordCount">{{ currentRecord.workWordCount.toLocaleString() }} 字</span>
                    <span v-else-if="currentRecord.workDuration">{{ formatDuration(currentRecord.workDuration) }}</span>
                    <span v-else>—</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="创作完成日期">
                    {{ currentRecord.workCreationDate ? currentRecord.workCreationDate.split(' ')[0] : '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="首次发表日期">
                    {{ currentRecord.workPublishDate ? currentRecord.workPublishDate.split(' ')[0] : '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="作品简介" :span="2">
                    <div class="work-intro">{{ currentRecord.workSummary || '暂无简介' }}</div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
            
            <!-- 作品内容区域 -->
            <el-divider content-position="left">
              <span style="display: flex; align-items: center; gap: 4px;">
                <el-icon><FolderOpened /></el-icon>
                作品内容文件
              </span>
            </el-divider>
            <div v-if="currentRecord.workFileUrl" class="work-files-section">
              <div class="file-item-card" @click="previewFile(currentRecord.workFileUrl)">
                <div class="file-icon-large">
                  <el-icon :size="32" color="#409eff">
                    <component :is="getFileIcon(currentRecord.workFileUrl)" />
                  </el-icon>
                </div>
                <div class="file-info-detail">
                  <div class="file-name-large">{{ getFileName(currentRecord.workFileUrl) }}</div>
                  <div class="file-actions-row">
                    <el-button size="small" type="primary" plain>
                      <el-icon><View /></el-icon> 在线预览
                    </el-button>
                    <el-button size="small" @click.stop="downloadFile(currentRecord.workFileUrl)">
                      <el-icon><Download /></el-icon> 下载文件
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无作品文件" :image-size="60" />
          </el-card>

          <!-- 申请材料 -->
          <el-card shadow="never" class="detail-card materials-card">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><FolderOpened /></el-icon>
                  申请材料
                </span>
                <span class="material-tips">点击文件可在线预览</span>
              </div>
            </template>

            <div v-if="hasAnyMaterials(currentRecord)" class="materials-section">
              <!-- 原创性证明 -->
              <div v-if="parseUrls(currentRecord.originalityProofUrls).length > 0" class="material-section">
                <div class="material-title">原创性证明材料</div>
                <div class="material-files">
                  <div
                    v-for="(url, idx) in parseUrls(currentRecord.originalityProofUrls)"
                    :key="`originality-${idx}`"
                    class="file-item"
                    @click="previewFile(url)"
                  >
                    <el-icon class="file-icon" :size="24"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ getFileName(url) }}</span>
                      <div class="file-action">
                        <el-link type="primary" :underline="false">预览</el-link>
                        <el-divider direction="vertical" />
                        <el-link type="primary" :underline="false" @click.stop="downloadFile(url)">下载</el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 作者身份证明 -->
              <div v-if="parseUrls(currentRecord.authorIdentityDocUrls).length > 0" class="material-section">
                <div class="material-title">作者身份证明材料</div>
                <div class="material-files">
                  <div
                    v-for="(url, idx) in parseUrls(currentRecord.authorIdentityDocUrls)"
                    :key="`identity-${idx}`"
                    class="file-item"
                    @click="previewFile(url)"
                  >
                    <el-icon class="file-icon" :size="24"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ getFileName(url) }}</span>
                      <div class="file-action">
                        <el-link type="primary" :underline="false">预览</el-link>
                        <el-divider direction="vertical" />
                        <el-link type="primary" :underline="false" @click.stop="downloadFile(url)">下载</el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 创作过程材料 -->
              <div v-if="parseUrls(currentRecord.creationProcessUrls).length > 0" class="material-section">
                <div class="material-title">创作过程说明材料</div>
                <div class="material-files">
                  <div
                    v-for="(url, idx) in parseUrls(currentRecord.creationProcessUrls)"
                    :key="`process-${idx}`"
                    class="file-item"
                    @click="previewFile(url)"
                  >
                    <el-icon class="file-icon" :size="24"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ getFileName(url) }}</span>
                      <div class="file-action">
                        <el-link type="primary" :underline="false">预览</el-link>
                        <el-divider direction="vertical" />
                        <el-link type="primary" :underline="false" @click.stop="downloadFile(url)">下载</el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 其他证明材料 -->
              <div v-if="parseUrls(currentRecord.otherProofUrls).length > 0" class="material-section">
                <div class="material-title">其他辅助证明材料</div>
                <div class="material-files">
                  <div
                    v-for="(url, idx) in parseUrls(currentRecord.otherProofUrls)"
                    :key="`other-${idx}`"
                    class="file-item"
                    @click="previewFile(url)"
                  >
                    <el-icon class="file-icon" :size="24"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ getFileName(url) }}</span>
                      <div class="file-action">
                        <el-link type="primary" :underline="false">预览</el-link>
                        <el-divider direction="vertical" />
                        <el-link type="primary" :underline="false" @click.stop="downloadFile(url)">下载</el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 兼容旧版本的申请材料 -->
              <div v-if="currentRecord.attachmentUrl && !currentRecord.originalityProofUrls && !currentRecord.authorIdentityDocUrls && !currentRecord.creationProcessUrls && !currentRecord.otherProofUrls" class="material-section">
                <div class="material-title">申请材料（旧版本）</div>
                <div class="material-files">
                  <div
                    v-for="(url, idx) in parseUrls(currentRecord.attachmentUrl)"
                    :key="`attachment-${idx}`"
                    class="file-item"
                    @click="previewFile(url)"
                  >
                    <el-icon class="file-icon" :size="24"><Document /></el-icon>
                    <div class="file-info">
                      <span class="file-name">{{ getFileName(url) }}</span>
                      <div class="file-action">
                        <el-link type="primary" :underline="false">预览</el-link>
                        <el-divider direction="vertical" />
                        <el-link type="primary" :underline="false" @click.stop="downloadFile(url)">下载</el-link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无申请材料" :image-size="80" />
          </el-card>

        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button v-if="currentRecord?.status === 'pending'" type="primary" @click="handleReview(currentRecord)">
            审核申请
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="文件预览"
      width="80%"
      destroy-on-close
      top="5vh"
    >
      <div class="preview-container">
        <!-- 图片预览 -->
        <div v-if="isImageFile(previewUrl)" class="preview-image">
          <el-image :src="previewUrl" :preview-src-list="[previewUrl]" fit="contain" style="max-width: 100%; max-height: 600px;" />
        </div>
        <!-- PDF预览 -->
        <div v-else-if="isPdfFile(previewUrl)" class="preview-pdf">
          <iframe :src="previewUrl" width="100%" height="600px" frameborder="0"></iframe>
        </div>
        <!-- 其他文件类型提示下载 -->
        <div v-else class="preview-download">
          <el-result icon="warning" title="该文件类型暂不支持在线预览">
            <template #extra>
              <el-button type="primary" @click="downloadFile(previewUrl)">
                <el-icon><Download /></el-icon> 下载文件
              </el-button>
            </template>
          </el-result>
        </div>
      </div>
    </el-dialog>

    <!-- 审核对话框 -->
    <!-- 审核对话框 -->
    <el-dialog v-model="reviewDialogVisible" title="审核版权申请" width="500px">
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="审核操作" required>
          <el-radio-group v-model="reviewForm.action">
            <el-radio label="approve">通过</el-radio>
            <el-radio label="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="reviewForm.action === 'reject'" label="驳回原因" required>
          <el-input
            v-model="reviewForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入驳回原因"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewSubmitting" @click="confirmReview">确定</el-button>
      </template>
    </el-dialog>

    <!-- 状态查询结果对话框 -->
    <el-dialog v-model="syncStatusVisible" title="版权审核状态" width="600px">
      <div v-loading="syncStatusLoading">
        <el-descriptions v-if="syncStatusData" :column="1" border>
          <el-descriptions-item label="申请编号">{{ syncStatusData.applyNo }}</el-descriptions-item>
          <el-descriptions-item label="外部申请号">{{ syncStatusData.externalApplyNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="版权中心">{{ syncStatusData.centerName }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusType(syncStatusData.status)" size="small">
              {{ syncStatusData.statusDesc || statusLabel(syncStatusData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ syncStatusData.submitTime }}</el-descriptions-item>
          <el-descriptions-item label="最后同步时间">{{ syncStatusData.lastSyncTime }}</el-descriptions-item>
          <el-descriptions-item v-if="syncStatusData.progress" label="审核进度">
            {{ syncStatusData.progress }}
          </el-descriptions-item>
          <el-descriptions-item v-if="syncStatusData.estimatedTime" label="预计完成时间">
            {{ syncStatusData.estimatedTime }}
          </el-descriptions-item>
          <el-descriptions-item v-if="syncStatusData.remark" label="备注">
            {{ syncStatusData.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button type="primary" @click="syncStatusVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 提交到版权中心对话框 -->
    <el-dialog v-model="submitDialogVisible" title="选择版权中心" width="500px">
      <el-form :model="submitForm" label-width="100px">
        <el-form-item label="选择版权中心" required>
          <el-select
            v-model="submitForm.configId"
            placeholder="请选择版权中心"
            style="width: 100%"
            :loading="loadingCenters"
          >
            <el-option
              v-for="center in availableCenters"
              :key="center.configId"
              :label="center.centerName"
              :value="center.configId"
            >
              <div style="display: flex; justify-content: space-between">
                <span>{{ center.centerName }}</span>
                <el-tag size="small" type="success">可用</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          style="margin-top: 10px"
        >
          <template #default>
            <div style="font-size: 13px">
              选择版权中心后，申请将被分配到该版权中心的待处理列表，您可以在版权中心配置页进一步提交到第三方API。
            </div>
          </template>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="submitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSubmitToCenter">
          确定提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量提交到版权中心对话框 -->
    <el-dialog v-model="batchSubmitDialogVisible" title="批量提交到版权中心" width="500px">
      <el-form label-width="100px">
        <el-form-item label="选择版权中心" required>
          <el-select
            v-model="batchSubmitConfigId"
            placeholder="请选择版权中心"
            style="width: 100%"
            :loading="loadingCenters"
          >
            <el-option
              v-for="center in availableCenters"
              :key="center.configId"
              :label="center.centerName"
              :value="center.configId"
            >
              <div style="display: flex; justify-content: space-between">
                <span>{{ center.centerName }}</span>
                <el-tag size="small" type="success">可用</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-alert
          :title="`即将提交 ${selectedRows.filter(row => row.status === 'approved').length} 条申请`"
          type="info"
          :closable="false"
          style="margin-top: 10px"
        >
          <template #default>
            <div style="font-size: 13px">
              所有选中的已审核通过申请将被分配到该版权中心的待处理列表
            </div>
          </template>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="batchSubmitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitting" @click="confirmBatchSubmit">
          确定提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    
    <!-- 版权中心配置信息对话框 -->
    <el-dialog v-model="centerInfoVisible" title="已配置的版权中心" width="700px">
      <div v-loading="loadingCenters">
        <el-alert 
          type="info" 
          :closable="false" 
          style="margin-bottom: 16px;"
        >
          <template #title>
            当前系统中已配置的版权登记中心，申请提交时会自动选择可用的版权中心
          </template>
        </el-alert>
        
        <el-table :data="availableCenters" border>
          <el-table-column prop="centerCode" label="中心代码" width="120" />
          <el-table-column prop="centerName" label="中心名称" width="180" />
          <el-table-column prop="apiUrl" label="API地址" show-overflow-tooltip />
          <el-table-column prop="priority" label="优先级" width="80" align="center" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
                {{ row.status === 'enabled' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <el-empty v-if="!loadingCenters && availableCenters.length === 0" description="暂无可用的版权中心配置" />
      </div>
      <template #footer>
        <el-button type="primary" @click="centerInfoVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Document, 
  User, 
  Reading, 
  FolderOpened, 
  Download,
  Picture,
  View,
  ChatLineSquare,
  Clock,
  CircleCheck,
  CircleClose,
  Warning,
  QuestionFilled
} from '@element-plus/icons-vue'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import TableCard from '@/components/TableCard.vue'
import {
  getCopyrightApplicationList,
  getCopyrightApplicationDetail,
  syncCopyrightApplication,
  reviewCopyrightApplication,
  submitCopyrightApplicationToCenter,
  batchSubmitCopyrightApplicationToCenter,
  batchSyncCopyrightStatus,
  syncCopyrightApplicationStatus,
  getAvailableCopyrightCenters
} from '@/api/copyright'
import { resolveMediaUrl } from '@/utils/request'

const loading = ref(false)
const applications = ref([])
const total = ref(0)
const emptyText = ref('暂无数据')
const syncingId = ref(null)
const batchSyncing = ref(false)

// 文件预览
const previewVisible = ref(false)
const previewUrl = ref('')
const previewLoading = ref(false)
const selectedRows = ref([])
const syncStatusVisible = ref(false)
const syncStatusLoading = ref(false)
const syncStatusData = ref(null)

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  status: '',
  copyrightCenter: '',
  applyNo: ''
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const currentRecord = ref(null)

const reviewDialogVisible = ref(false)
const reviewSubmitting = ref(false)
const reviewForm = reactive({
  applyId: null,
  action: '', // 'approve' 或 'reject'
  reason: ''
})

const loadApplications = async () => {
  loading.value = true
  try {
    const res = await getCopyrightApplicationList(query)
    applications.value = res.rows || []
    total.value = res.total || 0
    emptyText.value = '暂无数据'
  } catch (error) {
    applications.value = []
    total.value = 0
    emptyText.value = '加载失败'
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.pageNo = 1
  loadApplications()
}

const handleReset = () => {
  query.status = ''
  query.copyrightCenter = ''
  query.applyNo = ''
  handleQuery()
}

const handleDetail = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await getCopyrightApplicationDetail(row.applyId)
    console.log('详情响应数据:', res)
    // 兼容不同的响应格式
    currentRecord.value = res.data || res || null
    if (!currentRecord.value) {
      ElMessage.warning('暂无详情数据')
    }
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleSync = async (row) => {
  syncingId.value = row.applyId
  syncStatusLoading.value = true
  try {
    await syncCopyrightApplicationStatus(row.applyId)
    
    // 重新加载列表以获取最新状态
    await loadApplications()
    
    // 从刷新后的列表中找到该申请，显示详细信息
    const updatedRow = applications.value.find(app => app.applyId === row.applyId)
    if (updatedRow) {
      // 准备状态详情数据
      syncStatusData.value = {
        applyNo: updatedRow.applyNo,
        externalApplyNo: updatedRow.externalApplyNo || '—',
        status: updatedRow.status,
        statusDesc: getStatusDescription(updatedRow.status),
        centerName: centerLabel(updatedRow.copyrightCenter),
        submitTime: updatedRow.submitTime || '—',
        lastSyncTime: new Date().toLocaleString(),
        progress: getProgressDescription(updatedRow.status, updatedRow.externalApplyNo)
      }
      syncStatusVisible.value = true
    }
    
    ElMessage.success('状态查询成功')
  } catch (error) {
    console.error('状态查询失败:', error)
    ElMessage.error(error.msg || '状态查询失败，请稍后重试')
  } finally {
    syncingId.value = null
    syncStatusLoading.value = false
  }
}

// 获取状态描述
const getStatusDescription = (status) => {
  const map = {
    pending: '待审核 - 等待管理员审核',
    approved: '待提交 - 等待提交到版权中心配置页',
    submitted: '待提交到第三方 - 已分配到版权中心配置页，需在配置页提交到第三方API',
    reviewing: '审核中 - 已提交到第三方版权中心，等待审核',
    certificated: '已发证 - 版权登记成功',
    rejected: '已驳回'
  }
  return map[status] || status
}

// 获取进度描述
const getProgressDescription = (status, externalApplyNo) => {
  if (status === 'pending') {
    return '申请已创建，等待管理员审核'
  }
  
  if (status === 'approved') {
    return '管理员已审核通过，请提交到版权中心配置页'
  }
  
  if (status === 'submitted' && !externalApplyNo) {
    return '已分配到版权中心配置页，需在配置页提交到第三方API后才能查询审核进度'
  }
  
  const map = {
    reviewing: '已提交到第三方版权中心，正在审核中，请耐心等待',
    certificated: '版权证书已发放，可在详情中查看证书信息',
    rejected: '申请被第三方驳回，请查看驳回原因'
  }
  return map[status] || '处理中'
}

// 表格选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 审核对话框
const rejectDialogVisible = ref(false)
const rejectSubmitting = ref(false)
const rejectForm = reactive({
  applyId: null,
  reason: ''
})

// 打开审核对话框
const handleReview = (row) => {
  reviewForm.applyId = row.applyId
  reviewForm.action = ''
  reviewForm.reason = ''
  reviewDialogVisible.value = true
}

// 确认审核
const confirmReview = async () => {
  if (!reviewForm.action) {
    ElMessage.warning('请选择审核操作')
    return
  }
  
  if (reviewForm.action === 'reject' && !reviewForm.reason.trim()) {
    ElMessage.warning('驳回操作必须填写驳回原因')
    return
  }
  
  reviewSubmitting.value = true
  try {
    await reviewCopyrightApplication(reviewForm.applyId, {
      action: reviewForm.action,
      rejectReason: reviewForm.reason
    })
    const actionText = reviewForm.action === 'approve' ? '审核通过' : '驳回'
    ElMessage.success(`${actionText}成功`)
    reviewDialogVisible.value = false
    loadApplications()
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    reviewSubmitting.value = false
  }
}

// 提交到版权中心
const submitDialogVisible = ref(false)
const submitForm = reactive({
  applyId: null,
  configId: null
})
const submitting = ref(false)

const handleSubmitToCenter = async (row) => {
  // 加载可用的版权中心列表
  loadingCenters.value = true
  try {
    const res = await getAvailableCopyrightCenters()
    // unwrapRuoYiResponse 已经解包，res 直接就是数组
    availableCenters.value = Array.isArray(res) ? res : []
    
    if (availableCenters.value.length === 0) {
      ElMessage.warning('暂无可用的版权中心，请先在版权中心配置页启用版权中心')
      return
    }
    
    // 打开选择对话框
    submitForm.applyId = row.applyId
    submitForm.configId = null
    submitDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取版权中心列表失败')
  } finally {
    loadingCenters.value = false
  }
}

// 确认提交到版权中心
const confirmSubmitToCenter = async () => {
  if (!submitForm.configId) {
    ElMessage.warning('请选择版权中心')
    return
  }
  
  submitting.value = true
  try {
    await submitCopyrightApplicationToCenter(submitForm.applyId, submitForm.configId)
    ElMessage.success('提交成功')
    submitDialogVisible.value = false
    loadApplications()
  } catch (error) {
    console.error('提交失败:', error)
    const errorMsg = error.response?.data?.msg || error.message || '提交失败'
    ElMessage.error(errorMsg)
  } finally {
    submitting.value = false
  }
}

// 批量提交
const batchSubmitDialogVisible = ref(false)
const batchSubmitConfigId = ref(null)
const batchSubmitting = ref(false)

const handleBatchSubmit = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要提交的申请')
    return
  }
  
  const approvedRows = selectedRows.value.filter(row => row.status === 'approved')
  if (approvedRows.length === 0) {
    ElMessage.warning('请选择状态为"已通过"的申请')
    return
  }
  
  // 加载可用的版权中心列表
  loadingCenters.value = true
  try {
    const res = await getAvailableCopyrightCenters()
    // unwrapRuoYiResponse 已经解包，res 直接就是数组
    availableCenters.value = Array.isArray(res) ? res : []
    
    if (availableCenters.value.length === 0) {
      ElMessage.warning('暂无可用的版权中心，请先在版权中心配置页启用版权中心')
      return
    }
    
    // 打开批量提交对话框
    batchSubmitConfigId.value = null
    batchSubmitDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取版权中心列表失败')
  } finally {
    loadingCenters.value = false
  }
}

// 确认批量提交
const confirmBatchSubmit = async () => {
  if (!batchSubmitConfigId.value) {
    ElMessage.warning('请选择版权中心')
    return
  }
  
  const approvedRows = selectedRows.value.filter(row => row.status === 'approved')
  
  batchSubmitting.value = true
  try {
    // 逐个提交到选中的版权中心
    for (const row of approvedRows) {
      await submitCopyrightApplicationToCenter(row.applyId, batchSubmitConfigId.value)
    }
    ElMessage.success(`成功提交 ${approvedRows.length} 条申请`)
    batchSubmitDialogVisible.value = false
    loadApplications()
  } catch (error) {
    console.error('批量提交失败:', error)
    const errorMsg = error.response?.data?.msg || error.message || '批量提交失败'
    ElMessage.error(errorMsg)
  } finally {
    batchSubmitting.value = false
  }
}

const centerLabel = (center) => {
  const map = {
    national: '国家版权中心',
    local: '地方版权中心'
  }
  return map[center] || center
}

const statusLabel = (status) => {
  const map = {
    pending: '待审核',
    approved: '待提交',
    submitted: '待提交到第三方',  // 已从申请页提交到配置页，等待配置页提交到第三方
    reviewing: '审核中',  // 已从配置页提交到第三方
    rejected: '已驳回',
    certificated: '已发证'
  }
  return map[status] || status
}

const statusType = (status) => {
  const map = {
    pending: 'info',
    approved: 'warning',
    submitted: 'warning',   // 待审核状态 - 黄色
    reviewing: 'primary',   // 审核中状态 - 蓝色
    rejected: 'danger',
    certificated: 'success'
  }
  return map[status] || 'info'
}

// 解析URL字符串（支持逗号分隔、JSON字符串数组、JSON对象数组格式）
const parseUrls = (urlString) => {
  if (!urlString) return []
  
  try {
    // 尝试解析JSON
    const parsed = JSON.parse(urlString)
    if (Array.isArray(parsed)) {
      // 如果是对象数组（新格式：[{url, filename, fileType}]），提取url字段
      return parsed.map(item => {
        if (typeof item === 'object' && item !== null && item.url) {
          return item.url
        }
        // 如果是字符串数组，直接返回
        return item
      }).filter(url => url && typeof url === 'string' && url.trim())
    }
  } catch (e) {
    // 不是JSON格式，尝试逗号分隔
  }
  
  // 逗号分隔的字符串
  return urlString.split(',').map(url => url.trim()).filter(url => url)
}

// 判断是否有任何申请材料
const hasAnyMaterials = (record) => {
  return record.workFileUrl || 
         record.attachmentUrl ||  // 兼容旧版本的申请材料
         record.originalityProofUrls || 
         record.authorIdentityDocUrls || 
         record.creationProcessUrls || 
         record.otherProofUrls
}

// 判断是否为图片文件
const isImageFile = (url) => {
  if (!url) return false
  const ext = url.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)
}

// 判断是否为PDF文件
const isPdfFile = (url) => {
  if (!url) return false
  return url.toLowerCase().endsWith('.pdf')
}

// 根据文件类型获取图标
const getFileIcon = (url) => {
  if (isImageFile(url)) return Picture
  if (isPdfFile(url)) return Document
  return Document
}

// 获取状态颜色
const getStatusColor = (status) => {
  const colorMap = {
    pending: '#E6A23C',
    approved: '#409EFF',
    submitted: '#409EFF',
    reviewing: '#909399',
    certificated: '#67C23A',
    rejected: '#F56C6C'
  }
  return colorMap[status] || '#909399'
}

// 获取状态图标组件
const getStatusIconComponent = (status) => {
  const iconMap = {
    pending: Clock,
    approved: CircleCheck,
    submitted: CircleCheck,
    reviewing: Clock,
    certificated: CircleCheck,
    rejected: CircleClose
  }
  return iconMap[status] || QuestionFilled
}

// 作品类型标签
const workTypeLabel = (type) => {
  const map = {
    novel: '小说',
    script: '剧本',
    video: '视频',
    audio: '音频'
  }
  return map[type] || type
}

// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 从URL获取文件名
const getFileName = (url) => {
  if (!url) return '未命名文件'
  try {
    const parts = url.split('/')
    return decodeURIComponent(parts[parts.length - 1])
  } catch (e) {
    return '文件'
  }
}

// 下载文件
const downloadFile = (url) => {
  if (!url) return
  const fullUrl = resolveMediaUrl(url)
  window.open(fullUrl, '_blank')
}

// 预览作品文件
const previewWorkFile = (url) => {
  previewFile(url)
}

// 预览文件
const previewFile = (url) => {
  if (!url) return
  previewUrl.value = resolveMediaUrl(url)
  previewVisible.value = true
}

const handleBatchSync = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要同步的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定同步选中的 ${selectedRows.value.length} 个申请的状态吗？`,
      '批量同步确认',
      { type: 'warning' }
    )
    
    const applyIds = selectedRows.value.map(row => row.applyId)
    await batchSyncCopyrightStatus(applyIds)
    ElMessage.success('批量同步成功')
    loadApplications()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量同步失败')
    }
  }
}

const centerInfoVisible = ref(false)
const availableCenters = ref([])
const loadingCenters = ref(false)

const showCenterInfo = async () => {
  centerInfoVisible.value = true
  loadingCenters.value = true
  
  try {
    const res = await getAvailableCopyrightCenters()
    // unwrapRuoYiResponse 已经解包，res 直接就是数组
    availableCenters.value = Array.isArray(res) ? res : []
  } catch (error) {
    ElMessage.error('获取版权中心信息失败')
  } finally {
    loadingCenters.value = false
  }
}

loadApplications()
</script>

<style scoped>
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 详情页面样式 */
.detail-content {
  padding: 20px 0;
}

.detail-card {
  margin-bottom: 20px;
}

.detail-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-title .el-icon {
  color: #409eff;
}

.material-tips {
  font-size: 13px;
  color: #909399;
  margin-left: auto;
}

/* 作品展示 */
.work-display {
  display: flex;
  gap: 24px;
}

.work-cover {
  flex-shrink: 0;
  width: 160px;
  height: 220px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.work-cover-img {
  width: 100%;
  height: 100%;
}

.img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  gap: 8px;
}

.img-placeholder .el-icon {
  font-size: 48px;
}

.work-info-section {
  flex: 1;
  min-width: 0;
}

.work-title-text {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.work-intro {
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 申请材料 */
.materials-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.material-section {
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.material-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.material-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #409eff;
}

.material-files {
  display: grid;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.3s;
}

.file-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
  transform: translateX(4px);
}

.file-icon {
  flex-shrink: 0;
  color: #409eff;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.file-name {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-action {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.file-action .el-link {
  font-size: 13px;
}

.file-action .el-divider {
  margin: 0;
  height: 14px;
}

/* 驳回原因 */
.reject-reason {
  color: #f56c6c;
  line-height: 1.6;
  padding: 8px;
  background: #fef0f0;
  border-radius: 4px;
}

/* 抽屉底部 */
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
}

/* 作品文件卡片 */
.work-files-section {
  margin-top: 16px;
}

.file-item-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fb;
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file-item-card:hover {
  background: #ecf5ff;
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.file-icon-large {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.file-info-detail {
  flex: 1;
  min-width: 0;
}

.file-name-large {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-actions-row {
  display: flex;
  gap: 8px;
}

/* 文件预览 */
.preview-container {
  min-height: 400px;
}

.preview-image,
.preview-pdf {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-download {
  padding: 60px 0;
}

.work-date-range {
  flex-wrap: wrap;
}

.work-size {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
}

.work-summary {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}

.work-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  color: #909399;
  font-size: 12px;
}

.detail-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

/* 申请人信息 */
.user-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  text-align: center;
}

.user-label {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}

.user-value {
  color: #303133;
  font-size: 15px;
  font-weight: 500;
}

/* 申请材料 */
.materials-card .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.material-section {
  margin-bottom: 24px;
}

.material-section:last-child {
  margin-bottom: 0;
}

.material-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 3px solid #409eff;
}

.material-files {
  display: grid;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.3s;
}

.file-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
  transform: translateX(4px);
}

.file-icon {
  flex-shrink: 0;
  color: #409eff;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-name {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.file-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-action .el-link {
  font-size: 13px;
}

.file-action .el-divider {
  margin: 0;
  height: 14px;
}

/* 备注信息 */
.remark-content {
  color: #606266;
  line-height: 1.6;
  padding: 12px;
  background: #fff9e6;
  border-left: 4px solid #e6a23c;
  border-radius: 4px;
}

/* 文件预览 */
.preview-image,
.preview-pdf {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-download {
  padding: 40px 0;
}
</style>
