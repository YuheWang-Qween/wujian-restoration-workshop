/**
 * 游客模式：无账号直接浏览。标记落 localStorage，路由守卫据此放行；
 * 学习进度只存本机（useProgressSync 以登录 user 为闸），真实登录后自动退出游客态。
 */
const GUEST_KEY = 'wj-guest';

export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function enterGuestMode() {
  try {
    window.localStorage.setItem(GUEST_KEY, '1');
  } catch {
    // 隐私模式等存储不可用时静默失败，游客浏览退化为本次会话内有效
  }
}

export function exitGuestMode() {
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    // 忽略
  }
}
