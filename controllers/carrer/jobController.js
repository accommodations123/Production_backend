import Job from "../../model/carrer/Job.js";

const ALLOWED_FILTERS = [
  "location",
  "department",
  "employment_type",
  "work_style"
];

export const createJob = async (req, res) => {
  try {
    const {
      title,
      company,
      department,
      location,
      employment_type,
      work_style,
      experience_level,
      description
    } = req.body;

    if (
      !title ||
      !company ||
      !department ||
      !location ||
      !employment_type ||
      !work_style ||
      !experience_level ||
      !description
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const job = await Job.create({
      ...req.body,
      created_by: req.admin.id,
      status: "draft"
    });

    return res.status(201).json({ success: true, job });

  } catch (err) {
    console.error("CREATE JOB ERROR:", err);
    return res.status(500).json({ message: "Failed to create job" });
  }
};



export const getMyJobs = async (req, res) => {
  const jobs = await Job.findAll({
    where: {
      created_by: req.admin.id   // 👈 THIS IS THE KEY
    },
    order: [["created_at", "DESC"]],
    attributes: [
      "id",
      "title",
      "company",
      "location",
      "employment_type",
      "work_style",
      "status",
      "applications_count",
      "created_at"
    ]
  });

  res.json({
    success: true,
    jobs
  });
};


export const getJobs = async (req, res) => {
  try {
    const where = { status: "active" };

    ALLOWED_FILTERS.forEach((key) => {
      if (req.query[key]) {
        where[key] = req.query[key];
      }
    });

    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = (page - 1) * limit;

    const jobs = await Job.findAll({
      where,
      limit,
      offset,
      order: [["created_at", "DESC"]]
    });

    return res.json({ success: true, jobs });

  } catch (err) {
    console.error("GET JOBS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findOne({
      where: {
        id: req.params.id,
        status: "active"
      }
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Count views only for public users
    if (!req.admin) {
      await job.increment("views_count");
    }

    return res.json({ success: true, job });

  } catch (err) {
    console.error("GET JOB ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};


