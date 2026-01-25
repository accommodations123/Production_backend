"use client"
import React, { useState } from "react"
import {
    Home, User, Lock, Shield, Bell, LifeBuoy, Settings as SettingsIcon, Search,
    Menu, ChevronRight, MoreVertical, Box, LayoutDashboard, Briefcase, Heart, LogOut,
    Calendar, CreditCard, X
} from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar({ activeId, onSelect, userRole = "guest", isOpen = true, onClose }) {
    const [isExpanded, setIsExpanded] = useState(true)

    const defaultItems = [
        { id: "overview", label: "Profile Overview", icon: LayoutDashboard },
        { id: "personal", label: "Personal Info", icon: User },
        { id: "listings", label: "My Listings", icon: Home, role: "host" },
        { id: "applications", label: "My Applications", icon: Briefcase },
        { id: "trips", label: "Trips & Bookings", icon: Briefcase, role: "guest" },
        { id: "wishlist", label: "Wishlist", icon: Heart, role: "guest" },
        { id: "notifications", label: "Notifications", icon: Bell, badge: 12 },
    ]

    const bottomItems = [
        { id: "support", label: "Support", icon: LifeBuoy },
        { id: "settings", label: "Settings", icon: SettingsIcon },
        { id: "logout", label: "Logout", icon: LogOut, className: "text-red-400 hover:text-red-500 hover:bg-red-500/10" },
    ]

    // Determine if the user is a host based on role string
    const isHost = userRole?.toLowerCase().includes("host")

    const filteredItems = defaultItems.filter(item => {
        // Show all items for now as requested by the user previously
        return true;
    })

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    "fixed lg:sticky top-0 lg:top-[80px] h-screen lg:h-[calc(100vh-80px)] bg-primary border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out z-[70] text-white",
                    isExpanded ? "w-64" : "w-20",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header with expand toggle */}
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    {isExpanded ? (
                        <div className="flex items-center gap-2 pl-1">
                            <Box className="w-8 h-8 text-accent shrink-0" />
                            <span className="font-bold text-lg text-white">Account Hub</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <Box className="w-8 h-8 text-accent shrink-0" />
                        </div>
                    )}

                    {/* Expand Toggle - Desktop Only */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all hidden lg:block"
                    >
                        <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-180")} />
                    </button>

                    {/* Close button - Mobile only */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white transition-all lg:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    {filteredItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeId === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onSelect(item.id)
                                    if (window.innerWidth < 1024) onClose()
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                                    isActive
                                        ? "bg-white/10 text-white"
                                        : "hover:bg-white/10 text-white/50 hover:text-white",
                                    !isExpanded && "justify-center",
                                    item.className
                                )}
                            >
                                <Icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-accent" : "text-white/30 group-hover:text-white"
                                )} />

                                {isExpanded && (
                                    <div className="flex-1 flex items-center justify-between overflow-hidden">
                                        <span className="font-semibold whitespace-nowrap text-sm">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-accent/20 text-accent text-[10px] font-bold">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Tooltip for collapsed mode */}
                                {!isExpanded && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-white text-primary text-xs font-bold rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom Navigation */}
                <div className="p-3 border-t border-white/5 space-y-1.5">
                    {bottomItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeId === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onSelect(item.id)
                                    if (window.innerWidth < 1024) onClose()
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                                    isActive
                                        ? "bg-white/10 text-white"
                                        : "hover:bg-white/10 text-white/50 hover:text-white",
                                    !isExpanded && "justify-center",
                                    item.className
                                )}
                            >
                                <Icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-accent" : "text-white/30 group-hover:text-white"
                                )} />
                                {isExpanded && (
                                    <span className="font-semibold whitespace-nowrap text-sm">{item.label}</span>
                                )}

                                {!isExpanded && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-white text-primary text-xs font-bold rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </aside>
        </>
    )
}
