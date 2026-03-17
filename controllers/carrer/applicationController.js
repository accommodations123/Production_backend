import Job from "../../model/carrer/Job.js";
import Application from "../../model/carrer/Application.js";
import ApplicationStatusHistory from "../../model/carrer/ApplicationStatusHistory.js";
import User from "../../model/User.js";
import Notification from "../../model/Notification.js";

import { trackEvent } from "../../services/Analytics.js";
import { logAudit } from "../../services/auditLogger.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";

const VALID_STATUSES = ["submitted", "viewed", "reviewing", "interview", "offer", "rejected"];
const STATUS_TRANSITIONS = {
  submitted: ["viewed"],
  viewed: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: [],
  rejected: []
};

/* ================= APPLY JOB ================= */
export const applyJob = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });

    const { job_id, first_name, last_name, email, phone, linkedin_url, portfolio_url, experience } = req.body;

    if (!job_id || !first_name || !last_name || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const job = await Job.get(job_id);
    if (!job || job.status !== "active") {
      return res.status(404).json({ message: "Job not available" });
    }

    // Check if already applied
    const existingApps = await Application.query("job_id").eq(job_id).exec();
    if (existingApps.some(a => a.user_id === req.user.id)) {
      return res.status(409).json({ message: "Already applied to this job" });
    }

    const application = await Application.create({
      job_id, user_id: req.user.id, first_name, last_name, email, phone,
      linkedin_url, portfolio_url, experience: experience || [],
      resume_url: req.file?.location || null, status: "submitted"
    });

    // Increment applications count
    await Job.update({ id: job.id }, { applications_count: (job.applications_count || 0) + 1 });

    trackEvent({
      event_type: "JOB_APPLICATION_SUBMITTED",
      actor: { user_id: req.user.id },
      entity: { type: "job", id: application.job_id },
      metadata: { application_id: application.id }
    }).catch(console.error);

    return res.status(201).json({ success: true, application });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Failed to apply for job" });
  }
};

/* ================= MY APPLICATIONS ================= */
export const getMyApplications = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    // Query by user_id GSI
    const allApps = await Application.query("user_id").eq(req.user.id).exec();
    allApps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const count = allApps.length;
    const rows = allApps.slice(offset, offset + limit);

    // Enrich with job data
    const applications = await Promise.all(rows.map(async app => {
      const job = await Job.get(app.job_id);
      return {
        id: app.id, status: app.status, created_at: app.created_at,
        job: job ? {
          id: job.id, title: job.title, company: job.company,
          location: job.location, employment_type: job.employment_type, work_style: job.work_style
        } : null
      };
    }));

    return res.json({
      success: true, page, limit, total: count,
      hasMore: offset + rows.length < count, applications
    });
  } catch (err) {
    console.error("GET MY APPLICATIONS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch applications" });
  }
};

/* ================= UPDATE JOB STATUS ================= */
export const updateJobStatus = async (req, res) => {
  if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

  const { status } = req.body;
  const allowed = ["draft", "active", "closed"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });

  const job = await Job.get(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });

  const prev = job.status;
  await Job.update({ id: job.id }, { status });

  trackEvent({
    event_type: "JOB_STATUS_CHANGED",
    actor: { user_id: req.admin.id },
    entity: { type: "job", id: job.id },
    metadata: { from: prev, to: status }
  }).catch(console.error);

  logAudit({
    action: "JOB_STATUS_CHANGED",
    actor: { admin_id: req.admin.id },
    target: { type: "job", id: job.id },
    severity: "MEDIUM", req, metadata: { from: prev, to: status }
  }).catch(console.error);

  const updated = await Job.get(job.id);
  return res.json({ success: true, job: updated });
};

/* ================= UPDATE APPLICATION STATUS ================= */
export const updateApplicationStatus = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });

    const application = await Application.get(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const prev = application.status;
    if (prev === status) return res.status(400).json({ message: "Status already set" });

    if (!STATUS_TRANSITIONS[prev]?.includes(status)) {
      return res.status(400).json({ message: `Invalid transition from ${prev} to ${status}` });
    }

    await Application.update({ id: application.id }, { status });

    await ApplicationStatusHistory.create({
      application_id: application.id, from_status: prev, to_status: status,
      acted_by_id: req.admin.id, acted_by_role: "admin"
    });

    trackEvent({
      event_type: "APPLICATION_STATUS_CHANGED",
      actor: { admin_id: req.admin.id },
      entity: { type: "application", id: application.id },
      metadata: { from: prev, to: status }
    }).catch(console.error);

    logAudit({
      action: "APPLICATION_STATUS_CHANGED",
      actor: { admin_id: req.admin.id },
      target: { type: "application", id: application.id },
      severity: "MEDIUM", req, metadata: { from: prev, to: status }
    }).catch(console.error);

    return res.json({ success: true });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

/* ================= ALL APPLICATIONS (ADMIN) ================= */
export const getAllApplications = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const allApps = await Application.scan().exec();
    allApps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const count = allApps.length;
    const rows = allApps.slice(offset, offset + limit);

    const applications = await Promise.all(rows.map(async app => {
      const [job, user] = await Promise.all([
        Job.get(app.job_id).catch(() => null),
        User.get(app.user_id).catch(() => null)
      ]);
      return {
        id: app.id, status: app.status, first_name: app.first_name,
        last_name: app.last_name, email: app.email, phone: app.phone,
        experience: app.experience, resume_url: app.resume_url,
        created_at: app.created_at, job_id: app.job_id, user_id: app.user_id,
        job: job ? { id: job.id, title: job.title } : null,
        user: user ? { id: user.id, email: user.email } : null
      };
    }));

    return res.json({
      success: true, page, limit, total: count,
      hasMore: offset + rows.length < count, applications
    });
  } catch (err) {
    console.error("GET ALL APPLICATIONS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch applications" });
  }
};

/* ================= ADMIN VIEW APPLICATION ================= */
export const getAdminApplicationById = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const application = await Application.get(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    // Auto-mark as viewed
    if (application.status === "submitted") {
      await Application.update({ id: application.id }, {
        status: "viewed", viewed_by_admin: req.admin.id,
        last_viewed_at: new Date().toISOString()
      });

      await ApplicationStatusHistory.create({
        application_id: application.id, from_status: "submitted", to_status: "viewed",
        acted_by_id: req.admin.id, acted_by_role: "admin"
      });

      // Fetch job title for notification
      const job = await Job.get(application.job_id);
      await Notification.create({
        user_id: application.user_id, type: "application_viewed",
        title: "Application viewed",
        message: `Your application for "${job?.title || "a job"}" was reviewed`
      });

      application.status = "viewed";
    }

    // Enrich with job data
    const job = await Job.get(application.job_id);
    const result = { ...application, job: job ? { id: job.id, title: job.title } : null };

    return res.json({ success: true, application: result });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "Server error" });
  }
};

/* ================= NOTIFY APPLICATION USER ================= */
export const notifyApplicationUser = async (req, res) => {
  try {
    if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

    const { subject, message, template, status } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "Subject and message required" });

    const application = await Application.get(req.params.id);
    if (!application) return res.status(404).json({ message: "Application/User not found" });

    const user = await User.get(application.user_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Persist status change
    if (status && VALID_STATUSES.includes(status) && application.status !== status) {
      const prev = application.status;
      await Application.update({ id: application.id }, { status });

      await ApplicationStatusHistory.create({
        application_id: application.id, from_status: prev, to_status: status,
        acted_by_id: req.admin.id, acted_by_role: "admin"
      }).catch(err => console.error("HISTORY_LOG_FAILED:", err.message));
    }

    await notifyAndEmail({
      userId: user.id, email: application.email,
      type: "APPLICATION_UPDATE", title: subject, message,
      metadata: {
        subject, message, applicationId: application.id,
        jobId: application.job_id, status: application.status, template
      }
    });

    return res.json({ success: true, message: "Notification and email sent" });
  } catch (err) {
    console.error("NOTIFY APPLICATION ERROR:", err);
    return res.status(500).json({ message: "Failed to notify applicant" });
  }
};
