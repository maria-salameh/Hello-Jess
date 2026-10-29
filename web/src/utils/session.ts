// Where the login token lives in the browser, depending on "Stay logged in":
// - checked: kept in localStorage (shared by all tabs) together with a cookie that has no expiry date, so it
//   disappears when the browser is closed. A token that is found without its cookie is from a closed browser and is thrown away.
// - unchecked: kept in sessionStorage, so it survives a refresh but only for this tab.
const TOKEN_KEY = "hellojess_token";
const SESSION_COOKIE = "hellojess_session";

const hasSessionCookie = () => document.cookie.split("; ").some((c) => c === `${SESSION_COOKIE}=1`);

export function saveToken(token: string, stay: boolean) {
  clearToken();
  if (stay) {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Strict`;
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

// The token of the current session, or null when there is none (never logged in, or the browser was closed).
export function getToken(): string | null {
  const tabToken = sessionStorage.getItem(TOKEN_KEY);
  if (tabToken) return tabToken;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored && !hasSessionCookie()) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return stored;
}

// Replaces the token (for example after a profile change) in the same place as the old one.
export function replaceToken(token: string) {
  saveToken(token, sessionStorage.getItem(TOKEN_KEY) === null);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}
