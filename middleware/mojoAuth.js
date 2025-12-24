import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const auth = Buffer.from(
  `${process.env.MOJOAUTH_API_KEY}:${process.env.MOJOAUTH_API_SECRET}`
).toString("base64");

const mojoAuth = axios.create({
  baseURL: "https://api.mojoauth.com",
  headers: {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json"
  }
});

export default mojoAuth;
