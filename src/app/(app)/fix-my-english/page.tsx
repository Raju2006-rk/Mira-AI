import { FixEnglishTool } from "@/components/FixEnglishTool";

export default function FixMyEnglishPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fix my English</h1>
        <p className="text-slate-500">
          Paste any sentence and get a natural, confident version — with a short
          reason why.
        </p>
      </div>
      <FixEnglishTool />
    </div>
  );
}
