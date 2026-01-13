"use client"
import React, { useState, useEffect } from "react"
import { Navbar } from "../../components/layout/Navbar"
// import { Footer } from "@/components/layout/Footer"
import { Sidebar } from "../../components/layout/Sidebar"

// New Dashboard Components
import { PersonalInfo } from "@/components/dashboard/PersonalInfo"
import { MyListings } from "@/components/dashboard/MyListings"
import { Notifications } from "@/components/dashboard/Notifications"
import { Settings } from "@/components/dashboard/Settings"
import { Support } from "@/components/dashboard/Support"
import { ProfileOverview } from "@/components/dashboard/ProfileOverview"
import { useGetHostProfileQuery, useUpdateHostMutation } from "@/store/api/hostApi"

import { User, Home, Bell, Settings as SettingsIcon, LifeBuoy, LayoutDashboard, Briefcase, Heart, Calendar, CreditCard } from "lucide-react" // Added LayoutDashboard, Briefcase, Heart, Calendar, CreditCard
import { cn } from "@/lib/utils"

export default function DashboardPage() {
    const [userData, setUserData] = useState(null)
    const [userRoleOverride, setUserRoleOverride] = useState(null)
    const [verificationState, setVerificationState] = useState({
        phone: false,
        id: false,
    })
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [active, setActive] = useState("overview")

    const menuItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "personal", label: "Profile", icon: User },
        { id: "listings", label: "Listings", icon: Home },
        { id: "bookings_host", label: "Bookings", icon: Calendar },
        { id: "payouts", label: "Payouts", icon: CreditCard },
        { id: "trips", label: "Trips", icon: Briefcase },
        { id: "wishlist", label: "Wishlist", icon: Heart },
        { id: "notifications", label: "Inbox", icon: Bell },
        { id: "support", label: "Support", icon: LifeBuoy },
        { id: "settings", label: "Settings", icon: SettingsIcon },
    ]

    useEffect(() => {
        const userStr = localStorage.getItem("user")
        if (userStr) {
            try {
                const user = JSON.parse(userStr)
                const locationStr = [user.city, user.country].filter(Boolean).join(", ")
                setUserData({
                    name: user.full_name || user.name || "User",
                    email: user.email || "",
                    phone: user.phone || "",
                    location: locationStr || "Location not set"
                })
            } catch (err) { console.error("Profile parse error:", err) }
        }
    }, [])

    const { data: hostProfile, refetch } = useGetHostProfileQuery(undefined, { skip: !userData })
    const [updateHost, { isLoading: isUpdating }] = useUpdateHostMutation()

    const handleUpdateHost = async (data) => {
        if (!hostProfile?.id) return

        try {
            const result = await updateHost({
                hostId: hostProfile.id,
                data: data // Can be FormData or object
            }).unwrap()

            // Refetch after successful update to ensure fresh data
            refetch()
            return result
        } catch (error) {
            console.error("Failed to update profile:", error)
            throw error // Re-throw to let components handle specific UI feedback if needed
        }
    }

    // Sync initial verification status
    useEffect(() => {
        if (hostProfile) {
            setVerificationState(prev => ({
                ...prev,
                phone: hostProfile.isPhoneVerified || false,
            }))
        }
    }, [hostProfile])

    const userRole = userRoleOverride || hostProfile?.role || "Guest Member"
    const isHost = userRole?.toLowerCase().includes("host")

    const filteredMenuItems = menuItems.filter(item => {
        // Show all items for now as requested
        return true;

        // if (item.id === "listings" || item.id === "bookings_host" || item.id === "payouts") return isHost
        // if (item.id === "trips" || item.id === "wishlist") return !isHost
        // return true
    })

    const renderContent = () => {
        switch (active) {
            case "overview":
                return <ProfileOverview
                    initialData={hostProfile}
                    onEditProfile={() => setActive("personal")}
                    userRole={userRole}
                    verificationState={verificationState}
                    onVerifyChange={setVerificationState}
                    onToggleRole={() => setUserRoleOverride(isHost ? "Guest Member" : "Host")}
                    onUpdate={handleUpdateHost}
                    isUpdating={isUpdating}
                />
            case 'personal':
                return <PersonalInfo
                    initialData={hostProfile}
                    userRole={userRole}
                    verificationState={verificationState}
                    onVerify={() => setActive("overview")}
                    onUpdate={handleUpdateHost}
                    isUpdating={isUpdating}
                />
            case 'listings':
                return <MyListings />
            case 'bookings_host':
                return <div className="p-8"><h3 className="text-2xl font-bold mb-4">Guest Bookings</h3><p className="text-neutral/60">No pending guest bookings found.</p></div>
            case 'payouts':
                return <div className="p-8"><h3 className="text-2xl font-bold mb-4">Payouts (Coming Soon)</h3><p className="text-neutral/60">Payout history and bank settings will appear here.</p></div>
            case 'notifications':
                return <Notifications />
            case 'settings':
                return <Settings />
            case 'support':
                return <Support />
            case "trips":
                return <div className="p-8"><h3 className="text-2xl font-bold mb-4">Trips & Bookings</h3><p className="text-neutral/60">No upcoming trips found.</p></div>
            case "wishlist":
                return <div className="p-8"><h3 className="text-2xl font-bold mb-4">Wishlist</h3><p className="text-neutral/60">Your wishlist is empty.</p></div>
            default:
                return <ProfileOverview initialData={hostProfile} onEditProfile={() => setActive("personal")} userRole={userRole} />
        }
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] font-inter text-[#00142E] flex flex-col">
            <Navbar minimal onMenuClick={() => setIsSidebarOpen(true)} />

            <div className="flex flex-1 pt-20">
                {/* Premium Sidebar Navigation */}
                <Sidebar
                    activeId={active}
                    onSelect={(id) => setActive(id)}
                    userRole={userRole}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                {/* Content Area */}
                <div className="flex-1 transition-all duration-300 overflow-x-hidden">
                    <div className="pt-4 lg:pt-8 pb-12 w-full px-4 md:px-6 lg:px-8">
                        <div className="flex flex-col gap-10">
                            {/* Content Panel */}
                            <div className="bg-white border border-neutral/30 rounded-[32px] md:rounded-[40px] shadow-sm overflow-hidden min-h-[600px]">
                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
