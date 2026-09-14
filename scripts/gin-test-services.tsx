import {useState} from "react";
export const useAuth=()=>({user:{uid:"me",displayName:"Sayyu"},playerStats:{avatarPreset:"default"}});
export const useEconomy=()=>({state:{profile:{equipped:{tableTheme:location.search.includes("red")?"tt_red":"tt_default",cardBack:"cb_neon"}}},processMatchEnd:()=>{}});
export const useSettings=()=>{const [settings,set]=useState({music:false,language:"en"});return{settings,updateSettings:(change:any)=>set(v=>({...v,...change}))};};
export const useRouter=()=>({push:(href:string)=>{document.body.dataset.destination=href;}});
export default function Reward(){return null;}
