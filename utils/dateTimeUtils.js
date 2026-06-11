export const nowUTC = () => new Date();

export const toUTCDateTime = (date, time = "00:00") => {
  if (!date) return null;
  let timeStr = time || "00:00";
  const colonCount = (timeStr.match(/:/g) || []).length;
  if (colonCount === 1) {
    timeStr = `${timeStr}:00`;
  }
  if (!timeStr.endsWith("Z") && !timeStr.includes("+") && !timeStr.includes("-")) {
    timeStr = `${timeStr}Z`;
  }
  return new Date(`${date}T${timeStr}`);
};

export const isExpiredUTC = (date, time = "23:59:59") => {
  const target = toUTCDateTime(date, time);
  if (!target) return true;
  return target.getTime() < Date.now();
};

export const isUpcomingUTC = (date, time = "00:00") => {
  const target = toUTCDateTime(date, time);
  if (!target) return false;
  return target.getTime() >= Date.now();
};

export const convertLocalToUTC = (date, time = "00:00") => {
  const local = new Date(`${date}T${time}`);
  const iso = local.toISOString();
  return {
    date: iso.split("T")[0],
    time: iso.split("T")[1].slice(0, 5)
  };
};
