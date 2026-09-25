import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

const FAQS = [
  {
    q: `Who is ${brand.tutorName}?`,
    a: `${brand.tutorName} is your personal AI English tutor and speaking partner — friendly, patient, and available 24/7.`,
  },
  {
    q: "Do I need to be good at English to start?",
    a: "No. It's built for beginners through advanced learners. Make mistakes here, not in fear.",
  },
  {
    q: "Does it use my microphone?",
    a: "Only when you tap the mic to speak. Voice recognition runs in your browser, and you can always type instead.",
  },
  {
    q: "Will it correct every small mistake?",
    a: "No. Communication comes first. Mira shows the most important corrections and keeps the conversation going.",
  },
  {
    q: "Can I use it in my native language?",
    a: "Native-language explanations are on the roadmap (Telugu, Hindi, Tamil, and more) to help you build confidence.",
  },
];

export default function FaqPage() {
  return (
    <PublicPage title="Frequently asked questions">
      <div className="space-y-4">
        {FAQS.map((f) => (
          <div key={f.q} className="card">
            <h2 className="font-semibold text-slate-900">{f.q}</h2>
            <p className="mt-1 text-sm text-slate-600">{f.a}</p>
          </div>
        ))}
      </div>
    </PublicPage>
  );
}
