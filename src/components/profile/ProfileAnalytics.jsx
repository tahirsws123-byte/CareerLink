import { BarChart3, Eye, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../layout/Card.jsx";

export default function ProfileAnalytics({ user, isMe }) {
  if (!isMe) return null;
  const metrics = [
    { label: "Profile views", value: user.profileViews || 0, icon: Eye, description: "People who visited your profile", to: "/dashboard/profile-views" },
    { label: "Post impressions", value: user.postImpressions || 0, icon: BarChart3, description: "Times your posts appeared in feeds", to: "/dashboard/content" },
    { label: "Search appearances", value: user.searchAppearances || 0, icon: Search, description: "Times your profile appeared in people search", to: "/dashboard/search-appearances" },
  ];
  return <Card className="overflow-hidden"><div className="flex items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-brand"><BarChart3 size={19} /></span><div><h2 className="text-base font-semibold text-ink">Your profile insights</h2><p className="mt-0.5 text-xs text-muted-ink">A quick read on your visibility across CareerLink.</p></div></div><div className="grid gap-3 border-t border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-3">{metrics.map(({ label, value, icon: Icon, description, to }, index) => <Link key={label} to={to} aria-label={`View ${label} analytics`} className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-brand/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"><div className="flex items-center justify-between"><span className={`grid h-8 w-8 place-items-center rounded-lg ${index === 0 ? "bg-blue-50 text-blue-700" : index === 1 ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}><Icon size={16} /></span><span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">All time</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-ink">{Number(value).toLocaleString()}</p><p className="mt-0.5 text-sm font-semibold text-ink">{label}</p><p className="mt-1 text-[11px] leading-4 text-muted-ink">{description}</p></Link>)}</div><Link to="/dashboard" className="flex items-center justify-center gap-2 border-t border-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-brand">Show all <span aria-hidden="true">→</span></Link></Card>;
}
