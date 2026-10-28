import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import DeleteConfirmationModal from "./DeleteConfirmationModal.jsx";
import { updateProfile } from "../../services/userServices.js";

const proficiencies = ["Basic", "Conversational", "Professional working", "Full professional", "Native or bilingual"];

export default function ProfileLanguages({ items = [], isMe, onSaved }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [proficiency, setProficiency] = useState("Conversational");
  const [saving, setSaving] = useState(false);
  const [languageToDelete, setLanguageToDelete] = useState(null);

  const startEdit = (language = null) => {
    setSelected(language);
    setName(language?.name || "");
    setProficiency(language?.proficiency || "Conversational");
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    const next = selected
      ? items.map((item) => item._id === selected._id ? { ...item, name: name.trim(), proficiency } : item)
      : [...items, { name: name.trim(), proficiency }];
    try {
      setSaving(true);
      const { user } = await updateProfile({ languages: next });
      onSaved(user.languages || []);
      setOpen(false);
      toast.success(selected ? "Language updated" : "Language added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save language");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!languageToDelete) return;
    try {
      setSaving(true);
      const { user } = await updateProfile({ languages: items.filter((item) => item._id !== languageToDelete._id) });
      onSaved(user.languages || []);
      setLanguageToDelete(null);
      toast.success("Language removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove language");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Card id="languages" className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-ink">Languages</h2><p className="mt-1 text-xs text-muted-ink">Make your language strengths easy to find.</p></div>{isMe && <button type="button" onClick={() => startEdit()} aria-label="Add language" className="grid h-9 w-9 place-items-center rounded-full text-muted-ink hover:bg-sky hover:text-brand"><Plus size={20} /></button>}</div>
      {items.length ? <div className="mt-2 divide-y divide-gray-100">{items.map((item) => <div key={item._id || item.name} className="flex items-center justify-between gap-3 py-3"><div><h3 className="text-sm font-medium text-ink">{item.name}</h3><p className="mt-0.5 text-xs text-muted-ink">{item.proficiency}</p></div>{isMe && <div className="flex"><button type="button" onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-gray-100"><Pencil size={15} /></button><button type="button" onClick={() => setLanguageToDelete(item)} aria-label={`Remove ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-ink hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div>}</div>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5"><p className="text-sm text-muted-ink">{isMe ? "Add languages and proficiency to help teams understand how you communicate." : "No languages have been added yet."}</p>{isMe && <button type="button" onClick={() => startEdit()} className="mt-3 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-sky">Add a language</button>}</div>}
    </Card>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"><form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-semibold text-ink">{selected ? "Edit language" : "Add a language"}</h3><label className="mt-4 block text-sm font-medium">Language<input required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="e.g. English" /></label><label className="mt-4 block text-sm font-medium">Proficiency<select value={proficiency} onChange={(event) => setProficiency(event.target.value)} className={inputClass}>{proficiencies.map((item) => <option key={item}>{item}</option>)}</select></label><div className="mt-6 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-full border border-gray-300 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button></div></form></div>}
    <DeleteConfirmationModal
      open={Boolean(languageToDelete)}
      title="Remove language"
      message={`Remove ${languageToDelete?.name || "this language"} from your profile?`}
      loading={saving}
      onCancel={() => setLanguageToDelete(null)}
      onConfirm={remove}
    />
  </>;
}

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";
