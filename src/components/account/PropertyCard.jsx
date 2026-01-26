import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Edit, Trash2, Eye, FileText, Video, AlertCircle, Wifi, Car, Utensils, Tv, Thermometer, Dumbbell, Bed, Clock, Lock, ImageOff } from "lucide-react"


export function PropertyCard({ property, onDelete }) {
    const [isDeleting, setIsDeleting] = useState(false)
    // const [timeLeft, setTimeLeft] = useState("") // Removed

    if (!property) return null

    const id = property._id || property.id
    const status = (property.status || "").toLowerCase()
    const isDeleted = property.is_deleted === true || property.is_deleted === "true"
    const photos = Array.isArray(property.photos) ? property.photos : []
    const photoUrl = photos[0] || (property.image) || null

    const propertyType = property.property_type || ""
    const city = property.city || ""
    const guests = property.guests || 0
    const bedrooms = property.bedrooms || 0
    const bathrooms = property.bathrooms || 0

    const amenities = Array.isArray(property.amenities) ? property.amenities : []
    const legalDocs = Array.isArray(property.legal_docs) ? property.legal_docs : []
    const hasVideo = !!property.video
    const rejectionReason = property.rejection_reason

    // Status badge configuration
    const getStatusBadge = () => {
        if (isDeleted) {
            return { text: "Deleted", className: "bg-gray-600/90 text-white backdrop-blur-md" }
        }
        switch (status) {
            case "approved":
                return { text: "Active", className: "bg-green-500/90 text-white backdrop-blur-md" }
            case "pending":
                return { text: "Pending", className: "bg-yellow-500/90 text-white backdrop-blur-md" }
            case "rejected":
                return { text: "Rejected", className: "bg-red-500/90 text-white backdrop-blur-md" }
            default:
                return { text: "Draft", className: "bg-gray-400/90 text-white backdrop-blur-md" }
        }
    }

    const statusBadge = getStatusBadge()
    const isPending = status === "pending"
    const isRejected = status === "rejected"

    // Helper for icons
    const getAmenityIcons = (amenities) => {
        const iconMap = {
            'wifi': <Wifi key="wifi" className="w-3 h-3 text-gray-500" />,
            'parking': <Car key="parking" className="w-3 h-3 text-gray-500" />,
            'kitchen': <Utensils key="kitchen" className="w-3 h-3 text-gray-500" />,
            'tv': <Tv key="tv" className="w-3 h-3 text-gray-500" />,
            'ac': <Thermometer key="ac" className="w-3 h-3 text-gray-500" />,
            'gym': <Dumbbell key="gym" className="w-3 h-3 text-gray-500" />,
        };

        const icons = [];
        amenities.forEach(amenity => {
            const lowerAmenity = amenity.toLowerCase();
            if (iconMap[lowerAmenity]) {
                icons.push(iconMap[lowerAmenity]);
            } else if (lowerAmenity.includes('wifi')) {
                icons.push(<Wifi key="wifi" className="w-3 h-3 text-accent" />);
            } else if (lowerAmenity.includes('parking')) {
                icons.push(<Car key="parking" className="w-3 h-3 text-accent" />);
            } else if (lowerAmenity.includes('kitchen')) {
                icons.push(<Utensils key="kitchen" className="w-3 h-3 text-accent" />);
            }
        });
        return icons.slice(0, 4);
    };

    // Format price
    const formatPriceDisplay = (price) => {
        if (!price) return "Price on request";
        return `₹${Number(price).toLocaleString()}`;
    }

    const priceDisplay = property.price_per_month
        ? `${formatPriceDisplay(property.price_per_month)} / month`
        : property.price_per_night
            ? `${formatPriceDisplay(property.price_per_night)} / night`
            : "Price on request";

    // Expiration logic removed as expired items are filtered out from the list

    // ... statusBadge logic

    // ... return statement start
    return (
        <div className={cn(
            "group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-accent/30 transition-all duration-300 overflow-hidden flex flex-col h-full",
            isDeleted && "opacity-60 grayscale"
        )}>
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden bg-gray-100">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={property.title || "Property"}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <ImageOff className="w-12 h-12 text-gray-400" />
                    </div>
                )}

                {/* Status Badge */}
                <div className={cn(
                    "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm z-10 uppercase tracking-wider",
                    statusBadge.className
                )}>
                    {statusBadge.text}
                </div>

                {/* Expiration Countdown Badge - Removed as expired items are hidden */}

                {/* ... rest of the component */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    {legalDocs.length > 0 && (
                        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm" title="Documents verified">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                    )}
                    {hasVideo && (
                        <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm" title="Video tour">
                            <Video className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                    )}
                </div>

                {isRejected && rejectionReason && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs p-2 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1 font-medium">{rejectionReason}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-grow">
                {/* ... rest of content section */}
                <div className="mb-3">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-accent transition-colors mb-1">
                        {property.title || "Untitled Listing"}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <span className="capitalize">{propertyType}</span>
                        {city && (
                            <>
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                <span>{city}</span>
                            </>
                        )}
                    </p>
                </div>

                {/* Specs */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg justify-start">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900">{guests}</span> Guests
                    </div>
                    <div className="w-px h-3 bg-gray-300" />
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900">{bedrooms}</span> Beds
                    </div>
                    <div className="w-px h-3 bg-gray-300" />
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900">{bathrooms}</span> Bath
                    </div>
                </div>

                {/* Price and Amenities */}
                <div className="flex items-center justify-between mb-4 mt-auto">
                    <div>
                        <p className="text-sm font-bold text-gray-900">{priceDisplay.split(' / ')[0]}</p>
                        <p className="text-[10px] text-gray-500">{priceDisplay.includes('/') ? `/${priceDisplay.split(' / ')[1]}` : ''}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {getAmenityIcons(amenities)}
                        {amenities.length > 4 && (
                            <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded-md">+{amenities.length - 4}</span>
                        )}
                    </div>
                </div>

                {isPending && (
                    <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        <p className="text-xs text-amber-800 leading-tight">
                            Property under review. Usually takes 24-48h.
                        </p>
                    </div>
                )}

                {status === 'approved' && (
                    <div className="mb-4 bg-green-50 border border-green-100 rounded-lg p-2.5 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <p className="text-xs text-green-800 leading-tight">
                            Approved listings cannot be edited.
                        </p>
                    </div>
                )}

                {/* Actions Footer */}
                <div className="pt-3 border-t border-gray-100 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-semibold hover:border-accent hover:text-accent" asChild>
                        <Link to={`/rooms/${id}`} state={{ property }}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View
                        </Link>
                    </Button>
                    {status !== 'approved' && (
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs font-semibold hover:border-primary hover:text-primary" disabled={isDeleted} asChild>
                            <Link to={`/host/create?edit=${id}`}>
                                <Edit className="w-3.5 h-3.5 mr-1.5" />
                                Edit
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        disabled={isDeleted || isDeleting}
                        onClick={async () => {
                            if (typeof onDelete === "function") {
                                setIsDeleting(true)
                                try { await onDelete(id) } finally { setIsDeleting(false) }
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
