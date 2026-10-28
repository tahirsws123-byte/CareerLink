import SectionContainer from "./SectionContainer.jsx";
import ChipsBlock from "./ChipsBlock.jsx";

const software = [
  "Ecommerce Platforms",
  "CRM Software",
  "Human Resources Management Systems",
  "Recruiting Software",
  "Sales Intelligence Software",
  "Project Management Software",
  "Help Desk Software",
  "Social Networking Software",
  "Desktop Publishing Software",
];

export default function SoftwareSection() {
  return (
    <SectionContainer>
      <ChipsBlock
        title="Discover the best software tools"
        subtitle="Connect with buyers who have tried and reviewed the top products for you."
        chips={software}
        ctaLabel="Show all"
      />
    </SectionContainer>
  );
}