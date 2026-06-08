import Job from "../../model/carrer/Job.js";
import { trackEvent } from "../../services/Analytics.js";
import { logAudit } from "../../services/auditLogger.js";

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

const normalizeSkills = (skills) => {
  if (!skills || typeof skills !== "object") {
    return { primary: [], secondary: [], nice_to_have: [] };
  }
  return {
    primary: Array.isArray(skills.primary) ? skills.primary : [],
    secondary: Array.isArray(skills.secondary) ? skills.secondary : [],
    nice_to_have: Array.isArray(skills.nice_to_have) ? skills.nice_to_have : []
  };
};

const normalizeJsonArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      if (val.includes("/")) {
        return val.split("/").map(s => s.trim()).filter(Boolean);
      }
      if (val.includes(",")) {
        return val.split(",").map(s => s.trim()).filter(Boolean);
      }
      return [val.trim()];
    }
  }
  return [];
};

export const createJob = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const REQUIRED_FIELDS = [
      "title",
      "company",
      "department",
      "location",
      "description"
    ];
    for (const field of REQUIRED_FIELDS) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    const positionType = req.body.employment_type || req.body.position_type;
    const workStyle = req.body.work_style || req.body.workMode;
    const experienceLevel = req.body.experience_level || req.body.experience;

    if (!positionType || !workStyle || !experienceLevel) {
      return res.status(400).json({
        message: "Missing required fields: position_type/employment_type, work_style/workMode, or experience_level/experience"
      });
    }

    const ALLOWED_FIELDS = [
      "title",
      "company",
      "client_name",
      "vendor_name",
      "department",
      "location",
      "geo_restriction",
      "employment_type",
      "position_type",
      "contract_duration",
      "work_style",
      "experience_level",
      "salary_range",
      "pay_min",
      "pay_max",
      "pay_type",
      "visa_status",
      "start_date",
      "description",
      "requirements",
      "responsibilities",
      "preferred_skills",
      "benefits",
      "skills",
      "mandatory_conditions",
      "recruiter_name",
      "recruiter_email",
      "recruiter_phone",
      "recruiter_linkedin",
      "company_linkedin",
      "status",
      "metadata"
    ];
    
    const payload = pick(req.body, ALLOWED_FIELDS);

    // Normalize inputs
    payload.employment_type = positionType;
    payload.position_type = positionType;
    payload.work_style = String(workStyle).toLowerCase();
    payload.experience_level = experienceLevel;

    payload.requirements = normalizeJsonArray(payload.requirements);
    payload.responsibilities = normalizeJsonArray(payload.responsibilities);
    payload.preferred_skills = normalizeJsonArray(payload.preferred_skills);
    payload.visa_status = normalizeJsonArray(payload.visa_status);
    payload.benefits = normalizeJsonArray(payload.benefits);
    payload.skills = normalizeSkills(payload.skills);
    payload.mandatory_conditions ??= [];
    payload.metadata ??= {};

    const job = await Job.create({
      ...payload,
      created_by: req.admin.id,
      status: payload.status || "active"
    });

    trackEvent({
      event_type: "JOB_CREATED",
      actor: { user_id: req.admin.id },
      entity: { type: "job", id: job.id },
      metadata: { department: job.department, employment_type: job.employment_type }
    }).catch(console.error);

    logAudit({
      action: "JOB_CREATED",
      actor: { admin_id: req.admin.id },
      target: { type: "job", id: job.id },
      severity: "LOW", req
    }).catch(console.error);

    return res.status(201).json({ success: true, job });
  } catch (err) {
    console.error("CREATE JOB ERROR:", err);
    return res.status(500).json({ message: "Failed to create job" });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = (page - 1) * limit;

    let allJobs = await Job.query("created_by").eq(req.admin.id).exec();
    allJobs = allJobs.filter(j => j.status !== "deleted");
    allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const count = allJobs.length;
    const jobs = allJobs.slice(offset, offset + limit);

    return res.json({
      success: true, page, limit, total: count,
      hasMore: offset + jobs.length < count, jobs
    });
  } catch (err) {
    console.error("GET MY JOBS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

export const getJobs = async (req, res) => {
  try {
    const statusQuery = req.query.status || "active";
    let jobs = await Job.query("status").eq(statusQuery).exec();

    // 2. Position Type
    if (req.query.positionType) {
      const types = req.query.positionType.split(",").map(t => t.toLowerCase().trim()).filter(Boolean);
      if (types.length > 0) {
        jobs = jobs.filter(j => 
          types.includes((j.position_type || "").toLowerCase().trim()) || 
          types.includes((j.employment_type || "").toLowerCase().trim())
        );
      }
    }

    // 3. Work Mode
    if (req.query.workMode) {
      const modes = req.query.workMode.split(",").map(m => m.toLowerCase().trim()).filter(Boolean);
      if (modes.length > 0) {
        jobs = jobs.filter(j => modes.includes((j.work_style || "").toLowerCase().trim()));
      }
    }

    // 4. Pay Type
    if (req.query.payType) {
      const payTypes = req.query.payType.split(",").map(t => t.toLowerCase().trim()).filter(Boolean);
      if (payTypes.length > 0) {
        jobs = jobs.filter(j => payTypes.includes((j.pay_type || "hourly").toLowerCase().trim()));
      }
    }

    // 5. Experience
    if (req.query.experience) {
      const expList = req.query.experience.split(",").map(e => e.toLowerCase().trim()).filter(Boolean);
      if (expList.length > 0) {
        jobs = jobs.filter(j => {
          const jExp = (j.experience_level || "").toLowerCase();
          return expList.some(exp => {
            if (exp.includes("8") || exp === "senior" || exp === "lead") {
              return jExp.includes("8") || jExp.includes("9") || jExp.includes("10") || jExp === "senior" || jExp === "lead";
            } else if (exp.includes("4") || exp.includes("7") || exp === "mid") {
              return jExp.includes("4") || jExp.includes("5") || jExp.includes("6") || jExp.includes("7") || jExp === "mid";
            } else if (exp.includes("0") || exp.includes("3") || exp === "junior" || exp.includes("entry")) {
              return jExp.includes("0") || jExp.includes("1") || jExp.includes("2") || jExp.includes("3") || jExp.includes("entry") || jExp === "junior";
            }
            return jExp.includes(exp);
          });
        });
      }
    }

    // 6. Location Search (State / City)
    if (req.query.city) {
      const city = req.query.city.toLowerCase().trim();
      jobs = jobs.filter(j => (j.location || "").toLowerCase().includes(city));
    }
    if (req.query.state) {
      const state = req.query.state.toLowerCase().trim();
      jobs = jobs.filter(j => (j.location || "").toLowerCase().includes(state));
    }
    if (req.query.location) {
      const loc = req.query.location.toLowerCase().trim();
      jobs = jobs.filter(j => (j.location || "").toLowerCase().includes(loc));
    }

    // 7. Text Search (across job title, description, client name, vendor name)
    if (req.query.search) {
      const q = req.query.search.toLowerCase().trim();
      jobs = jobs.filter(j => {
        const matchTitle = (j.title || "").toLowerCase().includes(q);
        const matchDesc = (j.description || "").toLowerCase().includes(q);
        const matchClient = (j.client_name || "").toLowerCase().includes(q);
        const matchVendor = (j.vendor_name || "").toLowerCase().includes(q);
        const matchSkills = j.skills && typeof j.skills === "object"
            ? Object.values(j.skills).flat().some(skill => String(skill).toLowerCase().includes(q))
            : false;
        return matchTitle || matchDesc || matchClient || matchVendor || matchSkills;
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = (page - 1) * limit;

    // Sorting
    if (req.query.sort) {
      const s = String(req.query.sort).toLowerCase().trim();
      if (s === "newest") {
        jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (s === "highest_pay") {
        jobs.sort((a, b) => {
          const aMax = parseFloat(a.pay_max || a.pay_min || 0);
          const bMax = parseFloat(b.pay_max || b.pay_min || 0);
          return bMax - aMax;
        });
      } else if (s === "remote_first") {
        jobs.sort((a, b) => {
          const aRemote = (a.work_style || "").toLowerCase() === "remote" ? 0 : 1;
          const bRemote = (b.work_style || "").toLowerCase() === "remote" ? 0 : 1;
          if (aRemote !== bRemote) return aRemote - bRemote;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      }
    } else {
      jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const count = jobs.length;
    const paginated = jobs.slice(offset, offset + limit);

    return res.json({
      success: true, page, limit, total: count,
      hasMore: offset + paginated.length < count,
      jobs: paginated
    });
  } catch (err) {
    console.error("GET JOBS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.get(req.params.id);

    if (!job || job.status !== "active") {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!req.admin) {
      trackEvent({
        event_type: "JOB_VIEWED",
        actor: req.user ? { user_id: req.user.id } : {},
        entity: { type: "job", id: job.id }
      }).catch(() => {});

      Job.update({ id: job.id }, { views_count: (job.views_count || 0) + 1 }).catch(() => {});
    }

    return res.json({ success: true, job });
  } catch (err) {
    console.error("GET JOB BY ID ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};
