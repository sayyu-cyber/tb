const KEY = "thaasbai-room-return";
export function rememberRoomReturn(path: string) {
  if (/^\/play\/(mindi|gin-rummy)\/room\/?\?/.test(path)) sessionStorage.setItem(KEY, path);
}
export function takeRoomReturn(): string | null {
  const path = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return path && /^\/play\/(mindi|gin-rummy)\/room\/?\?/.test(path) ? path : null;
}
export function hasRoomReturn(): boolean {
  return /^\/play\/(mindi|gin-rummy)\/room\/?\?/.test(sessionStorage.getItem(KEY) || "");
}
