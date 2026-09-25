import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

const STEPS = [
  {
    n: 1,
    t: "Create your account",
    d: "Sign up in seconds with email and password.",
  },
  {
    n: 2,
    t: `Talk to ${brand.tutorName}`,
    d: "Tap the mic and speak, or type. She replies like a friend.",
  },
  {
    n: 3,
    t: "Get gentle corrections",
    d: "Only the most important fixes, explained simply.",
  },
  {
    n: 4,
    t: "Review your mistakes",
    d: "Recurring errors are saved to your personal Mistake Book.",
  },
  {
    n: 5,
    t: "Watch your confidence grow",
    d: "Track streaks and speaking indicators over time.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicPage
      title="How it works"
      subtitle="From nervous to confident, one short session at a time."
    >
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="card flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
              {s.n}
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">{s.t}</h2>
              <p className="text-sm text-slate-600">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </PublicPage>
  );
}
