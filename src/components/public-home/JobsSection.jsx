import SectionContainer from "./SectionContainer.jsx";
import ChipsBlock from "./ChipsBlock.jsx";

const jobs = [
  "Engineering",
  "Business Development",
  "Finance",
  "Administrative Assistant",
  "Retail Associate",
  "Customer Service",
  "Operations",
  "Information Technology",
  "Marketing",
  "Human Resources",
];

export default function JobsSection() {
  return (
    <SectionContainer>
      <ChipsBlock
        title="Find the right job or internship for you"
        chips={jobs}
        ctaLabel="Show more"
      />
    </SectionContainer>
  );
}