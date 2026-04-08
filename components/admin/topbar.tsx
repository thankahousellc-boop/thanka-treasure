export function AdminTopbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-700">
        Admin Dashboard
      </p>
      <p className="text-xs text-zinc-500">Signed in as admin</p>
    </header>
  );
}
