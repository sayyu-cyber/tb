"use client";
import { useState } from 'react';
import { AuthContext, useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAILS } from '@/lib/admin';
import Shop from '@/app/shop/page';
import Inventory from '@/app/inventory/page';
import Friends from '@/app/(main)/friends/page';
import Leaderboard from '@/app/(main)/leaderboard/page';
import { AdminPanelClient } from '@/components/admin/AdminPanelClient';
import { BottomNav } from '@/components/layout/BottomNav';
export default function Preview() {
  const auth=useAuth();
  const [screen,setScreen]=useState('shop');
  return <AuthContext.Provider value={{...auth,user:{uid:'sample-user',displayName:'Sayyu',email:ADMIN_EMAILS[0],photoURL:null,isGuest:false,createdAt:new Date()},loading:false,isGuest:false}}>
    <div id="preview-controls" style={{display:'flex',gap:16,padding:8}}>{['shop','inventory','friends','leaderboard','admin'].map(s=><button key={s} onClick={()=>setScreen(s)}>{s}</button>)}</div>
    <div className="pb-28">{screen==='shop'?<Shop />:screen==='inventory'?<Inventory />:screen==='friends'?<Friends />:screen==='leaderboard'?<Leaderboard />:<AdminPanelClient />}</div><BottomNav />
  </AuthContext.Provider>;
}
