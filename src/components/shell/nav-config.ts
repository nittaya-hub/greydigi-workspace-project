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
 * from here too. The Missions/Hangar/Hypercare rows and "Cockpits"
 * deep-link into the Spaces card on the settings page
 * (src/app/(app)/settings/page.tsx). Manifest has no settings row yet —
 * it's a nav-only placeholder until its object model ships (Wave 3 of
 * the aironauts Decision Pack build order), and an "ON" row with no
 * real data behind it would be exactly the kind of thing that pack
 * warns against fabricating. */
export const SETTINGS_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "General", href: "/settings" },
      { label: "Cockpits", href: "/settings#spaces" },
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
      { label: "Missions", href: "/settings#spaces-missions" },
      { label: "Hangar", href: "/settings#spaces-hangar" },
      { label: "Hypercare", href: "/settings#spaces-hypercare" },
    ],
  },
];

/** aironauts™ Flight Plan: build and deploy. Was "Delivery" — the
 * routes/table underneath (`/missions`, `projects` table) are unchanged
 * in this pass; only the cockpit's name and nav labels move. See the
 * Decision Pack, "Four cockpits and one brain." */
export const MISSIONS_NAV: NavItem[] = [
  { label: "Overview", href: "/missions" },
  { label: "Missions", href: "/missions/projects" },
  { label: "Tasks", href: "/missions/tasks" },
  { label: "Flight plans", href: "/missions/flight-plans" },
  { label: "Gates", href: "/missions/gates" },
  { label: "Baselines", href: "/missions/baselines" },
  { label: "Change requests", href: "/missions/change-requests" },
  { label: "Documents", href: "/missions/documents" },
];

/** Everything developed, in two tracks (platform + market) once Wave 1's
 * product-as-first-class-object work lands — see the Decision Pack,
 * "Two development tracks, two sets of gates." Was "Product". */
export const HANGAR_NAV: NavItem[] = [
  { label: "Overview", href: "/hangar" },
  { label: "Products", href: "/hangar/products" },
  { label: "Roadmap", href: "/hangar/roadmap" },
  { label: "Features", href: "/hangar/features" },
  { label: "Releases", href: "/hangar/releases" },
  { label: "Engineering", href: "/hangar/engineering" },
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

/** The company brain — assets, decisions, accuracy/calibration, written
 * back from the other three cockpits on gate close. Nav-only shell in
 * this pass; the object model and write-back rule are Wave 3 of the
 * Decision Pack's build order, not this one. */
export const MANIFEST_NAV: NavItem[] = [{ label: "Overview", href: "/manifest" }];

export type SpaceKey = "missions" | "hangar" | "hypercare" | "manifest";

/** Labeled "X Dashboard" in the sidebar (the "COCKPITS" section header
 * itself reads "Dashboard Overview" — see Sidebar.tsx) — the underlying
 * data differs by mode, not the labels: workspace-wide across every
 * client/project in Master Admin mode, filtered to one client's data
 * when a client is scoped (see getWorkspaceOverview's clientId param
 * and shell.ts's existing per-client count filtering). Manifest has no
 * client-scoped meaning (it's the company brain, not client work), so
 * Sidebar.tsx excludes it from the client-scoped view entirely. */
export const SPACES: { key: SpaceKey; label: string; nav: NavItem[] }[] = [
  { key: "missions", label: "Missions Dashboard", nav: MISSIONS_NAV },
  { key: "hangar", label: "Hangar Dashboard", nav: HANGAR_NAV },
  { key: "hypercare", label: "Hypercare Dashboard", nav: HYPERCARE_NAV },
  { key: "manifest", label: "Manifest Dashboard", nav: MANIFEST_NAV },
];
