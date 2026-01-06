import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// REGISTER ADMIN
export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await Admin.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPass
    });

    // CACHE newly created admin
    await setCache(`admin:${email}`, {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: admin.password
    });

    return res.json({
      message: "Admin registered successfully",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// LOGIN ADMIN
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // CHECK CACHE FIRST
    let admin = await getCache(`admin:${email}`);

    if (!admin) {
      // NOT IN CACHE → get from DB
      admin = await Admin.findOne({ where: { email } });
      if (!admin) {
        return res.status(400).json({ message: "Admin not found" });
      }

      // STORE IN CACHE
      await setCache(`admin:${email}`, {
        id: admin.id,
        email: admin.email,
        password: admin.password,
        role: "admin"
      });
    }

    const checkPass = await bcrypt.compare(password, admin.password);
    if (!checkPass) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    return res.json({
      message: "Admin login successful",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
