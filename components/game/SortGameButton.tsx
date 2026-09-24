"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Spade } from "lucide-react";
import type { HandSort } from "@/lib/cardSort";
import { GameButton } from "./GameButton";

export function SortGameButton({order, onChange}:{order:HandSort|"custom";onChange:(order:HandSort)=>void}) {
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null);
  const id=useId();
  const options=[{value:"suit",label:"By suit"},{value:"rank",label:"By rank"}] as const;
  function close(){setOpen(false);trigger.current?.focus();}
  useEffect(()=>{
    if(!open)return;
    root.current?.querySelector<HTMLButtonElement>(`[data-order="${order==="custom"?"suit":order}"]`)?.focus();
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener("pointerdown",outside);
    return()=>document.removeEventListener("pointerdown",outside);
  },[open,order]);
  function keys(event:KeyboardEvent){
    if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();}
    if(event.key==="Tab"){setOpen(false);return;}
    if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
    event.preventDefault();
    const items=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')??[]);
    const current=items.indexOf(document.activeElement as HTMLButtonElement);
    const index=event.key==="Home"?0:event.key==="End"?items.length-1:(current+(event.key==="ArrowUp"?-1:1)+items.length)%items.length;
    items[index]?.focus();
  }
  return <div className="game-sort" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <GameButton ref={trigger} aria-label={`Arrange hand: ${order==="custom"?"My order":order==="rank"?"By rank":"By suit"}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined}
      onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);}}}>
      <Spade size={21} fill="currentColor" aria-hidden="true"/><span>{order==="custom"?"My order":order==="rank"?"By rank":"By suit"}</span><ChevronDown size={17} aria-hidden="true"/>
    </GameButton>
    {open&&<div id={id} role="menu" aria-label="Hand arrangement" className="game-sort-menu" onKeyDown={keys}>
      {options.map(option=><button key={option.value} role="menuitemradio" aria-checked={order===option.value} data-order={option.value}
        onClick={()=>{onChange(option.value);close();}}><span>{option.label}</span>{order===option.value&&<Check size={17} aria-hidden="true"/>}</button>)}
    </div>}
  </div>;
}
