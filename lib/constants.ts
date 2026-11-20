export const MAX_DATE_RANGE = 90;

export const TRANSACTION_HISTORY_PAGE_SIZE = 20;

export const TRANSACTION_HISTORY_MAX_PAGE_SIZE = 50;

export const QUERY_STALE_TIME = 30_000;
// Zero keeps the hooks that still read this constant from polling (sora#125).
export const POLL_INTERVAL = 0;
export const QUERY_GC_TIME = 5 * 60_000;
export const SSE_HEARTBEAT_INTERVAL = 20_000;

export const ACTIVE_HOUSEHOLD_COOKIE = "sora_active_household";

export const FULL_MEMBER_ROLE = "member";
export const VIEW_ONLY_ROLE = "view_only";

export const DEFAULT_HOUSEHOLD_NAME = "My household";
export const DEFAULT_CURRENCY = "USD";

export const READ_ONLY_SCOPE = "read-only";
export const READ_WRITE_SCOPE = "read-write";

export const UNUSUAL_SPENDING_TYPE = "unusual_spending";
