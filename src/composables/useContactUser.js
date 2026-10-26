import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminCreateSession } from '@/api/adminChat'

/**
 * A3「联系用户」公共 composable。
 * 版权审核、印章审核、版权资产、授权订单等管理页在操作列 / 详情弹窗
 * 发起与目标用户的沟通会话时复用此逻辑，避免各页重复编写。
 *
 * @param {Object} opts 配置项
 * @param {string} opts.businessType        业务类型枚举：WORK | COPYRIGHT | SEAL | ORDER
 * @param {Function} opts.extractUserId     (row) => number|null  目标用户 ID
 * @param {Function} opts.extractBusinessId (row) => number|null  业务主键
 * @param {Function} opts.extractBusinessName (row) => string|null 业务名称（展示用）
 * @param {string} [opts.emptyMessage]      用户 ID 为空时的提示文案
 * @param {Function} [opts.sendFirstMessage] (sessionId, row) => Promise 可选：
 *                                          创建会话成功后、跳转前向该会话发送一条消息
 *                                          （如把业务详情/驳回原因直接发给用户），失败不阻塞跳转
 */
export function useContactUser(opts) {
  const router = useRouter()
  const {
    businessType,
    extractUserId,
    extractBusinessId,
    extractBusinessName,
    emptyMessage = '暂未关联用户，无法发起沟通',
    sendFirstMessage
  } = opts

  async function handleContactUser(row) {
    const userId = extractUserId(row)
    if (!userId) {
      ElMessage.info(emptyMessage)
      return
    }
    try {
      const res = await adminCreateSession({
        targetUserId: userId,
        businessType,
        businessId: extractBusinessId(row) || null,
        businessName: extractBusinessName(row) || null
      })
      if (res?.sessionId) {
        // 可选：创建会话后先把业务详情/驳回原因发给用户，再跳转（发送失败不阻塞跳转）
        if (typeof sendFirstMessage === 'function') {
          try {
            await sendFirstMessage(res.sessionId, row)
          } catch (e) {
            console.error('发送首条业务消息失败:', e)
          }
        }
        router.push({ path: '/appuser/chat-detail', query: { sessionId: res.sessionId } })
      }
    } catch {
      ElMessage.error('创建沟通会话失败')
    }
  }

  return { handleContactUser }
}
