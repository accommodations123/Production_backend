import sequelize from "../../config/db.js";
import Application from "../../model/carrer/Application.js";
import Job from "../../model/carrer/Job.js";
import User from "../../model/User.js";
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
      availability_date
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
        availability_date,
        resume_url: req.file?.location || null,
        status: "new"
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
