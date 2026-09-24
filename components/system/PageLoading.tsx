import { Spade } from "lucide-react";

export function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading page" aria-busy="true">
    <div className="page-loading-title"><Spade aria-hidden="true" /><span>Thaasbai</span></div>
    <div className="page-loading-hero" aria-hidden="true" />
    <div className="page-loading-grid" aria-hidden="true"><span /><span /><span /></div>
  </div>;
}
