export const COOKIE_NAME = "app_session_id";
// Session duration policy: expire browser and JWT sessions after 7 days.
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
