"use client"

import React, { useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { motion } from "framer-motion"
import { Search, HelpCircle, Book, MessageSquare, CreditCard, Home, Settings, ChevronRight, FileText, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const CategoryCard = ({ icon: Icon, title, count, description }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="text-left p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group h-full"
    >
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4 h-10">{description}</p>
        <div className="flex items-center text-sm font-medium text-blue-600">
            {count} articles
            <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
    </motion.button>
)

const ArticleLink = ({ title }) => (
    <a href="#" className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors group">
        <FileText size={18} className="text-gray-400 group-hover:text-blue-500" />
        <span className="font-medium">{title}</span>
    </a>
)

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("")

    return (
        <main className="min-h-screen bg-gray-50 font-sans">
            <Navbar />

            {/* Search Hero */}
            <div className="bg-[#0B0F19] pt-32 pb-24 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            How can we help you?
                        </h1>
                        <div className="max-w-2xl mx-auto relative group">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Content Container */}
            <div className="container mx-auto px-4 -mt-12 relative z-20">
                {/* Categories */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    <CategoryCard
                        icon={Book}
                        title="Getting Started"
                        count={12}
                        description="New to NextKinLife? Learn the basics of booking and hosting."
                    />
                    <CategoryCard
                        icon={Home}
                        title="Hosting"
                        count={45}
                        description="Tips for creating listings, managing guests, and earning income."
                    />
                    <CategoryCard
                        icon={CreditCard}
                        title="Billing & Payments"
                        count={18}
                        description="Understanding payments, payouts, taxes, and refunds."
                    />
                    <CategoryCard
                        icon={Settings}
                        title="Account settings"
                        count={9}
                        description="Managing your profile, password, and notifications."
                    />
                    <CategoryCard
                        icon={Shield}
                        title="Safety & Accessibility"
                        count={24}
                        description="Trust standards, safety tips, and accessibility resources."
                    />
                    <CategoryCard
                        icon={MessageSquare}
                        title="Troubleshooting"
                        count={15}
                        description="Technical issues and general problem solving."
                    />
                </div>

                {/* Popular Articles */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 pl-4 border-l-4 border-blue-600">Popular Articles</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                        <ArticleLink title="How NextKinLife protects hosts and guests" />
                        <ArticleLink title="What is the cancellation policy?" />
                        <ArticleLink title="How do I become a Superhost?" />
                        <ArticleLink title="Identity verification requirements" />
                        <ArticleLink title="Getting paid for hosting" />
                    </div>
                </div>

                {/* Contact CTA */}
                <div className="max-w-4xl mx-auto bg-blue-900 text-white rounded-3xl p-12 text-center relative overflow-hidden mb-20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />

                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
                        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                            Our support team is available 24/7. We usually respond within minutes.
                        </p>
                        <Button className="bg-white text-blue-900 hover:bg-blue-50 font-bold h-12 px-8 rounded-full">
                            Contact Support
                        </Button>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
