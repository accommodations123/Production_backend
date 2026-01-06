import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["https://accomodation.test.nextkinlife.live"] , // ⚠️ NOT *
      credentials: true
    }
  });

  // 🔐 Authenticate socket using cookies
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("No cookies sent"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.access_token; // 👈 cookie name

      if (!token) {
        return next(new Error("Auth token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = {
        id: decoded.id,
        role: decoded.role
      };

      return next();
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id, "User:", socket.user.id);

    // ✅ auto-join user room securely
    socket.join(`user:${socket.user.id}`);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
