"use client";

import { FormEvent, useId, useState } from "react";

type NewsletterFormProps = {
  source?: "footer" | "popup" | "checkout" | "manual";
};

export function NewsletterForm({ source = "footer" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const fieldId = useId();
  const emailId = `${fieldId}-newsletter-email`;
  const statusMessageId = `${fieldId}-newsletter-form-status`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, source }),
      });

      if (!response.ok) {
        throw new Error("Unable to subscribe");
      }

      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <input
        id={emailId}
        name="email"
        autoComplete="email"
        type="email"
        required
        value={email}
        onChange={(event) => {
          if (status !== "idle") {
            setStatus("idle");
          }

          setEmail(event.target.value);
        }}
        placeholder="Enter your email"
        className="h-11 flex-1 border border-border-light bg-white px-3 text-sm text-warm-gray-900 focus:border-maroon-600"
      />
      <button
        type="submit"
        disabled={status === "saving"}
        aria-describedby={statusMessageId}
        aria-busy={status === "saving"}
        className="h-11 border border-maroon-700 bg-maroon-700 px-5 text-sm font-medium uppercase tracking-[0.08em] text-white transition hover:bg-maroon-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving" ? "Submitting" : "Subscribe"}
      </button>
      <p
        id={statusMessageId}
        role={status === "error" ? "alert" : "status"}
        aria-live={status === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className="text-sm"
      >
        {status === "success" ? (
          <span className="text-maroon-700">Subscription received.</span>
        ) : null}
        {status === "error" ? (
          <span className="text-red-700">Something went wrong. Try again.</span>
        ) : null}
      </p>
    </form>
  );
}
