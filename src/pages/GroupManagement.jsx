import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Search,
  Send,
  UserPlus,
  UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import api from "../services/api.js";
import { getGroupManagement, reviewGroupPost, updateGroupManagement } from "../services/communityServices.js";

const tabs = ["Membership", "Content", "Analytics"];
const membershipTabs = ["Members", "Admins", "Requests", "Invited", "Blocked"];
const fieldClass = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand";
const memberFilterPresets = {
  Location: ["India", "Madhya Pradesh, India", "Greater Indore Area", "Indore", "United States"],
  "Current company": ["Microsoft", "LinkedIn", "Google", "Tata Consultancy Services", "YouTube"],
  Industry: ["Computer Software", "Information Technology & Services", "Management Consulting", "Human Resources", "Financial Services"],
  School: ["Devi Ahilya Vishwavidyalaya", "Harvard Business School", "Delhi University", "The Institute of Chartered Accountants of India", "Rajiv Gandhi Proudyogiki Vishwavidyalaya"],
};

export default function GroupManagement() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(() => tabs.includes(searchParams.get("tab")) ? searchParams.get("tab") : "Membership");
  const [memberTab, setMemberTab] = useState(() => membershipTabs.includes(searchParams.get("memberTab")) ? searchParams.get("memberTab") : "Members");
  const [search, setSearch] = useState("");
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeNote, setWelcomeNote] = useState("");
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [contentReviewOpen, setContentReviewOpen] = useState(false);
  const [contentReviewMode, setContentReviewMode] = useState("none");
  const [contentReviewCriteria, setContentReviewCriteria] = useState({ images: false, videos: false, links: false });
  const [analyticsTab, setAnalyticsTab] = useState(() => ["Growth", "Engagement"].includes(searchParams.get("section")) ? searchParams.get("section") : "Growth");
  const [analyticsDays, setAnalyticsDays] = useState(14);
  const [demographicMetric, setDemographicMetric] = useState("headline");
  const [growthSeriesVisible, setGrowthSeriesVisible] = useState({ members: true, active: true });
  const [engagementSeriesVisible, setEngagementSeriesVisible] = useState({ views: true, comments: true, reactions: true });
  const [joinApprovalMode, setJoinApprovalMode] = useState("open");
  const [filterSelections, setFilterSelections] = useState({ Location: [], "Current company": [], Industry: [], School: [] });
  const [openFilter, setOpenFilter] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getGroupManagement(groupId, analyticsDays);
      setData(response);
      setWelcomeNote(response.group.welcomeNote || "");
      setWelcomeEnabled(Boolean(response.group.welcomeNoteEnabled));
      setJoinApprovalMode(response.group.joinApprovalMode || "open");
      setContentReviewMode(response.group.contentReviewMode || "none");
      setContentReviewCriteria(response.group.contentReviewCriteria || { images: false, videos: false, links: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load group management");
    } finally {
      setLoading(false);
    }
  }, [groupId, analyticsDays]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const query = inviteQuery.trim();
    if (query.length < 2) {
      setInviteResults([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data: result } = await api.get("/users/search", { params: { q: query } });
        if (active) setInviteResults(result.users || []);
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search members");
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [inviteQuery]);

  const action = async (actionName, userId = "", success = "Group updated") => {
    if (busyId) return;
    try {
      setBusyId(userId || actionName);
      await updateGroupManagement(groupId, { action: actionName, userId });
      toast.success(success);
      if (actionName === "make-owner") {
        navigate(`/groups/${groupId}`);
        return;
      }
      await load();
      setInviteQuery("");
      setInviteResults([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update group");
    } finally {
      setBusyId("");
    }
  };

  const saveWelcome = async (event) => {
    event.preventDefault();
    if (busyId) return;
    try {
      setBusyId("welcome-note");
      await updateGroupManagement(groupId, { action: "welcome-note", note: welcomeNote, enabled: welcomeEnabled });
      setWelcomeOpen(false);
      toast.success("Welcome note settings saved");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save welcome note");
    } finally {
      setBusyId("");
    }
  };

  const saveJoinApproval = async (event) => {
    event.preventDefault();
    try {
      setBusyId("join-approval");
      await updateGroupManagement(groupId, { action: "join-approval", mode: joinApprovalMode });
      setApprovalOpen(false);
      toast.success("Member approval settings saved");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save member approval settings");
    } finally {
      setBusyId("");
    }
  };

  const saveContentReview = async (event) => {
    event.preventDefault();
    try {
      setBusyId("content-review");
      await updateGroupManagement(groupId, {
        action: "content-review",
        mode: contentReviewMode,
        criteria: contentReviewCriteria,
      });
      setContentReviewOpen(false);
      toast.success("Post review settings saved");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save post review settings");
    } finally {
      setBusyId("");
    }
  };

  const reviewPost = async (postId, decision) => {
    try {
      setBusyId(postId);
      await reviewGroupPost(groupId, postId, decision);
      toast.success(decision === "approve" ? "Post approved" : "Post deleted");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to review post");
    } finally {
      setBusyId("");
    }
  };

  const group = data?.group;
  const posts = data?.posts || [];
  const adminIds = new Set((group?.admins || []).map((person) => person._id));
  const members = useMemo(() => memberTab === "Admins"
    ? [group?.owner, ...(group?.admins || [])].filter(Boolean)
    : memberTab === "Requests" ? group?.requestedMembers || []
      : memberTab === "Invited" ? group?.invitedMembers || []
        : memberTab === "Blocked" ? group?.blockedMembers || []
          : group?.members || [], [group, memberTab]);
  const filterValues = useMemo(() => ({
    locations: unique([...memberFilterPresets.Location, ...((memberTab === "Admins" ? [group?.owner, ...(group?.admins || [])].filter(Boolean) : group?.members || []).map((person) => person.location))]),
    companies: unique([...memberFilterPresets["Current company"], ...(memberTab === "Admins" ? [group?.owner, ...(group?.admins || [])].filter(Boolean) : group?.members || []).flatMap((person) => (person.experience || []).map((item) => item.company))]),
    industries: unique([...memberFilterPresets.Industry, ...(memberTab === "Admins" ? [group?.owner, ...(group?.admins || [])].filter(Boolean) : group?.members || []).flatMap((person) => (person.experience || []).map((item) => item.industry))]),
    schools: unique([...memberFilterPresets.School, ...(memberTab === "Admins" ? [group?.owner, ...(group?.admins || [])].filter(Boolean) : group?.members || []).flatMap((person) => (person.education || []).map((item) => item.school))]),
  }), [group, memberTab]);
  const visibleMembers = members.filter((person) => {
    const term = search.trim().toLowerCase();
    const text = `${person.name || ""} ${person.headline || ""} ${person.location || ""}`.toLowerCase();
    const companies = (person.experience || []).map((item) => item.company);
    const industries = (person.experience || []).map((item) => item.industry);
    const schools = (person.education || []).map((item) => item.school);
    return (!term || text.includes(term))
      && (!filterSelections.Location.length || filterSelections.Location.includes(person.location))
      && (!filterSelections["Current company"].length || companies.some((item) => filterSelections["Current company"].includes(item)))
      && (!filterSelections.Industry.length || industries.some((item) => filterSelections.Industry.includes(item)))
      && (!filterSelections.School.length || schools.some((item) => filterSelections.School.includes(item)));
  });

  if (loading && !data) return <main className="min-h-screen bg-[#f3f2ef] p-6"><Card className="mx-auto max-w-5xl p-8 text-center text-sm text-muted-ink">Loading group management…</Card></main>;
  if (!group) return <main className="min-h-screen bg-[#f3f2ef] p-6"><Card className="mx-auto max-w-5xl p-8 text-center"><p className="text-sm text-muted-ink">Group management could not be loaded.</p><Link to={`/groups/${groupId}`} className="mt-3 inline-block text-sm font-semibold text-brand">Back to group</Link></Card></main>;

  return (
    <main className="min-h-screen bg-[#f3f2ef] pb-10">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1128px] px-4">
          <Link to={`/groups/${groupId}`} className="flex items-center gap-3 py-4 text-sm font-medium text-brand hover:underline">
            {group.image?.url ? <img src={group.image.url} alt="" className="h-9 w-9 rounded-md object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-md bg-sky"><UsersRound size={18} /></span>}
            {group.name}<span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-ink"><ArrowLeft size={14} />Back to group</span>
          </Link>
          <h1 className="pb-3 text-2xl font-semibold text-ink">Manage group</h1>
          <nav className="flex gap-6" aria-label="Group management sections">
            {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} aria-current={tab === item ? "page" : undefined} className={`border-b-2 px-2 py-3 text-sm ${tab === item ? "border-emerald-700 font-semibold text-emerald-800" : "border-transparent text-ink hover:border-gray-300"}`}>{item}</button>)}
          </nav>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1128px] items-start gap-4 px-4 py-6 md:grid-cols-[224px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-2">
          {membershipTabs.map((item) => {
            const count = item === "Members" ? group.members.length
              : item === "Admins" ? group.admins.length + 1
                : item === "Requests" ? group.requestedMembers.length
                  : item === "Invited" ? group.invitedMembers.length
                    : group.blockedMembers.length;
            return <button key={item} type="button" onClick={() => { setTab("Membership"); setMemberTab(item); }} aria-current={tab === "Membership" && memberTab === item ? "page" : undefined} className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${tab === "Membership" && memberTab === item ? "bg-emerald-50 font-semibold text-emerald-800" : "text-ink hover:bg-gray-50"}`}><span>{item}</span><span className="text-xs text-muted-ink">{count.toLocaleString()}</span></button>;
          })}
          <div className="my-2 border-t border-gray-100" />
          <button type="button" onClick={() => setTab("Content")} className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${tab === "Content" ? "bg-emerald-50 font-semibold text-emerald-800" : "text-ink hover:bg-gray-50"}`}>Content<span className="text-xs text-muted-ink">{posts.length}</span></button>
          {tab === "Content" && <button type="button" onClick={() => setTab("Content")} className="ml-3 flex w-[calc(100%-12px)] items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-emerald-800 hover:bg-emerald-50"><span>Pending posts</span><span className="text-xs">{posts.length}</span></button>}
          <button type="button" onClick={() => setTab("Analytics")} className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${tab === "Analytics" ? "bg-emerald-50 font-semibold text-emerald-800" : "text-ink hover:bg-gray-50"}`}>Analytics<BarChart3 size={15} /></button>
        </Card>

        <section className="min-w-0 space-y-3">
          {tab === "Membership" && memberTab === "Members" && <>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-semibold text-ink">Automatic welcome note <span className={`ml-1 rounded px-2 py-0.5 text-xs ${group.welcomeNoteEnabled ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-muted-ink"}`}>{group.welcomeNoteEnabled ? "On" : "Off"}</span></h2><p className="mt-1 text-xs text-muted-ink">New members will see this note when they visit the group.</p></div>
              <button type="button" onClick={() => setWelcomeOpen((value) => !value)} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">{welcomeOpen ? "Close" : "Set up"}</button>
              {welcomeOpen && <form onSubmit={saveWelcome} className="w-full space-y-3 border-t border-gray-100 pt-3 sm:basis-full"><label className="block text-sm font-medium">Welcome message<textarea value={welcomeNote} onChange={(event) => setWelcomeNote(event.target.value)} maxLength={1000} rows={3} className={`${fieldClass} mt-1 w-full`} placeholder="Welcome new members and tell them what to do first." /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={welcomeEnabled} onChange={(event) => setWelcomeEnabled(event.target.checked)} className="h-4 w-4 accent-emerald-700" />Show this message to new members</label><button type="submit" disabled={busyId === "welcome-note"} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busyId === "welcome-note" ? "Saving…" : "Save welcome note"}</button></form>}
            </Card>
          </>}

          {tab === "Membership" && <>
            {memberTab === "Requests" ? <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-sm font-semibold text-ink">Automatic member approval <span className={`ml-1 rounded px-2 py-0.5 text-xs ${joinApprovalMode === "approval" ? "bg-gray-100 text-muted-ink" : "bg-emerald-50 text-emerald-800"}`}>{joinApprovalMode === "approval" ? "Off" : "On"}</span></h2><p className="mt-1 text-xs text-muted-ink">Select members who can join this group without admin approval.</p></div>
              <button type="button" onClick={() => setApprovalOpen(true)} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Set up</button>
            </Card> : null}
            <Card className="overflow-visible">
              <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold text-ink">{memberTab} <span className="text-sm font-normal text-muted-ink">· {members.length} {members.length === 1 ? "person" : "people"}</span></h2><label className="flex items-center gap-2 rounded-md border border-gray-300 px-2.5"><Search size={16} className="text-muted-ink" /><input value={memberTab === "Members" || memberTab === "Admins" || memberTab === "Requests" ? search : inviteQuery} onChange={(event) => memberTab === "Members" || memberTab === "Admins" || memberTab === "Requests" ? setSearch(event.target.value) : setInviteQuery(event.target.value)} placeholder={memberTab === "Invited" ? "Search people to invite" : "Search group members"} className="min-w-0 py-2 text-sm outline-none sm:w-52" /></label></div>
              {(memberTab === "Members" || memberTab === "Admins") && <div className="flex flex-wrap gap-2 border-b border-gray-100 p-3">{[
                ["Location", filterValues.locations],
                ["Current company", filterValues.companies],
                ["Industry", filterValues.industries],
                ["School", filterValues.schools],
              ].map(([label, options]) => <MultiFilter key={label} label={label} options={options} selected={filterSelections[label]} open={openFilter === label} onToggle={() => setOpenFilter((current) => current === label ? "" : label)} onClose={() => setOpenFilter("")} onApply={(values) => { setFilterSelections((current) => ({ ...current, [label]: values })); setOpenFilter(""); }} />)}</div>}
              {memberTab === "Invited" && inviteResults.length > 0 && <div className="divide-y border-b border-gray-100">{inviteResults.map((person) => <PersonRow key={person._id} person={person} detail={person.headline} action={<button type="button" disabled={Boolean(busyId)} onClick={() => action("invite", person._id, "Invitation added")} className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand disabled:opacity-50"><UserPlus size={15} className="mr-1 inline" />Invite</button>} />)}</div>}
              {visibleMembers.length ? <div className="divide-y divide-gray-100">{visibleMembers.map((person) => {
                const isOwner = person._id === group.owner._id;
                const isAdmin = isOwner || adminIds.has(person._id);
                let controls = null;
                if (memberTab === "Requests") controls = <><button type="button" disabled={Boolean(busyId)} onClick={() => action("approve-request", person._id, "Join request approved")} className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} className="mr-1 inline" />Approve</button><button type="button" disabled={Boolean(busyId)} onClick={() => action("decline-request", person._id, "Join request declined")} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Decline</button></>;
                else if (memberTab === "Invited") controls = <button type="button" disabled={Boolean(busyId)} onClick={() => action("cancel-invite", person._id, "Invitation cancelled")} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Cancel invite</button>;
                else if (memberTab === "Blocked") controls = <button type="button" disabled={Boolean(busyId)} onClick={() => action("unblock-member", person._id, "Member unblocked")} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Unblock</button>;
                else if (!isOwner) controls = <MemberActions
                  isAdmin={isAdmin}
                  disabled={Boolean(busyId)}
                  onAction={(name, success) => {
                    if (name === "make-owner" && !window.confirm(`Make ${person.name} the group owner? You will become an admin.`)) return;
                    action(name, person._id, success);
                  }}
                />;
                return <PersonRow key={person._id} person={person} detail={isOwner ? "Owner" : isAdmin ? "Admin" : person.headline} action={controls} />;
              })}</div> : memberTab === "Invited" && inviteResults.length ? null : memberTab === "Requests" ? <div className="flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center"><div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UsersRound size={38} /></div><h3 className="mt-4 text-xl font-semibold text-ink">No requests to review</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-ink">Nice job! Check back later for new requests to join your group.</p><Link to={`/groups/${groupId}`} className="mt-5 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">View group posts</Link></div> : <p className="p-8 text-center text-sm text-muted-ink">{emptyMembershipMessage(memberTab)}</p>}
            </Card>
          </>}

          {tab === "Content" && <div className="space-y-3">
            <Card className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-ink">Review new posts <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-semibold ${contentReviewMode === "none" ? "bg-gray-100 text-muted-ink" : "bg-emerald-50 text-emerald-800"}`}>{contentReviewMode === "none" ? "Off" : "On"}</span></h2>
                  <p className="mt-1 text-sm text-muted-ink">{contentReviewMode === "all" ? "All new member posts are held for review." : contentReviewMode === "criteria" ? "Posts matching your selected criteria are held for review." : "New member posts are published without review."}</p>
                </div>
                <button type="button" onClick={() => setContentReviewOpen(true)} className="shrink-0 rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-ink hover:bg-gray-50">Edit</button>
              </div>
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-5 text-muted-ink">Pending posts expire in 14 days from the posting date.</p>
            </Card>
            <Card className="overflow-hidden">
              <header className="border-b border-gray-100 p-4"><h2 className="text-lg font-semibold text-ink">Pending posts <span className="text-sm font-normal text-muted-ink">· {posts.length}</span></h2><p className="mt-1 text-sm text-muted-ink">Review posts members want to share with this group.</p></header>
              {posts.length ? <div className="divide-y divide-gray-100">{posts.map((post) => <article key={post._id} className="p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3"><ProfileAvatar user={post.author} size={44} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{post.author?.name || "Group member"}</p><p className="text-xs text-muted-ink">Posted {new Date(post.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Pending</span></div>
                {post.text && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">{post.text}</p>}
                {post.poll?.question && <div className="mt-3 rounded-xl border border-gray-200 p-3"><p className="text-sm font-semibold">{post.poll.question}</p>{post.poll.options?.map((option, index) => <p key={`${option.text || option}-${index}`} className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm">{option.text || option}</p>)}</div>}
                {post.image?.url && <img src={post.image.url} alt="Post attachment" className="mt-3 max-h-[420px] w-full rounded-xl bg-gray-50 object-contain" />}
                {post.video?.url && <video src={post.video.url} controls className="mt-3 max-h-[420px] w-full rounded-xl bg-black" />}
                {post.repostOf && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-muted-ink">Shared post submitted for review</p>}
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
                  <button type="button" disabled={Boolean(busyId)} onClick={() => reviewPost(post._id, "reject")} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{busyId === post._id ? "Working…" : "Delete"}</button>
                  <button type="button" disabled={Boolean(busyId)} onClick={() => reviewPost(post._id, "approve")} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">{busyId === post._id ? "Working…" : "Approve"}</button>
                </div>
              </article>)}</div> : <div className="px-5 py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check size={25} /></div><h3 className="mt-4 text-base font-semibold text-ink">No pending posts</h3><p className="mt-1 text-sm text-muted-ink">Posts waiting for review will appear here.</p></div>}
            </Card>
          </div>}

          {tab === "Analytics" && <GroupAnalytics
            data={data.analytics}
            members={group.members}
            section={analyticsTab}
            setSection={setAnalyticsTab}
            days={analyticsDays}
            setDays={setAnalyticsDays}
            demographic={demographicMetric}
            setDemographic={setDemographicMetric}
            growthVisible={growthSeriesVisible}
            setGrowthVisible={setGrowthSeriesVisible}
            engagementVisible={engagementSeriesVisible}
            setEngagementVisible={setEngagementSeriesVisible}
            groupId={groupId}
          />}
        </section>
      </div>
      {approvalOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setApprovalOpen(false); }}>
        <form onSubmit={saveJoinApproval} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><h2 className="text-lg font-semibold text-ink">Select how members join this group</h2><button type="button" onClick={() => setApprovalOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><span aria-hidden="true">×</span></button></header>
          <div className="space-y-5 px-6 py-5">
            <ApprovalChoice value="open" selected={joinApprovalMode} onChange={setJoinApprovalMode} label="Anyone can join without approval" />
            <ApprovalChoice value="criteria" selected={joinApprovalMode} onChange={setJoinApprovalMode} label="Only members who meet the criteria can join without approval" detail="Members need a profile headline and location; other requests will wait for review." />
            <ApprovalChoice value="approval" selected={joinApprovalMode} onChange={setJoinApprovalMode} label="Members require admin approval to join" />
          </div>
          <footer className="flex justify-end border-t border-gray-100 px-6 py-4"><button type="submit" disabled={Boolean(busyId)} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busyId === "join-approval" ? "Saving…" : "Save"}</button></footer>
        </form>
      </div>}
      {contentReviewOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setContentReviewOpen(false); }}>
        <form onSubmit={saveContentReview} className="max-h-[min(90vh,760px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <header className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6"><div><h2 className="text-lg font-semibold text-ink">Review new posts</h2><p className="mt-1 text-xs text-muted-ink">Choose which posts need approval before appearing in your group.</p></div><button type="button" onClick={() => setContentReviewOpen(false)} aria-label="Close" className="rounded-full p-2 text-xl leading-none hover:bg-gray-100">×</button></header>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <ReviewChoice value="all" selected={contentReviewMode} onChange={setContentReviewMode} label="Review all posts" />
            <div className={`rounded-xl border p-4 ${contentReviewMode === "criteria" ? "border-emerald-700 bg-emerald-50/40" : "border-gray-200"}`}>
              <button type="button" onClick={() => setContentReviewMode("criteria")} className="flex w-full items-start gap-3 text-left">
                <input type="radio" name="content-review-mode" checked={contentReviewMode === "criteria"} onChange={() => setContentReviewMode("criteria")} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">Only review posts that meet the criteria</span><ChevronRight size={18} className={`shrink-0 text-muted-ink transition-transform ${contentReviewMode === "criteria" ? "rotate-90" : ""}`} />
              </button>
              {contentReviewMode === "criteria" && <div className="ml-7 mt-4 space-y-3 border-t border-gray-200 pt-3">
                <p className="text-xs leading-5 text-muted-ink">Choose the types of posts that should wait for approval.</p>
                {[["images", "Posts with images"], ["videos", "Posts with videos"], ["links", "Posts containing links"]].map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" checked={Boolean(contentReviewCriteria[key])} onChange={(event) => setContentReviewCriteria((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-emerald-700" />{label}</label>)}
                {!Object.values(contentReviewCriteria).some(Boolean) && <p className="text-xs text-amber-800">Select at least one criterion.</p>}
              </div>}
            </div>
            <ReviewChoice value="none" selected={contentReviewMode} onChange={setContentReviewMode} label="No review required" detail="New posts are shared with the group right away." />
          </div>
          <footer className="sticky bottom-0 flex justify-end border-t border-gray-100 bg-white px-5 py-4 sm:px-6"><button type="submit" disabled={Boolean(busyId) || (contentReviewMode === "criteria" && !Object.values(contentReviewCriteria).some(Boolean))} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{busyId === "content-review" ? "Saving…" : "Save"}</button></footer>
        </form>
      </div>}
    </main>
  );
}

function GroupAnalytics({
  data,
  members,
  section,
  setSection,
  days,
  setDays,
  demographic,
  setDemographic,
  growthVisible,
  setGrowthVisible,
  engagementVisible,
  setEngagementVisible,
  groupId,
}) {
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return date;
  });
  const dayKey = (date) => {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  };
  const dailyJoinCounts = new Map();
  (data.membershipEvents || []).forEach((event) => {
    if (event.action === "joined") {
      const key = dayKey(event.date);
      dailyJoinCounts.set(key, (dailyJoinCounts.get(key) || 0) + 1);
    }
  });
  const newMemberSeries = timeline.map((date) => dailyJoinCounts.get(dayKey(date)) || 0);
  const activeMemberSeries = timeline.map((date) => {
    const authors = new Set((data.postsInRange || [])
      .filter((post) => dayKey(post.createdAt) === dayKey(date))
      .map((post) => post.author?._id || post.author)
      .filter(Boolean)
      .map(String));
    return authors.size;
  });
  const postsByDay = new Map();
  (data.postsInRange || []).forEach((post) => {
    const key = dayKey(post.createdAt);
    const current = postsByDay.get(key) || { views: 0, comments: 0, reactions: 0 };
    current.views += Number(post.impressions || 0);
    current.comments += Number(post.commentsCount || 0);
    current.reactions += (post.likes || []).length + (post.reactions || []).length;
    postsByDay.set(key, current);
  });
  const engagementValues = (metric) => timeline.map((date) => postsByDay.get(dayKey(date))?.[metric] || 0);
  const rangePosts = data.postsInRange || [];
  const rangeViews = rangePosts.reduce((sum, post) => sum + Number(post.impressions || 0), 0);
  const rangeEngagement = rangePosts.reduce((sum, post) => sum
    + Number(post.commentsCount || 0) + (post.likes || []).length + (post.reactions || []).length, 0);
  const topPosts = [...rangePosts].sort((a, b) => {
    const score = (post) => Number(post.commentsCount || 0) + (post.likes || []).length + (post.reactions || []).length;
    return score(b) - score(a);
  }).slice(0, 5);
  const demographicLabels = {
    headline: "Job title",
    company: "Current company",
    industry: "Industry",
    location: "Location",
    school: "School",
  };
  const demographicCounts = new Map();
  members.forEach((person) => {
    const experience = person.experience || [];
    const education = person.education || [];
    const raw = demographic === "company" ? experience[0]?.company
      : demographic === "industry" ? experience[0]?.industry
        : demographic === "location" ? person.location
          : demographic === "school" ? education[0]?.school
            : person.headline;
    const label = typeof raw === "string" && raw.trim() ? raw.trim() : "Others";
    demographicCounts.set(label, (demographicCounts.get(label) || 0) + 1);
  });
  const sortedDemographics = [...demographicCounts.entries()].sort((a, b) => b[1] - a[1]);
  const demographicRows = sortedDemographics.slice(0, 4);
  const remainingCount = sortedDemographics.slice(4).reduce((sum, [, count]) => sum + count, 0);
  if (remainingCount) demographicRows.push(["Others", remainingCount]);

  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Card className="overflow-hidden p-2">
          {["Growth", "Engagement"].map((item) => <button key={item} type="button" onClick={() => setSection(item)} aria-current={section === item ? "page" : undefined} className={`block w-full rounded-md px-4 py-3 text-left text-sm ${section === item ? "border-l-4 border-emerald-700 bg-emerald-50 font-semibold text-emerald-800" : "text-ink hover:bg-gray-50"}`}>{item}</button>)}
        </Card>
        <p className="px-1 text-xs leading-5 text-muted-ink"><span className="font-semibold text-brand">About these insights</span><br />Analytics are based on available group membership and post activity.</p>
      </aside>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 border-b border-gray-300 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-ink"><span className="sr-only">Analytics time range</span>
            {formatRange(timeline[0], timeline[timeline.length - 1])}
            <select aria-label="Analytics time range" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm">
              <option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
            </select>
          </label>
          <p className="text-xs text-muted-ink">All times shown in your local time zone</p>
        </div>

        {section === "Growth" ? <>
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Member growth</h2>
            {data.membershipEvents?.length ? <p className="mt-1 text-sm text-muted-ink">New members and members who shared a post on each day.</p> : <p className="mt-1 text-sm text-muted-ink">New membership activity will be tracked from now on. Current members are included in the demographics below.</p>}
            <AnalyticsChart labels={timeline} series={[
              { key: "members", name: "New members", color: "#2584e8", values: newMemberSeries, visible: growthVisible.members },
              { key: "active", name: "Active members", color: "#8a9b24", values: activeMemberSeries, visible: growthVisible.active },
            ]} />
            <div className="mt-4 space-y-2">{[
              ["members", "New members", "#2584e8"],
              ["active", "Active members", "#8a9b24"],
            ].map(([key, label, color]) => <button key={key} type="button" onClick={() => setGrowthVisible((current) => ({ ...current, [key]: !current[key] }))} className="flex w-full items-center gap-3 border-t border-gray-100 py-2 text-left text-sm text-muted-ink">
              <span className={`grid h-5 w-5 place-items-center rounded text-white ${growthVisible[key] ? "bg-emerald-700" : "bg-gray-300"}`}>{growthVisible[key] ? "✓" : ""}</span><span className="h-0.5 w-6" style={{ backgroundColor: color }} />{label}
            </button>)}</div>
          </Card>
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink">Member demographics</h2>
              <select aria-label="Member demographic" value={demographic} onChange={(event) => setDemographic(event.target.value)} className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm">
                {Object.entries(demographicLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {demographicRows.length ? <div className="mt-5 space-y-4">{demographicRows.map(([label, count]) => <div key={label}>
              <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-medium text-ink">{label}</span><span className="shrink-0 text-muted-ink">{members.length ? Math.round((count / members.length) * 100) : 0}% · {count}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-slate-600" style={{ width: `${members.length ? (count / members.length) * 100 : 0}%` }} /></div>
            </div>)}</div> : <AnalyticsEmpty title="No member data yet" message="Member profile details will appear here as people join the group." />}
          </Card>
        </> : <>
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Engagement highlights</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetricHighlight value={rangePosts.length} label="Posts" />
              <MetricHighlight value={rangeViews} label="Post views" />
              <MetricHighlight value={rangeEngagement} label="Reactions and comments" />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-ink">Post views and interactions are totals on posts published during the selected date range.</p>
          </Card>
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Engagement details</h2>
            <p className="mt-1 text-sm text-muted-ink">Engagement totals grouped by the date each post was published.</p>
            <AnalyticsChart labels={timeline} series={[
              { key: "views", name: "Post views", color: "#2584e8", values: engagementValues("views"), visible: engagementVisible.views },
              { key: "comments", name: "Comments", color: "#8a9b24", values: engagementValues("comments"), visible: engagementVisible.comments },
              { key: "reactions", name: "Reactions", color: "#f0785e", values: engagementValues("reactions"), visible: engagementVisible.reactions },
            ]} />
            <div className="mt-4 space-y-2">{[
              ["views", "Post views", "#2584e8"],
              ["comments", "Comments", "#8a9b24"],
              ["reactions", "Reactions", "#f0785e"],
            ].map(([key, label, color]) => <button key={key} type="button" onClick={() => setEngagementVisible((current) => ({ ...current, [key]: !current[key] }))} className="flex w-full items-center gap-3 border-t border-gray-100 py-2 text-left text-sm text-muted-ink">
              <span className={`grid h-5 w-5 place-items-center rounded text-white ${engagementVisible[key] ? "bg-emerald-700" : "bg-gray-300"}`}>{engagementVisible[key] ? "✓" : ""}</span><span className="h-0.5 w-6" style={{ backgroundColor: color }} />{label}
            </button>)}</div>
          </Card>
          <Card className="overflow-hidden p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">Most engaging group posts</h2>
            {topPosts.length ? <div className="mt-3 divide-y divide-gray-100">{topPosts.map((post) => <Link key={post._id} to={`/groups/${groupId}#post-${post._id}`} className="flex items-start justify-between gap-4 py-4 hover:bg-gray-50">
              <div className="min-w-0"><p className="line-clamp-2 whitespace-pre-wrap text-sm font-medium text-ink">{post.text || "Media or poll post"}</p><p className="mt-1 text-xs text-muted-ink">{post.author?.name || "Group member"} · {new Date(post.createdAt).toLocaleDateString()}</p></div>
              <span className="shrink-0 text-right text-xs text-muted-ink">{Number(post.commentsCount || 0) + (post.likes || []).length + (post.reactions || []).length}<br />interactions</span>
            </Link>)}</div> : <AnalyticsEmpty title="No posts to show" message="There are no posts in this time range yet." />}
          </Card>
        </>}
      </div>
    </div>
  </div>;
}

function formatRange(start, end) {
  if (!start || !end) return "Date range";
  const options = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
}

function AnalyticsChart({ labels, series }) {
  const width = 900;
  const height = 270;
  const margin = { top: 16, right: 16, bottom: 34, left: 42 };
  const visible = series.filter((item) => item.visible);
  const maxValue = Math.max(1, ...visible.flatMap((item) => item.values));
  const upper = Math.max(3, Math.ceil(maxValue / 3) * 3);
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const point = (index, value) => ({
    x: margin.left + (labels.length < 2 ? chartWidth / 2 : (index / (labels.length - 1)) * chartWidth),
    y: margin.top + chartHeight - (value / upper) * chartHeight,
  });
  return <div className="mt-4 w-full">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Analytics trend chart" className="h-auto w-full overflow-visible">
      {[0, 1, 2, 3].map((step) => {
        const value = (upper / 3) * step;
        const y = margin.top + chartHeight - (step / 3) * chartHeight;
        return <g key={step}><line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#c9c9c9" strokeWidth="1" /><text x={margin.left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#737373">{Math.round(value)}</text></g>;
      })}
      {visible.map((item) => {
        const points = item.values.map((value, index) => point(index, value));
        return <polyline key={item.key} points={points.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke={item.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
      })}
      {[0, Math.floor((labels.length - 1) / 3), Math.floor(((labels.length - 1) * 2) / 3), labels.length - 1]
        .filter((value, index, array) => array.indexOf(value) === index)
        .map((index) => <text key={index} x={point(index, 0).x} y={height - 8} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"} fontSize="11" fill="#737373">{labels[index]?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text>)}
    </svg>
  </div>;
}

function MetricHighlight({ value, label }) {
  return <div className="rounded-lg bg-gray-50 p-3 sm:bg-transparent sm:p-0"><p className="text-xl font-semibold text-ink">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-sm text-muted-ink">{label}</p></div>;
}

function AnalyticsEmpty({ title, message }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center"><div className="grid h-14 w-14 place-items-center rounded-full bg-sky text-brand"><BarChart3 size={25} /></div><h3 className="mt-3 text-base font-semibold text-ink">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-ink">{message}</p></div>;
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}

function MultiFilter({ label, options, selected, open, onToggle, onClose, onApply }) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(selected);
  const filtered = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="relative">
    <button type="button" aria-expanded={open} onClick={() => { setDraft(selected); setQuery(""); onToggle(); }} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm hover:border-gray-500 ${selected.length ? "border-gray-500 bg-gray-50 font-medium" : "border-gray-300 bg-white"}`}>{label}{selected.length > 0 && <span className="text-xs text-muted-ink">({selected.length})</span>}<ChevronDown size={14} /></button>
    {open && <div className="absolute left-0 top-10 z-40 w-[min(360px,calc(100vw-48px))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 p-3"><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Add ${label === "Location" ? "a location" : label === "Current company" ? "a company" : label === "Industry" ? "an industry" : "a school"}`} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" /><button type="button" onClick={onClose} aria-label="Close filter" className="text-lg text-muted-ink hover:text-ink">×</button></div>
      <div className="max-h-64 overflow-y-auto px-3 pb-2">
        {filtered.length ? filtered.map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-2 text-sm text-ink hover:bg-gray-50"><input type="checkbox" checked={draft.includes(option)} onChange={(event) => setDraft((current) => event.target.checked ? [...current, option] : current.filter((item) => item !== option))} className="h-4 w-4 accent-brand" /><span>{option}</span></label>) : <p className="px-1 py-4 text-sm text-muted-ink">No matching options</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-gray-100 p-3"><button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm hover:bg-gray-50">Cancel</button><button type="button" onClick={() => onApply(draft)} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Show results</button></footer>
    </div>}
  </div>;
}

function MemberActions({ isAdmin, disabled, onAction }) {
  const [open, setOpen] = useState(false);
  const options = isAdmin
    ? [["remove-admin", "Remove admin permissions", "Admin permissions removed"]]
    : [
      ["make-admin", "Make manager", "Member promoted to manager"],
      ["make-owner", "Make owner", "Group ownership transferred"],
      ["remove-member", "Remove from group", "Member removed from group"],
      ["block-member", "Block from group", "Member blocked from group"],
    ];
  return <div className="relative">
    <button type="button" disabled={disabled} aria-label="Member options" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-gray-100 disabled:opacity-50"><MoreHorizontal size={20} /></button>
    {open && <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl">{options.map(([name, label, success]) => <button key={name} type="button" onClick={() => { setOpen(false); onAction(name, success); }} className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${name === "block-member" ? "text-red-700" : "text-ink"}`}>{label}</button>)}</div>}
  </div>;
}

function ApprovalChoice({ value, selected, onChange, label, detail }) {
  return <label className="flex cursor-pointer items-start gap-3 text-sm text-ink"><input type="radio" name="join-approval-mode" value={value} checked={selected === value} onChange={() => onChange(value)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span>{label}{detail && <span className="mt-1 block text-xs leading-5 text-muted-ink">{detail}</span>}</span></label>;
}

function ReviewChoice({ value, selected, onChange, label, detail }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-ink hover:bg-gray-50"><input type="radio" name="content-review-mode" value={value} checked={selected === value} onChange={() => onChange(value)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span>{label}{detail && <span className="mt-1 block text-xs leading-5 text-muted-ink">{detail}</span>}</span></label>;
}

function PersonRow({ person, detail, action }) {
  return <div className="flex items-center gap-3 px-4 py-3"><Link to={`/profile/${person._id}`} className="shrink-0"><ProfileAvatar user={person} size={48} /></Link><div className="min-w-0 flex-1"><Link to={`/profile/${person._id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{person.name || "CareerLink member"}</Link><p className="truncate text-xs text-muted-ink">{detail || person.location || "CareerLink member"}</p></div><div className="flex shrink-0 items-center gap-2">{action}{person._id && <Link to={`/messages?userId=${person._id}`} aria-label={`Message ${person.name}`} className="hidden rounded-full border border-brand px-3 py-1.5 text-sm text-brand hover:bg-sky sm:inline-flex"><Send size={14} />Message</Link>}</div></div>;
}

function emptyMembershipMessage(tab) {
  return tab === "Requests" ? "There are no pending join requests."
    : tab === "Invited" ? "No invitations yet. Search for people above to invite them."
      : tab === "Blocked" ? "No blocked members."
        : tab === "Admins" ? "No admins have been added yet."
          : "No group members found.";
}
