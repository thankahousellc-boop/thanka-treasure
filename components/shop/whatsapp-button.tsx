"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGE = "Hi, I'm interested in your Tibetan Thangka paintings.";

type WhatsAppButtonProps = {
  phoneNumber: string;
};

export function WhatsAppButton({ phoneNumber }: WhatsAppButtonProps) {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (visible) {
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const encodedMessage = encodeURIComponent(DEFAULT_MESSAGE);
  const link = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full",
        "bg-maroon-700 text-white shadow-lg transition duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      ].join(" ")}
      aria-label="Chat on WhatsApp"
    >
      WA
    </a>
  );
}
