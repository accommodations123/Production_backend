import dotenv from "dotenv";
dotenv.config();
import Application from "../model/carrer/Application.js";

const run = async () => {
  try {
    const apps = await Application.scan().exec();
    console.log("=== FULL APPLICATIONS ===");
    console.log(JSON.stringify(apps, null, 2));
  } catch (err) {
    console.error(err);
  }
};

run().then(() => process.exit(0));
