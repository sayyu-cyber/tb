export const MAX_MEMBERS = 30;
export const useAuth = () => ({ user: {uid:"me",displayName:"Sayyu"},isGuest:location.search.includes("guest"),playerStats:{trophies:12} });
export const useToast = () => ({showToast:()=>{}});
export const useSettings = () => ({settings:{language:"en"}});
let mine: any = null;
let notify: any;
const clubs = ["Kings of Cards","Mindi Masters","Rummy Legends","Maldives Players","New Community"].map((name,i)=>({
  id:String(i),name,tag:"CL"+i,description:"A community for card games and good company.",
  members:i===3 ? Array.from({length:30},(_,j)=>"u"+j) : ["u1","u2"],
  ownerUid:"u1",memberNames:{u1:"Aisha",u2:"Ibrahim"},memberTrophies:{u1:20,u2:10},createdAt:1
}));
export function watchMyClub(uid:any,update:any) { notify=update; update(mine); return ()=>{}; }
export function watchClubList(update:any,error:any) {
  if(location.search.includes("error")) error(new Error("Offline"));
  else if(!location.search.includes("loading")) update(clubs);
  return ()=>{};
}
export async function joinClub(id:string) { mine={...clubs.find(c=>c.id===id),members:["u1","u2","me"]}; notify(mine); }
export async function createClub(uid:string,player:string,trophies:number,name:string,tag:string,description:string) {
  mine={id:"new",name,tag,description,ownerUid:uid,members:[uid],memberNames:{[uid]:player},memberTrophies:{[uid]:trophies}};
  notify(mine); return "new";
}
export function watchClubMessages(id:any,update:any) {update([]);return ()=>{};}
export async function sendClubMessage() {}
export async function leaveClub() {mine=null;notify(null);}
export async function kickMember() {}
