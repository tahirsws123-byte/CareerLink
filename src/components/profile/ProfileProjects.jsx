import { useState } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import DeleteConfirmationModal from "./DeleteConfirmationModal.jsx";
import { updateProfile } from "../../services/userServices.js";

const blankProject = { name: "", description: "", url: "", skills: "", projectDuration: "" };

export default function ProfileProjects({ items = [], isMe, onSaved }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(blankProject);
  const [saving, setSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const startEdit = (project = null) => {
    setSelected(project);
    setDraft(project ? {
      ...project,
      skills: (project.skills || []).join(", "),
      projectDuration: project.projectDuration || "",
    } : blankProject);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const normalized = {
      ...draft,
      skills: draft.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
    };
    const projects = selected
      ? items.map((project) => project._id === selected._id ? { ...project, ...normalized } : project)
      : [...items, normalized];
    try {
      setSaving(true);
      const { user } = await updateProfile({ projects });
      onSaved(user.projects || []);
      setOpen(false);
      toast.success(selected ? "Project updated" : "Project added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save project");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!projectToDelete) return;
    try {
      setDeleting(true);
      const { user } = await updateProfile({ projects: items.filter((item) => item._id !== projectToDelete._id) });
      onSaved(user.projects || []);
      setProjectToDelete(null);
      toast.success("Project removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove project");
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <Card id="projects" className="scroll-mt-24 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Projects &amp; portfolio</h2><p className="mt-1 text-xs text-muted-ink">Show the work behind your skills.</p></div>{isMe && <button type="button" onClick={() => startEdit()} className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-sky hover:text-brand" aria-label="Add project"><Plus size={20} /></button>}</div>
      {items.length ? <div className="mt-3 divide-y divide-gray-100">{items.map((project) => <article key={project._id || project.name} className="py-4 first:pt-3 last:pb-0"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky text-lg">✦</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold text-ink">{project.name}</h3>{project.projectDuration && <p className="mt-1 text-xs text-muted-ink">Built in {project.projectDuration}</p>}</div>{isMe && <div className="flex shrink-0"><button type="button" onClick={() => startEdit(project)} aria-label={`Edit ${project.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100"><Pencil size={15} /></button><button type="button" onClick={() => setProjectToDelete(project)} aria-label={`Remove ${project.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div>}</div>{project.description && <p className="mt-2 whitespace-pre-line text-sm leading-5 text-gray-700">{project.description}</p>}{project.skills?.length > 0 && <p className="mt-2 text-xs text-muted-ink"><span className="font-semibold text-gray-700">Skills:</span> {project.skills.join(" · ")}</p>}{project.url && <a href={project.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">View project <ExternalLink size={14} /></a>}</div></div></article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5"><p className="text-sm text-muted-ink">{isMe ? "Add a project, portfolio, or case study to make your skills tangible." : "No projects have been added yet."}</p>{isMe && <button type="button" onClick={() => startEdit()} className="mt-3 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Add a project</button>}</div>}
    </Card>
    <DeleteConfirmationModal
      open={Boolean(projectToDelete)}
      title="Remove project"
      message={`Remove “${projectToDelete?.name || "this project"}” from your profile?`}
      loading={deleting}
      onCancel={() => setProjectToDelete(null)}
      onConfirm={remove}
    />
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}><form onSubmit={save} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-semibold text-ink">{selected ? "Edit project" : "Add a project"}</h3><p className="mt-1 text-sm text-muted-ink">Add a portfolio item, open-source project, or case study.</p></div><button type="button" disabled={saving} onClick={() => setOpen(false)} className="text-xl text-gray-500" aria-label="Close">×</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Project name *<input required maxLength="120" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} placeholder="Project or product name" /></label><label className="text-sm font-medium sm:col-span-2">Description<textarea maxLength="2000" rows="4" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={inputClass} placeholder="What did you build and what impact did it have?" /></label><label className="text-sm font-medium sm:col-span-2">Project URL<input type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} className={inputClass} placeholder="https://…" /></label><label className="text-sm font-medium sm:col-span-2">Skills (comma separated)<input value={draft.skills} onChange={(event) => setDraft({ ...draft, skills: event.target.value })} className={inputClass} placeholder="React, product design, SQL" /></label><label className="text-sm font-medium sm:col-span-2">How long did it take to build?<input maxLength="80" value={draft.projectDuration} onChange={(event) => setDraft({ ...draft, projectDuration: event.target.value })} className={inputClass} placeholder="e.g. 3 months, 6 weeks" /></label></div><div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save project"}</button></div></form></div>}
  </>;
}

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
