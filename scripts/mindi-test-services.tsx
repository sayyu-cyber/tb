export * from "./gin-test-services";
export {default} from "./gin-test-services";
import {openMindiHand,openMindiHandFFA1v1,drawForFirstPlayer} from "../lib/mindiEngine";
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
  // ?intro starts the harness at the top of a hand so the draw-for-first-play
  // and dealing ceremony can be eyeballed; otherwise it starts mid-trick,
  // which is what the rest of the table states need.
  const intro=location.search.includes("intro");
  const {deal,draw}=duel?openMindiHandFFA1v1(0):openMindiHand(3);
  const players=duel?["p0","me"]:["p0","me","p2","p3"];
  const lead=deal.hands[0].find(card=>deal.hands[1].some(c=>c.suit===card.suit))??deal.hands[0][0];
  match={players,pool:"casual",status:"active",state:{
    handsByUid:Object.fromEntries(players.map((uid,i)=>[uid,i===0&&!intro?deal.hands[0].filter(c=>c!==lead):deal.hands[i as 0|1|2|3]])),
    firstDraw:intro?draw:drawForFirstPlayer(),
    trumpSuit:location.search.includes("trump")?"H":deal.trumpSuit,turnSeat:intro?deal.leader:1,trick:intro?[]:[{seat:0,card:lead}],
    tensCaptured:duel||intro?{A:0,B:0}:{A:1,B:2},tricksWon:duel||intro?{A:0,B:0}:{A:2,B:3},
    tricksPlayed:duel||intro?0:5,outcome:null,numPlayers:duel?2:4,
  }};
  notify=update;update(match);return()=>{};
}
export async function updateMatchState(id:string,fn:any) {
  if(location.search.includes("fail")) throw Error("offline");
  const patch=fn(match);
  if(patch) {match={...match,...patch};notify(match);}
}
