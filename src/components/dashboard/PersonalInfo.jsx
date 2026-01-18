"use client"
import React, { useState, useEffect } from "react"
import {
    User, Phone, Mail, Globe,
    MapPin, Edit2, Share2, ExternalLink, Check, X, ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Facebook, Instagram, MessageCircle } from "lucide-react"

const DetailCard = ({ title, description, children, onEdit, isEditing, icon: Icon, isUpdating }) => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-neutral/5 to-neutral/10 border border-neutral/20 shadow-xl">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/3 to-accent/5 rounded-full blur-3xl"></div>

        <div className="relative z-10 p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-primary">{title}</h3>
                        <p className="text-sm text-primary/50">{description}</p>
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    disabled={isUpdating}
                    className={cn(
                        "px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2",
                        isEditing
                            ? "bg-accent text-white hover:bg-accent/90 shadow-md"
                            : "bg-neutral/20 text-primary hover:bg-neutral/30 border border-neutral/30"
                    )}
                >
                    {isUpdating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : isEditing ? (
                        <>
                            <Check className="w-4 h-4" />
                            Save Changes
                        </>
                    ) : (
                        <>
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </>
                    )}
                </button>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
                {children}
            </div>
        </div>
    </div>
)

const InfoField = ({
    label,
    value,
    isEditing,
    onChange,
    name,
    type = "text",
    placeholder,
    action,
    actionIcon: ActionIcon
}) => (
    <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-primary/40 ml-1 flex items-center gap-1">
            {label}
        </label>
        {isEditing ? (
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder || label}
                className="w-full bg-white border-2 border-neutral/30 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-medium text-primary placeholder:text-primary/30"
            />
        ) : (
            <div className="relative group">
                <div className="p-4 bg-neutral/10 rounded-xl border border-neutral/20 font-semibold text-primary truncate flex items-center justify-between hover:bg-neutral/15 transition-colors">
                    <span className="truncate">{value || <span className="text-primary/30 font-normal italic">Not specified</span>}</span>
                    {action && value && (
                        <button
                            onClick={() => action(value)}
                            className="p-2 bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all text-accent hover:bg-accent hover:text-white"
                            title="Open link"
                        >
                            {ActionIcon ? <ActionIcon size={14} /> : <ExternalLink size={14} />}
                        </button>
                    )}
                </div>
            </div>
        )}
    </div>
)

import { useNavigate } from "react-router-dom"

// ... (existing imports)

export const PersonalInfo = ({ initialData, verificationState, onUpdate, isUpdating, isHost }) => {
    const navigate = useNavigate()
    const [editStates, setEditStates] = useState({
        personal: false,
        location: false,
        social: false,
    })

    // ... (existing state)
    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        country: initialData?.country || "",
        state: initialData?.state || "",
        city: initialData?.city || "",
        address: initialData?.address || "",
        zip: initialData?.zip || "",
        whatsapp: initialData?.whatsapp || "",
        facebook: initialData?.facebook || "",
        instagram: initialData?.instagram || ""
    })

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                full_name: initialData.full_name || prev.full_name || "",
                email: initialData.email || prev.email || "",
                phone: initialData.phone || prev.phone || "",
                country: initialData.country || prev.country || "",
                state: initialData.state || prev.state || "",
                city: initialData.city || prev.city || "",
                address: initialData.address || prev.address || "",
                zip: initialData.zip || prev.zip || "",
                whatsapp: initialData.whatsapp || prev.whatsapp || "",
                facebook: initialData.facebook || prev.facebook || "",
                instagram: initialData.instagram || prev.instagram || "",
            }))
        }
    }, [initialData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const toggleEdit = async (section) => {
        if (!isHost) {
            navigate('/hosts')
            return
        }

        if (editStates[section]) {
            try {
                if (onUpdate) {
                    await onUpdate(formData);
                }
                setEditStates(prev => ({ ...prev, [section]: false }))
            } catch (error) {
                console.error("Update failed", error);
                alert("Failed to update profile. Please try again.")
            }
        } else {
            setEditStates(prev => ({ ...prev, [section]: true }))
        }
    }

    // Auto-fill address based on Pincode
    React.useEffect(() => {
        const fetchPincodeDetails = async () => {
            const pincode = formData.zip;
            if (pincode && pincode.length === 6 && /^\d+$/.test(pincode) && editStates.location) {
                try {
                    const { fetchAddressByPincode } = await import('@/lib/pincodeUtils');
                    const addressData = await fetchAddressByPincode(pincode);
                    if (addressData) {
                        setFormData(prev => ({
                            ...prev,
                            city: addressData.city || prev.city,
                            state: addressData.state || prev.state,
                            country: addressData.country || prev.country
                        }));
                    }
                } catch (e) { console.error(e) }
            }
        };

        const timeoutId = setTimeout(fetchPincodeDetails, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.zip, editStates.location]);

    const openWhatsApp = (number) => {
        const cleanNumber = number ? number.replace(/\D/g, '') : '';
        if (cleanNumber) window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }

    const openLink = (url) => {
        if (!url) return;
        let finalUrl = url;
        if (!url.startsWith('http')) {
            finalUrl = `https://${url}`;
        }
        window.open(finalUrl, '_blank');
    }

    return (
        <div className="relative min-h-screen">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-accent/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-neutral/20 to-accent/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 p-4 md:p-8 space-y-8 max-w-5xl">
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-navy-dark p-8 text-white">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)' }}></div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white/80 mb-4">
                            <User className="w-3.5 h-3.5" />
                            Profile Settings
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Personal Information</h1>
                        <p className="text-white/60 max-w-md">Manage your personal details, location settings, and social connections.</p>
                    </div>
                </div>

                {/* Personal Details Card */}
                <DetailCard
                    title="Personal Details"
                    description="Your basic identity information"
                    icon={User}
                    isEditing={editStates.personal}
                    onEdit={() => toggleEdit('personal')}
                    isUpdating={isUpdating && editStates.personal}
                >
                    <div className="md:col-span-2">
                        <InfoField label="Full Name" name="full_name" value={formData.full_name} isEditing={editStates.personal} onChange={handleChange} />
                    </div>
                    <InfoField label="Phone Number" name="phone" type="tel" value={formData.phone} isEditing={editStates.personal} onChange={handleChange} />
                </DetailCard>

                {/* Location & Address Card */}
                <DetailCard
                    title="Location & Address"
                    description="Helps us personalize your experience"
                    icon={MapPin}
                    isEditing={editStates.location}
                    onEdit={() => toggleEdit('location')}
                    isUpdating={isUpdating && editStates.location}
                >
                    <InfoField label="Country" name="country" value={formData.country} isEditing={editStates.location} onChange={handleChange} />
                    <InfoField label="State / Province" name="state" value={formData.state} isEditing={editStates.location} onChange={handleChange} />
                    <InfoField label="City" name="city" value={formData.city} isEditing={editStates.location} onChange={handleChange} />
                    <InfoField label="Zip / Pin Code" name="zip" value={formData.zip} isEditing={editStates.location} onChange={handleChange} />
                    <div className="md:col-span-2">
                        <InfoField label="Street Address" name="address" value={formData.address} isEditing={editStates.location} onChange={handleChange} placeholder="House number, street name..." />
                    </div>
                </DetailCard>

                {/* Social Media & Contacts */}
                <DetailCard
                    title="Social Media & Contacts"
                    description="Where can people find you?"
                    icon={Share2}
                    isEditing={editStates.social}
                    onEdit={() => toggleEdit('social')}
                    isUpdating={isUpdating && editStates.social}
                >
                    <div className="md:col-span-2">
                        <InfoField
                            label="WhatsApp Number"
                            name="whatsapp"
                            value={formData.whatsapp}
                            isEditing={editStates.social}
                            onChange={handleChange}
                            placeholder="+1 234 567 890"
                            action={openWhatsApp}
                            actionIcon={MessageCircle}
                        />
                    </div>
                    <InfoField
                        label="Facebook Profile"
                        name="facebook"
                        value={formData.facebook}
                        isEditing={editStates.social}
                        onChange={handleChange}
                        placeholder="facebook.com/username"
                        action={openLink}
                        actionIcon={Facebook}
                    />
                    <InfoField
                        label="Instagram Profile"
                        name="instagram"
                        value={formData.instagram}
                        isEditing={editStates.social}
                        onChange={handleChange}
                        placeholder="instagram.com/username"
                        action={openLink}
                        actionIcon={Instagram}
                    />
                </DetailCard>
            </div>
        </div>
    )
}
