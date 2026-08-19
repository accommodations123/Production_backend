import { ProfessionalProfile } from "../model/people/People.models.js";

/* =====================================================================
   Migration Script — Legacy Experprofile to Canonical ProfessionalProfile
   Idempotent migration script mapping legacy fields to single-table DynamoDB items.
   ===================================================================== */

export async function migrateExperprofile() {
  console.log("🚀 Starting Experprofile legacy migration to DynamoDB...");

  try {
    const legacyRecords = await Experprofile.scan().exec();
    console.log(`📦 Found ${legacyRecords ? legacyRecords.length : 0} legacy records.`);

    if (!legacyRecords || legacyRecords.length === 0) {
      console.log("✅ No legacy records to migrate.");
      return;
    }

    for (const legacy of legacyRecords) {
      const userId = legacy.user_id || legacy.userId;
      if (!userId) continue;

      // Check if canonical profile already exists
      const existing = await peopleRepository.findProfileByUserId(userId);
      if (existing) {
        console.log(`⏩ Canonical profile already exists for user ${userId}. Skipping.`);
        continue;
      }

      // Map legacy fields into canonical ProfessionalProfile
      const profileData = {
        user_id: userId,
        name: legacy.name || legacy.displayName || "Migrated Professional",
        profession: legacy.profession || legacy.headline || "Professional",
        category: legacy.category || "Technology",
        bio: legacy.bio || legacy.about || legacy.experience || "Migrated profile summary.",
        country: legacy.country || "USA",
        city: legacy.city || "New York",
        skills: legacy.skills || [],
        languages: legacy.languages || [],
        yearsOfExperience: typeof legacy.yearsOfExperience === "number" ? legacy.yearsOfExperience : 1,
        offersServices: Array.isArray(legacy.services) && legacy.services.length > 0,
        status: "published"
      };

      const created = await peopleRepository.saveProfile(profileData);
      console.log(`✅ Migrated profile created: ${created.id} for user ${userId}`);

      // Migrate services if present
      if (Array.isArray(legacy.services) && legacy.services.length > 0) {
        for (const srv of legacy.services) {
          const serviceName = typeof srv === "string" ? srv : srv.name || "Professional Service";
          await peopleRepository.saveService({
            professionalId: created.id,
            ownerUserId: userId,
            serviceName,
            category: created.category,
            price: legacy.hourlyRate || legacy.pricing?.consultation || 0,
            pricingType: "hourly"
          });
        }
      }
    }

    console.log("🎉 Migration completed successfully.");
  } catch (error) {
    console.error("❌ Migration error:", error);
  }
}

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  migrateExperprofile();
}
