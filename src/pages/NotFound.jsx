import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-lg rounded-xl border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted-ink">
          This CareerLink page does not exist or may have moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Go to homepage
          </Link>
          <Link
            to="/feed"
            className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-gray-50"
          >
            Go to feed
          </Link>
        </div>
      </section>
    </main>
  );
}
