type AnnouncementBarProps = {
  messages?: Array<string | { text: string; highlight?: string }>;
};

const DEFAULT_MESSAGES: Array<{ text: string; highlight?: string }> = [
  { text: "Free worldwide shipping" },
  { text: "Each piece blessed at Kapan Monastery" },
  { text: "Lifetime authenticity guarantee" },
];

export function AnnouncementBar({ messages = DEFAULT_MESSAGES }: AnnouncementBarProps) {
  const items = messages.map((entry) =>
    typeof entry === "string" ? { text: entry } : entry,
  );

  return (
    <div className="bg-ink px-4 py-2.25 text-center text-[12.5px] uppercase tracking-[0.14em] text-paper-2">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" className="opacity-50">
                ·
              </span>
            ) : null}
            <span>
              {item.text}
              {item.highlight ? (
                <>
                  {" "}
                  <b className="font-medium text-gold-light">{item.highlight}</b>
                </>
              ) : null}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}
