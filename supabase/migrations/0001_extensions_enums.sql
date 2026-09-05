-- greydigi workspace — core extensions and enum types.
-- One workspace runs three spaces (Delivery, Product, Hypercare) over a
-- shared domain (Client, Person, Project, Document). See
-- project/uploads/01_Greydigi_Workspace_Architecture_V1_EN.txt section 13.

create extension if not exists pgcrypto;

create type space_kind as enum ('delivery', 'product', 'hypercare');

create type person_kind as enum ('internal', 'client');

-- Workspace-wide role. Space- and client-scoped grants are layered on top
-- via space_roles / client_roles, not folded into this single column.
create type workspace_role as enum (
  'workspace_admin',
  'delivery_lead',
  'product_lead',
  'hypercare_lead',
  'member',
  'client'
);

create type project_status as enum ('active', 'archived');

-- Derived, never typed by hand (architecture doc section 7 / rule "Do not
-- calculate the same business metric differently on different pages").
create type health_status as enum ('on_plan', 'watch', 'blocked');

create type task_status as enum (
  'idle',
  'in_progress',
  'waiting_on_client',
  'blocked',
  'watch',
  'done'
);

create type gate_status as enum ('on_plan', 'held', 'cleared');

create type condition_status as enum ('open', 'met', 'waived');

create type condition_owner as enum ('team', 'client');

create type baseline_status as enum ('draft', 'approved', 'superseded');

create type change_request_status as enum (
  'draft',
  'raised',
  'awaiting_signature',
  'approved',
  'rejected'
);

create type document_visibility as enum ('internal', 'client_visible');

create type client_update_status as enum ('draft', 'published');

create type share_link_status as enum ('active', 'revoked', 'expired');

create type roadmap_item_kind as enum ('epic', 'feature');

create type roadmap_item_status as enum (
  'forecast',
  'committed',
  'in_progress',
  'done'
);

create type release_status as enum (
  'planning',
  'in_progress',
  'ready',
  'shipped'
);

create type service_health as enum ('healthy', 'watch', 'at_risk');

create type incident_severity as enum ('sev1', 'sev2', 'sev3');

create type incident_status as enum ('open', 'investigating', 'resolved');

create type support_request_status as enum ('open', 'in_progress', 'done');

create type escalation_status as enum ('open', 'resolved');

create type client_action_kind as enum (
  'review',
  'approval',
  'provide_information',
  'upload_document',
  'confirm_decision',
  'sign_artefact'
);

create type client_action_status as enum (
  'pending',
  'in_progress',
  'completed',
  'overdue'
);
