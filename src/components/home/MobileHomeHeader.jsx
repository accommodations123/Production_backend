"use client"

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MapPin, Search, ChevronDown, AlignLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { useCountry } from "@/context/CountryContext";
import { COUNTRIES } from "@/lib/mock-data";
import { AnimatePresence, motion } from 'framer-motion';

export function MobileHomeHeader({ onSearchClick }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCountryOpen, setCountryOpen] = useState(false);
    const { activeCountry, setCountry } = useCountry();

    return (
        <>
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="bg-[#00142E] pb-2 sticky top-0 z-40 transition-all duration-300">
                <div className="px-4 py-3 flex items-center justify-between gap-3">

                    {/* Left: Brand & Sidebar Trigger */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                        >
                            <AlignLeft className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Middle: Brand Logo Text */}
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-white tracking-tight">
                            NextKin<span className="text-[#CB2A25]">Life</span>
                        </span>
                        <button
                            onClick={() => setCountryOpen(true)}
                            className="flex items-center gap-1 text-[10px] text-white/70 bg-white/5 px-2 py-0.5 rounded-full mt-0.5"
                        >
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="max-w-[100px] truncate">{activeCountry?.name || "Global"}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSearchClick}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Country Selection Drawer */}
            <AnimatePresence>
                {isCountryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[60] flex items-end backdrop-blur-sm"
                        onClick={() => setCountryOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="w-full bg-white rounded-t-[2rem] max-h-[85vh] overflow-hidden flex flex-col pb-safe"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-[#00142E]">Select Location</h2>
                                <button onClick={() => setCountryOpen(false)} className="p-2 bg-gray-100 rounded-full">
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto">
                                <div className="space-y-2">
                                    {COUNTRIES.map((country) => (
                                        <button
                                            key={country.code}
                                            onClick={() => {
                                                setCountry(country);
                                                setCountryOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                                                activeCountry?.code === country.code
                                                    ? "bg-[#00142E] text-white shadow-lg"
                                                    : "bg-gray-50 text-gray-700 active:bg-gray-100"
                                            )}
                                        >
                                            <span className="text-2xl">{country.flag}</span>
                                            <span className="font-bold flex-1 text-left">{country.name}</span>
                                            {activeCountry?.code === country.code && (
                                                <div className="w-2 h-2 rounded-full bg-[#CB2A25]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
