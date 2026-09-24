import React from "react";
import {dealGinHand} from "./gameplay-gin-engine";
export {useAuth,useSettings,useRouter} from "./gin-test-services";
export const useToast=()=>({showToast:()=>{}});
export const updateMatchResult=async()=>{};
export const useOpponentProfiles=()=>({rival:{displayName:"Opponent",cardBack:"cb_fire",tableTheme:"tt_red"}});
let rewards=0;
export const useEconomy=()=>({state:{economy:{coins:100},profile:{equipped:{tableTheme:"tt_red",cardBack:"cb_neon"}}},processMatchEnd:()=>{document.body.dataset.rewards=String(++rewards);}});
export default function Reward({isOpen,onClose,newCoinBalance}:any) {
  return isOpen?<div role="dialog" aria-label="Match rewards"><span>Balance {newCoinBalance}</span><button onClick={onClose}>Close rewards</button></div>:null;
}
let match:any,notify:any,attempts=0;
export function watchMatch(id:string,update:any) {
  const deal=dealGinHand();
  match={players:["me","rival"],pool:"casual",status:"active",state:{hands:{me:deal.playerHand,rival:deal.opponentHand},stock:deal.stock,discard:deal.discard,turn:"me",phase:"draw",result:null}};
  notify=update;update(match);return()=>{};
}
export async function updateMatchState(id:string,fn:any) {
  if(match.state.phase==="discard") {
    attempts++;
    document.body.dataset.attempts=String(attempts);
    if(location.search.includes("fail")&&attempts===1) throw Error("offline");
    if(location.search.includes("stale")) match={...match,state:{...match.state,hands:{...match.state.hands,me:match.state.hands.me.filter((card:any)=>!(card.suit==="D"&&card.rank===13))}}};
  }
  const patch=fn(match);
  document.body.dataset.applied=String(!!patch);
  if(patch) match={...match,...patch};
  notify({...match});
}
