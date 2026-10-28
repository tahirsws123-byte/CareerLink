import { Globe } from "lucide-react";

const columns = [
  {
    title: "General",
    links: [
      "Sign Up",
      "Help Center",
      "About",
      "Press",
      "Blog",
      "Careers",
      "Developers",
    ],
  },
  {
    title: "Browse CareerLink",
    links: [
      "Learning",
      "Jobs",
      "Games",
      "Salary",
      "Mobile",
      "Services",
      "Products",
      "Top Companies Hub",
    ],
  },
  {
    title: "Business Solutions",
    links: ["Talent", "Marketing", "Sales", "Learning"],
  },
  {
    title: "Directories",
    links: [
      "Members",
      "Jobs",
      "Companies",
      "Featured",
      "Learning",
      "Posts",
      "Articles",
      "Schools",
      "News",
      "Newsletters",
      "Services",
      "Products",
      "Advice",
      "People Searches",
    ],
  },
];

const legalLinks = [
  "About",
  "Accessibility",
  "User Agreement",
  "Privacy Policy",
  "Cookie Policy",
  "Copyright Policy",
  "Brand Policy",
  "Guest Controls",
  "Community Guidelines",
];

export default function PublicFooter() {
  return (
    <footer className="w-full border-t border-line bg-white">
      <div className="mx-auto w-full max-w-[1128px] px-6 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="text-[22px] font-bold text-brand">
              Career<span className="text-ink">Link</span>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink">
                {column.title}
              </h4>

              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13px] text-muted-ink hover:text-brand hover:underline"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-6">
          {legalLinks.map((link) => (
            <a
              key={link}
              href="#"
              className="text-[12px] text-muted-ink hover:text-brand hover:underline"
            >
              {link}
            </a>
          ))}

          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-ink hover:text-brand md:ml-auto"
          >
            <Globe size={14} />
            <span>Language</span>
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-ink">
          © {new Date().getFullYear()} CareerLink Corporation
        </p>
      </div>
    </footer>
  );
}