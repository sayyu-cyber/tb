import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Sheet } from "@/components/layout/phone/Sheet";
import { AccountRecovery } from "@/components/auth/AccountRecovery";
import { AccountCompletionNotice } from "@/components/auth/AccountCompletionNotice";
import LoginPage from "@/app/(auth)/login/page";
import * as auth from "@/lib/supabase/auth";
import * as storage from "@/lib/safeStorage";
import { fixture } from "./check-auth-integrity-services";

fixture.api = auth;
fixture.storage = storage;
function State() {
  const value = useAuth();
  fixture.context = value;
  fixture.snapshot = { uid: value.user?.uid ?? null, displayName: value.user?.displayName,
    trophies: value.playerStats?.trophies ?? null, loading: value.loading,
    profileLoading: value.profileLoading, profileError: value.profileError,
    accountCompletion: value.accountCompletion, accountBusy: value.accountBusy };
  return <output>{JSON.stringify(fixture.snapshot)}</output>;
}

function Sheets() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [renders, setRenders] = useState(0);
  fixture.rerenderSheet = () => setRenders(value => value + 1);
  fixture.emptySheet = () => setEmpty(true);
  fixture.closeOuter = () => setOpen(false);
  return <>
    <button id="opener" onClick={() => setOpen(true)}>Open sheet</button>
    <a id="background-link" href="#background">Background</a>
    <Sheet open={open} label="Account form" onClose={() => setOpen(false)}>
      {!empty && <>
        <input aria-label="First input" />
        <input aria-label="Hidden" hidden />
        <input aria-label="Disabled" disabled />
        <fieldset disabled><input aria-label="Disabled group" /></fieldset>
        <select aria-label="Select"><option>Choice</option></select>
        <textarea aria-label="Notes" />
        <div contentEditable suppressContentEditableWarning aria-label="Editable" />
        <button style={{ visibility: "hidden" }}>Invisible</button>
        <button onClick={() => setNested(true)}>Open nested</button>
        <span>{renders}</span>
      </>}
    </Sheet>
    <Sheet open={nested} label="Nested" headingId="nested-heading" onClose={() => setNested(false)}>
      <h2 id="nested-heading">Nested heading</h2>
      <input aria-label="Nested input" />
    </Sheet>
  </>;
}

function App() {
  const [mounted, setMounted] = useState(true);
  fixture.unmountProvider = () => setMounted(false);
  fixture.remountProvider = () => setMounted(true);
  const view = new URLSearchParams(location.search).get("view");
  if (view === "sheet") return <Sheets />;
  return mounted ? <AuthProvider><State />
    {view === "request" && <AccountRecovery mode="request" />}
    {view === "reset" && <AccountRecovery mode="reset" />}
    {view === "confirmation" && <AccountRecovery mode="confirmation" />}
    {view === "completion" && <AccountCompletionNotice />}
    {view === "login" && <LoginPage />}
  </AuthProvider> : <p>Unmounted</p>;
}
createRoot(document.getElementById("test-root")!).render(<App />);
