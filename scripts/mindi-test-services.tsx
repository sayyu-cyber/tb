export * from "./gin-test-services";
export {default} from "./gin-test-services";
import {dealMindiHand,dealMindiHandFFA1v1} from "../lib/mindiEngine";
export const useToast=()=>({showToast:()=>{}});
export const updateMatchResult=async()=>{};
export const useOpponentProfiles=()=>({
  p0:{displayName:"West",cardBack:"cb_fire",tableTheme:"tt_red"},
  p2:{displayName:"East",cardBack:"cb_ocean"},
  p3:{displayName:"Partner",cardBack:"cb_neon"},
});
let match:any,notify:any;
export function watchMatch(id:string,update:any,error:any) {
  if(location.search.includes("error")) {error(Error("offline"));return()=>{};}
  const duel=location.search.includes("duel");
  const deal=duel?dealMindiHandFFA1v1(0):dealMindiHand(3);
  const players=duel?["p0","me"]:["p0","me","p2","p3"];
  const lead=deal.hands[0].find(card=>deal.hands[1].some(c=>c.suit===card.suit))??deal.hands[0][0];
  match={players,pool:"casual",status:"active",state:{
    handsByUid:Object.fromEntries(players.map((uid,i)=>[uid,i===0?deal.hands[0].filter(c=>c!==lead):deal.hands[i as 0|1|2|3]])),
    trumpSuit:deal.trumpSuit,turnSeat:1,trick:[{seat:0,card:lead}],
    tensCaptured:{A:1,B:2},tricksWon:{A:2,B:3},tricksPlayed:5,outcome:null,numPlayers:duel?2:4,
  }};
  notify=update;update(match);return()=>{};
}
export async function updateMatchState(id:string,fn:any) {
  if(location.search.includes("fail")) throw Error("offline");
  const patch=fn(match);
  if(patch) {match={...match,...patch};notify(match);}
}
