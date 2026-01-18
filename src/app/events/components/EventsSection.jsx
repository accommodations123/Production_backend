import React, { memo } from "react"
import { ChevronRight } from "lucide-react"
import { HorizontalEventCard } from "./HorizontalEventCard"

export const EventsSection = memo(({ category, events, visibleSections, onViewDetails, categoryIndex }) => {
    if (events.length === 0) return null

    return (
        <section
            id={category.id}
            className={`space-y-4 sm:space-y-6 mb-8 sm:mb-16`}
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-[#00152d] flex items-center gap-2">
                    {category.title}
                    <span className="text-sm font-normal text-gray-500 ml-2">({events.length} events)</span>
                </h2>
                <button className="text-sm font-medium text-[#ff0000] hover:text-[#cc0000] flex items-center gap-1 group transition-colors duration-300">
                    View All
                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </button>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative">
                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 sm:pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
                    {events.map((event, index) => (
                        <HorizontalEventCard
                            key={event.id}
                            event={event}
                            onViewDetails={onViewDetails}
                            index={index}
                        />
                    ))}
                </div>
                {/* Fade gradients for scroll indication */}
                <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
        </section>
    )
})
EventsSection.displayName = "EventsSection"
