import Host from "../model/Host.js";

export const hostOnly = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const host = await Host.findOne({
      where: { user_id: req.user.id },
      attributes: ["id", "user_id", "status"]
    });

    if (!host) {
      return res.status(403).json({
        message: "You are not registered as a host"
      });
    }

    if (host.status !== "approved") {
      return res.status(403).json({
        message: "Host approval pending"
      });
    }

    req.host = host;
    next();
  } catch (err) {
    console.error("HOST ONLY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
