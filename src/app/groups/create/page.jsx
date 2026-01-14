"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCommunityMutation } from "@/store/api/hostApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function CreateGroupPage() {
    const navigate = useNavigate();
    const [createCommunity, { isLoading }] = useCreateCommunityMutation();

    const [formData, setFormData] = React.useState({
        name: "",
        description: "",
        country: "",
        state: "",
        city: "",
        topics: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation based on controller: Name and Country are required
        if (!formData.name || !formData.country) {
            toast.error("Name and Country are required");
            return;
        }

        try {
            // Process topics from comma-separated string to array
            const topicsArray = formData.topics
                ? formData.topics.split(",").map((t) => t.trim()).filter(Boolean)
                : [];

            const payload = {
                ...formData,
                topics: topicsArray,
            };

            const result = await createCommunity(payload).unwrap();

            if (result.success) {
                toast.success("Community created successfully!");
                // Redirect to the new community page. 
                // The controller returns { success: true, community: { id, ... } }
                if (result.community?.id) {
                    navigate(`/groups/${result.community.id}`);
                } else {
                    navigate("/groups");
                }
            }
        } catch (err) {
            console.error("Create community error:", err);
            toast.error(err.data?.message || "Failed to create community");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create a New Community</h1>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Community Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Hiking Enthusiasts"
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="What is this community about?"
                                    className="w-full min-h-[100px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                                        Country <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        placeholder="e.g. USA"
                                        required
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                        State/Region
                                    </label>
                                    <Input
                                        id="state"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="e.g. California"
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                <Input
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="e.g. San Francisco"
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label htmlFor="topics" className="block text-sm font-medium text-gray-700 mb-1">
                                    Topics (comma separated)
                                </label>
                                <Input
                                    id="topics"
                                    name="topics"
                                    value={formData.topics}
                                    onChange={handleChange}
                                    placeholder="e.g. hiking, nature, outdoors"
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate distinct topics with commas.</p>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Community"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
