"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/speak", label: "Speak", icon: "mic" },
  { href: "/what-should-i-say", label: "What to say", icon: "chat" },
  { href: "/fix-my-english", label: "Fix English", icon: "check" },
  { href: "/mistakes", label: "Mistakes", icon: "book" },
  { href: "/progress", label: "Progress", icon: "chart" },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m4 12 5 5L20 6" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
          <path d="M4 5v14" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-4 md:flex">
      <div className="px-2 py-2">
        <Logo href="/dashboard" />
      </div>
      <nav className="mt-6 flex-1 space-y-1" aria-label="App">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="px-3 text-sm font-medium text-slate-700">{name}</p>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  // Mobile bottom navigation mirrors the app's primary destinations.
  const items = NAV.slice(0, 5);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-100 bg-white/95 backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-brand-700" : "text-slate-500"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
