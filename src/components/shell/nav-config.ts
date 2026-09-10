export interface NavItem {
  label: string;
  href: string;
  /** Static count shown in muted mono; omit if not applicable. */
  count?: number;
  /** Overrides the muted count color, e.g. coral for "needs attention". */
  countTone?: "muted" | "coral";
}

/** Master-admin-mode workspace nav. Overview's label gets the workspace
 * name prefixed at render time (Sidebar.tsx) to match the client-scoped
 * "{Client} Overview" item it swaps with. Clients management lives behind
 * the workspace switcher dropdown now, not as a standalone nav item. */
export const WORKSPACE_NAV: NavItem[] = [{ label: "Overview", href: "/" }];

/** Shown as the expandable "Settings" section in master-admin mode — see
 * SettingsSection in Sidebar.tsx. Grouped into two labeled sections so a
 * list of eleven items doesn't read as one undifferentiated pile: the
 * general workspace-configuration pages (formerly a separate in-page
 * SettingsNav card — src/app/(app)/settings/SettingsNav.tsx, since
 * removed — now folded in here instead of living in two places at once),
 * and the access-control / per-space settings pages. The whole section
 * is workspace_admin-only, gated in Sidebar.tsx via shell.person — this
 * includes the "Notifications" row here, which is a duplicate shortcut
 * only; the real, always-available entry point for every person's own
 * notification inbox is the header's Notifications button
 * (src/components/shell/Header.tsx), which doesn't go through this nav
 * at all and stays visible regardless of role.
 *
 * Templates keeps its existing top-level route; it's just reachable
 * from here too. The Delivery/Product/Hypercare rows and "Spaces"
 * deep-link into the Spaces card on the settings page
 * (src/app/(app)/settings/page.tsx). */
export const SETTINGS_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "General", href: "/settings" },
      { label: "Spaces", href: "/settings#spaces" },
      { label: "SLA policies", href: "/settings/sla" },
      { label: "Client Management", href: "/settings/portal" },
      { label: "Branding", href: "/settings/branding" },
      { label: "Integrations", href: "/settings/integrations" },
      { label: "Audit log", href: "/settings/audit" },
    ],
  },
  {
    label: "Access",
    items: [
      { label: "Permissions", href: "/settings/permissions" },
      { label: "Submission types", href: "/settings/submissions" },
      { label: "Templates", href: "/templates" },
      { label: "Notifications", href: "/notifications" },
      { label: "Delivery", href: "/settings#spaces-delivery" },
      { label: "Product", href: "/settings#spaces-product" },
      { label: "Hypercare", href: "/settings#spaces-hypercare" },
    ],
  },
];

export const DELIVERY_NAV: NavItem[] = [
  { label: "Overview", href: "/delivery" },
  { label: "Projects", href: "/delivery/projects" },
  { label: "Tasks", href: "/delivery/tasks" },
  { label: "Flight plans", href: "/delivery/flight-plans" },
  { label: "Gates", href: "/delivery/gates" },
  { label: "Baselines", href: "/delivery/baselines" },
  { label: "Change requests", href: "/delivery/change-requests" },
  { label: "Documents", href: "/delivery/documents" },
];

export const PRODUCT_NAV: NavItem[] = [
  { label: "Overview", href: "/product" },
  { label: "Products", href: "/product/products" },
  { label: "Roadmap", href: "/product/roadmap" },
  { label: "Features", href: "/product/features" },
  { label: "Releases", href: "/product/releases" },
  { label: "Engineering", href: "/product/engineering" },
];

export const HYPERCARE_NAV: NavItem[] = [
  { label: "Overview", href: "/hypercare" },
  { label: "Services", href: "/hypercare/services" },
  { label: "Incidents", href: "/hypercare/incidents" },
  { label: "Requests", href: "/hypercare/requests" },
  { label: "Client submissions", href: "/hypercare/submissions" },
  { label: "SLA", href: "/hypercare/sla" },
  { label: "Health", href: "/hypercare/health" },
  { label: "Escalations", href: "/hypercare/escalations" },
];

export type SpaceKey = "delivery" | "product" | "hypercare";

/** Labeled "X Dashboard" in the sidebar (the "SPACES" section header
 * itself reads "Dashboard Overview" — see Sidebar.tsx) — the underlying
 * data differs by mode, not the labels: workspace-wide across every
 * client/project in Master Admin mode, filtered to one client's data
 * when a client is scoped (see getWorkspaceOverview's clientId param
 * and shell.ts's existing per-client count filtering). */
export const SPACES: { key: SpaceKey; label: string; nav: NavItem[] }[] = [
  { key: "delivery", label: "Delivery Dashboard", nav: DELIVERY_NAV },
  { key: "product", label: "Product Dashboard", nav: PRODUCT_NAV },
  { key: "hypercare", label: "Hypercare Dashboard", nav: HYPERCARE_NAV },
];
