import AuditLog from "../model/AuditLog.js";

export async function logAudit({
  action,
  actor = {},
  target = {},
  severity = "LOW",
  req,
  metadata = {}
}) {
  try {
    await AuditLog.create({
      action,

      // 🔐 WHO DID IT
      actor_user_id: actor.user_id || undefined,
      actor_host_id: actor.host_id || undefined,
      actor_admin_id: actor.admin_id || undefined,

      // 🎯 WHAT WAS TOUCHED
      target_type: target.type || undefined,
      target_id: target.id || undefined,

      severity,

      // 🌐 REQUEST CONTEXT
      ip_address: req?.ip || undefined,
      user_agent: req?.headers?.["user-agent"] || undefined,

      metadata
    });
  } catch (err) {
    console.error("AUDIT_LOG_FAILED:", err.message);
  }
}
