import React from 'react';
import {
    Home, Users as UsersIcon, Plane, Package, Star, ShieldCheck, Globe
} from 'lucide-react';

export const TRAVEL_PLANS = [
    {
        id: 1,
        user: {
            name: "Aarav Sharma",
            age: 28,
            from: "Mumbai",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
        },
        destination: "Bali, Indonesia",
        dates: "Dec 15-25, 2024",
        type: "Adventure",
        preference: "Cultural Exchange",
        lookingFor: "Looking for adventure buddies to explore temples, waterfalls, and local cuisine. Open to sharing experiences and creating amazing memories!",
        interests: ["Hiking", "Photography", "Food", "Cultural Exploration"]
    },
    {
        id: 2,
        user: {
            name: "Priya Patel",
            age: 32,
            from: "Delhi",
            image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=100&auto=format&fit=crop"
        },
        destination: "Tokyo, Japan",
        dates: "Jan 10-20, 2025",
        type: "Cultural",
        preference: "Shared Experience",
        lookingFor: "Fellow community members to explore Tokyo's hidden gems and authentic Japanese experiences.",
        interests: ["Food Tours", "Anime", "Traditional Arts", "Shopping"]
    },
    {
        id: 3,
        user: {
            name: "Rohan Verma",
            age: 25,
            from: "Bangalore",
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop"
        },
        destination: "Swiss Alps",
        dates: "Feb 5-15, 2025",
        type: "Ski Trip",
        preference: "Community Exchange",
        lookingFor: "Ski enthusiasts for Swiss Alps adventure. Looking to share accommodation and experiences.",
        interests: ["Skiing", "Snowboarding", "Hot Springs", "Mountain Trekking"]
    }
];

export const SAFETY_TIPS = [
    {
        id: 1,
        title: "Verify Profiles",
        content: "Always check verification badges and read community feedback before connecting."
    },
    {
        id: 2,
        title: "Meet in Public",
        content: "First meetings should always be in well-lit, public places during daylight hours."
    },
    {
        id: 3,
        title: "Share Itinerary",
        content: "Share your travel plans with friends or family members for community safety."
    },
    {
        id: 4,
        title: "Trust Your Instincts",
        content: "If something doesn't feel right, politely excuse yourself from the situation."
    }
];

export const EVENTS = [
    {
        id: 1,
        title: "Diwali Celebration 2024",
        date: "Nov 1, 2024",
        time: "6:00 PM",
        location: "London, UK",
        city: "London",
        country: "UK",
        image: "https://images.unsplash.com/photo-1604591259955-f18835aca253?q=80&w=400&h=200&fit=crop",
        category: "Festival",
        attendees_count: 450,
        type: "Community Hosted",
        description: "Join us for a grand Diwali celebration with traditional food, music, and fireworks.",
        host: {
            name: "Indian Cultural Society",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
        },
        reviews_count: 85,
        comments_count: 42
    },
    // ... more events if needed
];

export const COMMUNITY_SHARES = [
    {
        id: 1,
        title: "Indian Cookware Set",
        description: "Traditional cookware for authentic Indian cooking",
        location: "New York, USA",
        image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=400&h=200&fit=crop",
        category: "Home Goods",
        condition: "Excellent",
        posted: "2 hours ago"
    },
    {
        id: 2,
        title: "Indian Silk Saree Collection",
        description: "Traditional sarees for cultural events",
        location: "Mumbai, India",
        image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=400&h=200&fit=crop",
        category: "Clothing",
        condition: "New",
        posted: "1 day ago"
    },
    {
        id: 3,
        title: "Hindi Learning Books",
        description: "Collection of books for learning Hindi language",
        location: "London, UK",
        image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=400&h=200&fit=crop",
        category: "Education",
        condition: "Good",
        posted: "5 hours ago"
    },
    {
        id: 4,
        title: "Traditional Indian Jewelry",
        description: "For festive occasions and cultural celebrations",
        location: "Dubai, UAE",
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=400&h=200&fit=crop",
        category: "Cultural Items",
        condition: "Excellent",
        posted: "3 days ago"
    }
];

export const FEATURE_CARDS = [
    {
        icon: <Home className="w-8 h-8" />,
        title: "Accommodations",
        description: "Verified homes with Indian hosts",
        stats: "10K+"
    },
    {
        icon: <UsersIcon className="w-8 h-8" />,
        title: "Join Communities",
        description: "Connect with like-minded people",
        stats: "500+"
    },
    {
        icon: <Plane className="w-8 h-8" />,
        title: "Travel Community",
        description: "Find travel companions",
        stats: "200+"
    },
    {
        icon: <Package className="w-8 h-8" />,
        title: "Community Sharing",
        description: "Share trusted items within community",
        stats: "5K+"
    }
];

export const QUICK_STATS = [
    { value: "50K+", label: "Community Members", icon: <UsersIcon className="w-4 h-4" /> },
    { value: "4.9★", label: "Community Rating", icon: <Star className="w-4 h-4 fill-current" /> },
    { value: "24/7", label: "Community Support", icon: <ShieldCheck className="w-4 h-4" /> },
    { value: "100+", label: "Cities", icon: <Globe className="w-4 h-4" /> }
];
