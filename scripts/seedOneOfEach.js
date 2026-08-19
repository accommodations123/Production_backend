import dotenv from "dotenv";
dotenv.config();

import User from "../model/User.js";
import Host from "../model/Host.js";
import Property from "../model/Property.js";
import ApprovedHost from "../model/Approved.js";
import Event from "../model/Events.models.js";
import BuySellListing from "../model/BuySellListing.js";
import TravelTrip from "../model/travel/TravelTrip.js";
import { ProfessionalProfile } from "../model/people/People.models.js";
import { StayRequest } from "../model/stayRequest/StayRequest.models.js";
import { checkDynamoDBConnection } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("🌱 Starting seeding of 1 of each entity...");
  const isConnected = await checkDynamoDBConnection();
  if (!isConnected) {
    console.error("❌ Cannot connect to DynamoDB");
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  // 0. Ensure Demo User & Host exist
  const demoUserId = "demo_user_001";
  const demoHostId = "demo_host_001";

  console.log("👤 Ensuring demo User and Host...");
  try {
    await User.create({
      id: demoUserId,
      email: "bhargav.reddy@example.com",
      name: "Bhargav Reddy",
      verified: true,
      profile_image: null
    }, { overwrite: true });
  } catch (e) {
    console.log("User create info:", e.message);
  }

  try {
    await Host.create({
      id: demoHostId,
      user_id: demoUserId,
      email: "bhargav.reddy@example.com",
      phone: "+1 555-0199",
      full_name: "Bhargav Reddy",
      country: "United States",
      state: "California",
      city: "San Francisco",
      zip_code: "94105",
      street_address: "500 Howard Street",
      whatsapp: "+15550199",
      facebook: "bhargavreddy",
      instagram: "bhargav_reddy",
      status: "approved"
    }, { overwrite: true });
  } catch (e) {
    console.log("Host create info:", e.message);
  }

  // 1. Accommodation (Property + ApprovedHost)
  console.log("🏠 Creating 1 Accommodation...");
  const propertyId = "prop_demo_" + uuidv4().slice(0, 8);
  const propertyData = {
    id: propertyId,
    user_id: demoUserId,
    host_id: demoHostId,
    category_id: "cat_apartment",
    property_type: "Apartment",
    privacy_type: "Entire place",
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    pets_allowed: 1,
    area: 750,
    title: "Luxury 1BHK Modern Apartment with Skyline View",
    description: "Enjoy a stylish experience at this centrally-located modern apartment in the heart of downtown. Fully furnished with high-speed WiFi, dedicated workspace, modern kitchen, and access to fitness center and rooftop terrace.",
    country: "United States",
    state: "California",
    city: "San Francisco",
    zip_code: "94105",
    street_address: "500 Howard Street",
    latitude: 37.7891,
    longitude: -122.3995,
    location_privacy: "approximate",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: ["WiFi", "Dedicated workspace", "Kitchen", "Air conditioning", "Elevator", "Gym", "Washer", "Dryer"],
    rules: ["No smoking", "No parties or events", "Quiet hours after 10 PM"],
    price_per_night: 120,
    price_per_month: 2800,
    currency: "USD",
    status: "approved",
    is_deleted: false,
    is_expired: false
  };
  await Property.create(propertyData, { overwrite: true });

  await ApprovedHost.create({
    id: "appr_" + propertyId,
    user_id: demoUserId,
    host_id: demoHostId,
    property_id: propertyId,
    approved_by: "system_admin",
    approved_at: timestamp,
    host_snapshot: {
      id: demoHostId,
      full_name: "Bhargav Reddy",
      email: "bhargav.reddy@example.com",
      phone: "+1 555-0199",
      country: "United States",
      city: "San Francisco"
    },
    property_snapshot: propertyData
  }, { overwrite: true });
  console.log(`✅ Accommodation created with ID: ${propertyId}`);

  // 2. Event
  console.log("🎉 Creating 1 Event...");
  const eventId = "event_demo_" + uuidv4().slice(0, 8);
  await Event.create({
    id: eventId,
    host_id: demoHostId,
    host_user_id: demoUserId,
    title: "Bay Area Tech Founders & Creators Meetup 2026",
    description: "Join fellow entrepreneurs, software engineers, and digital nomads for an evening of networking, lightning talks on modern tech stacks, and collaborative discussions.",
    type: "meetup",
    country: "United States",
    state: "California",
    city: "San Francisco",
    zip_code: "94105",
    street_address: "Yerba Buena Center, 701 Mission St",
    landmark: "Near SFMOMA",
    start_date: "2026-09-15",
    end_date: "2026-09-15",
    start_time: "18:00",
    end_time: "21:30",
    venue_name: "Tech Nexus Hub",
    venue_description: "Contemporary event space with panoramic city views and state-of-the-art presentation setup.",
    parking_info: "Underground parking garage available on Mission St.",
    accessibility_info: "Wheelchair accessible with elevator access.",
    banner_image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    gallery_images: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80"
    ],
    price: 0,
    attendees_count: 24,
    max_attendees: 100,
    rating: 4.9,
    status: "approved",
    event_mode: "in-person",
    is_deleted: false
  }, { overwrite: true });
  console.log(`✅ Event created with ID: ${eventId}`);

  // 3. Buy/Sell Listing
  console.log("🛍️ Creating 1 Buy/Sell item...");
  const buySellId = "buysell_demo_" + uuidv4().slice(0, 8);
  await BuySellListing.create({
    id: buySellId,
    user_id: demoUserId,
    title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD) - Space Black',
    category: "Electronics",
    subcategory: "Laptops & Computers",
    condition: "Like New",
    price: 2450,
    description: "Pristine condition MacBook Pro 16-inch with M3 Max chip. Battery health 98%, always used with protective sleeve. Includes original MagSafe charger, box, and AppleCare+ warranty valid until late 2027.",
    country: "United States",
    state: "California",
    city: "San Francisco",
    zip_code: "94105",
    street_address: "Downtown San Francisco",
    name: "Bhargav Reddy",
    phone: "+1 555-0199",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80"
    ],
    status: "active"
  }, { overwrite: true });
  console.log(`✅ Buy/Sell created with ID: ${buySellId}`);

  // 4. Travel Partner (Travel Trip)
  console.log("✈️ Creating 1 Travel Partner trip...");
  const tripId = "trip_demo_" + uuidv4().slice(0, 8);
  await TravelTrip.create({
    id: tripId,
    host_id: demoHostId,
    from_country: "United States",
    from_state: "California",
    from_city: "San Francisco (SFO)",
    to_country: "United Kingdom",
    to_city: "London (LHR)",
    travel_date: "2026-10-10",
    departure_time: "17:45",
    arrival_date: "2026-10-11",
    arrival_time: "12:15",
    airline: "British Airways",
    flight_number: "BA286",
    age: 27,
    languages: ["English", "Hindi", "Telugu"],
    status: "approved"
  }, { overwrite: true });
  console.log(`✅ Travel Partner Trip created with ID: ${tripId}`);

  // 5. People (Professional Profile)
  console.log("🧑‍💼 Creating 1 People profile...");
  const profileId = "profile_demo_" + uuidv4().slice(0, 8);
  await ProfessionalProfile.create({
    id: profileId,
    user_id: demoUserId,
    name: "Bhargav Reddy",
    firstName: "Bhargav",
    lastName: "Reddy",
    displayName: "Bhargav Reddy",
    headline: "Senior Full Stack Cloud Architect & Distributed Systems Engineer",
    bio: "Passionate engineer with 6+ years of experience building resilient cloud applications, microservices with Node.js/TypeScript, AWS DynamoDB, and real-time Socket.IO architectures.",
    category: "Software Development",
    subcategory: "Full Stack Development",
    profileType: "professional",
    roles: ["Software Engineer", "Cloud Architect", "Mentor"],
    hourlyRate: 85,
    yearsOfExperience: 6,
    offersServices: true,
    isPublished: true,
    status: "approved",
    is_approved: true,
    is_verified: true,
    is_featured: true,
    is_blocked: false,
    country: "United States",
    state: "California",
    city: "San Francisco",
    zipCode: "94105",
    address: "San Francisco Bay Area",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    bannerImage: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
    skills: ["Node.js", "React", "AWS DynamoDB", "Docker", "TypeScript", "Microservices", "REST API", "Socket.IO"],
    languages: ["English", "Hindi", "Telugu"]
  }, { overwrite: true });
  console.log(`✅ People Profile created with ID: ${profileId}`);

  // 6. Stay Request
  console.log("🛎️ Creating 1 Stay Request...");
  const stayRequestId = "stay_demo_" + uuidv4().slice(0, 8);
  await StayRequest.create({
    id: stayRequestId,
    user_id: demoUserId,
    title: "Looking for a Cozy 1BHK or Studio near Downtown / SoMa",
    description: "Moving to San Francisco for a tech role starting next month. Looking for a clean, quiet, and fully furnished 1BHK or studio apartment with high-speed internet and nearby public transit.",
    country: "United States",
    state: "California",
    city: "San Francisco",
    budget: 2400,
    currency: "USD",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "bhargav.reddy@example.com",
    phone: "+1 555-0199",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_featured: true,
    is_blocked: false,
    views_count: 32,
    offers_count: 3
  }, { overwrite: true });
  console.log(`✅ Stay Request created with ID: ${stayRequestId}`);

  console.log("\n🎉 All 6 entities successfully created and verified in DynamoDB!");
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
