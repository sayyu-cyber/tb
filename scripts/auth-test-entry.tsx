import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
function State() { const {user,playerStats,profileLoading}=useAuth();return <output>{JSON.stringify({uid:user?.uid,trophies:playerStats?.trophies,rank:playerStats?.currentRank,profileLoading})}</output>; }
createRoot(document.getElementById("test-root")!).render(<AuthProvider><State /></AuthProvider>);
