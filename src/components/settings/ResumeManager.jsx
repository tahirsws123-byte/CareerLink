import { useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../layout/Card.jsx";
import { deleteResume, getResumeDownloadUrl, uploadResume } from "../../services/userServices.js";

export default function ResumeManager({ initialResumes = [] }) {
  const inputRef = useRef(null);
  const [resumes, setResumes] = useState(initialResumes);
  const [working, setWorking] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (resumes.length >= 5) return toast.error("You can save up to 5 resumes");
    if (file.size > 10 * 1024 * 1024) return toast.error("Resume must be 10 MB or smaller");
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) return toast.error("Choose a PDF, DOC, or DOCX file");
    try {
      setWorking(true);
      const data = await uploadResume(file);
      setResumes(data.resumes || []);
      toast.success("Resume uploaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to upload resume");
    } finally {
      setWorking(false);
    }
  };

  const handleDownload = async (resume) => {
    try {
      const url = await getResumeDownloadUrl(resume._id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to download resume");
    }
  };

  const handleDelete = async (resumeId) => {
    try {
      setWorking(true);
      const data = await deleteResume(resumeId);
      setResumes(data.resumes || []);
      toast.success("Resume deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete resume");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Resume & CV</h2>
          <p className="mt-1 text-sm text-muted-ink">Private to you. Upload up to five PDF, DOC, or DOCX files (10 MB max each).</p>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
        <button type="button" disabled={working || resumes.length >= 5} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          <Upload size={15} />Upload resume
        </button>
      </div>
      {resumes.length > 0 ? <div className="divide-y divide-gray-100 border-t border-gray-100">{resumes.map((resume) => <div key={resume._id} className="flex items-center gap-3 px-5 py-3"><FileText size={20} className="shrink-0 text-brand" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{resume.name}</p><p className="text-xs text-muted-ink">{(resume.size / 1024 / 1024).toFixed(1)} MB · Added {new Date(resume.uploadedAt).toLocaleDateString()}</p></div><button type="button" disabled={working} onClick={() => handleDownload(resume)} aria-label={`Download ${resume.name}`} className="grid h-9 w-9 place-items-center rounded-full text-brand hover:bg-sky disabled:opacity-50"><Download size={17} /></button><button type="button" disabled={working} onClick={() => handleDelete(resume._id)} aria-label={`Delete ${resume.name}`} className="grid h-9 w-9 place-items-center rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /></button></div>)}</div> : <p className="border-t border-gray-100 px-5 py-4 text-sm text-muted-ink">No resumes uploaded. Your files are not shown on your public profile.</p>}
    </Card>
  );
}
