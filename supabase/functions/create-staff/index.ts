// create-staff: admin-only creation of staff accounts (SPEC 8).
// The service-role key comes from the function environment only.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SPEC 2: same rule as src/lib/passwordRule.js
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
const PASSWORD_MESSAGE =
  "Password must be at least 9 characters and include an uppercase letter, a lowercase letter and a special character.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, code: string, message: string, field?: string) {
  return json(status, { error: { code, message, ...(field ? { field } : {}) } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "method_not_allowed", "Use POST.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return fail(500, "server_misconfigured", "Function environment is not configured.");
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Verify the caller's JWT.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "unauthorized", "Missing Authorization bearer token.");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return fail(401, "unauthorized", "Invalid or expired token.");

  // 2. Caller must be an active admin.
  const { data: caller, error: callerError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (callerError) return fail(500, "internal_error", "Could not load caller profile.");
  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return fail(403, "forbidden", "Only an admin can create staff accounts.");
  }

  // 3. Validate input.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid_input", "Body must be JSON.");
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_REGEX.test(email)) return fail(400, "invalid_email", "Enter a valid email address.", "email");
  if (!fullName) return fail(400, "invalid_input", "Full name is required.", "full_name");
  if (!PASSWORD_REGEX.test(password)) return fail(400, "weak_password", PASSWORD_MESSAGE, "password");

  // 4. Create the auth user (email confirmed). The signup trigger creates the profile
  //    and a customers row; staff must not keep a customers row (removed in step 5).
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    const code = (createError as { code?: string } | null)?.code;
    if (code === "email_exists" || /already|registered|exists/i.test(createError?.message ?? "")) {
      return fail(409, "duplicate_email", "A user with this email already exists.", "email");
    }
    if (code === "weak_password") return fail(400, "weak_password", PASSWORD_MESSAGE, "password");
    return fail(500, "internal_error", createError?.message ?? "Could not create user.");
  }

  // 5. Promote the profile (created by the trigger as customer) to staff.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "staff", full_name: fullName })
    .eq("id", created.user.id);
  if (roleError) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back
    return fail(500, "internal_error", "Could not assign the staff role.");
  }

  // Staff are not customers. If the trigger created a customers row for them, delete it;
  // if it linked a customer that already existed, unlink it instead of deleting data.
  if (existingCustomer) {
    await admin.from("customers").update({ user_id: null }).eq("user_id", created.user.id);
  } else {
    await admin.from("customers").delete().eq("user_id", created.user.id);
  }

  return json(201, {
    user: { id: created.user.id, email, full_name: fullName, role: "staff" },
  });
});
