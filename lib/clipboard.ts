/** Clipboard API first; preserve focus and clean up the legacy fallback. */
export async function copyText(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch { /* Browsers can reject clipboard access even in secure contexts. */ }
  const focused = document.activeElement as HTMLElement | null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
  } finally {
    textarea.remove();
    focused?.focus();
  }
}
