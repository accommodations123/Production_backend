import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { getCache, setCache } from "../services/cacheService.js";

export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const cachekeyEmail = `adminEmail:${email}`
    const existingCached = await getCache(cachekeyEmail)
    if (existingCached) {
      return res.status(400).json({message:"Email already exists"})
    }

    const exists = await Admin.findOne({ where: { email }});
    if (exists) {
      //write to cache for later lookups
      await setCache(cachekeyEmail, true,300)
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPass
    });

    await setCache(`admin:${admin.id}`,admin, 300)
    await setCache(cachekeyEmail, true, 300)

    res.json({
      message: 'Admin registered successfully',
      admin
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cachekeyEmail = `adminEmail:${email}`
    let admin = await getCache(cachekeyEmail)
    if (!admin) {
      admin = await Admin.findOne({ where: {email}})
    }
    if (admin) {
      await setCache(cachekeyEmail,admin, 300)
      await setCache(`admin:${admin.id}`, admin,300)
    }
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    const checkPass = await bcrypt.compare(password, admin.password);
    if (!checkPass) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
