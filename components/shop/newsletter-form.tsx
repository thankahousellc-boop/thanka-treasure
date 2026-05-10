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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      if (!response.ok) throw new Error("Unable to subscribe");

      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-1.5 rounded-full border border-(--line) bg-paper p-1.5 pl-5 focus-within:border-ink">
        <input
          id={emailId}
          name="email"
          autoComplete="email"
          type="email"
          required
          value={email}
          onChange={(event) => {
            if (status !== "idle") setStatus("idle");
            setEmail(event.target.value);
          }}
          placeholder="Enter your email"
          className="h-10 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
        />
        <button
          type="submit"
          disabled={status === "saving"}
          aria-describedby={statusMessageId}
          aria-busy={status === "saving"}
          className="rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.16em] text-paper transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "saving" ? "Submitting…" : "Subscribe"}
        </button>
      </div>
      <p
        id={statusMessageId}
        role={status === "error" ? "alert" : "status"}
        aria-live={status === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className="text-sm"
      >
        {status === "success" ? (
          <span className="text-saffron-deep">
            Subscription received. Welcome to the atelier.
          </span>
        ) : null}
        {status === "error" ? (
          <span className="text-saffron-deep">
            Something went wrong. Please try again.
          </span>
        ) : null}
      </p>
    </form>
  );
}
