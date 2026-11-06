import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, Eye, Plus, Search, Settings, Shield, UserRound, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api.js";

const topics = ["Service request", "Request a demo", "Support", "Careers", "Other"];
const settingRows = [
  ["admins", "Manage admins", "Control who manages your page"],
  ["blocked", "Manage blocked members and Pages", "See all blocked members and Pages"],
  ["following", "Manage following", "See all the Pages your Page follows"],
  ["inbox", "Inbox settings", "Choose whether members can message the Page and select conversation topics"],
  ["jobs", "Job posting", "Manage who can post jobs and how jobs are shared on your Page"],
  ["deactivate", "Deactivate page", "Take your page down"],
];

export default function CompanyPageSettings({ companyPage }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [domain, setDomain] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/company-pages/${companyPage._id}/settings`);
      setSettings(data.settings);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load page settings");
    } finally {
      setLoading(false);
    }
  }, [companyPage._id]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSettings = async (updates, message = "Settings saved") => {
    try {
      setSaving(true);
      const { data } = await api.put(`/company-pages/${companyPage._id}/settings`, {
        messagingEnabled: settings.messagingEnabled,
        conversationTopics: settings.conversationTopics,
        jobPostingDomains: settings.jobPostingDomains,
        basicJobPostingEnabled: settings.basicJobPostingEnabled,
        shareNewJobs: settings.shareNewJobs,
        ...updates,
      });
      setSettings((current) => ({ ...current, ...data.settings }));
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const searchTargets = async (event) => {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      toast.error("Enter at least two characters to search");
      return;
    }
    try {
      setSearching(true);
      const response = selected === "following" || (selected === "blocked" && query.startsWith("page:"))
        ? await api.get("/company-pages/discover", { params: { search: term.replace(/^page:/i, "").trim() } })
        : await api.get("/users/search", { params: { q: term } });
      const pageResults = selected === "following" || (selected === "blocked" && query.startsWith("page:"));
      setResults((pageResults
        ? (response.data.companyPages || []).filter((page) => page._id !== companyPage._id)
        : (response.data.users || [])).map((item) => ({
        ...item,
        isManaged: pageResults
          ? (selected === "following" ? settings.followedPages : settings.blockedPages).some((entry) => entry._id === item._id)
          : settings.blockedMembers.some((entry) => entry._id === item._id),
      })));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to search");
    } finally {
      setSearching(false);
    }
  };

  const changeRelationship = async (kind, targetId) => {
    try {
      const { data } = await api.post(`/company-pages/${companyPage._id}/settings/${kind}/${targetId}`);
      setResults((current) => current.map((item) => item._id === targetId ? { ...item, isManaged: data.active } : item));
      await loadSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update this setting");
    }
  };

  const updateActive = async (active) => {
    try {
      setSaving(true);
      await api.patch(`/company-pages/${companyPage._id}/active`, {
        active,
        confirmation: active ? undefined : confirmation,
      });
      setSettings((current) => ({ ...current, active }));
      setDeactivateOpen(false);
      setConfirmation("");
      toast.success(active ? "Company Page reactivated" : "Company Page deactivated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update Company Page status");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Loading settings…</section>;
  if (!settings) return <section className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-muted-ink">Settings could not be loaded. Refresh the page to try again.</section>;

  const back = () => { setSelected(""); setQuery(""); setResults([]); };
  const heading = settingRows.find(([id]) => id === selected)?.[1];
  const saveToggle = async (key, value) => {
    const saved = await saveSettings({ [key]: value });
    if (saved) setSettings((current) => ({ ...current, [key]: value }));
  };
  const addDomain = async (event) => {
    event.preventDefault();
    const value = domain.trim().replace(/^@/, "").toLowerCase();
    if (!value) return;
    const saved = await saveSettings({ jobPostingDomains: [...new Set([...settings.jobPostingDomains, value])] }, "Email domain added");
    if (saved) setDomain("");
  };
  const removeDomain = async (value) => saveSettings({
    jobPostingDomains: settings.jobPostingDomains.filter((item) => item !== value),
  }, "Email domain removed");

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {selected ? (
        <>
          <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
            <button type="button" onClick={back} aria-label="Back to settings" className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-100"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-semibold text-ink">{heading}</h2>
          </header>
          <div className="p-5 sm:p-6">
            {selected === "admins" && <AdminSettings
              companyPageId={companyPage._id}
              owner={settings.owner}
              admins={settings.admins || []}
              canManage={settings.currentRole === "super_admin"}
              onChanged={loadSettings}
            />}
            {selected === "blocked" && <RelationshipSettings
              kind="blocked-members"
              pagesKind="blocked-pages"
              entries={[...(settings.blockedMembers || []).map((item) => ({ ...item, kind: "blocked-members" })), ...(settings.blockedPages || []).map((item) => ({ ...item, kind: "blocked-pages" }))]}
              query={query}
              onQueryChange={setQuery}
              results={results}
              searching={searching}
              onSearch={searchTargets}
              onToggle={changeRelationship}
            />}
            {selected === "following" && <RelationshipSettings
              kind="following"
              entries={(settings.followedPages || []).map((item) => ({ ...item, kind: "following" }))}
              query={query}
              onQueryChange={(value) => setQuery(value.startsWith("page:") ? value : value)}
              results={results}
              searching={searching}
              onSearch={searchTargets}
              onToggle={changeRelationship}
              pageMode
            />}
            {selected === "inbox" && <InboxSettings settings={settings} saving={saving} onSave={saveSettings} onToggle={saveToggle} />}
            {selected === "jobs" && <JobSettings pageName={companyPage.name} settings={settings} domain={domain} onDomainChange={setDomain} onAddDomain={addDomain} onRemoveDomain={removeDomain} onToggle={saveToggle} saving={saving} />}
            {selected === "deactivate" && <DeactivateSettings
              active={settings.active}
              onDeactivate={() => setDeactivateOpen(true)}
              onReactivate={() => updateActive(true)}
              saving={saving}
            />}
          </div>
        </>
      ) : (
        <>
          <h2 className="px-5 pb-2 pt-5 text-2xl font-semibold text-ink"><Settings className="mr-2 inline" size={22} />Settings</h2>
          <div className="divide-y divide-gray-200">
            {settingRows.map(([id, title, description]) => (
              <button key={id} type="button" onClick={() => setSelected(id)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-gray-50">
                <span><span className="block font-medium text-ink">{title}</span><span className="mt-1 block text-sm text-muted-ink">{description}</span></span>
                <ArrowRight className="shrink-0 text-gray-600" size={20} />
              </button>
            ))}
          </div>
        </>
      )}

      {deactivateOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeactivateOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="deactivate-page-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 id="deactivate-page-title" className="text-xl font-semibold text-ink">Deactivate page</h3>
              <button type="button" onClick={() => setDeactivateOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <h4 className="mt-5 text-lg font-semibold text-ink">We’re sorry to see you go</h4>
            <p className="mt-2 text-sm leading-6 text-muted-ink">Deactivating hides this page from public profiles and search. Your content and jobs are retained, and you can reactivate the page later.</p>
            <p className="mt-5 text-sm font-medium text-ink">To confirm, enter the exact page name: <strong>{companyPage.name}</strong></p>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand" />
            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setDeactivateOpen(false)} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="button" disabled={saving || confirmation !== companyPage.name} onClick={() => updateActive(false)} className="rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Deactivating…" : "Deactivate page"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function AdminSettings({ companyPageId, owner, admins, canManage, onChanged }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("content_admin");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyAdminId, setBusyAdminId] = useState("");

  const searchMembers = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      toast.error("Enter at least two characters to search");
      return;
    }
    try {
      setSearching(true);
      const { data } = await api.get("/users/search", { params: { q: query.trim() } });
      const existingIds = new Set([owner?._id, ...admins.map((admin) => admin.user?._id)].filter(Boolean));
      setResults((data.users || []).filter((user) => !existingIds.has(user._id)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to search members");
    } finally {
      setSearching(false);
    }
  };

  const addAdmin = async (user) => {
    try {
      setBusyAdminId(user._id);
      await api.post(`/company-pages/${companyPageId}/admins`, { userId: user._id, role });
      setResults((current) => current.filter((entry) => entry._id !== user._id));
      toast.success(`${user.name} added as a page admin`);
      await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to add this page admin");
    } finally {
      setBusyAdminId("");
    }
  };

  const changeAdminRole = async (adminId, nextRole) => {
    try {
      setBusyAdminId(adminId);
      await api.patch(`/company-pages/${companyPageId}/admins/${adminId}`, { role: nextRole });
      toast.success("Admin role updated");
      await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update this admin role");
    } finally {
      setBusyAdminId("");
    }
  };

  const removeAdmin = async (admin) => {
    if (!window.confirm(`Remove ${admin.user?.name || "this member"} as a page admin?`)) return;
    try {
      setBusyAdminId(admin.user._id);
      await api.delete(`/company-pages/${companyPageId}/admins/${admin.user._id}`);
      toast.success("Page admin removed");
      await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove this page admin");
    } finally {
      setBusyAdminId("");
    }
  };

  const transferSuperAdmin = async (admin) => {
    if (!window.confirm(`Transfer Super admin to ${admin.user?.name || "this admin"}? You will become a Content admin.`)) return;
    try {
      setBusyAdminId(admin.user._id);
      await api.post(`/company-pages/${companyPageId}/admins/${admin.user._id}/transfer-super-admin`);
      toast.success("Super admin role transferred");
      await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to transfer the Super admin role");
    } finally {
      setBusyAdminId("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted-ink">Assign Content admins to manage Page posts and activity, or Analysts to view Page analytics. Only the Super admin can manage admins and transfer ownership.</p>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800"><Shield size={16} />Page admins ({1 + admins.length})</span>
      </div>
      {canManage && <section className="mt-5 rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-ink">Add page admin</h3>
        <p className="mt-1 text-sm text-muted-ink">Search for a member and assign a role. Super admin can only be transferred to an existing admin.</p>
        <form onSubmit={searchMembers} className="mt-4 flex flex-wrap gap-2">
          <label className="relative min-w-[180px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members by name" className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand" />
          </label>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="content_admin">Content admin</option>
            <option value="analyst">Analyst</option>
          </select>
          <button type="submit" disabled={searching} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{searching ? "Searching…" : "Search"}</button>
        </form>
        {results.length > 0 && <div className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {results.map((user) => <div key={user._id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">
              {user.profilePicture ? <img src={user.profilePicture} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-sky text-brand"><UserRound size={18} /></span>}
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{user.name}</span><span className="block truncate text-xs text-muted-ink">{user.headline || ""}</span></span>
            </div>
            <button type="button" disabled={busyAdminId === user._id} onClick={() => addAdmin(user)} className="shrink-0 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand disabled:opacity-50">Add admin</button>
          </div>)}
        </div>}
      </section>}
      <div className="mt-5 grid grid-cols-[1fr_auto] gap-3 border-y border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700"><span>Profile</span><span>Role and actions</span></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 font-semibold text-white">{(owner?.name || "A").slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate font-medium text-ink">{owner?.name || "Page owner"}{canManage ? " · You" : ""}</span><span className="block text-xs text-muted-ink">Page owner</span></span>
        </div>
        <span className="rounded bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">Super admin</span>
      </div>
      {admins.map((admin) => <div key={admin._id || admin.user?._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-4 last:border-b-0">
        <div className="flex min-w-0 items-center gap-3">
          {admin.user?.profilePicture ? <img src={admin.user.profilePicture} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-sky text-brand"><UserRound size={19} /></span>}
          <span className="min-w-0"><span className="block truncate font-medium text-ink">{admin.user?.name || "CareerLink member"}</span><span className="block truncate text-xs text-muted-ink">{admin.user?.headline || "Page admin"}</span></span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManage ? <>
            <select aria-label={`Role for ${admin.user?.name || "admin"}`} disabled={busyAdminId === admin.user?._id} value={admin.role} onChange={(event) => changeAdminRole(admin.user._id, event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="content_admin">Content admin</option>
              <option value="analyst">Analyst</option>
            </select>
            <button type="button" disabled={busyAdminId === admin.user?._id} onClick={() => transferSuperAdmin(admin)} className="rounded-full border border-brand px-3 py-1.5 text-sm font-semibold text-brand disabled:opacity-50">Make Super admin</button>
            <button type="button" disabled={busyAdminId === admin.user?._id} onClick={() => removeAdmin(admin)} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50">Remove</button>
          </> : <span className="rounded bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">{admin.role === "analyst" ? "Analyst" : "Content admin"}</span>}
        </div>
      </div>)}
    </div>
  );
}

function RelationshipSettings({ kind, pagesKind, entries, query, onQueryChange, results, searching, onSearch, onToggle, pageMode = false }) {
  const isPageSearch = pageMode || query.startsWith("page:");
  const actionKind = isPageSearch ? (pageMode ? kind : pagesKind) : kind;
  return (
    <div>
      <p className="text-sm text-muted-ink">{pageMode ? "Follow Pages as this Company Page. Search by Page name or industry." : "Search and manage blocked members and Pages. Prefix a Page search with “page:”."}</p>
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={pageMode ? "Search Pages to follow" : "Search members, or use page: followed by a Page name"} className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand" />
        </label>
        <button type="submit" disabled={searching} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{searching ? "Searching…" : "Search"}</button>
      </form>
      {entries.length > 0 && <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
        {entries.map((entry) => <RelationshipRow key={`${entry.kind}-${entry._id}`} item={entry} onAction={() => onToggle(entry.kind, entry._id)} action={entry.kind === "following" ? "Unfollow" : "Unblock"} />)}
      </div>}
      {results.length > 0 && <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {results.map((item) => <RelationshipRow key={item._id} item={item} onAction={() => onToggle(actionKind, item._id)} action={item.isManaged ? (actionKind === "following" ? "Unfollow" : "Unblock") : pageMode ? "Follow" : "Block"} />)}
      </div>}
      {!entries.length && !results.length && <p className="py-8 text-center text-sm text-muted-ink">{pageMode ? "This Page does not follow other Pages yet." : "No blocked members or Pages."}</p>}
    </div>
  );
}

function RelationshipRow({ item, onAction, action }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {item.logo?.url || item.profilePicture ? <img src={item.logo?.url || item.profilePicture} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky text-brand">{item.kind === "blocked-members" ? <UserRound size={18} /> : <Building2 size={18} />}</span>}
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{item.name || "CareerLink member"}</span><span className="block truncate text-xs text-muted-ink">{item.headline || item.industry || item.publicUrlSlug || ""}</span></span>
      </div>
      <button type="button" onClick={onAction} className="shrink-0 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">{action}</button>
    </div>
  );
}

function InboxSettings({ settings, saving, onSave, onToggle }) {
  const [selectedTopics, setSelectedTopics] = useState(settings.conversationTopics || []);
  const toggleTopic = (topic) => setSelectedTopics((current) => current.includes(topic) ? current.filter((value) => value !== topic) : [...current, topic]);
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="font-semibold text-ink">Message button</h3><p className="mt-1 text-sm text-muted-ink">Allow members to message your Page.</p></div>
        <button type="button" role="switch" aria-checked={settings.messagingEnabled} disabled={saving} onClick={() => onToggle("messagingEnabled", !settings.messagingEnabled)} className={`relative h-7 w-12 rounded-full transition ${settings.messagingEnabled ? "bg-emerald-700" : "bg-gray-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${settings.messagingEnabled ? "left-6" : "left-1"}`} /></button>
      </div>
      <div>
        <h3 className="font-semibold text-ink">Conversation topics</h3>
        <p className="mt-1 text-sm text-muted-ink">Choose what members can contact your Page about. Select at least two topics while messaging is enabled.</p>
        <div className="mt-4 flex flex-wrap gap-2">{topics.map((topic) => {
          const active = selectedTopics.includes(topic);
          return <button key={topic} type="button" aria-pressed={active} onClick={() => toggleTopic(topic)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 text-gray-700 hover:border-emerald-700"}`}>{topic}{active && <Check className="ml-1 inline" size={15} />}</button>;
        })}</div>
        <button type="button" disabled={saving || (settings.messagingEnabled && selectedTopics.length < 2)} onClick={() => onSave({ conversationTopics: selectedTopics }, "Inbox settings saved")} className="mt-5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

function JobSettings({ pageName, settings, domain, onDomainChange, onAddDomain, onRemoveDomain, onToggle, saving }) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200">
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4">
          <div><h3 className="font-semibold text-ink">Domains for job posting access</h3><p className="mt-1 text-xs text-muted-ink">Verified members with these email domains can post jobs for this Page when basic job posting is enabled.</p></div>
          <Plus className="text-brand" size={19} />
        </header>
        <form onSubmit={onAddDomain} className="flex gap-2 border-b border-gray-100 p-4">
          <input type="text" value={domain} onChange={(event) => onDomainChange(event.target.value)} placeholder="example.com" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          <button type="submit" disabled={saving || !domain.trim()} className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50">Add domain</button>
        </form>
        {settings.jobPostingDomains.length ? settings.jobPostingDomains.map((value) => <div key={value} className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0"><span className="text-sm text-ink">{value}</span><button type="button" onClick={() => onRemoveDomain(value)} aria-label={`Remove ${value}`} className="rounded-full p-2 text-gray-600 hover:bg-red-50 hover:text-red-700"><X size={17} /></button></div>) : <p className="px-4 py-4 text-sm text-muted-ink">No approved domains added.</p>}
      </section>
      <section className="rounded-lg border border-gray-200 p-4">
        <SettingToggle title="Enable basic job posting" description="Allow verified members from approved domains to post basic jobs on your Company Page." checked={settings.basicJobPostingEnabled} disabled={saving} onChange={(value) => onToggle("basicJobPostingEnabled", value)} />
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">ATS import is not available until an applicant-tracking integration is connected. Jobs posted here are managed in the Company Page Jobs section.</p>
      </section>
      <section className="rounded-lg border border-gray-200 p-4">
        <SettingToggle title="Share new jobs" description="Automatically publish a Company Page post when a new job is opened." checked={settings.shareNewJobs} disabled={saving} onChange={(value) => onToggle("shareNewJobs", value)} />
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-ink">Preview</span>
          <p className="mt-2 text-sm font-semibold text-ink">{pageName}</p>
          <p className="mt-2 text-sm text-gray-700">We’re hiring: Job title in location. Apply today.</p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"><span className="text-xs text-muted-ink">Job title · {pageName}</span><BriefcaseBusiness className="text-brand" size={18} /></div>
          <p className="mt-3 text-xs text-brand"><Eye className="mr-1 inline" size={14} />Preview only — the job card appears on automatically shared posts.</p>
        </div>
      </section>
    </div>
  );
}

function SettingToggle({ title, description, checked, disabled, onChange }) {
  return <div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm text-muted-ink">{description}</p></div><button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-700" : "bg-gray-300"} disabled:opacity-60`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button></div>;
}

function DeactivateSettings({ active, onDeactivate, onReactivate, saving }) {
  return (
    <div className="max-w-2xl">
      {active ? <>
        <h3 className="text-xl font-semibold text-ink">We’re sorry to see you go</h3>
        <p className="mt-3 text-sm leading-6 text-muted-ink">Deactivating will hide this page from public profiles and search. Your page URL, followers, posts, and jobs will be retained. The owner can reactivate the page at any time.</p>
        <div className="mt-5 space-y-3">{[
          ["Page URL", "Your page URL will remain reserved while the page is deactivated."],
          ["Search listings", "The page will no longer appear in public search."],
          ["Member access", "Visitors will not be able to open the page until it is reactivated."],
        ].map(([title, detail]) => <div key={title} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky text-brand"><Building2 size={18} /></span><span><strong className="block text-sm text-ink">{title}</strong><span className="text-sm text-muted-ink">{detail}</span></span></div>)}</div>
        <button type="button" onClick={onDeactivate} disabled={saving} className="mt-6 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Deactivate page</button>
      </> : <>
        <h3 className="text-xl font-semibold text-ink">This page is deactivated</h3>
        <p className="mt-2 text-sm text-muted-ink">It is hidden from public profiles and search. Your content and jobs are safe.</p>
        <button type="button" onClick={onReactivate} disabled={saving} className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Reactivating…" : "Reactivate page"}</button>
      </>}
    </div>
  );
}
