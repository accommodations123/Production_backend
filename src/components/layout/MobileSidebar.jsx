import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    X, User, ShoppingBag, HelpCircle, Settings, Bell, MessageSquare, LogOut, Plane, Heart, ChevronRight, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetMeQuery, useLogoutMutation, authApi } from "@/store/api/authApi";
import { useDispatch } from "react-redux";
import { hostApi } from "@/store/api/hostApi";
import { cn } from "@/lib/utils";

export function MobileSidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { data: userData } = useGetMeQuery();
    const [logout] = useLogoutMutation();

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(authApi.util.resetApiState());
            dispatch(hostApi.util.resetApiState());
            onClose();
            navigate("/signin");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    const menuSections = [
        {
            title: "Account",
            items: [
                { icon: User, label: "Profile", path: "/account-v2" },
                { icon: ShoppingBag, label: "My Listings", path: "/host/dashboard" },
                { icon: Heart, label: "Wishlist", path: "/wishlist" },
                { icon: Plane, label: "My Trips", path: "/trips" },
            ]
        },
        {
            title: "Support & Settings",
            items: [
                { icon: Bell, label: "Notifications", path: "/notifications" },
                { icon: MessageSquare, label: "Messages", path: "/chat" },
                { icon: Settings, label: "Settings", path: "/account/settings" },
                { icon: HelpCircle, label: "Help Center", path: "/support" },
            ]
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                    />

                    {/* Sidebar Drawer */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white z-50 overflow-y-auto shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-[#00142E] p-6 text-white pt-12 relative overflow-hidden">
                            {/* Decorative blob */}
                            <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-[#CB2A25]/20 rounded-full blur-[60px]" />

                            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                <X className="w-5 h-5 text-white" />
                            </button>

                            <div className="relative z-10 mt-4">
                                {userData ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full border-2 border-white/30 overflow-hidden bg-[#CB2A25]">
                                            {userData?.profile_image ? (
                                                <img src={userData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center font-bold text-white text-xl">
                                                    {userData?.name?.charAt(0) || "U"}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">{userData?.name || "Welcome Back"}</h2>
                                            <p className="text-white/60 text-sm truncate max-w-[150px]">{userData?.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Link to="/signin" onClick={onClose} className="flex items-center gap-4 group cursor-pointer">
                                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50 border-2 border-dashed border-white/20 group-hover:bg-white group-hover:text-[#CB2A25] transition-all">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">Guest User</h2>
                                            <p className="text-[#CB2A25] font-bold text-sm">Sign In to continue</p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-6 space-y-8">
                            {menuSections.map((section, idx) => (
                                <div key={idx}>
                                    <h3 className="text-xs font-bold text-[#00142E]/40 uppercase tracking-widest mb-4 px-2">{section.title}</h3>
                                    <div className="space-y-1">
                                        {section.items.map((item, i) => (
                                            <Link
                                                key={i}
                                                to={item.path}
                                                onClick={onClose}
                                                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#00142E] group-hover:bg-[#00142E] group-hover:text-white transition-colors">
                                                        <item.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-[#00142E]">{item.label}</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {userData && (
                                <button
                                    onClick={handleLogout}
                                    className="w-full mt-4 p-4 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 text-center">
                            <p className="text-xs text-gray-400">NextKinLife v2.0</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
