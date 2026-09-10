// Hand-written to match supabase/migrations/*.sql exactly (no live project
// to run `supabase gen types` against yet — see supabase/README.md).
// Regenerate with `npm run supabase:gen-types` once NEXT_PUBLIC_SUPABASE_URL
// is set to a real project that has the migrations applied.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SpaceKind = "delivery" | "product" | "hypercare";
export type PersonKind = "internal" | "client";
export type WorkspaceRole =
  | "workspace_admin"
  | "delivery_lead"
  | "product_lead"
  | "hypercare_lead"
  | "member"
  | "client";
export type ProjectStatus = "active" | "archived";
export type HealthStatus = "on_plan" | "watch" | "blocked";
export type TaskStatus = "idle" | "in_progress" | "waiting_on_client" | "blocked" | "watch" | "done";
export type GateStatus = "on_plan" | "held" | "cleared";
export type ConditionStatus = "open" | "met" | "waived";
export type ConditionOwner = "team" | "client";
export type BaselineStatus = "draft" | "approved" | "superseded";
export type ChangeRequestStatus = "draft" | "raised" | "awaiting_signature" | "approved" | "rejected";
export type DocumentVisibility = "internal" | "client_visible";
export type ClientUpdateStatus = "draft" | "published";
export type ShareLinkStatus = "active" | "revoked" | "expired";
export type RoadmapItemKind = "epic" | "feature";
export type RoadmapItemStatus = "forecast" | "committed" | "in_progress" | "done";
export type ReleaseStatus = "planning" | "in_progress" | "ready" | "shipped";
export type ServiceHealth = "healthy" | "watch" | "at_risk";
export type IncidentSeverity = "sev1" | "sev2" | "sev3";
export type IncidentStatus = "open" | "investigating" | "resolved";
export type SupportRequestStatus = "open" | "in_progress" | "done";
export type EscalationStatus = "open" | "resolved";
export type IntegrationStatus = "not_connected" | "connected";
export type ClientSubmissionKind = "issue" | "change_request" | "question";
export type ClientSubmissionStatus = "open" | "in_progress" | "resolved";
export type TaskVisibility = "internal" | "external";
export type ProjectMemberRole = "project_admin" | "member";
export type DashboardSpace = "delivery" | "hypercare" | "product";
export type DashboardBlockType = "text" | "image" | "flight_plan" | "documents" | "embed" | "metric" | "chart";
export type ClientActionKind =
  | "review"
  | "approval"
  | "provide_information"
  | "upload_document"
  | "confirm_decision"
  | "sign_artefact";
export type ClientActionStatus = "pending" | "in_progress" | "completed" | "overdue";

type Timestamptz = string;
type DateStr = string;

interface Relationship {
  foreignKeyName: string;
  columns: readonly string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: readonly string[];
}

// postgrest-js 2.x requires a `Relationships` array per table to type-check
// embedded selects (`.select("...,other_table(...)")`). Defaults to `[]`
// (a valid, if inert, GenericRelationship[]) — pass the real tuple as the
// 4th type param for any table a query actually embeds through, so that
// embed's shape resolves instead of `never`.
interface CrudTable<Row, Insert, Update = Partial<Insert>, Rel extends readonly Relationship[] = []> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Rel;
}

export interface Database {
  public: {
    Tables: {
      workspaces: CrudTable<
        {
          id: string;
          name: string;
          slug: string;
          business_hours: string;
          default_share_expiry_days: number;
          portal_welcome_message: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          name: string;
          slug: string;
          business_hours?: string;
          default_share_expiry_days?: number;
          portal_welcome_message?: string | null;
          created_at?: Timestamptz;
        }
      >;
      workspace_branding: CrudTable<
        {
          id: string;
          workspace_id: string;
          tokens: Json;
          logo_data_url: string | null;
          logo_filename: string | null;
          html_template: string | null;
          source_filename: string | null;
          updated_at: Timestamptz;
          updated_by: string | null;
        },
        {
          id?: string;
          workspace_id: string;
          tokens?: Json;
          logo_data_url?: string | null;
          logo_filename?: string | null;
          html_template?: string | null;
          source_filename?: string | null;
          updated_at?: Timestamptz;
          updated_by?: string | null;
        }
      >;
      project_branding: CrudTable<
        {
          id: string;
          project_id: string;
          logo_data_url: string | null;
          logo_filename: string | null;
          accent_color: string | null;
          welcome_headline: string | null;
          updated_at: Timestamptz;
          updated_by: string | null;
          client_display_name: string | null;
          show_client_name: boolean;
        },
        {
          id?: string;
          project_id: string;
          logo_data_url?: string | null;
          logo_filename?: string | null;
          accent_color?: string | null;
          welcome_headline?: string | null;
          updated_at?: Timestamptz;
          updated_by?: string | null;
          client_display_name?: string | null;
          show_client_name?: boolean;
        }
      >;
      workspace_integrations: CrudTable<
        {
          id: string;
          workspace_id: string;
          name: string;
          status: IntegrationStatus;
          connected_at: Timestamptz | null;
        },
        {
          id?: string;
          workspace_id: string;
          name: string;
          status?: IntegrationStatus;
          connected_at?: Timestamptz | null;
        }
      >;
      people: CrudTable<
        {
          id: string;
          workspace_id: string;
          auth_user_id: string | null;
          full_name: string;
          email: string;
          kind: PersonKind;
          avatar_initials: string;
          workspace_role: WorkspaceRole;
          is_active: boolean;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          auth_user_id?: string | null;
          full_name: string;
          email: string;
          kind: PersonKind;
          avatar_initials: string;
          workspace_role?: WorkspaceRole;
          is_active?: boolean;
          created_at?: Timestamptz;
        }
      >;
      space_roles: CrudTable<
        { id: string; person_id: string; space: SpaceKind; role: string; created_at: Timestamptz },
        { id?: string; person_id: string; space: SpaceKind; role?: string; created_at?: Timestamptz }
      >;
      clients: CrudTable<
        {
          id: string;
          workspace_id: string;
          name: string;
          client_since: DateStr | null;
          logo_url: string | null;
          hypercare_enabled: boolean;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          name: string;
          client_since?: DateStr | null;
          logo_url?: string | null;
          hypercare_enabled?: boolean;
          created_at?: Timestamptz;
        }
      >;
      client_submissions: CrudTable<
        {
          id: string;
          workspace_id: string;
          client_id: string;
          service_id: string | null;
          kind: ClientSubmissionKind;
          category: string | null;
          severity: string | null;
          priority: string | null;
          title: string;
          description: string;
          business_impact: string | null;
          status: ClientSubmissionStatus;
          submitted_by: string | null;
          created_at: Timestamptz;
          resolved_at: Timestamptz | null;
          assignee_person_id: string | null;
          needs_client_notice: boolean;
        },
        {
          id?: string;
          workspace_id: string;
          client_id: string;
          service_id?: string | null;
          kind: ClientSubmissionKind;
          category?: string | null;
          severity?: string | null;
          priority?: string | null;
          title: string;
          description: string;
          business_impact?: string | null;
          status?: ClientSubmissionStatus;
          submitted_by?: string | null;
          created_at?: Timestamptz;
          resolved_at?: Timestamptz | null;
          assignee_person_id?: string | null;
          needs_client_notice?: boolean;
        }
      >;
      client_submission_comments: CrudTable<
        { id: string; submission_id: string; author_person_id: string | null; body: string; created_at: Timestamptz },
        { id?: string; submission_id: string; author_person_id?: string | null; body: string; created_at?: Timestamptz }
      >;
      client_submission_attachments: CrudTable<
        {
          id: string;
          submission_id: string;
          file_path: string;
          file_name: string;
          file_size: number | null;
          content_type: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          submission_id: string;
          file_path: string;
          file_name: string;
          file_size?: number | null;
          content_type?: string | null;
          created_at?: Timestamptz;
        }
      >;
      client_roles: CrudTable<
        { id: string; person_id: string; client_id: string; role: string; created_at: Timestamptz },
        { id?: string; person_id: string; client_id: string; role?: string; created_at?: Timestamptz }
      >;
      submission_taxonomy_options: CrudTable<
        {
          id: string;
          workspace_id: string;
          kind: ClientSubmissionKind;
          field: "category" | "severity" | "priority";
          value: string;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          kind: ClientSubmissionKind;
          field: "category" | "severity" | "priority";
          value: string;
          label: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: Timestamptz;
        }
      >;
      notifications: CrudTable<
        {
          id: string;
          workspace_id: string;
          person_id: string;
          kind: string;
          title: string;
          body: string | null;
          related_url: string | null;
          actor_label: string | null;
          is_read: boolean;
          is_archived: boolean;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          person_id: string;
          kind: string;
          title: string;
          body?: string | null;
          related_url?: string | null;
          actor_label?: string | null;
          is_read?: boolean;
          is_archived?: boolean;
          created_at?: Timestamptz;
        }
      >;
      activity_log: CrudTable<
        {
          id: string;
          workspace_id: string;
          actor_person_id: string | null;
          space: SpaceKind | null;
          action: string;
          entity_type: string;
          entity_id: string;
          summary: string;
          metadata: Json;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          actor_person_id?: string | null;
          space?: SpaceKind | null;
          action: string;
          entity_type: string;
          entity_id: string;
          summary: string;
          metadata?: Json;
          created_at?: Timestamptz;
        }
      >;
      file_assets: CrudTable<
        {
          id: string;
          workspace_id: string;
          storage_path: string;
          original_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          storage_path: string;
          original_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      cross_space_links: CrudTable<
        {
          id: string;
          workspace_id: string;
          from_type: string;
          from_id: string;
          to_type: string;
          to_id: string;
          relationship: string;
          note: string | null;
          created_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          from_type: string;
          from_id: string;
          to_type: string;
          to_id: string;
          relationship: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: Timestamptz;
        }
      >;

      templates: CrudTable<
        { id: string; workspace_id: string; name: string; created_at: Timestamptz },
        { id?: string; workspace_id: string; name: string; created_at?: Timestamptz }
      >;
      template_versions: CrudTable<
        {
          id: string;
          template_id: string;
          version: string;
          is_locked: boolean;
          locked_at: Timestamptz | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          template_id: string;
          version: string;
          is_locked?: boolean;
          locked_at?: Timestamptz | null;
          created_at?: Timestamptz;
        }
      >;
      template_phases: CrudTable<
        {
          id: string;
          template_version_id: string;
          index: number;
          code: string;
          name: string;
          duration_label: string | null;
          show_duration_label: boolean;
        },
        {
          id?: string;
          template_version_id: string;
          index: number;
          code: string;
          name: string;
          duration_label?: string | null;
          show_duration_label?: boolean;
        }
      >;
      template_gates: CrudTable<
        {
          id: string;
          template_version_id: string;
          template_phase_id: string;
          code: string;
          name: string;
          sequence: number;
        },
        {
          id?: string;
          template_version_id: string;
          template_phase_id: string;
          code: string;
          name: string;
          sequence: number;
        }
      >;
      template_gate_conditions: CrudTable<
        {
          id: string;
          template_gate_id: string;
          description: string;
          requires_signature: boolean;
          sequence: number;
        },
        {
          id?: string;
          template_gate_id: string;
          description: string;
          requires_signature?: boolean;
          sequence: number;
        }
      >;
      template_tasks: CrudTable<
        { id: string; template_version_id: string; template_phase_id: string; title: string; is_critical_path: boolean },
        { id?: string; template_version_id: string; template_phase_id: string; title: string; is_critical_path?: boolean }
      >;
      projects: CrudTable<
        {
          id: string;
          workspace_id: string;
          client_id: string;
          ref: string;
          name: string;
          description: string | null;
          template_version_id: string | null;
          status: ProjectStatus;
          lead_person_id: string | null;
          go_live_target: DateStr | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          client_id: string;
          ref: string;
          name: string;
          description?: string | null;
          template_version_id?: string | null;
          status?: ProjectStatus;
          lead_person_id?: string | null;
          go_live_target?: DateStr | null;
          created_at?: Timestamptz;
        }
      >;
      project_members: CrudTable<
        { id: string; project_id: string; person_id: string; role: ProjectMemberRole; created_at: Timestamptz },
        { id?: string; project_id: string; person_id: string; role?: ProjectMemberRole; created_at?: Timestamptz }
      >;
      project_phases: CrudTable<
        {
          id: string;
          project_id: string;
          template_phase_id: string | null;
          index: number;
          code: string;
          name: string;
          started_at: Timestamptz | null;
          completed_at: Timestamptz | null;
          duration_label: string | null;
          show_duration_label: boolean;
        },
        {
          id?: string;
          project_id: string;
          template_phase_id?: string | null;
          index: number;
          code: string;
          name: string;
          started_at?: Timestamptz | null;
          completed_at?: Timestamptz | null;
          duration_label?: string | null;
          show_duration_label?: boolean;
        }
      >;
      project_gates: CrudTable<
        {
          id: string;
          project_id: string;
          project_phase_id: string;
          template_gate_id: string | null;
          code: string;
          name: string;
          sequence: number;
          status: GateStatus;
          held_since: DateStr | null;
          cleared_at: Timestamptz | null;
          target_date: DateStr | null;
        },
        {
          id?: string;
          project_id: string;
          project_phase_id: string;
          template_gate_id?: string | null;
          code: string;
          name: string;
          sequence: number;
          status?: GateStatus;
          held_since?: DateStr | null;
          cleared_at?: Timestamptz | null;
          target_date?: DateStr | null;
        }
      >;
      project_gate_conditions: CrudTable<
        {
          id: string;
          project_gate_id: string;
          template_condition_id: string | null;
          description: string;
          status: ConditionStatus;
          owner: ConditionOwner;
          sequence: number;
          met_at: Timestamptz | null;
          met_via_document_id: string | null;
          signed_by: string | null;
          signed_at: Timestamptz | null;
          waived_by: string | null;
          waived_reason: string | null;
          waived_at: Timestamptz | null;
        },
        {
          id?: string;
          project_gate_id: string;
          template_condition_id?: string | null;
          description: string;
          status?: ConditionStatus;
          owner?: ConditionOwner;
          sequence: number;
          met_at?: Timestamptz | null;
          met_via_document_id?: string | null;
          signed_by?: string | null;
          signed_at?: Timestamptz | null;
          waived_by?: string | null;
          waived_reason?: string | null;
          waived_at?: Timestamptz | null;
        }
      >;
      project_tasks: CrudTable<
        {
          id: string;
          project_id: string;
          project_phase_id: string | null;
          ref: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          is_critical_path: boolean;
          client_visible_date: DateStr | null;
          due_date: DateStr | null;
          assignee_person_id: string | null;
          sort_order: number;
          visibility: TaskVisibility;
          created_at: Timestamptz;
          is_out_of_scope: boolean;
          change_request_id: string | null;
        },
        {
          id?: string;
          project_id: string;
          project_phase_id?: string | null;
          ref: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          is_critical_path?: boolean;
          client_visible_date?: DateStr | null;
          due_date?: DateStr | null;
          sort_order?: number;
          visibility?: TaskVisibility;
          assignee_person_id?: string | null;
          created_at?: Timestamptz;
          is_out_of_scope?: boolean;
          change_request_id?: string | null;
        }
      >;
      task_comments: CrudTable<
        { id: string; task_id: string; author_person_id: string | null; body: string; created_at: Timestamptz },
        { id?: string; task_id: string; author_person_id?: string | null; body: string; created_at?: Timestamptz }
      >;
      task_custom_fields: CrudTable<
        { id: string; project_id: string; name: string; sort_order: number; created_at: Timestamptz },
        { id?: string; project_id: string; name: string; sort_order?: number; created_at?: Timestamptz }
      >;
      task_custom_field_values: CrudTable<
        { id: string; task_id: string; field_id: string; value: string | null; updated_at: Timestamptz },
        { id?: string; task_id: string; field_id: string; value?: string | null; updated_at?: Timestamptz }
      >;
      baselines: CrudTable<
        {
          id: string;
          project_id: string;
          version: string;
          status: BaselineStatus;
          scope_snapshot: Json;
          dates_snapshot: Json;
          effort_snapshot: Json;
          variance_days: number | null;
          approved_by: string | null;
          approved_at: Timestamptz | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          version: string;
          status?: BaselineStatus;
          scope_snapshot?: Json;
          dates_snapshot?: Json;
          effort_snapshot?: Json;
          variance_days?: number | null;
          approved_by?: string | null;
          approved_at?: Timestamptz | null;
          created_at?: Timestamptz;
        }
      >;
      change_requests: CrudTable<
        {
          id: string;
          project_id: string;
          ref: string;
          title: string;
          description: string | null;
          impact_dates_days: number | null;
          impact_effort: string | null;
          impact_price: string | null;
          status: ChangeRequestStatus;
          raised_from_ref: string | null;
          created_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          ref: string;
          title: string;
          description?: string | null;
          impact_dates_days?: number | null;
          impact_effort?: string | null;
          impact_price?: string | null;
          status?: ChangeRequestStatus;
          raised_from_ref?: string | null;
          created_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      project_progress_stats: CrudTable<
        {
          id: string;
          project_id: string;
          label: string;
          value: string;
          note: string | null;
          reviewed_at: Timestamptz | null;
          reviewed_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          label: string;
          value: string;
          note?: string | null;
          reviewed_at?: Timestamptz | null;
          reviewed_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      project_decisions: CrudTable<
        {
          id: string;
          project_id: string;
          title: string;
          detail: string | null;
          owner: string | null;
          due_label: string | null;
          status: "open" | "closed";
          reviewed_at: Timestamptz | null;
          reviewed_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          title: string;
          detail?: string | null;
          owner?: string | null;
          due_label?: string | null;
          status?: "open" | "closed";
          reviewed_at?: Timestamptz | null;
          reviewed_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      project_weekly_commitments: CrudTable<
        {
          id: string;
          project_id: string;
          period_label: string;
          owner_label: string;
          items: Json;
          accent: boolean;
          reviewed_at: Timestamptz | null;
          reviewed_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          period_label: string;
          owner_label: string;
          items?: Json;
          accent?: boolean;
          reviewed_at?: Timestamptz | null;
          reviewed_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      project_baseline_measures: CrudTable<
        {
          id: string;
          project_id: string;
          measure_name: string;
          today_value: string;
          after_value: string;
          baselined_when: string | null;
          reviewed_at: Timestamptz | null;
          reviewed_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          measure_name: string;
          today_value: string;
          after_value: string;
          baselined_when?: string | null;
          reviewed_at?: Timestamptz | null;
          reviewed_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      documents: CrudTable<
        {
          id: string;
          workspace_id: string;
          project_id: string | null;
          file_asset_id: string | null;
          name: string;
          kind: string;
          version: string;
          visibility: DocumentVisibility;
          requires_signature: boolean;
          signed_by: string | null;
          signed_at: Timestamptz | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          file_asset_id?: string | null;
          name: string;
          kind?: string;
          version?: string;
          visibility?: DocumentVisibility;
          requires_signature?: boolean;
          signed_by?: string | null;
          signed_at?: Timestamptz | null;
          created_at?: Timestamptz;
        }
      >;
      client_updates: CrudTable<
        {
          id: string;
          project_id: string;
          title: string;
          body: string;
          status: ClientUpdateStatus;
          author_person_id: string | null;
          published_at: Timestamptz | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          title: string;
          body: string;
          status?: ClientUpdateStatus;
          author_person_id?: string | null;
          published_at?: Timestamptz | null;
          created_at?: Timestamptz;
        }
      >;
      client_view_configs: CrudTable<
        {
          id: string;
          project_id: string;
          fields: Json;
          published_snapshot: Json | null;
          published_at: Timestamptz | null;
          published_by: string | null;
          updated_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          fields?: Json;
          published_snapshot?: Json | null;
          published_at?: Timestamptz | null;
          published_by?: string | null;
          updated_at?: Timestamptz;
        }
      >;
      project_checkpoint_snapshots: CrudTable<
        { id: string; project_id: string; week_label: string; published_at: Timestamptz; published_by: string | null; snapshot: Json },
        { id?: string; project_id: string; week_label: string; published_at?: Timestamptz; published_by?: string | null; snapshot: Json }
      >;
      client_dashboards: CrudTable<
        {
          id: string;
          workspace_id: string;
          space: DashboardSpace;
          project_id: string | null;
          client_id: string | null;
          published_at: Timestamptz | null;
          published_by: string | null;
          updated_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          space: DashboardSpace;
          project_id?: string | null;
          client_id?: string | null;
          published_at?: Timestamptz | null;
          published_by?: string | null;
          updated_at?: Timestamptz;
        }
      >;
      dashboard_blocks: CrudTable<
        {
          id: string;
          dashboard_id: string;
          block_type: DashboardBlockType;
          config: Json;
          grid_x: number;
          grid_y: number;
          grid_w: number;
          grid_h: number;
          created_at: Timestamptz;
        },
        {
          id?: string;
          dashboard_id: string;
          block_type: DashboardBlockType;
          config?: Json;
          grid_x?: number;
          grid_y?: number;
          grid_w?: number;
          grid_h?: number;
          created_at?: Timestamptz;
        }
      >;
      share_links: CrudTable<
        {
          id: string;
          project_id: string;
          token: string;
          status: ShareLinkStatus;
          expires_at: Timestamptz | null;
          created_by: string | null;
          created_at: Timestamptz;
          revoked_at: Timestamptz | null;
          last_regenerated_at: Timestamptz | null;
        },
        {
          id?: string;
          project_id: string;
          token: string;
          status?: ShareLinkStatus;
          expires_at?: Timestamptz | null;
          created_by?: string | null;
          created_at?: Timestamptz;
          revoked_at?: Timestamptz | null;
          last_regenerated_at?: Timestamptz | null;
        }
      >;
      share_link_views: CrudTable<
        { id: string; share_link_id: string; viewed_at: Timestamptz; ip_city: string | null; ip_country: string | null },
        { id?: string; share_link_id: string; viewed_at?: Timestamptz; ip_city?: string | null; ip_country?: string | null }
      >;
      hypercare_view_configs: CrudTable<
        { id: string; client_id: string; fields: Json; updated_at: Timestamptz },
        { id?: string; client_id: string; fields?: Json; updated_at?: Timestamptz }
      >;
      hypercare_share_reports: CrudTable<
        {
          id: string;
          client_id: string;
          period_start: string;
          period_end: string;
          token: string;
          status: ShareLinkStatus;
          snapshot: Json;
          published_by: string | null;
          published_at: Timestamptz;
          revoked_at: Timestamptz | null;
        },
        {
          id?: string;
          client_id: string;
          period_start: string;
          period_end: string;
          token: string;
          status?: ShareLinkStatus;
          snapshot: Json;
          published_by?: string | null;
          published_at?: Timestamptz;
          revoked_at?: Timestamptz | null;
        }
      >;
      client_actions: CrudTable<
        {
          id: string;
          project_id: string;
          kind: ClientActionKind;
          title: string;
          description: string | null;
          status: ClientActionStatus;
          assigned_person_id: string | null;
          related_document_id: string | null;
          due_at: Timestamptz | null;
          completed_at: Timestamptz | null;
          completed_by: string | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          project_id: string;
          kind: ClientActionKind;
          title: string;
          description?: string | null;
          status?: ClientActionStatus;
          assigned_person_id?: string | null;
          related_document_id?: string | null;
          due_at?: Timestamptz | null;
          completed_at?: Timestamptz | null;
          completed_by?: string | null;
          created_at?: Timestamptz;
        }
      >;
      client_signatures: CrudTable<
        {
          id: string;
          client_action_id: string | null;
          project_id: string;
          document_id: string | null;
          required_signer_person_id: string | null;
          status: ClientActionStatus;
          signed_at: Timestamptz | null;
          created_at: Timestamptz;
        },
        {
          id?: string;
          client_action_id?: string | null;
          project_id: string;
          document_id?: string | null;
          required_signer_person_id?: string | null;
          status?: ClientActionStatus;
          signed_at?: Timestamptz | null;
          created_at?: Timestamptz;
        }
      >;

      products: CrudTable<
        { id: string; workspace_id: string; name: string; description: string | null; created_at: Timestamptz },
        { id?: string; workspace_id: string; name: string; description?: string | null; created_at?: Timestamptz }
      >;
      releases: CrudTable<
        {
          id: string;
          product_id: string;
          code: string;
          name: string;
          target_date: DateStr | null;
          readiness_pct: number;
          status: ReleaseStatus;
          created_at: Timestamptz;
        },
        {
          id?: string;
          product_id: string;
          code: string;
          name: string;
          target_date?: DateStr | null;
          readiness_pct?: number;
          status?: ReleaseStatus;
          created_at?: Timestamptz;
        }
      >;
      roadmap_items: CrudTable<
        {
          id: string;
          product_id: string;
          ref: string;
          title: string;
          description: string | null;
          kind: RoadmapItemKind;
          status: RoadmapItemStatus;
          quarter: string | null;
          release_id: string | null;
          owner_person_id: string | null;
          client_visible: boolean;
          created_at: Timestamptz;
        },
        {
          id?: string;
          product_id: string;
          ref: string;
          title: string;
          description?: string | null;
          kind: RoadmapItemKind;
          status?: RoadmapItemStatus;
          quarter?: string | null;
          release_id?: string | null;
          owner_person_id?: string | null;
          client_visible?: boolean;
          created_at?: Timestamptz;
        }
      >;
      release_criteria: CrudTable<
        {
          id: string;
          release_id: string;
          description: string;
          status: ConditionStatus;
          met_at: Timestamptz | null;
          sequence: number;
        },
        {
          id?: string;
          release_id: string;
          description: string;
          status?: ConditionStatus;
          met_at?: Timestamptz | null;
          sequence: number;
        }
      >;
      project_release_dependencies: CrudTable<
        { id: string; project_id: string; release_id: string; note: string | null; created_at: Timestamptz },
        { id?: string; project_id: string; release_id: string; note?: string | null; created_at?: Timestamptz }
      >;
      engineering_tasks: CrudTable<
        {
          id: string;
          workspace_id: string;
          person_id: string;
          ref: string;
          title: string;
          roadmap_item_id: string | null;
          release_id: string | null;
          status: TaskStatus;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          person_id: string;
          ref: string;
          title: string;
          roadmap_item_id?: string | null;
          release_id?: string | null;
          status?: TaskStatus;
          created_at?: Timestamptz;
        }
      >;

      services: CrudTable<
        {
          id: string;
          workspace_id: string;
          client_id: string;
          origin_project_id: string | null;
          ref: string;
          name: string;
          live_since: DateStr | null;
          health: ServiceHealth;
          created_at: Timestamptz;
        },
        {
          id?: string;
          workspace_id: string;
          client_id: string;
          origin_project_id?: string | null;
          ref: string;
          name: string;
          live_since?: DateStr | null;
          health?: ServiceHealth;
          created_at?: Timestamptz;
        }
      >;
      sla_policies: CrudTable<
        {
          id: string;
          service_id: string;
          name: string;
          response_target_minutes: number;
          resolve_target_minutes: number;
          business_hours_only: boolean;
        },
        {
          id?: string;
          service_id: string;
          name: string;
          response_target_minutes: number;
          resolve_target_minutes: number;
          business_hours_only?: boolean;
        }
      >;
      sla_policy_tiers: CrudTable<
        {
          id: string;
          sla_policy_id: string;
          severity: IncidentSeverity;
          response_target_minutes: number;
          update_cadence_minutes: number | null;
        },
        {
          id?: string;
          sla_policy_id: string;
          severity: IncidentSeverity;
          response_target_minutes: number;
          update_cadence_minutes?: number | null;
        }
      >;
      incidents: CrudTable<
        {
          id: string;
          service_id: string;
          ref: string;
          title: string;
          severity: IncidentSeverity;
          status: IncidentStatus;
          opened_at: Timestamptz;
          breach_at: Timestamptz | null;
          resolved_at: Timestamptz | null;
          root_cause: string | null;
          created_by: string | null;
        },
        {
          id?: string;
          service_id: string;
          ref: string;
          title: string;
          severity: IncidentSeverity;
          status?: IncidentStatus;
          opened_at?: Timestamptz;
          breach_at?: Timestamptz | null;
          resolved_at?: Timestamptz | null;
          root_cause?: string | null;
          created_by?: string | null;
        },
        Partial<{
          id: string;
          service_id: string;
          ref: string;
          title: string;
          severity: IncidentSeverity;
          status: IncidentStatus;
          opened_at: Timestamptz;
          breach_at: Timestamptz | null;
          resolved_at: Timestamptz | null;
          root_cause: string | null;
          created_by: string | null;
        }>,
        [
          {
            foreignKeyName: "incidents_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ]
      >;
      support_requests: CrudTable<
        {
          id: string;
          service_id: string;
          ref: string;
          title: string;
          status: SupportRequestStatus;
          opened_at: Timestamptz;
          closed_at: Timestamptz | null;
        },
        {
          id?: string;
          service_id: string;
          ref: string;
          title: string;
          status?: SupportRequestStatus;
          opened_at?: Timestamptz;
          closed_at?: Timestamptz | null;
        }
      >;
      incident_pauses: CrudTable<
        { id: string; incident_id: string; paused_at: Timestamptz; resumed_at: Timestamptz | null; reason: string },
        { id?: string; incident_id: string; paused_at?: Timestamptz; resumed_at?: Timestamptz | null; reason: string }
      >;
      health_checks: CrudTable<
        { id: string; service_id: string; checked_at: Timestamptz; status: ServiceHealth; reason: string | null },
        { id?: string; service_id: string; checked_at?: Timestamptz; status: ServiceHealth; reason?: string | null }
      >;
      escalations: CrudTable<
        {
          id: string;
          workspace_id: string;
          service_id: string;
          incident_id: string | null;
          reason: string;
          escalated_to_person_id: string | null;
          status: EscalationStatus;
          created_at: Timestamptz;
          resolved_at: Timestamptz | null;
        },
        {
          id?: string;
          workspace_id: string;
          service_id: string;
          incident_id?: string | null;
          reason: string;
          escalated_to_person_id?: string | null;
          status?: EscalationStatus;
          created_at?: Timestamptz;
          resolved_at?: Timestamptz | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      fn_project_health: { Args: { p_project_id: string }; Returns: HealthStatus };
      fn_project_progress_pct: { Args: { p_project_id: string }; Returns: number };
      fn_service_health: { Args: { p_service_id: string }; Returns: ServiceHealth };
      fn_public_share_view: {
        Args: { p_token: string; p_viewer_city?: string | null; p_viewer_country?: string | null };
        Returns: Json;
      };
      fn_client_portal_project: { Args: { p_project_id: string }; Returns: Json };
      fn_client_portal_projects: { Args: { p_client_id: string }; Returns: Json };
      fn_client_dashboard_delivery: { Args: { p_project_id: string }; Returns: Json };
      fn_client_dashboard_hypercare: { Args: { p_client_id: string }; Returns: Json };
      fn_client_dashboard_product: { Args: Record<string, never>; Returns: Json };
      fn_publish_client_view: { Args: { p_project_id: string; p_published_by: string }; Returns: Json };
      fn_public_submit_client_submission: {
        Args: {
          p_token: string;
          p_kind: ClientSubmissionKind;
          p_title: string;
          p_description: string;
          p_category?: string | null;
          p_severity?: string | null;
          p_priority?: string | null;
          p_business_impact?: string | null;
        };
        Returns: Json;
      };
      fn_publish_hypercare_report: {
        Args: { p_client_id: string; p_period_start: string; p_period_end: string; p_published_by: string; p_token: string };
        Returns: Json;
      };
      fn_public_hypercare_report_view: { Args: { p_token: string }; Returns: Json };
      fn_preview_hypercare_report: { Args: { p_client_id: string; p_period_start: string; p_period_end: string }; Returns: Json };
      fn_public_submit_hypercare_submission: {
        Args: {
          p_token: string;
          p_kind: ClientSubmissionKind;
          p_title: string;
          p_description: string;
          p_category?: string | null;
          p_severity?: string | null;
          p_priority?: string | null;
          p_business_impact?: string | null;
        };
        Returns: Json;
      };
      fn_release_readiness_pct: { Args: { p_release_id: string }; Returns: number };
      fn_log_activity: {
        Args: {
          p_workspace_id: string;
          p_actor_person_id: string | null;
          p_space: SpaceKind | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string;
          p_summary: string;
          p_metadata?: Json;
        };
        Returns: void;
      };
      fn_notify_workspace: {
        Args: {
          p_workspace_id: string;
          p_kind: string;
          p_title: string;
          p_body?: string | null;
          p_related_url?: string | null;
          p_actor_label?: string | null;
          p_exclude_person_id?: string | null;
        };
        Returns: void;
      };
    };
    Enums: {
      space_kind: SpaceKind;
      person_kind: PersonKind;
      workspace_role: WorkspaceRole;
      project_status: ProjectStatus;
      health_status: HealthStatus;
      task_status: TaskStatus;
      gate_status: GateStatus;
      condition_status: ConditionStatus;
      condition_owner: ConditionOwner;
      baseline_status: BaselineStatus;
      change_request_status: ChangeRequestStatus;
      document_visibility: DocumentVisibility;
      client_update_status: ClientUpdateStatus;
      share_link_status: ShareLinkStatus;
      roadmap_item_kind: RoadmapItemKind;
      roadmap_item_status: RoadmapItemStatus;
      release_status: ReleaseStatus;
      service_health: ServiceHealth;
      incident_severity: IncidentSeverity;
      incident_status: IncidentStatus;
      support_request_status: SupportRequestStatus;
      escalation_status: EscalationStatus;
      client_action_kind: ClientActionKind;
      client_action_status: ClientActionStatus;
      project_member_role: ProjectMemberRole;
      dashboard_space: DashboardSpace;
      dashboard_block_type: DashboardBlockType;
    };
  };
}
