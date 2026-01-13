import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export const InfoCard = ({ user }) => {
    const [showFullInfo, setShowFullInfo] = useState(false);

    const hasSocials = user?.whatsapp || user?.facebook || user?.instagram;
    const addressString = [user?.address, user?.city, user?.state, user?.country].filter(Boolean).join(", ");

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative mb-4">
            {/* Header Actions */}
            <div className="absolute top-4 right-4">
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">{user?.full_name || user?.name || "User Name"}</h2>

            <div className="space-y-3 text-sm">
                <div className="flex">
                    <span className="w-32 text-gray-500 flex-shrink-0">Full Name:</span>
                    <span className="text-gray-900 font-medium">{user?.full_name || user?.name || "Not specified"}</span>
                </div>

                {/* <div className="flex">
                    <span className="w-32 text-gray-500 flex-shrink-0">Email:</span>
                    <span className="text-gray-900">{user?.email || "Not specified"}</span>
                </div> */}

                <div className="flex">
                    <span className="w-32 text-gray-500 flex-shrink-0">Phone:</span>
                    <span className="text-gray-900">{user?.phone || "Not specified"}</span>
                </div>

                <div className="flex">
                    <span className="w-32 text-gray-500 flex-shrink-0">Address:</span>
                    <span className="text-gray-900">{addressString || "Not specified"}</span>
                </div>

                {/* Socials */}
                {hasSocials && (
                    <div className="flex pt-2">
                        <span className="w-32 text-gray-500 flex-shrink-0">Socials:</span>
                        <div className="flex gap-3">
                            {user?.whatsapp && (
                                <a href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:opacity-80 font-medium">WhatsApp</a>
                            )}
                            {user?.facebook && (
                                <a href={user.facebook.startsWith('http') ? user.facebook : `https://${user.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:opacity-80 font-medium">Facebook</a>
                            )}
                            {user?.instagram && (
                                <a href={user.instagram.startsWith('http') ? user.instagram : `https://${user.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:opacity-80 font-medium">Instagram</a>
                            )}
                        </div>
                    </div>
                )}

                {/* Collapsible Info (Work/Bio placeholders) */}
                {showFullInfo && (
                    <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex">
                            <span className="w-32 text-gray-500 flex-shrink-0">Work:</span>
                            <span className="text-blue-500 hover:underline cursor-pointer">{user?.occupation || "Not specified"}</span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-gray-500 flex-shrink-0">About:</span>
                            <span className="text-gray-900">{user?.bio || "No bio provided."}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                    onClick={() => setShowFullInfo(!showFullInfo)}
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                    {showFullInfo ? "Hide full information" : "Show full information"}
                </button>
            </div>
        </div>
    );
};
