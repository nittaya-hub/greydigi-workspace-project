#!/usr/bin/env node
// One-off bootstrap: creates (or upgrades) a login with a given role.
// Run from web/:
//   node scripts/create-admin.mjs --email you@example.com --password "..." --name "Your Name" [--role workspace_admin] [--kind internal] [--client "Acme Co"]
//
// --role   one of: workspace_admin, delivery_lead, product_lead,
//          hypercare_lead, member, client (default: workspace_admin)
// --kind   internal | client (default: internal; forced to client if
//          --role client is used)
// --client only relevant for kind=client — the client's name. Finds an
//          existing client with that name in the workspace, or creates
//          one, and grants this person a client_roles row on it.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — reads
// them from .env.local if present, otherwise from the environment.
// Safe to re-run: it reuses an existing auth user / people row for the
// same email instead of erroring.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // no .env.local — fall back to whatever is already in the environment
  }
}

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const VALID_ROLES = ["workspace_admin", "delivery_lead", "product_lead", "hypercare_lead", "member", "client"];

async function main() {
  loadEnvLocal();
  const { email, password, name, client: clientName } = parseArgs();
  const role = parseArgs().role || "workspace_admin";
  const kind = role === "client" ? "client" : parseArgs().kind || "internal";

  if (!email || !password) {
    console.error(
      'Usage: node scripts/create-admin.mjs --email you@example.com --password "S0mething!" --name "Your Name" [--role workspace_admin] [--kind internal] [--client "Acme Co"]'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`--role must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }
  if (kind === "client" && !clientName) {
    console.error("kind=client needs --client \"Client Name\" so the person can be linked to a client.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked .env.local and the environment).");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Find or create the workspace.
  let { data: workspace } = await supabase.from("workspaces").select("id, name").limit(1).maybeSingle();
  if (!workspace) {
    const { data: created, error } = await supabase
      .from("workspaces")
      .insert({ name: "greydigi", slug: "greydigi" })
      .select("id, name")
      .single();
    if (error) throw error;
    workspace = created;
    console.log(`Created workspace "${created.name}".`);
  } else {
    console.log(`Using existing workspace "${workspace.name}".`);
  }

  // 2. Find or create the auth user for this email.
  let authUserId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    authUserId = created.user.id;
    console.log(`Created auth user ${email}.`);
  } else if (createError?.message?.toLowerCase().includes("already been registered") || createError?.message?.toLowerCase().includes("already registered")) {
    // Already exists — reuse it, and reset the password to the one given.
    const { data: page, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const existing = page.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw new Error(`createUser said "${email}" is already registered, but it wasn't found in listUsers.`);
    authUserId = existing.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, { password, email_confirm: true });
    if (updateError) throw updateError;
    console.log(`Auth user ${email} already existed — reset its password.`);
  } else if (createError) {
    throw createError;
  }

  // 3. Find or create the matching `people` row as workspace_admin.
  const { data: existingPerson } = await supabase
    .from("people")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("email", email)
    .maybeSingle();

  const fullName = name || email.split("@")[0];
  const initials = fullName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  let personId;
  if (existingPerson) {
    const { error } = await supabase
      .from("people")
      .update({ auth_user_id: authUserId, workspace_role: role, kind })
      .eq("id", existingPerson.id);
    if (error) throw error;
    personId = existingPerson.id;
    console.log(`Updated existing people row for ${email} to ${role} (${kind}).`);
  } else {
    const { data: personCreated, error } = await supabase
      .from("people")
      .insert({
        workspace_id: workspace.id,
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        kind,
        avatar_initials: initials || "AD",
        workspace_role: role,
      })
      .select("id")
      .single();
    if (error) throw error;
    personId = personCreated.id;
    console.log(`Created people row for ${email} as ${role} (${kind}).`);
  }

  // 4. For client-kind people, find or create the client and grant access.
  if (kind === "client") {
    let { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .eq("name", clientName)
      .maybeSingle();
    if (!client) {
      const { data: clientCreated, error } = await supabase
        .from("clients")
        .insert({ workspace_id: workspace.id, name: clientName })
        .select("id, name")
        .single();
      if (error) throw error;
      client = clientCreated;
      console.log(`Created client "${client.name}".`);
    }

    const { data: existingGrant } = await supabase
      .from("client_roles")
      .select("id")
      .eq("person_id", personId)
      .eq("client_id", client.id)
      .maybeSingle();
    if (!existingGrant) {
      const { error } = await supabase.from("client_roles").insert({ person_id: personId, client_id: client.id });
      if (error) throw error;
      console.log(`Granted ${email} portal access to "${client.name}".`);
    } else {
      console.log(`${email} already has portal access to "${client.name}".`);
    }
  }

  console.log("\nDone. Sign in at /auth/sign-in with:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
});
