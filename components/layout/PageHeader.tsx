"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 mb-6 pt-2">
      <button
        onClick={() => router.push("/home")}
        className="p-2 rounded-lg bg-[#1A1A1A] border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-xl font-bold text-[#D4AF37]">{title}</h1>
    </div>
  );
}