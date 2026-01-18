import React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function FilterSection({ title, options, selected, onChange }) {
    const [isExpanded, setIsExpanded] = React.useState(true)

    return (
        <div className="border-b border-gray-100 pb-4 last:border-0">
            <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto font-semibold text-gray-900 hover:bg-transparent"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {title}
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>

            {isExpanded && (
                <div className="mt-4 space-y-3">
                    {options.map((option) => (
                        <label key={option} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                                checked={selected.includes(option)}
                                onChange={() => onChange(option)}
                            />
                            <span className="text-sm text-gray-700 font-medium">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}