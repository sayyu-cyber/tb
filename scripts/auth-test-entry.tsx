import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
function State() {
  const {user,playerStats,profileLoading,signInWithGoogle,signUpWithEmail}=useAuth();
  return <>
    <output>{JSON.stringify({uid:user?.uid,email:user?.email,trophies:playerStats?.trophies,rank:playerStats?.currentRank,profileLoading})}</output>
    <button onClick={()=>signInWithGoogle()}>Google sign in</button>
    <button onClick={()=>signUpWithEmail('private@example.invalid','test-password','New Player')}>Register</button>
  </>;
}
createRoot(document.getElementById("test-root")!).render(<AuthProvider><State /></AuthProvider>);
