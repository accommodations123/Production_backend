/**
 * Role-based access middleware.
 * Must be used AFTER adminAuth middleware.
 *
 * Usage:
 *   router.get("/admin/something", adminAuth, requireRole("super_admin", "admin"), handler)
 *   router.get("/admin/careers", adminAuth, requireRole("super_admin", "admin", "recruiter"), handler)
 */
export default function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const adminRole = req.admin.role || "admin";

        if (!allowedRoles.includes(adminRole)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
            });
        }

        next();
    };
}
