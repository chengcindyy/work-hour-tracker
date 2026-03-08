export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 使用 server 的 /api/oauth/login，由 server 負責組出正確的 OAuth 導向 URL
export const getLoginUrl = () => {
  return `${window.location.origin}/api/oauth/login`;
};