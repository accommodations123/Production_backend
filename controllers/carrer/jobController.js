import Job from "../../model/carrer/Job.js";
import { trackEvent } from "../../services/Analytics.js";
import { logAudit } from "../../services/auditLogger.js";

const ALLOWED_FILTERS = ["department", "employment_type", "work_style", "experience_level"];

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

export const createJob = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const REQUIRED_FIELDS = ["title", "company", "department", "location", "employment_type", "work_style", "experience_level", "description"];
    for (const field of REQUIRED_FIELDS) {
      if (!req.body[field]) return res.status(400).json({ message: `Missing required field: ${field}` });
    }

    const ALLOWED_FIELDS = ["title", "company", "department", "location", "geo_restriction", "employment_type", "contract_duration", "work_style", "experience_level", "salary_range", "description", "requirements", "responsibilities", "skills", "mandatory_conditions", "metadata"];
    const payload = pick(req.body, ALLOWED_FIELDS);

    payload.requirements ??= [];
    payload.responsibilities ??= [];
    payload.skills = normalizeSkills(payload.skills);
    payload.mandatory_conditions ??= [];
    payload.metadata ??= {};

    const job = await Job.create({
      ...payload,
      created_by: req.admin.id,
      status: "draft"
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

    // Query by created_by GSI, filter out deleted
    let allJobs = await Job.query("created_by").eq(req.admin.id).exec();
    allJobs = allJobs.filter(j => j.status !== "deleted");
    allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const count = allJobs.length;
    const jobs = allJobs.slice(offset, offset + limit).map(j => ({
      id: j.id, title: j.title, company: j.company, location: j.location,
      employment_type: j.employment_type, work_style: j.work_style,
      experience_level: j.experience_level, status: j.status,
      applications_count: j.applications_count, views_count: j.views_count,
      created_at: j.created_at
    }));

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
    // Query by status GSI for active jobs
    let jobs = await Job.query("status").eq("active").exec();

    // Client-side filtering
    for (const key of ALLOWED_FILTERS) {
      if (req.query[key]) {
        jobs = jobs.filter(j => j[key] === req.query[key]);
      }
    }

    // Location search (partial match)
    if (req.query.location && typeof req.query.location === "string" && req.query.location.length <= 50) {
      const locationLower = req.query.location.toLowerCase();
      jobs = jobs.filter(j => j.location?.toLowerCase().includes(locationLower));
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = (page - 1) * limit;

    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

    // Track views only for non-admins
    if (!req.admin) {
      trackEvent({
        event_type: "JOB_VIEWED",
        actor: req.user ? { user_id: req.user.id } : {},
        entity: { type: "job", id: job.id }
      }).catch(() => {});

      // Non-blocking increment
      Job.update({ id: job.id }, { views_count: (job.views_count || 0) + 1 }).catch(() => {});
    }

    return res.json({ success: true, job });
  } catch (err) {
    console.error("GET JOB BY ID ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};
