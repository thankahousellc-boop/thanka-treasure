import { Icon } from "./icons";

type ThumbProps = {
  src: string | null;
  alt: string;
  size?: number;
};

export function Thumb({ src, alt, size = 44 }: ThumbProps) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-md"
      style={{
        width: size,
        height: size,
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        color: "var(--admin-text-mute)",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Icon.Box width={size * 0.4} height={size * 0.4} />
      )}
    </div>
  );
}
