import adminRequest from '@/utils/request'
function reader(request, prefix) {
  return {
    list: params => request({ url: prefix, method: 'get', params }),
    detail: id => request({ url: `${prefix}/${id}`, method: 'get' }),
    read: id => request({ url: `${prefix}/${id}/read`, method: 'put' }),
    readAll: () => request({ url: `${prefix}/read-all`, method: 'put' }),
    unreadCount: (options = {}) => request({ url: `${prefix}/unread-count`, method: 'get', ...options })
  }
}
export const adminAnnouncements = reader(adminRequest, '/system/notice/received')
export function listNotices(params) { return adminRequest({ url: '/system/notice/list', method: 'get', params }) }
export function getNotice(id) { return adminRequest({ url: `/system/notice/${id}`, method: 'get' }) }
export function addNotice(data) { return adminRequest({ url: '/system/notice', method: 'post', data }) }
export function updateNotice(data) { return adminRequest({ url: '/system/notice', method: 'put', data }) }
export function removeNotice(id) { return adminRequest({ url: `/system/notice/${id}`, method: 'delete' }) }
