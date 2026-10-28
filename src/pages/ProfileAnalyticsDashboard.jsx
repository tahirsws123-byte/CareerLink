import { useEffect, useState } from "react";
import { BarChart3, BookOpen, Eye, FileText, Search, UsersRound, Download, TrendingUp, MessageCircle, Repeat2, Bookmark, Send, Sparkles, UserRound, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import ProfileCard from "../components/feed/ProfileCard.jsx";
import ProfileViewers from "../components/profile/ProfileViewers.jsx";
import api from "../services/api.js";

const navigation = [
  { label: "Overview", to: "/dashboard", icon: BarChart3 },
  { label: "Content analytics", to: "/dashboard/content", icon: FileText },
  { label: "Audience analytics", to: "/dashboard/audience", icon: UsersRound },
];
const number = (value) => Number(value || 0).toLocaleString();

export default function ProfileAnalyticsDashboard() {
  const location = useLocation();
  const { user } = useAuth();
  const section = location.pathname.endsWith("/profile-views")
    ? "profile-views"
    : location.pathname.endsWith("/search-appearances")
      ? "search-appearances"
      : location.pathname.endsWith("/content")
        ? "content"
        : location.pathname.endsWith("/audience") ? "audience" : "overview";
  const navigationSection = ["profile-views", "search-appearances"].includes(section) ? "overview" : section;
  const [days, setDays] = useState(7);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/users/analytics/mine", { params: { days } })
      .then(({ data }) => {
        if (active) {
          setAnalytics(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load analytics");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [days]);

  const exportCsv = () => {
    if (!analytics?.daily?.length) return;
    const headings = ["Date", "Post impressions", "Profile views", "Search appearances", "New followers"];
    const rows = analytics.daily.map((item) => [item.date, item.postImpressions, item.profileViews, item.searchAppearances, item.newFollowers]);
    const csv = [headings, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `careerlink-analytics-${days}-days.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dateRange = analytics?.startDate && analytics?.endDate
    ? `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(analytics.startDate))} – ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(analytics.endDate))}`
    : "";

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-5 sm:px-5">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(220px,272px)_minmax(0,1fr)] lg:gap-5">
        <aside className="space-y-4 lg:sticky lg:top-20">
          <ProfileCard variant="dashboard" />
          <nav aria-label="Analytics dashboard" className="analytics-dashboard-nav overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {navigation.map(({ label, to, icon: Icon }) => {
              const active = (navigationSection === "overview" && to === "/dashboard")
                || (navigationSection === "content" && to.endsWith("/content"))
                || (navigationSection === "audience" && to.endsWith("/audience"));
              return <Link key={to} to={to} aria-current={active ? "page" : undefined} className={`analytics-dashboard-link flex items-center gap-3 border-l-4 px-4 py-3.5 text-sm font-medium transition ${active ? "border-emerald-700 bg-emerald-50/60 text-emerald-800" : "border-transparent text-gray-600 hover:bg-sky hover:text-brand"}`}>
                <Icon size={17} />{label}
              </Link>;
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">CareerLink analytics</p><h1 className="mt-1 text-2xl font-bold text-ink">{section === "profile-views" ? "Profile views" : section === "search-appearances" ? "Search appearances" : navigation.find((item) => item.to === (section === "overview" ? "/dashboard" : `/dashboard/${section}`))?.label || "Overview"}</h1></div>
            {["content", "audience", "search-appearances"].includes(section) && <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="analytics-days">Analytics time range</label>
              <select id="analytics-days" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"><option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option></select>
              <button type="button" onClick={exportCsv} disabled={!analytics || loading} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand hover:text-brand disabled:opacity-50"><Download size={15} /><span className="hidden sm:inline">Export</span></button>
            </div>}
          </header>

          {loading && <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading your analytics…</div>}
          {!loading && error && <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}</div>}
          {!loading && !error && analytics && section === "overview" && <Overview analytics={analytics} />}
          {!loading && !error && analytics && section === "content" && <ContentAnalytics analytics={analytics} days={days} dateRange={dateRange} />}
          {!loading && !error && analytics && section === "audience" && <AudienceAnalytics analytics={analytics} dateRange={dateRange} />}
          {!loading && !error && analytics && section === "profile-views" && <ProfileViewers fullPage />}
          {!loading && !error && analytics && section === "search-appearances" && <SearchAppearances analytics={analytics} days={days} dateRange={dateRange} userId={user?._id} />}
        </main>
      </div>
    </div>
  );
}

function Overview({ analytics }) {
  const cards = [
    { label: "Post impressions", value: analytics.totals.legacyPostImpressions, icon: BarChart3, note: "Lifetime views of your posts", to: "/dashboard/content" },
    { label: "Total followers", value: analytics.totals.followers, icon: UsersRound, note: `${number(analytics.totals.newFollowers)} new in the selected period` },
    { label: "Profile viewers", value: analytics.totals.profileViews, icon: Eye, note: `Recorded in the last ${analytics.days} days`, to: "/dashboard/profile-views" },
    { label: "Search appearances", value: analytics.totals.legacySearchAppearances, icon: Search, note: "Times your profile appeared in search", to: "/dashboard/search-appearances" },
    { label: "Newsletter article views in 7 days", value: 0, icon: BookOpen, note: "Article view tracking is not available yet", to: "/newsletters" },
    { label: "New newsletter subscribers in 7 days", value: 0, icon: UsersRound, note: "Subscriber growth tracking is not available yet", to: "/newsletters" },
  ];
  const hasPosts = analytics.content.length > 0;
  return <>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Track performance</h2>
      <p className="mt-1 text-xs text-muted-ink">Private to you · {analytics.days}-day activity alongside all-time totals</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map(({ label, value, icon: Icon, note, to }) => {
          const content = <><div className="flex items-center gap-2 text-muted-ink"><Icon size={18} /><span className="text-xs">{label}</span></div><p className="mt-2 text-2xl font-semibold text-ink">{number(value)}</p><p className="mt-1 text-xs text-muted-ink">{note}</p></>;
          return to
            ? <Link key={label} to={to} className="rounded-xl border border-gray-200 p-4 transition hover:border-brand/40 hover:shadow-sm">{content}</Link>
            : <div key={label} className="rounded-xl border border-gray-200 p-4">{content}</div>;
        })}
      </div>
      <p className="mt-4 rounded-lg bg-sky/60 px-3 py-2 text-xs leading-5 text-muted-ink">Daily trends begin tracking from today. Older activity is included only in all-time totals where available.</p>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-ink">Weekly progress</h2><span className="text-xs text-muted-ink">{analytics.days} days</span></div>
      <div className="mt-4 space-y-3">
        <ProgressRow label="Post impressions" value={analytics.totals.postImpressions} icon={BarChart3} />
        <ProgressRow label="Profile views" value={analytics.totals.profileViews} icon={Eye} />
        <ProgressRow label="Search appearances" value={analytics.totals.searchAppearances} icon={Search} />
        <ProgressRow label="New followers" value={analytics.totals.newFollowers} icon={UsersRound} />
      </div>
      {!hasPosts && <div className="mt-5 rounded-xl bg-gray-50 p-4"><h3 className="text-sm font-semibold text-ink">No posts in this period yet</h3><p className="mt-1 text-xs text-muted-ink">Share a professional update to start building your content performance.</p><Link to="/feed" className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline">Create a post →</Link></div>}
    </section>
  </>;
}

function ContentAnalytics({ analytics, days, dateRange }) {
  const engagement = analytics.content.reduce((sum, post) => sum + post.engagement, 0);
  const metric = [
    ["Reactions", analytics.content.reduce((sum, post) => sum + post.likesCount, 0), Eye],
    ["Comments", analytics.content.reduce((sum, post) => sum + post.commentsCount, 0), MessageCircle],
    ["Reposts", analytics.content.reduce((sum, post) => sum + post.repostsCount, 0), Repeat2],
    ["Saves", analytics.content.reduce((sum, post) => sum + post.savesCount, 0), Bookmark],
    ["Sends", analytics.content.reduce((sum, post) => sum + post.sendsCount, 0), Send],
  ];
  return <>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <SectionTitle title="Content performance" dateRange={dateRange} />
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm"><span className="font-semibold text-ink">Impressions</span><span className="text-muted-ink">Daily</span></div>
      <div className="mt-3"><DailyChart rows={analytics.daily} metric="postImpressions" label="Post impressions" /></div>
      <p className="mt-2 text-xs text-muted-ink">Daily data is recorded from the start of analytics tracking.</p>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Discovery</h2>
      <p className="mt-1 text-xs text-muted-ink">How people find your profile and content over {days} days</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><MetricTile label="Post impressions" value={analytics.totals.postImpressions} /><MetricTile label="Members reached" value={analytics.totals.profileViews} /><MetricTile label="Search appearances" value={analytics.totals.searchAppearances} /></div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold text-ink">Engagement</h2><span className="text-sm text-muted-ink">{number(engagement)} actions on your recent posts</span></div>
      <div className="mt-3 divide-y divide-gray-100">{metric.map(([label, value, Icon]) => <div key={label} className="flex items-center justify-between py-3 text-sm"><span className="inline-flex items-center gap-2 text-muted-ink"><Icon size={16} />{label}</span><span className="font-semibold text-ink">{number(value)}</span></div>)}</div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Top performing posts</h2>
      {analytics.content.length ? <div className="mt-3 divide-y divide-gray-100">{analytics.content.map((post) => <article key={post._id} className="flex gap-3 py-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky text-brand"><FileText size={17} /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 whitespace-pre-wrap text-sm text-ink">{post.text || "Media post"}</p><p className="mt-1 text-xs text-muted-ink">{new Date(post.createdAt).toLocaleDateString()} · {number(post.impressions)} impressions · {number(post.engagement)} engagements</p></div></article>)}</div> : <EmptyState title="No posts to show yet" text="Your posts from this time period will appear here." />}
    </section>
  </>;
}

function AudienceAnalytics({ analytics, dateRange }) {
  return <>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Follower growth</h2>
      <div className="mt-2 flex items-baseline gap-2"><span className="text-2xl font-semibold text-ink">{number(analytics.totals.followers)}</span><span className="text-sm text-muted-ink">total followers</span></div>
      <DailyChart rows={analytics.daily} metric="newFollowers" label="New followers" />
      <p className="mt-2 text-xs text-muted-ink">Daily data is recorded from the start of analytics tracking. {dateRange}</p>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Top demographics</h2>
      <p className="mt-1 text-xs text-muted-ink">Based on signed-in members who viewed your profile during this period.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DemographicGroup title="Viewer locations" data={analytics.demographics.locations} />
        <DemographicGroup title="Professional headlines" data={analytics.demographics.headlines} />
      </div>
      <p className="mt-4 text-xs text-muted-ink">To protect member privacy, each category is shown only after at least five viewers match it.</p>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Audience summary</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricTile label="Total followers" value={analytics.totals.followers} /><MetricTile label="New followers" value={analytics.totals.newFollowers} /><MetricTile label="Profile views" value={analytics.totals.profileViews} /></div>
    </section>
  </>;
}

function SearchAppearances({ analytics, days, dateRange, userId }) {
  const current = analytics.totals.searchAppearances;
  const previous = analytics.previousTotals.searchAppearances;
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const suggestions = [
    { title: "Add relevant skills", description: "Help people find your profile when searching for your expertise.", to: `/profile/${userId}#skills`, icon: Sparkles, action: "Review skills" },
    { title: "Keep your profile complete", description: "A clear headline and current experience make search results more useful.", to: `/profile/${userId}#about`, icon: UserRound, action: "Update profile" },
    { title: "Let recruiters know you’re open", description: "Set your work preferences so your availability is clear.", to: `/profile/${userId}`, icon: Plus, action: "View profile" },
  ];
  return <>
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Profile discovery</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Search appearances</h2>
      <p className="mt-1 text-sm text-muted-ink">How often your profile appeared in CareerLink member search results during {dateRange || `the last ${days} days`}.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><p className="text-3xl font-semibold text-ink">{number(analytics.totals.legacySearchAppearances)}</p><p className="text-sm text-muted-ink">All-time appearances</p></div>
        <div><p className="text-3xl font-semibold text-ink">{number(current)}</p><p className="text-sm text-muted-ink">Tracked in the last {days} days</p></div>
      </div>
      <p className={`mt-3 text-xs font-medium ${change === null ? "text-muted-ink" : change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{change === null ? "No earlier daily baseline is available yet." : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% compared with the previous ${days} days.`}</p>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Where you appeared</h2>
      <p className="mt-1 text-xs text-muted-ink">Sources are shown only where CareerLink currently records appearance events.</p>
      <div className="mt-4 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold text-ink">Member search results</span><span className="mt-1 block text-xs text-muted-ink">Your profile matched a CareerLink people search</span></span><span className="text-lg font-semibold text-ink">{number(current)}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand" style={{ width: current ? "100%" : "0%" }} /></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-ink">This metric counts appearances recorded when your profile is included in member-search results; it is not a count of unique people. Other discovery sources are not currently tracked separately.</p>
      <div className="mt-5"><DailyChart rows={analytics.daily} metric="searchAppearances" label="Search appearances" /></div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Actions to improve discoverability</h2>
      <div className="mt-3 divide-y divide-gray-100">{suggestions.map(({ title, description, to, icon: Icon, action }) => <div key={title} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand"><Icon size={18} /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-1 text-xs text-muted-ink">{description}</p></div><Link to={to} className="shrink-0 self-start rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand sm:self-center">{action}</Link></div>)}</div>
    </section>
  </>;
}

function DailyChart({ rows, metric, label }) {
  const values = rows.map((row) => row[metric] || 0);
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => `${values.length < 2 ? 50 : (index / (values.length - 1)) * 100},${90 - (value / max) * 75}`).join(" ");
  const dates = rows.length ? [rows[0].date, rows[Math.floor((rows.length - 1) / 2)].date, rows[rows.length - 1].date] : [];
  return <div role="img" aria-label={`${label} daily chart`}>
    <div className="relative h-52 overflow-hidden rounded-lg border border-gray-100 bg-white px-2 py-2">
      <div className="absolute inset-x-3 top-1/4 border-t border-gray-100" /><div className="absolute inset-x-3 top-2/4 border-t border-gray-100" /><div className="absolute inset-x-3 top-3/4 border-t border-gray-100" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-full w-full overflow-visible"><polyline points={points} fill="none" stroke="#0f766e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />{values.map((value, index) => <circle key={`${rows[index].date}-${index}`} cx={values.length < 2 ? 50 : (index / (values.length - 1)) * 100} cy={90 - (value / max) * 75} r="1.7" fill="#0f766e"><title>{rows[index].date}: {value}</title></circle>)}</svg>
    </div>
    <div className="mt-2 flex justify-between text-[11px] text-muted-ink">{dates.map((date, index) => <span key={`${date}-${index}`}>{new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span>)}</div>
    {!values.some(Boolean) && <p className="mt-2 text-center text-xs text-muted-ink">No daily activity recorded yet.</p>}
  </div>;
}

function ProgressRow({ label, value, icon: Icon }) {
  return <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3"><span className="inline-flex items-center gap-2 text-sm text-gray-700"><Icon size={16} className="text-muted-ink" />{label}</span><span className="font-semibold text-ink">{number(value)}</span></div>;
}

function MetricTile({ label, value }) {
  return <div className="rounded-xl border border-gray-200 p-4"><p className="text-2xl font-semibold text-ink">{number(value)}</p><p className="mt-1 text-xs text-muted-ink">{label}</p></div>;
}

function SectionTitle({ title, dateRange }) {
  return <div><h2 className="text-base font-semibold text-ink">{title}</h2><p className="mt-1 text-xs text-muted-ink">{dateRange} · Daily data is recorded in UTC</p></div>;
}

function DemographicGroup({ title, data }) {
  return <div className="rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-semibold text-ink">{title}</h3>{data.available ? <div className="mt-3 space-y-3">{data.items.map((item) => <div key={item.label}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-gray-700">{item.label}</span><span className="shrink-0 text-muted-ink">{item.percentage}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand" style={{ width: `${item.percentage}%` }} /></div></div>)}</div> : <p className="mt-3 text-xs leading-5 text-muted-ink">Demographics aren’t available yet. Not enough viewer data is available to protect member privacy.</p>}</div>;
}

function EmptyState({ title, text }) {
  return <div className="py-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky text-brand"><TrendingUp size={21} /></div><h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3><p className="mt-1 text-xs text-muted-ink">{text}</p></div>;
}
