import SectionContainer from "./SectionContainer.jsx";
import ChipsBlock from "./ChipsBlock.jsx";

const topics = [
  "Career",
  "Productivity",
  "Finance",
  "Soft Skills & Emotional Intelligence",
  "Personal Development",
  "Project Management",
  "Healthcare",
  "Technology",
  "Leadership",
  "Ecommerce",
];

export default function TopicChipsSection() {
  return (
    <SectionContainer bg="bg-warm">
      <ChipsBlock
        title="Explore top CareerLink content"
        subtitle="Grow your network and expertise curated by users and the press."
        chips={topics}
        ctaLabel="Show all"
      />
    </SectionContainer>
  );
}