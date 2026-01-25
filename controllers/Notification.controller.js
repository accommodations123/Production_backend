import Notification from "../model/Notification.js";

/* ======================================================
   GET MY NOTIFICATIONS
====================================================== */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [["created_at", "DESC"]],
      limit: 50
    });

    return res.json({
      success: true,
      notifications
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   MARK SINGLE NOTIFICATION AS READ
====================================================== */
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.is_read = true;
    await notification.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   MARK ALL AS READ
====================================================== */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("MARK ALL READ ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
