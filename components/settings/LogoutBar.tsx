"use client";
import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
export function LogoutBar() {
  const {logout} = useAuth();
  const t = useTranslation();
  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if(open) dialog.current?.showModal(); },[open]);
  async function confirm() {
    if(pending.current) return;
    pending.current=true;setBusy(true);setError("");
    try { await logout();setOpen(false); }
    catch { setError("Couldn't log out. Please try again."); }
    finally { pending.current=false;setBusy(false); }
  }
  return <><div className="settings-logout"><button onClick={() => {setError("");setOpen(true);}}><LogOut size={20} />{t("settings_logout")}</button><span>THAASBAI v1.0.0</span></div>
    {open && <dialog ref={dialog} className="settings-dialog" aria-labelledby="logout-heading" onCancel={e => {if(busy)e.preventDefault();else setOpen(false);}}>
      <h2 id="logout-heading">Log out?</h2><p>You will need to sign in again to access your account.</p>
      {error && <p role="alert">{error}</p>}
      <footer><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>{t("common_cancel")}</Button>
      <Button variant="danger" loading={busy} onClick={confirm}>{t("settings_logout")}</Button></footer>
    </dialog>}
  </>;
}
