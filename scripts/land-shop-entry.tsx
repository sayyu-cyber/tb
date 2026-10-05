import React from "react";
import { createRoot } from "react-dom/client";
import CosmeticShop from "../components/shop/CosmeticShop";
import { LandFrame } from "./land-frame";

// LShop / LShopVip in the phone shell, fed the Shop boards' balance and
// featured week (scripts/shop-test-services.tsx, ?board).
createRoot(document.getElementById("test-root")!).render(<LandFrame><CosmeticShop /></LandFrame>);
