import Job from "./models/Job.js";

const demoJobs = [
  { title: "Senior Product Designer", company: "Northstar Labs", location: "Remote · US", type: "Full-time", level: "Senior", salary: "$140k - $180k", description: "Lead end-to-end design for B2B hiring tools, partner with product and engineering, and simplify the candidate experience.", tags: ["Product", "UX", "Remote"], postedAt: new Date(Date.now() - 2 * 86400000) },
  { title: "Frontend Engineer", company: "Aster Cloud", location: "New York, NY", type: "Hybrid", level: "Mid-Senior", salary: "$120k - $160k", description: "Build polished customer experiences for a SaaS platform, own frontend architecture, and contribute to design system decisions.", tags: ["React", "TypeScript", "Design System"], postedAt: new Date(Date.now() - 4 * 86400000) },
  { title: "People Operations Manager", company: "BrightPath", location: "Austin, TX", type: "Full-time", level: "Manager", salary: "$110k - $135k", description: "Drive hiring, performance cycles, and employee experience programs across a fast-growing distributed team.", tags: ["People Ops", "Culture", "Leadership"], postedAt: new Date(Date.now() - 7 * 86400000) },
  { title: "Data Analyst", company: "Signal Grid", location: "Remote · Europe", type: "Contract", level: "Associate", salary: "$80k - $115k", description: "Analyze funnel and product metrics, build dashboards, and help product teams make data-informed decisions.", tags: ["SQL", "Analytics", "BI"], postedAt: new Date() },
];

export const seedJobsIfEmpty = async () => {
  if (await Job.exists()) return;
  await Job.insertMany(demoJobs);
  console.log("Seeded demo jobs");
};
