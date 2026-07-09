export default function BlogsLoading() {
  return (
    <div className="container-page py-12">
      <div className="h-9 w-48 animate-pulse rounded-sm bg-paper-3" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded-sm bg-paper-3" />

      <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4">
            <div className="aspect-video animate-pulse rounded-sm bg-paper-3" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-paper-3" />
            <div className="h-6 w-3/4 animate-pulse rounded-sm bg-paper-3" />
            <div className="h-4 w-full animate-pulse rounded-sm bg-paper-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
