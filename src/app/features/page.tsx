import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

const GROUPS = [
  {
    title: "Speak with Mira",
    items: [
      "Natural voice or text conversation with your AI tutor",
      "Communication first, correction second — never judgmental",
      "Modes: Chat, Teach me, Correct me, Interview",
    ],
  },
  {
    title: "Quick help",
    items: [
      "What Should I Say? — simple, polite, and professional phrasing",
      "Fix My English — turn any sentence natural, with a reason why",
      "Practice saying it aloud with built-in text-to-speech",
    ],
  },
  {
    title: "Grow over time",
    items: [
      "Personal Mistake Book that saves recurring errors automatically",
      "Daily streaks and practice tracking",
      "Confidence and speaking indicators you can watch improve",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <PublicPage title="Features" subtitle={brand.messages[0]}>
      <div className="grid gap-6 md:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title} className="card">
            <h2 className="text-lg font-semibold text-slate-900">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {g.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent-500">✓</span>
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PublicPage>
  );
}
