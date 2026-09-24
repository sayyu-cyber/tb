"use client";
import { useEffect, useRef, useState } from "react";
import { TABLE_THEME_STYLES } from "./GameArena";

/** The renderer is decorative. Losing WebGL never disables the DOM game. */
export function MindiTableScene({skin}:{skin?:string}) {
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  const theme=TABLE_THEME_STYLES[skin??""]??TABLE_THEME_STYLES.tt_default;
  const base=!skin||skin==="tt_default"?"#182431":theme.base;
  useEffect(()=>{
    const element=host.current;
    if(!element)return;
    let disposed=false, cleanup=()=>{};
    setReady(false);
    // Loaded only for Mindi; the rest of the app never pays for WebGL.
    import("./mindiTableRenderer").then(({mountTable})=>{
      if(disposed)return;
      cleanup=mountTable(element,{base,skin:skin??"tt_default",accent:theme.glow},()=>setReady(true),()=>setReady(false));
    }).catch(()=>{if(!disposed)setReady(false);});
    return()=>{disposed=true;cleanup();};
  },[base,skin,theme.glow]);
  return <div className="mindi-scene" ref={host} data-renderer={ready?"webgl":"fallback"} data-skin={skin??"tt_default"} aria-hidden="true">
    <div className="mindi-table-fallback" style={{backgroundColor:base,backgroundImage:theme.pattern}}/>
  </div>;
}
