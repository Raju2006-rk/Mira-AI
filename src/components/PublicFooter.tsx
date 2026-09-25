import Link from "next/link";
import { brand } from "@/config/brand";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="container-page flex flex-col gap-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {brand.company}. {brand.name} is a demo
          product.
        </p>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/about" className="hover:text-slate-800">
            About
          </Link>
          <Link href="/privacy" className="hover:text-slate-800">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-800">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-slate-800">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
