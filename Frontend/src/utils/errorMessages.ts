/**
 * Translates raw backend error codes/details into clean, user-facing copy.
 *
 * The backend's error envelope is `{ message: <internal code>, data: <detail text> }`
 * (see Backend/utils/response.go). Internal codes (e.g. "withdrawal_failed") and some
 * detail strings (Go error chains, gin validation dumps, SQL constraint errors) are not
 * fit to show a user directly, so every error is routed through `friendlyMessage` below.
 */

interface CodeOverride {
  /** Static text shown regardless of the detail — use when the detail is never worth surfacing. */
  message?: string;
  /** Lower-cased substring of the detail -> friendly replacement, checked in insertion order. */
  detail?: Record<string, string>;
}

const CODE_OVERRIDES: Record<string, CodeOverride> = {
  login_fail: {
    detail: {
      'invalid user or password': 'Incorrect username or password.',
    },
  },
  registration_fail: {
    detail: {
      'matching entry already exists': 'That username or email is already taken.',
      'username must be between': 'Usernames must be between 3 and 32 characters.',
      'invalid username': 'Usernames must be between 3 and 32 characters.',
      'invalid email': 'Please enter a valid email address.',
    },
  },
  update_user_failed: {
    detail: {
      'matching entry already exists': 'That username or email is already taken.',
      'username must be between': 'Usernames must be between 3 and 32 characters.',
      'invalid username': 'Usernames must be between 3 and 32 characters.',
      'invalid email': 'Please enter a valid email address.',
      'invalid notification type': 'One of the selected notification settings is invalid.',
    },
  },
  invalid_input: {
    detail: {
      'invalid notification type': 'One of the selected notification settings is invalid.',
    },
  },
  invalid_request: {
    message: 'Please check your details and try again.',
  },
  withdrawal_failed: {
    detail: {
      'insufficient balance': "You don't have enough balance to withdraw that amount.",
      'amount must be greater than zero': 'Enter an amount greater than zero.',
      'amount must be less than': 'That amount is larger than the maximum allowed per transaction.',
    },
  },
  deposit_failed: {
    detail: {
      'amount must be greater than zero': 'Enter an amount greater than zero.',
      'amount must be less than': 'That amount is larger than the maximum allowed per transaction.',
    },
  },
  add_friend_failed: {
    detail: {
      'self love only works irl': "You can't add yourself as a friend.",
      'friend already added': "You're already friends with this user.",
    },
    message: 'Could not send that friend request. Please try again.',
  },
  remove_friend_failed: {
    detail: {
      'no friend to remove': 'This user is not on your friends list.',
    },
    message: 'Could not update your friends list. Please try again.',
  },
  get_friend_id_failed: {
    message: 'Could not find that user.',
  },
  user_not_found: {
    message: "We couldn't find that account.",
  },
  account_not_found: {
    message: "We couldn't find your account details.",
  },
  game_not_found: {
    message: "We couldn't find that game.",
  },
  game_creation_failed: {
    message: 'Unable to start the game right now. Please try again.',
  },
  action_failed: {
    message: 'That move could not be completed. Please try again.',
  },
  search_failed: {
    message: 'Search is unavailable right now. Please try again.',
  },
  invalid_form_file: {
    message: 'Please choose a valid image file.',
  },
  save_uploaded_file_failed: {
    message: 'Your file could not be uploaded. Please try again.',
  },
  create_url_failed: {
    message: 'Your file could not be uploaded. Please try again.',
  },
  unauthorized: {
    message: 'Your session has expired. Please sign in again.',
  },
  network_error: {
    message: 'Unable to reach the server. Check your connection and try again.',
  },
};

/** Detail text that is really an internal/Go error and should never reach the user as-is. */
const TECHNICAL_DETAIL_PATTERNS: RegExp[] = [
  /field validation/i,
  /\bkey:\s*'/i,
  /constraint/i,
  /\bsql\b/i,
  /gorm/i,
  /\bstrconv\b/i,
  /failed to \w+/i,
  /panic/i,
  /\bnil\b/i,
  /stack trace/i,
  /\bpq:/i,
  /^\s*$/,
];

function looksTechnical(detail: string): boolean {
  if (TECHNICAL_DETAIL_PATTERNS.some((pattern) => pattern.test(detail))) return true;
  // Go's `fmt.Errorf("...: %w", err)` chains stack multiple ": " separators.
  return (detail.match(/: /g) ?? []).length >= 2;
}

function humanize(detail: string): string {
  const trimmed = detail.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

const STATUS_FALLBACKS: Record<number, string> = {
  400: "We couldn't process that request. Please check your details and try again.",
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'That action could not be completed — please refresh and try again.',
  413: 'That file is too large.',
  422: 'Please check your details and try again.',
  429: 'Too many requests — please slow down and try again.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
const DEFAULT_SERVER_MESSAGE = 'Something went wrong on our end. Please try again shortly.';
const NETWORK_MESSAGE = CODE_OVERRIDES.network_error.message!;

export function friendlyMessage(status: number, code: string, detail: string): string {
  const override = CODE_OVERRIDES[code];
  if (override?.detail) {
    const lowerDetail = detail.toLowerCase();
    const matchKey = Object.keys(override.detail).find((key) => lowerDetail.includes(key));
    if (matchKey) return override.detail[matchKey];
  }
  if (override?.message) return override.message;

  if (detail && !looksTechnical(detail)) return humanize(detail);

  if (status === 0) return NETWORK_MESSAGE;
  if (status >= 500) return DEFAULT_SERVER_MESSAGE;
  return STATUS_FALLBACKS[status] ?? DEFAULT_MESSAGE;
}
