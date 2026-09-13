"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClub } from "@/lib/clubs";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";

export function CreateClubDialog({ uid, playerName, trophies, onClose, onCreated }: {
  uid: string; playerName: string; trophies: number; onClose: () => void; onCreated: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const { showToast } = useToast();
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    if (!name.trim() || tag.trim().length < 2) { setError("Enter a club name and a tag of 2 to 5 characters."); return; }
    submitting.current = true; setBusy(true); setError("");
    try {
      await createClub(uid, playerName, trophies, name, tag, description);
      showToast("Club created successfully.", "success"); onCreated();
    } catch { setError("Couldn't create club. Please try again."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className="club-create-dialog" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}>
    <div className="clubs-section-title"><h2>Create Your Club</h2><Button aria-label="Close" variant="ghost" disabled={busy} onClick={onClose}><X size={20} /></Button></div>
    <form onSubmit={submit}>
      <div className="club-form-fields"><label>Club Name<input autoFocus required maxLength={30} value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label>
      <label>Club Tag<input required minLength={2} maxLength={5} value={tag} onChange={e => setTag(e.target.value.toUpperCase())} disabled={busy} /></label></div>
      <label>Description<textarea maxLength={200} rows={3} value={description} onChange={e => setDescription(e.target.value)} disabled={busy} /></label>
      <p className="club-form-note">Public club · Up to 30 members</p>
      {error && <p role="alert" className="club-form-error">{error}</p>}
      <footer><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}><Plus size={16} /> Create Club</Button></footer>
    </form>
  </dialog>;
}
