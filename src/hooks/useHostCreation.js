import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useCountry } from '@/context/CountryContext';
import { hostService } from '@/services/hostService';
import { getTermsFor } from '@/lib/host-terms-data';
import { useGetMeQuery, authApi } from '@/store/api/authApi';
import {
    useGetHostProfileQuery,
    useSaveHostMutation,
    useUploadFileMutation,
    useCreatePropertyDraftMutation,
    useUpdatePropertyBasicMutation,
    useUpdatePropertyAddressMutation,
    useUpdatePropertyPricingMutation,
    useUpdatePropertyAmenitiesMutation,
    useUpdatePropertyRulesMutation,
    useUpdatePropertyMediaMutation,
    useUpdatePropertyVideoMutation,
    useSubmitPropertyMutation,
    useGetPropertyByIdQuery,
    useGetMyListingsQuery,
    hostApi
} from '@/store/api/hostApi';

export const STEPS = [
    { title: "Basics", description: "Title, type & capacity" },
    { title: "Location", description: "Address & Country" },
    { title: "Pricing", description: "Price & Currency" },
    { title: "Media", description: "Photos & proofs" },
    { title: "Amenities", description: "Features & rules" },
    { title: "Review", description: "Final check" }
];

// Different form structures for different contribution types
const getFormDataStructure = (type = 'property') => {
    const baseStructure = {
        // Step 1: Identity
        fullName: "",
        email: "",
        phone: "",
        hostAddress: "",
        hostCity: "",
        hostCountry: "India",
        idType: "Aadhaar",
        profilePhoto: null,
        idProof: null,
        idNumber: "",

        // Step 2: Basics
        title: "",
        category: "student",
        type: "",
        privacyType: "entire place",
        petsAllowed: "",
        sqft: "",
        capacity: "",
        bedrooms: "",
        bathrooms: "",
        description: "",

        // Step 3: Location
        address: "",
        city: "",
        pincode: "",
        country: "",
        state: "",

        // Step 5: Media & Proofs
        images: [],
        video: null,
        propertyProof: null,

        // Step 6: Amenities & Rules
        amenities: [],
        customAmenities: [],
        rules: []
    };

    switch (type) {
        case 'property':
            return {
                ...baseStructure,
                // Pricing details for properties
                currency: "INR",
                pricePerHour: "",
                priceNight: "",
                priceMonth: "",
                hostPreference: "cultural_exchange", // 'cultural_exchange', 'community_stay', 'long_term'
                maxGuests: "",
                sharedSpaces: []
            };

        case 'event':
            return {
                ...baseStructure,
                // Event-specific fields
                eventType: "cultural", // 'cultural', 'festival', 'workshop', 'networking'
                startDate: "",
                endDate: "",
                startTime: "",
                endTime: "",
                maxAttendees: "",
                eventCategory: "community", // 'community', 'cultural', 'educational'
                eventPrice: "free", // 'free', 'donation', 'fixed_price'
                priceAmount: "",
                requirements: []
            };

        case 'group':
            return {
                ...baseStructure,
                // Group-specific fields
                groupType: "community", // 'community', 'professional', 'cultural', 'hobby'
                groupSize: "",
                meetingFrequency: "", // 'weekly', 'biweekly', 'monthly'
                membershipType: "open", // 'open', 'closed', 'invite_only'
                groupRules: [],
                topics: []
            };

        case 'local_guide':
            return {
                ...baseStructure,
                // Local guide fields
                languages: ["English", "Hindi"],
                areas: [],
                experience: "",
                guideType: "city", // 'city', 'cultural', 'food', 'historical'
                availability: "",
                preferredGroupSize: ""
            };

        case 'travel_companion':
            return {
                ...baseStructure,
                // Travel companion fields
                destinationCountry: "",
                destinationCity: "",
                travelDates: "",
                budgetPreference: "shared", // 'shared', 'separate'
                travelStyle: "cultural", // 'cultural', 'adventure', 'relaxation'
                languages: ["English", "Hindi"],
                maxCompanions: ""
            };

        case 'workshop':
            return {
                ...baseStructure,
                // Workshop fields
                workshopType: "cultural", // 'cultural', 'skill', 'art', 'cooking'
                duration: "",
                skillLevel: "beginner", // 'beginner', 'intermediate', 'advanced'
                materialsProvided: false,
                maxParticipants: "",
                prerequisites: []
            };

        default:
            return baseStructure;
    }
};

export function useHostCreation() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { activeCountry } = useCountry();

    // Auth State (Backend Verified)
    const { data: userData, isError: isAuthError } = useGetMeQuery();
    const { data: hostProfile, isError: isHostError } = useGetHostProfileQuery(undefined, {
        skip: !userData || isAuthError
    });

    const isExistingHost = !!hostProfile && !isHostError;

    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [contributionType, setContributionType] = useState('property');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    // API Mutations
    const [saveHost] = useSaveHostMutation();
    const [uploadFile] = useUploadFileMutation();
    const [createPropertyDraft] = useCreatePropertyDraftMutation();
    const [updatePropertyBasic] = useUpdatePropertyBasicMutation();
    const [updatePropertyAddress] = useUpdatePropertyAddressMutation();
    const [updatePropertyPricing] = useUpdatePropertyPricingMutation();
    const [updatePropertyAmenities] = useUpdatePropertyAmenitiesMutation();
    const [updatePropertyRules] = useUpdatePropertyRulesMutation();
    const [updatePropertyMedia] = useUpdatePropertyMediaMutation();
    const [updatePropertyVideo] = useUpdatePropertyVideoMutation();
    const [submitProperty] = useSubmitPropertyMutation();

    // Form State - Initialize with property type as default
    const [formData, setFormData] = useState(() => getFormDataStructure('property'));

    const [customAmenityInput, setCustomAmenityInput] = useState("");
    const [customRuleInput, setCustomRuleInput] = useState("");

    // Terms State
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [displayedTerms, setDisplayedTerms] = useState([]);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // Update form structure when contribution type changes
    useEffect(() => {
        if (contributionType) {
            setFormData(getFormDataStructure(contributionType));
        }
    }, [contributionType]);

    // Update Country in Form
    useEffect(() => {
        if (activeCountry) {
            setFormData(prev => ({
                ...prev,
                country: activeCountry,
                hostCountry: activeCountry.name
            }));
        }
    }, [activeCountry]);

    // Update Terms
    useEffect(() => {
        const terms = getTermsFor(formData.country?.code || "DEFAULT", formData.category);
        setDisplayedTerms(terms);
        setTermsAccepted(false);
    }, [formData.country, formData.category, contributionType]);

    // Auto-login check (Populate form from backend verified session)
    useEffect(() => {
        if (userData) {
            setFormData(prev => ({
                ...prev,
                email: userData.email || prev.email,
                phone: userData.phone || prev.phone,
                fullName: userData.full_name || userData.name || prev.fullName
            }));
        }

        if (hostProfile) {
            setFormData(prev => ({
                ...prev,
                hostAddress: hostProfile.address || prev.hostAddress,
                hostCity: hostProfile.city || prev.hostCity,
                hostCountry: hostProfile.country || prev.hostCountry,
                idType: hostProfile.id_type || prev.idType,
                idNumber: hostProfile.id_number || prev.idNumber,
            }));
        }
    }, [userData, hostProfile]);

    // === EDIT MODE LOGIC ===
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    // FETCH DATA FROM MY LISTINGS (OWNER VIEW) INSTEAD OF PUBLIC API
    const { data: myListings } = useGetMyListingsQuery(undefined, {
        skip: !editId || contributionType !== 'property'
    });

    // Fallback to public API (Only works for Approved)
    const { data: publicPropertyData } = useGetPropertyByIdQuery(editId, {
        skip: !editId || contributionType !== 'property' || !!myListings // Skip if we have myListings
    });

    useEffect(() => {
        if (editId) {
            let prop = null;

            // 1. Try finding in MyListings (Best for unverified/drafts)
            if (myListings && Array.isArray(myListings)) {
                prop = myListings.find(p => String(p.id) === String(editId) || String(p._id) === String(editId));
            }

            // 2. Fallback to public API
            if (!prop && publicPropertyData) {
                // Handle different response structures
                prop = publicPropertyData.property || publicPropertyData.data || publicPropertyData;
            }

            if (prop) {
                // Check if property is approved (read-only)
                if (prop.status === 'approved') {
                    setIsReadOnly(true);
                }

                setTermsAccepted(true); // Auto-accept to avoid blocking view

                setFormData(prev => ({
                    ...prev,
                    // Basics
                    title: prop.title || prop.name || prev.title,
                    category: prop.category || prop.category_slug || prev.category,
                    type: prop.property_type || prop.type || prev.type,
                    privacyType: prop.privacy_type || prev.privacyType,
                    petsAllowed: prop.pets_allowed ? "1" : "0",
                    sqft: prop.specs?.area || prop.area || prev.sqft,
                    capacity: prop.specs?.guests || prop.guests || prev.capacity,
                    bedrooms: prop.specs?.bedrooms || prop.bedrooms || prev.bedrooms,
                    bathrooms: prop.specs?.bathrooms || prop.bathrooms || prev.bathrooms,
                    description: prop.description || prev.description,

                    // Location - handle flattened or nested
                    address: prop.location?.address || prop.address || prev.address,
                    city: prop.location?.city || prop.city || prev.city,
                    state: prop.location?.state || prop.state || prev.state,
                    country: prop.location?.country || prop.country || prev.country,

                    // Pricing
                    currency: prop.pricing?.currency || prop.currency || "INR",
                    pricePerHour: prop.pricing?.price_per_hour || prop.price_per_hour || prev.pricePerHour,
                    priceNight: prop.pricing?.price_per_night || prop.price_per_night || prev.priceNight,
                    priceMonth: prop.pricing?.price_per_month || prop.price_per_month || prev.priceMonth,

                    // Media
                    // Map URL strings to objects { url, file: null }
                    images: (prop.photos || prop.images || []).map(url =>
                        typeof url === 'string' ? { url, file: null } : url
                    ),
                    video: prop.video ? { url: prop.video } : null,
                    propertyProof: (prop.legal_docs || [])[0] ? { url: prop.legal_docs[0] } : null,

                    // Amenities & Rules
                    amenities: prop.amenities || [],
                    rules: prop.rules || []
                }));
            }
        }
    }, [myListings, publicPropertyData, editId]);

    // Handlers
    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        if (!formData.email) {
            toast.error("Please enter a valid email address.");
            return;
        }
        try {
            await hostService.sendOtp({ email: formData.email, phone: formData.phone || "0000000000" });
            setShowOtpModal(true);
            toast.success("OTP sent to your email!");
        } catch (error) {
            console.error("Failed to send OTP:", error);
            const msg = error.message || "";
            if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
                toast.error("Too many OTP requests. Please wait a few minutes before trying again.");
            } else {
                toast.error("Failed to send OTP. Please try again.");
            }
        }
    };

    const handleVerifyOtp = async (otpCode) => {
        try {
            const response = await hostService.verifyOtp({ email: formData.email, phone: formData.phone || "0000000000", otp: otpCode });

            if (response) {
                if (response.user || response.data?.user) {
                    const userData = response.user || response.data?.user;
                    const safeUser = { ...userData, id: userData.id || userData._id };
                    localStorage.setItem("user", JSON.stringify(safeUser));
                }
                toast.success("Verification Successful! You are logged in.");
                setIsEmailVerified(true);
                // Invalidate getMe query to update global auth state
                dispatch(authApi.util.invalidateTags(['User']));
                setShowOtpModal(false);
            } else {
                if (response.message === "Email verified successfully" || response.success) {
                    toast.success("Email verified.");
                    setIsEmailVerified(true);
                    dispatch(authApi.util.invalidateTags(['User']));
                    setShowOtpModal(false);
                } else {
                    toast.error(`Verification failed: ${response.message}`);
                }
            }
        } catch (error) {
            console.error("Failed to verify OTP:", error);
            toast.error("Invalid OTP. Please try again.");
        }
    };

    const handleFileChange = (e, field, multiple = false) => {
        const files = Array.from(e.target.files);
        if (multiple) {
            const newImages = files.map(file => ({
                file,
                url: URL.createObjectURL(file)
            }));
            setFormData(prev => ({ ...prev, [field]: [...prev[field], ...newImages] }));
        } else {
            setFormData(prev => ({ ...prev, [field]: files[0] }));
        }
    };

    const removeArrayItem = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const toggleAmenity = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    const addCustomAmenity = () => {
        if (!customAmenityInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            customAmenities: [...prev.customAmenities, customAmenityInput.trim()]
        }));
        setCustomAmenityInput("");
    };

    const addRule = () => {
        if (!customRuleInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            rules: [...prev.rules, customRuleInput.trim()]
        }));
        setCustomRuleInput("");
    };

    // Updated validation for different contribution types
    const validateStep = (step) => {
        switch (step) {
            case 1: // Basics
                const hasTitle = formData.title && formData.title.trim() !== "";
                const hasCategory = !!formData.category;
                const hasDescription = formData.description && formData.description.trim() !== "";
                const hasType = !!formData.type;
                const hasSqft = formData.sqft !== "" && formData.sqft !== null && formData.sqft !== undefined;
                const hasCapacity = formData.capacity !== "" && formData.capacity !== null && formData.capacity !== undefined;
                return hasTitle && hasCategory && hasDescription && hasType && hasSqft && hasCapacity;

            case 2: // Location
                const hasAddress = formData.address && formData.address.trim() !== "";
                const hasCity = formData.city && formData.city.trim() !== "";
                const hasPincode = formData.pincode && formData.pincode.trim() !== "";
                return hasAddress && hasCity && hasPincode;

            case 3: // Pricing
                const hasPrice = formData.priceMonth !== "" && formData.priceMonth !== null && formData.priceMonth !== undefined;
                const hasCurrency = !!formData.currency;
                return hasPrice && hasCurrency;

            case 4: // Media
                return formData.images.length >= 1 && formData.propertyProof;

            case 5: // Amenities
                return (formData.amenities.length + formData.customAmenities.length) > 0;

            case 6: // Review
                return true;

            default:
                return false;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setDirection(1);
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        } else {
            toast.error("Please fill in all required fields for this step.");
        }
    };

    const prevStep = () => {
        setDirection(-1);
        setCurrentStep(prev => {
            if (prev === 2 && !contributionType) {
                return 1; // Go back to selection
            }
            return Math.max(prev - 1, 1);
        });
    };

    // Type-specific submission handlers
    const handleSubmitProperty = async (propertyId) => {
        // Your existing property submission logic
        await updatePropertyPricing({
            id: propertyId, data: {
                pricePerHour: Number(formData.pricePerHour) || 0,
                pricePerNight: Number(formData.priceNight) || 0,
                pricePerMonth: Number(formData.priceMonth) || 0,
                currency: formData.currency || 'INR'
            }
        }).unwrap();

        const combinedAmenities = [...formData.amenities, ...formData.customAmenities];
        if (combinedAmenities.length > 0) {
            await updatePropertyAmenities({ id: propertyId, amenities: combinedAmenities }).unwrap();
        }

        // Auto-add pending rule if exists
        const finalRules = [...formData.rules];
        if (customRuleInput.trim()) {
            finalRules.push(customRuleInput.trim());
        }

        if (finalRules.length > 0) {
            await updatePropertyRules({ id: propertyId, rules: finalRules }).unwrap();
        }

        // Filter for NEW images only (those with a file object)
        const newImages = formData.images.filter(img => img.file);
        if (newImages.length > 0) {
            const photoFd = new FormData();
            newImages.forEach(img => {
                photoFd.append('photo', img.file);
            });
            await updatePropertyMedia({ id: propertyId, formData: photoFd }).unwrap();
        }

        // Only upload video if it is a new File object (not an existing URL object)
        if (formData.video && formData.video instanceof File) {
            const videoFd = new FormData();
            videoFd.append('video', formData.video);
            await updatePropertyVideo({ id: propertyId, formData: videoFd }).unwrap();
        }


    };

    const handleSubmitEvent = async () => {
        // Event submission logic
        const eventPayload = {
            title: formData.title,
            description: formData.description,
            eventType: formData.eventType,
            category: formData.eventCategory,
            startDate: formData.startDate,
            endDate: formData.endDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: `${formData.address}, ${formData.city}`,
            maxAttendees: formData.maxAttendees,
            priceType: formData.eventPrice,
            priceAmount: formData.priceAmount || 0,
            requirements: formData.requirements,
            images: formData.images.map(img => img.url),
            hostId: userData?.id || userData?._id || userData?.user?.id || null
        };

        // If hostApi doesn't have createEvent, we should implement it or stick to hostService with credentials
        await hostService.createEvent(eventPayload);
    };

    const handleSubmitGroup = async () => {
        // Group submission logic
        const groupPayload = {
            name: formData.title,
            description: formData.description,
            type: formData.groupType,
            category: formData.category,
            location: `${formData.city}, ${formData.country?.name || 'Unknown'}`,
            size: formData.groupSize,
            meetingFrequency: formData.meetingFrequency,
            membershipType: formData.membershipType,
            rules: formData.groupRules,
            topics: formData.topics,
            adminId: userData?.id || userData?._id || userData?.user?.id || null
        };

        await hostService.createGroup(groupPayload);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isReadOnly) {
            toast.warning("This property is approved and cannot be modified.");
            return;
        }

        if (!termsAccepted) {
            toast.warning("Please accept the terms to continue.");
            return;
        }

        setIsLoading(true);
        try {
            // Fallback to localStorage if Redux state is missing or incomplete
            const localUserStr = localStorage.getItem("user");
            const localUser = localUserStr ? JSON.parse(localUserStr) : null;

            const effectiveUser = userData || localUser;

            if (!effectiveUser) throw new Error("User not authenticated. Session verification failed.");


            let userId = effectiveUser.id || effectiveUser._id || effectiveUser.user_id || effectiveUser.user?.id || effectiveUser.user?._id;

            if (!userId && localUser) {
                userId = localUser.id || localUser._id || localUser.user_id || localUser.user?.id;
            }

            if (!userId) {
                console.error("❌ User ID Extraction Failed. Object keys:", Object.keys(effectiveUser || {}));
                throw new Error("User ID missing. Authentication failed.");
            }
            userId = String(userId);

            let idPhotoUrl = "";
            let selfiePhotoUrl = "";

            if (formData.idProof) {
                const fd = new FormData();
                fd.append('images', formData.idProof);
                const res = await uploadFile(fd).unwrap();
                if (res.urls && res.urls.length > 0) idPhotoUrl = res.urls[0];
            }
            if (formData.profilePhoto) {
                const fd = new FormData();
                fd.append('images', formData.profilePhoto);
                const res = await uploadFile(fd).unwrap();
                if (res.urls && res.urls.length > 0) selfiePhotoUrl = res.urls[0];
            }

            const hostPayload = {
                user_id: Number(userId) || userId,
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                country: formData.hostCountry,
                city: formData.hostCity,
                address: formData.hostAddress,
                id_type: formData.idType,
                id_number: formData.idNumber,
                id_photo: idPhotoUrl,
                selfie_photo: selfiePhotoUrl,
                whatsapp: formData.phone, // 👈 Fallback to phone for contact method
                userId: userId,
                fullName: formData.fullName,
                idType: formData.idType,
                idNumber: formData.idNumber,
                idPhoto: idPhotoUrl,
                selfiePhoto: selfiePhotoUrl,
                contribution_type: contributionType // Add contribution type to host profile
            };

            // 5. Save Host Profile if not existing
            if (!isExistingHost) {
                await saveHost(hostPayload).unwrap();
                // RTK Query will update isExistingHost automatically via invalidateTags
            }

            // Handle different contribution types
            switch (contributionType) {
                case 'property':
                    // If we are editing, use the existing ID. If creating, create a draft.
                    let propertyId = editId;

                    if (!propertyId) {
                        const draftPayload = {
                            categoryId: formData.category,
                            propertyType: (formData.type || '').toLowerCase(),
                            privacyType: formData.privacyType
                        };
                        const draftRes = await createPropertyDraft(draftPayload).unwrap();
                        propertyId = draftRes.propertyId || (draftRes.data && draftRes.data.id) || draftRes.id;
                        if (!propertyId) throw new Error("Failed to create property draft ID.");

                        await updatePropertyBasic({
                            id: propertyId, data: {
                                title: formData.title || '',
                                description: formData.description || '',
                                guests: Number(formData.capacity) || 0,
                                bedrooms: Number(formData.bedrooms) || 0,
                                bathrooms: Number(formData.bathrooms) || 0,
                                petsAllowed: Number(formData.petsAllowed) || 0,
                                area: Number(formData.sqft) || 0
                            }
                        }).unwrap();
                    } else {
                        // On update, also update basic info
                        await updatePropertyBasic({
                            id: propertyId, data: {
                                title: formData.title || '',
                                description: formData.description || '',
                                guests: Number(formData.capacity) || 0,
                                bedrooms: Number(formData.bedrooms) || 0,
                                bathrooms: Number(formData.bathrooms) || 0,
                                petsAllowed: Number(formData.petsAllowed) || 0,
                                area: Number(formData.sqft) || 0
                            }
                        }).unwrap();
                    }

                    await updatePropertyAddress({
                        id: propertyId, data: {
                            country: formData.country?.name || 'India',
                            state: formData.state || '',
                            city: formData.city || '',
                            zip_code: formData.pincode || '',
                            street_address: formData.address || ''
                        }
                    }).unwrap();

                    await handleSubmitProperty(propertyId);

                    // Only submit for review if it's a new draft or user explicitly wants to re-submit
                    // For now, we always submit to ensure status is updated if needed
                    await submitProperty(propertyId).unwrap();
                    break;

                case 'event':
                    await handleSubmitEvent();
                    break;

                case 'group':
                    await handleSubmitGroup();
                    break;

                case 'local_guide':
                case 'travel_companion':
                case 'workshop':
                    // For other types, save as community contribution
                    const contributionPayload = {
                        type: contributionType,
                        title: formData.title,
                        description: formData.description,
                        location: `${formData.city}, ${formData.country?.name || 'Unknown'}`,
                        userId: userId,
                        details: formData // Store all form data as details
                    };
                    await hostService.createCommunityContribution(contributionPayload);
                    break;

                default:
                    throw new Error("Invalid contribution type");
            }

            // Differentiate success message
            const actionText = editId ? "Updated" : "Submitted";
            toast.success(`${getContributionTypeLabel(contributionType)} ${actionText} Successfully!`);
            navigate("/");

        } catch (error) {
            console.error("❌ Submission Workflow Error:", error);
            const msg = error.message || "Unknown error occurred.";
            toast.error(`Submission Failed: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getContributionTypeLabel = (type) => {
        const labels = {
            property: 'Space Sharing',
            event: 'Event',
            group: 'Community Group',
            local_guide: 'Local Guide Profile',
            travel_companion: 'Travel Companion Offer',
            workshop: 'Workshop'
        };
        return labels[type] || 'Contribution';
    };

    const isEdit = !!editId;

    return {
        // State
        activeCountry,
        showOtpModal,
        setShowOtpModal,
        isEmailVerified,
        currentStep,
        direction,
        isLoading,
        formData,
        setFormData,
        customAmenityInput,
        setCustomAmenityInput,
        customRuleInput,
        setCustomRuleInput,
        termsAccepted,
        setTermsAccepted,
        displayedTerms,
        contributionType,
        setContributionType,
        isEdit,
        isReadOnly,

        // Actions
        handleSendOtp,
        handleVerifyOtp,
        handleFileChange,
        removeArrayItem,
        toggleAmenity,
        addCustomAmenity,
        addRule,
        nextStep,
        prevStep,
        handleSubmit
    };
}