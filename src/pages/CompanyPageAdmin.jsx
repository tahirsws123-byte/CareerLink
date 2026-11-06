import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Edit3,
  Flag,
  FileText,
  Image,
  Inbox,
  LayoutDashboard,
  Link2,
  MessageCircle,
  MailOpen,
  MoreHorizontal,
  Newspaper,
  PenSquare,
  Plus,
  Pencil,
  Repeat2,
  Search,
  Settings,
  ThumbsUp,
  Trash2,
  X,
  UsersRound,
  Video,
} from "lucide-react";
import api from "../services/api.js";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth.js";
import PostCard from "../components/feed/PostCard.jsx";
import CompanyPageEditor from "../components/company/CompanyPageEditor.jsx";
import CompanyPageJobs from "../components/company/CompanyPageJobs.jsx";
import CompanyPageSettings from "../components/company/CompanyPageSettings.jsx";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "posts", label: "Page posts", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "edit-page", label: "Edit page", icon: Edit3 },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
  { id: "settings", label: "Settings", icon: Settings },
];

const analyticsTabs = ["Content", "Followers", "Search appearances", "Competitors"];

export default function CompanyPageAdmin() {
  const { companyPageId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [companyPage, setCompanyPage] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const analyticsRequestId = useRef(0);
  const [section, setSection] = useState(() => {
    const requestedSection = searchParams.get("section");
    return navigation.some(({ id }) => id === requestedSection) ? requestedSection : "dashboard";
  });
  const [analyticsTab, setAnalyticsTab] = useState("Content");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postVideo, setPostVideo] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [selectedMetricsPostId, setSelectedMetricsPostId] = useState("");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (!showCreateMenu) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowCreateMenu(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showCreateMenu]);

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    setSection(navigation.some(({ id }) => id === requestedSection) ? requestedSection : "dashboard");
  }, [searchParams]);

  const currentRole = companyPage?.currentRole || "super_admin";
  const visibleNavigation = navigation.filter(({ id }) => {
    if (currentRole === "analyst") return id === "analytics";
    if (currentRole === "content_admin") return ["dashboard", "posts", "analytics", "feed", "activity", "inbox"].includes(id);
    return true;
  });

  useEffect(() => {
    if (!companyPage) return;
    const allowed = new Set(visibleNavigation.map(({ id }) => id));
    if (currentRole === "content_admin") allowed.add("post-metrics");
    if (!allowed.has(section)) setSection(currentRole === "analyst" ? "analytics" : "dashboard");
  }, [companyPage, currentRole, section, visibleNavigation]);

  const loadCompanyPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/company-pages/${companyPageId}/manage`);
      setCompanyPage(data.companyPage);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this company page");
    } finally {
      setLoading(false);
    }
  }, [companyPageId]);

  useEffect(() => {
    loadCompanyPage();
  }, [loadCompanyPage]);

  const loadAnalytics = useCallback(async (startDate, endDate) => {
    const requestId = ++analyticsRequestId.current;
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      setAnalyticsData(null);
      const { data } = await api.get(`/company-pages/${companyPageId}/analytics`, {
        params: {
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        },
      });
      if (requestId === analyticsRequestId.current) setAnalyticsData(data);
    } catch (requestError) {
      if (requestId === analyticsRequestId.current) {
        setAnalyticsError(requestError.response?.data?.message || "Unable to load analytics");
      }
    } finally {
      if (requestId === analyticsRequestId.current) setAnalyticsLoading(false);
    }
  }, [companyPageId]);

  const selectSection = (nextSection) => {
    setSection(nextSection);
  };

  const publishPagePost = async (event) => {
    event.preventDefault();
    if ((!postText.trim() && !postImage && !postVideo) || savingPost) return;
    try {
      setSavingPost(true);
      const formData = new FormData();
      formData.append("text", postText.trim());
      if (postImage) formData.append("image", postImage);
      if (postVideo) formData.append("video", postVideo);
      await api.post(`/company-pages/${companyPageId}/posts`, formData);
      setPostText("");
      setPostImage(null);
      setPostVideo(null);
      setCreatingPost(false);
      toast.success("Post published");
      await loadCompanyPage();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to publish post");
    } finally {
      setSavingPost(false);
    }
  };

  if (loading) {
    return <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] p-5"><div className="mx-auto max-w-6xl rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading company page…</div></main>;
  }

  if (error || !companyPage) {
    return (
      <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-4 py-10">
        <section className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-ink">Company page unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-muted-ink">{error || "This company page could not be found."}</p>
          <button type="button" onClick={loadCompanyPage} className="mt-5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Try again</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-5 sm:px-5 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Company page admin</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Manage your page</h1>
          </div>
          <Link to="/feed" className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand">Back to CareerLink</Link>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
              {companyPage.logo?.url ? (
                <img src={companyPage.logo.url} alt="" className="h-11 w-11 rounded-lg object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky text-brand"><Building2 size={21} /></span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{companyPage.name}</span>
                <span className="block text-xs text-muted-ink">Page admin</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b border-gray-100 p-4 lg:grid-cols-1">
              {currentRole !== "analyst" && <button type="button" disabled={companyPage.active === false} onClick={() => setShowCreateMenu(true)} className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-2 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm">
                <Plus size={17} /> Create
              </button>}
              <Link to={`/company/${companyPage.publicUrlSlug}`} className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700 hover:border-brand hover:text-brand sm:gap-2 sm:text-sm">
                <Eye size={17} /> View as member
              </Link>
            </div>
            <nav aria-label="Company page management" className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block">
              {visibleNavigation.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-current={section === id ? "page" : undefined}
                  onClick={() => selectSection(id)}
                  className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition lg:w-full ${section === id ? "bg-sky font-semibold text-brand" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-4">
            {companyPage.active === false && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>This Company Page is deactivated and hidden from public view.</span><button type="button" onClick={() => selectSection("settings")} className="font-semibold underline">Open settings to reactivate</button></div>}
            {section === "dashboard" && <Dashboard companyPage={companyPage} onRefresh={loadCompanyPage} onOpenSection={selectSection} onCreatePost={() => setCreatingPost(true)} />}
            {section === "posts" && (
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-4">
                  <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <SectionHeading title="Page posts" description="Manage your company page’s published posts." />
                    <div className="border-b border-gray-100 px-5">
                      <span className="inline-flex border-b-2 border-brand py-3 text-sm font-semibold text-brand">Published</span>
                    </div>
                    <div className="px-5 py-4">
                      <button type="button" onClick={() => setCreatingPost(true)} className="w-full rounded-full border border-gray-300 px-5 py-3 text-left text-sm text-muted-ink transition hover:bg-gray-50">Start a post</button>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Video size={18} className="text-green-600" />Video</button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Image size={18} className="text-blue-600" />Photo</button>
                        <button type="button" onClick={() => navigate("/articles/new")} className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><PenSquare size={18} className="text-orange-600" /><span className="hidden sm:inline">Write article</span><span className="sm:hidden">Article</span></button>
                      </div>
                      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 25 * 1024 * 1024) return toast.error("Photo must be 25 MB or smaller");
                        setPostImage(file);
                        setPostVideo(null);
                        setCreatingPost(true);
                      }} />
                      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 25 * 1024 * 1024) return toast.error("Video must be 25 MB or smaller");
                        setPostVideo(file);
                        setPostImage(null);
                        setCreatingPost(true);
                      }} />
                    </div>
                  </section>
                  <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {companyPage.recentPosts?.length ? (
                      <div className="space-y-4 p-4 sm:p-5">
                        {companyPage.recentPosts.map((post) => <PagePostCard key={post._id} post={post} companyPage={companyPage} companyPageId={companyPageId} onRefresh={loadCompanyPage} onShowMetrics={() => { setSelectedMetricsPostId(post._id); setSection("post-metrics"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />)}
                      </div>
                    ) : (
                      <div className="px-5 py-9 text-center sm:px-8">
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><FileText size={28} /></div>
                        <h3 className="mt-4 text-xl font-semibold text-ink">Your page doesn’t have any posts yet</h3>
                        <p className="mt-2 text-sm text-muted-ink">Pages that share updates regularly can grow their audience.</p>
                        <button type="button" onClick={() => setCreatingPost(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand transition hover:bg-sky"><Plus size={17} />Start a post</button>
                      </div>
                    )}
                  </section>
                </div>
                <PostHighlights />
              </div>
            )}
            {section === "post-metrics" && <PostMetricsOverview companyPage={companyPage} companyPageId={companyPageId} postId={selectedMetricsPostId} onBack={() => setSection("posts")} />}
            {section === "analytics" && (
              <AnalyticsWorkspace
                companyPage={companyPage}
                companyPageId={companyPageId}
                selectedTab={analyticsTab}
                onSelectTab={setAnalyticsTab}
                data={analyticsData}
                loading={analyticsLoading}
                error={analyticsError}
                onLoadAnalytics={loadAnalytics}
              />
            )}
            {section === "feed" && <PageFeed companyPage={companyPage} />}
            {section === "activity" && <ActivityWorkspace companyPage={companyPage} companyPageId={companyPageId} onOpenAnalytics={() => { setSection("analytics"); setAnalyticsTab("Content"); }} />}
            {section === "inbox" && <InboxWorkspace onOpenSettings={() => selectSection("settings")} />}
            {section === "edit-page" && <CompanyPageEditor companyPage={companyPage} onSaved={(updatedPage) => setCompanyPage((current) => ({ ...current, ...updatedPage }))} />}
            {section === "jobs" && <CompanyPageJobs companyPage={companyPage} />}
            {section === "settings" && <CompanyPageSettings companyPage={companyPage} />}
          </div>
        </div>
      </div>
      {showCreateMenu && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreateMenu(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-create-title"
            className="w-full max-w-[690px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <h2 id="company-create-title" className="text-xl font-semibold text-ink">Create</h2>
              <button
                type="button"
                onClick={() => setShowCreateMenu(false)}
                aria-label="Close create menu"
                className="rounded-full p-1 text-muted-ink transition hover:bg-gray-100 hover:text-ink"
              >
                <X size={24} />
              </button>
            </header>
            <div className="max-h-[min(70dvh,600px)] overflow-y-auto p-5">
              <button
                type="button"
                onClick={() => {
                  setShowCreateMenu(false);
                  setCreatingPost(true);
                }}
                className="flex w-full items-start gap-4 rounded-lg px-4 py-4 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <PenSquare size={24} className="mt-0.5 shrink-0 text-gray-700" />
                <span>
                  <span className="block text-base font-semibold text-ink">Start a post</span>
                  <span className="mt-1 block text-sm text-muted-ink">Share content to connect with your followers</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateMenu(false);
                  navigate("/events?create=true");
                }}
                className="flex w-full items-start gap-4 rounded-lg px-4 py-4 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <CalendarDays size={24} className="mt-0.5 shrink-0 text-gray-700" />
                <span>
                  <span className="block text-base font-semibold text-ink">Create an event</span>
                  <span className="mt-1 block text-sm text-muted-ink">Host an event to grow your Page’s community</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateMenu(false);
                  navigate("/articles/new");
                }}
                className="flex w-full items-start gap-4 rounded-lg px-4 py-4 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Newspaper size={24} className="mt-0.5 shrink-0 text-gray-700" />
                <span>
                  <span className="block text-base font-semibold text-ink">Publish an article</span>
                  <span className="mt-1 block text-sm text-muted-ink">Connect with followers through long-form content</span>
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
      {creatingPost && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreatingPost(false); }}>
          <form onSubmit={publishPagePost} className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold text-ink">Create a post</h2><p className="mt-1 text-sm text-muted-ink">Posting as {companyPage.name}</p></div>
              <button type="button" onClick={() => setCreatingPost(false)} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-muted-ink hover:bg-gray-100">×</button>
            </div>
            <textarea autoFocus required={!postImage && !postVideo} maxLength={1000} rows={6} value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="What would you like to share?" className="mt-5 w-full resize-y rounded-lg border border-gray-300 p-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-ink">Text posts can contain up to 1,000 characters.</p>
              <span className="text-xs text-muted-ink">{postText.length}/1000</span>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={companyPage.active === false || (!postText.trim() && !postImage && !postVideo) || savingPost} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">{savingPost ? "Publishing…" : "Publish post"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Dashboard({ companyPage, onRefresh, onOpenSection, onCreatePost }) {
  const metrics = companyPage.metrics || {};
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">Company profile</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Page details</h2>
          </div>
          <button type="button" onClick={() => onOpenSection("analytics")} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-sky">
            View analytics <ChevronRight size={15} />
          </button>
        </div>
        <div className="mt-4 grid overflow-hidden rounded-lg border border-gray-100 bg-gray-50 sm:grid-cols-3">
          <InfoCell label="Industry" value={companyPage.industry} />
          <InfoCell label="Organization size" value={companyPage.companySize} />
          <InfoCell label="Organization type" value={companyPage.companyType} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-ink">Track performance</h2>
        <p className="mt-1 text-sm text-muted-ink">See how people are discovering and engaging with your Page.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Eye} label="Search appearances" value={metrics.searchAppearances ?? 0} period="All time" onClick={() => onOpenSection("analytics")} />
          <MetricCard icon={UsersRound} label="New followers" value={metrics.newFollowers ?? 0} period="Last 30 days" onClick={() => onOpenSection("analytics")} />
          <MetricCard icon={BarChart3} label="Post impressions" value={metrics.postImpressions ?? 0} period="All time" onClick={() => onOpenSection("analytics")} />
          <MetricCard icon={Building2} label="Page visitors" value={metrics.pageVisitors ?? 0} period="All time" onClick={() => onOpenSection("analytics")} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold text-ink">Manage recent posts</h2>
            <p className="mt-1 text-sm text-muted-ink">Manage your page’s content and amplify your reach.</p>
          </div>
          <button type="button" onClick={onCreatePost} className="inline-flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky"><Plus size={16} /> Start a post</button>
        </div>
        {companyPage.recentPosts?.length ? <PostCarousel posts={companyPage.recentPosts} companyPage={companyPage} onRefresh={onRefresh} onCreatePost={onCreatePost} />
          : <div className="px-5 pb-9 pt-5 text-center sm:px-8 sm:pb-10"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sky text-brand"><FileText size={34} /></div><h3 className="mt-4 text-lg font-semibold text-ink">Your page doesn’t have any posts yet</h3><p className="mt-1 text-sm text-muted-ink">Start a post to share updates with your followers.</p></div>}
        <button type="button" onClick={() => onOpenSection("posts")} className="w-full border-t border-gray-100 px-5 py-4 text-center text-sm font-semibold text-ink hover:bg-gray-50">Show all page posts <ChevronRight className="ml-1 inline" size={16} /></button>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6"><h2 className="text-xl font-semibold text-ink">Join conversations</h2><p className="mt-1 text-sm text-muted-ink">Build brand awareness and community by engaging with recent conversations.</p></div>
        {companyPage.followedPosts?.length ? <FollowedPostsCarousel posts={companyPage.followedPosts} companyPage={companyPage} />
          : <div className="px-5 pb-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><Newspaper size={28} /></div><h3 className="mt-3 font-semibold text-ink">Your feed is empty</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-ink">Follow other Pages in your industry to get new content inspiration.</p><Link to="/company-pages/discover" className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky"><Plus size={16} /> Add pages to follow</Link></div>}
        <button type="button" onClick={() => onOpenSection("feed")} className="w-full border-t border-gray-100 px-5 py-4 text-center text-sm font-semibold text-ink hover:bg-gray-50">Show feed <ChevronRight className="ml-1 inline" size={16} /></button>
      </section>
    </>
  );
}

function PostCarousel({ posts, companyPage, onRefresh, onCreatePost }) {
  const trackRef = useRef(null);
  const scroll = (direction) => trackRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
  return (
    <>
      <div className="flex justify-end gap-2 px-5 pb-3">
        <button type="button" aria-label="Previous posts" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 text-ink hover:bg-gray-50"><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Next posts" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 text-ink hover:bg-gray-50"><ChevronRight size={18} /></button>
      </div>
      <div ref={trackRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((post) => <PostCarouselCard key={post._id} post={post} companyPage={companyPage} owner onRefresh={onRefresh} />)}
        <div className="flex min-h-[300px] w-[min(82vw,360px)] shrink-0 snap-start flex-col justify-center rounded-xl border border-gray-200 p-5 sm:w-[360px]">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-sky text-brand"><FileText size={23} /></div>
          <p className="mt-4 text-sm text-muted-ink">Keep your followers up to date by sharing page news.</p>
          <button type="button" onClick={onCreatePost} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky"><Plus size={16} />Start a post</button>
        </div>
      </div>
    </>
  );
}

function FollowedPostsCarousel({ posts, companyPage }) {
  const trackRef = useRef(null);
  const scroll = (direction) => trackRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });
  return (
    <>
      <div className="flex justify-end gap-2 px-5 pb-3">
        <button type="button" aria-label="Previous followed posts" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 text-ink hover:bg-gray-50"><ChevronLeft size={18} /></button>
        <button type="button" aria-label="Next followed posts" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 text-ink hover:bg-gray-50"><ChevronRight size={18} /></button>
      </div>
      <div ref={trackRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((post) => <PostCarouselCard key={post._id} post={post} companyPage={post.page} pageOwner={companyPage} />)}
      </div>
    </>
  );
}

function PageFeed({ companyPage }) {
  const [posts, setPosts] = useState(companyPage.followedPosts || []);
  const [likingPostId, setLikingPostId] = useState("");
  const [repostingPostId, setRepostingPostId] = useState("");

  useEffect(() => {
    setPosts(companyPage.followedPosts || []);
  }, [companyPage.followedPosts]);

  const updatePost = (updatedPost) => {
    setPosts((current) => current.map((post) => post._id === updatedPost._id
      ? { ...post, ...updatedPost, companyPage: updatedPost.companyPage || post.companyPage }
      : post));
  };
  const handleLike = async (postId) => {
    if (likingPostId === postId) return;
    try {
      setLikingPostId(postId);
      const { data } = await api.post(`/posts/${postId}/like`);
      updatePost(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to like post");
    } finally {
      setLikingPostId("");
    }
  };
  const handleReact = async (postId, emoji) => {
    try {
      const { data } = await api.post(`/posts/${postId}/reaction`, { emoji });
      updatePost(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to react to post");
    }
  };
  const handleRepost = async (postId) => {
    if (repostingPostId === postId) return;
    try {
      setRepostingPostId(postId);
      await api.post(`/posts/${postId}/repost`);
      toast.success("Post reposted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to repost post");
    } finally {
      setRepostingPostId("");
    }
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <SectionHeading title="Feed" description="Recent posts from the Company Pages you follow." />
          {posts.length ? (
            <div className="space-y-4 p-4 sm:p-5">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={{ ...post, companyPage: post.page || post.companyPage }}
                  pageAdminFeed
                  onLike={handleLike}
                  onReact={handleReact}
                  onRepost={handleRepost}
                  liking={likingPostId === post._id}
                  reposting={repostingPostId === post._id}
                  onDismiss={(postId) => setPosts((current) => current.filter((item) => item._id !== postId))}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><Newspaper size={28} /></div>
              <h2 className="mt-4 font-semibold text-ink">Your feed is empty</h2>
              <p className="mt-1 text-sm text-muted-ink">Follow pages to see their recent posts here.</p>
              <Link to="/company-pages/discover" className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky"><Plus size={16} />Discover pages</Link>
            </div>
          )}
        </div>
      </section>
      <FollowedPagesSidebar pages={companyPage.followedPages || []} />
    </div>
  );
}

function FollowedPagesSidebar({ pages }) {
  return (
    <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <SectionHeading title="Pages you follow" description="Posts from these pages appear in your feed." />
      {pages.length ? (
        <div className="divide-y divide-gray-100">
          {pages.map((page) => (
            <Link key={page._id} to={`/company/${page.publicUrlSlug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              {page.logo?.url ? <img src={page.logo.url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-sky text-brand"><Building2 size={18} /></span>}
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{page.name}</span><span className="text-xs text-muted-ink">{Number(page.followerCount || 0).toLocaleString()} followers</span></span>
            </Link>
          ))}
        </div>
      ) : <p className="px-4 py-5 text-sm text-muted-ink">Followed pages will appear here.</p>}
      <Link to="/company-pages/discover" className="block border-t border-gray-100 px-4 py-3 text-center text-sm font-semibold text-brand hover:bg-gray-50">Discover pages</Link>
    </aside>
  );
}

function PostCarouselCard({ post, companyPage, owner = false, onRefresh, pageOwner }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const page = companyPage || {};
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/company/${page.publicUrlSlug}#post-${post._id}`);
      toast.success("Post link copied");
      setMenuOpen(false);
    } catch {
      toast.error("Unable to copy the post link");
    }
  };
  const deletePost = async () => {
    if (!window.confirm("Delete this page post? This cannot be undone.")) return;
    try {
      setBusy(true);
      await api.delete(`/posts/${post._id}`);
      toast.success("Post deleted");
      await onRefresh?.();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete post");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };
  const editPost = async () => {
    const text = window.prompt("Edit post text", post.text || "");
    if (text === null || text.trim() === (post.text || "")) return;
    if (!text.trim() && !post.image?.url && !post.video?.url) {
      toast.error("Post must include text, a photo, or a video");
      return;
    }
    try {
      setBusy(true);
      await api.put(`/posts/${post._id}`, { text: text.trim() });
      toast.success("Post updated");
      await onRefresh?.();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update post");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };
  const reportPost = async () => {
    const reason = window.prompt("Why are you reporting this post? Enter: spam, harassment, misinformation, inappropriate, or other", "spam");
    if (!reason) return;
    try {
      setBusy(true);
      await api.post(`/posts/${post._id}/report`, { reason: reason.trim().toLowerCase() });
      toast.success("Report submitted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to report post");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };
  return (
    <article className="relative flex min-h-[360px] w-[min(82vw,360px)] shrink-0 snap-start flex-col overflow-visible rounded-xl border border-gray-200 bg-white sm:w-[360px]">
      {!owner && <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted-ink"><span>Recent post from a page you follow</span><button type="button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100"><MoreHorizontal size={19} /></button></div>}
      {owner && <div className="flex items-center justify-between px-4 pt-3">
        {post.image?.url || post.video?.url ? <span className="rounded bg-sky px-2 py-1 text-[11px] font-semibold text-brand">Page post</span> : <span />}
        <button type="button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100"><MoreHorizontal size={19} /></button>
      </div>}
      {menuOpen && <div className="absolute right-3 top-12 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
        {owner && <button type="button" disabled={busy} onClick={editPost} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50 disabled:opacity-50"><Pencil size={16} />Edit post</button>}
        <button type="button" onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><Link2 size={16} />Copy link to post</button>
        {owner ? <button type="button" disabled={busy} onClick={deletePost} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-700 hover:bg-gray-50 disabled:opacity-50"><Trash2 size={16} />Delete post</button>
          : <button type="button" disabled={busy} onClick={reportPost} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50 disabled:opacity-50"><Flag size={16} />Report post</button>}
      </div>}
      <div className="flex items-center gap-3 px-4 py-2">
        {page.logo?.url ? <img src={page.logo.url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky text-brand"><Building2 size={19} /></span>}
        <div className="min-w-0"><Link to={`/company/${page.publicUrlSlug || ""}`} className="block truncate text-sm font-semibold text-ink hover:text-brand">{page.name || "Company Page"}</Link><p className="truncate text-xs text-muted-ink">{Number(page.followerCount ?? pageOwner?.metrics?.totalFollowers ?? 0).toLocaleString()} followers · {new Date(post.createdAt).toLocaleDateString()}</p></div>
      </div>
      <p className="line-clamp-4 min-h-12 px-4 pb-2 text-sm leading-5 text-ink">{post.text}</p>
      {post.image?.url ? <img src={post.image.url} alt="Page post" className="h-52 w-full bg-gray-50 object-cover" /> : post.video?.url ? <video src={post.video.url} controls className="h-52 w-full bg-black object-contain" /> : <div className="mx-4 grid h-48 flex-1 place-items-center rounded-lg bg-gray-50 text-muted-ink"><FileText size={30} /></div>}
      <div className="mt-auto flex justify-center border-t border-gray-100 py-3 text-xs text-muted-ink"><MessageCircle size={16} /></div>
    </article>
  );
}

function InfoCell({ label, value }) {
  return <div className="border-b border-gray-100 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
    <p className="text-xs font-medium text-muted-ink">{label}</p>
    <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
  </div>;
}

function MetricCard({ icon: Icon, label, value, period, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand/50 hover:bg-sky/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-ink"><Icon size={16} className="text-brand" />{label}</span>
      <p className="mt-3 text-2xl font-semibold text-ink">{Number(value).toLocaleString()}</p>
      <p className="mt-1 text-xs text-muted-ink">{period}</p>
    </button>
  );
}

const dateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const utcDateInputValue = (date) => date.toISOString().slice(0, 10);

const defaultAnalyticsRange = (days = 30) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: dateInputValue(start), endDate: dateInputValue(end) };
};

const formatAnalyticsDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function AnalyticsWorkspace({ companyPage, companyPageId, selectedTab, onSelectTab, data, loading, error, onLoadAnalytics }) {
  const initialRange = defaultAnalyticsRange();
  const [range, setRange] = useState(initialRange);
  const [metric, setMetric] = useState("impressions");
  const [editingCompetitors, setEditingCompetitors] = useState(false);
  const summary = data?.summary || {};

  useEffect(() => {
    onLoadAnalytics(range.startDate, range.endDate);
  }, [onLoadAnalytics, range.startDate, range.endDate]);

  const exportAnalytics = () => {
    const rows = selectedTab === "Content"
      ? [["Date", "Posts", "Post impressions (lifetime)", "Reactions", "Comments", "Reposts"], ...(data?.daily || []).map((row) => [row.date, row.posts, row.impressions, row.reactions, row.comments, row.reposts])]
      : selectedTab === "Followers"
        ? [["Followed at", "Industry", "Company", "Job title", "Location"], ...(data?.followers || []).map((follower) => [follower.followedAt, follower.industry, follower.company, follower.jobTitle, follower.location])]
        : selectedTab === "Competitors"
          ? [["Page", "Followers", "New followers", "Posts", "Comments", "Reactions"], ...(data?.comparison || []).map((page) => [page.name, page.followerCount, page.newFollowers, page.posts, page.comments, page.reactions])]
          : [["Metric", "Value", "Period"], ...(selectedTab === "Search appearances"
              ? [["Search appearances", summary.searchAppearancesAllTime || 0, "All time"]]
              : [])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `company-page-${selectedTab.toLowerCase().replaceAll(" ", "-")}-${range.startDate}-to-${range.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const refreshAnalytics = () => onLoadAnalytics(range.startDate, range.endDate);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <SectionHeading title="Analytics" description="Understand your page’s performance." />
        <div role="tablist" aria-label="Company page analytics" className="flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {analyticsTabs.map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={selectedTab === tab} onClick={() => onSelectTab(tab)} className={`shrink-0 border-b-2 py-3 text-sm font-semibold ${selectedTab === tab ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}>{tab}</button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:px-5">
        <DateRangePicker range={range} onChange={setRange} />
        <div className="flex items-center gap-2">
          {selectedTab === "Competitors" && <button type="button" onClick={() => setEditingCompetitors(true)} className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Edit competitors</button>}
          <button type="button" onClick={exportAnalytics} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Download size={16} />Export</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-white px-5 py-4 text-sm text-red-700">{error}<button type="button" onClick={refreshAnalytics} className="ml-3 font-semibold underline">Try again</button></div>}
      {loading && !data ? (
        <section className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-muted-ink">Loading analytics…</section>
      ) : (
        <>
          {selectedTab === "Content" && <ContentAnalytics data={data} companyPage={companyPage} metric={metric} onMetricChange={setMetric} range={range} />}
          {selectedTab === "Followers" && <FollowersAnalytics data={data} range={range} />}
          {selectedTab === "Search appearances" && <SearchAnalytics data={data} />}
          {selectedTab === "Competitors" && <CompetitorsAnalytics companyPage={companyPage} companyPageId={companyPageId} competitors={data?.competitors || []} comparison={data?.comparison || []} competitorSummary={data?.competitorSummary} range={range} onUpdated={refreshAnalytics} dialogOpen={editingCompetitors} onDialogChange={setEditingCompetitors} />}
        </>
      )}
    </div>
  );
}

function DateRangePicker({ range, onChange }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(range);
  const presets = [
    { label: "Last 15 days", days: 15 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "Last 365 days", days: 365 },
  ];

  const choosePreset = (days) => {
    onChange(defaultAnalyticsRange(days));
    setOpen(false);
    setCustom(false);
  };

  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => { setDraft(range); setOpen((value) => !value); }} className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand">
        <CalendarDays size={16} className="shrink-0 text-muted-ink" />
        <span className="truncate">{formatAnalyticsDate(range.startDate)} - {formatAnalyticsDate(range.endDate)}</span>
        <ChevronDown size={15} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 grid w-[min(92vw,520px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:grid-cols-[160px_minmax(0,1fr)]">
          <div className="border-b border-gray-100 p-2 sm:border-b-0 sm:border-r">
            {presets.map(({ label, days }) => (
              <button key={days} type="button" onClick={() => choosePreset(days)} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-ink hover:bg-gray-50">{label}{range.startDate === defaultAnalyticsRange(days).startDate && <Check size={15} className="text-brand" />}</button>
            ))}
            <button type="button" onClick={() => { setDraft(range); setCustom(true); }} className={`w-full rounded-md px-3 py-2.5 text-left text-sm ${custom ? "bg-sky font-semibold text-brand" : "text-ink hover:bg-gray-50"}`}>Custom</button>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold text-ink">Choose date range</p>
            <label className="mt-3 block text-xs font-medium text-muted-ink">Start date
              <input type="date" value={draft.startDate} max={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-ink" />
            </label>
            <label className="mt-3 block text-xs font-medium text-muted-ink">End date
              <input type="date" value={draft.endDate} min={draft.startDate} max={dateInputValue(new Date())} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-ink" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="button" disabled={!draft.startDate || !draft.endDate || draft.startDate > draft.endDate || Date.parse(`${draft.endDate}T00:00:00Z`) - Date.parse(`${draft.startDate}T00:00:00Z`) > 366 * 24 * 60 * 60 * 1000} onClick={() => { onChange(draft); setOpen(false); }} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({ title, value, caption, icon: Icon }) {
  return <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
    <div className="flex items-center gap-2 text-sm text-muted-ink">{Icon && <Icon size={16} className="text-brand" />}{title}</div>
    <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
    {caption && <p className="mt-1 text-xs text-muted-ink">{caption}</p>}
  </article>;
}

function ContentAnalytics({ data, companyPage, metric, onMetricChange, range }) {
  const summary = data?.summary || {};
  const [visiblePosts, setVisiblePosts] = useState(10);
  const metrics = [
    { key: "impressions", label: "Impressions", value: summary.impressionsOnPosts, available: true },
    { key: "membersReached", label: "Members reached", available: false },
    { key: "clicks", label: "Clicks", available: false },
    { key: "reactions", label: "Reactions", value: summary.reactions, available: true },
    { key: "comments", label: "Comments", value: summary.comments, available: true },
    { key: "reposts", label: "Reposts", value: summary.reposts, available: true },
    { key: "engagementRate", label: "Engagement rate", value: summary.impressionsOnPosts ? `${(((summary.reactions + summary.comments + summary.reposts) / summary.impressionsOnPosts) * 100).toFixed(1)}%` : "—", available: true },
  ];
  const selectedMetric = metrics.find((item) => item.key === metric) || metrics[0];
  const dailyRows = data?.daily || [];
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Your profile view highlights</h2>
        <p className="mt-1 text-sm text-muted-ink">Data for {formatAnalyticsDate(range.startDate)} - {formatAnalyticsDate(range.endDate)}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsHighlight title="Impressions" value={summary.impressionsOnPosts || 0} />
          <AnalyticsHighlight title="Reactions" value={summary.reactions || 0} />
          <AnalyticsHighlight title="Comments" value={summary.comments || 0} />
          <AnalyticsHighlight title="Reposts" value={summary.reposts || 0} />
        </div>
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Metrics</h2>
        <div className="mt-4">
          <label className="sr-only" htmlFor="company-page-analytics-metric">Choose metric</label>
          <select id="company-page-analytics-metric" value={metric} onChange={(event) => onMetricChange(event.target.value)} className="rounded-full border border-brand bg-brand px-4 py-2 text-sm font-semibold text-white outline-none">
            {metrics.map((item) => <option key={item.key} value={item.key} className="bg-white text-ink">{item.label}{item.available ? "" : " (not tracked)"}</option>)}
          </select>
        </div>
        {selectedMetric.available ? (
          <>
            <DailyAnalyticsChart rows={dailyRows} metric={metric} startDate={range.startDate} endDate={range.endDate} />
            <div className="mt-5 space-y-3 text-sm text-muted-ink">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3"><span><span className="mr-2 inline-block h-0.5 w-6 align-middle bg-blue-500" />Organic</span><span>{Number(selectedMetric.value || 0).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span><span className="mr-2 inline-block h-0.5 w-6 align-middle border-t-2 border-dashed border-gray-400" />Sponsored</span><span>Not tracked</span></div>
            </div>
          </>
        ) : (
          <div className="mt-5 flex min-h-56 items-center justify-center rounded-lg bg-gray-50 px-5 text-center text-sm text-muted-ink">This metric is not currently tracked, so no data is shown.</div>
        )}
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold text-ink">Content engagement</h2><p className="mt-2 text-sm text-muted-ink">Time range: <span className="font-medium text-ink">{formatAnalyticsDate(range.startDate)} - {formatAnalyticsDate(range.endDate)}</span></p></div>
          <label className="flex items-center gap-2 text-sm text-muted-ink">Show:
            <select value={visiblePosts} onChange={(event) => setVisiblePosts(Number(event.target.value))} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-ink">
              {[10, 25, 50, 100].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
        </div>
        {data?.recentPosts?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-700"><tr>
                {["Post title", "Post type", "Audience", "Impressions", "Views", "Clicks", "Reactions", "Comments", "Reposts", "Follows", "Engagement rate"].map((heading) => <th key={heading} className="sticky top-0 border-b border-gray-200 px-4 py-3 font-semibold">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentPosts.slice(0, visiblePosts).map((post) => {
                  const reactions = Number(post.reactionsCount || 0);
                  const comments = Number(post.commentsCount || 0);
                  const reposts = Number(post.repostsCount || 0);
                  const impressions = Number(post.impressions || 0);
                  const engagementRate = impressions ? ((reactions + comments + reposts) / impressions) * 100 : 0;
                  return <tr key={post._id} className="align-top text-ink">
                    <td className="max-w-72 px-4 py-4"><Link to={`/company/${companyPage.publicUrlSlug}#post-${post._id}`} className="font-medium text-brand hover:underline">{post.text?.trim() || "Media post"}</Link><p className="mt-1 text-xs text-muted-ink">Posted {new Date(post.createdAt).toLocaleDateString()}</p></td>
                    <td className="px-4 py-4">{post.image?.url ? "Image" : post.video?.url ? "Video" : "Text"}</td>
                    <td className="px-4 py-4">All followers</td>
                    <td className="px-4 py-4">{impressions.toLocaleString()}</td>
                    <td className="px-4 py-4">Not tracked</td>
                    <td className="px-4 py-4">Not tracked</td>
                    <td className="px-4 py-4">{reactions.toLocaleString()}</td>
                    <td className="px-4 py-4">{comments.toLocaleString()}</td>
                    <td className="px-4 py-4">{reposts.toLocaleString()}</td>
                    <td className="px-4 py-4">Not tracked</td>
                    <td className="px-4 py-4">{engagementRate.toFixed(1)}%</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptySection title="No posts in this date range" description="Published company page posts will appear here with their engagement." />}
      </section>
    </>
  );
}

function AnalyticsHighlight({ title, value }) {
  return <div><p className="text-2xl font-semibold text-ink">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-sm text-muted-ink">{title}</p></div>;
}

function DailyAnalyticsChart({ rows, metric, startDate, endDate }) {
  const days = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end && days.length < 367) {
    days.push(utcDateInputValue(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const values = new Map(rows.map((row) => {
    if (metric === "engagementRate") {
      const impressions = Number(row.impressions || 0);
      const interactions = Number(row.reactions || 0) + Number(row.comments || 0) + Number(row.reposts || 0);
      return [row.date, impressions ? (interactions / impressions) * 100 : 0];
    }
    return [row.date, Number(row[metric] || 0)];
  }));
  const max = Math.max(1, ...days.map((day) => values.get(day) || 0));
  const points = days.map((day, index) => {
    const x = days.length < 2 ? 50 : (index / (days.length - 1)) * 100;
    const y = 100 - ((values.get(day) || 0) / max) * 88;
    return `${x},${y}`;
  }).join(" ");
  const currentTotal = metric === "engagementRate"
    ? (() => {
      const totals = rows.reduce((result, row) => ({
        impressions: result.impressions + Number(row.impressions || 0),
        interactions: result.interactions + Number(row.reactions || 0) + Number(row.comments || 0) + Number(row.reposts || 0),
      }), { impressions: 0, interactions: 0 });
      return totals.impressions ? (totals.interactions / totals.impressions) * 100 : 0;
    })()
    : days.reduce((total, day) => total + (values.get(day) || 0), 0);
  return (
    <div className="mt-5 rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-ink">{metric === "engagementRate" ? `${currentTotal.toFixed(1)}% engagement rate` : `${currentTotal.toLocaleString()} ${metric === "posts" ? "posts" : metric}`}</span><span className="text-xs text-muted-ink">{formatAnalyticsDate(startDate)} - {formatAnalyticsDate(endDate)}</span></div>
      <div className="mt-5 h-48 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${metric} trend`} className="h-full w-full overflow-visible">
          {[25, 50, 75, 100].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="currentColor" className="text-gray-100" strokeWidth="0.5" />)}
          <polyline points={points} fill="none" stroke="#0a66c2" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-ink"><span>{formatAnalyticsDate(startDate)}</span><span>{formatAnalyticsDate(endDate)}</span></div>
      {!currentTotal && <p className="mt-4 text-center text-xs text-muted-ink">No {metric} activity in this date range.</p>}
    </div>
  );
}

function FollowersAnalytics({ data, range }) {
  const summary = data?.summary || {};
  const [demographic, setDemographic] = useState("Location");
  const [followerType, setFollowerType] = useState("People");
  const [showAllFollowers, setShowAllFollowers] = useState(false);
  const valueKey = { Location: "location", Company: "company", "Job title": "jobTitle", Industry: "industry" }[demographic];
  const groups = (data?.followers || []).reduce((result, follower) => {
    const value = follower[valueKey]?.trim();
    if (value) result.set(value, (result.get(value) || 0) + 1);
    return result;
  }, new Map());
  const topGroups = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Follower highlights</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <AnalyticsCard title="Total followers" value={Number(summary.totalFollowers || 0).toLocaleString()} caption="Current audience" icon={UsersRound} />
          <AnalyticsCard title="New followers" value={Number(summary.newFollowers || 0).toLocaleString()} caption="In the selected date range" icon={Plus} />
        </div>
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Follower metrics</h2>
        <DailyAnalyticsChart rows={followerDailyRows(data?.followerEvents || [])} metric="followers" startDate={range.startDate} endDate={range.endDate} />
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Follower demographics</h2>
        <select value={demographic} onChange={(event) => setDemographic(event.target.value)} className="mt-4 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink">
          {["Location", "Company", "Job title", "Industry"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {topGroups.length ? <div className="mt-4 space-y-3">{topGroups.map(([label, count]) => { const percentage = summary.totalFollowers ? Math.round((count / summary.totalFollowers) * 100) : 0; return <div key={label}><div className="flex justify-between gap-4 text-sm"><span className="truncate text-ink">{label} · {count} ({percentage}%)</span></div><div className="mt-1 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(4, percentage)}%` }} /></div></div>; })}</div> : <EmptySection title="Demographics unavailable" description="Follower profile details will appear here when available." />}
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-5"><h2 className="text-lg font-semibold text-ink">All followers</h2><p className="mt-1 text-sm text-muted-ink">Excluded from report</p><div className="mt-4 flex gap-2"><button type="button" aria-pressed={followerType === "People"} onClick={() => setFollowerType("People")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${followerType === "People" ? "border-brand bg-brand text-white" : "border-gray-300 text-ink hover:bg-gray-50"}`}>People</button><button type="button" aria-pressed={followerType === "Pages"} onClick={() => setFollowerType("Pages")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${followerType === "Pages" ? "border-brand bg-brand text-white" : "border-gray-300 text-ink hover:bg-gray-50"}`}>Pages</button></div></div>
        {followerType === "Pages" ? <EmptySection title="No followed pages" description="Company page followers are currently individual member accounts." /> : data?.followers?.length ? <div className="divide-y divide-gray-100">{(showAllFollowers ? data.followers : data.followers.slice(0, 5)).map((follower, index) => <div key={`${follower.followedAt}-${index}`} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500"><UsersRound size={20} /></span><div><p className="font-medium text-ink">{follower.jobTitle || follower.company || "CareerLink member"}</p><p className="mt-1 text-xs text-muted-ink">{[follower.company, follower.location].filter(Boolean).join(" · ") || "Profile details not provided"} · Followed {new Date(follower.followedAt).toLocaleDateString()}</p></div></div>)}</div> : <EmptySection title="No followers yet" description="People who follow this Company Page will appear here." />}
        {followerType === "People" && data?.followers?.length > 5 && <button type="button" onClick={() => setShowAllFollowers((value) => !value)} className="w-full border-t border-gray-100 px-5 py-4 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">{showAllFollowers ? "Show fewer followers" : "Show all followers"} <ChevronRight className={`ml-1 inline ${showAllFollowers ? "rotate-90" : ""}`} size={16} /></button>}
      </section>
    </>
  );
}

function followerDailyRows(followers) {
  const counts = new Map();
  for (const follower of followers) {
    const day = utcDateInputValue(new Date(follower.followedAt));
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  return [...counts].map(([date, value]) => ({ date, followers: value }));
}

function SearchAnalytics({ data }) {
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Search appearance highlights</h2>
        <p className="mt-1 text-sm text-muted-ink">Search appearance events are stored as an all-time total, not by date.</p>
        <div className="mt-5"><AnalyticsCard title="Page searches" value={Number(data?.summary?.searchAppearancesAllTime || 0).toLocaleString()} caption="All time" icon={Search} /></div>
      </section>
      <UnavailableAnalytics title="Top Page searcher demographics" description="Demographic information will appear once dated search activity is tracked." />
      <UnavailableAnalytics title="Top keywords to find your Page" description="Search terms are not stored, so keyword analytics are unavailable." />
    </>
  );
}

function CompetitorsAnalytics({ companyPageId, competitors, comparison, competitorSummary, range, onUpdated, dialogOpen, onDialogChange }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(competitors[0]?._id || "");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setSelectedId(competitors[0]?._id || ""), [competitors]);

  useEffect(() => {
    if (!dialogOpen || !search.trim()) {
      setResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const { data } = await api.get(`/company-pages/${companyPageId}/competitors/search`, { params: { search: search.trim() } });
        if (active) setResults(data.companyPages || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to search company pages");
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [companyPageId, dialogOpen, search]);

  const saveCompetitor = async () => {
    try {
      setSaving(true);
      setError("");
      await api.put(`/company-pages/${companyPageId}/competitors`, { competitorIds: selectedId ? [selectedId] : [] });
      onDialogChange(false);
      await onUpdated();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save competitors");
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = () => {
    setSelectedId(competitors[0]?._id || "");
    setError("");
    onDialogChange(false);
  };

  const competitor = competitors.find((page) => page._id === selectedId);
  const comparisonRows = comparison.length
    ? [...comparison.filter((row) => row._id !== companyPageId), ...comparison.filter((row) => row._id === companyPageId)]
    : [];
  const periodLabel = `${formatAnalyticsDate(range.startDate)} - ${formatAnalyticsDate(range.endDate)}`;
  return (
    <>
      {competitor ? (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Competitor highlights</h2>
            <p className="mt-1 text-sm text-muted-ink">{periodLabel}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div><p className="text-2xl font-semibold text-ink">{Number(competitorSummary?.comments || 0).toLocaleString()}</p><p className="text-sm text-muted-ink">Comments on posts</p></div>
              <div><p className="text-2xl font-semibold text-ink">{Number(competitorSummary?.newFollowers || 0).toLocaleString()}</p><p className="text-sm text-muted-ink">New followers</p></div>
            </div>
            <p className="mt-4 text-xs text-muted-ink">Comment and reaction totals reflect current engagement on posts published during this period.</p>
          </section>
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-5">
              <h2 className="text-lg font-semibold text-ink">Compare growth</h2>
              <p className="mt-1 text-sm text-muted-ink">{periodLabel}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[790px] text-left text-sm">
                <thead className="text-xs text-muted-ink"><tr>
                  <th className="px-5 py-4 font-medium">Competitors</th>
                  <th className="px-4 py-4 font-medium">New followers</th>
                  <th className="px-4 py-4 font-medium">Posts</th>
                  <th className="px-4 py-4 font-medium">Comments</th>
                  <th className="px-4 py-4 font-medium">Comments per day</th>
                  <th className="px-4 py-4 font-medium">Reactions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonRows.map((row, index) => <tr key={row._id} className="text-ink">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-3 text-muted-ink">{index + 1}</span>
                        {row.logo?.url ? <img src={row.logo.url} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-sky text-brand"><Building2 size={18} /></span>}
                        <span><span className="block font-semibold">{row.name}{index === 0 && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">You</span>}</span><span className="block text-xs text-muted-ink">{Number(row.followerCount || 0).toLocaleString()} followers</span></span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{Number(row.newFollowers || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">{Number(row.posts || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">{Number(row.comments || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">{Number(row.commentsPerDay || 0).toLocaleString()}</td>
                    <td className="px-4 py-4">{Number(row.reactions || 0).toLocaleString()}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sky text-brand"><BarChart3 size={28} /></div>
          <h2 className="mt-4 text-lg font-semibold text-ink">Track a competitor</h2>
          <p className="mt-1 text-sm text-muted-ink">Compare public follower totals with a relevant Company Page.</p>
          <button type="button" onClick={() => onDialogChange(true)} className="mt-5 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">Add competitors</button>
        </section>
      )}
      {dialogOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="competitor-title" className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 id="competitor-title" className="text-lg font-semibold text-ink">Edit competitors</h2><button type="button" onClick={closeDialog} aria-label="Close" className="rounded-full p-2 text-muted-ink hover:bg-gray-100"><X size={20} /></button></header>
          <div className="border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-ink">Select and track your top competitor</h3><p className="mt-1 text-sm text-muted-ink">Compare public follower counts. Up to 1 competitor.</p><label className="relative mt-3 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by page name" className="w-full rounded-full border border-gray-300 py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand" /></label></div>
          <div className="min-h-44 flex-1 overflow-y-auto p-5">
            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            {searching ? <p className="py-8 text-center text-sm text-muted-ink">Searching…</p> : results.length ? <div className="space-y-2">{results.map((page) => <button key={page._id} type="button" onClick={() => setSelectedId(page._id)} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${selectedId === page._id ? "border-brand bg-sky/50" : "border-gray-200 hover:bg-gray-50"}`}>{page.logo?.url ? <img src={page.logo.url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky text-brand"><Building2 size={20} /></span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{page.name}</span><span className="block text-xs text-muted-ink">{page.industry}</span></span>{selectedId === page._id && <Check size={18} className="text-brand" />}</button>)}</div> : <div className="py-8 text-center"><h3 className="font-semibold text-ink">{search ? "No company pages found" : competitors.length ? "Current competitor selected" : "No competitors added"}</h3><p className="mt-1 text-sm text-muted-ink">{search ? "Try another page name." : "Search for pages to add to your list."}</p>{competitors.length > 0 && <button type="button" onClick={() => setSelectedId("")} className="mt-3 text-sm font-semibold text-red-700 hover:underline">Remove current competitor</button>}</div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4"><button type="button" onClick={closeDialog} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={saving} onClick={saveCompetitor} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></footer>
        </section>
      </div>}
    </>
  );
}

function ActivityWorkspace({ companyPage, companyPageId, onOpenAnalytics }) {
  const [selectedTab, setSelectedTab] = useState("All");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/company-pages/${companyPageId}/activity`);
        if (active) setEvents(data.events || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load page activity");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadActivity();
    return () => { active = false; };
  }, [companyPageId]);

  const tabs = ["All", "Comments", "Mentions", "Reactions", "Reposts", "Analytics"];
  const eventType = { Comments: "comment", Mentions: "mention", Reactions: "reaction", Reposts: "repost" }[selectedTab];
  const visibleEvents = eventType ? events.filter((event) => event.type === eventType) : events;
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <SectionHeading title="Activity" description="Keep track of the activity around your page" />
        <div role="tablist" aria-label="Company page activity" className="flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={selectedTab === tab} onClick={() => setSelectedTab(tab)} className={`shrink-0 border-b-2 py-3 text-sm font-semibold ${selectedTab === tab ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}>{tab}</button>)}
        </div>
      </section>
      {selectedTab === "Reactions" && <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-muted-ink">Reaction totals are current counts on recent posts; individual reaction timestamps are not stored.</p>}
      {selectedTab === "Analytics" ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Page analytics</h2>
          <p className="mt-1 text-sm text-muted-ink">Review your page performance and audience activity.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <AnalyticsCard title="Followers" value={Number(companyPage.metrics?.totalFollowers || 0).toLocaleString()} caption="Current audience" icon={UsersRound} />
            <AnalyticsCard title="Published posts" value={Number(companyPage.metrics?.postCount || 0).toLocaleString()} caption="Company page posts" icon={Newspaper} />
          </div>
          <button type="button" onClick={onOpenAnalytics} className="mt-5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Open analytics</button>
        </section>
      ) : (
        <section className="min-h-[360px] rounded-xl border border-gray-200 bg-white shadow-sm">
          {error ? <div role="alert" className="p-6 text-center text-sm text-red-700">{error}</div>
            : loading ? <div className="p-10 text-center text-sm text-muted-ink">Loading activity…</div>
              : visibleEvents.length ? <div className="divide-y divide-gray-100">{visibleEvents.map((event) => <ActivityEvent key={event._id} event={event} />)}</div>
                : <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[#fff0eb] text-brand"><Activity size={44} strokeWidth={1.5} /></div>
                  <h2 className="mt-5 text-lg font-semibold text-ink">No activity yet</h2>
                  <p className="mt-1 max-w-md text-sm text-muted-ink">Comments, mentions, reactions, and reposts around {companyPage.name} will appear here.</p>
                </div>}
        </section>
      )}
    </div>
  );
}

function ActivityEvent({ event }) {
  const labels = { comment: "commented on a page post", mention: "mentioned your page", reaction: "has current reactions on a page post", repost: "reposted a page post" };
  return (
    <article className="flex gap-3 px-5 py-4">
      {event.actor?.profilePicture?.url ? <img src={event.actor.profilePicture.url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky text-brand"><Activity size={18} /></span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink"><span className="font-semibold">{event.actor?.name || "Page activity"}</span> {labels[event.type]}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{event.text}</p>
        {event.postText && <blockquote className="mt-2 border-l-2 border-gray-200 pl-3 text-sm text-muted-ink">{event.postText}</blockquote>}
        <time className="mt-2 block text-xs text-muted-ink">{new Date(event.createdAt).toLocaleString()}</time>
      </div>
    </article>
  );
}

function InboxWorkspace({ onOpenSettings }) {
  const [folder, setFolder] = useState("Inbox");
  const [topic, setTopic] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const topics = ["Service request", "Request a demo", "Support", "Careers", "Other"];
  const folderItems = ["Inbox", "Archived", "Spam"];
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold text-ink">Inbox</h2>
        <label className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" aria-label="Search messages" className="w-full rounded-md bg-[#eef3f8] py-2 pl-9 pr-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30" />
        </label>
        <div className="relative ml-auto">
          <button type="button" aria-label="Inbox options" aria-expanded={openMenu === "options"} onClick={() => setOpenMenu(openMenu === "options" ? "" : "options")} className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"><MoreHorizontal size={22} /></button>
          {openMenu === "options" && <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button type="button" onClick={() => { setFolder("Inbox"); setTopic(""); setUnreadOnly(false); setSearch(""); setOpenMenu(""); }} className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-gray-50">Refresh inbox</button>
            <button type="button" onClick={() => { setOpenMenu(""); onOpenSettings(); }} className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-gray-50">Inbox settings</button>
          </div>}
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="relative">
          <button type="button" aria-expanded={openMenu === "folder"} onClick={() => setOpenMenu(openMenu === "folder" ? "" : "folder")} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${folder === "Inbox" ? "bg-emerald-700 text-white" : "border border-gray-300 text-ink hover:bg-gray-50"}`}>{folder}<ChevronDown size={15} /></button>
          {openMenu === "folder" && <InboxDropdown items={folderItems} onSelect={(value) => { setFolder(value); setOpenMenu(""); }} />}
        </div>
        <span className="h-7 border-l border-gray-300" />
        <div className="relative">
          <button type="button" aria-expanded={openMenu === "topics"} onClick={() => setOpenMenu(openMenu === "topics" ? "" : "topics")} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-ink hover:bg-gray-50">{topic || "Topics"}<ChevronDown size={15} /></button>
          {openMenu === "topics" && <InboxDropdown items={topics} onSelect={(value) => { setTopic(topic === value ? "" : value); setOpenMenu(""); }} />}
        </div>
        <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly((value) => !value)} className={`rounded-full border px-4 py-2 text-sm font-medium ${unreadOnly ? "border-brand bg-sky text-brand" : "border-gray-300 text-ink hover:bg-gray-50"}`}>Unread</button>
      </div>
      <div className="grid min-h-[520px] md:grid-cols-[minmax(240px,38%)_1fr]">
        <div className="flex min-h-44 items-center justify-center border-b border-gray-200 px-4 text-sm text-muted-ink md:border-b-0 md:border-r">No messages</div>
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="grid h-36 w-36 place-items-center rounded-full bg-[#fff0eb] text-brand"><MailOpen size={62} strokeWidth={1.25} /></div>
          <h3 className="mt-5 text-2xl font-semibold text-ink">No messages yet</h3>
          <p className="mt-2 max-w-sm text-base leading-7 text-muted-ink">New messages your page receives will show up here.</p>
          {(search || topic || unreadOnly || folder !== "Inbox") && <button type="button" onClick={() => { setFolder("Inbox"); setTopic(""); setUnreadOnly(false); setSearch(""); }} className="mt-4 text-sm font-semibold text-brand hover:underline">Clear filters</button>}
        </div>
      </div>
    </section>
  );
}

function InboxDropdown({ items, onSelect }) {
  return <div className="absolute left-0 top-full z-30 mt-2 min-w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">{items.map((item) => <button key={item} type="button" onClick={() => onSelect(item)} className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-gray-50">{item}</button>)}</div>;
}

function UnavailableAnalytics({ title, description }) {
  return <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold text-ink">{title}</h2><div className="flex min-h-48 flex-col items-center justify-center py-8 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-sky text-brand"><BarChart3 size={22} /></span><h3 className="mt-3 font-semibold text-ink">Data not available</h3><p className="mt-1 max-w-lg text-sm text-muted-ink">{description}</p></div></section>;
}

function PagePostCard({ post, companyPage, companyPageId, onRefresh, onShowMetrics }) {
  const { user } = useAuth();
  const [postState, setPostState] = useState(post);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [busy, setBusy] = useState(false);
  const liked = (postState.likes || []).some((like) => (like?._id || like)?.toString() === user?._id?.toString());
  const reactions = (postState.likes || []).length + (postState.reactions || []).length;

  useEffect(() => setPostState(post), [post]);

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      const { data } = await api.get(`/company-pages/${companyPageId}/posts/${post._id}/metrics`);
      setMetrics(data.metrics);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to load post results");
    } finally {
      setMetricsLoading(false);
    }
  };

  const toggleResults = async () => {
    const next = !showResults;
    setShowResults(next);
    if (next && !metrics) await loadMetrics();
  };

  const likePost = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      setPostState((current) => ({ ...current, likes: data.likes || current.likes }));
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update like");
    }
  };

  const repostPost = async () => {
    try {
      await api.post(`/posts/${post._id}/repost`);
      toast.success("Post reposted");
      await loadMetrics();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to repost");
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim() || commenting) return;
    try {
      setCommenting(true);
      await api.post("/comments", { postId: post._id, text: commentText.trim() });
      setCommentText("");
      setPostState((current) => ({ ...current, commentsCount: (current.commentsCount || 0) + 1 }));
      if (metrics) setMetrics((current) => ({ ...current, comments: (current.comments || 0) + 1, engagements: (current.engagements || 0) + 1 }));
      toast.success("Comment posted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to post comment");
    } finally {
      setCommenting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/company/${companyPage.publicUrlSlug}#post-${post._id}`);
      toast.success("Post link copied");
      setMenuOpen(false);
    } catch {
      toast.error("Unable to copy the post link");
    }
  };

  const editPost = async () => {
    const text = window.prompt("Edit post text", postState.text || "");
    if (text === null || text.trim() === (postState.text || "")) return;
    if (!text.trim() && !postState.image?.url && !postState.video?.url) {
      toast.error("Post must include text, a photo, or a video");
      return;
    }
    try {
      setBusy(true);
      await api.put(`/posts/${post._id}`, { text: text.trim() });
      toast.success("Post updated");
      await onRefresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update post");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this page post? This cannot be undone.")) return;
    try {
      setBusy(true);
      await api.delete(`/posts/${post._id}`);
      toast.success("Post deleted");
      await onRefresh();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete post");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  };

  return (
    <article id={`post-${post._id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-muted-ink">
        <span>By {user?.name || "Page admin"} · {new Date(postState.createdAt).toLocaleDateString()}</span>
        <div className="relative">
          <button type="button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><MoreHorizontal size={20} /></button>
          {menuOpen && <div className="absolute right-0 top-full z-30 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
            <button type="button" disabled={busy} onClick={editPost} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50 disabled:opacity-50"><Pencil size={16} />Edit post</button>
            <button type="button" onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-gray-50"><Link2 size={16} />Copy link to post</button>
            <button type="button" disabled={busy} onClick={deletePost} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-700 hover:bg-gray-50 disabled:opacity-50"><Trash2 size={16} />Delete post</button>
          </div>}
        </div>
      </header>
      <div className="mx-5 border-t border-gray-100" />
      <div className="flex items-center gap-3 px-5 py-3">
        {companyPage.logo?.url ? <img src={companyPage.logo.url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky text-brand"><Building2 size={21} /></span>}
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{companyPage.name}</p><p className="text-xs text-muted-ink">{Number(companyPage.metrics?.totalFollowers || 0).toLocaleString()} followers · {new Date(postState.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · Public</p></div>
      </div>
      {postState.text && <p className="whitespace-pre-wrap break-words px-5 pb-3 text-sm leading-6 text-ink">{postState.text}</p>}
      {postState.image?.url && <img src={postState.image.url} alt="Company page post" className="max-h-[560px] w-full bg-gray-50 object-contain" />}
      {postState.video?.url && <video src={postState.video.url} controls className="max-h-[560px] w-full bg-black object-contain" />}
      <div className="flex items-center justify-between px-5 py-2 text-xs text-muted-ink"><span>{reactions.toLocaleString()} reactions</span><span>{Number(postState.commentsCount || 0).toLocaleString()} comments{metrics ? ` · ${Number(metrics.reposts || 0).toLocaleString()} reposts` : ""}</span></div>
      <div className="grid grid-cols-3 border-b border-gray-100 px-2 py-1">
        <button type="button" aria-pressed={liked} onClick={likePost} className={`inline-flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium hover:bg-gray-50 ${liked ? "text-brand" : "text-gray-700"}`}><ThumbsUp size={17} />{liked ? "Liked" : "Like"}</button>
        <a href={`#comment-${post._id}`} onClick={() => document.getElementById(`comment-input-${post._id}`)?.focus()} className="inline-flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><MessageCircle size={17} />Comment</a>
        <button type="button" onClick={repostPost} className="inline-flex items-center justify-center gap-2 rounded-md py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Repeat2 size={17} />Repost</button>
      </div>
      <form id={`comment-${post._id}`} onSubmit={submitComment} className="flex items-center gap-2 px-5 py-3">
        {user?.profilePicture?.url ? <img src={user.profilePicture.url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky text-xs font-semibold text-brand">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>}
        <input id={`comment-input-${post._id}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} disabled={postState.commentsDisabled} placeholder={postState.commentsDisabled ? "Comments are turned off" : `Comment as ${user?.name || "you"}…`} maxLength={500} className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm text-ink outline-none focus:border-brand disabled:bg-gray-50" />
        <button type="submit" disabled={!commentText.trim() || commenting || postState.commentsDisabled} className="rounded-full px-3 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-50">{commenting ? "Posting…" : "Post"}</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-muted-ink">
        <span>Organic impressions: {Number(postState.impressions || 0).toLocaleString()} impressions</span>
        <button type="button" aria-expanded={showResults} onClick={toggleResults} className="inline-flex items-center gap-2 font-medium hover:text-brand">{showResults ? "Hide results" : "Preview results"}<ChevronDown size={16} className={showResults ? "rotate-180" : ""} /></button>
      </div>
      {showResults && <div className="bg-gray-50 px-5 py-5">
        <h3 className="font-semibold text-ink">Post performance <span className="ml-1 text-muted-ink" title="Metrics are based on data currently tracked by CareerLink">ⓘ</span></h3>
        <p className="mt-1 text-sm text-muted-ink">Targeted to: All followers</p>
        {metricsLoading ? <p className="mt-5 text-sm text-muted-ink">Loading results…</p> : !metrics ? <button type="button" onClick={loadMetrics} className="mt-4 text-sm font-semibold text-brand hover:underline">Try loading results again</button> : <>
          <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <MetricValue label="Impressions" value={metrics.impressions} />
            <MetricValue label="Engagement rate" value={`${Number(metrics.engagementRate || 0).toFixed(1)}%`} />
            <MetricValue label="Clicks" value="Not tracked" />
            <MetricValue label="Click-through rate" value="Not tracked" />
            <MetricValue label="Reactions" value={metrics.reactions} />
            <MetricValue label="Comments" value={metrics.comments} />
            <MetricValue label="Reposts" value={metrics.reposts} />
          </div>
          <button type="button" onClick={onShowMetrics} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-brand">Show all results <ChevronRight size={17} /></button>
        </>}
      </div>}
    </article>
  );
}

function MetricValue({ label, value }) {
  return <div><p className="font-semibold text-ink">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="text-sm text-muted-ink">{label}</p></div>;
}

function PostMetricsOverview({ companyPage, companyPageId, postId, onBack }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/company-pages/${companyPageId}/posts/${postId}/metrics`);
        if (active) setResult(data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load post metrics");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadMetrics();
    return () => { active = false; };
  }, [companyPageId, postId]);
  const post = result?.post;
  const metrics = result?.metrics || {};
  const cards = [
    ["Impressions", metrics.impressions],
    ["Members reached", metrics.membersReached ?? "Not tracked"],
    ["Page viewers from this post", metrics.pageViewers ?? "Not tracked"],
    ["Followers gained from this post", metrics.followersGained ?? "Not tracked"],
    ["Engagements", metrics.engagements],
    ["Engagement rate", `${Number(metrics.engagementRate || 0).toFixed(1)}%`],
    ["Clicks", metrics.clicks ?? "Not tracked"],
    ["Click-through rate", metrics.clickThroughRate ?? "Not tracked"],
    ["Reactions", metrics.reactions],
    ["Comments", metrics.comments],
    ["Reposts", metrics.reposts],
  ];
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-5 text-left text-xl font-semibold text-ink shadow-sm hover:text-brand"><ChevronLeft size={22} />Metrics overview</button>
      {loading ? <section className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading post metrics…</section>
        : error ? <section role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">{error}</section>
          : <>
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <SectionHeading title="Post analytics" description="" />
              <div className="flex flex-wrap items-start gap-4 px-5 py-5 sm:px-7">
                <p className="w-full text-sm text-muted-ink">{companyPage.name} posted this · {new Date(post.createdAt).toLocaleString()}</p>
                {post.image?.url && <img src={post.image.url} alt="Post preview" className="h-20 w-20 rounded-lg object-cover" />}
                {post.video?.url && <video src={post.video.url} className="h-20 w-20 rounded-lg bg-black object-cover" />}
                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-ink">{post.text}</p>
              </div>
              <div className="border-t border-gray-100 px-5 py-4 text-sm text-muted-ink sm:px-7">Targeted to: All followers</div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold text-ink">Organic discovery</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2"><MetricValue label="Impressions" value={metrics.impressions} /><MetricValue label="Members reached" value={metrics.membersReached ?? "Not tracked"} /></div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold text-ink">Organic page activity</h2>
              <div className="mt-4 divide-y divide-gray-100">{[["Page viewers from this post", metrics.pageViewers ?? "Not tracked"], ["Followers gained from this post", metrics.followersGained ?? "Not tracked"]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted-ink">{label}</span><span className="text-ink">{typeof value === "number" ? value.toLocaleString() : value}</span></div>)}</div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold text-ink">Organic engagement</h2>
              <div className="mt-4 divide-y divide-gray-100">{cards.slice(4).map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted-ink">{label}</span><span className="text-ink">{typeof value === "number" ? value.toLocaleString() : value}</span></div>)}</div>
            </section>
          </>}
    </div>
  );
}

function PostHighlights() {
  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-ink">Post highlights</h2>
      <p className="mt-1 text-sm text-muted-ink">In the last 30 days</p>
      <div className="flex min-h-64 flex-col items-center justify-center py-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-sky text-brand"><BarChart3 size={27} /></span>
        <h3 className="mt-4 text-lg font-semibold text-ink">No highlights</h3>
        <p className="mt-1 text-sm text-muted-ink">No recent post to highlight.</p>
      </div>
    </aside>
  );
}

function SectionHeading({ title, description }) {
  return <header className="border-b border-gray-100 px-5 py-5"><h2 className="text-lg font-semibold text-ink">{title}</h2><p className="mt-1 text-sm text-muted-ink">{description}</p></header>;
}

function EmptySection({ title, description }) {
  return <div className="px-5 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky text-brand"><Building2 size={22} /></div><h3 className="mt-4 font-semibold text-ink">{title}</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-ink">{description}</p></div>;
}
