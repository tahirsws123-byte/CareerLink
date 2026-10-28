import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { createOrGetConversation, sendMessage } from "../../services/messageServices.js";
import { searchUsers } from "../../services/searchServices.js";

export default function ShareJobModal({ job, onClose }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setPeople([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const users = await searchUsers(cleanQuery);
        if (active) {
          setPeople(users.filter((person) => !selectedPeople.some((selected) => selected._id === person._id)));
        }
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Unable to search CareerLink members");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selectedPeople]);

  const sendJob = async () => {
    if (!selectedPeople.length || sending) return;
    try {
      setSending(true);
      for (const person of selectedPeople) {
        const conversation = await createOrGetConversation(person._id);
        await sendMessage(conversation._id, note.trim(), null, null, job._id);
      }
      toast.success(`Job shared with ${selectedPeople.length} ${selectedPeople.length === 1 ? "member" : "members"}`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to share this job");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !sending) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="share-job-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="share-job-title" className="text-lg font-semibold text-ink">Share this job on CareerLink</h2>
            <p className="mt-1 text-sm text-muted-ink">{job.title} · {job.company}</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button>
        </header>

        <label className="mt-5 block text-sm font-medium text-ink">Send to CareerLink members</label>
        <div className="relative mt-2">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" />
        </div>

        {selectedPeople.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
          {selectedPeople.map((person) => <button key={person._id} type="button" disabled={sending} onClick={() => setSelectedPeople((current) => current.filter((item) => item._id !== person._id))} className="rounded-full bg-sky px-3 py-1.5 text-xs font-medium text-brand disabled:opacity-50">{person.name} ×</button>)}
        </div>}

        {loading && <p className="mt-3 text-sm text-muted-ink">Searching members…</p>}
        {people.length > 0 && <div className="mt-3 max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {people.map((person) => <button key={person._id} type="button" onClick={() => setSelectedPeople((current) => [...current, person])} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{person.name}</span><span className="block truncate text-xs text-muted-ink">{person.headline || "CareerLink member"}</span></span>
            <span className="shrink-0 text-sm font-semibold text-brand">Add</span>
          </button>)}
        </div>}
        {query.trim().length >= 2 && !loading && people.length === 0 && <p className="mt-3 text-sm text-muted-ink">No more members found for this search.</p>}

        <label className="mt-5 block text-sm font-medium text-ink">Add a note <span className="font-normal text-muted-ink">(optional)</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} placeholder="Why are you sharing this opportunity?" className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100" />
        </label>

        <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" disabled={sending} onClick={onClose} className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={!selectedPeople.length || sending} onClick={sendJob} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{sending ? "Sending…" : `Send${selectedPeople.length ? ` to ${selectedPeople.length}` : ""}`}</button>
        </footer>
      </section>
    </div>
  );
}
