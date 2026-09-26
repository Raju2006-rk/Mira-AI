import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for Auth.js (NextAuth v5).
 *
 * The default `Session["user"]` and `JWT` types don't carry our app-specific
 * `id`/`role` fields. The `jwt` and `session` callbacks in
 * `src/lib/auth/index.ts` copy these across, so we widen the types here to
 * keep those callbacks (and every `auth()` consumer) type-safe without `any`.
 *
 * `Role` is the Prisma enum (`"USER" | "ADMIN"`), reused so the token/session
 * role stays in lockstep with the database.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  // Augment the DB user shape returned by `authorize`/adapter so `role` is known.
  interface User {
    role: Role;
  }
}

// The JWT interface is declared in `@auth/core/jwt` and re-exported by
// `next-auth/jwt`. Interface merging must target the declaring module, so we
// augment `@auth/core/jwt` directly — augmenting only the `next-auth/jwt`
// re-export does not merge into the underlying interface.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
