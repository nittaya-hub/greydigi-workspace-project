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
 * SettingsSection in Sidebar.tsx. Users/Templates/Notifications keep their
 * existing top-level routes; they're just reachable from here now instead
 * of sitting as siblings of Settings. The three space rows deep-link into
 * the Spaces card on the settings page (src/app/(app)/settings/page.tsx). */
export const SETTINGS_NAV: NavItem[] = [
  { label: "Users and members", href: "/people" },
  { label: "Templates", href: "/templates" },
  { label: "Notifications", href: "/notifications" },
  { label: "Delivery", href: "/settings#spaces-delivery" },
  { label: "Product", href: "/settings#spaces-product" },
  { label: "Hypercare", href: "/settings#spaces-hypercare" },
];

export const DELIVERY_NAV: NavItem[] = [
  { label: "Overview", href: "/delivery" },
  { label: "Projects", href: "/delivery/projects" },
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

export const SPACES: { key: SpaceKey; label: string; nav: NavItem[] }[] = [
  { key: "delivery", label: "Delivery", nav: DELIVERY_NAV },
  { key: "product", label: "Product", nav: PRODUCT_NAV },
  { key: "hypercare", label: "Hypercare", nav: HYPERCARE_NAV },
];
