"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Browser connectivity only, not a claim about Firebase/server health. */
export function ConnectionNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  if (!offline) return null;
  return <div className="connection-notice" role="status"><WifiOff size={16} aria-hidden="true" /><span>You&apos;re offline. Online matches and updates may pause.</span></div>;
}
