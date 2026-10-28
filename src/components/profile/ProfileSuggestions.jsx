import { ArrowRight, BriefcaseBusiness, Globe2, Layers3, Sparkles } from "lucide-react";
import Card from "../layout/Card.jsx";

export default function ProfileSuggestions({ user, isMe }) {
  if (!isMe) return null;
  const suggestions = [
    !user.headline && { title: "Add a clear headline", description: "Make your role and strengths clear at a glance.", target: "profile-header", icon: Sparkles },
    !user.bio && { title: "Write your professional summary", description: "Help people quickly understand what you do.", target: "about", icon: Sparkles },
    !user.experience?.length && { title: "Add a past position", description: "Show the experience behind your skills.", target: "experience", icon: BriefcaseBusiness },
    !user.projects?.length && { title: "Add a project", description: "Showcase work, case studies or a portfolio.", target: "projects", icon: Layers3 },
    !user.skills?.length && { title: "Add your key skills", description: "Help relevant teams discover your strengths.", target: "skills", icon: Layers3 },
    !user.languages?.length && { title: "Add your languages", description: "Make language strengths clear to teams.", target: "languages", icon: Globe2 },
  ].filter(Boolean).slice(0, 3);
  if (!suggestions.length) return null;

  return <Card className="overflow-hidden border-amber-100"><div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-600 shadow-sm"><Sparkles size={19} /></span><div><h2 className="text-base font-semibold text-ink">Make your profile stronger</h2><p className="mt-0.5 text-xs text-muted-ink">A few useful ways to help people understand your work.</p></div></div><div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-2">{suggestions.map(({ title, description, target, icon: Icon }) => <a key={target} href={`#${target}`} className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky text-brand"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-1 block text-xs leading-4 text-muted-ink">{description}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">Improve profile <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span></span></a>)}</div></Card>;
}
