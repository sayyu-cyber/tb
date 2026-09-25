"use client";
import { useEffect, useRef, useState } from "react";
import { TABLE_THEME_STYLES } from "./GameArena";

/** Decorative and lazy-loaded: the DOM game remains usable without WebGL. */
export function GinArenaScene({skin}:{skin?:string}) {
  const host=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  const theme=TABLE_THEME_STYLES[skin??""]??TABLE_THEME_STYLES.tt_default;
  const base=!skin||skin==="tt_default"?"#0a2429":theme.base;
  useEffect(()=>{
    const element=host.current;
    if(!element)return;
    let disposed=false,cleanup=()=>{};
    setReady(false);
    import("./mindiTableRenderer").then(({mountTable})=>{
      if(disposed)return;
      cleanup=mountTable(element,{base,skin:skin??"tt_default",accent:"#00bcc8",arena:true},()=>setReady(true),()=>setReady(false));
    }).catch(()=>{if(!disposed)setReady(false);});
    return()=>{disposed=true;cleanup();};
  },[base,skin]);
  return <div ref={host} className="gin-arena-scene" data-renderer={ready?"webgl":"fallback"} data-skin={skin??"tt_default"} aria-hidden="true">
    <div className="gin-arena-fallback" style={{backgroundColor:base,backgroundImage:theme.pattern}}/>
  </div>;
}
