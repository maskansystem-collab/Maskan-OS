import Link from "next/link";
import { ArrowLeft, Plug, Settings, ToggleLeft } from "lucide-react";
import { requirePlatformSuperAdmin } from "@/lib/permissions/guards";
import {
  listPlatformIntegrations, listPlatformSettings, listPlatformFeatureFlags,
} from "@/features/admin/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  payment_provider: "Online payments",
  email_provider: "Transactional email",
  whatsapp: "WhatsApp Business",
  sms: "SMS",
  accounting: "Accounting export",
};

/**
 * Platform configuration: integrations, settings and feature flags.
 *
 * One page with a tab bar rather than three, because all three answer the
 * same question — what is switched on across the platform — and nobody
 * looks at one without the others.
 *
 * Provider credentials are read from the server environment and only ever
 * reported as configured or not. No key is read into the page.
 */
export default async function AdminPlatformPage() {
  await requirePlatformSuperAdmin();

  const configured: Record<string, boolean> = {
    payment_provider:
      !!process.env.PAYMENT_PROVIDER_API_KEY && process.env.PAYMENT_PROVIDER !== "none",
    email_provider: !!process.env.RESEND_API_KEY,
    whatsapp: !!process.env.WHATSAPP_PROVIDER_TOKEN,
  };

  const [integrations, settings, flags] = await Promise.all([
    listPlatformIntegrations(configured),
    listPlatformSettings(),
    listPlatformFeatureFlags(),
  ]);

  const live = integrations.filter((i) => i.connected > 0);
  const globalSettings = settings.filter((s) => s.isGlobal);

  return (
    <>
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" /> Platform
      </Link>

      <PageHeader
        title="Platform configuration"
        breadcrumbs={[{ label: "Platform", href: "/admin" }, { label: "Configuration" }]}
        description="What is switched on across the platform, and where it is overridden."
      />

      <div className="stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Integrations in use"
          value={String(live.length)}
          icon={Plug}
          sublabel={`of ${integrations.length} known providers`}
        />
        <StatCard
          label="Configured on the server"
          value={String(integrations.filter((i) => i.configuredOnServer).length)}
          sublabel="Credentials present"
        />
        <StatCard
          label="Platform settings"
          value={String(globalSettings.length)}
          icon={Settings}
          sublabel={`${settings.length - globalSettings.length} organisation overrides`}
        />
        <StatCard
          label="Feature flags"
          value={String(flags.length)}
          icon={ToggleLeft}
          sublabel={`${flags.filter((f) => f.enabledFor > 0).length} on for someone`}
        />
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations">
          {integrations.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No integrations known"
              description="A provider appears here once an organisation connects it or the server has credentials for it."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Server credentials</TableHead>
                  <TableHead className="text-right">Connected</TableHead>
                  <TableHead className="text-right">Switched off</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((i) => (
                  <TableRow key={i.providerType}>
                    <TableCell className="font-medium text-neutral-900">
                      {PROVIDER_LABELS[i.providerType] ?? i.providerType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.configuredOnServer ? "success" : "outline"}>
                        {i.configuredOnServer ? "Present" : "Not set"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.connected > 0 ? (
                        <span className="font-medium text-neutral-900">{i.connected}</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">
                      {i.inactive > 0 ? i.inactive : <span className="text-neutral-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-neutral-600">
                      {i.totalOrganisations > 0
                        ? `${Math.round((i.connected / i.totalOrganisations) * 100)}% of orgs`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            Credentials live in the server environment and are never read into
            this page — only whether they are present. &quot;Connected&quot;
            counts organisations with an active connection, not a setting
            somebody ticked.
          </p>
        </TabsContent>

        <TabsContent value="flags">
          {flags.length === 0 ? (
            <EmptyState
              icon={ToggleLeft}
              title="No feature flags"
              description="A flag appears here once it is set globally or for an organisation."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Platform default</TableHead>
                  <TableHead className="text-right">On for</TableHead>
                  <TableHead className="text-right">Off for</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell className="font-medium text-neutral-900">
                      {f.key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
                      <span className="block font-mono text-[11.5px] text-neutral-500">{f.key}</span>
                    </TableCell>
                    <TableCell>
                      {f.globalDefault === null ? (
                        <span className="text-neutral-400">Not set</span>
                      ) : (
                        <Badge variant={f.globalDefault ? "success" : "outline"}>
                          {f.globalDefault ? "On" : "Off"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">
                      {f.enabledFor > 0 ? `${f.enabledFor} orgs` : <span className="text-neutral-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-neutral-600">
                      {f.disabledFor > 0 ? `${f.disabledFor} orgs` : <span className="text-neutral-400">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="settings">
          {settings.length === 0 ? (
            <EmptyState
              icon={Settings}
              title="No settings stored"
              description="Everything is running on its built-in default."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-[12.5px] font-medium text-neutral-900">
                      {s.key}
                    </TableCell>
                    <TableCell>
                      {s.isGlobal ? (
                        <Badge variant="neutral">Whole platform</Badge>
                      ) : (
                        <span className="text-neutral-600">{s.organisationName}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate font-mono text-[12px] text-neutral-600">
                      {typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 rounded-[10px] bg-neutral-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-neutral-600">
            A setting with no organisation applies to the whole platform. The
            same key with an organisation overrides it for that organisation
            only — which is why there is no separate platform settings table.
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}
