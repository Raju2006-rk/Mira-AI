import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

export default function TermsPage() {
  return (
    <PublicPage title="Terms of Service">
      <div className="card max-w-2xl space-y-4 text-sm text-slate-600">
        <p>
          By using {brand.name}, you agree to use it for personal English
          learning. Learning indicators and assessments are approximate guides,
          not official certifications, and do not predict real-world outcomes
          such as employment.
        </p>
        <p>
          You are responsible for keeping your account credentials secure. Do
          not misuse the service or attempt to disrupt it.
        </p>
        <p>
          The service is provided “as is” for demonstration purposes. Features
          may change as the product evolves.
        </p>
        <p className="text-xs text-slate-400">
          This is a demo terms document for {brand.name} and not legal advice.
        </p>
      </div>
    </PublicPage>
  );
}
