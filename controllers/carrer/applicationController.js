import sequelize from "../../config/db.js";
import { Sequelize } from "sequelize";

import Job from "../../model/carrer/Job.js";
import Application from "../../model/carrer/Application.js";
import ApplicationStatusHistory from "../../model/carrer/ApplicationStatusHistory.js";
import User from "../../model/User.js";
import Notification from "../../model/Notification.js";

import { trackEvent } from "../../services/Analytics.js";
import { logAudit } from "../../services/auditLogger.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
const VALID_STATUSES = [
  "submitted",
  "viewed",
  "reviewing",
  "interview",
  "offer",
  "rejected"
];
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
    if (!req.user) {
      return res.status(401).json({ message: "Login required" });
    }

    const application = await sequelize.transaction(async (t) => {
      const {
        job_id,
        first_name,
        last_name,
        email,
        phone,
        linkedin_url,
        portfolio_url,
        experience
      } = req.body;

      if (!job_id || !first_name || !last_name || !email) {
        throw { status: 400, message: "Missing required fields" };
      }

      const job = await Job.findOne({
        where: { id: job_id, status: "active" },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!job) {
        throw { status: 404, message: "Job not available" };
      }

      let app;
      try {
        app = await Application.create(
          {
            job_id,
            user_id: req.user.id,
            first_name,
            last_name,
            email,
            phone,
            linkedin_url,
            portfolio_url,
            experience: experience || [],
            resume_url: req.file?.location || null,
            status: "submitted"
          },
          { transaction: t }
        );
      } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
          throw { status: 409, message: "Already applied to this job" };
        }
        throw err;
      }

      await job.increment("applications_count", { transaction: t });

      return app;
    });

    trackEvent({
      event_type: "JOB_APPLICATION_SUBMITTED",
      actor: { user_id: req.user.id },
      entity: { type: "job", id: application.job_id },
      metadata: { application_id: application.id }
    }).catch(console.error);

    return res.status(201).json({ success: true, application });

  } catch (err) {
    return res.status(err.status || 500).json({
      message: err.message || "Failed to apply for job"
    });
  }
};


export const getMyApplications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;

    const { rows, count } = await Application.findAndCountAll({
      where: {
        user_id: req.user.id
      },
      attributes: [
        "id",
        "status",
        "created_at"
      ],
      include: [
        {
          model: Job,
          as: "job",
          attributes: [
            "id",
            "title",
            "company",
            "location",
            "employment_type",
            "work_style"
          ]
        }
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    return res.json({
      success: true,
      page,
      limit,
      total: count,
      hasMore: offset + rows.length < count,
      applications: rows
    });

  } catch (err) {
    console.error("GET MY APPLICATIONS ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch applications"
    });
  }
};

export const updateJobStatus = async (req, res) => {
  if (!req.admin) return res.status(403).json({ message: "Unauthorized" });

  const { status } = req.body;
  const allowed = ["draft", "active", "closed"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const job = await Job.findByPk(req.params.id);
  if (!job) return res.status(404).json({ message: "Job not found" });

  const prev = job.status;
  job.status = status;
  await job.save();

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
    severity: "MEDIUM",
    req,
    metadata: { from: prev, to: status }
  }).catch(console.error);

  return res.json({ success: true, job });
};



/* =====================================================
   UPDATE APPLICATION STATUS (FSM + ATOMIC)
   ===================================================== */
/* ================= UPDATE APPLICATION STATUS ================= */

export const updateApplicationStatus = async (req, res) => {
  if (!req.admin) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  await sequelize.transaction(async (t) => {
    const application = await Application.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!application) {
      throw { status: 404, message: "Application not found" };
    }

    const prev = application.status;

    if (prev === status) {
      throw { status: 400, message: "Status already set" };
    }

    if (!STATUS_TRANSITIONS[prev]?.includes(status)) {
      throw {
        status: 400,
        message: `Invalid transition from ${prev} to ${status}`
      };
    }

    await application.update({ status }, { transaction: t });

    await ApplicationStatusHistory.create(
      {
        application_id: application.id,
        from_status: prev,
        to_status: status,
        acted_by_id: req.admin.id,
        acted_by_role: "admin"
      },
      { transaction: t }
    );

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
      severity: "MEDIUM",
      req,
      metadata: { from: prev, to: status }
    }).catch(console.error);
  });

  return res.json({ success: true });
};




export const getAllApplications = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await Application.findAndCountAll({
      attributes: [
        "id",
        "status",
        "first_name",
        "last_name",
        "email",
        "phone",
        "experience",
        "resume_url",
        "created_at",
        "job_id",
        "user_id"
      ],
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title"]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "email"]
        }
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    return res.json({
      success: true,
      page,
      limit,
      total: count,
      hasMore: offset + rows.length < count,
      applications: rows
    });

  } catch (err) {
    console.error("GET ALL APPLICATIONS ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch applications"
    });
  }
};



/* ================= ADMIN VIEW APPLICATION ================= */

export const getAdminApplicationById = async (req, res) => {
  if (!req.admin) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  let application;

  await sequelize.transaction(async (t) => {
    application = await Application.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [{ model: Job, as: "job", attributes: ["id", "title"] }]
    });

    if (!application) {
      throw { status: 404, message: "Application not found" };
    }

    if (application.status === "submitted") {
      await application.update(
        {
          status: "viewed",
          viewed_by_admin: req.admin.id,
          last_viewed_at: new Date()
        },
        { transaction: t }
      );

      await ApplicationStatusHistory.create(
        {
          application_id: application.id,
          from_status: "submitted",
          to_status: "viewed",
          acted_by_id: req.admin.id,
          acted_by_role: "admin"
        },
        { transaction: t }
      );

      await Notification.create(
        {
          user_id: application.user_id,
          type: "application_viewed",
          title: "Application viewed",
          message: `Your application for "${application.job.title}" was reviewed`
        },
        { transaction: t }
      );
    }
  });

  return res.json({ success: true, application });
};




/* ================= NOTIFY USER (NO STATUS CHANGE) ================= */

// controllers/application.controller.js

export const notifyApplicationUser = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { subject, message, template, status } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        message: "Subject and message required"
      });
    }

    const application = await Application.findByPk(req.params.id, {
      include: [
        { model: User, as: "user" },
        { model: Job, as: "job", attributes: ["id", "title"] }
      ]
    });

    if (!application || !application.user) {
      return res.status(404).json({
        message: "Application/User not found"
      });
    }

    // ✅ PERSISTING STATUS CHANGE (Fixes "gone on refresh" bug)
    if (status && VALID_STATUSES.includes(status) && application.status !== status) {
      const prev = application.status;
      await application.update({ status });

      // 📜 Add to history for audit trail
      await ApplicationStatusHistory.create({
        application_id: application.id,
        from_status: prev,
        to_status: status,
        acted_by_id: req.admin.id,
        acted_by_role: "admin"
      }).catch(err => console.error("HISTORY_LOG_FAILED:", err.message));
    }

    // 🔔 ONE SINGLE SOURCE OF TRUTH
    await notifyAndEmail({
      userId: application.user.id,
      email: application.user.email,
      type: "APPLICATION_UPDATE",
      title: subject,
      message,
      metadata: {
        subject,                 // ✅ REQUIRED
        message,                 // ✅ REQUIRED
        applicationId: application.id,
        jobId: application.job_id,
        status: application.status,
        template
      }
    });

    return res.json({
      success: true,
      message: "Notification and email sent"
    });

  } catch (err) {
    console.error("NOTIFY APPLICATION ERROR:", err);
    return res.status(500).json({
      message: "Failed to notify applicant"
    });
  }
};

