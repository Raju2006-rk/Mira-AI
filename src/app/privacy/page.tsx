import { PublicPage } from "@/components/PublicPage";
import { brand } from "@/config/brand";

export default function PrivacyPage() {
  return (
    <PublicPage
      title="Privacy Policy"
      subtitle="How we handle your voice and learning data."
    >
      <div className="card max-w-2xl space-y-4 text-sm text-slate-600">
        <section>
          <h2 className="font-semibold text-slate-900">
            Microphone &amp; voice
          </h2>
          <p>
            Your microphone is only used when you tap to speak. Speech
            recognition runs in your browser via the Web Speech API. We do not
            store raw audio recordings.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900">What we store</h2>
          <p>
            To power your learning, we store your account details, conversation
            text, saved mistakes, and progress indicators. You can turn off
            saving conversation history in Settings.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900">Your control</h2>
          <p>
            You can delete individual mistakes, clear your conversation history,
            and request account deletion at any time by contacting{" "}
            {brand.supportEmail}.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900">Security</h2>
          <p>
            Passwords are hashed, sessions are signed, and communication is
            encrypted in transit. API keys for AI providers are kept server-side
            and never exposed to your browser.
          </p>
        </section>
        <p className="text-xs text-slate-400">
          This is a demo policy for {brand.name} and not legal advice.
        </p>
      </div>
    </PublicPage>
  );
}
