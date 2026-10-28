import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Check,
  Filter,
  Search,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card";
import ConnectionPersonRow from "../components/network/ConnectionPersonRow";
import ConnectionActionButton from "../components/network/ConnectionActionButton";
import NetworkSection from "../components/network/NetworkSection";
import ProfileAvatar from "../components/layout/ProfileAvatar";
import api from "../services/api";
import useTranslation from "../hooks/useTranslation";

const buttonClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export default function Network({ variant = "overview" }) {
  const t = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    invitations: [],
    sentRequests: [],
    connections: [],
    following: 0,
    suggestions: [],
    communityCounts: {},
  });
  const [followingUsers, setFollowingUsers] = useState([]);
  const [jobPosterUsers, setJobPosterUsers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [followedIds, setFollowedIds] = useState([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState([]);
  const [followTab, setFollowTab] = useState("following");
  const [filterOpen, setFilterOpen] = useState(variant === "connection-filters");
  const [connectionQuery, setConnectionQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [allPeople, setAllPeople] = useState([]);
  const [peoplePage, setPeoplePage] = useState(0);
  const [peopleHasMore, setPeopleHasMore] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const peopleLoadingRef = useRef(false);

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [summaryResponse, followingResponse, followersResponse, jobPostersResponse] = await Promise.all([
        api.get("/connections/summary"),
        api.get("/users/following"),
        api.get("/users/followers"),
        api.get("/users/following/job-posters"),
      ]);
      const data = summaryResponse.data;
      setSummary({
        invitations: data.invitations || [],
        sentRequests: data.sentRequests || [],
        connections: data.connections || [],
        following: data.following || 0,
        suggestions: data.suggestions || [],
        communityCounts: data.communityCounts || {},
      });
      setFollowingUsers(followingResponse.data.users || []);
      setJobPosterUsers(jobPostersResponse.data.users || []);
      setFollowers(followersResponse.data.users || []);
      setFollowedIds(followingResponse.data.following || []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to load your network";
      setError(message);
      if (silent) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllPeople = useCallback(async (reset = false) => {
    if (peopleLoadingRef.current || (!reset && !peopleHasMore)) return;
    peopleLoadingRef.current = true;
    setPeopleLoading(true);
    setPeopleError("");
    const page = reset ? 0 : peoplePage;
    try {
      const { data } = await api.get("/users/discover", { params: { page, limit: 24 } });
      setAllPeople((current) => reset ? data.users || [] : [...current, ...(data.users || [])]);
      setPeoplePage(page + 1);
      setPeopleHasMore(Boolean(data.hasMore));
    } catch (requestError) {
      setPeopleError(requestError.response?.data?.message || "Unable to load people");
    } finally {
      peopleLoadingRef.current = false;
      setPeopleLoading(false);
    }
  }, [peopleHasMore, peoplePage]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  useEffect(() => {
    if (!suggestionsOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSuggestionsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [suggestionsOpen]);

  const runNetworkAction = async (id, action, successMessage) => {
    if (actionId) return;
    try {
      setActionId(id);
      await action();
      toast.success(successMessage);
      await loadSummary({ silent: true });
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update your network");
    } finally {
      setActionId("");
    }
  };

  const toggleFollow = async (userId) => {
    try {
      const { data } = await api.post(`/users/follow/${userId}`);
      setFollowedIds((current) =>
        data.following
          ? [...new Set([...current, userId])]
          : current.filter((id) => id !== userId),
      );
      await loadSummary({ silent: true });
      toast.success(data.following ? "Following" : "Unfollowed");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update follow status");
    }
  };

  const filteredConnections = useMemo(() => {
    const query = connectionQuery.trim().toLowerCase();
    const location = locationFilter.trim().toLowerCase();
    return summary.connections.filter(({ otherUser }) => {
      const name = otherUser?.name?.toLowerCase() || "";
      const headline = otherUser?.headline?.toLowerCase() || "";
      const userLocation = otherUser?.location?.toLowerCase() || "";
      return (!query || name.includes(query) || headline.includes(query))
        && (!location || userLocation.includes(location));
    });
  }, [connectionQuery, locationFilter, summary.connections]);

  const selectedPeople = followTab === "following" ? followingUsers : followers;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-8">
        <div className="mx-auto max-w-[1128px] rounded-lg border border-line bg-white p-6 text-sm text-muted-ink">
          {t("Loading your network…")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-8">
        <div className="mx-auto max-w-[900px] rounded-lg border border-line bg-white p-6">
          <p role="alert" className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => loadSummary()} className={`${buttonClass} mt-4 border border-line text-ink`}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (variant === "connections" || variant === "connection-filters") {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
        <div className="mx-auto max-w-[1000px] space-y-5">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-ink">{t("Your connections")}</h1>
                <p className="mt-1 text-sm text-muted-ink">Keep in touch with the people in your professional network.</p>
              </div>
              <Link to="/network" className={`${buttonClass} border border-brand text-brand hover:bg-sky`}>Back to network</Link>
            </div>
            <div className="flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
                <input
                  value={connectionQuery}
                  onChange={(event) => setConnectionQuery(event.target.value)}
                  placeholder={t("Search connections by name or role")}
                  aria-label="Search connections"
                  className="w-full rounded-lg border border-line bg-white py-2.5 pl-10 pr-3 text-sm text-ink outline-none focus:border-brand"
                />
              </label>
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                aria-expanded={filterOpen}
                className={`${buttonClass} border border-line text-ink hover:bg-sky`}
              >
                <Filter size={16} /> Filters
              </button>
            </div>
            {filterOpen && (
              <div className="grid gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted-ink">
                  LOCATION
                  <input
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                    placeholder={t("Filter by location")}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-brand"
                  />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={() => { setConnectionQuery(""); setLocationFilter(""); }} className="text-sm font-semibold text-brand hover:underline">
                    {t("Clear filters")}
                  </button>
                </div>
              </div>
            )}
            {filteredConnections.length ? (
              filteredConnections.map((connection) => (
                <ConnectionPersonRow
                  key={connection._id}
                  user={connection.otherUser}
                  meta="CareerLink connection"
                  actions={
                    <button
                      type="button"
                      disabled={actionId === `remove-${connection._id}`}
                      onClick={() => runNetworkAction(
                        `remove-${connection._id}`,
                        () => api.delete(`/connections/${connection._id}`),
                        "Connection removed",
                      )}
                      className={`${buttonClass} border border-line text-muted-ink hover:bg-gray-50`}
                    >
                      <X size={16} /> {t("Remove")}
                    </button>
                  }
                />
              ))
            ) : (
              <p className="border-t border-gray-100 px-4 py-8 text-center text-sm text-muted-ink">
                {summary.connections.length ? t("No connections match these filters.") : t("Your connections will appear here when you connect with people.")}
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (variant === "invitations") {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
        <div className="mx-auto max-w-[1000px] space-y-5">
          <Card className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-lg font-semibold text-ink">{t("Invitations")}</h1><p className="mt-1 text-sm text-muted-ink">{t("Manage incoming and outgoing connection requests.")}</p></div>
            <Link to="/network" className={`${buttonClass} border border-brand text-brand hover:bg-sky`}>{t("Back to network")}</Link>
          </Card>
          <NetworkSection title={t("Received invitations")} description={t("People who want to connect with you.")} count={summary.invitations.length} empty={t("No pending invitations.")}>
            {summary.invitations.map((invite) => (
              <ConnectionPersonRow
                key={invite._id}
                user={invite.requester}
                meta={t("Wants to connect with you")}
                actions={<>
                  <button type="button" disabled={actionId === `accept-${invite._id}`} onClick={() => runNetworkAction(`accept-${invite._id}`, () => api.patch(`/connections/${invite._id}/accept`), t("Connection accepted"))} className={`${buttonClass} bg-brand text-white hover:bg-brand-hover`}><Check size={16} />{t("Accept")}</button>
                  <button type="button" disabled={actionId === `reject-${invite._id}`} onClick={() => runNetworkAction(`reject-${invite._id}`, () => api.patch(`/connections/${invite._id}/reject`), t("Connection request ignored"))} className={`${buttonClass} border border-line text-muted-ink hover:bg-gray-50`}>{t("Ignore")}</button>
                </>}
              />
            ))}
          </NetworkSection>
          <NetworkSection title={t("Sent invitations")} description={t("Requests you have sent and can still cancel.")} count={summary.sentRequests.length} empty={t("No sent requests pending.")}>
            {summary.sentRequests.map((invite) => (
              <ConnectionPersonRow
                key={invite._id}
                user={invite.recipient}
                meta={t("Invitation pending")}
                actions={<button type="button" disabled={actionId === `cancel-${invite._id}`} onClick={() => runNetworkAction(`cancel-${invite._id}`, () => api.delete(`/connections/${invite._id}/cancel`), t("Connection request cancelled"))} className={`${buttonClass} border border-line text-muted-ink hover:bg-gray-50`}>{t("Cancel request")}</button>}
              />
            ))}
          </NetworkSection>
        </div>
      </div>
    );
  }

  if (variant === "following") {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
        <div className="mx-auto max-w-[900px]">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h1 className="text-lg font-semibold text-ink">{t("Your network")}</h1><p className="mt-1 text-sm text-muted-ink">{t("People you follow and people who follow you.")}</p></div>
              <Link to="/network" className={`${buttonClass} border border-brand text-brand hover:bg-sky`}>{t("Back to network")}</Link>
            </div>
            <div className="flex border-b border-gray-100 px-4">
              {[["following", "Following"], ["followers", "Followers"]].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFollowTab(id)} aria-pressed={followTab === id} className={`border-b-2 px-4 py-3 text-sm font-semibold ${followTab === id ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}>{t(label)}</button>
              ))}
            </div>
            <p className="px-4 py-3 text-sm text-muted-ink">{selectedPeople.length} {followTab === "following" ? "people you follow" : "people are following you"}</p>
            {selectedPeople.length ? selectedPeople.map((person) => (
              <ConnectionPersonRow
                key={person._id}
                user={person}
                meta={followTab === "following" ? "Following" : "Follower"}
                actions={followTab === "following" ? (
                  <button type="button" onClick={() => toggleFollow(person._id)} className={`${buttonClass} border border-line text-ink hover:bg-gray-50`}>{t("Unfollow")}</button>
                ) : (
                  <button type="button" onClick={() => toggleFollow(person._id)} className={`${buttonClass} border border-brand text-brand hover:bg-sky`}>{t(followedIds.includes(person._id) ? "Following" : "Follow")}</button>
                )}
              />
            )) : <p className="px-4 py-6 text-sm text-muted-ink">{followTab === "following" ? "You are not following anyone yet." : "You do not have any followers yet."}</p>}
          </Card>
        </div>
      </div>
    );
  }

  if (variant === "pages") {
    return (
      <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
        <div className="mx-auto max-w-[1000px] space-y-5">
          <Card className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-lg font-semibold text-ink">{t("Pages")}</h1><p className="mt-1 text-sm text-muted-ink">{t("Job-poster accounts you follow.")}</p></div>
            <Link to="/network" className={`${buttonClass} border border-brand text-brand hover:bg-sky`}>{t("Back to network")}</Link>
          </Card>
          <NetworkSection title={`${jobPosterUsers.length} ${t("pages")}`} empty={t("You are not following any job-poster accounts yet.")}>
            {jobPosterUsers.map((person) => (
              <ConnectionPersonRow
                key={person._id}
                user={person}
                meta={`${Number(person.followerCount || 0).toLocaleString()} followers · Posts jobs`}
                actions={
                  <button
                    type="button"
                    onClick={() => toggleFollow(person._id)}
                    className={`${buttonClass} border border-line text-ink hover:bg-gray-50`}
                  >{t("Following")}</button>
                }
              />
            ))}
          </NetworkSection>
        </div>
      </div>
    );
  }

  const suggestions = summary.suggestions.filter(
    (person) => !followedIds.includes(person._id) && !dismissedSuggestionIds.includes(person._id),
  );
  const communityItems = [
    { label: "Groups", count: summary.communityCounts.groups, to: "/groups" },
    { label: "Events", count: summary.communityCounts.events, to: "/events" },
    { label: "Newsletters", count: summary.communityCounts.newsletters, to: "/newsletters" },
    { label: "Pages", count: jobPosterUsers.length, to: "/network/pages" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
      <div className="mx-auto grid max-w-[1200px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-4"><h1 className="text-2xl font-semibold leading-tight text-ink">{t("Network overview")}</h1><p className="mt-1 text-sm text-muted-ink">{t("Grow and manage your professional community.")}</p></div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center">
              <SummaryLink label={t("Invites sent")} value={summary.sentRequests.length} to="/network/invitations" />
              <SummaryLink label={t("Connections")} value={summary.connections.length} to="/network/connections" />
              <SummaryLink label={t("Following")} value={summary.following} to="/network/following" />
            </div>
            <nav aria-label="Network links" className="border-t border-gray-100 p-2">
              <Link to="/network/invitations" className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-gray-50"><span className="flex items-center gap-2"><Bell size={17} />{t("Invitations")}</span><span className="text-xs text-muted-ink">{summary.invitations.length}</span></Link>
              <Link to="/network/connections" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-gray-50"><UsersRound size={17} />{t("Connections")}</Link>
              <Link to="/network/following" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-gray-50"><UserRoundPlus size={17} />{t("Following & followers")}</Link>
            </nav>
          </Card>
          <Card className="overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-semibold text-ink">{t("Your communities")}</h2>
            {communityItems.map(({ label, count, to }) => (
              <Link key={to} to={to} className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-muted-ink hover:bg-gray-50 hover:text-brand"><span>{label}</span><span>{Number(count || 0)}</span></Link>
            ))}
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">{t("Make your next career move")}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-ink">{t("Explore opportunities shared by your growing network.")}</p>
            <Link to="/jobs" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">{t("Explore jobs")} <BriefcaseBusiness size={15} /></Link>
          </Card>
        </aside>

        <main className="min-w-0 space-y-5">
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-semibold text-ink">{t("Build meaningful professional connections")}</h2><p className="mt-1 text-sm text-muted-ink">{t("Find people, share knowledge, and discover opportunities together.")}</p></div>
            <button type="button" onClick={() => navigate("/search")} className={`${buttonClass} shrink-0 bg-brand text-white hover:bg-brand-hover`}><Search size={16} />{t("Find people")}</button>
          </Card>

          <NetworkSection
            title={t("Recent invitations")}
            description={t("Respond to people who want to connect with you.")}
            count={summary.invitations.length}
            headerAction={<Link to="/network/invitations" className="text-sm font-semibold text-brand hover:underline">{t("Manage")}</Link>}
            empty={t("You’re all caught up.")}
          >
            {summary.invitations.slice(0, 3).map((invite) => (
              <ConnectionPersonRow
                key={invite._id}
                user={invite.requester}
                meta="Wants to connect with you"
                actions={<>
                  <button
                    type="button"
                    disabled={actionId === `accept-${invite._id}`}
                    onClick={() => runNetworkAction(`accept-${invite._id}`, () => api.patch(`/connections/${invite._id}/accept`), "Connection accepted")}
                    className={`${buttonClass} bg-brand text-white hover:bg-brand-hover`}
                  ><Check size={16} />Accept</button>
                  <button type="button" disabled={actionId === `reject-${invite._id}`} onClick={() => runNetworkAction(`reject-${invite._id}`, () => api.patch(`/connections/${invite._id}/reject`), "Request ignored")} className={`${buttonClass} border border-line text-muted-ink hover:bg-gray-50`}>Ignore</button>
                </>}
              />
            ))}
          </NetworkSection>

          <NetworkSection
            title="People you may know"
            description="Based on shared connections and profile details."
            headerAction={(
              <button type="button" onClick={() => { setSuggestionsOpen(true); loadAllPeople(true); }} className="text-sm font-semibold text-brand hover:underline">
                Show all
              </button>
            )}
            empty="We’ll suggest relevant people as your network grows."
          >
            {suggestions.slice(0, 4).map((person) => (
              <ConnectionPersonRow
                key={person._id}
                user={person}
                meta={person.location || "Suggested for your network"}
                actions={<>
                  <ConnectionActionButton userId={person._id} initialStatus={person.connectionStatus} initialConnectionId={person.connectionId} onChanged={() => loadSummary({ silent: true })} />
                  <button type="button" onClick={() => toggleFollow(person._id)} className={`${buttonClass} border border-line text-ink hover:bg-gray-50`}>{followedIds.includes(person._id) ? "Following" : "Follow"}</button>
                  <button
                    type="button"
                    aria-label={`Dismiss ${person.name || "suggested person"}`}
                    title="Dismiss suggestion"
                    onClick={() => setDismissedSuggestionIds((current) => [...new Set([...current, person._id])])}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-ink hover:bg-gray-100 hover:text-ink"
                  ><X size={17} /></button>
                </>}
              />
            ))}
          </NetworkSection>
        </main>
      </div>
      {suggestionsOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuggestionsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggestions-dialog-title"
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-7">
              <h2 id="suggestions-dialog-title" className="text-lg font-semibold text-ink sm:text-2xl">People you may know based on your recent activity</h2>
              <button type="button" onClick={() => setSuggestionsOpen(false)} aria-label="Close suggestions" className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-ink hover:bg-gray-100">
                <X size={23} />
              </button>
            </header>
            <div
              className="overflow-y-auto p-4 sm:p-7"
              onScroll={(event) => {
                const element = event.currentTarget;
                if (element.scrollHeight - element.scrollTop - element.clientHeight < 240) {
                  loadAllPeople();
                }
              }}
            >
              {allPeople.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {allPeople.map((person) => (
                    <article key={person._id} className="relative overflow-hidden rounded-xl border border-gray-200 text-center">
                      <div className="h-20 bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-200" />
                      <button
                        type="button"
                        aria-label={`Dismiss ${person.name || "suggestion"}`}
                        onClick={() => setAllPeople((current) => current.filter((candidate) => candidate._id !== person._id))}
                        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                      ><X size={18} /></button>
                      <Link to={`/profile/${person._id}`} onClick={() => setSuggestionsOpen(false)} className="-mt-9 flex flex-col items-center px-3">
                        <ProfileAvatar user={person} size={76} className="border-4 border-white bg-white" />
                        <h3 className="mt-2 line-clamp-1 text-base font-semibold text-ink">{person.name || "CareerLink member"}</h3>
                        <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-muted-ink">{person.headline || "CareerLink member"}</p>
                      </Link>
                      <div className="p-3">
                        <ConnectionActionButton userId={person._id} initialStatus={person.connectionStatus} initialConnectionId={person.connectionId} onChanged={() => loadSummary({ silent: true })} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : !peopleLoading && !peopleError ? <p className="py-10 text-center text-sm text-muted-ink">No public profiles to show yet.</p> : null}
              {peopleError && <p role="alert" className="mt-4 text-center text-sm text-red-600">{peopleError}</p>}
              {peopleLoading && <p className="py-5 text-center text-sm text-muted-ink">Loading people…</p>}
              {!peopleLoading && peopleHasMore && allPeople.length > 0 && (
                <button type="button" onClick={() => loadAllPeople()} className="mx-auto mt-4 block text-sm font-semibold text-brand hover:underline">Load more people</button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryLink({ label, value, to }) {
  return (
    <Link to={to} className="rounded-lg bg-gray-50 px-2 py-3 transition hover:bg-sky">
      <span className="block text-lg font-semibold text-brand">{Number(value || 0).toLocaleString()}</span>
      <span className="mt-1 block text-xs text-muted-ink">{label}</span>
    </Link>
  );
}
