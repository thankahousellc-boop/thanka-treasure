import Link from "next/link";
import { redirect } from "next/navigation";

import { shopPrimaryButtonClass } from "@/components/ui/button-styles";
import { SubmitButton } from "@/components/ui/submit-button";
import { auth } from "@/lib/auth";
import { isAuthConfigError } from "@/lib/auth/errors";
import { monitor } from "@/lib/monitoring/logger";
import { customerRepository } from "@/lib/repositories/customer-repository";

type SignupPageSearchParams = {
  next?: string | string[];
  error?: string | string[];
  message?: string | string[];
};

type SignupPageProps = {
  searchParams: Promise<SignupPageSearchParams>;
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

async function signUpAction(formData: FormData) {
  "use server";

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextPath = sanitizeNextPath(
    String(formData.get("next") ?? "/account").trim(),
  );
  const nextQuery = encodeURIComponent(nextPath);

  if (!email || password.length < 8) {
    redirect(
      `/auth/signup?next=${nextQuery}&error=${encodeURIComponent("Enter a valid email and a password with at least 8 characters.")}`,
    );
  }

  // `redirect()` works by throwing, so it must stay outside the try block —
  // otherwise a successful signup lands in the catch and the visitor is told
  // their account could not be created.
  let signedIn = false;
  let failureMessage: string | null = null;

  try {
    const session = await auth.signUp(
      email,
      password,
      fullName ? { full_name: fullName } : undefined,
    );

    await customerRepository.upsertByEmail({
      email,
      profileId: session.user?.id ?? null,
      firstName: fullName || null,
    });

    signedIn = Boolean(session.expiresAt);
  } catch (error) {
    monitor.error("Sign-up failed", error, {
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
    });

    failureMessage = isAuthConfigError(error)
      ? "Account creation is temporarily unavailable. Please try again later."
      : "Unable to create your account right now.";
  }

  if (failureMessage) {
    redirect(
      `/auth/signup?next=${nextQuery}&error=${encodeURIComponent(failureMessage)}`,
    );
  }

  if (signedIn) {
    redirect(nextPath);
  }

  redirect(
    `/auth/login?message=${encodeURIComponent("Account created. Please sign in to continue.")}`,
  );
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(readSingle(params.next));
  const error = readSingle(params.error);
  const message = readSingle(params.message);

  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        Create Account
      </h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        Create your customer account for faster checkout and order tracking.
      </p>

      <form
        action={signUpAction}
        className="mt-8 max-w-xl space-y-4 border border-border-light bg-white p-5"
      >
        <input type="hidden" name="next" value={nextPath} />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-warm-gray-700">
            Full Name
          </span>
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

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
            autoComplete="new-password"
            required
            minLength={8}
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900"
          />
        </label>

        <SubmitButton
          className={shopPrimaryButtonClass}
          pendingLabel="Creating account…"
        >
          Create Account
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

      <div className="mt-5 text-sm text-maroon-700">
        <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`}>
          Already have an account? Sign in
        </Link>
      </div>
    </section>
  );
}
