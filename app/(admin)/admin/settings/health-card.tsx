import { Badge, Card, CardBody, CardHeader } from "@/components/admin/ui";
import {
  runHealthChecks,
  type HealthCheckResult,
} from "@/lib/monitoring/health";

const probes: Array<{
  key: "database" | "stripe" | "resend";
  label: string;
  description: string;
}> = [
  {
    key: "database",
    label: "Database",
    description: "Postgres connection used for the storefront and admin.",
  },
  {
    key: "stripe",
    label: "Stripe",
    description:
      "Reads STRIPE_SECRET_KEY. Set keys in your hosting environment, not here.",
  },
  {
    key: "resend",
    label: "Resend",
    description:
      "Reads RESEND_API_KEY. Used for transactional and newsletter mail.",
  },
];

export async function HealthCard() {
  const checks = await runHealthChecks();

  return (
    <Card>
      <CardHeader
        title="Health & integrations"
        description="Read-only status of services this site depends on. API keys live in the deployment environment, not the database."
      />
      <CardBody className="space-y-3">
        {probes.map((probe) => {
          const result: HealthCheckResult = checks[probe.key];
          return (
            <div
              key={probe.key}
              className="flex items-start justify-between gap-4 rounded-md border border-zinc-200 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {probe.label}
                  </p>
                  <Badge tone={result.ok ? "success" : "danger"}>
                    {result.ok ? "Connected" : "Not configured"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{probe.description}</p>
                {!result.ok && result.details ? (
                  <p className="mt-1 text-xs text-rose-700">{result.details}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
