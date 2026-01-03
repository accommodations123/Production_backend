import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../../model/User.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/* 1️⃣ Redirect user to Google */
export const googleLogin = (req, res) => {
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}` +
    "&response_type=code" +
    "&scope=openid%20email%20profile";

  res.redirect(url);
};

/* 2️⃣ Google callback */
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Authorization code missing" });
    }

    /* Exchange code for access token */
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code
    });

    const { access_token } = tokenRes.data;

    /* Fetch Google user profile */
    const profileRes = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const {
      id: googleId,
      email,
      name,
      picture
    } = profileRes.data;

    if (!email) {
      return res.status(400).json({
        message: "Google account has no email"
      });
    }

    /* Find or create user */
    let user = await User.findOne({
      where: { email }
    });

    if (!user) {
      user = await User.create({
        email,
        google_id: googleId,
        name,          // if column exists
        profile_image: picture // if column exists
      });
    }

    /* Issue your own JWT */
    const token = jwt.sign(
      {
        id: user.id,
        role: "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* Redirect or respond */
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email,
        name
      }
    });

  } catch (err) {
    console.error("GOOGLE AUTH ERROR:", err.response?.data || err);
    return res.status(500).json({
      message: "Google authentication failed"
    });
  }
};
