import React from "react";
import { createRoot } from "react-dom/client";
import ShopPage from "../app/shop/page";
createRoot(document.getElementById("test-root")!).render(<div className="app-shell"><main className="app-shell-main"><ShopPage /></main></div>);
