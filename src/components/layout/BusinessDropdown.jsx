import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  LayoutGrid,
  Plus,
} from "lucide-react";
import useTranslation from "../../hooks/useTranslation";

export default function BusinessDropdown({ onNavigate = () => {} }) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeMenu = () => {
    setOpen(false);
    onNavigate();
  };

  const businessItemClass = "flex min-h-[72px] items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex w-full items-center justify-start gap-2 rounded-lg px-3 py-3 text-xs font-normal leading-4 transition hover:bg-sky xl:h-full xl:w-[116px] xl:flex-col xl:justify-center xl:gap-0.5 xl:rounded-none xl:px-2 xl:py-0 ${
          open ? "text-ink" : "text-muted-ink hover:text-ink"
        }`}
      >
        <LayoutGrid size={18} strokeWidth={1.9} className="xl:h-[21px] xl:w-[21px]" />
        <span className="flex items-center gap-0.5 !text-xs">
          {t("For Business")} <ChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("Business services")}
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-[min(92vw,690px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl xl:left-auto xl:right-0 xl:top-[calc(100%+12px)]"
        >
          <div className="grid sm:grid-cols-2">
            <section className="px-5 py-5 sm:px-7 sm:py-8">
              <h2 className="mb-4 text-lg font-medium text-ink">
                {t("My Apps")}
              </h2>
              <Link to="/jobs/manage" onClick={closeMenu} className={businessItemClass}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky text-brand">
                  <BriefcaseBusiness size={21} />
                </span>
                <span className="text-sm font-medium text-ink">{t("Post a job")}</span>
              </Link>
            </section>

            <section className="border-t border-gray-200 px-5 py-5 sm:border-l sm:border-t-0 sm:px-7 sm:py-8">
              <h2 className="mb-4 text-lg font-medium text-ink">
                {t("Explore more for business")}
              </h2>
              <div className="space-y-2">
                <Link to="/jobs?post=true" onClick={closeMenu} className={businessItemClass}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky text-brand">
                    <BriefcaseBusiness size={21} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{t("Post a job for free")}</span>
                    <span className="mt-0.5 block text-xs text-muted-ink">{t("Get qualified applicants quickly")}</span>
                  </span>
                </Link>
                <Link to="/network/pages" onClick={closeMenu} className={businessItemClass}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky text-brand">
                    <Building2 size={21} />
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-ink">
                    {t("Create a Company Page")} <Plus size={16} />
                  </span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
