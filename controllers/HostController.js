import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// Save host details
export const saveHost = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const phone = user.phone || req.body.phone;
    const email = user.email || req.body.email;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Phone and email are required."
      });
    }

    const data = await Host.create({
      user_id: userId,
      email,
      phone,

      full_name: req.body.full_name,
      country: req.body.country,
      city: req.body.city,
      address: req.body.address,
      id_type: req.body.id_type,
      id_number: req.body.id_number,

      id_photo: req.files?.idPhoto ? req.files.idPhoto[0].location : null,
      selfie_photo: req.files?.selfiePhoto ? req.files.selfiePhoto[0].location : null
    });

    // Invalidate caches
    await deleteCache(`host:${userId}`);
    await deleteCache("pending_hosts");

    return res.status(201).json({
      success: true,
      message: "Details saved successfully.",
      data
    });

  } catch (error) {
    console.log("Host error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};

// Get host data for logged-in user
export const getMyHost = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check Redis cache
    const cached = await getCache(`host:${userId}`);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const data = await Host.findOne({
      where: { user_id: userId }
    });

    // Save to cache
    await setCache(`host:${userId}`, data, 300);

    return res.status(200).json({ success: true, data });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};

// get pending hosts (admin)
export const getPendingHosts = async (req, res) => {
  try {
    // Check cache
    const cached = await getCache("pending_hosts");
    if (cached) {
      return res.json({ success: true, hosts: cached });
    }

    const hosts = await Host.findAll({
      where: { status: "pending" },
      include: [{ model: User }]
    });

    // Cache results
    await setCache("pending_hosts", hosts, 300);

    return res.json({ success: true, hosts });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// approve host
export const approveHost = async (req, res) => {
  try {
    const host = await Host.findByPk(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    host.status = "approved";
    host.rejection_reason = "";
    await host.save();

    // Clear caches
    await deleteCache(`host:${host.user_id}`);
    await deleteCache("pending_hosts");

    return res.json({ success: true, message: "Host approved" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// reject host
export const rejectHost = async (req, res) => {
  try {
    const host = await Host.findByPk(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    host.status = "rejected";
    host.rejection_reason = req.body.reason || "";
    await host.save();

    // Clear caches
    await deleteCache(`host:${host.user_id}`);
    await deleteCache("pending_hosts");

    return res.json({
      success: true,
      message: "Host rejected"
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
