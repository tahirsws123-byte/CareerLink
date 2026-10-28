import { useState } from "react";
import { Copy, ExternalLink, Pencil, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import { updateProfile } from "../../services/userServices.js";

const languageOptions = ["English", "Hindi", "Urdu", "Spanish", "French", "Arabic", "German", "Japanese"];

export default function ProfileSettingsCard({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [language, setLanguage] = useState(user.profileLanguage || "English");
  const [slug, setSlug] = useState(user.publicProfileSlug || "");
  const [saving, setSaving] = useState(false);
  const profileUrl = `${window.location.origin}/profile/${user.publicProfileSlug || user._id}`;

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const { user: updated } = await updateProfile({ profileLanguage: language, publicProfileSlug: slug });
      onSaved(updated);
      setEditing(false);
      toast.success("Profile language and public URL updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile settings");
    } finally { setSaving(false); }
  };
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy the profile link");
    }
  };

  return <>
    <Card className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Settings2 size={17} className="text-brand" /><h2 className="text-sm font-semibold text-ink">Profile settings</h2></div><button type="button" onClick={() => { setLanguage(user.profileLanguage || "English"); setSlug(user.publicProfileSlug || ""); setEditing(true); }} aria-label="Edit profile settings" className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100"><Pencil size={15} /></button></div>
      <div className="mt-3 border-t border-gray-100 pt-3"><p className="text-xs text-muted-ink">Profile language</p><p className="mt-1 text-sm font-medium">{user.profileLanguage || "English"}</p></div>
      <div className="mt-3 border-t border-gray-100 pt-3"><p className="text-xs text-muted-ink">Public profile URL</p><a href={profileUrl} className="mt-1 block break-all text-xs font-medium text-brand hover:underline">{profileUrl.replace(window.location.origin, "")}</a><div className="mt-2 flex gap-2"><button type="button" onClick={copyUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-brand"><Copy size={13} />Copy link</button><a href={profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-brand">Preview <ExternalLink size={13} /></a></div></div>
    </Card>
    {editing && <div className="fixed inset-0 z-[75] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditing(false); }}><form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><h3 className="text-lg font-semibold text-ink">Public profile settings</h3><p className="mt-1 text-sm text-muted-ink">Set the language and a memorable shareable profile address.</p><label className="mt-5 block text-sm font-medium">Profile language<select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}>{languageOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Custom profile URL<input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} minLength="3" maxLength="40" pattern="[a-z0-9-]{3,40}" className={inputClass} placeholder="your-name" /><span className="mt-1 block text-xs text-muted-ink">Use 3–40 lowercase letters, numbers or hyphens. Leave blank to use your account link.</span></label><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div></form></div>}
  </>;
}

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
