type PageShellProps = {
  title: string;
  description: string;
};

export function PageShell({ title, description }: PageShellProps) {
  return (
    <section className="container-page py-14 md:py-20">
      <h1 className="font-serif text-4xl text-maroon-900 md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-warm-gray-700">
        {description}
      </p>
    </section>
  );
}
