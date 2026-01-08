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

let socket;

export const getSocket = () => {
    if (!socket) {
        const socketUrl = import.meta.env.PROD
            ? "https://accomodation.api.test.nextkinlife.live"
            : "/";
        socket = io(socketUrl, {
            withCredentials: true,

            // 🔒 CRITICAL: disable polling completely
            transports: ["websocket"],

            // 🔒 prevent race conditions
            autoConnect: false,

            // stability tuning
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });
    }

    return socket;
};
