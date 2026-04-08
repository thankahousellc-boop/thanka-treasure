"use client";

import { FormEvent, useId, useState } from "react";

type ContactStatus = "idle" | "saving" | "success" | "error" | "rate-limited";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const initialState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialState);
  const [status, setStatus] = useState<ContactStatus>("idle");
  const fieldId = useId();
  const nameInputId = `${fieldId}-contact-name`;
  const emailInputId = `${fieldId}-contact-email`;
  const phoneInputId = `${fieldId}-contact-phone`;
  const messageInputId = `${fieldId}-contact-message`;
  const statusMessageId = `${fieldId}-contact-form-status`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (response.status === 429) {
        setStatus("rate-limited");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setForm(initialState);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={nameInputId} className="space-y-2">
          <span className="text-sm font-medium text-warm-gray-700">Name</span>
          <input
            id={nameInputId}
            name="name"
            autoComplete="name"
            required
            type="text"
            value={form.name}
            onChange={(event) => {
              if (status !== "idle") {
                setStatus("idle");
              }

              setForm((current) => ({ ...current, name: event.target.value }));
            }}
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900 transition focus:border-maroon-600"
          />
        </label>
        <label htmlFor={emailInputId} className="space-y-2">
          <span className="text-sm font-medium text-warm-gray-700">Email</span>
          <input
            id={emailInputId}
            name="email"
            autoComplete="email"
            required
            type="email"
            value={form.email}
            onChange={(event) => {
              if (status !== "idle") {
                setStatus("idle");
              }

              setForm((current) => ({ ...current, email: event.target.value }));
            }}
            className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900 transition focus:border-maroon-600"
          />
        </label>
      </div>

      <label htmlFor={phoneInputId} className="space-y-2">
        <span className="text-sm font-medium text-warm-gray-700">
          Phone (optional)
        </span>
        <input
          id={phoneInputId}
          name="phone"
          autoComplete="tel"
          type="tel"
          value={form.phone}
          onChange={(event) => {
            if (status !== "idle") {
              setStatus("idle");
            }

            setForm((current) => ({ ...current, phone: event.target.value }));
          }}
          className="h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900 transition focus:border-maroon-600"
        />
      </label>

      <label htmlFor={messageInputId} className="space-y-2">
        <span className="text-sm font-medium text-warm-gray-700">Message</span>
        <textarea
          id={messageInputId}
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={form.message}
          onChange={(event) => {
            if (status !== "idle") {
              setStatus("idle");
            }

            setForm((current) => ({ ...current, message: event.target.value }));
          }}
          className="w-full border border-border-light bg-white px-3 py-2 text-sm text-warm-gray-900 transition focus:border-maroon-600"
        />
      </label>

      <button
        type="submit"
        disabled={status === "saving"}
        aria-describedby={statusMessageId}
        aria-busy={status === "saving"}
        className="inline-flex h-11 items-center border border-maroon-700 bg-maroon-700 px-6 text-sm font-medium uppercase tracking-[0.08em] text-white transition hover:bg-maroon-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving" ? "Sending" : "Send message"}
      </button>

      <p
        id={statusMessageId}
        role={status === "error" ? "alert" : "status"}
        aria-live={status === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className="text-sm"
      >
        {status === "success" ? (
          <span className="text-maroon-700">
            Thank you. Your message has been received.
          </span>
        ) : null}
        {status === "rate-limited" ? (
          <span className="text-amber-700">
            Too many recent messages from this email. Please try again later.
          </span>
        ) : null}
        {status === "error" ? (
          <span className="text-red-700">
            Something went wrong while sending your message. Please try again.
          </span>
        ) : null}
      </p>
    </form>
  );
}
