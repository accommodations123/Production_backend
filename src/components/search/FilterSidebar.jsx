import React from 'react';
import { Slider } from '@/components/ui/slider';
// If no slider component, I'll use standard range input for now to be safe.
import { Check, MapPin } from 'lucide-react';

import { cn } from "@/lib/utils";

export function FilterSidebar({ filters, onFilterChange, distinctValues = {}, className }) {

    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const handleCheckbox = (key, value) => {
        const current = filters[key] || [];
        const updated = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];
        handleChange(key, updated);
    };

    return (
        <div className={cn("w-64 flex-shrink-0 bg-white border-r border-gray-200 h-[calc(100vh-80px)] overflow-y-auto sticky top-20 p-6 hidden lg:block", className)}>
            <h2 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                Filters
                {(Object.keys(filters).length > 0) && (
                    <button
                        onClick={() => onFilterChange({ location: filters.location })}
                        className="text-xs text-primary font-medium hover:underline ml-auto"
                    >
                        Clear All
                    </button>
                )}
            </h2>

            {/* 1. Location Search */}
            <div className="mb-8">
                <h3 className="font-bold text-sm text-gray-900 mb-3">Location</h3>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <input
                        type="text"
                        className="bg-transparent text-sm w-full outline-none text-gray-700 placeholder-gray-400"
                        placeholder="Search area..."
                        value={filters.location || ""}
                        onChange={(e) => handleChange('location', e.target.value)}
                    />
                </div>
            </div>

            {/* 2. Price Range (Dual Slider) */}
            <div className="mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-gray-900">Price Range</h3>
                    <span className="text-xs text-primary font-bold">
                        ₹{filters.minPrice || 0} - ₹{filters.maxPrice || 50000}
                    </span>
                </div>
                <Slider
                    defaultValue={[filters.minPrice || 0, filters.maxPrice || 50000]}
                    max={100000}
                    step={500}
                    minStepsBetweenThumbs={1}
                    onValueChange={(vals) => {
                        handleChange('minPrice', vals[0]);
                        handleChange('maxPrice', vals[1]);
                    }}
                    className="mb-2"
                />
            </div>

            {/* 3. Property Category */}
            <div className="mb-8">
                <h3 className="font-bold text-sm text-gray-900 mb-3">Property Type</h3>
                <div className="space-y-2">
                    {['Apartment', 'House', 'PG', 'Hostel', 'Shared Room'].map((cat) => (
                        <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${(filters.category || []).includes(cat)
                                ? 'bg-primary border-primary'
                                : 'border-gray-300 group-hover:border-primary'
                                }`}>
                                {(filters.category || []).includes(cat) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={(filters.category || []).includes(cat)}
                                onChange={() => handleCheckbox('category', cat)}
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900">{cat}</span>
                        </label>
                    ))}
                </div>
            </div>

        </div>
    );
}
