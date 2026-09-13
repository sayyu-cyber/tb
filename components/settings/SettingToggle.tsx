"use client";
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
export function SettingToggle({icon:Icon,label,description,enabled,onChange,disabled=false}: {
  icon:LucideIcon;label:string;description?:string;enabled:boolean;onChange:()=>void;disabled?:boolean;accent?:string;
}) {
  const id=useId();
  return <div className="settings-row">
    <Icon size={20} aria-hidden="true" /><div><h3 id={id}>{label}</h3>{description && <p id={id+"-description"}>{description}</p>}</div>
    <button className="settings-switch" type="button" role="switch" aria-checked={enabled}
      aria-labelledby={id} aria-describedby={description ? id+"-description" : undefined} disabled={disabled} onClick={onChange}>
      <span><span /></span>
    </button>
  </div>;
}
