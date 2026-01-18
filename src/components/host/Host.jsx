import { useSaveHostMutation, useGetHostProfileQuery } from "@/store/api/hostApi";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import { fetchAddressByPincode } from "@/lib/pincodeUtils";
import { Navbar } from "@/components/layout/Navbar";

export default function HostOnboardingForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    state: "",
    city: "",
    zip_code: "",
    street_address: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    latitude: null,
    longitude: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [activeSocials, setActiveSocials] = useState({
    whatsapp: false,
    facebook: false,
    instagram: false
  });
  const [submitError, setSubmitError] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const navigate = useNavigate();

  // Using the provided API hook
  const [saveHost, { isLoading: isSubmitLoading, isError, error }] = useSaveHostMutation();

  const { data: hostProfile, isLoading: isProfileLoading } = useGetHostProfileQuery();

  // Redirect if already a host
  useEffect(() => {
    if (hostProfile) {
      // Populate form with existing data if available
      setFormData(prev => ({
        ...prev,
        full_name: hostProfile.full_name || prev.full_name,
        email: hostProfile.email || prev.email,
        phone: hostProfile.phone || prev.phone,
        country: hostProfile.country || prev.country,
        state: hostProfile.state || prev.state,
        city: hostProfile.city || prev.city,
        street_address: hostProfile.address || prev.street_address,
        whatsapp: hostProfile.whatsapp || prev.whatsapp,
        facebook: hostProfile.facebook || prev.facebook,
        instagram: hostProfile.instagram || prev.instagram,
        zip_code: hostProfile.zip_code || prev.zip_code || "",
      }));

      // Set active socials if data exists
      setActiveSocials({
        whatsapp: !!(hostProfile.whatsapp || formData.whatsapp),
        facebook: !!(hostProfile.facebook || formData.facebook),
        instagram: !!(hostProfile.instagram || formData.instagram)
      });
    }
  }, [hostProfile, navigate]);

  // Auto-fill address based on Pincode
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      const pincode = formData.zip_code;
      if (pincode && pincode.length === 6 && /^\d+$/.test(pincode)) {
        setPincodeLoading(true);
        const addressData = await fetchAddressByPincode(pincode);
        if (addressData) {
          setFormData(prev => ({
            ...prev,
            city: addressData.city || prev.city,
            state: addressData.state || prev.state,
            country: addressData.country || "India"
          }));
        }
        setPincodeLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPincodeDetails, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.zip_code]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files?.[0] || null
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported. Please enter your address manually.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use environment variable for Nominatim proxy or fallback to dev proxy
          const nominatimBase = import.meta.env.VITE_NOMINATIM_URL || "/nominatim";
          const nominatimUrl = `${nominatimBase}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
          const response = await fetch(nominatimUrl);

          if (!response.ok) {
            throw new Error("Failed to fetch address from the geocoding service.");
          }

          const data = await response.json();

          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            country: data.address?.country || "",
            state: data.address?.state || "",
            city: data.address?.city || data.address?.town || data.address?.village || "",
            street_address: data.display_name || "",
            zip_code: data.address?.postcode || "",
          }));
        } catch (error) {
          console.error("Error fetching address:", error);
          setLocationError("Failed to retrieve address. Please check your network connection or enter it manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions in your browser and try again, or enter your address manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please check your GPS/device settings or enter it manually.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again in a better signal area, or enter your address manually.");
            break;
          case error.UNKNOWN_ERROR:
            setLocationError("An unknown location error occurred. Please enter your address manually.");
            break;
        }
      },
      {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 10000, // Reduced from 20000 to 10000ms
        maximumAge: 300000 // Cache location for 5 minutes
      }
    );
  };

  const toggleSocial = (social) => {
    setActiveSocials(prev => ({
      ...prev,
      [social]: !prev[social]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");



    // Validate required fields before submission
    const requiredFields = ['full_name', 'email', 'phone', 'country', 'state', 'city', 'street_address'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      setSubmitError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    // Validate Social Media (At least one required)
    if (!formData.whatsapp && !formData.facebook && !formData.instagram) {
      setSubmitError("Please provide at least one social media link (WhatsApp, Facebook, or Instagram)");
      setIsSubmitting(false);
      return;
    }

    try {
      // 3. Construct JSON Payload
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};
      const userId = user.id || user._id;

      const hostPayload = {
        userId: userId,
        user_id: userId,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        address: formData.street_address,
        whatsapp: formData.whatsapp,
        facebook: formData.facebook,
        instagram: formData.instagram,
      };

      console.log("Submitting Host Payload:", hostPayload);

      // 4. Submit to host/save
      const result = await saveHost(hostPayload).unwrap();
      console.log("Success:", result);
      setShowSuccess(true);

      // Navigate to host create page after successful submission
      navigate("/host/create");

      // Reset form after success
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          full_name: "",
          email: "",
          phone: "",
          country: "",
          state: "",
          city: "",
          zip_code: "",
          street_address: "",
          whatsapp: "",
          facebook: "",
          instagram: "",
          latitude: null,
          longitude: null
        });
      }, 3000);
    } catch (err) {
      console.error("Error submitting form:", err);

      // Handle different error types
      if (err.status === 'PARSING_ERROR' && err.originalStatus === 500) {
        // Server returned HTML instead of JSON (500 error)
        setSubmitError("Server error occurred. Please try again later or contact support if the problem persists.");
      } else if (err.data?.message) {
        setSubmitError(err.data.message);
      } else if (err.error) {
        setSubmitError(err.error);
      } else {
        setSubmitError("Failed to submit application. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col pt-24 pb-12 sm:px-6 lg:px-8">
      <Navbar />
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md transform transition-all animate-bounce-in shadow-2xl border border-green-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-900">Application Submitted!</h3>
            <p className="text-gray-600 mb-6">Your host application has been received and is under review. We'll notify you once it's approved.</p>
            <div className="flex justify-center">
              <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Success
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        {/* Logo and Header */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 bg-primary rounded-lg shadow-lg">
              {/* <span className="text-accent font-bold text-xl">NKL</span> */}
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-gray-200">NextKinLife</h1>
              <p className="text-xs text-gray-600"></p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-primary">
          {/* Header */}
          <div className="bg-primary px-6 py-5">
            <h2 className="text-2xl font-bold text-gray-200">Become a Host</h2>
            <p className="text-accent mt-1">Join our community and start hosting today</p>
          </div>

          {/* Pending Status Overlay */}
          {hostProfile?.status === "pending" && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-6 m-6 rounded-lg animate-pulse">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-blue-800">Application Under Review</h3>
                  <p className="text-blue-700">We've received your application and our team is reviewing it. You'll be notified via email once approved.</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {/* Error Message */}
          {(isError || submitError) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{submitError || (error?.data?.message || "Failed to submit application. Please try again.")}</p>
                  {error?.status === 'PARSING_ERROR' && (
                    <p className="mt-2 text-xs text-red-600">Server returned an unexpected response. This might be a temporary issue.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-6">
            {/* PERSONAL INFO SECTION */}
            <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <p className="text-sm text-gray-600">Tell us about yourself</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="full_name"
                      name="full_name"
                      required
                      placeholder="Enter your full legal name"
                      value={formData.full_name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("full_name")}
                      onBlur={() => setFocusedField(null)}
                      className={`block w-full pl-10 pr-4 py-3 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none sm:text-sm transition-all ${focusedField === "full_name"
                        ? "border-2 border-primary ring-1 ring-primary bg-primary/10"
                        : "border-2 border-gray-200 bg-gray-50"
                        }`}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="We'll use this for account verification"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      className={`block w-full pl-10 pr-4 py-3 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none sm:text-sm transition-all ${focusedField === "email"
                        ? "border-2 border-primary ring-1 ring-primary bg-primary/10"
                        : "border-2 border-gray-200 bg-gray-50"
                        }`}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    placeholder="Include country code"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    className={`block w-full px-4 py-3 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none sm:text-sm transition-all ${focusedField === "phone"
                      ? "border-2 border-primary ring-1 ring-primary bg-primary/10"
                      : "border-2 border-gray-200 bg-gray-50"
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* ADDRESS SECTION */}
            <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Address Details</h3>
                    <p className="text-sm text-gray-600">Where are you located?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locationLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-full shadow-sm text-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all ${locationLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/80"
                    }`}
                >
                  {locationLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use Current Location
                    </>
                  )}
                </button>
              </div>

              {locationError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{locationError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    id="country"
                    name="country"
                    required
                    placeholder="Country"
                    value={formData.country}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    id="state"
                    name="state"
                    required
                    placeholder="State"
                    value={formData.state}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    id="city"
                    name="city"
                    required
                    placeholder="City"
                    value={formData.city}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    id="zip_code"
                    name="zip_code"
                    placeholder="ZIP Code"
                    value={formData.zip_code}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                  />
                  {pincodeLoading && <p className="text-xs text-primary mt-1">Fetching location details...</p>}
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="street_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <textarea
                  id="street_address"
                  name="street_address"
                  required
                  placeholder="Street Address"
                  value={formData.street_address}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg shadow-sm placeholder-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                />
              </div>
            </div>

            {/* SOCIAL MEDIA SECTION */}
            <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
                  <p className="text-sm text-gray-600">Select the platforms you want to add</p>
                </div>
              </div>

              {/* Social Icons Flex Row */}
              <div className="flex justify-center gap-8 mb-8">
                <button
                  type="button"
                  onClick={() => toggleSocial('whatsapp')}
                  className={`flex flex-col items-center gap-2 transition-all transform hover:scale-110 ${activeSocials.whatsapp ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                >
                  <div className={`p-4 rounded-full ${activeSocials.whatsapp ? 'bg-green-100 ring-2 ring-green-500' : 'bg-gray-200'}`}>
                    <FaWhatsapp className={`w-8 h-8 ${activeSocials.whatsapp ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <span className={`text-xs font-medium ${activeSocials.whatsapp ? 'text-green-700' : 'text-gray-500'}`}>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSocial('facebook')}
                  className={`flex flex-col items-center gap-2 transition-all transform hover:scale-110 ${activeSocials.facebook ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                >
                  <div className={`p-4 rounded-full ${activeSocials.facebook ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-200'}`}>
                    <FaFacebook className={`w-8 h-8 ${activeSocials.facebook ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <span className={`text-xs font-medium ${activeSocials.facebook ? 'text-blue-700' : 'text-gray-500'}`}>Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSocial('instagram')}
                  className={`flex flex-col items-center gap-2 transition-all transform hover:scale-110 ${activeSocials.instagram ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                >
                  <div className={`p-4 rounded-full ${activeSocials.instagram ? 'bg-pink-100 ring-2 ring-pink-500' : 'bg-gray-200'}`}>
                    <FaInstagram className={`w-8 h-8 ${activeSocials.instagram ? 'text-pink-600' : 'text-gray-500'}`} />
                  </div>
                  <span className={`text-xs font-medium ${activeSocials.instagram ? 'text-pink-700' : 'text-gray-500'}`}>Instagram</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* WhatsApp Input */}
                {activeSocials.whatsapp && (
                  <div className="animate-fade-in-down">
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FaWhatsapp className="text-green-600 w-4 h-4" />
                      WhatsApp Number
                    </label>
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      placeholder="e.g., +91 9876543210"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      autoFocus
                      className="block w-full px-4 py-3 rounded-lg shadow-sm border-2 border-green-100 focus:border-green-500 focus:ring-green-500 sm:text-sm transition-all"
                    />
                  </div>
                )}

                {/* Facebook Input */}
                {activeSocials.facebook && (
                  <div className="animate-fade-in-down">
                    <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FaFacebook className="text-blue-600 w-4 h-4" />
                      Facebook Profile Link
                    </label>
                    <input
                      id="facebook"
                      name="facebook"
                      placeholder="https://facebook.com/yourprofile"
                      value={formData.facebook}
                      onChange={handleChange}
                      autoFocus
                      className="block w-full px-4 py-3 rounded-lg shadow-sm border-2 border-blue-100 focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-all"
                    />
                  </div>
                )}

                {/* Instagram Input */}
                {activeSocials.instagram && (
                  <div className="animate-fade-in-down">
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FaInstagram className="text-pink-600 w-4 h-4" />
                      Instagram Profile Link
                    </label>
                    <input
                      id="instagram"
                      name="instagram"
                      placeholder="https://instagram.com/yourprofile"
                      value={formData.instagram}
                      onChange={handleChange}
                      autoFocus
                      className="block w-full px-4 py-3 rounded-lg shadow-sm border-2 border-pink-100 focus:border-pink-500 focus:ring-pink-500 sm:text-sm transition-all"
                    />
                  </div>
                )}

                {!activeSocials.whatsapp && !activeSocials.facebook && !activeSocials.instagram && (
                  <p className="text-center text-sm text-gray-400 italic mt-4">Click an icon above to add a social link</p>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-8 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isSubmitLoading || hostProfile?.status === "pending"}
                  className={`inline-flex justify-center py-3 px-8 border border-transparent shadow-lg text-sm font-medium rounded-full text-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-105 ${isSubmitting || isSubmitLoading || hostProfile?.status === "pending"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/80"
                    }`}
                >
                  {isSubmitting || isSubmitLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit for Verification
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}