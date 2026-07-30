import Link from "next/link";
import { redirect } from "next/navigation";

import { shopPrimaryButtonClass } from "@/components/ui/button-styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { auth, type Session } from "@/lib/auth";
import { isAuthConfigError } from "@/lib/auth/errors";
import { monitor } from "@/lib/monitoring/logger";

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

  let session: Session | null = null;
  let failureMessage: string | null = null;

  try {
    session = await auth.signInWithPassword(email, password);
  } catch (error) {
    monitor.error("Sign-in failed", error, {
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    });

    // A misconfigured deployment is not a bad password. Saying "wrong
    // credentials" there sends the visitor (and the operator) hunting the wrong
    // problem, so report it as an outage instead.
    failureMessage = isAuthConfigError(error)
      ? "Sign-in is temporarily unavailable. Please try again later."
      : "Unable to sign in with these credentials.";
  }

  if (failureMessage || !session) {
    redirect(
      `/auth/login?next=${nextQuery}&error=${encodeURIComponent(failureMessage ?? "Unable to sign in with these credentials.")}`,
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

        <SubmitButton
          className={shopPrimaryButtonClass}
          pendingLabel="Signing in…"
        >
          Sign In
        </SubmitButton>

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
