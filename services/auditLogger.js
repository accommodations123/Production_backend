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
      actor_user_id: actor.user_id || null,
      actor_host_id: actor.host_id || null,
      actor_admin_id: actor.admin_id || null,

      // 🎯 WHAT WAS TOUCHED
      target_type: target.type || null,
      target_id: target.id || null,

      severity,

      // 🌐 REQUEST CONTEXT
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],

      metadata
    });
  } catch (err) {
    console.error("AUDIT_LOG_FAILED:", err.message);
  }
}
