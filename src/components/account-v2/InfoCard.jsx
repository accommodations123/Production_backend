import React, { useState } from 'react';
import { ChevronDown, MapPin, Phone, Briefcase, Info, X, Facebook, Instagram, MessageCircle } from 'lucide-react';

export const InfoCard = ({ user }) => {
    const [showFullInfo, setShowFullInfo] = useState(false);

    const hasSocials = user?.whatsapp || user?.facebook || user?.instagram;
    const addressString = [user?.address, user?.city, user?.state, user?.country].filter(Boolean).join(", ");

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-neutral/10 to-neutral/20 shadow-xl border border-neutral/30 backdrop-blur-sm">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-neutral/20 to-accent/5 rounded-full blur-2xl"></div>

            <div className="relative z-10 p-6">
                {/* Header with Gradient Border */}
                <div className="mb-6 pb-4 border-b border-neutral/30">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-primary">
                                {user?.full_name || user?.name || "User Name"}
                            </h2>
                            <p className="text-sm text-primary/50 mt-1">Profile Information</p>
                        </div>
                        <div className="p-2 bg-accent rounded-xl shadow-lg">
                            <Info className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* Main Information Grid */}
                <div className="space-y-4 mb-6">
                    {/* Phone */}
                    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral/10 transition-all duration-200">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:shadow-md transition-shadow">
                            <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <span className="text-xs font-medium text-primary/50 uppercase tracking-wide">Phone Number</span>
                            <p className="text-sm font-semibold text-primary mt-0.5">{user?.phone || "Not specified"}</p>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral/10 transition-all duration-200">
                        <div className="p-2 bg-secondary/10 rounded-lg group-hover:shadow-md transition-shadow">
                            <MapPin className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="flex-1">
                            <span className="text-xs font-medium text-primary/50 uppercase tracking-wide">Address</span>
                            <p className="text-sm font-semibold text-primary mt-0.5">{addressString || "Not specified"}</p>
                        </div>
                    </div>

                    {/* Socials */}
                    {hasSocials && (
                        <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral/10 transition-all duration-200">
                            <div className="p-2 bg-accent/10 rounded-lg group-hover:shadow-md transition-shadow">
                                <MessageCircle className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1">
                                <span className="text-xs font-medium text-primary/50 uppercase tracking-wide">Social Links</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {user?.whatsapp && (
                                        <a
                                            href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow-md"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            WhatsApp
                                        </a>
                                    )}
                                    {user?.facebook && (
                                        <a
                                            href={user.facebook.startsWith('http') ? user.facebook : `https://${user.facebook}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow-md"
                                        >
                                            <Facebook className="w-3.5 h-3.5" />
                                            Facebook
                                        </a>
                                    )}
                                    {user?.instagram && (
                                        <a
                                            href={user.instagram.startsWith('http') ? user.instagram : `https://${user.instagram}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium transition-colors shadow-sm hover:shadow-md"
                                        >
                                            <Instagram className="w-3.5 h-3.5" />
                                            Instagram
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Collapsible Additional Info */}
                <div className={`overflow-hidden transition-all duration-300 ${showFullInfo ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="space-y-4 mb-4 pt-4 border-t border-neutral/30">
                        {/* Work */}
                        <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral/10 transition-all duration-200">
                            <div className="p-2 bg-accent/10 rounded-lg group-hover:shadow-md transition-shadow">
                                <Briefcase className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1">
                                <span className="text-xs font-medium text-primary/50 uppercase tracking-wide">Occupation</span>
                                <p className="text-sm font-semibold text-primary mt-0.5">{user?.occupation || "Not specified"}</p>
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral/10 transition-all duration-200">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:shadow-md transition-shadow">
                                <Info className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                                <span className="text-xs font-medium text-primary/50 uppercase tracking-wide">About</span>
                                <p className="text-sm text-primary/70 mt-0.5 leading-relaxed">{user?.bio || "No bio provided."}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setShowFullInfo(!showFullInfo)}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    <span>{showFullInfo ? "Hide" : "Show"} Additional Information</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFullInfo ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );
};
