import { useState } from "react";
import { ExternalLink, Mail, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import { updateProfile } from "../../services/userServices.js";

export default function ProfileContactModal({ user, isMe, onClose, onSaved }) {
  const [email, setEmail] = useState(user.contactEmail || "");
  const [website, setWebsite] = useState(user.contactWebsite || "");
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const { user: updated } = await updateProfile({ contactEmail: email, contactWebsite: website });
      onSaved(updated);
      toast.success("Contact details saved");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save contact details");
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><header className="mb-5 flex items-start justify-between"><div><h2 id="contact-title" className="text-lg font-semibold text-ink">Contact information</h2><p className="mt-1 text-sm text-muted-ink">{user.name}</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><X size={20} /></button></header>
    {isMe ? <form onSubmit={save}><p className="mb-4 rounded-lg bg-sky p-3 text-xs leading-5 text-gray-700">Add professional contact details you’re comfortable sharing. Your sign-in email stays private unless you add it here.</p><label className="mb-4 block text-sm font-medium">Contact email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="name@example.com" /></label><label className="block text-sm font-medium">Website or portfolio<input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className={inputClass} placeholder="https://your-portfolio.com" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button></div></form> : <div className="space-y-4">{user.location && <p className="flex items-center gap-3 text-sm text-gray-700"><MapPin size={17} className="text-muted-ink" />{user.location}</p>}{user.contactEmail && <a href={`mailto:${user.contactEmail}`} className="flex items-center gap-3 text-sm font-medium text-brand hover:underline"><Mail size={17} />{user.contactEmail}</a>}{user.contactWebsite && <a href={user.contactWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-3 break-all text-sm font-medium text-brand hover:underline"><ExternalLink size={17} />{user.contactWebsite}</a>}{!user.contactEmail && !user.contactWebsite && <p className="text-sm text-muted-ink">This member hasn’t added public contact details.</p>}</div>}
  </section></div>;
}

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
