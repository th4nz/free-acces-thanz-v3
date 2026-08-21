import { getAdminSession, adminLogout } from './auth.js';

export function isAdminLoggedIn() {
  return !!getAdminSession();
}

export function ensureAdmin() {
  if (!isAdminLoggedIn()) {
    window.location.href = '/admin-login.html';
    return false;
  }
  return true;
}

export { adminLogout };
