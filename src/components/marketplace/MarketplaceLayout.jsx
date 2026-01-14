import React from 'react';
import { MapPin, ShoppingBag, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function MarketplaceLayout({ children, activeTab, onTabChange }) {
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Fixed Top Bar */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-4 py-3 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Location Selector */}
                    <div className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-full cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">USA</span>
                        <span className="text-gray-400">/</span>
                        <span className="font-medium">California</span>
                        <span className="text-gray-400">/</span>
                        <span className="font-bold text-gray-900">San Francisco</span>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => onTabChange('buy')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${activeTab === 'buy'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ShoppingBag className="h-4 w-4" /> Buy Items
                        </button>
                        <button
                            onClick={() => onTabChange('sell')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${activeTab === 'sell'
                                ? 'bg-white text-accent shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Tag className="h-4 w-4" /> Sell Items
                        </button>
                    </div>

                    {/* Quick Actions (Placeholder for now) */}
                    <div className="w-[200px] flex justify-end">
                        <Button variant="ghost" size="sm" className="text-white cursor-pointer bg-accent">
                            My Listings
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-6">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
}
