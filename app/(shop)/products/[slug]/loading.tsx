export default function ProductDetailLoading() {
  return (
    <div className="container-page">
      <div className="py-6">
        <div className="h-3 w-48 animate-pulse rounded-sm bg-paper-3" />
      </div>

      <section className="grid grid-cols-[1.2fr_1fr] items-start gap-16 pb-20 max-[980px]:grid-cols-1 max-[980px]:gap-9">
        <div className="aspect-4/5 animate-pulse rounded-sm bg-paper-3" />

        <div className="flex flex-col gap-5">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-paper-3" />
          <div className="h-12 w-3/4 animate-pulse rounded-sm bg-paper-3" />
          <div className="h-px w-full bg-(--line)" />
          <div className="h-10 w-40 animate-pulse rounded-sm bg-paper-3" />
          <div className="space-y-2.5">
            <div className="h-4 w-full animate-pulse rounded-sm bg-paper-3" />
            <div className="h-4 w-full animate-pulse rounded-sm bg-paper-3" />
            <div className="h-4 w-2/3 animate-pulse rounded-sm bg-paper-3" />
          </div>
          <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-paper-3" />
        </div>
      </section>
    </div>
  );
}
