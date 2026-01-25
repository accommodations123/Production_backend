import sequelize from "../../config/db.js";
import Application from "../../model/carrer/Application.js";
import ApplicationStatusHistory from '../../model/carrer/ApplicationStatusHistory.js'
import Job from "../../model/carrer/Job.js";
import User from "../../model/User.js";
import Notification from "../../model/Notification.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
const VALID_STATUSES = [
  "new",
  "reviewing",
  "interview",
  "offer",
  "rejected"
];

export const applyJob = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
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
      return res.status(400).json({ message: "Missing required fields" });
    }

    const job = await Job.findOne({
      where: { id: job_id, status: "active" },
      transaction
    });

    if (!job) {
      return res.status(404).json({ message: "Job not available" });
    }

    // Prevent duplicate application per user per job
    if (req.user?.id) {
      const exists = await Application.findOne({
        where: { job_id, user_id: req.user.id },
        transaction
      });

      if (exists) {
        return res.status(409).json({ message: "Already applied to this job" });
      }
    }

    const application = await Application.create(
      {
        job_id,
        user_id: req.user?.id || null,
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
      { transaction }
    );

    await job.increment("applications_count", { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      application
    });

  } catch (err) {
    await transaction.rollback();
    console.error("APPLY JOB ERROR:", err);
    return res.status(500).json({ message: "Failed to apply for job" });
  }
};



export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 10), 50);
    const offset = (page - 1) * limit;

    const applications = await Application.findAll({
      where: { user_id: userId },
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
      applications
    });

  } catch (err) {
    console.error("GET MY APPLICATIONS ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch applications"
    });
  }
};
export const updateJobStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["draft", "active", "closed"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const job = await Job.findByPk(req.params.id);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  job.status = status;
  await job.save();

  res.json({ success: true, job });
};



export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await Application.findByPk(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status === status) {
      return res.status(400).json({ message: "Status already set" });
    }

    application.status = status;
    await application.save();

    // NOTE: status history + email trigger should go here

    return res.json({ success: true });

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ message: "Failed to update status" });
  }
};

export const getAllApplications = async (req, res) => {
  const applications = await Application.findAll({
    order: [["created_at", "DESC"]],
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
    ]
  });

  res.json({ success: true, applications });
};


export const getAdminApplicationById = async (req, res) => {
  const application = await Application.findByPk(req.params.id, {
    include: [
      {
        model: Job,
        as: "job",
        attributes: ["id", "title"]
      }
    ]
  });

  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  // FIRST VIEW LOGIC
 if (application.status === "submitted") {
  await application.update({
    status: "viewed",
    last_viewed_at: new Date(),
    viewed_by_admin: req.admin.id,
    status_updated_at: new Date()
  });

  await ApplicationStatusHistory.create({
    application_id: application.id,
    from_status: "submitted",
    to_status: "viewed",
    acted_by_id: req.admin.id,
    acted_by_role: "admin"
  });

  // 🔔 USER NOTIFICATION
  await Notification.create({
    user_id: application.user_id,
    type: "application_viewed",
    title: "Your application was viewed",
    message: `Your application for "${application.job.title}" has been reviewed by our team.`,
    meta: {
      application_id: application.id,
      job_id: application.job_id
    }
  });
}


  return res.json({
    success: true,
    application
  });
};




export const notifyApplicationUser = async (req, res) => {
  try {
    const { subject, message, template, status } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message required" });
    }

    const application = await Application.findByPk(req.params.id, {
      include: [{ model: User, as: "user" }]
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!application.user) {
      return res.status(400).json({ message: "Application has no user" });
    }

    // Optional: update status if provided
    if (status && application.status !== status) {
      application.status = status;
      application.status_updated_at = new Date();
      await application.save();
    }

    // 🔔 ONE CALL DOES EVERYTHING
    await notifyAndEmail({
      userId: application.user.id,
      email: application.user.email,
      type: "APPLICATION_UPDATE",
      title: subject,
      message,
      metadata: {
        applicationId: application.id,
        jobId: application.job_id,
        status: application.status,
        template
      }
    });

    return res.json({
      success: true,
      message: "Notification and email sent successfully"
    });

  } catch (err) {
    console.error("APPLICATION NOTIFY ERROR:", err);
    return res.status(500).json({ message: "Failed to send notification" });
  }
};
