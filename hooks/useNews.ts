"use client";

import { NewsItem } from "@/types";

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Season 1 Ranked Launch",
    content: "The first competitive season is now live! Climb the ranks and earn exclusive rewards.",
    date: new Date("2026-07-20"),
    type: "announcement",
  },
  {
    id: "2",
    title: "Weekend League Returns",
    content: "Join the Weekend League this Friday for double trophy rewards!",
    date: new Date("2026-07-18"),
    type: "event",
  },
  {
    id: "3",
    title: "New Card Designs",
    content: "Check out the new premium card backs available in the store.",
    date: new Date("2026-07-15"),
    type: "update",
  },
];

export function useNews() {
  // Local editorial content is available immediately; no simulated network delay.
  return { news: mockNews, loading: false };
}
