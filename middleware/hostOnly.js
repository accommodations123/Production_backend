import Host from "../model/Host.js";

export const hostOnly = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const host = await Host.findOne({
      where: {
        user_id: req.user.id,
        status: "approved"
      },
      attributes: ["id", "user_id"] // 🔥 keep light
    });

    if (!host) {
      return res.status(403).json({
        success: false,
        message: "Host access denied"
      });
    }

    req.host = host;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
