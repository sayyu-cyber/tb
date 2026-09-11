"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { LeaderboardEntry } from "@/types";

export function Podium({ topThree }: { topThree: LeaderboardEntry[] }) {
  return (
    <div className="leaderboard-podium">
      {[1, 0, 2].map(index => {
        const player = topThree[index];
        if (!player) return <div key={index} />;
        const color = index === 0 ? "rgb(var(--gold))" : index === 1 ? "#BECFD1" : "#E8A07B";
        return (
          <Link key={player.uid} href={`/player?uid=${player.uid}`} className="podium-player" style={{"--podium-color":color} as React.CSSProperties}>
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.25,delay:index*.06}}>
              <div className="podium-crown">{index === 0 && <Crown size={25} />}</div>
              <div className="podium-avatar">{player.username.charAt(0).toUpperCase()}</div>
              <p className="truncate font-bold text-sm mt-3" title={player.username}>{player.username}</p>
              <p className="flex justify-center items-center gap-1 text-xs text-[rgb(var(--c4))] mt-1"><Trophy size={12} />{player.trophies.toLocaleString()}</p>
              <div className="podium-plinth" style={{height:index === 0 ? 112 : index === 1 ? 80 : 62}}><span>{index + 1}</span></div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
