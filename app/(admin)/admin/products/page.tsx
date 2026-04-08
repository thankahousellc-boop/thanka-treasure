import Link from "next/link";

import { productRepository } from "@/lib/repositories/product-repository";

import { archiveProductAction } from "./actions";

function getStatusClasses(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "archived") {
    return "bg-zinc-200 text-zinc-700";
  }

  return "bg-amber-100 text-amber-700";
}

async function loadProductsForAdmin() {
  try {
    return await productRepository.listForAdmin(50);
  } catch {
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await loadProductsForAdmin();

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Manage products
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/inventory"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Manage inventory
          </Link>
          <Link
            href="/admin/products/categories"
            className="inline-flex h-10 items-center rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Manage taxonomy
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex h-10 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Add product
          </Link>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">
              Products with status, creation date, and management actions.
            </caption>
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-zinc-500">
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Created
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {products.map((product) => (
                <tr key={product.id}>
                  <th scope="row" className="px-4 py-3 text-left">
                    <p className="font-medium text-zinc-900">{product.title}</p>
                    <p className="text-xs text-zinc-500">/{product.slug}</p>
                  </th>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs uppercase tracking-[0.06em] ${getStatusClasses(product.status)}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {product.createdAt.toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-sm font-medium text-zinc-900 hover:text-zinc-700"
                      >
                        Open
                      </Link>

                      {product.status !== "archived" ? (
                        <form action={archiveProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium uppercase tracking-[0.06em] text-zinc-600 hover:text-zinc-900"
                          >
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No products found. Add your first product to get started.
        </div>
      )}
    </section>
  );
}
