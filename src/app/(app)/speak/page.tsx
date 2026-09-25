import { MiraChat } from "@/components/MiraChat";
import { brand } from "@/config/brand";

export default function SpeakPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Speak with {brand.tutorName}
        </h1>
        <p className="text-slate-500">
          Practice out loud. {brand.tutorName} replies naturally and only
          corrects what matters most.
        </p>
      </div>
      <MiraChat />
    </div>
  );
}
