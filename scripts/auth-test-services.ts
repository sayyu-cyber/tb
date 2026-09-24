const listeners = new Set<(user:any)=>void>();
const profiles = new Map<string, (snapshot:any)=>void>();
const record = { totalMatches:2, wins:1, losses:1, trophies:5, currentRank:"Bronze", highestRank:"Bronze", playerCode:"TEST123" };
const player = { uid:"player-one", displayName:"Player", email:null, photoURL:null, isAnonymous:false, metadata:{creationTime:"2024-12-01"} };
export const auth = { currentUser: player as any };
export const db = {};
export const doc = (_db:any,_collection:string,uid:string)=>uid;
export const getDoc = async ()=>({exists:()=>true,data:()=>record});
export const setDoc = async ()=>{};
export const serverTimestamp = ()=>0;
export const onSnapshot = (uid:string,callback:any)=>{profiles.set(uid,callback);return()=>{profiles.delete(uid);};};
export const onAuthStateChanged = (_auth:any,callback:any)=>{listeners.add(callback);callback(auth.currentUser);return()=>{listeners.delete(callback);};};
export const signOut = async ()=>{auth.currentUser=null;listeners.forEach(callback=>callback(null));};
export class GoogleAuthProvider {}
export const signInWithPopup=async()=>({user:player});
export const signInWithEmailAndPassword=async()=>{};
export const createUserWithEmailAndPassword=async()=>({user:player});
export const signInAnonymously=async()=>{};
export const updateProfile=async()=>{};
(window as any).authTest = {
  update:()=>profiles.get('player-one')?.({exists:()=>true,data:()=>({...record,trophies:30,currentRank:'Silver',totalMatches:10})}),
  signOut,
  login:()=>{auth.currentUser={...player,uid:'player-two'};listeners.forEach(callback=>callback(auth.currentUser));},
  subscriptions:()=>Array.from(profiles.keys()),
};
