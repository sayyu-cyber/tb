"use client";

import { BottomNav } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto min-h-screen bg-[#0F0F0F] relative pb-24">
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}