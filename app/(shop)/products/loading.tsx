export default function ProductsLoading() {
  return (
    <div className="container-page py-12">
      <div className="h-9 w-56 animate-pulse rounded-sm bg-paper-3" />
      <div className="mt-3 h-4 w-80 animate-pulse rounded-sm bg-paper-3" />

      <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3.5">
            <div className="aspect-4/5 animate-pulse rounded-sm bg-paper-3" />
            <div className="flex items-baseline justify-between gap-3">
              <div className="h-5 w-32 animate-pulse rounded-sm bg-paper-3" />
              <div className="h-4 w-14 animate-pulse rounded-sm bg-paper-3" />
            </div>
            <div className="h-3 w-24 animate-pulse rounded-sm bg-paper-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
