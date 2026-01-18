"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MarketplaceLayout } from "@/components/marketplace/MarketplaceLayout";
import { FilterPanel } from "@/components/marketplace/FilterPanel";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { SellForm } from "@/components/marketplace/SellForm";
import { ChatPopup } from "@/components/marketplace/ChatPopup";
import { VerificationModal } from "@/components/marketplace/VerificationModal";
import { ShieldCheck, Zap, Tag, MessageCircle } from "lucide-react";
import { useCountry } from "@/context/CountryContext";
import { useGetBuySellListingsQuery, useGetHostProfileQuery, useGetBuySellByIdQuery } from "@/store/api/hostApi";
import { useGetMeQuery } from "@/store/api/authApi";
import { useNavigate } from "react-router-dom";
import HostGuard from "@/components/auth/HostGuard";

/* ================= MOCK DATA ================= */

const PRODUCTS = [
  {
    id: 1,
    title: "IKEA Malm Bed Frame - Queen Size",
    price: "150",
    location: "San Jose, CA",
    postedTime: "2 hours ago",
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1505693416388-b0346efee539",
    tags: ["moving", "furniture"],
    country: "US",
  },
  {
    id: 2,
    title: "Apple MacBook Pro M1 2020",
    price: "850",
    location: "San Francisco, CA",
    postedTime: "5 hours ago",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca4",
    tags: ["electronics", "urgent"],
    country: "US",
  },
];

/* ================= COMPONENT ================= */

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState("buy");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  // products state is now managed by RTK Query
  const { data: productsData, isLoading: loading, error } = useGetBuySellListingsQuery();

  const navigate = useNavigate();
  const { data: user } = useGetMeQuery();
  const { data: hostProfile } = useGetHostProfileQuery(undefined, { skip: !user });

  const handleTabChange = (tab) => {
    if (tab === 'sell' && !user) {
      navigate('/signin');
      return;
    }
    setActiveTab(tab);
  };

  const [filters, setFilters] = useState({
    priceMin: "",
    priceMax: "",
    condition: "",
    category: "",
  });

  const { activeCountry, isSelected } = useCountry();

  const products = productsData || [];

  /* ================= FILTER LOGIC ================= */

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const price = Number(p.price);

      if (filters.priceMin && price < Number(filters.priceMin)) return false;
      if (filters.priceMax && price > Number(filters.priceMax)) return false;

      if (filters.condition && p.condition !== filters.condition) return false;

      if (
        filters.category &&
        !p.tags?.includes(filters.category)
      )
        return false;

      return true;
    });
  }, [products, filters]);

  /* ================= HANDLERS ================= */

  const handleMessage = product => {
    setSelectedProduct(product);
    setIsChatOpen(true);
  };

  const handlePost = () => {
    setActiveTab("buy");
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20">
        <MarketplaceLayout
          activeTab={activeTab}
          onTabChange={handleTabChange}
        >
          {/* ================= BUY TAB ================= */}
          {activeTab === "buy" && (
            <div className="space-y-6">

              <FilterPanel
                filters={filters}
                onChange={setFilters}
              />

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  {viewProduct ? (
                    <SingleProductView
                      product={viewProduct}
                      onBack={() => setViewProduct(null)}
                      onMessage={handleMessage}
                    />
                  ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredProducts.map(product => (
                        <ProductCard
                          key={product._id || product.id}
                          product={product}
                          onMessage={handleMessage}
                          onClick={() => setViewProduct(product)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No products found.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= SELL TAB ================= */}
          {activeTab === "sell" && (
            <HostGuard>
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <Tip icon={<Zap />} title="Sell Faster" desc="Add clear photos" />
                  <Tip icon={<Tag />} title="Moving Sale" desc="Use tags" />
                  <Tip icon={<ShieldCheck />} title="Get Verified" desc="Build trust" />
                </div>

                <SellForm onPost={handlePost} />
              </div>
            </HostGuard>
          )}
        </MarketplaceLayout>
      </div>

      <ChatPopup
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        product={selectedProduct}
      />

      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        onComplete={() => {
          setIsVerificationOpen(false);
          alert("Verification Complete. Listing is live.");
        }}
      />

      <Footer />
    </div>
  );
}

/* ================= SINGLE PRODUCT ================= */

/* ================= SINGLE PRODUCT ================= */

const SingleProductView = ({ product: initialProduct, onBack, onMessage }) => {
  const [imageError, setImageError] = useState(false);
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop";

  const { data: fetchedProduct, isLoading } = useGetBuySellByIdQuery(initialProduct.id || initialProduct._id, {
    skip: !initialProduct.id && !initialProduct._id
  });

  const rawProduct = fetchedProduct || initialProduct;

  const product = {
    ...rawProduct,
    sellerName: rawProduct.sellerName || rawProduct.name || "Seller",
    sellerPhone: rawProduct.sellerPhone || rawProduct.phone,
    location: rawProduct.location || [rawProduct.city, rawProduct.country].filter(Boolean).join(", ") || "Location not specified",
    postedTime: rawProduct.postedTime || (rawProduct.createdAt ? new Date(rawProduct.createdAt).toLocaleDateString() : "Recently"),
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 relative">

        {/* Decorative Background Blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-50/50 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 md:p-10 relative z-10">

          {/* Back Button */}
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#CB2A25] mb-8 transition-colors"
          >
            <div className="p-2 rounded-full bg-gray-50 group-hover:bg-[#CB2A25]/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            Back to Marketplace
          </button>

          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">

            {/* Left Column: Image (Span 7) */}
            <div className="lg:col-span-7">
              <div className="aspect-[4/3] bg-gray-50 rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group">
                {isLoading && !product.image ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <img
                      src={imageError ? FALLBACK_IMAGE : (product.images?.[0] || product.image || FALLBACK_IMAGE)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={() => setImageError(true)}
                      alt={product.title}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-gray-900 shadow-sm border border-white/20">
                        {product.condition || "Used"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Details (Span 5) */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-8">

              <div>
                <h1 className="text-3xl md:text-4xl font-black text-[#00142E] mb-3 leading-tight">
                  {product.title}
                </h1>
                <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#CB2A25]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {product.location || "Location not specified"}
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {product.postedTime || "Recently"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-5xl font-black text-[#CB2A25] tracking-tight">
                  ${Number(product.price).toLocaleString()}
                </div>
                {product.negotiable && (
                  <span className="inline-block text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Negotiable Price
                  </span>
                )}
              </div>

              {/* Seller Card */}
              <div className="bg-[#00142E] p-6 rounded-[2rem] text-white relative overflow-hidden group">
                {/* Glow effect */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#CB2A25]/20 rounded-full blur-3xl group-hover:bg-[#CB2A25]/30 transition-colors duration-500" />

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/5 font-bold text-xl">
                      {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{product.sellerName || "Seller Name"}</div>
                      <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium mt-1">
                        <ShieldCheck size={14} />
                        <span>Verified Seller</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {/* WhatsApp Button */}
                    {product.sellerPhone && (
                      <button
                        onClick={() => {
                          // Strip non-numeric characters for the link
                          const cleanNumber = product.sellerPhone.replace(/\D/g, '');
                          // Default to '91' prefix if 10 digits (India assumption based on user context)
                          // otherwise use as is. 
                          const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
                          window.open(`https://wa.me/${formattedNumber}`, '_blank');
                        }}
                        className="flex-1 h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                          <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0 .5-.5l.14-.38a.5.5 0 0 0-.05-.54l-1-2a.5.5 0 0 0-.64-.23A6 6 0 0 0 13 19h1a6 6 0 0 0 6-6v-1a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 0-.5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h2" opacity="0" />
                          {/* Simplified icon for visual clarity */}
                          <path d="M21 16.03l-3.66-1.5a.99.99 0 0 0-1.15.22l-1.6 1.95a14.94 14.94 0 0 1-6.72-6.72l1.95-1.6a.99.99 0 0 0 .22-1.15L8.5 3.5c-.32-.75-1.5-.95-2.03-.4l-2.08 2.08a16 16 0 0 0 11.4 11.4l2.08-2.08c.55-.53.35-1.71-.4-2.03z" />
                        </svg>
                        WhatsApp
                      </button>
                    )}

                    <button
                      onClick={() => onMessage(product)}
                      className="h-12 w-12 bg-white/10 hover:bg-[#CB2A25] text-white rounded-xl flex items-center justify-center border border-white/10 transition-all active:scale-95"
                      title="Internal Chat"
                    >
                      <MessageCircle size={20} />
                    </button>

                    <button
                      onClick={() => window.open(`tel:${product.sellerPhone || ''}`)}
                      className="h-12 w-12 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/10 transition-all active:scale-95"
                      title="Call Seller"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100/50">
                <div className="min-w-5 mt-0.5 text-yellow-600">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-xs text-yellow-800 leading-relaxed font-medium">
                  <span className="block font-bold mb-0.5 text-yellow-900">Safety First</span>
                  Meet in public places. Inspect item before payment. Never send money in advance.
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= TIP ================= */

const Tip = ({ icon, title, desc }) => (
  <div className="bg-gray-50 border p-4 rounded-xl flex gap-3">
    <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
    <div>
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs text-gray-600">{desc}</p>
    </div>
  </div>
);