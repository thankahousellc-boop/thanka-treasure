import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/lib/auth";

type LoginPageSearchParams = {
  next?: string | string[];
  error?: string | string[];
  message?: string | string[];
};

type LoginPageProps = {
  searchParams: Promise<LoginPageSearchParams>;
};

function readSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function sanitizeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

async function signInAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextPath = sanitizeNextPath(
    String(formData.get("next") ?? "/account").trim(),
  );
  const nextQuery = encodeURIComponent(nextPath);

  if (!email || !password) {
    redirect(
      `/auth/login?next=${nextQuery}&error=${encodeURIComponent("Please provide both email and password.")}`,
    );
  }

  let session: Session;
  try {
    session = await auth.signInWithPassword(email, password);
  } catch {
    redirect(
      `/auth/login?next=${nextQuery}&error=${encodeURIComponent("Unable to sign in with these credentials.")}`,
    );
  }

  // Admins land on the admin panel unless they were sent to a specific page.
  if (nextPath === "/account" && session.user?.role === "admin") {
    redirect("/admin");
  }

  redirect(nextPath);
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(readSingle(params.next));
  const error = readSingle(params.error);
  const message = readSingle(params.message);

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">Login</h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        Sign in to view your account, addresses, and order history.
      </p>

      <form
        action={signInAction}
        className="mt-8 max-w-xl space-y-4 border border-border-light bg-white p-5"
      >
        <input type="hidden" name="next" value={nextPath} />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-warm-gray-700">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-warm-gray-700">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white hover:bg-maroon-600"
        >
          Sign In
        </button>

        {error ? (
          <p
            tabIndex={-1}
            autoFocus
            role="alert"
            aria-live="assertive"
            className="text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-maroon-700"
          >
            {message}
          </p>
        ) : null}
      </form>

      <div className="mt-5 flex flex-wrap gap-4 text-sm text-maroon-700">
        <Link href={`/auth/signup?next=${encodeURIComponent(nextPath)}`}>
          Create account
        </Link>
        <Link href="/auth/reset-password">Forgot password?</Link>
      </div>
    </section>
  );
}
