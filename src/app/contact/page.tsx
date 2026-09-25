import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

export default function ContactPage() {
  return (
    <PublicPage title="Contact us" subtitle="We'd love to hear from you.">
      <div className="card max-w-lg space-y-3 text-slate-600">
        <p>
          Questions, feedback, or partnership ideas? Reach out and we&apos;ll
          get back to you.
        </p>
        <p>
          Email:{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {brand.supportEmail}
          </a>
        </p>
        <p className="text-sm text-slate-400">
          {brand.company} — {brand.tagline}
        </p>
      </div>
    </PublicPage>
  );
}
