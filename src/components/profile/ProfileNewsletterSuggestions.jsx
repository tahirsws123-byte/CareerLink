import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import { getNewsletters, toggleNewsletterSubscription } from "../../services/communityServices.js";

export default function ProfileNewsletterSuggestions() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");

  useEffect(() => {
    let ignore = false;
    getNewsletters()
      .then((items) => { if (!ignore) setNewsletters(items.slice(0, 3)); })
      .catch((error) => { if (!ignore) toast.error(error.response?.data?.message || "Unable to load newsletter suggestions"); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const subscribe = async (newsletter) => {
    if (workingId) return;
    try {
      setWorkingId(newsletter._id);
      const result = await toggleNewsletterSubscription(newsletter._id);
      setNewsletters((items) => items.map((item) => item._id === newsletter._id ? {
        ...item,
        isSubscribed: result.subscribed,
        subscriberCount: result.subscriberCount,
      } : item));
      toast.success(result.subscribed ? "Newsletter added to your reading list" : "Newsletter subscription removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update newsletter subscription");
    } finally {
      setWorkingId("");
    }
  };

  return <Card className="overflow-hidden">
    <div className="flex items-center gap-3 px-4 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><BookOpen size={17} /></span><div><h2 className="text-sm font-semibold text-ink">Ideas worth reading</h2><p className="mt-0.5 text-xs text-muted-ink">Newsletters picked for curious professionals</p></div></div>
    {loading ? <p className="border-t border-gray-100 px-4 py-4 text-xs text-muted-ink">Finding good reads…</p> : newsletters.length ? <div className="divide-y divide-gray-100 border-t border-gray-100">{newsletters.map((newsletter) => <article key={newsletter._id} className="px-4 py-3.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-semibold text-ink">{newsletter.name}</h3><p className="mt-1 text-[11px] text-muted-ink">{newsletter.category || "Career insights"} · {newsletter.frequency}</p></div><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">{newsletter.subscriberCount || 0} readers</span></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-600">{newsletter.description}</p><button type="button" disabled={workingId === newsletter._id} onClick={() => subscribe(newsletter)} className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${newsletter.isSubscribed ? "border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600" : "bg-brand text-white hover:bg-brand-hover"}`}>{newsletter.isSubscribed ? "Subscribed" : <><Plus size={13} />Subscribe</>}</button></article>)}</div> : <p className="border-t border-gray-100 px-4 py-4 text-xs text-muted-ink">No newsletters to recommend just yet.</p>}
    <Link to="/newsletters" className="flex items-center justify-center gap-1 border-t border-gray-100 px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-brand">Explore all newsletters <ArrowRight size={14} /></Link>
  </Card>;
}
