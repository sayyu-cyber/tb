"use client";
import { Gamepad2 } from "lucide-react";

export function PlayLobbyHero() {
  return (
    <header className="play-hero">
      <span className="play-hero-icon"><Gamepad2 size={28} aria-hidden="true" /></span>
      <div><p className="play-eyebrow">PLAY</p><h1>Choose Your Game</h1><p>Jump into a game mode and challenge your friends or players worldwide.</p></div>
    </header>
  );
}
