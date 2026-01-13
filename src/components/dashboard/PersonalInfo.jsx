"use client"
import React, { useState, useEffect } from "react"
import {
    User, Phone, Mail, Globe,
    MapPin, Edit2, Share2, ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
// Import social icons properly or use generic ones from lucide if specific ones aren't available
// Lucide React doesn't have brand icons by default in standard export, we'll use generic placeholders or confirm availability.
// Actually Lucide usually has Facebook, Instagram. Let's try or fallback to generic.
import { Facebook, Instagram, MessageCircle } from "lucide-react"

const DetailCard = ({ title, description, children, onEdit, isEditing, icon: Icon }) => (
    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-neutral/5 shadow-xl shadow-primary/5 space-y-6">
        <div className="flex items-start justify-between">
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-[#F8F9FA] rounded-2xl flex items-center justify-center text-accent">
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-primary">{title}</h3>
                    <p className="text-sm text-[#00142E]/50 font-medium">{description}</p>
                </div>
            </div>
            <button
                onClick={onEdit}
                className={cn(
                    "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                    isEditing ? "bg-primary text-white" : "bg-neutral/5 text-primary hover:bg-neutral/10"
                )}
            >
                {isEditing ? "Save" : <><Edit2 className="w-3.5 h-3.5" /> Edit</>}
            </button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
            {children}
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
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00142E]/40 ml-1">{label}</label>
        {isEditing ? (
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder || label}
                className="w-full bg-[#F8F9FA] border border-neutral/20 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-semibold text-primary"
            />
        ) : (
            <div className="relative group">
                <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-transparent font-bold text-primary truncate flex items-center justify-between">
                    <span className="truncate">{value || <span className="text-[#00142E]/30 font-medium italic">Empty</span>}</span>
                    {action && value && (
                        <button
                            onClick={() => action(value)}
                            className="p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-accent hover:bg-accent hover:text-white"
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

// ... (imports remain the same)

export const PersonalInfo = ({ initialData, verificationState, onUpdate, isUpdating }) => {
    const [editStates, setEditStates] = useState({
        personal: false,
        location: false,
        social: false,
    })

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || "John Doe",
        email: initialData?.email || "john.doe@example.com",
        phone: initialData?.phone || "+1 234 567 890",
        country: initialData?.country || "United States",
        state: initialData?.state || "New York",
        city: initialData?.city || "New York City",
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
                full_name: initialData.full_name || prev.full_name,
                email: initialData.email || prev.email,
                phone: initialData.phone || prev.phone,
                country: initialData.country || prev.country,
                state: initialData.state || prev.state,
                city: initialData.city || prev.city,
                address: initialData.address || prev.address,
                zip: initialData.zip || prev.zip,
                whatsapp: initialData.whatsapp || prev.whatsapp,
                facebook: initialData.facebook || prev.facebook,
                instagram: initialData.instagram || prev.instagram,
            }))
        }
    }, [initialData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const toggleEdit = async (section) => {
        // If we are currently editing and turning it off, that means SAVE
        if (editStates[section]) {
            try {
                if (onUpdate) {
                    await onUpdate(formData);
                }
                setEditStates(prev => ({ ...prev, [section]: false }))
            } catch (error) {
                console.error("Update failed", error);
                // Optionally show error state here, but for now we just log
                // Don't close the edit mode if error occurred
                alert("Failed to update profile. Please try again.")
            }
        } else {
            // Turning on edit mode
            setEditStates(prev => ({ ...prev, [section]: true }))
        }
    }

    // Auto-fill address based on Pincode
    React.useEffect(() => {
        const fetchPincodeDetails = async () => {
            const pincode = formData.zip;
            if (pincode && pincode.length === 6 && /^\d+$/.test(pincode) && editStates.location) {
                // ... (import logic remains same, but removing dynamic import for clarity if not needed, assuming it works)
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

        const timeoutId = setTimeout(fetchPincodeDetails, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [formData.zip, editStates.location]);

    // Actions
    const openWhatsApp = (number) => {
        // Remove non-numeric chars for API
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
        <div className="p-4 md:p-8 space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-2">
                <h2 className="text-3xl font-black text-primary mb-2">Personal Information</h2>
                <p className="text-[#00142E]/50 font-medium">Manage your personal details and location settings.</p>
            </div>

            {/* Personal Details Card */}
            <DetailCard
                title="Personal Details"
                description="Your basic identity information"
                icon={User}
                isEditing={editStates.personal}
                onEdit={() => toggleEdit('personal')}
            >
                <div className="md:col-span-2">
                    <InfoField label="Full Name" name="full_name" value={formData.full_name} isEditing={editStates.personal} onChange={handleChange} />
                </div>
                {/* <InfoField label="Email Address" name="email" type="email" value={formData.email} isEditing={editStates.personal} onChange={handleChange} /> */}
                <InfoField label="Phone Number" name="phone" type="tel" value={formData.phone} isEditing={editStates.personal} onChange={handleChange} />
            </DetailCard>

            {/* Location & Address Card */}
            <DetailCard
                title="Location & Address"
                description="Helps us personalize your experience"
                icon={MapPin}
                isEditing={editStates.location}
                onEdit={() => toggleEdit('location')}
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
                    label="Instagram Value"
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
    )
}
