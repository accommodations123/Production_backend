"use client"
import React, { useState, useRef } from "react"
import {
    User, Mail, Calendar, ShieldCheck,
    ChevronRight, Camera, CheckCircle2, AlertCircle,
    Smartphone, Fingerprint, MapPin, Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

export const ProfileOverview = ({ initialData, onEditProfile, userRole, verificationState, onVerifyChange, onUpdate, isUpdating }) => {
    const fileInputRef = useRef(null)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
    const [otp, setOtp] = useState("")

    // Fallback data
    const user = {
        full_name: initialData?.full_name || "John Doe",
        email: initialData?.email || "john@example.com",
        phone: initialData?.phone || "+1 234 567 890",
        joinedDate: initialData?.joinedDate || "January 2024",
        role: userRole || initialData?.role || "Guest Member",
        isEmailVerified: initialData?.isEmailVerified !== false, // Assume true if not explicitly false
        location: initialData?.location || "Location not set",
        avatar: avatarPreview || initialData?.avatar,
    }

    const calculateProfileCompletion = () => {
        let score = 0
        if (user.avatar) score += 15
        if (user.full_name && user.full_name.length > 2) score += 10
        if (user.isEmailVerified) score += 15
        if (verificationState.phone) score += 15
        if (user.location && user.location !== "Location not set") score += 15
        if (verificationState.id) score += 30
        return score
    }

    const completionScore = calculateProfileCompletion()
    const isHost = user.role?.toLowerCase().includes("host")

    const handleAvatarClick = () => fileInputRef.current?.click()

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            // Preview immediately
            const reader = new FileReader()
            reader.onloadend = () => setAvatarPreview(reader.result)
            reader.readAsDataURL(file)

            // Upload immediately
            if (onEditProfile) { // reusing prop name for simplicity, or should double check passed props
                const fd = new FormData()
                fd.append("profile_image", file)
                if (onUpdate) {
                    await onUpdate(fd)
                }
            }
        }
    }

    const verificationStats = [
        { id: 'email', label: "Email", status: user.isEmailVerified ? "verified" : "unverified" },
        { id: 'phone', label: "Phone", status: verificationState.phone ? "verified" : "unverified" },
        { id: 'id', label: "Government ID", status: verificationState.id ? "verified" : "unverified" },
        { id: 'address', label: "Address", status: user.location !== "Location not set" ? "verified" : "unverified" },
    ]

    const handleVerifyClick = (id) => {
        if (id === 'phone') setIsVerifyingPhone(true)
        if (id === 'id') {
            // Mock ID verification
            alert("Uploading ID document for manual review...")
            setTimeout(() => {
                onVerifyChange(prev => ({ ...prev, id: true }))
                alert("ID Verification Sent! (Mock success for demo)")
            }, 1500)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* OTP Modal Mock */}
            {isVerifyingPhone && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
                                <Smartphone className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-primary">Phone Verification</h3>
                            <p className="text-sm text-[#00142E]/50 font-medium mt-1">We've sent a 4-digit code to {user.phone}</p>
                        </div>
                        <input
                            type="text"
                            maxLength={4}
                            placeholder="0000"
                            className="w-full h-16 text-center text-3xl font-black tracking-[0.5em] bg-[#F8F9FA] rounded-2xl border-none focus:ring-2 focus:ring-accent/20 outline-none"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                        <button
                            onClick={() => {
                                onVerifyChange(prev => ({ ...prev, phone: true }))
                                setIsVerifyingPhone(false)
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-accent transition-all shadow-lg shadow-primary/20"
                        >
                            Verify & Close
                        </button>
                    </div>
                </div>
            )}

            {/* Header / Identity Section */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-primary mb-2">Welcome back, {user.full_name?.split(' ')[0]}</h2>
                    <p className="text-[#00142E]/50 font-medium">Manage your account settings and set your preferences.</p>
                </div>
                {/* {!isHost && (
                    <button className="px-6 py-3 bg-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20">
                        Become a Host
                    </button>
                )} */}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Card (Identity) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-2xl shadow-primary/5 border border-neutral/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-[80px] group-hover:bg-accent/10 transition-colors duration-500" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div
                                    onClick={handleAvatarClick}
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-neutral/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl cursor-pointer group/avatar relative"
                                >
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 md:w-16 md:h-16 text-primary/20" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={handleAvatarClick}
                                    className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-accent transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-2xl md:text-3xl font-black text-primary">{user.full_name}</h3>
                                        <div className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest rounded-full">
                                            {user.role}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#00142E]/50">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-4 h-4" />
                                            {user.email}
                                            {user.isEmailVerified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            Joined {user.joinedDate}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={onEditProfile}
                                    className="px-6 py-2.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    {completionScore < 100 ? "Complete your profile" : "Manage Profile"}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats / Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#F8F9FA] rounded-[32px] p-8 border border-neutral/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00142E]/40 mb-4">Account Status</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-primary">{isHost ? "Verified Host" : "Guest Member"}</span>
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-accent">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#F8F9FA] rounded-[32px] p-8 border border-neutral/5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00142E]/40 mb-4">Profile Strength</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>{completionScore}% Complete</span>
                                    <span className="text-accent">{completionScore === 100 ? "Elite Profile!" : "Keep going!"}</span>
                                </div>
                                <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-1000"
                                        style={{ width: `${completionScore}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Card (Sidebar on Desktop) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-primary/5 border border-neutral/5 space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-primary mb-1">Verify Identity</h3>
                            <p className="text-sm text-[#00142E]/50 font-medium">Build trust within the community.</p>
                        </div>

                        <div className="space-y-3">
                            {verificationStats.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl border border-transparent hover:border-neutral/10 transition-all">
                                    <span className="text-sm font-bold text-primary">{item.label}</span>
                                    {item.status === 'verified' ? (
                                        <div className="flex items-center gap-1.5 text-green-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Verified</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleVerifyClick(item.id)}
                                            className="text-[10px] font-black uppercase tracking-wider text-accent hover:underline"
                                        >
                                            Verify now
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-accent/5 rounded-[24px] flex gap-3">
                            <AlertCircle className="w-5 h-5 text-accent shrink-0" />
                            <p className="text-xs font-medium text-accent leading-relaxed">
                                {isHost
                                    ? "Verified hosts are 5x more likely to secure high-value bookings."
                                    : "Verification helps you book instantly and build trust with hosts."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
