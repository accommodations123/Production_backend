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
        // In Production, use the full URL from env or fallback
        const socketUrl = import.meta.env.DEV
            ? "/"
            : (import.meta.env.VITE_SOCKET_URL || "https://accomodation.test.nextkinlife.live");
        socket = io(socketUrl, {
            withCredentials: true,
            auth: {
                token: typeof document !== "undefined"
                    ? document.cookie
                        .split("; ")
                        .find((c) => c.startsWith("access_token="))
                        ?.split("=")[1]
                    : null
            },
            // 🔒 polling fails on Prod due to missing sticky sessions. Force websocket.
            transports: ["websocket", "polling"],

            // Allow auto-connect for singleton pattern
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
