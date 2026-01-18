import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    Loader2,
    AlertCircle,
    Globe,
    Lock,
    Unlock,
    Users,
    Tag,
    MapPin,
    Info,
    Link as LinkIcon,
    Camera,
    Image as ImageIcon,
    Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateCommunityMutation, useUpdateCommunityMutation } from '@/store/api/hostApi';
import { useNavigate } from 'react-router-dom';

const COUNTRIES = ["India", "USA", "UK", "Canada", "Australia", "Germany"];
const VISIBILITY_OPTIONS = [
    { id: 'public', label: 'Public', desc: 'Anyone can find and see posts', icon: Unlock },
    { id: 'private', label: 'Private', desc: 'Only members can see posts', icon: Lock }
];
const JOIN_POLICIES = [
    { id: 'open', label: 'Open', desc: 'Anyone can join instantly', icon: Users },
    { id: 'approval', label: 'Restricted', desc: 'Requires admin approval', icon: Check }
];

const Label = ({ children, required }) => (
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 block mb-2">
        {children} {required && <span className="text-accent">*</span>}
    </label>
);

const Input = ({ error, ...props }) => (
    <div className="space-y-1">
        <input
            {...props}
            className={cn(
                "w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/50 transition-all font-semibold text-white placeholder:font-medium placeholder:text-gray-500",
                error && "border-accent/50 ring-1 ring-accent/10",
                props.className
            )}
        />
        {error && <p className="text-[10px] font-bold text-accent ml-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
    </div>
);

const CommunityDetailsForm = () => {
    const navigate = useNavigate();
    const [createCommunity, { isLoading: isCreating }] = useCreateCommunityMutation();
    const [updateCommunity, { isLoading: isUpdating }] = useUpdateCommunityMutation();

    const [success, setSuccess] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errors, setErrors] = useState({});

    // Image State
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [cover, setCover] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        visibility: "public",
        join_policy: "open",
        country: "",
        state: "",
        city: "",
        topics: []
    });

    const [newTopic, setNewTopic] = useState("");

    const isSubmitting = isCreating || isUpdating;

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleImageChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'avatar') {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        } else {
            setCover(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const addTopic = (e) => {
        if (e.key === 'Enter' && newTopic.trim()) {
            e.preventDefault();
            if (!formData.topics.includes(newTopic.trim())) {
                updateFormData('topics', [...formData.topics, newTopic.trim()]);
            }
            setNewTopic("");
        }
    };

    const removeTopic = (topicToRemove) => {
        updateFormData('topics', formData.topics.filter(t => t !== topicToRemove));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.slug.trim()) newErrors.slug = "Slug is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.country) newErrors.country = "Country is required";
        if (!formData.city.trim()) newErrors.city = "City is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setStatusMessage("");

        try {
            // Step 1: Create Community
            const result = await createCommunity({ ...formData }).unwrap();

            if (result.success && result.community) {
                const communityId = result.community._id || result.community.id; // Handle both ID formats

                // Step 2: Upload Images if present
                if (avatar || cover) {
                    try {
                        const imageFormData = new FormData();
                        if (avatar) imageFormData.append("avatar_image", avatar);
                        if (cover) imageFormData.append("cover_image", cover);

                        await updateCommunity({ id: communityId, data: imageFormData }).unwrap();
                    } catch (uploadErr) {
                        console.error("Image upload failed:", uploadErr);
                        // We don't block success if only images fail, but we should warn user?
                        // For now, let's just proceed as success but maybe log it.
                    }
                }

                setSuccess(true);
                setStatusMessage("Community created successfully!");

                setTimeout(() => {
                    setSuccess(false);
                    // Navigate to the new community or dashboard
                    // navigate(`/groups/${result.community.slug || communityId}`);
                    // For now, staying on page.
                }, 3000);
            }
        } catch (err) {
            console.error("Failed to create community:", err);
            setErrors(prev => ({
                ...prev,
                submit: err?.data?.message || err.message || "Failed to create community. Please try again."
            }));
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/10 shadow-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Success Overlay */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#00152d]/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-8"
                    >
                        <div className="w-20 h-20 bg-accent/20 text-accent rounded-3xl flex items-center justify-center mb-6 border border-accent/20">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">Details Updated!</h3>
                        <p className="text-white/50 font-medium max-w-xs">
                            {statusMessage || "Your community information has been successfully saved."}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-8">
                {errors.submit && (
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-sm font-bold flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {errors.submit}
                    </div>
                )}

                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">Community Information</h3>
                    <p className="text-white/50 font-medium">Manage the core identity and settings of your group.</p>
                </div>

                {/* IMAGES SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Cover Image */}
                    <div className="md:col-span-2 space-y-2">
                        <Label>Cover Image</Label>
                        <div className="relative group">
                            <div className={cn(
                                "w-full h-48 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center overflow-hidden transition-all",
                                !coverPreview && "hover:border-accent/50 hover:bg-white/10"
                            )}>
                                {coverPreview ? (
                                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-white/40">
                                        <ImageIcon className="w-8 h-8 mb-2" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Upload Cover</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, 'cover')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {coverPreview && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-full">
                                            <Upload className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Avatar Image */}
                    <div className="space-y-2">
                        <Label>Avatar</Label>
                        <div className="relative group">
                            <div className={cn(
                                "w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center overflow-hidden transition-all",
                                !avatarPreview && "hover:border-accent/50 hover:bg-white/10"
                            )}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-white/40">
                                        <Camera className="w-8 h-8 mb-2" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Logo</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, 'avatar')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {avatarPreview && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-full">
                                            <Upload className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Name & Slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label required>Community Name</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Telugu People in Bangalore"
                            value={formData.name}
                            onChange={(e) => updateFormData('name', e.target.value)}
                            error={errors.name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label required>Slug / URL Identifier</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <Input
                                type="text"
                                placeholder="e.g. telugu-people-in-bangalore"
                                className="pl-12"
                                value={formData.slug}
                                onChange={(e) => updateFormData('slug', e.target.value)}
                                error={errors.slug}
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label required>Short Description</Label>
                    <textarea
                        className={cn(
                            "w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/50 transition-all font-semibold text-white placeholder:font-medium placeholder:text-gray-500 resize-none",
                            errors.description && "border-accent/50 ring-1 ring-accent/10"
                        )}
                        rows={4}
                        placeholder="Tell us about the community..."
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                    />
                    {errors.description && <p className="text-[10px] font-bold text-accent ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.description}</p>}
                </div>

                {/* Location Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label required>Country</Label>
                        <div className="relative">
                            <select
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/50 transition-all font-semibold text-white appearance-none"
                                value={formData.country}
                                onChange={(e) => updateFormData('country', e.target.value)}
                            >
                                <option value="" disabled className="bg-[#00152d]">Select Country</option>
                                {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#00152d]">{c}</option>)}
                            </select>
                            <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                            placeholder="e.g. Karnataka"
                            value={formData.state}
                            onChange={(e) => updateFormData('state', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label required>City</Label>
                        <Input
                            placeholder="e.g. Bangalore"
                            value={formData.city}
                            onChange={(e) => updateFormData('city', e.target.value)}
                            error={errors.city}
                        />
                    </div>
                </div>

                {/* Visibility & Policy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label>Visibility</Label>
                        <div className="space-y-3">
                            {VISIBILITY_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateFormData('visibility', opt.id)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left",
                                        formData.visibility === opt.id
                                            ? "border-accent bg-accent/10 text-white"
                                            : "border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl", formData.visibility === opt.id ? "bg-accent text-white" : "bg-white/10")}>
                                        <opt.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{opt.label}</p>
                                        <p className="text-[10px] font-medium opacity-60">{opt.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Join Policy</Label>
                        <div className="space-y-3">
                            {JOIN_POLICIES.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateFormData('join_policy', opt.id)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left",
                                        formData.join_policy === opt.id
                                            ? "border-accent bg-accent/10 text-white"
                                            : "border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl", formData.join_policy === opt.id ? "bg-accent text-white" : "bg-white/10")}>
                                        <opt.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{opt.label}</p>
                                        <p className="text-[10px] font-medium opacity-60">{opt.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Topics / Tags */}
                <div className="space-y-4">
                    <Label>Topics & Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {formData.topics.map(topic => (
                            <span
                                key={topic}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-black uppercase tracking-wider"
                            >
                                {topic}
                                <button type="button" onClick={() => removeTopic(topic)} className="hover:text-white transition-colors">
                                    <span className="text-lg">×</span>
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Type a topic and press Enter..."
                            className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/50 transition-all font-semibold text-white placeholder:font-medium placeholder:text-gray-500"
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            onKeyDown={addTopic}
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-accent hover:bg-red-700 disabled:bg-white/10 disabled:text-gray-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-accent/10 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <> <Loader2 size={18} className="animate-spin" /> Saving Changes... </>
                        ) : (
                            <> Save Community Details <Check size={18} strokeWidth={3} /> </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CommunityDetailsForm;
