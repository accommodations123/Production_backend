import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

let io;

/* =========================================================
   INITIALIZE SOCKET.IO
========================================================= */
export const initSocket = async (httpServer) => {
  const allowedOrigins = [
    "https://accomodation.api.test.nextkinlife.live",
    "https://accomodation.test.nextkinlife.live",
    "https://accomodation.admin.test.nextkinlife.live",
    "https://admin.test.nextkinlife.live",
    "http://localhost:5173",
    "http://localhost:5000"
  ];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    },

    // ✅ Production-safe transport strategy
    transports: ["websocket", "polling"],
    upgrade: true,

    // Avoid long-hanging dead connections
    pingInterval: 25000,
    pingTimeout: 20000
  });

  /* =========================================================
     REDIS ADAPTER (HORIZONTAL SCALING)
  ========================================================= */
  const pubClient = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
  });

  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) =>
    console.error("❌ Redis pub error:", err)
  );
  subClient.on("error", (err) =>
    console.error("❌ Redis sub error:", err)
  );

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  console.log("✅ Socket.IO Redis adapter connected");

  /* =========================================================
     SOCKET AUTH MIDDLEWARE
  ========================================================= */
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // 🔐 Cookie fallback (browser clients)
      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies.access_token;
      }

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔒 Hard role validation
      if (!["user", "admin"].includes(decoded.role)) {
        return next(new Error("Invalid role"));
      }

      socket.user = {
        id: decoded.id,
        role: decoded.role
      };

      next();
    } catch (err) {
      console.error("❌ Socket auth error:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  /* =========================================================
     CONNECTION HANDLER
  ========================================================= */
  io.on("connection", (socket) => {
    const userId = socket.user?.id;

    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);

      console.log(
        `📡 Socket connected | user:${userId} | socket:${socket.id}`
      );
    }

    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Socket disconnected | socket:${socket.id} | reason:${reason}`
      );
    });
  });

  return io;
};

/* =========================================================
   SAFE ACCESSOR
========================================================= */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
