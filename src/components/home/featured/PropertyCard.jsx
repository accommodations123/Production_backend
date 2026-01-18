import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Heart, Star, MapPin, Users, Wifi, Car, Utensils, Tv,
    Thermometer, Bed, CheckCircle, ShieldCheck, Dumbbell, ArrowRight, ExternalLink, Bath, MessageCircle
} from 'lucide-react';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { useCountry } from '@/context/CountryContext';
import { toast } from 'sonner';

export const CardContainer = ({ children, linkTo, className = "" }) => (
    <Link to={linkTo} className="group block h-full select-none focus:outline-none" aria-label="View details">
        <div className={`bg-white rounded-[1.5rem] border border-[#E5E7EB] hover:border-[#CB2A25]/20 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden relative ${className}`}>
            {children}
        </div>
    </Link>
);

export const PropertyCard = ({ property }) => {
    const { formatPrice } = useCountry();
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    if (!property) return null;

    // Helper to normalize image URLs
    const getValidImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&h=400&fit=crop";
        if (imagePath.startsWith('http')) return imagePath;
        return `/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
    };

    // Safely get property data
    const propertyData = {
        id: property.id || property._id || 'unknown',
        title: property.title || property.name || (property.property_type ? `${property.property_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}${property.city ? ` in ${property.city}` : ''}` : "Premium Stay"),
        location: property.city || property.location?.city || property.address || "Location Info",
        hostPreference: property.host_preference || "",
        image: getValidImageUrl((Array.isArray(property.photos) && property.photos.length > 0)
            ? property.photos[0]
            : (property.image || property.property_images?.[0])),
        isVerified: property.status === 'approved',
        status: property.status || 'pending',
        rating: property.rating || property.Host?.rating || property.host?.rating || 0,
        reviews: property.reviews || property.Host?.review_count || property.host?.review_count || 0,
        amenities: Array.isArray(property.amenities) ? property.amenities : [],
        bedrooms: property.bedrooms || property.stats?.bedrooms || 0,
        bathrooms: property.bathrooms || property.stats?.bathrooms || 0,
        area: property.area || property.stats?.area || "",
        guests: property.guests || property.stats?.guests || 0,
        price: {
            amount: property.price_per_night || property.price_per_month || property.price_per_hour || property.pricing?.perNight || property.pricing?.perMonth || 0,
            currency: property.currency || property.pricing?.currency || 'INR',
            period: (property.price_per_month || property.pricing?.perMonth) ? 'month' : (property.price_per_night || property.pricing?.perNight) ? 'night' : 'hour'
        },
        host: property.host || property.Host || property.creator || null,
        hostImage: getValidImageUrl(property.host?.profile_image || property.Host?.profile_image || property.host?.image || property.creator?.profile_image),
        // Contact Details
        phone: property.phone || property.mobile || property.host?.phone || property.Host?.phone,
        email: property.email || property.host?.email || property.Host?.email,
        whatsapp: property.whatsapp || property.phone || property.mobile || property.host?.phone, // Robust Fallback
        facebook: property.facebook || property.host?.facebook || property.Host?.facebook,
        instagram: property.instagram || property.host?.instagram || property.Host?.instagram,
    };

    const handleAction = (e, actionType, actionData) => {
        e.preventDefault(); // Prevent Navigation
        e.stopPropagation();

        if (!actionData) {
            toast.error(`Host has not provided ${actionType} details.`);
            return;
        }

        switch (actionType) {
            case 'WhatsApp':
                window.open(`https://wa.me/${actionData.replace(/\D/g, '')}`, '_blank');
                break;
            case 'Phone':
                window.open(`tel:${actionData}`, '_self');
                break;
            case 'Message':
                window.open(`sms:${actionData}`, '_self');
                break;
            case 'Email':
                window.open(`mailto:${actionData}`, '_self');
                break;
            case 'Facebook':
                const fbUrl = actionData.startsWith('http') ? actionData : `https://facebook.com/${actionData}`;
                window.open(fbUrl, '_blank');
                break;
            case 'Instagram':
                const instUrl = actionData.startsWith('http') ? actionData : `https://instagram.com/${actionData.replace('@', '')}`;
                window.open(instUrl, '_blank');
                break;
            default:
                break;
        }
    };

    return (
        <CardContainer key={propertyData.id} linkTo={`/rooms/${propertyData.id}`}>
            {/* Image Section */}
            <div className="relative h-64 overflow-hidden bg-gray-100">
                <img
                    src={propertyData.image}
                    alt={propertyData.title}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setIsImageLoaded(true)}
                    onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&h=400&fit=crop";
                        e.target.classList.remove('opacity-0');
                    }}
                    loading="lazy"
                />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                    {propertyData.isVerified ? (
                        <div className="bg-green-500/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-green-400/50">
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-bold text-white">Verified</span>
                        </div>
                    ) : (
                        <div className="bg-red-500/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-red-400/50">
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-bold text-white">Unverified</span>
                        </div>
                    )}
                    {propertyData.rating > 0 && (
                        <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/50">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-bold text-[#00142E]">{propertyData.rating}</span>
                        </div>
                    )}
                </div>

                {/* Favorite Button */}
                <div className="absolute top-4 right-4 z-20">
                    <button
                        className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md shadow-sm border border-white/20 ${isFavorited ? 'bg-[#CB2A25] text-white shadow-[#CB2A25]/30' : 'bg-black/20 text-white hover:bg-white hover:text-[#CB2A25]'}`}
                        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsFavorited(!isFavorited);
                        }}
                    >
                        <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                    </button>
                </div>

                {/* Host Image Overlay (Bottom Right) */}
                <div className="absolute bottom-3 right-3 z-20">
                    <div className="w-10 h-10 rounded-full p-0.5 bg-white shadow-lg">
                        <img
                            src={propertyData.hostImage}
                            alt="Host"
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex-grow flex flex-col gap-4">
                {/* Title & Location */}
                <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-tight line-clamp-1 text-[#00142E] group-hover:text-[#CB2A25] transition-colors">
                        {propertyData.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[#00142E]/60 text-sm font-medium">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1">{propertyData.location}</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 text-sm text-[#00142E]/70">
                    <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#CB2A25]" />
                        <span className="font-medium">{propertyData.guests}</span>
                    </div>
                    <div className="w-px h-3 bg-[#00142E]/10" />
                    <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4 text-[#CB2A25]" />
                        <span className="font-medium">{propertyData.bedrooms}</span>
                    </div>
                    {propertyData.bathrooms > 0 && (
                        <>
                            <div className="w-px h-3 bg-[#00142E]/10" />
                            <div className="flex items-center gap-1.5">
                                <Bath className="w-4 h-4 text-[#CB2A25]" />
                                <span className="font-medium">{propertyData.bathrooms}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Price & Actions Row */}
                <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-100">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-[#00142E]">
                                {propertyData.price.amount > 0 ? formatPrice(propertyData.price.amount) : "On Request"}
                            </span>
                            {propertyData.price.amount > 0 && (
                                <span className="text-xs font-medium text-[#00142E]/50">/{propertyData.price.period}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* WhatsApp */}
                        <button
                            className="group/btn relative w-9 h-9 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-lg hover:shadow-[#25D366]/30"
                            onClick={(e) => handleAction(e, 'WhatsApp', propertyData.whatsapp)}
                            title="WhatsApp"
                        >
                            <FaWhatsapp className="w-4.5 h-4.5" />
                        </button>

                        {/* Instagram */}
                        <button
                            className="group/btn relative w-9 h-9 rounded-full bg-pink-50 text-pink-500 hover:bg-pink-500 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-lg hover:shadow-pink-500/30"
                            onClick={(e) => handleAction(e, 'Instagram', propertyData.instagram)}
                            title="Instagram"
                        >
                            <FaInstagram className="w-4.5 h-4.5" />
                        </button>

                        {/* Facebook */}
                        <button
                            className="group/btn relative w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-lg hover:shadow-indigo-600/30"
                            onClick={(e) => handleAction(e, 'Facebook', propertyData.facebook)}
                            title="Facebook"
                        >
                            <FaFacebook className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>
        </CardContainer>
    );
};
