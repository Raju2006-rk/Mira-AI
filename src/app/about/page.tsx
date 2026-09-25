import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

export default function AboutPage() {
  return (
    <PublicPage title={`About ${brand.name}`}>
      <div className="card max-w-2xl space-y-4 text-slate-600">
        <p>
          {brand.name} exists for one reason: to help people speak English
          without fear. Many learners understand English but hesitate to speak,
          translating in their heads before every sentence.
        </p>
        <p>
          Our approach is simple — practice out loud, every day, with a patient
          AI tutor named {brand.tutorName}. She prioritizes communication first
          and correction second, so you build real confidence.
        </p>
        <p className="font-medium text-slate-800">“{brand.messages[0]}”</p>
      </div>
    </PublicPage>
  );
}
