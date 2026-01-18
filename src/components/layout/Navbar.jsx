"use client"

import * as React from "react"
import { Menu, Globe, User, ChevronDown, X, Search, Users, Briefcase, Home, Calendar, Building, Plane, BookOpen, ShoppingBag, HomeIcon, Bell, Check, Sparkles, Settings as SettingsIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORIES, COUNTRIES } from "@/lib/mock-data"
import { getHostPath } from "@/lib/navigationUtils"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useCountry } from "@/context/CountryContext"
import { useClickOutside } from "@/hooks/useClickOutside"
import { getSocket, disconnectSocket } from "@/lib/socket"
import { useDispatch, useSelector } from "react-redux"
import { useGetMeQuery, useLogoutMutation, authApi } from "@/store/api/authApi"
import { useGetHostProfileQuery, hostApi } from "@/store/api/hostApi"
import { addNotification, markAllAsRead } from "@/store/slices/notificationSlice"

export function Navbar({ minimal = false, onMenuClick }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const socketRef = React.useRef(null);
    const isSocketInitialized = React.useRef(false);

    const [logout] = useLogoutMutation()
    const [isScrolled, setIsScrolled] = React.useState(false)
    const { activeCountry, setCountry, isSelected } = useCountry()
    const [isCountryOpen, setIsCountryOpen] = React.useState(false)
    const [isProfileOpen, setIsProfileOpen] = React.useState(false)
    const [isHostDropdownOpen, setIsHostDropdownOpen] = React.useState(false)

    // ================= AUTH STATE (BACKEND VERIFIED) =================
    const { data: userData, isLoading: isAuthLoading, isError: isAuthError } = useGetMeQuery()
    const isAuthenticated = !!userData && !isAuthError

    // ================= NOTIFICATION STATE (REDUX) =================
    const notifications = useSelector(state => state.notifications.items)
    const unreadCount = useSelector(state => state.notifications.unreadCount)
    const [isNotificationOpen, setIsNotificationOpen] = React.useState(false)
    const notificationRef = useClickOutside(() => setIsNotificationOpen(false))


    // Fetch host profile if authenticated
    const { data: hostProfile } = useGetHostProfileQuery(undefined, {
        skip: !isAuthenticated,
    })
    const resolvedUser = React.useMemo(() => {
        return {
            ...(userData || {}),
            ...(hostProfile || {}),
            profile_image:
                userData?.profile_image ||
                hostProfile?.profile_image ||
                null
        };
    }, [userData, hostProfile]);

    const displayName = React.useMemo(() => {
        return (
            hostProfile?.full_name ||
            userData?.full_name ||
            userData?.name ||
            userData?.email?.split("@")[0] ||
            "User"
        );
    }, [hostProfile, userData]);


    // Auto-scroll listener
    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // ================= WEBSOCKET LOGIC =================
    React.useEffect(() => {
        if (!isAuthenticated) return;

        const socket = getSocket();
        socketRef.current = socket;

        const onConnect = () => {
            console.log("✅ Connected to Socket.IO Server:", socket.id);
        };

        const onConnectError = (err) => {
            console.error("❌ Socket Connection Error:", err.message);
        };

        const onNotification = (data) => {
            console.log("📩 Received Notification:", data);
            if (data) {
                dispatch(addNotification(data));
            }
        };

        socket.on("connect", onConnect);
        socket.on("connect_error", onConnectError);
        socket.on("notification", onNotification);

        isSocketInitialized.current = true;

        return () => {
            if (socketRef.current) {
                socketRef.current.off("connect", onConnect);
                socketRef.current.off("connect_error", onConnectError);
                socketRef.current.off("notification", onNotification);
                socketRef.current = null;
            }
        };
    }, [isAuthenticated, dispatch]);



    // Helper to mark all as read
    const handleMarkAllAsRead = () => {
        dispatch(markAllAsRead())
    }

    // Mobile State
    const [isMobileCountryOpen, setIsMobileCountryOpen] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const location = useLocation()

    // Define Explore section paths
    const explorePaths = ["/", "/events", "/search"]
    const isExploreActive = explorePaths.includes(location.pathname) || location.pathname.startsWith("/rooms")

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Close mobile menus on route change
    React.useEffect(() => {
        setIsMobileCountryOpen(false)
        setIsHostDropdownOpen(false)
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    // Click Outside Refs
    const countryRef = useClickOutside(() => setIsCountryOpen(false))
    const profileRef = useClickOutside(() => setIsProfileOpen(false))
    const mobileCountryRef = useClickOutside(() => setIsMobileCountryOpen(false))
    const hostDropdownRef = useClickOutside(() => setIsHostDropdownOpen(false))
    const mobileMenuRef = useClickOutside(() => setIsMobileMenuOpen(false))


    // Host options for dropdown
    const hostOptions = [
        {
            id: 'property',
            title: 'Share Your Space',
            description: 'List your property for stays',
            icon: <Home className="h-5 w-5" />,
            path: getHostPath('property', isAuthenticated)
        },
        {
            id: 'event',
            title: 'Host an Event',
            description: 'Organize workshops, meetups or festivals.',
            icon: <Calendar className="h-5 w-5" />,
            path: getHostPath('event', isAuthenticated)
        },
        {
            id: 'group',
            title: 'Start a Group',
            description: 'Build a community of like-minded people.',
            icon: <Users className="h-5 w-5" />,
            path: getHostPath('group', isAuthenticated)
        },
    ]

    // Navigation items
    const navItems = [
        { name: "Home", path: "/" },
        { name: "Accommodations", path: "/search" },
        { name: "Buy/Sell", path: "/marketplace" },
        { name: "Community", path: "/groups" },
        { name: "Events", path: "/events" },
        { name: "Travel Partners", path: "/travel" },
    ]

    // Safely get country code with fallback
    const getCountryCode = () => {
        if (!activeCountry) return "";
        if (activeCountry.code) return activeCountry.code;
        if (activeCountry.country) return activeCountry.country;
        return "";
    };

    return (
        <>
            {/* ================= DESKTOP NAVBAR ================= */}
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-500 hidden md:block",
                    isScrolled
                        ? "bg-[#0A1A2F]/80 backdrop-blur-2xl border-b border-white/5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                        : "bg-gradient-to-b from-[#0A1A2F]/90 to-transparent py-5"
                )}
            >
                <div className="container mx-auto px-6 flex items-center justify-between">
                    {/* Logo - Glass Effect */}
                    <Link to="/" className="flex items-center gap-3 group relative items-center">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-accent/50 transition-all shadow-2xl shadow-black/20">
                            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <img
                                src="/logo.jpeg"
                                alt="NextKinLife Logo"
                                className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700 ease-out"
                            />
                        </div>
                        <div className="hidden lg:block relative">
                            <div className="flex flex-col leading-none">
                                <span className={cn(
                                    "text-white font-bold text-lg tracking-tight transition-all duration-300",
                                    isScrolled ? "text-white" : "text-white drop-shadow-md"
                                )}>NextKin</span>
                                <span className="text-accent font-black text-lg tracking-wide uppercase text-[10px]">Life</span>
                            </div>
                        </div>
                    </Link>

                    {/* Desktop Navigation - Pill Design */}
                    {!minimal && (
                        <nav className="flex items-center gap-1 p-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md shadow-inner shadow-black/20">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={cn(
                                            "relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                            isActive
                                                ? "text-white"
                                                : "text-white/60 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="navbar-pill"
                                                className="absolute inset-0 bg-accent rounded-full shadow-[0_0_20px_rgba(203,42,37,0.3)]"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}

                    {/* Desktop Right Actions */}
                    <div className="flex items-center gap-3">
                        {/* Country Selector */}
                        <div className="relative" ref={countryRef}>
                            <button
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border group",
                                    isCountryOpen
                                        ? "bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        : "bg-transparent border-transparent hover:bg-white/5 text-white/80 hover:text-white"
                                )}
                                onClick={() => setIsCountryOpen(!isCountryOpen)}
                            >
                                {!isSelected ? (
                                    <>
                                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <span className="hidden xl:inline">Select Country</span>
                                    </>
                                ) : (
                                    <>
                                        {activeCountry && activeCountry.flag && (
                                            activeCountry.flag.startsWith('/') ? (
                                                <img src={activeCountry.flag} alt={activeCountry.name} className="w-8 h-6 object-cover rounded-md shadow-md bg-white/10" />
                                            ) : (
                                                <span className="text-2xl filter drop-shadow-sm">{activeCountry.flag}</span>
                                            )
                                        )}
                                    </>
                                )}
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300 opacity-50 group-hover:opacity-100", isCountryOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {isCountryOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full right-0 mt-3 w-72 bg-[#0F2238]/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] py-2 z-50 border border-white/10 overflow-hidden"
                                    >
                                        <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Select Region</p>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto py-2 px-2 scrollbar-hide">
                                            {COUNTRIES.map((country) => (
                                                <button
                                                    key={country.code}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 text-sm rounded-xl flex items-center justify-between transition-all group",
                                                        getCountryCode() === country.code
                                                            ? "bg-accent text-white shadow-lg shadow-accent/20"
                                                            : "text-white/70 hover:bg-white/5 hover:text-white"
                                                    )}
                                                    onClick={() => {
                                                        setCountry(country)
                                                        setIsCountryOpen(false)
                                                    }}
                                                >
                                                    <span className="flex items-center gap-4">
                                                        {country.flag.startsWith('/') ? (
                                                            <img src={country.flag} alt={country.name} className="w-6 h-4 object-cover rounded shadow-sm" />
                                                        ) : (
                                                            <span className="text-lg">{country.flag}</span>
                                                        )}
                                                        <span className="font-medium">{country.name}</span>
                                                    </span>
                                                    {getCountryCode() === country.code && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Become Host Button - Glowing Effect */}
                        <div className="relative" ref={hostDropdownRef}>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsHostDropdownOpen(!isHostDropdownOpen)}
                                className={cn(
                                    "relative overflow-hidden cursor-pointer rounded-xl px-5 py-2.5 font-bold text-sm transition-all flex items-center gap-2",
                                    "bg-gradient-to-r from-accent to-[#E04642] text-white shadow-lg shadow-accent/25 hover:shadow-accent/40"
                                )}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                                <Sparkles className="w-4 h-4 fill-white/20" />
                                Become Host
                            </motion.button>

                            <AnimatePresence>
                                {isHostDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-3 w-80 bg-[#0F2238]/95 backdrop-blur-xl rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-50 border border-white/10 overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-accent/10 to-transparent">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Start Hosting</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {hostOptions.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        navigate(option.path)
                                                        setIsHostDropdownOpen(false)
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-white/5 rounded-2xl transition-all flex items-center gap-4 cursor-pointer group border border-transparent hover:border-white/5"
                                                >
                                                    <div className="p-3 rounded-xl bg-gradient-to-br from-white/10 to-transparent ring-1 ring-white/5 text-white group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
                                                        {option.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-white text-sm group-hover:text-accent transition-colors">{option.title}</div>
                                                        <div className="text-xs text-white/50 group-hover:text-white/70">{option.description}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                className={cn(
                                    "relative p-2.5 rounded-xl transition-all border group",
                                    isNotificationOpen
                                        ? "bg-white/10 border-white/20 text-white"
                                        : "bg-transparent border-transparent hover:bg-white/5 text-white/70 hover:text-white"
                                )}
                                onClick={() => {
                                    setIsNotificationOpen(!isNotificationOpen)
                                    if (isNotificationOpen) markAllAsRead()
                                }}
                            >
                                <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-accent rounded-full animate-pulse ring-2 ring-[#0A1A2F]" />
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotificationOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-3 w-96 bg-[#0F2238]/95 backdrop-blur-xl rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-50 border border-white/10 overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                            <p className="text-sm font-bold text-white">Notifications</p>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllAsRead}
                                                    className="text-[10px] font-bold text-accent hover:text-white transition-colors bg-accent/10 px-2 py-1 rounded-lg uppercase tracking-wider"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="text-center py-12 text-white/30">
                                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Bell className="w-8 h-8 opacity-50" />
                                                    </div>
                                                    <p className="text-sm font-medium">No new notifications</p>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        className={cn(
                                                            "px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors group",
                                                            !notif.read && "bg-accent/5 hover:bg-accent/10"
                                                        )}
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className={cn(
                                                                "mt-2 h-2 w-2 rounded-full shrink-0 shadow-[0_0_10px_currentColor]",
                                                                notif.read ? "bg-transparent shadow-none" : "bg-accent text-accent"
                                                            )} />
                                                            <div>
                                                                <p className="text-sm text-white/90 font-medium group-hover:text-white transition-colors">{notif.message}</p>
                                                                <p className="text-xs text-white/40 mt-1.5 font-medium">{notif.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile / Sign In */}
                        {!isAuthenticated ? (
                            <Button
                                onClick={() => navigate("/signin")}
                                className="rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white hover:text-[#0A1A2F] px-6 font-bold tracking-wide transition-all shadow-lg hover:shadow-white/20"
                            >
                                Sign In
                            </Button>
                        ) : (
                            <div className="relative" ref={profileRef}>
                                <button
                                    className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                >
                                    <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-accent transition-all shadow-lg">
                                        {resolvedUser?.profile_image ? (
                                            <img
                                                src={`${resolvedUser.profile_image}?v=${Date.now()}`}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent to-[#E04642] text-white font-bold text-xs">
                                                {displayName.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronDown className={cn("h-4 w-4 text-white/50 transition-transform group-hover:text-white", isProfileOpen && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full right-0 mt-3 w-64 bg-[#0F2238] rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 py-2"
                                        >
                                            <div className="px-4 py-3 border-b border-white/5 mb-2">
                                                <p className="text-white font-bold truncate">{displayName}</p>
                                                <Link to="/account-v2?tab=personal" className="text-xs text-white/50 hover:text-accent transition-colors flex items-center gap-1 mt-0.5" onClick={() => setIsProfileOpen(false)}>
                                                    View Profile
                                                </Link>
                                            </div>

                                            <div className="space-y-1 px-2">
                                                <Link
                                                    to="/account-v2?tab=overview"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                    onClick={() => setIsProfileOpen(false)}
                                                >
                                                    <Home className="h-4 w-4 opacity-70" />
                                                    Overview
                                                </Link>
                                                <Link
                                                    to="/account-v2?tab=personal"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                    onClick={() => setIsProfileOpen(false)}
                                                >
                                                    <User className="h-4 w-4 opacity-70" />
                                                    Personal Info
                                                </Link>
                                                <Link
                                                    to="/account-v2?tab=listings"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                    onClick={() => setIsProfileOpen(false)}
                                                >
                                                    <Building className="h-4 w-4 opacity-70" />
                                                    My Listings
                                                </Link>
                                                <Link
                                                    to="/account-v2?tab=trips"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                    onClick={() => setIsProfileOpen(false)}
                                                >
                                                    <Plane className="h-4 w-4 opacity-70" />
                                                    My Trips
                                                </Link>
                                                <Link
                                                    to="/account-v2?tab=settings"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                    onClick={() => setIsProfileOpen(false)}
                                                >
                                                    <SettingsIcon className="h-4 w-4 opacity-70" />
                                                    Settings
                                                </Link>
                                            </div>

                                            <div className="mt-2 pt-2 border-t border-white/5 px-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await logout().unwrap();
                                                        } catch (e) {
                                                            console.warn("Backend logout failed, proceeding with local cleanup", e);
                                                        }
                                                        disconnectSocket();
                                                        dispatch(authApi.util.resetApiState());
                                                        dispatch(hostApi.util.resetApiState());
                                                        localStorage.removeItem("user");
                                                        setIsProfileOpen(false);
                                                        navigate("/signin");
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm text-[#FF6B6B] hover:bg-[#FF6B6B]/10 font-bold cursor-pointer transition-colors rounded-xl flex items-center gap-3"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div >
                </div >
            </header >

            {/* ================= MOBILE LAYOUT (Sidebar) ================= */}
            <div className="md:hidden">
                {/* Mobile Top Bar */}
                <div className={cn(
                    "fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between transition-all duration-300",
                    isScrolled || isMobileMenuOpen ? "bg-[#0A1A2F]/95 backdrop-blur-xl border-b border-white/10 shadow-lg" : "bg-transparent"
                )}>
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/20">
                            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white font-bold text-lg">NextKin<span className="text-accent text-xs align-top ml-0.5">LIFE</span></span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {!isMobileMenuOpen && (
                            <Link to="/search" className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors">
                                <Search className="w-5 h-5" />
                            </Link>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors relative z-50"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />

                            {/* Drawer */}
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-[#0F2238] z-40 overflow-y-auto border-l border-white/10 shadow-2xl"
                                ref={mobileMenuRef}
                            >
                                <div className="min-h-full flex flex-col pt-20 pb-8 px-6">

                                    {/* User Profile Section */}
                                    <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5">
                                        {isAuthenticated ? (
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent/50">
                                                    {resolvedUser?.profile_image ? (
                                                        <img src={resolvedUser.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-accent flex items-center justify-center text-white font-bold">
                                                            {displayName.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-bold truncate">{displayName}</p>
                                                    <Link to="/account-v2" className="text-xs text-accent hover:underline">View Profile</Link>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <p className="text-white font-bold text-center mb-1">Welcome to NextKin</p>
                                                <Button onClick={() => navigate("/signin")} className="w-full bg-accent hover:bg-accent/90 text-white font-bold rounded-xl">
                                                    Sign In / Sign Up
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation Links */}
                                    <nav className="space-y-2 mb-8">
                                        {navItems.map((item) => (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                className={cn(
                                                    "flex items-center justify-between px-4 py-3.5 rounded-xl transition-all",
                                                    location.pathname === item.path
                                                        ? "bg-accent text-white font-bold shadow-lg shadow-accent/20"
                                                        : "text-white/70 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                {item.name}
                                                {location.pathname === item.path && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </Link>
                                        ))}
                                    </nav>

                                    <div className="h-px bg-white/10 my-4" />

                                    {/* Host Section */}
                                    <div className="mb-8">
                                        <p className="px-4 text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Hosting</p>
                                        <div className="space-y-2">
                                            {hostOptions.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        navigate(option.path)
                                                        setIsMobileMenuOpen(false)
                                                    }}
                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3 group transition-colors"
                                                >
                                                    <div className="p-2 rounded-lg bg-white/5 text-white/70 group-hover:text-accent group-hover:bg-white/10 transition-colors">
                                                        {React.cloneElement(option.icon, { className: "w-5 h-5" })}
                                                    </div>
                                                    <span className="text-white/80 font-medium group-hover:text-white">{option.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Logout if authenticated */}
                                    {isAuthenticated && (
                                        <button
                                            onClick={async () => {
                                                try { await logout().unwrap(); } catch (e) { }
                                                disconnectSocket();
                                                dispatch(authApi.util.resetApiState());
                                                dispatch(hostApi.util.resetApiState());
                                                localStorage.removeItem("user");
                                                setIsMobileMenuOpen(false);
                                                navigate("/signin");
                                            }}
                                            className="mt-auto w-full py-4 text-[#FF6B6B] font-bold hover:bg-[#FF6B6B]/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X className="w-5 h-5" /> Sign Out
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}