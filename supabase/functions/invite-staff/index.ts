// ==============================================================================
// Supabase Edge Function: invite-staff
// Description: Securely invites a staff member using Admin API
// Requirements:
// 1. Verifies caller JWT.
// 2. Checks caller has admin role.
// 3. Invites user using Supabase Admin API.
// 4. Assigns staff role in profiles.
// 5. Handles cleanup/rollback if inconsistent.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify Caller JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client with caller's JWT to authenticate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userAuthError } = await userClient.auth.getUser();
    if (userAuthError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin Client with Service Role Key for elevated operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Verify Admin Role of Caller
    const { data: callerProfile, error: profileCheckError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileCheckError || callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only administrators can invite staff members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse & Validate Payload
    const body = await req.json();
    const { email, full_name, redirectTo } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "A valid email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Full name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = full_name.trim();

    // 5. Send Invite via Supabase Admin API
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      trimmedEmail,
      {
        data: {
          full_name: trimmedName,
          role: "staff",
        },
        redirectTo: redirectTo || undefined,
      }
    );

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message || "Failed to invite user via Auth Admin API" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = inviteData.user?.id;
    if (!newUserId) {
      return new Response(
        JSON.stringify({ error: "Failed to obtain invited user ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Ensure Profile is Created/Updated with role = 'staff'
    const { error: profileUpsertError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        email: trimmedEmail,
        full_name: trimmedName,
        role: "staff",
        updated_at: new Date().toISOString(),
      });

    // Handle failure without leaving inconsistent accounts
    if (profileUpsertError) {
      // Rollback: remove created user from auth.users
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({
          error: `Failed to set staff profile (${profileUpsertError.message}). User account rolled back.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({
        message: `Staff invitation sent successfully to ${trimmedEmail}`,
        user: {
          id: newUserId,
          email: trimmedEmail,
          full_name: trimmedName,
          role: "staff",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
