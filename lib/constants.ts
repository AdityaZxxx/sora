export const MAX_DATE_RANGE = 90;

export const TRANSACTION_HISTORY_INITIAL_PAGE_SIZE = 10;
export const TRANSACTION_HISTORY_PAGE_SIZE = 20;

export const TRANSACTION_HISTORY_MAX_PAGE_SIZE = 50;

export const QUERY_STALE_TIME = 30_000;
// Zero keeps the hooks that still read this constant from polling (sora#125).
export const POLL_INTERVAL = 0;
export const QUERY_GC_TIME = 5 * 60_000;
export const SSE_HEARTBEAT_INTERVAL = 20_000;

export const ACTIVE_WALLET_COOKIE = "sora_active_wallet";

export const OWNER_ROLE = "owner";
export const CO_OWNER_ROLE = "co_owner";
export const MEMBER_ROLE = "member";
export const VIEWER_ROLE = "viewer";

export const DEFAULT_WALLET_NAME = "My wallet";
export const DEFAULT_CURRENCY = "USD";

export const READ_ONLY_SCOPE = "read-only";
export const READ_WRITE_SCOPE = "read-write";

export const UNUSUAL_SPENDING_TYPE = "unusual_spending";
