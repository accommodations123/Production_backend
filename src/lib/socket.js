// import { io } from "socket.io-client";

// export const socket = io(import.meta.env.VITE_SOCKET_URL, {
//     withCredentials: true,
//     transports: ["polling", "websocket"],
//     reconnectionAttempts: 10,
//     reconnectionDelay: 2000,
//     timeout: 20000,
//     autoConnect: false, // 🔥 important
// });


import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        // In Development, force use of '/' so Vite proxy handles headers (Host/Origin)
        // In Production, connect through FRONTEND domain (nginx has WebSocket config there)
        const socketUrl = import.meta.env.DEV
            ? "/"
            : (import.meta.env.VITE_SOCKET_URL || "https://accomodation.test.nextkinlife.live");

        socket = io(socketUrl, {
            withCredentials: true,  // Browser will send cookies automatically
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });

        // Explicitly connect
        socket.connect();
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
