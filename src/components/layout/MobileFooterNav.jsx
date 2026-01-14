import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, Plane, ShoppingBag, Search } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

export function MobileFooterNav() {
    const location = useLocation();

    // Define navigation items with consistent sizing
    const navItems = [
        { name: "Home", path: "/", icon: Home },
        { name: "Stays", path: "/search", icon: Search },
        { name: "Groups", path: "/groups", icon: Users },
        { name: "Travel", path: "/resources/travel", icon: Plane },
        { name: "Shop", path: "/marketplace", icon: ShoppingBag },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Gradient Fade up */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

            <div className="bg-white/90 backdrop-blur-xl border-t border-white/20 pb-safe shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="grid grid-cols-5 items-end px-1 pt-2 pb-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={cn(
                                    "relative flex flex-col items-center gap-1 p-2 transition-all duration-300",
                                    isActive ? "text-[#CB2A25] -translate-y-1" : "text-[#00142E]/50 hover:text-[#00142E]/80"
                                )}
                            >
                                {/* Active Indicator Background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute inset-0 bg-[#CB2A25]/5 rounded-xl -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}

                                <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                                <span className="text-[10px] font-bold tracking-tight">{item.name}</span>

                                {/* Active Dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-dot"
                                        className="absolute -top-1 w-1 h-1 bg-[#CB2A25] rounded-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
