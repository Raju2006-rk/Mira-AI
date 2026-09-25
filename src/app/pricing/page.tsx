import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { plans } from "@/config/plans";

export default function PricingPage() {
  return (
    <PublicPage
      title="Pricing"
      subtitle="Start free. Upgrade when you're ready for more practice. Plans are configurable and pricing is finalized later."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`card ${p.highlighted ? "ring-2 ring-brand-500" : ""}`}
          >
            {p.highlighted && <span className="chip">Most popular</span>}
            <h2 className="mt-2 text-xl font-bold text-slate-900">{p.name}</h2>
            <p className="text-sm text-slate-500">{p.tagline}</p>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">
              {p.priceLabel}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`mt-6 w-full ${p.highlighted ? "btn-primary" : "btn-secondary"}`}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>
    </PublicPage>
  );
}
