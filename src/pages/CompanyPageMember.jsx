import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Building2, Check, Plus, UsersRound, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import PostCard from "../components/feed/PostCard.jsx";
import useAuth from "../hooks/useAuth.js";

export default function CompanyPageMember() {
  const { publicUrlSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [companyPage, setCompanyPage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("Home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [updatingFollow, setUpdatingFollow] = useState(false);
  const [likingPostId, setLikingPostId] = useState("");
  const [repostingPostId, setRepostingPostId] = useState("");
  const [savedPostIds, setSavedPostIds] = useState([]);
  const [messageTopicsOpen, setMessageTopicsOpen] = useState(false);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get(`/company-pages/public/${encodeURIComponent(publicUrlSlug)}`);
      setCompanyPage(data.companyPage);
      setPosts(data.posts || []);
      setJobs(data.jobs || []);
      setFollowing(Boolean(data.companyPage.isFollowing));
      setFollowerCount(Number(data.companyPage.followerCount) || 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this company page");
    } finally {
      setLoading(false);
    }
  }, [publicUrlSlug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedPostIds([]);
      return undefined;
    }

    let active = true;
    api.get("/posts/saved")
      .then(({ data }) => {
        if (active) setSavedPostIds((data.savedPosts || []).map((post) => post._id));
      })
      .catch((requestError) => {
        if (active) toast.error(requestError.response?.data?.message || "Unable to load saved posts");
      });
    return () => { active = false; };
  }, [isAuthenticated]);

  const requireAuthentication = () => {
      if (isAuthenticated) return true;
      navigate("/login", {
        state: { from: `${location.pathname}${location.search}` },
      });
      return false;
  };

  const updatePost = (updatedPost) => {
    setPosts((current) => current.map((post) => post._id === updatedPost._id
      ? { ...post, ...updatedPost, companyPage: updatedPost.companyPage || post.companyPage }
      : post));
  };

  const handleLike = async (postId) => {
    if (likingPostId === postId) return;
    if (!requireAuthentication()) return;
    try {
      setLikingPostId(postId);
      const { data } = await api.post(`/posts/${postId}/like`);
      updatePost(data);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to like post");
    } finally {
      setLikingPostId("");
    }
  };

  const handleReact = async (postId, emoji) => {
    if (!requireAuthentication()) return;
    try {
      const { data } = await api.post(`/posts/${postId}/reaction`, { emoji });
      updatePost(data);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to react to post");
    }
  };

  const handleRepost = async (postId) => {
    if (repostingPostId === postId) return;
    if (!requireAuthentication()) return;
    try {
      setRepostingPostId(postId);
      await api.post(`/posts/${postId}/repost`);
      toast.success("Post reposted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to repost post");
    } finally {
      setRepostingPostId("");
    }
  };

  const handleToggleSave = async (postId) => {
    if (!requireAuthentication()) {
      return { saved: savedPostIds.includes(postId) };
    }
    try {
      const { data } = await api.post(`/posts/${postId}/save`);
      setSavedPostIds((current) => data.saved
        ? [...new Set([...current, postId])]
        : current.filter((savedPostId) => savedPostId !== postId));
      toast.success(data.saved ? "Post saved" : "Post removed from saved items");
      return data;
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update saved post");
      throw requestError;
    }
  };

  const handleDeletePost = async (postId) => {
    if (!requireAuthentication()) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((current) => current.filter((post) => post._id !== postId));
      toast.success("Post deleted");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete post");
      throw requestError;
    }
  };

  const handleEditPost = (updatedPost) => {
    updatePost(updatedPost);
  };

  const toggleFollow = async () => {
    if (!companyPage || updatingFollow) return;
    if (!requireAuthentication()) return;
    try {
      setUpdatingFollow(true);
      const { data } = await api.post(`/company-pages/${companyPage._id}/follow`);
      setFollowing(data.following);
      setFollowerCount(data.followerCount);
      toast.success(data.following ? `You’re following ${companyPage.name}` : `You unfollowed ${companyPage.name}`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update follow status");
    } finally {
      setUpdatingFollow(false);
    }
  };

  if (loading) {
    return <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] p-5"><div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading company page…</div></main>;
  }

  if (error || !companyPage) {
    return (
      <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-4 py-10">
        <section className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-ink">Company page unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-muted-ink">{error || "This company page could not be found."}</p>
          <Link to={isAuthenticated ? "/feed" : "/"} className="mt-5 inline-flex rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Back to CareerLink</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-56px)] bg-[#f3f2ef] px-3 py-5 sm:px-5 sm:py-7">
      <div className="mx-auto max-w-4xl">
        <Link to={isAuthenticated ? "/feed" : "/"} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} /> Back to CareerLink</Link>
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-[#d6e8ed] via-[#dce6e4] to-[#e9e3d9] bg-cover bg-center sm:h-36" style={companyPage.banner?.url ? { backgroundImage: `url("${companyPage.banner.url}")` } : undefined} />
          <div className="px-5 pb-5 sm:px-7">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
              {companyPage.logo?.url ? (
                <img src={companyPage.logo.url} alt={`${companyPage.name} logo`} className="h-20 w-20 rounded-xl border-4 border-white bg-white object-cover shadow-sm" />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-xl border-4 border-white bg-sky text-brand shadow-sm"><Building2 size={34} /></span>
              )}
              <div className="flex flex-wrap gap-2">
                {companyPage.isOwner ? (
                  <Link to={`/company-pages/${companyPage._id}/manage`} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">Manage page</Link>
                ) : (
                  <>
                    {!companyPage.isBlocked && <button type="button" disabled={updatingFollow} aria-pressed={following} onClick={toggleFollow} className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${following ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-brand bg-brand text-white hover:bg-brand-hover"}`}>
                      {following ? <><Check size={16} /> Following</> : <><Plus size={16} /> Follow</>}
                    </button>}
                    {companyPage.isBlocked && <p className="text-sm text-muted-ink">You cannot follow or message this page.</p>}
                    {companyPage.messagingEnabled && !companyPage.isBlocked && companyPage.ownerId && <button type="button" onClick={() => setMessageTopicsOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">Message</button>}
                  </>
                )}
              </div>
            </div>
            <h1 className="mt-4 break-words text-2xl font-bold text-ink">{companyPage.name}</h1>
            <p className="mt-1 text-sm text-muted-ink">{companyPage.tagline || companyPage.industry}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-ink">
              <span>{companyPage.industry}</span>
              <span className="inline-flex items-center gap-1"><UsersRound size={15} />{followerCount.toLocaleString()} followers</span>
              {companyPage.website && <a href={companyPage.website} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">Website</a>}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-muted-ink">
              {companyPage.companySize} · {companyPage.companyType}
            </div>
            {companyPage.customButton?.enabled && companyPage.customButton.url && (
              <a href={companyPage.customButton.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">
                {companyPage.customButton.label}
              </a>
            )}
          </div>
        </section>

        <nav aria-label="Company page sections" className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["Home", "About", "Posts", "Jobs"].map((tab) => (
            <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "border-emerald-700 text-emerald-800" : "border-transparent text-gray-700 hover:text-ink"}`}>
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Home" && (
          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">Overview</h2>
              <div className="mt-4 space-y-4">
                {companyPage.website && <OverviewItem label="Website"><a href={companyPage.website} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">{companyPage.website}</a></OverviewItem>}
                <OverviewItem label="Industry">{companyPage.industry}</OverviewItem>
                <OverviewItem label="Company size">{companyPage.companySize}</OverviewItem>
                <OverviewItem label="Type">{companyPage.companyType}</OverviewItem>
              </div>
              <button type="button" onClick={() => setActiveTab("About")} className="mt-5 w-full border-t border-gray-100 pt-4 text-center text-sm font-semibold text-ink hover:text-brand">
                Show all <span aria-hidden="true">→</span>
              </button>
            </section>

            <CompanyPagePosts companyPage={companyPage} posts={posts.slice(0, 3)} onShowAll={() => setActiveTab("Posts")} onDismiss={(postId) => setPosts((current) => current.filter((item) => item._id !== postId))} postProps={getPostProps()} />
          </div>
        )}

        {activeTab === "About" && (
          <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Overview</h2>
            {(companyPage.overview || companyPage.tagline) && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{companyPage.overview || companyPage.tagline}</p>}
            <div className="mt-4 space-y-4">
              {companyPage.website && <OverviewItem label="Website"><a href={companyPage.website} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">{companyPage.website}</a></OverviewItem>}
              <OverviewItem label="Industry">{companyPage.industry}</OverviewItem>
              <OverviewItem label="Company size">{companyPage.companySize}</OverviewItem>
              <OverviewItem label="Type">{companyPage.companyType}</OverviewItem>
              {companyPage.phone && <OverviewItem label="Phone">{companyPage.phone}</OverviewItem>}
              {companyPage.yearFounded && <OverviewItem label="Year founded">{companyPage.yearFounded}</OverviewItem>}
              {companyPage.specialties?.length > 0 && <OverviewItem label="Specialties">{companyPage.specialties.join(", ")}</OverviewItem>}
              {companyPage.workplace?.enabled && companyPage.workplace.policy && <OverviewItem label="Workplace">{companyPage.workplace.policy}</OverviewItem>}
            </div>
          </section>
        )}

        {activeTab === "Posts" && <CompanyPagePosts companyPage={companyPage} posts={posts} onDismiss={(postId) => setPosts((current) => current.filter((item) => item._id !== postId))} postProps={getPostProps()} />}

        {activeTab === "Jobs" && (
          jobs.length ? (
            <section className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-100 px-5 py-4"><h2 className="text-lg font-semibold text-ink">Open positions at {companyPage.name}</h2></header>
              <div className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <Link key={job._id} to={`/jobs/view/${job._id}`} className="block px-5 py-4 transition hover:bg-gray-50">
                    <h3 className="font-semibold text-brand">{job.title}</h3>
                    <p className="mt-1 text-sm text-muted-ink">{job.location} · {job.workMode} · {job.type}</p>
                    {job.salary && <p className="mt-1 text-xs text-muted-ink">{job.salary}</p>}
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-4 rounded-xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm">
              <BriefcaseBusiness className="mx-auto text-muted-ink" size={30} />
              <h2 className="mt-3 text-lg font-semibold text-ink">No jobs right now</h2>
              <p className="mt-1 text-sm text-muted-ink">Follow {companyPage.name} to get updates.</p>
              {!companyPage.isOwner && !companyPage.isBlocked && <button type="button" disabled={updatingFollow} onClick={toggleFollow} className="mt-4 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky disabled:opacity-60">{following ? "Following" : "Follow"}</button>}
            </section>
          )
        )}
      </div>
      {messageTopicsOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMessageTopicsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="message-page-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <header className="flex items-center justify-between gap-3">
              <div><h2 id="message-page-title" className="text-lg font-semibold text-ink">Message {companyPage.name}</h2><p className="mt-1 text-sm text-muted-ink">Choose a conversation topic to get started.</p></div>
              <button type="button" onClick={() => setMessageTopicsOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><X size={20} /></button>
            </header>
            <div className="mt-4 space-y-2">
              {(companyPage.conversationTopics || []).map((topic) => (
                <button key={topic} type="button" onClick={() => {
                  if (!requireAuthentication()) return;
                  navigate(`/messages?userId=${companyPage.ownerId}&companyPageId=${companyPage._id}&topic=${encodeURIComponent(topic)}`);
                }} className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-ink hover:border-brand hover:bg-sky">
                  {topic}<span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );

  function getPostProps() {
    return {
      onRequireAuth: requireAuthentication,
      onLike: handleLike,
      onReact: handleReact,
      onRepost: handleRepost,
      onToggleSave: handleToggleSave,
      onDelete: handleDeletePost,
      onEdit: handleEditPost,
      likingPostId,
      repostingPostId,
      savedPostIds,
    };
  }
}

function CompanyPagePosts({ companyPage, posts, onShowAll, onDismiss, postProps }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-5 py-4"><h2 className="text-lg font-semibold text-ink">Page posts</h2></header>
      {posts.length ? (
        <div className="space-y-4 p-4 sm:p-5">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={{
                ...post,
                companyPage: {
                  ...(post.companyPage || companyPage),
                  isOwner: companyPage.isOwner,
                },
              }}
              onLike={postProps.onLike}
              onReact={postProps.onReact}
              onRepost={postProps.onRepost}
              onToggleSave={postProps.onToggleSave}
              onDelete={postProps.onDelete}
              onEdit={postProps.onEdit}
              onDismiss={onDismiss}
              onRequireAuth={postProps.onRequireAuth}
              liking={postProps.likingPostId === post._id}
              reposting={postProps.repostingPostId === post._id}
              saved={postProps.savedPostIds.includes(post._id)}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center"><h3 className="font-semibold text-ink">No posts yet</h3><p className="mt-1 text-sm text-muted-ink">Company updates will appear here.</p></div>
      )}
      {onShowAll && (
        <button type="button" onClick={onShowAll} className="w-full border-t border-gray-100 px-5 py-4 text-center text-sm font-semibold text-ink hover:bg-gray-50">
          Show all <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}

function OverviewItem({ label, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{label}</h3>
      <p className="mt-1 text-sm text-muted-ink">{children}</p>
    </div>
  );
}
