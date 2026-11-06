<template>
  <PageContainer class="promotion-page">
    <PageHeader
      title="作品推广"
      description="轮播图、搜索页推荐、首页热门精选统一管理；作者付费申请，审核通过后付费占坑"
    >
      <template #actions>
        <BlackButton v-hasPermi="['content:promotion:grant']" @click="openGrant()">＋ 免费上推荐</BlackButton>
      </template>
    </PageHeader>

    <div class="promo-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        v-hasPermi="tab.permissions"
        type="button"
        class="promo-tab"
        :class="{ active: activeTab === tab.name }"
        @click="switchTab(tab.name)"
      >
        {{ tab.label }}
        <span v-if="tab.name === 'audit' && totalPending" class="promo-tab__badge">{{ totalPending }}</span>
      </button>
    </div>

    <!-- ==================== 坑位总览 ==================== -->
    <template v-if="activeTab === 'slots'">
      <div class="resource-row">
        <div
          v-for="card in resourceCards"
          :key="card.type"
          class="res-card"
          :class="{ active: activeSlotType === card.type }"
          @click="switchSlotType(card.type)"
        >
          <div class="res-ico">{{ card.icon }}</div>
          <div class="res-main">
            <div class="res-name">
              {{ card.name }}
              <span class="res-tag">{{ card.tag }}</span>
            </div>
            <div class="res-meta">
              <span class="res-num">{{ card.overview.activeCount }}<small> / {{ card.overview.totalSlots }} 占用</small></span>
              <div class="res-bar"><i :style="{ width: occupancyPercent(card.overview) + '%' }"></i></div>
              <span class="res-rev">本月 <b>¥{{ formatMoney(card.overview.monthRevenue) }}</b></span>
            </div>
          </div>
        </div>
      </div>

      <el-card v-loading="slotLoading[activeSlotType]" shadow="never" class="promo-table-card">
        <div class="promo-toolbar">
          <div class="chips">
            <span
              v-for="chip in slotChips"
              :key="chip.value"
              class="chip"
              :class="{ on: slotChip === chip.value }"
              @click="slotChip = chip.value"
            >
              {{ chip.label }}<b v-if="chip.count">{{ chip.count }}</b>
            </span>
          </div>
          <div class="toolbar-right">
            <el-input
              v-model="slotKeyword"
              size="small"
              clearable
              :placeholder="activeSlotType === 'banner' ? '搜索 Banner / 作品' : '搜索作品 / 作者'"
              style="width: 200px"
            />
          </div>
        </div>

        <el-table :data="displaySlots" row-key="slotId" class="promo-table" style="width: 100%">
          <!-- 轮播图视图 -->
          <el-table-column v-if="activeSlotType === 'banner'" label="位次" width="84">
            <template #default="{ row }">
              <span class="rank-badge" :class="rankClass(row.slotNo)">{{ row.slotNo }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeSlotType === 'banner'" label="Banner 素材" min-width="280">
            <template #default="{ row }">
              <div class="material-cell">
                <template v-if="row.current && row.current.materialUrl">
                  <el-image
                    :src="resolveMediaUrl(row.current.materialUrl)"
                    :preview-src-list="[resolveMediaUrl(row.current.materialUrl)]"
                    preview-teleported
                    fit="cover"
                    class="mini-banner"
                  />
                  <div class="material-main">
                    <div class="work-title">{{ row.current.workTitle || row.banner?.title || '—' }}</div>
                    <div class="sub">作者提交素材 · 第 {{ row.slotNo }} 位</div>
                  </div>
                </template>
                <template v-else-if="row.banner">
                  <el-image
                    v-if="row.banner.imageUrl"
                    :src="resolveMediaUrl(row.banner.imageUrl)"
                    :preview-src-list="[resolveMediaUrl(row.banner.imageUrl)]"
                    preview-teleported
                    fit="cover"
                    class="mini-banner"
                  />
                  <div v-else class="mini-banner mini-banner--missing">无图</div>
                  <div class="material-main">
                    <div class="work-title">{{ row.banner.title || '未命名 Banner' }}</div>
                    <div class="sub">{{ bannerLinkText(row.banner) }}</div>
                  </div>
                </template>
                <template v-else>
                  <div class="mini-banner mini-banner--missing">
                    {{ needsMaterial(row) ? '待上传' : '空闲' }}
                  </div>
                  <div class="material-main">
                    <div v-if="needsMaterial(row)" class="work-title">待上传素材</div>
                    <div v-else-if="row.current" class="work-title">{{ row.current.workTitle || '—' }}</div>
                    <div v-else class="work-title muted">空闲位次</div>
                    <div class="sub">
                      {{ needsMaterial(row) ? '缺少 16:9 Banner 素材' : row.current ? '未绑定 Banner 素材' : '可接受申请' }}
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="activeSlotType === 'banner'" label="来源" width="110">
            <template #default="{ row }">
              <div>{{ bannerSource(row).text }}</div>
              <div class="sub">{{ bannerSource(row).sub }}</div>
            </template>
          </el-table-column>

          <!-- 搜索页 / 首页热门视图 -->
          <el-table-column v-if="activeSlotType !== 'banner'" label="位次" width="104">
            <template #default="{ row }">
              <span class="rank-badge" :class="rankClass(row.slotNo)">{{ row.slotNo }}</span>
              <span v-if="activeSlotType === 'hot' && row.slotNo <= 6" class="layer-tag">首页</span>
            </template>
          </el-table-column>
          <el-table-column v-if="activeSlotType !== 'banner'" label="当前作品" min-width="260">
            <template #default="{ row }">
              <div class="work-cell">
                <el-image
                  v-if="row.current && row.current.workCover"
                  :src="resolveMediaUrl(row.current.workCover)"
                  fit="cover"
                  class="work-thumb"
                />
                <div v-else class="work-thumb work-thumb--text">{{ coverLetter(row) }}</div>
                <div class="work-main">
                  <div v-if="row.current" class="work-title">{{ row.current.workTitle || '—' }}</div>
                  <div v-else class="work-title muted">空闲坑位 · 可接受申请</div>
                  <div class="sub">{{ currentSub(row) }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="activeSlotType !== 'banner'" label="作者" width="110">
            <template #default="{ row }">{{ row.current?.authorName || '—' }}</template>
          </el-table-column>

          <el-table-column label="单价" width="104">
            <template #default="{ row }">
              <span class="price-cell">¥{{ formatMoney(row.pricePerDay) }}</span><small class="price-unit">/天</small>
            </template>
          </el-table-column>

          <el-table-column label="投放周期" min-width="230">
            <template #default="{ row }">
              <div v-if="periodInfo(row)" class="period">
                <div class="period-bar"><i :style="{ width: periodInfo(row).pct + '%' }"></i></div>
                <div class="period-text">
                  <span>{{ periodInfo(row).text }}</span>
                  <b :class="{ warn: periodInfo(row).warn }">{{ periodInfo(row).remainText }}</b>
                </div>
              </div>
              <div v-else class="period">
                <div class="period-bar free"><i style="width: 100%"></i></div>
                <div class="period-text"><span>最早可投 {{ todayText() }}</span><b>可申请</b></div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="132">
            <template #default="{ row }">
              <div class="state-cell">
                <el-tag size="small" :type="slotStateMeta(row.state).type">{{ slotStateMeta(row.state).text }}</el-tag>
                <span v-if="row.state === 'locked' && row.current" class="sub">{{ lockLabel(row.current) }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="op-cell">
                <el-button
                  v-if="row.current"
                  v-hasPermi="['content:promotion:query']"
                  link
                  type="primary"
                  size="small"
                  @click="openAppDetail(row.current)"
                >详情</el-button>
                <el-button
                  v-if="canOffline(row.current)"
                  v-hasPermi="['content:promotion:audit']"
                  link
                  type="danger"
                  size="small"
                  @click="handleOffline(row.current)"
                >下架</el-button>
                <el-button
                  v-if="!row.current && row.state === 'idle'"
                  v-hasPermi="['content:promotion:grant']"
                  link
                  type="primary"
                  size="small"
                  @click="openGrant(row)"
                >免费上架</el-button>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <el-empty description="暂无坑位数据" :image-size="72" />
          </template>
        </el-table>

        <div v-if="upcomingList.length" class="upcoming">
          <div class="up-title">接下来 7 天</div>
          <div
            v-for="(item, idx) in upcomingList.slice(0, 3)"
            :key="idx"
            class="up-item"
          >
            <span class="up-date">{{ formatShortDate(item.startTime) }}</span>
            <span class="t">{{ item.workTitle || '未命名作品' }} · {{ slotTypeName(item.slotType) }} 第{{ item.slotNo }}位</span>
            <el-tag size="small" :type="labelTagType(item.statusLabel)">{{ item.statusLabel }}</el-tag>
          </div>
        </div>

        <div v-if="hiddenHotCount" class="hot-more">
          <span>更多页 7–{{ filteredSlots.length }} 位：当前仅展示前 6 位</span>
          <span class="link-text" @click="hotExpanded = true">展开查看剩余 {{ hiddenHotCount }} 个位次 ›</span>
        </div>
        <div v-else-if="activeSlotType === 'hot' && hotExpanded" class="hot-more">
          <span>已展开全部 {{ filteredSlots.length }} 个位次</span>
          <span class="link-text" @click="hotExpanded = false">收起</span>
        </div>

        <div class="promo-table-foot">
          <span>
            共 {{ slotSummary.total }} 个位次 · {{ slotSummary.activeLabel }} {{ slotSummary.active }} · 锁定 {{ slotSummary.locked }} · 空闲 {{ slotSummary.idle }} · 本月收入 ¥{{ slotSummary.revenue }}
          </span>
        </div>
      </el-card>

      <div class="promo-notice">
        <span class="mark">i</span>付费申请优先占位；无人购买的位次由算法按热度补位（不收费，付费生效时自动顶替），搜索页不补位、顺延自然结果。轮播位由作者提交素材，审核通过并支付后自动展示。
      </div>
    </template>

    <!-- ==================== 申请审核 ==================== -->
    <template v-else-if="activeTab === 'audit'">
      <TableCard
        v-model:page="appQuery.pageNum"
        v-model:pageSize="appQuery.pageSize"
        :data="appList"
        :loading="appLoading"
        :total="appTotal"
        row-key="applyId"
        empty-text="暂无推广申请"
        @page-change="loadApplications"
        @size-change="loadApplications"
      >
        <template #toolbar>
          <div class="audit-toolbar">
            <div class="chips">
              <span
                v-for="chip in appChips"
                :key="chip.value"
                class="chip"
                :class="{ on: appQuery.viewStatus === chip.value }"
                @click="selectAppChip(chip.value)"
              >
                {{ chip.label }}
              </span>
            </div>
            <div class="toolbar-right">
              <el-input
                v-model="appQuery.keyword"
                size="small"
                clearable
                placeholder="搜索作品 / 作者 / 申请单号"
                style="width: 220px"
                @keyup.enter="handleAppQuery"
              />
              <el-select
                v-model="appQuery.slotType"
                size="small"
                clearable
                placeholder="全部资源位"
                style="width: 150px"
                @change="handleAppQuery"
              >
                <el-option v-for="t in SLOT_TYPES" :key="t.type" :label="t.name" :value="t.type" />
              </el-select>
              <el-button size="small" type="primary" @click="handleAppQuery">查询</el-button>
            </div>
          </div>
        </template>

        <el-table-column label="申请单号" width="150">
          <template #default="{ row }">
            <div>{{ row.applyNo }}</div>
            <div class="sub">{{ row.createTime || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="作品" min-width="200">
          <template #default="{ row }">
            <div class="work-cell">
              <el-image
                v-if="row.workCover"
                :src="resolveMediaUrl(row.workCover)"
                fit="cover"
                class="work-thumb"
              />
              <div v-else class="work-thumb work-thumb--text">{{ (row.workTitle || '—').charAt(0) }}</div>
              <div class="work-main">
                <div class="work-title">{{ row.workTitle || '—' }}</div>
                <div class="sub">{{ row.source === 'admin_grant' ? '运营直上' : '作者申请' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="authorName" label="作者" width="110" show-overflow-tooltip />
        <el-table-column label="资源位 / 位次" width="130">
          <template #default="{ row }">
            <div>{{ slotTypeName(row.slotType) }}</div>
            <div class="sub">第 {{ row.slotNo }} 位</div>
          </template>
        </el-table-column>
        <el-table-column label="轮播素材" width="120">
          <template #default="{ row }">
            <template v-if="row.slotType === 'banner'">
              <el-image
                v-if="row.materialUrl"
                :src="resolveMediaUrl(row.materialUrl)"
                :preview-src-list="[resolveMediaUrl(row.materialUrl)]"
                preview-teleported
                fit="cover"
                class="mini-banner"
              />
              <span v-else class="sub">未提交</span>
            </template>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="投放时段" min-width="180">
          <template #default="{ row }">
            <div>{{ formatSlotRange(row.startTime, row.endTime) }}</div>
            <div class="sub">{{ row.days }} 天</div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">
            <span class="price-cell">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="labelTagType(row.statusLabel)">{{ row.statusLabel || '—' }}</el-tag>
            <div v-if="row.statusLabel === '待支付'" class="sub">{{ lockLabel(row) }}</div>
            <div v-else-if="row.rejectReason" class="sub">{{ row.rejectReason }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="op-cell">
              <template v-if="row.status === 'pending'">
                <el-button
                  v-hasPermi="['content:promotion:audit']"
                  size="small"
                  type="primary"
                  @click="handleApprove(row)"
                >通过</el-button>
                <el-button
                  v-hasPermi="['content:promotion:audit']"
                  link
                  type="danger"
                  size="small"
                  @click="handleReject(row)"
                >驳回</el-button>
              </template>
              <el-button
                v-hasPermi="['content:promotion:query']"
                link
                type="primary"
                size="small"
                @click="openAppDetail(row)"
              >详情</el-button>
              <el-button
                v-if="canOffline(row)"
                v-hasPermi="['content:promotion:audit']"
                link
                type="danger"
                size="small"
                @click="handleOffline(row)"
              >下架</el-button>
            </div>
          </template>
        </el-table-column>
      </TableCard>

      <div class="promo-notice">
        <span class="mark">i</span>审核通过后系统锁定坑位 48 小时，作者完成支付才真正生效；超时未支付自动释放，不产生退款流程。
      </div>
    </template>

    <!-- ==================== 价格配置 ==================== -->
    <template v-else-if="activeTab === 'price'">
      <TableCard :data="priceRows" :show-pagination="false" empty-text="暂无可配置位次" row-key="slotId">
        <template #toolbar>
          <div class="price-toolbar">
            <span class="chip on">按位次定价</span>
            <div class="toolbar-right">
              <el-button
                v-hasPermi="['content:promotion:price']"
                size="small"
                @click="openBatchDialog"
              >批量设置价格档</el-button>
              <el-button
                v-hasPermi="['content:promotion:price']"
                size="small"
                type="primary"
                :loading="priceSaving"
                @click="handleSavePrices"
              >保存修改</el-button>
            </div>
          </div>
        </template>

        <el-table-column label="资源位" width="140">
          <template #default="{ row }">{{ slotTypeName(row.slotType) }}</template>
        </el-table-column>
        <el-table-column prop="slotNo" label="位次" width="80" />
        <el-table-column label="单价（元 / 天）" width="200">
          <template #default="{ row }">
            <el-input-number
              v-model="row.pricePerDay"
              :min="0"
              :precision="2"
              :step="10"
              size="small"
              controls-position="right"
              :disabled="!canPrice"
              style="width: 150px"
            />
          </template>
        </el-table-column>
        <el-table-column label="可投周期" width="130">
          <template #default>7 / 15 / 30 天</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              active-value="1"
              inactive-value="0"
              :disabled="!canPrice"
            />
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="220">
          <template #default="{ row }">{{ row.remark || '—' }}</template>
        </el-table-column>
      </TableCard>

      <div class="promo-table-foot promo-table-foot--standalone">
        价格改动只影响之后新提交的申请，已支付订单金额不变
      </div>
      <div class="promo-notice">
        <span class="mark">i</span>停用某个位次后不再接受新申请，但已投放中的订单会继续执行到结束时间。
      </div>
    </template>

    <!-- ==================== 免费直上弹窗 ==================== -->
    <el-dialog v-model="grantDialog.visible" title="免费上推荐" width="520px">
      <el-form :model="grantForm" label-width="90px">
        <el-form-item label="作品" required>
          <el-select v-model="grantForm.workId" filterable placeholder="选择已上架作品" style="width: 100%">
            <el-option v-for="w in grantWorks" :key="w.workId" :label="w.title" :value="w.workId" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源位" required>
          <el-select v-model="grantForm.slotType" style="width: 100%" @change="handleGrantSlotTypeChange">
            <el-option v-for="t in SLOT_TYPES" :key="t.type" :label="t.name" :value="t.type" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="grantForm.slotType === 'banner'" label="轮播素材">
          <el-upload
            class="banner-uploader"
            :show-file-list="false"
            :before-upload="beforeBannerImageUpload"
            :http-request="handleGrantMaterialUpload"
            accept="image/*"
          >
            <div v-if="grantForm.materialUrl" class="banner-uploader__preview">
              <img :src="resolveMediaUrl(grantForm.materialUrl)" alt="轮播素材" />
              <span class="banner-uploader__mask">点击更换</span>
            </div>
            <div v-else class="banner-uploader__placeholder" v-loading="grantUploading">
              <span>点击上传轮播素材</span>
            </div>
          </el-upload>
          <div class="banner-uploader__tip">支持 jpg/png，不超过 2MB，建议 16:9；留空则默认使用作品封面</div>
        </el-form-item>
        <el-form-item label="位次" required>
          <el-select v-model="grantForm.slotNo" placeholder="请选择位次" style="width: 100%">
            <el-option
              v-for="s in grantSlotOptions"
              :key="s.slotId"
              :label="`第 ${s.slotNo} 位 · ¥${formatMoney(s.pricePerDay)}/天`"
              :value="s.slotNo"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="grantForm.startTime"
            type="datetime"
            placeholder="默认立即开始"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="投放天数">
          <el-input-number v-model="grantForm.days" :min="1" :max="365" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="grantDialog.submitting" @click="submitGrant">确定</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 批量设置价格 ==================== -->
    <el-dialog v-model="batchDialog.visible" title="批量设置价格档" width="420px">
      <el-form :model="batchDialog" label-width="90px">
        <el-form-item label="资源位">
          <el-select v-model="batchDialog.slotType" style="width: 100%">
            <el-option v-for="t in SLOT_TYPES" :key="t.type" :label="t.name" :value="t.type" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价">
          <el-input-number v-model="batchDialog.price" :min="0" :precision="2" :step="10" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="启停">
          <el-switch v-model="batchDialog.enabled" active-value="1" inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <div class="sort-tip">应用后需点击「保存修改」才会写入后端。</div>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="applyBatch">应用</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 申请详情 ==================== -->
    <el-dialog v-model="detailDialog.visible" title="推广申请详情" width="660px">
      <el-descriptions v-loading="detailDialog.loading" :column="2" border>
        <el-descriptions-item label="申请单号">{{ appDetail.applyNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="labelTagType(appDetail.statusLabel)">{{ appDetail.statusLabel || '—' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="作品">{{ appDetail.workTitle || '—' }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ appDetail.authorName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="资源位">{{ slotTypeName(appDetail.slotType) }}</el-descriptions-item>
        <el-descriptions-item label="位次">{{ appDetail.slotNo ?? '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="appDetail.slotType === 'banner'" label="轮播素材" :span="2">
          <el-image
            v-if="appDetail.materialUrl"
            :src="resolveMediaUrl(appDetail.materialUrl)"
            :preview-src-list="[resolveMediaUrl(appDetail.materialUrl)]"
            preview-teleported
            fit="cover"
            class="banner-detail-preview"
          />
          <span v-else class="sub">未提交</span>
        </el-descriptions-item>
        <el-descriptions-item label="投放时段" :span="2">{{ formatSlotRange(appDetail.startTime, appDetail.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="投放天数">{{ appDetail.days ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ formatMoney(appDetail.amount) }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ appDetail.source === 'admin_grant' ? '运营直上' : '作者付费' }}</el-descriptions-item>
        <el-descriptions-item label="支付状态">{{ appDetail.payStatus === 'paid' ? '已支付' : '未支付' }}</el-descriptions-item>
        <el-descriptions-item label="锁坑截止">{{ appDetail.lockExpireAt || '—' }}</el-descriptions-item>
        <el-descriptions-item label="审核人">{{ appDetail.auditBy || '—' }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ appDetail.auditTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ appDetail.createTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="驳回原因" :span="2">{{ appDetail.rejectReason || '—' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import PageHeader from '@/components/PageHeader.vue'
import BlackButton from '@/components/BlackButton.vue'
import TableCard from '@/components/TableCard.vue'
import {
  listWork,
  uploadFile
} from '@/api/content'
import {
  getPromotionSlots,
  listPromotionApplications,
  getPromotionApplication,
  auditPromotionApplication,
  offlinePromotionApplication,
  grantPromotion,
  updatePromotionPrices
} from '@/api/content/promotion'
import { resolveMediaUrl } from '@/utils/request'
import { useUserStore } from '@/stores/user'

defineOptions({ name: 'ContentPromotion' })

const userStore = useUserStore()
const canPrice = computed(() => userStore.hasPermission('content:promotion:price'))

const SLOT_TYPES = [
  { type: 'banner', name: '轮播图', tag: '首页顶部', icon: '▤' },
  { type: 'search', name: '搜索页推荐', tag: '搜索结果页', icon: '⌕' },
  { type: 'hot', name: '首页热门精选', tag: '1–6 位首页可见', icon: '★' }
]

// ============ Tab 切换 ============
const tabs = [
  { name: 'slots', label: '坑位总览', permissions: ['content:promotion:list'] },
  { name: 'audit', label: '申请审核', permissions: ['content:promotion:list'] },
  { name: 'price', label: '价格配置', permissions: ['content:promotion:price'] }
]
const activeTab = ref('slots')
let appLoaded = false

function switchTab(name) {
  activeTab.value = name
  if (name === 'audit' && !appLoaded) {
    appLoaded = true
    loadApplications()
  }
  if (name === 'price' && !priceRows.value.length) {
    initPriceRows()
  }
}

// ============ 坑位总览 ============
const slotPages = reactive({ banner: null, search: null, hot: null })
const slotLoading = reactive({ banner: false, search: false, hot: false })
const activeSlotType = ref('banner')
const slotChip = ref('all')
const slotKeyword = ref('')
const hotExpanded = ref(false)

async function loadSlot(type) {
  slotLoading[type] = true
  try {
    const res = await getPromotionSlots(type)
    slotPages[type] = res?.overview ? res : (res?.data || null)
  } catch {
    slotPages[type] = null
  } finally {
    slotLoading[type] = false
  }
}

function loadAllSlots() {
  return Promise.all(SLOT_TYPES.map((t) => loadSlot(t.type)))
}

const totalPending = computed(() =>
  SLOT_TYPES.reduce((sum, t) => sum + Number(slotPages[t.type]?.overview?.pendingCount || 0), 0)
)

const resourceCards = computed(() =>
  SLOT_TYPES.map((t) => ({
    ...t,
    overview: slotPages[t.type]?.overview || {
      activeCount: 0,
      totalSlots: 0,
      monthRevenue: 0,
      pendingCount: 0,
      idleCount: 0,
      lockedCount: 0
    }
  }))
)

function occupancyPercent(overview) {
  const total = Number(overview?.totalSlots || 0)
  if (!total) return 0
  return Math.min(100, Math.round((Number(overview?.activeCount || 0) / total) * 100))
}

function switchSlotType(type) {
  activeSlotType.value = type
  slotChip.value = 'all'
  slotKeyword.value = ''
  hotExpanded.value = false
}

const slotChips = computed(() => {
  const rows = slotPages[activeSlotType.value]?.slots || []
  const defs = activeSlotType.value === 'banner'
    ? [['all', '全部'], ['active', '展示中'], ['missing_material', '待上传素材'], ['locked', '锁定'], ['reserved', '已预约'], ['idle', '空闲'], ['disabled', '已停用']]
    : [['all', '全部'], ['active', '投放中'], ['locked', '锁定'], ['reserved', '已预约'], ['idle', '空闲'], ['disabled', '已停用']]
  return defs.map(([value, label]) => ({
    value,
    label,
    count: value === 'all' ? rows.length : rows.filter((row) => row.state === value).length
  }))
})

const filteredSlots = computed(() => {
  let rows = slotPages[activeSlotType.value]?.slots || []
  if (slotChip.value !== 'all') {
    rows = rows.filter((row) => row.state === slotChip.value)
  }
  const keyword = slotKeyword.value.trim().toLowerCase()
  if (keyword) {
    rows = rows.filter((row) => {
      const text = [
        row.banner?.title,
        row.current?.workTitle,
        row.current?.authorName
      ].filter(Boolean).join(' ').toLowerCase()
      return text.includes(keyword)
    })
  }
  return rows
})

const displaySlots = computed(() => {
  const rows = filteredSlots.value
  if (
    activeSlotType.value === 'hot' &&
    !hotExpanded.value &&
    slotChip.value === 'all' &&
    !slotKeyword.value.trim()
  ) {
    return rows.slice(0, 6)
  }
  return rows
})

const hiddenHotCount = computed(() => {
  if (
    activeSlotType.value !== 'hot' ||
    hotExpanded.value ||
    slotChip.value !== 'all' ||
    slotKeyword.value.trim()
  ) {
    return 0
  }
  return Math.max(0, filteredSlots.value.length - 6)
})

const upcomingList = computed(() => slotPages[activeSlotType.value]?.upcoming || [])

const slotSummary = computed(() => {
  const overview = slotPages[activeSlotType.value]?.overview || {}
  return {
    total: overview.totalSlots || 0,
    active: overview.activeCount || 0,
    activeLabel: activeSlotType.value === 'banner' ? '展示中' : '投放中',
    locked: overview.lockedCount || 0,
    idle: overview.idleCount || 0,
    revenue: formatMoney(overview.monthRevenue)
  }
})

// ============ 通用格式化 ============
const SLOT_STATE_MAP = {
  idle: { text: '空闲', type: 'info' },
  locked: { text: '锁定', type: 'warning' },
  active: { text: '展示中', type: 'success' },
  reserved: { text: '已预约', type: 'primary' },
  missing_material: { text: '待上传素材', type: 'warning' },
  disabled: { text: '已停用', type: 'info' }
}

function slotStateMeta(state) {
  if (state === 'active' && activeSlotType.value !== 'banner') {
    return { text: '投放中', type: 'success' }
  }
  return SLOT_STATE_MAP[state] || { text: state || '—', type: 'info' }
}

const LABEL_TAG_MAP = {
  待审核: 'primary',
  待支付: 'warning',
  待生效: 'primary',
  投放中: 'success',
  已结束: 'info',
  已驳回: 'danger',
  已取消: 'info',
  已失效: 'info'
}

function labelTagType(label) {
  return LABEL_TAG_MAP[label] || 'info'
}

function slotTypeName(type) {
  return SLOT_TYPES.find((t) => t.type === type)?.name || type || '—'
}

function formatMoney(value) {
  const num = Number(value || 0)
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatShortDate(value) {
  return value ? String(value).slice(5, 10) : '—'
}

function formatSlotRange(start, end) {
  if (!start && !end) return '—'
  return `${String(start || '').slice(0, 10)} 至 ${String(end || '').slice(0, 10)}`
}

function todayText() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function toDate(value) {
  if (!value) return null
  const date = new Date(String(value).replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

function lockLabel(app) {
  const seconds = Number(app?.lockRemainSeconds || 0)
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `待支付 · 锁坑 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function periodInfo(row) {
  const app = row.current
  const banner = row.banner
  const start = app?.startTime || banner?.startTime
  const end = app?.endTime || banner?.endTime
  if (!start || !end) {
    if (banner && !app) {
      return { text: '长期展示', pct: 100, remainText: '运营自建素材', warn: false }
    }
    return null
  }
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (!startDate || !endDate) return null
  const now = Date.now()
  const total = endDate.getTime() - startDate.getTime()
  const elapsed = now - startDate.getTime()
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : (now > endDate.getTime() ? 100 : 0)
  const remainDays = Math.ceil((endDate.getTime() - now) / 86400000)
  let remainText = ''
  let warn = false
  if (app?.statusLabel === '待支付') {
    remainText = lockLabel(app)
    warn = true
  } else if (now < startDate.getTime()) {
    remainText = `待生效 · ${Math.max(1, Math.ceil((startDate.getTime() - now) / 86400000))} 天后`
  } else if (now > endDate.getTime()) {
    remainText = '已结束'
    warn = true
  } else {
    remainText = `剩 ${remainDays} 天`
    warn = remainDays <= 3
  }
  return {
    text: formatSlotRange(start, end),
    pct,
    remainText,
    warn
  }
}

function rankClass(slotNo) {
  if (Number(slotNo) === 1) return 'rank-badge--top1'
  if (Number(slotNo) <= 3) return 'rank-badge--top23'
  return ''
}

function coverLetter(row) {
  const title = row.current?.workTitle || ''
  return title ? title.charAt(0) : '—'
}

function currentSub(row) {
  if (!row.current) return activeSlotType.value === 'hot' ? '首页热门精选 · 可申请' : '搜索页 · 可申请'
  if (row.state === 'locked') return '待支付 · 已锁坑'
  if (row.state === 'reserved') return '待生效'
  return activeSlotType.value === 'hot'
    ? (Number(row.slotNo) <= 6 ? '首页热门精选' : '更多页展示')
    : '搜索页 · 结果展示'
}

function needsMaterial(row) {
  return !row.banner && !!row.current && !row.current.materialUrl
}

function bannerSource(row) {
  if (row.current) {
    return row.current.source === 'admin_grant'
      ? { text: '运营直上', sub: '官方运营' }
      : { text: '作者推广', sub: row.current.authorName || '—' }
  }
  if (row.banner) {
    return { text: '运营自建', sub: '官方运营' }
  }
  return { text: '—', sub: '' }
}

function bannerLinkText(banner) {
  if (!banner) return ''
  if (banner.linkType === 'work') return '链接：作品详情'
  if (banner.linkType === 'url' || banner.linkUrl) return '链接：外部地址'
  return '未配置跳转'
}

function canOffline(app) {
  if (!app) return false
  if (!['pending', 'approved', 'paid'].includes(app.status)) return false
  return !['已结束', '已失效', '已取消', '已驳回'].includes(app.statusLabel)
}

// ============ 申请审核 ============
const appLoading = ref(false)
const appList = ref([])
const appTotal = ref(0)
const appQuery = reactive({ pageNum: 1, pageSize: 10, slotType: '', viewStatus: '', keyword: '' })
const appChips = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'locked', label: '待支付' },
  { value: 'waiting', label: '待生效' },
  { value: 'active', label: '投放中' },
  { value: 'ended', label: '已结束' },
  { value: 'rejected', label: '已驳回' },
  { value: 'cancelled', label: '已取消' }
]

function buildAppQuery() {
  const query = { pageNum: appQuery.pageNum, pageSize: appQuery.pageSize }
  if (appQuery.slotType) query.slotType = appQuery.slotType
  if (appQuery.viewStatus) query.viewStatus = appQuery.viewStatus
  if (appQuery.keyword.trim()) query.keyword = appQuery.keyword.trim()
  return query
}

async function loadApplications() {
  appLoading.value = true
  try {
    const res = await listPromotionApplications(buildAppQuery())
    appList.value = res?.rows || []
    appTotal.value = Number(res?.total || 0)
  } catch {
    appList.value = []
    appTotal.value = 0
  } finally {
    appLoading.value = false
  }
}

function handleAppQuery() {
  appQuery.pageNum = 1
  loadApplications()
}

function selectAppChip(value) {
  appQuery.viewStatus = value
  handleAppQuery()
}

async function refreshAfterAppMutation() {
  await loadAllSlots()
  if (appLoaded) await loadApplications()
}

async function handleApprove(row) {
  try {
    await ElMessageBox.confirm(
      `确认通过申请「${row.applyNo}」？通过后将锁定坑位 48 小时。`,
      '审核确认',
      { confirmButtonText: '通过', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await auditPromotionApplication(row.applyId, { approved: true })
    ElMessage.success('审核通过')
    await refreshAfterAppMutation()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  }
}

async function handleReject(row) {
  let reason = ''
  try {
    const result = await ElMessageBox.prompt('请输入驳回原因', '驳回申请', {
      confirmButtonText: '确定驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '如：封面不符合规范',
      inputValidator: (value) => (value && value.trim() ? true : '请填写驳回原因')
    })
    reason = result.value.trim()
  } catch {
    return
  }
  try {
    await auditPromotionApplication(row.applyId, { approved: false, rejectReason: reason })
    ElMessage.success('已驳回')
    await refreshAfterAppMutation()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  }
}

async function handleOffline(app) {
  try {
    await ElMessageBox.confirm(
      `确认下架「${app.workTitle || app.applyNo}」的推广投放？`,
      '下架确认',
      { confirmButtonText: '下架', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await offlinePromotionApplication(app.applyId)
    ElMessage.success('已下架')
    await refreshAfterAppMutation()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  }
}

const detailDialog = reactive({ visible: false, loading: false })
const appDetail = reactive({})

function resetAppDetail() {
  Object.keys(appDetail).forEach((key) => delete appDetail[key])
}

async function openAppDetail(app) {
  if (!app?.applyId) return
  detailDialog.visible = true
  detailDialog.loading = true
  resetAppDetail()
  try {
    const res = await getPromotionApplication(app.applyId)
    Object.assign(appDetail, res?.applyId ? res : (res?.data || {}))
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    detailDialog.loading = false
  }
}

// ============ 价格配置 ============
const priceRows = ref([])
const priceSaving = ref(false)

function initPriceRows() {
  priceRows.value = SLOT_TYPES.flatMap((t) =>
    (slotPages[t.type]?.slots || []).map((slot) => ({
      slotId: slot.slotId,
      slotType: t.type,
      slotNo: slot.slotNo,
      pricePerDay: slot.pricePerDay == null ? 0 : Number(slot.pricePerDay),
      enabled: slot.enabled === '0' ? '0' : '1',
      remark: slot.remark || ''
    }))
  )
}

async function handleSavePrices() {
  if (!priceRows.value.length) return
  const invalid = priceRows.value.find(
    (row) => row.pricePerDay === null || row.pricePerDay === undefined || Number(row.pricePerDay) < 0
  )
  if (invalid) {
    ElMessage.error('单价不能为空且不能为负数')
    return
  }
  priceSaving.value = true
  try {
    await updatePromotionPrices({
      slots: priceRows.value.map((row) => ({
        slotId: row.slotId,
        pricePerDay: Number(row.pricePerDay),
        enabled: row.enabled
      }))
    })
    ElMessage.success('价格配置已保存')
    await loadAllSlots()
    initPriceRows()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    priceSaving.value = false
  }
}

const batchDialog = reactive({ visible: false, slotType: 'banner', price: null, enabled: '1' })

function openBatchDialog() {
  batchDialog.slotType = activeSlotType.value
  batchDialog.price = null
  batchDialog.enabled = '1'
  batchDialog.visible = true
}

function applyBatch() {
  if (batchDialog.price === null || batchDialog.price === undefined || Number(batchDialog.price) < 0) {
    ElMessage.warning('请填写有效的单价')
    return
  }
  priceRows.value.forEach((row) => {
    if (row.slotType === batchDialog.slotType) {
      row.pricePerDay = Number(batchDialog.price)
      row.enabled = batchDialog.enabled
    }
  })
  batchDialog.visible = false
  ElMessage.success('已应用到当前列表，请点击「保存修改」')
}

// ============ 作品下拉 ============
const grantWorks = ref([])

async function ensureGrantWorks() {
  if (grantWorks.value.length) return
  try {
    const res = await listWork({ pageNum: 1, pageSize: 999, status: 'on_shelf' })
    grantWorks.value = res?.rows || []
  } catch {
    grantWorks.value = []
  }
}

// ============ 免费直上 ============
const grantDialog = reactive({ visible: false, submitting: false })
const grantForm = reactive({ workId: null, slotType: 'banner', slotNo: null, startTime: '', days: 7, materialUrl: '' })
const grantUploading = ref(false)
const grantSlotOptions = computed(() =>
  (slotPages[grantForm.slotType]?.slots || []).filter((slot) => slot.enabled !== '0')
)

async function openGrant(row) {
  await ensureGrantWorks()
  grantForm.workId = null
  grantForm.slotType = row?.slotType || activeSlotType.value
  grantForm.slotNo = row?.slotNo || null
  grantForm.startTime = ''
  grantForm.days = 7
  grantForm.materialUrl = ''
  grantDialog.visible = true
  if (!grantForm.slotNo) {
    grantForm.slotNo = grantSlotOptions.value[0]?.slotNo || null
  }
}

function handleGrantSlotTypeChange() {
  grantForm.slotNo = grantSlotOptions.value[0]?.slotNo || null
}

async function submitGrant() {
  if (!grantForm.workId) {
    ElMessage.warning('请选择作品')
    return
  }
  if (!grantForm.slotType || grantForm.slotNo === null) {
    ElMessage.warning('请选择资源位与位次')
    return
  }
  grantDialog.submitting = true
  try {
    await grantPromotion({
      workId: grantForm.workId,
      slotType: grantForm.slotType,
      slotNo: grantForm.slotNo,
      startTime: grantForm.startTime || null,
      days: grantForm.days,
      materialUrl: grantForm.slotType === 'banner' ? grantForm.materialUrl : ''
    })
    ElMessage.success('免费上推荐成功')
    grantDialog.visible = false
    await refreshAfterAppMutation()
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    grantDialog.submitting = false
  }
}

// ============ Banner 素材上传（免费上架） ============
function beforeBannerImageUpload(file) {
  if (!/^image\//.test(file.type)) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleGrantMaterialUpload(options) {
  grantUploading.value = true
  try {
    const res = await uploadFile(options.file)
    const url = res?.url || res?.data?.url
    if (!url) {
      ElMessage.error('上传失败，未返回图片地址')
      return
    }
    grantForm.materialUrl = url
    ElMessage.success('上传成功')
  } catch {
    // 错误信息已由 request 拦截器统一提示
  } finally {
    grantUploading.value = false
  }
}

onMounted(async () => {
  await loadAllSlots()
  initPriceRows()
})
</script>

<style scoped>
/* 页签 */
.promo-tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  margin-bottom: 14px;
  background: #fff;
  border: 1px solid #e9ecf2;
  border-radius: 10px;
}
.promo-tab {
  height: 34px;
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #4e5969;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.promo-tab.active {
  background: #254e90;
  color: #fff;
  font-weight: 600;
}
.promo-tab__badge {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 9px;
  background: #ff6b35;
  color: #fff;
  font-size: 10px;
  line-height: 14px;
}
.promo-tab.active .promo-tab__badge {
  background: rgba(255, 255, 255, 0.22);
}

.promotion-page {
  min-width: 0;
  /* 本页内容一律在卡片内部滚动，禁止子元素把主区域撑出横向滚动条 */
  overflow-x: clip;
}

/* 资源位切换卡 */
.resource-row {
  display: grid;
  /* minmax(0,1fr) 允许列宽收缩，避免窄屏时卡片最小内容宽度撑出页面横向滚动条 */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.res-card {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 84px;
  padding: 13px 15px;
  min-width: 0;
  background: #fff;
  border: 1px solid #e9ecf2;
  border-radius: 11px;
  cursor: pointer;
  /* 仅过渡颜色/阴影，避免 all 把尺寸属性也纳入动画导致悬浮抖动 */
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}
.res-card:hover {
  border-color: #c9d6ea;
}
/* 窄屏下资源卡改为纵向堆叠，避免最小内容宽度超出视口 */
@media (max-width: 1330px) {
  .resource-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
.res-card.active {
  border-color: #254e90;
  background: linear-gradient(135deg, #f7fafe, #edf3fb);
  box-shadow: 0 4px 14px rgba(37, 78, 144, 0.08);
}
.res-ico {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #f5f7fa;
  color: #254e90;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}
.res-card.active .res-ico {
  background: #254e90;
  color: #fff;
}
.res-main {
  flex: 1;
  min-width: 0;
}
.res-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1f2329;
}
.res-tag {
  padding: 1px 5px;
  border-radius: 4px;
  background: #fff1ec;
  color: #d4511f;
  font-size: 9px;
  font-weight: 400;
}
.res-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 5px;
  flex-wrap: wrap;
}
.res-num {
  font-size: 15px;
  font-weight: 700;
  color: #254e90;
  white-space: nowrap;
}
.res-num small {
  color: #8a919c;
  font-size: 11px;
  font-weight: 400;
}
.res-bar {
  flex: 1 1 60px;
  width: auto;
  min-width: 40px;
  height: 5px;
  border-radius: 3px;
  background: #e6eaf0;
  overflow: hidden;
}
.res-bar i {
  display: block;
  height: 100%;
  background: #254e90;
}
.res-rev {
  font-size: 11px;
  color: #8a919c;
  margin-left: auto;
  white-space: nowrap;
}
.res-rev b {
  color: #d4511f;
  font-size: 12px;
}

/* 卡内表格 */
.promo-table-card {
  border-radius: 11px !important;
  /* 只过渡阴影/边框，避免全局 el-card 的 transition:all 在悬浮时触发多余重排 */
  transition: box-shadow 0.3s ease, border-color 0.3s ease !important;
}
.promo-table-card :deep(.el-card__body) {
  padding: 0 !important;
  overflow: hidden;
}
.promo-table {
  width: 100%;
  max-width: 100%;
}
.promo-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #f2f4f8;
  flex-wrap: wrap;
}
.chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 11px;
  border-radius: 14px;
  background: #f5f7fa;
  color: #4e5969;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
}
.chip.on {
  background: #edf3fb;
  color: #254e90;
  font-weight: 600;
}
.chip b {
  font-weight: 600;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}
.promo-table {
  width: 100%;
}
.promo-table :deep(.el-table__cell) {
  padding: 8px 0 !important;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: #eef1f6;
  color: #4e5969;
  font-size: 11px;
  font-weight: 700;
}
.rank-badge--top1 {
  background: #ff6b35;
  color: #fff;
}
.rank-badge--top23 {
  background: #e8eef8;
  color: #254e90;
}
.layer-tag {
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #fff1ec;
  color: #d4511f;
  font-size: 9px;
}

.material-cell,
.work-cell {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.material-main,
.work-main {
  min-width: 0;
}
.mini-banner {
  flex: 0 0 62px;
  width: 62px;
  height: 36px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 8px;
  letter-spacing: 0.5px;
  background: linear-gradient(120deg, #1d3e73, #4e7bc0);
  overflow: hidden;
}
.mini-banner--missing {
  background: #f7f8fa;
  border: 1px dashed #c9cdd4;
  color: #8a919c;
  font-size: 9px;
  letter-spacing: 0;
}
.work-thumb {
  flex: 0 0 26px;
  width: 26px;
  height: 34px;
  border-radius: 5px;
}
.work-thumb--text {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #254e90, #5b8ad1);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.work-title {
  font-size: 12px;
  font-weight: 600;
  color: #1f2329;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.work-title.muted {
  color: #8a919c;
  font-weight: 400;
}
.sub {
  margin-top: 2px;
  color: #8a919c;
  font-size: 10px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-text {
  color: #254e90;
  cursor: pointer;
}

.price-cell {
  color: #d4511f;
  font-size: 12px;
  font-weight: 700;
}
.price-unit {
  color: #8a919c;
  font-size: 10px;
}

.period {
  min-width: 0;
}
.period-bar {
  height: 6px;
  border-radius: 4px;
  background: #eff2f6;
  position: relative;
  overflow: hidden;
}
.period-bar i {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #7fa6dd, #254e90);
}
.period-bar.free i {
  background: repeating-linear-gradient(45deg, #e3e8f0, #e3e8f0 4px, #f5f7fa 4px, #f5f7fa 8px);
}
.period-text {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  color: #8a919c;
  font-size: 10px;
}
.period-text b {
  color: #4e5969;
  font-weight: 500;
  white-space: nowrap;
}
.period-text b.warn {
  color: #d4511f;
}

.state-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.upcoming {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid #f2f4f8;
  background: #fcfdfe;
  flex-wrap: wrap;
}
.up-title {
  align-self: center;
  white-space: nowrap;
  color: #8a919c;
  font-size: 11px;
  padding-right: 4px;
}
.up-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid #e9ecf2;
  border-radius: 8px;
  background: #fff;
  color: #4e5969;
  font-size: 11px;
  overflow: hidden;
}
.up-date {
  padding: 1px 5px;
  border-radius: 4px;
  background: #edf3fb;
  color: #254e90;
  font-size: 10px;
  white-space: nowrap;
}
.up-item .t {
  flex: 1;
  min-width: 0;
  color: #1f2329;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hot-more {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-top: 1px solid #f3f5f8;
  color: #8a919c;
  font-size: 11px;
}
.hot-more .link-text {
  margin-left: auto;
}

.promo-table-foot {
  display: flex;
  align-items: center;
  padding: 11px 16px;
  border-top: 1px solid #f2f4f8;
  background: #fcfdfe;
  color: #8a919c;
  font-size: 11px;
}
.promo-table-foot--standalone {
  margin: -8px 0 14px;
  border: 1px solid #e9ecf2;
  border-radius: 8px;
  background: #fcfdfe;
}

.promo-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 9px 12px;
  border: 1px solid #e3ecf8;
  border-radius: 9px;
  background: #f7fafe;
  color: #254e90;
  font-size: 11px;
  line-height: 1.5;
}
.promo-notice .mark {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #254e90;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audit-toolbar,
.price-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.price-toolbar .toolbar-right {
  margin-left: auto;
}

/* Banner 上传 */
.banner-uploader__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 78px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.banner-uploader__placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
.banner-uploader__preview {
  position: relative;
  width: 140px;
  height: 78px;
  border-radius: 4px;
  overflow: hidden;
}
.banner-uploader__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.banner-uploader__mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
}
.banner-uploader__preview:hover .banner-uploader__mask {
  opacity: 1;
}
.banner-uploader__tip {
  width: 100%;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.sort-tip {
  margin-top: 10px;
  color: #8a919c;
  font-size: 11px;
  line-height: 1.5;
}

/* 操作列：防止按钮互相挤压，并恢复链接按钮的文本样式 */
.op-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}
.op-cell :deep(.el-button + .el-button) {
  margin-left: 0 !important;
}
.op-cell :deep(.el-button.is-link) {
  height: auto !important;
  padding: 0 !important;
  background: transparent !important;
  border-color: transparent !important;
  font-size: 12px !important;
}
.op-cell :deep(.el-button.is-link.el-button--primary) {
  color: var(--el-color-primary) !important;
}
.op-cell :deep(.el-button.is-link.el-button--danger) {
  color: #f56c6c !important;
}
.op-cell :deep(.el-button.is-link.el-button--primary:hover),
.op-cell :deep(.el-button.is-link.el-button--danger:hover) {
  opacity: 0.75;
}
.banner-detail-preview {
  width: 240px;
  height: 135px;
  border-radius: 4px;
}
</style>
