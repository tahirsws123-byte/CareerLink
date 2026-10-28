import { useEffect, useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import ConnectionActionButton from "../network/ConnectionActionButton.jsx";
import api from "../../services/api.js";

export default function ProfileDiscovery({ profileId, related = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    api.get(related && profileId ? `/users/${profileId}/related` : "/users/suggestions")
      .then(({ data }) => { if (!ignore) setUsers(data.users || []); })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || "Unable to load people suggestions");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [profileId, related]);

  const title = related ? "Similar profiles" : "People you may know";
  const subtitle = related ? "Professionals with related skills or experience" : "Based on shared connections and profile details";

  return <Card className="overflow-hidden"><div className="flex items-center gap-2 px-4 py-4"><UsersRound size={17} className="text-brand" /><div><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-0.5 text-xs text-muted-ink">{subtitle}</p></div></div>{loading ? <p className="border-t border-gray-100 px-4 py-4 text-xs text-muted-ink">Finding relevant people…</p> : users.length ? <div className="divide-y divide-gray-100">{users.slice(0, 5).map((person) => <div key={person._id} className="px-4 py-3"><div className="flex items-start gap-2.5"><Link to={`/profile/${person.publicProfileSlug || person._id}`} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sky text-sm font-semibold text-brand">{person.profilePicture ? <img src={person.profilePicture} alt="" className="h-full w-full object-cover" /> : person.name?.slice(0, 1) || "U"}</Link><div className="min-w-0 flex-1"><Link to={`/profile/${person.publicProfileSlug || person._id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{person.name}</Link><p className="mt-0.5 line-clamp-2 text-xs text-muted-ink">{person.headline || person.location || "CareerLink member"}</p></div></div><div className="mt-2 pl-[50px]"><ConnectionActionButton userId={person._id} initialStatus={person.connectionStatus || ""} initialConnectionId={person.connectionId || ""} /></div></div>)}</div> : <p className="border-t border-gray-100 px-4 py-4 text-xs text-muted-ink">We’ll show relevant people as your network grows.</p>}<Link to="/network" className="flex items-center justify-center gap-1 border-t border-gray-100 px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-brand">Discover your network <ArrowRight size={14} /></Link></Card>;
}
