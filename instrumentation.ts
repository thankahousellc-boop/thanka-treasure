import type { Instrumentation } from "next";

import { monitor } from "@/lib/monitoring/logger";

export async function register() {
  monitor.info("Server instrumentation initialized.", {
    runtime: process.env.NEXT_RUNTIME,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  monitor.error("Unhandled request error captured by instrumentation.", error, {
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    requestPath: request.path,
    method: request.method,
    digest: error.digest,
    renderType: context.renderType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
