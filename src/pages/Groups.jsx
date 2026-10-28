import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, MoreHorizontal, Search, Settings, Link2, LogOut, UsersRound, X } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/layout/Card.jsx";
import {
  createGroup,
  getGroups,
  toggleGroupMembership,
  updateGroup,
} from "../services/communityServices.js";
import useTranslation from "../hooks/useTranslation";

const blankGroup = { name: "", description: "", category: "", location: "", rules: "", privacy: "public", showInSearch: true, image: null, coverImage: null };

export default function Groups() {
  const t = useTranslation();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankGroup);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("your");
  const [menuId, setMenuId] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const imageRef = useRef(null);
  const coverImageRef = useRef(null);
  const editImageRef = useRef(null);
  const editCoverImageRef = useRef(null);

  const load = useCallback(async (query = "") => {
    try {
      setLoading(true);
      setGroups(await getGroups(query));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load groups");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(""); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const created = await createGroup(form);
      setGroups((items) => [{ ...created, memberCount: 1, isMember: true, isOwner: true }, ...items]);
      setForm(blankGroup);
      setShowForm(false);
      toast.success("Group created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create group");
    }
  };

  const updateMembership = async (group) => {
    try {
      const result = await toggleGroupMembership(group._id);
      setGroups((items) => items.map((item) => item._id === group._id
        ? { ...item, isMember: result.joined, isRequested: result.requested || false, memberCount: result.memberCount }
        : item));
      toast.success(result.requested ? "Join request sent" : result.joined ? "Joined group" : "Left group");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update group membership");
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!editingGroup) return;
    try {
      setSaving(true);
      const updated = await updateGroup(editingGroup._id, editingGroup);
      setGroups((items) => items.map((item) => item._id === updated._id ? { ...item, ...updated } : item));
      setEditingGroup(null);
      toast.success("Group updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update group");
    } finally {
      setSaving(false);
    }
  };

  const visibleGroups = groups.filter((group) => {
    if (activeTab === "your") return group.isMember || group.isOwner;
    if (activeTab === "requested") return group.isRequested;
    return !group.isMember && !group.isRequested;
  });

  return (
    <div className="min-h-screen bg-[#f3f2ef] px-4 py-6">
      <div className="mx-auto max-w-[1000px] space-y-4">
        <Card className="overflow-visible">
          <header className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{t("Groups")}</h1>
              <p className="mt-1 text-sm text-muted-ink">{t("Find communities where professionals share knowledge and opportunities.")}</p>
            </div>
            <button type="button" onClick={() => setShowForm((value) => !value)} className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-sky">
              {t(showForm ? "Cancel" : "Create group")}
            </button>
          </header>
          <nav className="flex gap-1 overflow-x-auto px-5" aria-label="Group lists">
            {[["your", "Your groups"], ["requested", "Requested"], ["discover", "Discover"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)} aria-pressed={activeTab === key} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${activeTab === key ? "border-emerald-700 text-emerald-800" : "border-transparent text-muted-ink hover:text-ink"}`}>{t(label)}</button>
            ))}
          </nav>
          <div className="flex gap-2 border-t border-gray-100 p-4">
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load(search)} placeholder={t("Search groups")} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
            <button type="button" onClick={() => load(search)} className="grid h-10 w-10 place-items-center rounded-lg border border-gray-300 text-muted-ink hover:bg-gray-50" aria-label={t("Search groups")}><Search size={17} /></button>
          </div>
        </Card>

        {showForm && (
          <Card className="p-5">
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("Group name")} className={fieldClass} />
              <input maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder={t("Category")} className={fieldClass} />
              <input maxLength={200} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={t("Location (optional)")} className={fieldClass} />
              <textarea required maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("What is this group about?")} className={`${fieldClass} sm:col-span-2`} rows={3} />
              <textarea maxLength={2000} value={form.rules} onChange={(event) => setForm({ ...form, rules: event.target.value })} placeholder={t("Group rules (optional)")} className={`${fieldClass} sm:col-span-2`} rows={2} />
              <select value={form.privacy} onChange={(event) => setForm({ ...form, privacy: event.target.value })} className={fieldClass}><option value="public">{t("Public group")}</option><option value="private">{t("Private group")}</option></select>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-ink"><input type="checkbox" checked={form.showInSearch} disabled={form.privacy !== "public"} onChange={(event) => setForm({ ...form, showInSearch: event.target.checked })} className="h-4 w-4 accent-emerald-700" />{t("Show in public group discovery")}</label>
              <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                <div><p className="text-sm font-semibold text-ink">{t("Group icon")}</p><p className="mt-1 text-xs text-muted-ink">{t("Shown beside your group name and in group lists.")}</p></div>
                {form.image && <SelectedImagePreview file={form.image} alt="Selected group icon preview" className="h-20 w-20 rounded-lg object-cover" />}
                <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const image = event.target.files?.[0] || null; event.target.value = ""; setForm({ ...form, image }); }} />
                <button type="button" onClick={() => imageRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink hover:bg-gray-50"><ImagePlus size={17} />{form.image ? form.image.name : t("Add group icon")}</button>
                {form.image && <button type="button" onClick={() => setForm({ ...form, image: null })} className="block text-left text-sm text-red-600 hover:underline">{t("Remove selected icon")}</button>}
              </div>
              <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                <div><p className="text-sm font-semibold text-ink">{t("Group cover image")}</p><p className="mt-1 text-xs text-muted-ink">{t("A wide banner image displayed at the top of your group page.")}</p></div>
                {form.coverImage && <SelectedImagePreview file={form.coverImage} alt="Selected group cover preview" className="h-24 w-full rounded-lg object-cover" />}
                <input ref={coverImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const coverImage = event.target.files?.[0] || null; event.target.value = ""; setForm({ ...form, coverImage }); }} />
                <button type="button" onClick={() => coverImageRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink hover:bg-gray-50"><ImagePlus size={17} />{form.coverImage ? form.coverImage.name : t("Add cover image")}</button>
                {form.coverImage && <button type="button" onClick={() => setForm({ ...form, coverImage: null })} className="block text-left text-sm text-red-600 hover:underline">{t("Remove selected cover")}</button>}
              </div>
              <button className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover sm:col-start-2">{t("Create group")}</button>
            </form>
          </Card>
        )}

        {loading ? <Card className="p-8 text-center text-sm text-muted-ink">{t("Loading groups…")}</Card> : visibleGroups.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-ink">
            {t(activeTab === "your" ? "You haven't joined any groups yet." : activeTab === "requested" ? "You don't have pending group requests." : "No groups found. Try another search or create one.")}
          </Card>
        ) : (
          <Card className="divide-y divide-gray-100">
            {visibleGroups.map((group) => (
              <article key={group._id} className="relative flex items-center gap-3 px-5 py-5 sm:gap-4">
                <Link to={`/groups/${group._id}`} className="shrink-0">
                  {group.image?.url
                    ? <img src={group.image.url} alt="" className="h-[68px] w-[68px] object-cover" />
                    : <div className="grid h-[68px] w-[68px] place-items-center bg-sky text-brand"><UsersRound size={30} /></div>}
                </Link>
                <Link to={`/groups/${group._id}`} className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-ink hover:underline">{group.name}</h2>
                  <p className="mt-0.5 text-xs text-muted-ink">{Number(group.memberCount || 0).toLocaleString()} {group.memberCount === 1 ? "member" : "members"} · {group.category || "Professional"} · {group.privacy}</p>
                  {group.isOwner && <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Owner</span>}
                  {group.isRequested && <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Request pending</span>}
                </Link>
                <div className="relative flex shrink-0 items-center gap-2">
                  {activeTab === "discover" && <button type="button" onClick={() => updateMembership(group)} className="rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-sky">{group.privacy === "private" ? "Request to join" : "Join"}</button>}
                  <button type="button" onClick={() => setMenuId((current) => current === group._id ? "" : group._id)} aria-label={`${group.name} options`} className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-gray-100"><MoreHorizontal size={21} /></button>
                  {menuId === group._id && <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/groups/${group._id}`); toast.success("Group link copied"); } catch { toast.error("Unable to copy group link"); } setMenuId(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Link2 size={17} />Copy link to group</button>
                    {group.isOwner && <button type="button" onClick={() => { setEditingGroup({ ...group, image: null }); setMenuId(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><Settings size={17} />Update your settings</button>}
                    {(group.isMember || group.isOwner) && <button type="button" disabled={group.isOwner} title={group.isOwner ? "Owners cannot leave their group" : undefined} onClick={() => { setMenuId(""); updateMembership(group); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><LogOut size={17} />{group.isOwner ? "Owner cannot leave" : "Leave this group"}</button>}
                    {group.isRequested && <button type="button" onClick={() => { setMenuId(""); updateMembership(group); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"><X size={17} />Cancel request</button>}
                  </div>}
                </div>
              </article>
            ))}
          </Card>
        )}

        {editingGroup && (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditingGroup(null); }}>
            <form onSubmit={saveSettings} className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <header className="flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">Update group settings</h2><button type="button" onClick={() => setEditingGroup(null)} aria-label="Close"><X size={20} /></button></header>
              <label className="block text-sm font-medium">Group name<input required maxLength={120} value={editingGroup.name} onChange={(event) => setEditingGroup({ ...editingGroup, name: event.target.value })} className={fieldClass} /></label>
              <label className="block text-sm font-medium">Description<textarea required maxLength={2000} rows={4} value={editingGroup.description} onChange={(event) => setEditingGroup({ ...editingGroup, description: event.target.value })} className={fieldClass} /></label>
              <label className="block text-sm font-medium">Category<input maxLength={80} value={editingGroup.category || ""} onChange={(event) => setEditingGroup({ ...editingGroup, category: event.target.value })} className={fieldClass} /></label>
              <label className="block text-sm font-medium">Location<input maxLength={200} value={editingGroup.location || ""} onChange={(event) => setEditingGroup({ ...editingGroup, location: event.target.value })} className={fieldClass} /></label>
              <label className="block text-sm font-medium">Group rules<textarea maxLength={2000} rows={3} value={editingGroup.rules || ""} onChange={(event) => setEditingGroup({ ...editingGroup, rules: event.target.value })} className={fieldClass} /></label>
              <div><label className="block text-sm font-medium">Group type<select value={editingGroup.privacy} onChange={(event) => setEditingGroup({ ...editingGroup, privacy: event.target.value, showInSearch: event.target.value === "public" && editingGroup.showInSearch !== false })} className={fieldClass}><option value="public">Public</option><option value="private">Private</option></select><span className="mt-1 block text-xs font-normal text-muted-ink">{editingGroup.privacy === "public" ? "Anyone can see group posts. Only group members can comment and create posts." : "Only members can view and participate in this group."}</span></label></div>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm"><input type="checkbox" checked={editingGroup.privacy === "public" && editingGroup.showInSearch !== false} disabled={editingGroup.privacy !== "public"} onChange={(event) => setEditingGroup({ ...editingGroup, showInSearch: event.target.checked })} className="h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Show in public group discovery</span><span className="mt-1 block text-xs text-muted-ink">Private groups remain hidden from discovery.</span></span></label>
              <fieldset className="rounded-xl border border-gray-200 p-4 sm:col-span-2"><legend className="px-1 text-sm font-semibold">Permissions</legend><label className="mt-2 flex items-start gap-3 text-sm"><input type="checkbox" checked={editingGroup.allowMemberInvites ?? true} onChange={(event) => setEditingGroup({ ...editingGroup, allowMemberInvites: event.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Allow members to invite their connections</span><span className="mt-1 block text-xs leading-5 text-muted-ink">Members can invite their connections to the group. Requests to join still require admin approval.</span></span></label><label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(editingGroup.requirePostApproval)} onChange={(event) => setEditingGroup({ ...editingGroup, requirePostApproval: event.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="font-medium">Require new posts to be reviewed by admins</span><span className="mt-1 block text-xs leading-5 text-muted-ink">New member posts stay pending until an admin approves them.</span></span></label></fieldset>
              <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-medium">Group icon</p>
                {editingGroup.image?.url && <img src={editingGroup.image.url} alt="Current group icon" className="h-16 w-16 rounded-lg object-cover" />}
                <input ref={editImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setEditingGroup({ ...editingGroup, image: event.target.files?.[0] || null })} />
                <button type="button" onClick={() => editImageRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><ImagePlus size={17} />{editingGroup.image?.name || "Change group icon"}</button>
              </div>
              <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                <p className="text-sm font-medium">Cover image</p>
                {editingGroup.coverImage?.url && <img src={editingGroup.coverImage.url} alt="Current group cover" className="h-24 w-full rounded-lg object-cover" />}
                <input ref={editCoverImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setEditingGroup({ ...editingGroup, coverImage: event.target.files?.[0] || null })} />
                <button type="button" onClick={() => editCoverImageRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><ImagePlus size={17} />{editingGroup.coverImage?.name || "Add or change cover image"}</button>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={saving} onClick={() => setEditingGroup(null)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedImagePreview({ file, alt, className }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview ? <img src={preview} alt={alt} className={className} /> : null;
}

const fieldClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand";
