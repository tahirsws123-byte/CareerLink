import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, CircleHelp, Image as ImageIcon, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/layout/Card.jsx";
import ProfileAvatar from "../components/layout/ProfileAvatar.jsx";
import { getGroupPostAnalytics } from "../services/communityServices.js";

const demographicOptions = [
  ["headline", "Job titles"],
  ["location", "Locations"],
  ["company", "Companies"],
  ["industry", "Industries"],
  ["school", "Schools"],
];

export default function GroupPostAnalytics() {
  const { groupId, postId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [demographic, setDemographic] = useState("headline");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    let active = true;
    getGroupPostAnalytics(groupId, postId)
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load post analytics.");
      });
    return () => { active = false; };
  }, [groupId, postId]);

  if (error) return <main className="min-h-screen bg-[#f3f2ef] px-4 py-8"><Card className="mx-auto max-w-3xl p-8 text-center"><p className="text-sm text-muted-ink">{error}</p><Link to={`/groups/${groupId}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} />Back to group</Link></Card></main>;
  if (!analytics) return <main className="min-h-screen bg-[#f3f2ef] px-4 py-8"><Card className="mx-auto max-w-3xl p-8 text-center text-sm text-muted-ink">Loading post analytics…</Card></main>;

  const { post, metrics } = analytics;
  const content = post.repostOf || post;
  const poll = content.poll?.question ? content.poll : null;
  const hasVideo = Boolean(content.video?.url);
  const postType = poll ? "Poll" : hasVideo ? "Video post" : content.image?.url ? "Image post" : "Text post";
  const pollTotalVotes = (poll?.options || []).reduce((total, option) => total + (option.votes?.length || 0), 0);
  const pollClosed = poll?.expiresAt && now > 0 && new Date(poll.expiresAt).getTime() <= now;

  return <main className="min-h-screen bg-[#f3f2ef] px-4 py-6 sm:py-8">
    <div className="mx-auto grid max-w-[1120px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 space-y-4">
        <Link to={`/groups/${groupId}`} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} />Back to group</Link>
        <Card className="overflow-hidden">
          <header className="border-b border-gray-100 px-5 py-4"><h1 className="text-xl font-semibold text-ink">Post analytics</h1></header>
          <div className="flex items-start gap-3 p-5">
            <ProfileAvatar user={post.author} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{post.author?.name || "CareerLink member"} <span className="font-normal text-muted-ink">posted this · {now ? formatAge(post.createdAt, now) : "…"}</span></p>
              {post.text && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{post.text}</p>}
              {poll && <div className="mt-3 rounded-lg border border-gray-200 p-3"><p className="text-sm font-semibold text-ink">{poll.question}</p><p className="mt-1 text-xs text-muted-ink">Poll · {pollTotalVotes} {pollTotalVotes === 1 ? "vote" : "votes"} · {formatPollTime(poll.expiresAt, pollClosed)}</p></div>}
              {content.image?.url && <img src={content.image.url} alt="Post attachment" className="mt-3 max-h-80 w-full rounded-lg object-contain" />}
              {hasVideo && <video src={content.video.url} controls playsInline className="mt-3 max-h-80 w-full rounded-lg bg-black" />}
              {!post.text && !poll && !content.image?.url && !hasVideo && <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-ink"><ImageIcon size={16} />{postType}</p>}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Discovery" />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric value={metrics.impressions} label="Impressions" />
            <Metric value={metrics.membersReached} label="Members reached" />
          </div>
          {metrics.membersReached === null && <p className="mt-4 text-xs text-muted-ink">Unique member reach is not tracked yet.</p>}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Profile activity" />
          <MetricRow label="Profile viewers from this post" value={metrics.profileViewers} />
          <MetricRow label="Followers gained from this post" value={metrics.followersGained} />
          <p className="mt-2 text-xs text-muted-ink">Profile visits and follows are not attributed to individual group posts yet.</p>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Social engagement" />
          <MetricRow label="Reactions" value={metrics.reactions} />
          <MetricRow label="Comments" value={metrics.comments} />
          <MetricRow label="Reposts" value={metrics.reposts} />
          <MetricRow label="Saves" value={metrics.saves} />
          <MetricRow label="Sends" value={metrics.sends} />
          {metrics.sends === null && <p className="mt-2 text-xs text-muted-ink">Post sends are not tracked yet.</p>}
        </Card>

        {poll && <Card className="p-5">
          <SectionTitle title="Poll performance" />
          <p className="mt-1 text-sm text-muted-ink">{pollTotalVotes} total {pollTotalVotes === 1 ? "vote" : "votes"} · {now ? formatPollTime(poll.expiresAt, pollClosed, now) : "Checking poll status…"}</p>
          <div className="mt-4 space-y-3">
            {poll.options.map((option, index) => {
              const votes = option.votes?.length || 0;
              const percent = pollTotalVotes ? Math.round((votes / pollTotalVotes) * 100) : 0;
              return <div key={`${option._id || option.text}-${index}`}>
                <div className="mb-1 flex justify-between gap-3 text-sm"><span className="min-w-0 truncate text-ink">{option.text || `Option ${index + 1}`}</span><span className="shrink-0 text-muted-ink">{votes} · {percent}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div>
              </div>;
            })}
          </div>
        </Card>}

        {hasVideo && <Card className="p-5">
          <SectionTitle title="Video performance" />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric value={metrics.videoViews} label="Video views" />
            <Metric value={null} label="Minutes viewed" />
          </div>
          <p className="mt-4 text-xs text-muted-ink">Video plays are represented by post impressions. Watch time is not tracked yet.</p>
        </Card>}

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><SectionTitle title="Post viewers demographics" />
            <select value={demographic} onChange={(event) => setDemographic(event.target.value)} aria-label="Demographic category" className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm">
              {demographicOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <AnalyticsEmpty title="Demographics not available yet" message={`Viewer ${demographicOptions.find(([value]) => value === demographic)?.[1].toLowerCase() || "demographics"} are hidden until enough privacy-safe data is available.`} />
        </Card>
      </section>
      <aside className="hidden space-y-3 lg:block">
        <Card className="p-4"><p className="text-sm font-semibold text-ink">About post analytics</p><p className="mt-2 text-xs leading-5 text-muted-ink">Only you can see analytics for this post. Metrics are limited to activity CareerLink currently records.</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><BarChart3 size={17} className="text-brand" />Post type</div><p className="mt-2 text-sm text-muted-ink">{postType}</p></Card>
      </aside>
    </div>
  </main>;
}

function SectionTitle({ title }) {
  return <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">{title}<CircleHelp size={15} className="text-muted-ink" aria-label={`About ${title.toLowerCase()}`} /></h2>;
}

function Metric({ value, label }) {
  return <div><p className="text-xl font-semibold text-ink">{value === null || value === undefined ? "—" : Number(value).toLocaleString()}</p><p className="mt-1 text-sm text-muted-ink">{label}</p></div>;
}

function MetricRow({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-4 text-sm last:border-0"><span className="text-muted-ink">{label}</span><span className="font-medium text-ink">{value === null || value === undefined ? "—" : Number(value).toLocaleString()}</span></div>;
}

function AnalyticsEmpty({ title, message }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-4 py-8 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-full bg-sky text-brand"><Video size={23} /></div>
    <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1 max-w-md text-xs leading-5 text-muted-ink">{message}</p>
  </div>;
}

function formatAge(date, now) {
  const elapsed = Math.max(0, now - new Date(date).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatPollTime(expiresAt, closed, now) {
  if (!expiresAt) return "No end date";
  if (closed) return "Poll ended";
  const remainingDays = Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000);
  return remainingDays <= 1 ? "Less than 1 day left" : `${remainingDays}d left`;
}
