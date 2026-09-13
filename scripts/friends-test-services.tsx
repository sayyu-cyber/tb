// Isolated component-test services. Never imported by application code.
import React from 'react';
const populated = new URLSearchParams(location.search).has('populated');
const failure = new URLSearchParams(location.search).has('failure');
const person = (uid:string, displayName:string) => ({ uid, displayName, trophies:12, lastSeen:Date.now() });
export const useAuth = () => ({ user:{uid:'test-self',displayName:'Test Player'},isGuest:false });
export const useToast = () => ({showToast: (message:string) => { (window as any).lastToast = message; }});
export const useRouter = () => ({push: (url:string) => { (window as any).lastNavigation=url; }});
export const useTranslation = () => (key:string) => ({ page_friends:'Friends',login_signIn:'Sign in' }[key] || key);
export default function Link({href,children,...props}:any) {return <a href={href} {...props}>{children}</a>;}
export const isOnline = (time:number) => time && Date.now()-time<90000;
const watch = (value:any) => (_uid:any, callback:any, error:any) => { const timer=setTimeout(()=>failure?error(new Error('test')):callback(value),30);return()=>clearTimeout(timer); };
export const watchFriends = watch(populated ? [{uid:'friend-one',name:'Aishath',requestId:'friend-request'},{uid:'friend-two',name:'Ibrahim',requestId:'friend-request-two'}] : []);
export const watchIncomingRequests = watch(populated ? [{id:'request-one',from:'requester',fromName:'Hussain'}] : []);
export const watchOutgoingRequests = watch([]);
export const watchRoomInvites = watch([]);
export const watchSocialProfiles = (_ids:any,callback:any) => {callback({'friend-one':person('friend-one','Aishath'),'friend-two':{...person('friend-two','Ibrahim'),lastSeen:1}});return()=>{};};
export const getFriendSuggestions = async () => [person('suggestion-one','Fathimath'),person('suggestion-two','Mariyam'),person('suggestion-three','Ali')];
export const getRecentPlayers = async () => [{...person('recent-one','Ahmed'),playedAt:Date.now()-3600000,gameType:'mindi'}];
export const searchPlayers = async (_uid:string, query:string) => {if(query==='error')throw Error('test');return query==='none'?[]:[person('result-one','ZxNova')];};
export const sendFriendRequest = async () => { (window as any).sentRequest=true; };
export const respondToRequest = async (_id:string,accepted:boolean) => { (window as any).accepted=accepted; };
export const cancelOrRemove = async () => {};
export const dismissRoomInvite = async () => {};
export const sendRoomInvite = async () => {};
export const createRoom = async () => 'TEST01';
