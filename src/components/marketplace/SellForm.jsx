import React, { useState } from "react";
import {
  Upload,
  X,
  MapPin,
  DollarSign,
  Tag,
  Camera,
  Info,
  User,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import { useCreateBuySellMutation } from "@/store/api/hostApi";
import { cn } from "@/lib/utils";
import { fetchAddressByPincode } from "@/lib/pincodeUtils";
import { useEffect } from "react";

/* =========================================================
   BASIC UI COMPONENTS (MUST BE ABOVE SellForm)
   ========================================================= */

const Input = ({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type}
    className={cn(
      "w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "text-black caret-black placeholder:text-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-indigo-500",
      className
    )}
  />
);

const Textarea = ({
  id,
  value,
  onChange,
  placeholder,
  className = "",
}) => (
  <textarea
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={4}
    className={cn(
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "text-black caret-black placeholder:text-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-indigo-500",
      className
    )}
  />
);

const Select = ({ id, value, onChange, children }) => (
  <select
    id={id}
    value={value}
    onChange={onChange}
    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
  >
    {children}
  </select>
);

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-900">
    {children}
  </label>
);

const Button = ({
  type = "button",
  onClick,
  disabled,
  variant = "primary",
  children,
}) => {
  const base =
    "px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const style =
    variant === "secondary"
      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, style)}
    >
      {children}
    </button>
  );
};

/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

const appendIfExists = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function SellForm({ onPost }) {
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [name, setName] = useState("");
  // const [email, setEmail] = useState(""); // Email from DB
  const [phone, setPhone] = useState("");
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const [category, setCategory] = useState("Furniture");
  const [subcategory, setSubcategory] = useState("");

  // Pre-fill user data
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.fullName || user.name) setName(user.fullName || user.name);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);
      } catch (err) {
        console.warn("Failed to parse user for SellForm pre-fill", err);
      }
    }
  }, []);

  // Auto-fill address based on Pincode
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (zipCode && zipCode.length === 6 && /^\d+$/.test(zipCode)) {
        setIsPincodeLoading(true);
        const addressData = await fetchAddressByPincode(zipCode);
        if (addressData) {
          setCity(addressData.city || city);
          setState(addressData.state || state);
          setCountry(addressData.country || country);
        }
        setIsPincodeLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchPincodeDetails, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [zipCode]);

  const [createBuySell, { isLoading, isError, error, isSuccess }] =
    useCreateBuySellMutation();

  /* ================= IMAGE HANDLERS ================= */

  const addFiles = (files) => {
    const valid = Array.from(files).filter((f) => f instanceof File);
    setImages((prev) => [...prev, ...valid]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Client-side validation
    if (!title || !price || !description || !country || !state || !city || !streetAddress || !name || !phone) {
      setValidationError("Please fill in all required fields (Address, Name, Phone, etc.)");
      return;
    }

    const formData = new FormData();

    appendIfExists(formData, "title", title);
    appendIfExists(formData, "price", Number(price));
    appendIfExists(formData, "description", description);

    // Prefer ONE location strategy
    appendIfExists(formData, "country", country);
    appendIfExists(formData, "state", state);
    appendIfExists(formData, "city", city);
    appendIfExists(formData, "zip_code", zipCode);
    appendIfExists(formData, "street_address", streetAddress);

    appendIfExists(formData, "category", category);
    appendIfExists(formData, "subcategory", subcategory || category);

    appendIfExists(formData, "name", name);
    // appendIfExists(formData, "email", email);
    appendIfExists(formData, "phone", phone);

    formData.append("status", "active");

    // IMPORTANT: image key name matches backend/Postman
    images.forEach((img) => {
      formData.append("galleryImages", img);
    });

    try {
      const res = await createBuySell(formData).unwrap();
      if (res?.success && onPost) {
        onPost(res.listings?.[0]);
      }
    } catch (err) {
      console.error("Create listing failed:", err);
    }
  };


  /* ================= RENDER ================= */

  return (
    <div className="max-w-3xl mx-auto bg-gray-50 p-8 rounded-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        List an Item for Sale
      </h2>
      <p className="text-gray-600 mb-6">Share your items with community</p>

      {isError && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error?.data?.message || "Failed to create listing"}
        </div>
      )}

      {validationError && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {validationError}
        </div>
      )}

      {isSuccess && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
          Listing created successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PHOTOS */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 bg-white text-center",
            dragActive ? "border-indigo-500" : "border-gray-300"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            className="hidden"
            id="images"
            onChange={(e) => addFiles(e.target.files)}
          />
          <label htmlFor="images" className="cursor-pointer">
            <Camera className="mx-auto text-indigo-600 mb-2" />
            <p className="font-medium text-gray-900">
              Click or drag images here
            </p>
          </label>

          {images.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative w-24 h-24 border rounded-lg overflow-hidden"
                >
                  <img
                    src={URL.createObjectURL(img)}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-white rounded-full p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ITEM DETAILS */}
        <div className="bg-white p-6 rounded-lg space-y-4">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />

          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Furniture</option>
            <option>Electronics</option>
            <option>Home & Garden</option>
            <option>Clothing</option>
            <option>Other</option>
          </Select>

          <Label>Subcategory</Label>
          <Input
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
          />

          <Label>Price</Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          {/* <Label>Condition</Label> */}
          {/* <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option>Brand New</option>
            <option>Like New</option>
            <option>Good</option>
            <option>Fair</option>
          </Select> */}
        </div>

        {/* LOCATION & DESCRIPTION */}
        <div className="bg-white p-6 rounded-lg space-y-4">
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Label>Zip Code</Label>
            {isPincodeLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
          </div>
          <Input
            type="number"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
          />

          <Label>Street Address</Label>
          <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />

          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Info size={12} /> Clear descriptions increase buyer trust
          </p>
        </div>

        {/* CONTACT */}
        <div className="bg-white p-6 rounded-lg space-y-4">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />

          {/* <Label>Email</Label> */}
          {/* <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          /> */}

          <Label>Phone</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* URGENT */}
        {/* <div className="bg-white p-4 rounded-lg flex items-center gap-2">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
          />
          <span className="text-sm text-gray-900">Mark as urgent sale</span>
        </div> */}

        {/* ACTIONS */}
        <div className="flex gap-4">
          <Button variant="secondary" disabled={isLoading}>
            Save as Draft
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Posting..." : "Post Listing"}
          </Button>
        </div>
      </form>
    </div>
  );
}
