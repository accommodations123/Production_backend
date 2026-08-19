import dotenv from "dotenv";
dotenv.config();

import User from "../model/User.js";
import Host from "../model/Host.js";
import ApprovedHost from "../model/Approved.js";
import { checkDynamoDBConnection } from "../config/db.js";

async function run() {
  console.log("🧹 Removing all static profile images of hosts/users...");
  const isConnected = await checkDynamoDBConnection();
  if (!isConnected) {
    console.error("❌ Cannot connect to DynamoDB");
    process.exit(1);
  }

  // 1. Scan Users and clear profile_image if it starts with http (e.g. unsplash/static) or is set
  const users = await User.scan().exec();
  console.log(`Found ${users.length} users.`);
  for (const user of users) {
    if (user.profile_image) {
      console.log(`Removing static image for user ${user.id} (${user.email || user.name}): ${user.profile_image}`);
      await User.update({ id: user.id }, { $REMOVE: ["profile_image"] });
    }
  }

  // 2. Scan Hosts
  const hosts = await Host.scan().exec();
  console.log(`Found ${hosts.length} hosts.`);
  for (const host of hosts) {
    let updated = false;
    const updateObj = {};
    if (host.profile_image) {
      updateObj.profile_image = null;
      updated = true;
    }
    if (updated) {
      console.log(`Updating host ${host.id}...`);
      await Host.update({ id: host.id }, updateObj);
    }
  }

  // 3. Scan ApprovedHost snapshots
  const approvedList = await ApprovedHost.scan().exec();
  console.log(`Found ${approvedList.length} approved host records.`);
  for (const item of approvedList) {
    let updated = false;
    let hostSnapshot = item.host_snapshot ? { ...item.host_snapshot } : null;
    if (hostSnapshot && hostSnapshot.profile_image) {
      delete hostSnapshot.profile_image;
      updated = true;
    }
    if (hostSnapshot && hostSnapshot.avatar) {
      delete hostSnapshot.avatar;
      updated = true;
    }
    if (updated) {
      console.log(`Cleaning host_snapshot in ApprovedHost ${item.id}...`);
      await ApprovedHost.update({ id: item.id }, { host_snapshot: hostSnapshot });
    }
  }

  console.log("✨ All host static images removed successfully!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
