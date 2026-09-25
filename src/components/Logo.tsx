import Link from "next/link";
import { brand } from "@/config/brand";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2"
      aria-label={brand.name}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
        {/* Speech-bubble + wave mark (original, no third-party branding). */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V5Z"
            fill="currentColor"
            opacity="0.25"
          />
          <path
            d="M8 10v.01M8 8v4M11 7v6M14 8v4M17 10v.01M17 9v2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        {brand.name}
      </span>
    </Link>
  );
}
