import AuditLog from "../model/AuditLog.js";

export async function logAudit({
  action,
  actor,
  target,
  severity = "LOW",
  req,
  metadata = {}
}) {
  try {
    await AuditLog.create({
      action,                             // ✅ REQUIRED
      actor_id: actor?.id || null,
      actor_role: actor?.role || "system",
      target_type: target?.type || null,
      target_id: target?.id || null,
      severity,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      metadata
    });
  } catch (err) {
    console.error("AUDIT_LOG_FAILED:", err.message);
  }
}
