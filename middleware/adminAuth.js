import jwt from "jsonwebtoken";
import Admin from "../model/Admin.js";

export default async function adminAuth(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    req.admin = admin;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
}
