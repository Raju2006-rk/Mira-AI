import Link from "next/link";
import { brand } from "@/config/brand";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const FEATURES = [
  {
    title: "Talk to Mira",
    body: "Speak naturally with your AI tutor. She replies like a friend and gently teaches — communication first, correction second.",
  },
  {
    title: "What Should I Say?",
    body: "Know the idea but not the words? Get the same thing in simple, polite, and professional English.",
  },
  {
    title: "Fix My English",
    body: "Paste any sentence and get a natural, confident version — with a short reason why.",
  },
  {
    title: "Confidence Mode",
    body: "Short speaking challenges with encouraging feedback. Make mistakes here, not in fear.",
  },
  {
    title: "Personal Mistake Book",
    body: "Your recurring mistakes are saved automatically with simple explanations, so you actually improve.",
  },
  {
    title: "Progress You Can See",
    body: "Track speaking practice, streaks, words learned, and a confidence trend over time.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50 to-transparent" />
          <div className="container-page relative grid gap-10 py-16 md:grid-cols-2 md:py-24">
            <div className="flex flex-col justify-center">
              <span className="chip w-fit">Your 24/7 AI English coach</span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {brand.hero.headline}
              </h1>
              <p className="mt-4 max-w-lg text-lg text-slate-600">
                {brand.hero.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-primary text-base">
                  {brand.hero.primaryCta}
                </Link>
                <Link href="/speak" className="btn-secondary text-base">
                  {brand.hero.secondaryCta}
                </Link>
              </div>
              <p className="mt-6 text-sm italic text-slate-500">
                “{brand.messages[1]}”
              </p>
            </div>

            {/* Illustrative chat preview */}
            <div className="flex items-center justify-center">
              <div className="card w-full max-w-md">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                    {brand.tutorName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {brand.tutorName}
                    </p>
                    <p className="text-xs text-accent-600">
                      ● Online — ready to practice
                    </p>
                  </div>
                </div>
                <div className="space-y-3 pt-4 text-sm">
                  <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2 text-white">
                    Today I go college and I meet my friend.
                  </div>
                  <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-slate-700">
                    Good attempt! A more natural way is: “Today I went to
                    college and met my friend.” 🙂 What did you do there?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container-page py-16">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Everything you need to speak with confidence
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {brand.messages[0]}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <h3 className="text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-page pb-20">
          <div className="rounded-3xl bg-brand-600 px-8 py-12 text-center text-white shadow-soft">
            <h2 className="text-3xl font-bold">Start speaking today</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              {brand.messages[2]}
            </p>
            <Link
              href="/register"
              className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50"
            >
              {brand.hero.primaryCta}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
