export function recentRoomCodes(uid: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("thaasbai.rooms." + uid) || "[]");
    return Array.isArray(value) ? value.filter((code): code is string => typeof code === "string" && /^[A-Z2-9]{6}$/.test(code)).slice(0, 8) : [];
  } catch { return []; }
}

/** Store only codes on this device, never passwords or player profiles. */
export function rememberRoom(uid: string, code: string) {
  try {
    localStorage.setItem("thaasbai.rooms." + uid, JSON.stringify([code, ...recentRoomCodes(uid).filter(item => item !== code)].slice(0, 8)));
  } catch { /* Room access still works when browser storage is unavailable. */ }
}
