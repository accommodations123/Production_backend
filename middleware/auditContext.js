export const auditContext = (actorType = "system") => {
  return (req, res, next) => {
    if (actorType === "user" && req.user) {
      req.auditActor = {
        id: req.user.id,
        role: "user"
      };
    } else if (actorType === "admin" && req.admin) {
      req.auditActor = {
        id: req.admin.id,
        role: "admin"
      };
    } else {
      req.auditActor = {
        role: "system"
      };
    }

    next();
  };
};
