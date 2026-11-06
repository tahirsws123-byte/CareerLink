import { Link } from "react-router-dom";

const columns = [
  {
    title: "General",
    links: [
      { label: "Create an account", to: "/register" },
      { label: "Sign in", to: "/login" },
      { label: "Home", to: "/" },
    ],
  },
  {
    title: "Browse CareerLink",
    links: [
      { label: "Jobs", to: "/jobs" },
      { label: "People", to: "/network" },
      { label: "Company pages", to: "/company-pages/discover" },
      { label: "Groups", to: "/groups" },
      { label: "Events", to: "/events" },
      { label: "Newsletters", to: "/newsletters" },
    ],
  },
  {
    title: "Business",
    links: [
      { label: "Post a job", to: "/jobs/manage" },
      { label: "Create a company page", to: "/company-pages/create" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Search", to: "/search" },
      { label: "Feed", to: "/feed" },
      { label: "Messages", to: "/messages" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="w-full border-t border-line bg-white">
      <div className="mx-auto w-full max-w-[1128px] px-6 py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-[22px] font-bold text-brand" aria-label="CareerLink homepage">
              Career<span className="text-ink">Link</span>
            </Link>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink">
                {column.title}
              </h2>
              <ul className="space-y-2.5">
                {column.links.map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-[13px] text-muted-ink hover:text-brand hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="text-xs leading-5 text-muted-ink">
            Legal documents are not available yet. User Agreement, Privacy Policy, and Cookie Policy links will be added when their approved content is provided.
          </p>
        </div>

        <p className="mt-4 text-xs text-muted-ink">
          © {new Date().getFullYear()} CareerLink Corporation
        </p>
      </div>
    </footer>
  );
}
