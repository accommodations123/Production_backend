import Notification from "../model/Notification.js";

/* ======================================================
   GET MY NOTIFICATIONS
====================================================== */
export const getMyNotifications = async (req, res) => {
  try {
    // Query by user_id GSI
    let notifications = await Notification.query("user_id").eq(req.user.id).exec();

    // Client-side sort by created_at DESC + limit 50
    notifications = notifications
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

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
    const notification = await Notification.get(req.params.id);

    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await Notification.update({ id: notification.id }, { is_read: true });

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
    // Get all unread notifications for this user
    const notifications = await Notification.query("user_id").eq(req.user.id).exec();
    const unread = notifications.filter(n => !n.is_read);

    // Batch update
    await Promise.all(
      unread.map(n => Notification.update({ id: n.id }, { is_read: true }))
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("MARK ALL READ ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.get(req.params.id);

    if (!notification || notification.user_id !== req.user.id || notification.is_deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await Notification.update({ id: notification.id }, { is_deleted: true });

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE NOTIFICATION ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.query("user_id").eq(req.user.id).exec();
    const active = notifications.filter(n => !n.is_deleted);

    await Promise.all(
      active.map(n => Notification.update({ id: n.id }, { is_deleted: true }))
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE ALL NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
