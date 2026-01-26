import React, { useState, useEffect } from 'react';
import { Navbar } from "@/components/layout/Navbar";
import { useCountry } from "@/context/CountryContext";
import { Footer } from "@/components/layout/Footer";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ContactModal } from "@/components/contact/ContactModal";
import {
    MapPin, Star, Heart, Share2, ArrowLeft, CheckCircle,
    Bed, Bath, Users, Square, Wifi, Car, Utensils, Tv,
    Wind, Droplets, Shield, Sparkles, Phone, MessageCircle,
    ChevronLeft, ChevronRight, ShieldCheck, Mail,
    Home, Building, Key, Lock, Zap, Coffee, Dumbbell, Waves,
    Camera, Maximize2, Award, Crown, Thermometer, Wine,
    TreePine, Cloud, Waves as Pool, Sun, Moon,
    Sparkle, Gem, Flower, Trees, Mountain,
    Calendar, Clock, User, X, Copy, CopyCheck,
    Instagram, Facebook, Linkedin, Twitter, Youtube, Globe, Monitor, ExternalLink
} from "lucide-react";
import { useGetPropertyByIdQuery, useGetMyListingsQuery, useGetHostProfileQuery } from '@/store/api/hostApi';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";

export default function RoomPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatPrice } = useCountry();
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactType, setContactType] = useState('inquiry');
    const [isFavorite, setIsFavorite] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);
    const [showPhoneNumber, setShowPhoneNumber] = useState(false);

    const location = useLocation();

    // 1. Try fetching public data (fails for unverified)
    const { data: apiData, isLoading: isApiLoading, isError: isApiError, refetch } = useGetPropertyByIdQuery(id, { skip: !id });

    // 2. Fetch owner options (in case user is the owner viewing unverified content)
    const { data: myListings } = useGetMyListingsQuery();
    const { data: hostProfile } = useGetHostProfileQuery();

    // 3. Resolve Data Priority: API -> Location State -> My Listings Finding
    const resolvedData = React.useMemo(() => {
        // A. If API worked, use it.
        if (apiData?.property) return apiData;

        // B. If not, try location state (from dashboard click)
        if (location.state?.property) return { property: location.state.property, host: hostProfile };

        // C. If not, try finding in My Listings (robust against refresh)
        if (myListings && Array.isArray(myListings)) {
            console.log("🔍 Searching MyListings for ID:", id, "Available:", myListings.map(p => p.id || p._id));
            const found = myListings.find(p => String(p._id) === String(id) || String(p.id) === String(id));
            if (found) return { property: found, host: hostProfile };
        }

        return null;
    }, [apiData, location.state, myListings, id, hostProfile]);

    const data = resolvedData;
    const isLoading = (isApiLoading && !data) || (!data && !isApiError && !myListings); // Keep loading if we are waiting for myListings
    const isError = isApiError && !data && myListings; // Error only if API failed AND myListings loaded but didn't have it

    console.log("📊 RoomPage Data Resolution:", {
        source: apiData ? 'API' : (location.state?.property ? 'State' : (data ? 'MyListings' : 'None')),
        data,
        isApiLoading,
        myListingsLen: myListings?.length
    });

    // Refresh data on mount
    useEffect(() => {
        if (id) {
            refetch();
        }
    }, [id, refetch]);

    // Copy to clipboard
    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            if (type === 'email') {
                setCopiedEmail(true);
                toast.success("Email copied");
                setTimeout(() => setCopiedEmail(false), 2000);
            } else if (type === 'phone') {
                setCopiedPhone(true);
                toast.success("Phone copied");
                setTimeout(() => setCopiedPhone(false), 2000);
            }
        }).catch(err => {
            console.error('Failed to copy', err);
            toast.error("Failed to copy");
        });
    };

    // Process API data
    const listing = React.useMemo(() => {
        if (!data || !data.property) return null;

        const p = data.property;
        const hostObj = p.Host || p.host || p.creator || {};
        const userObj = hostObj.User || {};

        const hostPhone = hostObj.phone_number || userObj.phone || "";
        const hostEmail = userObj.email || "";

        // Social Media Extraction (Strictly from Host Data)
        const socialLinks = {
            whatsapp: hostObj.whatsapp || "",
            instagram: hostObj.instagram || "",
            facebook: hostObj.facebook || "",
            linkedin: hostObj.linkedin || "",
            twitter: hostObj.twitter || "",
            youtube: hostObj.youtube || "",
            website: hostObj.website || ""
        };

        const photos = Array.isArray(p.photos) && p.photos.length > 0
            ? p.photos
            : [
                "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?q=80&w=2070&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=2070&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=2070&auto=format&fit=crop",
            ];

        const amenityIcons = {
            'Wifi': Wifi, 'Parking': Car, 'Air Conditioning': Wind, 'TV': Tv,
            'Kitchen': Utensils, 'Pool': Pool, 'Gym': Dumbbell, 'Pet Friendly': Heart,
            'Security': Shield, 'Elevator': Building, 'Laundry': Droplets,
            'Balcony': Sun, 'Garden': Flower
        };

        const amenities = Array.isArray(p.amenities) ? p.amenities : [];
        const processedAmenities = [];
        const essentials = [], comfort = [], luxury = [], safety = [];

        amenities.forEach(amenity => {
            const name = typeof amenity === 'string' ? amenity : amenity.name || '';
            const icon = amenityIcons[name] || CheckCircle;
            const item = { name, icon };

            if (['Wifi', 'TV', 'Air Conditioning', 'Kitchen', 'Laundry', 'Heating', 'Internet'].includes(name)) essentials.push(item);
            else if (['Pool', 'Gym', 'Parking', 'Balcony', 'Garden'].includes(name)) comfort.push(item);
            else if (['Security', 'Fire Extinguisher'].includes(name)) safety.push(item);
            else luxury.push(item);
        });

        if (essentials.length) processedAmenities.push({ category: 'Essentials', items: essentials });
        if (comfort.length) processedAmenities.push({ category: 'Comfort', items: comfort });
        if (safety.length) processedAmenities.push({ category: 'Safety', items: safety });
        if (luxury.length) processedAmenities.push({ category: 'Features', items: luxury });

        if (processedAmenities.length === 0) {
            processedAmenities.push({
                category: 'Essentials',
                items: [{ name: 'WiFi', icon: Wifi }, { name: 'AC', icon: Wind }, { name: 'TV', icon: Tv }]
            });
        }

        const highlights = [];
        if (p.guests) highlights.push({ icon: Users, text: `${p.guests} Guests`, label: 'Capacity' });
        if (p.bedrooms) highlights.push({ icon: Bed, text: `${p.bedrooms} Bedrooms`, label: 'Sleeping' });
        if (p.bathrooms) highlights.push({ icon: Bath, text: `${p.bathrooms} Baths`, label: 'Bathroom' });
        if (p.area) highlights.push({ icon: Square, text: `${p.area} sq.ft`, label: 'Area' });

        return {
            id: p.id,
            title: (p.title && p.title.toLowerCase() !== 'untitled property') ? p.title : `${p.property_type || 'Property'} in ${p.city || 'Location'}`,
            subtitle: p.privacy_type ? p.privacy_type : 'Entire Place',
            description: p.description || "A comfortable and well-maintained property perfect for your stay.",
            location: {
                city: p.city || "",
                country: p.country || "",
                address: p.address || "",
            },
            price: {
                hourly: parseFloat(p.price_per_hour) || 0,
                nightly: parseFloat(p.price_per_night) || 0,
                monthly: parseFloat(p.price_per_month) || 0,
                currency: p.currency || 'INR',
                securityDeposit: p.security_deposit || 0,
            },
            stats: {
                bedrooms: p.bedrooms || 0,
                bathrooms: p.bathrooms || 0,
                guests: p.guests || 0,
                propertyType: p.property_type || 'Apartment',
            },
            ratings: {
                overall: hostObj.rating || 4.8,
                reviews: hostObj.review_count || 12,
            },
            host: {
                id: hostObj.id,
                name: hostObj.full_name || "Property Host",
                initials: (hostObj.full_name || "Host").slice(0, 2).toUpperCase(),
                title: hostObj.occupation || "Superhost",
                avatar: hostObj.selfie_photo || null,
                email: hostEmail,
                phone: hostPhone,
                socials: socialLinks,
                isVerified: hostObj.status === 'approved',
                responseTime: hostObj.response_time || "1 hour",
                languages: hostObj.languages || ["English"],
                joinedDate: new Date(hostObj.created_at || Date.now()).getFullYear(),
                description: hostObj.description || "Dedicated to providing a comfortable stay.",
            },
            photos,
            amenities: processedAmenities,
            highlights,
            isVerified: p.status === 'approved',
            availability: {
                status: p.status === 'approved' ? "Available" : "Booked",
                minStay: p.minimum_stay || 1,
            },
            rules: Array.isArray(p.rules) ? p.rules : [],
        };
    }, [data]);

    const handleContact = (type) => { setContactType(type); setIsContactOpen(true); };
    const handleFavorite = () => { setIsFavorite(!isFavorite); toast.success(isFavorite ? "Removed" : "Saved"); };
    const nextImage = () => setCurrentImageIndex((p) => (p + 1) % listing.photos.length);
    const prevImage = () => setCurrentImageIndex((p) => (p - 1 + listing.photos.length) % listing.photos.length);

    const handleCallHost = () => listing.host.phone ? window.location.href = `tel:${listing.host.phone}` : toast.error("No phone");
    const handleEmailHost = () => listing.host.email ? window.location.href = `mailto:${listing.host.email}` : toast.error("No email");
    const handleWhatsAppHost = () => {
        if (listing.host.phone) {
            window.open(`https://wa.me/${listing.host.phone.replace(/\D/g, '')}?text=Hi, I'm interested in ${listing.title}`, '_blank');
        } else toast.error("No phone");
    };

    const handleSocialClick = (platform, handle) => {
        if (!handle) return;
        let url = handle;
        if (!url.startsWith('http')) {
            if (platform === 'whatsapp') url = `https://wa.me/${handle.replace(/\D/g, '')}`;
            else if (platform === 'instagram') url = `https://instagram.com/${handle.replace('@', '')}`;
            else if (platform === 'facebook') url = `https://facebook.com/${handle}`;
            else if (platform === 'twitter') url = `https://twitter.com/${handle}`;
            else if (platform === 'linkedin') url = `https://linkedin.com/in/${handle}`;
            else if (platform === 'youtube') url = `https://youtube.com/@${handle}`;
            else if (platform === 'website') url = `https://${handle}`;
        }
        window.open(url, '_blank');
    };

    const { activeCountry } = useCountry();

    if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#CB2A25] border-t-transparent rounded-full animate-spin" /></div>;
    // logic: if we have data (either from API or state), we show it. 
    // If we have NO data and (isError is true OR we attempted to load), then show not found.
    if ((!data && isError) || !listing) return <div className="min-h-screen flex items-center justify-center">Property not found</div>;

    // Strict Country Check
    if (activeCountry && listing.location.country !== activeCountry.name) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] text-[#00142E]">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-2">No data found</h2>
                    <p className="text-gray-500">This property is not listed in {activeCountry.name}.</p>
                    <Button onClick={() => navigate('/search')} className="mt-6 bg-[#00142E] text-white rounded-full px-8">
                        View All Accommodations
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    const displayPrice = listing.price.monthly > 0
        ? { amount: listing.price.monthly, period: 'month' }
        : listing.price.nightly > 0
            ? { amount: listing.price.nightly, period: 'night' }
            : { amount: listing.price.hourly, period: 'hour' };

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans text-[#00142E]">
            <Navbar />

            {/* Premium Hero Section */}
            <div className="relative h-[55vh] md:h-[65vh] w-full overflow-hidden group">
                <AnimatePresence mode='wait'>
                    <motion.img
                        key={currentImageIndex}
                        src={listing.photos[currentImageIndex]}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                </AnimatePresence>

                {/* Cinema Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#00142E]/90 via-[#00142E]/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#00142E]/20 to-transparent" />

                {/* Hero Content */}
                <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-10 md:pb-16">
                    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="flex gap-3 mb-4">
                            {listing.isVerified && (
                                <Badge className="bg-[#CB2A25] text-white hover:bg-[#a0221e] border-none px-3 py-1.5 text-sm font-bold shadow-lg shadow-[#CB2A25]/20 backdrop-blur-md">
                                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Verified Residence
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-tight tracking-tight drop-shadow-2xl">
                            {listing.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-white/90 font-medium max-w-2xl mb-8 flex items-center gap-2 drop-shadow-lg">
                            <MapPin className="w-5 h-5 text-[#CB2A25]" />
                            {listing.location.city}, {listing.location.country}
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Button
                                onClick={() => setIsFullscreen(true)}
                                size="lg"
                                className="bg-white text-[#00142E] hover:bg-white/90 font-bold rounded-full h-14 px-8 shadow-2xl transition-transform hover:scale-105"
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                View Gallery
                            </Button>
                            <Button
                                onClick={handleFavorite}
                                size="lg"
                                variant="outline"
                                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 rounded-full h-14 px-8 font-bold transition-transform hover:scale-105"
                            >
                                <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-[#CB2A25] text-[#CB2A25]' : ''}`} />
                                {isFavorite ? 'Saved' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hero Navigation */}
                <div className="absolute bottom-12 right-12 hidden md:flex gap-4">
                    <button onClick={prevImage} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#00142E] transition-all">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={nextImage} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#00142E] transition-all">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Content Column */}
                    <div className="lg:col-span-8 space-y-16">

                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {listing.highlights.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-md hover:-translate-y-1">
                                    <div className="w-10 h-10 rounded-full bg-[#CB2A25]/5 flex items-center justify-center text-[#CB2A25]">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#00142E] text-base">{item.text}</div>
                                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">{item.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-2xl font-bold text-[#00142E] mb-6">About this place</h2>
                            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm leading-relaxed text-gray-600 text-lg whitespace-pre-wrap">
                                {listing.description}
                            </div>
                        </div>

                        {/* Amenities */}
                        <div>
                            <h2 className="text-2xl font-bold text-[#00142E] mb-6">What this place offers</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {listing.amenities.map((category, idx) => (
                                    <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                                        <h3 className="font-bold text-[#00142E] mb-4 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#CB2A25]" />
                                            {category.category}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {category.items.map((am, i) => (
                                                <div key={i} className="flex items-center gap-3 text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                                    <am.icon className="w-5 h-5 text-gray-400" />
                                                    <span className="font-medium text-sm">{am.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Host Section */}
                        <div className="bg-[#00142E] rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#CB2A25]/20 rounded-full blur-[80px]" />

                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                <div className="relative">
                                    {listing.host.avatar ? (
                                        <img src={listing.host.avatar} className="w-32 h-32 rounded-full border-4 border-white/10 object-cover" alt="Host" />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full border-4 border-white/10 bg-blue-600 flex items-center justify-center text-4xl font-bold text-white tracking-widest shadow-inner">
                                            {listing.host.initials}
                                        </div>
                                    )}
                                    {listing.host.isVerified && (
                                        <div className="absolute bottom-0 right-0 bg-[#CB2A25] text-white p-2 rounded-full border-4 border-[#00142E]">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-3xl font-bold mb-2">Hosted by {listing.host.name}</h3>
                                    <p className="text-white/60 text-lg mb-6 max-w-xl">{listing.host.description}</p>

                                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                                        <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div className="text-xl font-bold">{listing.host.responseTime}</div>
                                            <div className="text-xs text-white/40 uppercase tracking-wider">Response Time</div>
                                        </div>
                                        <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div className="text-xl font-bold">{listing.host.joinedDate}</div>
                                            <div className="text-xs text-white/40 uppercase tracking-wider">Joined In</div>
                                        </div>
                                    </div>



                                    <div className="flex gap-2">
                                        {listing.host.socials.whatsapp && (
                                            <button onClick={() => handleSocialClick('whatsapp', listing.host.socials.whatsapp)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-colors">
                                                <FaWhatsapp className="w-6 h-6 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.instagram && (
                                            <button onClick={() => handleSocialClick('instagram', listing.host.socials.instagram)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-pink-600 flex items-center justify-center transition-colors">
                                                <Instagram className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.facebook && (
                                            <button onClick={() => handleSocialClick('facebook', listing.host.socials.facebook)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-colors">
                                                <Facebook className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.twitter && (
                                            <button onClick={() => handleSocialClick('twitter', listing.host.socials.twitter)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-blue-400 flex items-center justify-center transition-colors">
                                                <Twitter className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.linkedin && (
                                            <button onClick={() => handleSocialClick('linkedin', listing.host.socials.linkedin)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-blue-700 flex items-center justify-center transition-colors">
                                                <Linkedin className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.youtube && (
                                            <button onClick={() => handleSocialClick('youtube', listing.host.socials.youtube)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-600 flex items-center justify-center transition-colors">
                                                <Youtube className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {listing.host.socials.website && (
                                            <button onClick={() => handleSocialClick('website', listing.host.socials.website)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-gray-500 flex items-center justify-center transition-colors">
                                                <Globe className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map Section */}
                        <div>
                            <h2 className="text-2xl font-bold text-[#00142E] mb-6">Where you'll be</h2>
                            <div className="relative h-96 w-full rounded-[2rem] overflow-hidden group shadow-lg border border-gray-100">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${listing.location.city}, ${listing.location.country}`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                    frameBorder="0"
                                    scrolling="no"
                                    marginHeight="0"
                                    marginWidth="0"
                                    className="filter grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 w-full h-full"
                                    title="Property Location"
                                />
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listing.location.city}, ${listing.location.country}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center group cursor-pointer"
                                >
                                    <div className="bg-white/90 backdrop-blur-md text-[#00142E] px-8 py-4 rounded-full font-bold shadow-2xl transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-3 border border-white/50">
                                        <div className="w-8 h-8 rounded-full bg-[#CB2A25]/10 flex items-center justify-center text-[#CB2A25]">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <span>Open in Google Maps</span>
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    </div>
                                </a>
                            </div>
                            <div className="mt-4 flex items-start gap-2 text-gray-500 text-sm">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>{listing.location.city}, {listing.location.country}. Exact location provided after booking.</p>
                            </div>
                        </div>

                    </div>

                    {/* Right Sticky Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-28 space-y-6">

                            {/* Booking Card */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#00142E]/5 border border-gray-100">
                                <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-50">
                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-[#00142E]">
                                                {formatPrice(displayPrice.amount)}
                                            </span>
                                            <span className="text-gray-500 font-medium text-lg">
                                                / {displayPrice.period}
                                            </span>
                                        </div>
                                        {listing.price.securityDeposit > 0 && (
                                            <div className="text-xs text-green-600 font-bold mt-1 inline-flex items-center bg-green-50 px-2 py-0.5 rounded-full">
                                                + {formatPrice(listing.price.securityDeposit)} deposit
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Check-in</div>
                                            <div className="font-bold text-[#00142E]">After 2:00 PM</div>
                                        </div>
                                        <div className="w-px bg-gray-200" />
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Status</div>
                                            <div className={`font-bold ${listing.availability.status === 'Available' ? 'text-green-600' : 'text-red-500'}`}>
                                                {listing.availability.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-600">Guests</span>
                                        <span className="font-bold text-[#00142E]">{listing.stats.guests} Max</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">

                                    <Button
                                        onClick={handleWhatsAppHost}
                                        className="w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-lg font-bold shadow-lg shadow-[#25D366]/20"
                                    >
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        WhatsApp
                                    </Button>


                                    {/* Social Quick Links */}
                                    <div className="flex gap-2 justify-center pt-2">
                                        {listing.host.socials.instagram && (
                                            <button onClick={() => handleSocialClick('instagram', listing.host.socials.instagram)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition-colors">
                                                <Instagram className="w-4 h-4" />
                                            </button>
                                        )}
                                        {listing.host.socials.website && (
                                            <button onClick={() => handleSocialClick('website', listing.host.socials.website)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                                                <Globe className="w-4 h-4" />
                                            </button>
                                        )}
                                        {listing.host.socials.linkedin && (
                                            <button onClick={() => handleSocialClick('linkedin', listing.host.socials.linkedin)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors">
                                                <Linkedin className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 text-center text-xs text-gray-400 font-medium">
                                    You won't be charged yet
                                </div>
                            </div>

                            {/* Trust Badge */}
                            <div className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#00142E]">Verified Listing</h4>
                                    <p className="text-xs text-gray-500">Inspected for quality & safety</p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Gallery Overlay Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col"
                    >
                        <div className="p-6 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Gallery ({currentImageIndex + 1}/{listing.photos.length})</h3>
                            <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
                        </div>
                        <div className="flex-1 flex items-center justify-center relative p-4">
                            <motion.img
                                key={currentImageIndex}
                                src={listing.photos[currentImageIndex]}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                            />
                            <button onClick={prevImage} className="absolute left-4 p-4 hover:bg-white/10 rounded-full text-white"><ChevronLeft className="w-10 h-10" /></button>
                            <button onClick={nextImage} className="absolute right-4 p-4 hover:bg-white/10 rounded-full text-white"><ChevronRight className="w-10 h-10" /></button>
                        </div>
                        <div className="p-6 flex gap-2 overflow-x-auto justify-center">
                            {listing.photos.map((p, i) => (
                                <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === currentImageIndex ? 'border-[#CB2A25] scale-110' : 'border-transparent opacity-50'}`}>
                                    <img src={p} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ContactModal
                isOpen={isContactOpen}
                onClose={() => setIsContactOpen(false)}
                listing={listing}
                type={contactType}
                onSuccess={() => {
                    toast.success("Message sent successfully!");
                    setIsContactOpen(false);
                }}
            />
            <Footer />
        </div>
    );
}