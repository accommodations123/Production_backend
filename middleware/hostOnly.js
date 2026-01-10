import Host from "../model/Host.js";

export const hostOnly = async (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const host = await Host.findOne({
    where: {
      user_id: req.user.id,
      status: "approved"
    }
  });

  if (!host) {
    return res.status(403).json({
      success: false,
      message: "Host access denied"
    });
  }

  req.host = host;
  next();
};
