const DEFAULT_MESSAGE = "Hi, I'm interested in your Tibetan Thangka paintings.";

type WhatsAppButtonProps = {
  phoneNumber: string;
};

export function WhatsAppButton({ phoneNumber }: WhatsAppButtonProps) {
  const encodedMessage = encodeURIComponent(DEFAULT_MESSAGE);
  const link = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-maroon-700 text-white shadow-lg transition-transform hover:scale-105"
      aria-label="Chat on WhatsApp"
    >
      WA
    </a>
  );
}
