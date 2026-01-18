"use client"

import * as React from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FILTERS = [
    "All",
    "Countries",
    "Cities",
    "Students",
    "Workers",
    "Visa & Immigration",
    "Accommodation Help",
    "Buy/Sell",
    "Women-only"
]

export function GroupsHeader({ searchQuery, setSearchQuery, activeFilter, setActiveFilter }) {

    return (
        <div className="space-y-8 mb-12">
            <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-[#07182A]">Communities & Groups</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Join local groups, connect with people, and get real information from residents.
                </p>
            </div>

            <div className="max-w-2xl mx-auto relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by country, city, or group name..."
                        className="pl-12 pr-4 h-14 rounded-full border-gray-200 shadow-sm text-lg text-[#07182A]"
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#C93A30] hover:bg-[#C93A30]/90 h-10 w-10"
                    >
                        <Search className="h-5 w-5 text-white" />
                    </Button>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
                {FILTERS.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                            activeFilter === filter
                                ? "bg-[#07182A] text-white shadow-md"
                                : "bg-white border border-[#E6E6E6] text-gray-600 hover:border-gray-400"
                        )}
                    >
                        {filter}
                    </button>
                ))}
            </div>
        </div>
    )
}
