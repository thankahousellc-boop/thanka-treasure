type AnnouncementBarProps = {
  message?: string;
};

export function AnnouncementBar({
  message = "Welcome to Tibetan Thangka Treasure",
}: AnnouncementBarProps) {
  return (
    <div className="bg-maroon-800 px-4 py-2 text-center text-xs tracking-[0.08em] text-text-on-accent md:text-sm">
      <p className="font-serif">{message}</p>
    </div>
  );
}
