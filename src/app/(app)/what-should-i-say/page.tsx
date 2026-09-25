import { WhatToSayTool } from "@/components/WhatToSayTool";

export default function WhatShouldISayPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          What should I say?
        </h1>
        <p className="text-slate-500">
          Tell me the idea — I&apos;ll show you how to say it simply, politely,
          and professionally.
        </p>
      </div>
      <WhatToSayTool />
    </div>
  );
}
