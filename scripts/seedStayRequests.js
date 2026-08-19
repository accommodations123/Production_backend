import dotenv from "dotenv";
dotenv.config();

import { StayRequest } from "../model/stayRequest/StayRequest.models.js";
import { checkDynamoDBConnection } from "../config/db.js";

const SAMPLE_STAY_REQUESTS = [
  // ── India Stay Requests (Approved) ─────────────────────────────────────
  {
    user_id: "user_seeker_in_001",
    title: "Looking for 1BHK or Private Room in South Delhi / Hauz Khas",
    description: "Master's student at Delhi University looking for a clean, peaceful 1BHK or private room in South Delhi. Non-smoker, easy-going, focused on studies.",
    country: "India",
    state: "Delhi",
    city: "New Delhi",
    budget: 15000,
    currency: "INR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "delhi.student@example.com",
    phone: "+91 98765 43210",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 54,
    offers_count: 4
  },
  {
    user_id: "user_seeker_in_002",
    title: "Seeking fully furnished flat near Koramangala / Indiranagar, Bengaluru",
    description: "Senior Frontend Engineer moving to Bengaluru for a new job. Looking for a modern 1BHK flat or master bedroom in a 2BHK flatshare.",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    budget: 22000,
    currency: "INR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "bengaluru.tech@example.com",
    phone: "+91 98123 45678",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 89,
    offers_count: 6
  },
  {
    user_id: "user_seeker_in_003",
    title: "Need 1BHK or PG in Bandra / Andheri West, Mumbai",
    description: "Media professional moving to Mumbai. Looking for a well-connected, safe studio or 1BHK apartment near Western Express Highway.",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    budget: 28000,
    currency: "INR",
    stayType: "Flexible",
    furnishing: "Semi-Furnished",
    email: "mumbai.media@example.com",
    phone: "+91 97654 32109",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 110,
    offers_count: 8
  },
  {
    user_id: "user_seeker_in_004",
    title: "Looking for 2BHK flat near Hitec City / Gachibowli, Hyderabad",
    description: "Software developer family relocating to Hyderabad IT corridor. Need a family-friendly 2BHK apartment with parking.",
    country: "India",
    state: "Telangana",
    city: "Hyderabad",
    budget: 20000,
    currency: "INR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "hyderabad.family@example.com",
    phone: "+91 96543 21098",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 45,
    offers_count: 3
  },

  // ── Germany & Global Stay Requests (Approved) ──────────────────────────
  {
    user_id: "user_seeker_001",
    title: "Seeking shared apartment or private room in Munich for Winter Semester",
    description: "Hi! I am a master's student moving to Munich for my studies at TUM. Looking for a quiet, clean private room or shared flat. Non-smoker, easy-going, and respectful of house rules.",
    country: "Germany",
    state: "Bavaria",
    city: "Munich",
    budget: 750,
    currency: "EUR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "student.munich@example.com",
    phone: "+49 151 23456789",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 42,
    offers_count: 3
  },
  {
    user_id: "user_seeker_002",
    title: "Looking for 1BHK or Studio near Berlin Mitte / Alexanderplatz",
    description: "Software developer relocating for work at a tech startup in Berlin. Looking for a fully furnished studio or 1BHK apartment with good public transport connections.",
    country: "Germany",
    state: "Berlin",
    city: "Berlin",
    budget: 1200,
    currency: "EUR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "berlin.dev@example.com",
    phone: "+49 176 98765432",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 68,
    offers_count: 5
  },
  {
    user_id: "user_seeker_003",
    title: "Need short-term stay in New York (Manhattan or Brooklyn) for internship",
    description: "Finance intern needing a stay from June to August in NYC. Clean, organized, and busy with work. Shared flat or sublet preferred.",
    country: "United States of America",
    state: "New York",
    city: "New York",
    budget: 1800,
    currency: "USD",
    stayType: "Short Term",
    furnishing: "Furnished",
    email: "nyc.intern@example.com",
    phone: "+1 212 555 0199",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 95,
    offers_count: 7
  },
  {
    user_id: "user_seeker_004",
    title: "Family looking for 2-3 bedroom apartment in London (Wembley / Harrow area)",
    description: "Indian family relocating to London. Need a safe, family-friendly 2 or 3 BHK apartment near good schools and Tube station.",
    country: "United Kingdom",
    state: "England",
    city: "London",
    budget: 2100,
    currency: "GBP",
    stayType: "Long Term",
    furnishing: "Semi-Furnished",
    email: "family.london@example.com",
    phone: "+44 7700 900077",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 51,
    offers_count: 4
  },
  {
    user_id: "user_seeker_005",
    title: "Student looking for room near University of Toronto (Downtown Toronto)",
    description: "First-year international student seeking a private room in a shared apartment. Prefers vegetarian housemates or cultural exchange.",
    country: "Canada",
    state: "Ontario",
    city: "Toronto",
    budget: 1100,
    currency: "CAD",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "toronto.student@example.com",
    phone: "+1 416 555 0143",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 34,
    offers_count: 2
  },
  {
    user_id: "user_seeker_006",
    title: "Looking for quiet room in Dublin for IT Professional",
    description: "Working professional in tech, moving to Dublin docklands area. Looking for a clean, non-smoking household with high-speed internet for work from home days.",
    country: "Ireland",
    state: "Leinster",
    city: "Dublin",
    budget: 950,
    currency: "EUR",
    stayType: "Flexible",
    furnishing: "Furnished",
    email: "dublin.tech@example.com",
    phone: "+353 87 123 4567",
    status: "approved",
    is_published: true,
    is_approved: true,
    is_blocked: false,
    views_count: 29,
    offers_count: 3
  },

  // ── Pending Stay Requests (Admin Moderation Flow) ──────────────────────
  {
    user_id: "user_seeker_007",
    title: "Urgent: Looking for room or studio near Sorbonne University in Paris",
    description: "Exchange student arriving next month in Paris. Looking for a furnished studio or room near campus. Responsible, quiet student.",
    country: "France",
    state: "Île-de-France",
    city: "Paris",
    budget: 900,
    currency: "EUR",
    stayType: "Short Term",
    furnishing: "Furnished",
    email: "paris.exchange@example.com",
    phone: "+33 6 12 34 56 78",
    status: "pending",
    is_published: true,
    is_approved: false,
    is_blocked: false,
    views_count: 12,
    offers_count: 0
  },
  {
    user_id: "user_seeker_008",
    title: "Seeking 2 BHK flat near Sydney CBD for working couple",
    description: "Couple moving to Sydney for corporate transfer. Looking for modern 2 BHK apartment near train station.",
    country: "Australia",
    state: "New South Wales",
    city: "Sydney",
    budget: 2400,
    currency: "AUD",
    stayType: "Long Term",
    furnishing: "Semi-Furnished",
    email: "sydney.couple@example.com",
    phone: "+61 412 345 678",
    status: "pending",
    is_published: true,
    is_approved: false,
    is_blocked: false,
    views_count: 8,
    offers_count: 0
  },
  {
    user_id: "user_seeker_009",
    title: "Looking for shared accommodation in Frankfurt near Financial District",
    description: "Banking analyst moving to Frankfurt. Prefers flatsharing with young professionals.",
    country: "Germany",
    state: "Hesse",
    city: "Frankfurt",
    budget: 850,
    currency: "EUR",
    stayType: "Long Term",
    furnishing: "Furnished",
    email: "frankfurt.banker@example.com",
    phone: "+49 160 11223344",
    status: "pending",
    is_published: true,
    is_approved: false,
    is_blocked: false,
    views_count: 15,
    offers_count: 0
  }
];

async function seedStayRequests() {
  console.log("🌱 Starting Stay Request database seeding...");

  try {
    const isConnected = await checkDynamoDBConnection();
    if (!isConnected) {
      console.error("❌ Cannot connect to DynamoDB. Please verify your DB connection or local DynamoDB instance.");
      process.exit(1);
    }

    let count = 0;
    for (const data of SAMPLE_STAY_REQUESTS) {
      const created = await StayRequest.create(data);
      console.log(`✅ Seeded Stay Request: "${created.title}" (ID: ${created.id}, Country: ${created.country}, Status: ${created.status})`);
      count++;
    }

    console.log(`🎉 Successfully seeded ${count} stay request records into DynamoDB!`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding stay requests:", err);
    process.exit(1);
  }
}

seedStayRequests();
