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

async function run() {
  console.log("🇮🇳 Seeding India entities with no static person/host avatars...");
  const isConnected = await checkDynamoDBConnection();
  if (!isConnected) {
    console.error("❌ Cannot connect to DynamoDB");
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  // 1. Clean up old profiles that had static avatar images
  console.log("🧹 Cleaning up old demo profiles...");
  try {
    const profiles = await ProfessionalProfile.scan().exec();
    for (const p of profiles) {
      console.log(`Deleting old profile: ${p.id}`);
      await ProfessionalProfile.delete({ id: p.id });
    }
  } catch (err) {
    console.log("Profile cleanup info:", err.message);
  }

  // 2. Demo User & Host (India)
  const userId = "user_bhargav_in";
  const hostId = "host_bhargav_in";

  console.log("👤 Creating/Updating User & Host in India...");
  await User.create({
    id: userId,
    email: "bhargav.reddy@example.com",
    name: "Bhargav Reddy",
    verified: true
    // Note: profile_image omitted intentionally so no static picture is shown
  }, { overwrite: true });

  await Host.create({
    id: hostId,
    user_id: userId,
    email: "bhargav.reddy@example.com",
    phone: "+91 98765 43210",
    full_name: "Bhargav Reddy",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    zip_code: "500081",
    street_address: "Hitec City, Madhapur",
    whatsapp: "+919876543210",
    status: "approved"
    // Note: profile_image omitted intentionally
  }, { overwrite: true });

  // 3. Accommodation (India)
  console.log("🏠 Creating Accommodation in India...");
  const propertyId = "prop_in_" + uuidv4().slice(0, 8);
  const propertyData = {
    id: propertyId,
    user_id: userId,
    host_id: hostId,
    category_id: "cat_apartment",
    property_type: "Apartment",
    privacy_type: "Entire place",
    guests: 3,
    bedrooms: 2,
    bathrooms: 2,
    pets_allowed: 1,
    area: 1200,
    title: "Spacious 2BHK Luxury High-Rise Apartment in Hitec City",
    description: "Luxurious 2BHK fully furnished apartment located in the prime tech corridor of Hitec City, Hyderabad. Features high-speed fiber internet, modular kitchen, AC in all rooms, 24/7 security, power backup, clubhouse, gym, and swimming pool.",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    zip_code: "500081",
    street_address: "Cyber Towers Road, Hitec City, Madhapur",
    latitude: 17.4485,
    longitude: 78.3752,
    location_privacy: "approximate",
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: ["WiFi", "Air Conditioning", "Power Backup", "Modular Kitchen", "Gym", "Swimming Pool", "Covered Parking", "Lift", "24/7 Security"],
    rules: ["No smoking inside", "Quiet hours after 10 PM"],
    price_per_night: 2500,
    price_per_month: 42000,
    currency: "INR",
    status: "approved",
    is_deleted: false,
    is_expired: false
  };
  await Property.create(propertyData, { overwrite: true });

  await ApprovedHost.create({
    id: "appr_" + propertyId,
    user_id: userId,
    host_id: hostId,
    property_id: propertyId,
    approved_by: "system_admin",
    approved_at: timestamp,
    host_snapshot: {
      id: hostId,
      full_name: "Bhargav Reddy",
      email: "bhargav.reddy@example.com",
      phone: "+91 98765 43210",
      country: "India",
      state: "Telangana",
      city: "Hyderabad"
    },
    property_snapshot: propertyData
  }, { overwrite: true });
  console.log(`✅ Accommodation created: ${propertyId}`);

  // 4. Stay Request (India)
  console.log("🛎️ Creating Stay Request in India...");
  const stayRequestId = "stay_in_" + uuidv4().slice(0, 8);
  await StayRequest.create({
    id: stayRequestId,
    user_id: userId,
    title: "Looking for 1BHK / 2BHK Furnished Flat near Hitec City / Gachibowli",
    description: "Senior Software Engineer working in Hitec City looking for a clean, peaceful, and fully furnished 1BHK or 2BHK apartment in Hyderabad with high-speed internet, power backup, and dedicated parking.",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    budget: 25000,
    currency: "INR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "bhargav.reddy@example.com",
    phone: "+91 98765 43210",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_featured: true,
    is_blocked: false,
    views_count: 45,
    offers_count: 5
  }, { overwrite: true });
  console.log(`✅ Stay Request created: ${stayRequestId}`);

  // 5. Event (India)
  console.log("🎉 Creating Event in India...");
  const eventId = "event_in_" + uuidv4().slice(0, 8);
  await Event.create({
    id: eventId,
    host_id: hostId,
    host_user_id: userId,
    title: "Hyderabad Tech Founders & AI Builders Meetup 2026",
    description: "Join tech entrepreneurs, AI engineers, developers, and product builders in Hyderabad for an interactive evening discussing Generative AI, cloud architectures, scaling startups, and networking over dinner and coffee.",
    type: "meetup",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    zip_code: "500081",
    street_address: "T-Hub Phase 2, Knowledge City, Raidurg",
    landmark: "Near IKEA",
    start_date: "2026-09-20",
    end_date: "2026-09-20",
    start_time: "17:30",
    end_time: "21:00",
    venue_name: "T-Hub Catalyst Auditorium",
    venue_description: "World-class innovation hub with state-of-the-art presentation amphitheater.",
    parking_info: "Ample visitor parking in Knowledge City basement.",
    accessibility_info: "Elevator and ramp access available.",
    banner_image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    gallery_images: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80"
    ],
    price: 0,
    attendees_count: 45,
    max_attendees: 150,
    rating: 4.9,
    status: "approved",
    event_mode: "in-person",
    is_deleted: false
  }, { overwrite: true });
  console.log(`✅ Event created: ${eventId}`);

  // 6. Buy / Sell (India)
  console.log("🛍️ Creating Buy/Sell item in India...");
  const buySellId = "buysell_in_" + uuidv4().slice(0, 8);
  await BuySellListing.create({
    id: buySellId,
    user_id: userId,
    title: 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD) - Space Black',
    category: "Electronics",
    subcategory: "Laptops & Computers",
    condition: "Like New",
    price: 195000,
    description: "Mint condition MacBook Pro 16-inch M3 Max chip. Indian invoice available with AppleCare+ warranty valid till late 2027. Battery health 98%, complete box and 140W MagSafe charger included.",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    zip_code: "500081",
    street_address: "Madhapur, Hitec City",
    name: "Bhargav Reddy",
    phone: "+91 98765 43210",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80"
    ],
    status: "active"
  }, { overwrite: true });
  console.log(`✅ Buy/Sell created: ${buySellId}`);

  // 7. Travel Partner (India)
  console.log("✈️ Creating Travel Partner trip in India...");
  const tripId = "trip_in_" + uuidv4().slice(0, 8);
  await TravelTrip.create({
    id: tripId,
    host_id: hostId,
    from_country: "India",
    from_state: "Telangana",
    from_city: "Hyderabad (HYD)",
    to_country: "United Kingdom",
    to_city: "London (LHR)",
    travel_date: "2026-10-15",
    departure_time: "07:15",
    arrival_date: "2026-10-15",
    arrival_time: "18:30",
    airline: "British Airways",
    flight_number: "BA276",
    age: 26,
    languages: ["English", "Telugu", "Hindi"],
    status: "approved"
  }, { overwrite: true });
  console.log(`✅ Travel Partner Trip created: ${tripId}`);

  // 8. People Profile (India - Bhargav Reddy, NO static picture)
  console.log("🧑‍💼 Creating People Profile in India...");
  const profileId = "profile_in_" + uuidv4().slice(0, 8);
  await ProfessionalProfile.create({
    id: profileId,
    user_id: userId,
    name: "Bhargav Reddy",
    firstName: "Bhargav",
    lastName: "Reddy",
    displayName: "Bhargav Reddy",
    headline: "Senior Full Stack Cloud Architect & Distributed Systems Engineer",
    bio: "Passionate software architect with 6+ years of experience building scalable cloud-native architectures, high-performance Node.js/TypeScript microservices, AWS DynamoDB, and real-time Socket.IO systems.",
    category: "Software Development",
    subcategory: "Full Stack Development",
    profileType: "professional",
    roles: ["Software Engineer", "Cloud Architect", "Tech Consultant"],
    hourlyRate: 2500,
    yearsOfExperience: 6,
    offersServices: true,
    isPublished: true,
    status: "approved",
    is_approved: true,
    is_verified: true,
    is_featured: true,
    is_blocked: false,
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    zipCode: "500081",
    address: "Hitec City, Hyderabad, Telangana, India",
    // No avatar or static person image!
    skills: ["Node.js", "React", "AWS DynamoDB", "Docker", "TypeScript", "Microservices", "REST APIs", "Socket.IO"],
    languages: ["English", "Telugu", "Hindi"]
  }, { overwrite: true });
  console.log(`✅ People Profile created: ${profileId}`);

  console.log("\n🇮🇳 All entities for India created successfully with static host/person images removed!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("❌ Failed to seed India entities:", err);
  process.exit(1);
});
