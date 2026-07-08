export default function BlogDetailLoading() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-[760px]">
        <div className="h-3 w-28 animate-pulse rounded-sm bg-paper-3" />
        <div className="mt-5 h-12 w-full animate-pulse rounded-sm bg-paper-3" />
        <div className="mt-3 h-12 w-2/3 animate-pulse rounded-sm bg-paper-3" />
        <div className="mt-8 aspect-video animate-pulse rounded-sm bg-paper-3" />

        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-4 w-full animate-pulse rounded-sm bg-paper-3"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
