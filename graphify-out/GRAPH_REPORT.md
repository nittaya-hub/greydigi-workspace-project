# Graph Report - web  (2026-09-04)

## Corpus Check
- 203 files · ~70,818 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 737 nodes · 2153 edges · 32 communities (25 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.88)
- Token cost: 146,474 input · 0 output

## Community Hubs (Navigation)
- Workspace Overview & UI Kit
- Server Action Mutations
- Client Records & CSV Export
- Project Documentation & Setup
- Project Detail & Publish Gate
- NPM Dependency Manifest
- Hypercare Incidents & SLA
- Product Roadmap & Releases
- TypeScript Compiler Config
- App Shell Navigation
- Database Type Definitions
- Public Share & Client Portal
- Gate Templates & Versions
- Audit Log & Notifications
- Member Invitation Flow
- Supabase Client & Proxy
- Sign-In Authentication
- GreyDigi Brand Identity
- Cross-Space Dashboard Export
- Share Link Management
- Starter Static Icon Assets
- Set Password Flow
- Root Layout & Fonts
- Admin Bootstrap Script
- Settings Section Navigation
- Project Mini Navigation
- ESLint Configuration
- Next.js Configuration
- PostCSS Configuration
- Seed Data Script
- Migration Test Script

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 168 edges
2. `getCurrentWorkspaceId()` - 66 edges
3. `Card()` - 53 edges
4. `getCurrentPerson()` - 48 edges
5. `notifyWorkspace()` - 47 edges
6. `Button` - 37 edges
7. `PageHeading()` - 34 edges
8. `Pill()` - 33 edges
9. `EmptyState()` - 27 edges
10. `CardHeader()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Invite the First workspace_admin` --semantically_similar_to--> `First Workspace Admin Bootstrap`  [INFERRED] [semantically similar]
  supabase/README.md → docs/GUIDE.en.md
- `Quick Start (npm install / .env.local / npm run dev)` --conceptually_related_to--> `Environment Variables (.env.local)`  [INFERRED]
  README.md → docs/GUIDE.en.md
- `Public Share Page /s/[token]` --shares_data_with--> `fn_public_share_view`  [INFERRED]
  docs/GUIDE.en.md → supabase/README.md
- `0009_product_extensions.sql` --conceptually_related_to--> `0004_product.sql`  [AMBIGUOUS]
  docs/CHECKLIST.en.md → supabase/README.md
- `0009_product_extensions.sql` --conceptually_related_to--> `Numbered Migrations (applied in order)`  [AMBIGUOUS]
  docs/CHECKLIST.en.md → supabase/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three Spaces Sharing One Workspace Core** — docs_guide_en_delivery, docs_guide_en_product, docs_guide_en_hypercare, docs_guide_en_workspace_core [EXTRACTED 1.00]
- **Client/Public Data Boundary (publish → RLS → projections → external pages)** — docs_guide_en_client_view_config_publish, supabase_readme_0007_rls, supabase_readme_fn_publish_client_view, supabase_readme_fn_public_share_view, supabase_readme_fn_client_portal_project, docs_guide_en_public_share_page, docs_guide_en_client_portal [INFERRED 0.85]
- **Access Provisioning Flow (bootstrap admin → invite → sign in → set password)** — docs_guide_en_no_self_serve_signup, docs_guide_en_first_workspace_admin, docs_guide_en_people_table, docs_guide_en_invite_flow, docs_guide_en_email_password_sign_in, docs_guide_en_magic_link_sign_in, docs_guide_en_google_sign_in, docs_guide_en_set_password [EXTRACTED 1.00]
- **Default Next.js Starter UI Glyph Set (file, globe, window)** — public_file_icon, public_globe_icon, public_window_icon, public_file_monochrome_icon_system [INFERRED 0.85]
- **Public Static Asset Layer Served at Site Root** — public_file_icon, public_globe_icon, public_window_icon, public_next_logo, public_vercel_logo [INFERRED 0.85]
- **GreyDigi Visual Identity System** — public_greydigi_logo_brand_mark, public_greydigi_logo_split_brain_motif, public_greydigi_logo_organic_hemisphere, public_greydigi_logo_circuit_hemisphere, public_greydigi_logo_coral_grey_gradient [INFERRED 0.85]

## Communities (32 total, 6 thin omitted)

### Community 0 - "Workspace Overview & UI Kit"
Cohesion: 0.07
Nodes (66): ClientsPage(), CrossSpaceDashboardPage(), BaselinesPage(), ChangeRequestsPage(), STATUS_TONE, DeliveryDocumentsPage(), FlightPlansPage(), GatesPage() (+58 more)

### Community 1 - "Server Action Mutations"
Cohesion: 0.10
Nodes (47): addClient(), createProjectForClient(), generatePassword(), grantPortalAccess(), initialsFrom(), createProject(), createBaselineV1(), CreateBaselineButton() (+39 more)

### Community 2 - "Client Records & CSV Export"
Cohesion: 0.07
Nodes (44): AddClientButton(), PortalAccessResult, InternalPersonOption, listInternalPeopleOptions(), listTemplateVersionOptions(), TemplateVersionOption, NewProjectButton(), ClientDetailPage() (+36 more)

### Community 3 - "Project Documentation & Setup"
Cohesion: 0.07
Nodes (57): generate-agent-files.js, node_modules/next/dist/docs Guides, Next.js Agent Rules Block, CLAUDE.md @AGENTS.md Include, 0009_product_extensions.sql, Database Migration Checklist, Feature Check Checklist, Local Setup Checklist (+49 more)

### Community 4 - "Project Detail & Publish Gate"
Cohesion: 0.06
Nodes (45): ProjectBaselinesPage(), ProjectChangeRequestsPage(), ProjectClientUpdatesPage(), publishClientView(), ClientViewFieldToggle(), LockedOffToggle(), ClientViewConfigPage(), publish() (+37 more)

### Community 5 - "NPM Dependency Manifest"
Cohesion: 0.04
Nodes (44): clsx, eslint, eslint-config-next, next, dependencies, clsx, next, react (+36 more)

### Community 6 - "Hypercare Incidents & SLA"
Cohesion: 0.08
Nodes (35): EscalationsPage(), ExportCsvButton(), LogIncidentButton(), IncidentsListPage(), IncidentDetailPage(), SEV_TONE, PauseClockButton(), HEALTH_LABEL (+27 more)

### Community 7 - "Product Roadmap & Releases"
Cohesion: 0.09
Nodes (24): FeatureDetailPage(), STATUS_LABEL, ReleaseDetailPage(), RoadmapPage(), RoadmapColumn, RoadmapView(), TimelineItem, timeSortKey() (+16 more)

### Community 8 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 9 - "App Shell Navigation"
Cohesion: 0.11
Nodes (21): AppLayout(), breadcrumbSegments(), Crumb, Header(), DELIVERY_NAV, HYPERCARE_NAV, NavItem, PRODUCT_NAV (+13 more)

### Community 10 - "Database Type Definitions"
Cohesion: 0.07
Nodes (28): BaselineStatus, ChangeRequestStatus, ClientActionKind, ClientActionStatus, ClientUpdateStatus, ConditionOwner, ConditionStatus, CrudTable (+20 more)

### Community 11 - "Public Share & Client Portal"
Cohesion: 0.15
Nodes (12): ActionItem(), markActionDone(), ClientPortalPage(), PublicShareViewPage(), Eyebrow(), PhaseSpine(), PhaseSpineSegment, getPortalProject() (+4 more)

### Community 12 - "Gate Templates & Versions"
Cohesion: 0.15
Nodes (13): ProjectLayout(), GateConditionRow, listGateConditionsWithIds(), GateConditionSignatureToggle(), TemplateDetailPage(), ProjectTabs(), Tab(), Tabs() (+5 more)

### Community 13 - "Audit Log & Notifications"
Cohesion: 0.17
Nodes (13): MarkAllReadButton(), ACTION_KINDS, NotificationsPage(), timeAgo(), AuditRow, currentPersonId(), listAuditLog(), listMembers() (+5 more)

### Community 14 - "Member Invitation Flow"
Cohesion: 0.24
Nodes (8): generatePassword(), initialsFrom(), inviteMember(), InviteResult, VALID_ROLES, InviteForm(), ROLES, createAdminClient()

### Community 15 - "Supabase Client & Proxy"
Cohesion: 0.31
Nodes (6): Database, isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL, config, PUBLIC_PREFIXES

### Community 16 - "Sign-In Authentication"
Cohesion: 0.36
Nodes (5): SendLinkResult, sendMagicLink(), signInWithGoogle(), signInWithPassword(), SignInForm()

### Community 17 - "GreyDigi Brand Identity"
Cohesion: 0.39
Nodes (8): GreyDigi Brand Logo Mark, Circuit-Board Hemisphere with PCB Traces and Via Nodes, Coral-to-Grey Gradient Palette, Human Intelligence Meets Digital Technology, Negative-Space Trace Symmetry Between Halves, Solid Coral Organic Hemisphere with Neural Traces, Split-Brain Motif (Organic Left / Circuit Right), Public Static Brand Asset (public/greydigi-logo.png)

### Community 18 - "Cross-Space Dashboard Export"
Cohesion: 0.36
Nodes (6): csvEscape(), ExportButton(), handleExport(), toCsv(), CrossSpaceDashboard, getCrossSpaceDashboard()

### Community 19 - "Share Link Management"
Cohesion: 0.50
Nodes (6): createShareLink(), currentPersonId(), newToken(), regenerateShareLink(), revokeShareLink(), ShareLinkActions()

### Community 20 - "Starter Static Icon Assets"
Cohesion: 0.52
Nodes (7): File / Document Icon (16px outline glyph), Monochrome 16px Icon System (#666 on 16x16 viewBox), Globe / World Icon (16px outline glyph), Next.js Wordmark Logo, Next.js Starter Brand Asset Set, Vercel Triangle Mark, Browser Window Icon (16px outline glyph)

### Community 21 - "Set Password Flow"
Cohesion: 0.43
Nodes (3): setPassword(), SetPasswordResult, SetPasswordForm()

### Community 22 - "Root Layout & Fonts"
Cohesion: 0.33
Nodes (4): inter, manrope, metadata, plexMono

### Community 23 - "Admin Bootstrap Script"
Cohesion: 0.60
Nodes (4): loadEnvLocal(), main(), parseArgs(), VALID_ROLES

### Community 25 - "Project Mini Navigation"
Cohesion: 0.67
Nodes (3): MiniProject, ProjectMiniNav(), createClient()

## Ambiguous Edges - Review These
- `0009_product_extensions.sql` → `0004_product.sql`  [AMBIGUOUS]
  docs/CHECKLIST.en.md · relation: conceptually_related_to
- `0009_product_extensions.sql` → `Numbered Migrations (applied in order)`  [AMBIGUOUS]
  docs/CHECKLIST.en.md · relation: conceptually_related_to
- `Vercel Triangle Mark` → `Monochrome 16px Icon System (#666 on 16x16 viewBox)`  [AMBIGUOUS]
  public/vercel.svg · relation: conceptually_related_to

## Knowledge Gaps
- **173 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 200 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `0009_product_extensions.sql` and `0004_product.sql`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `0009_product_extensions.sql` and `Numbered Migrations (applied in order)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Vercel Triangle Mark` and `Monochrome 16px Icon System (#666 on 16x16 viewBox)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `createClient()` connect `Server Action Mutations` to `Workspace Overview & UI Kit`, `Client Records & CSV Export`, `Project Detail & Publish Gate`, `Hypercare Incidents & SLA`, `Product Roadmap & Releases`, `App Shell Navigation`, `Public Share & Client Portal`, `Gate Templates & Versions`, `Audit Log & Notifications`, `Member Invitation Flow`, `Sign-In Authentication`, `Cross-Space Dashboard Export`, `Share Link Management`, `Set Password Flow`?**
  _High betweenness centrality (0.259) - this node is a cross-community bridge._
- **Why does `getCurrentWorkspaceId()` connect `Workspace Overview & UI Kit` to `Server Action Mutations`, `Client Records & CSV Export`, `Hypercare Incidents & SLA`, `Product Roadmap & Releases`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Card()` connect `Workspace Overview & UI Kit` to `Client Records & CSV Export`, `Project Detail & Publish Gate`, `Hypercare Incidents & SLA`, `Product Roadmap & Releases`, `Public Share & Client Portal`, `Gate Templates & Versions`, `Audit Log & Notifications`, `Member Invitation Flow`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._