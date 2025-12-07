import Host from '../model/Host.js';
import User from '../model/User.js';

// Save host details
export const saveHost = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const phoneFromLogin = user.phone;
    const emailFromLogin = user.email;

    const phone = phoneFromLogin || req.body.phone;
    const email = emailFromLogin || req.body.email;

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
      full_name: req.body.fullName,
      country: req.body.country,
      city: req.body.city,
      address: req.body.address,
      id_type: req.body.idType,
      id_number: req.body.idNumber,
      id_photo: req.body.idPhoto,
      selfie_photo: req.body.selfiePhoto
    });

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

// Get the saved details for logged-in user
export const getMyHost = async (req, res) => {
  try {
    const userId = req.user.id;

    const data = await Host.findOne({
      where: { user_id: userId }
    });

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.log("Get verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};
