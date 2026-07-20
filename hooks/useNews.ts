"use client";

import { useState, useEffect } from "react";
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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setNews(mockNews);
      setLoading(false);
    };

    fetchNews();
  }, []);

  return { news, loading };
}
