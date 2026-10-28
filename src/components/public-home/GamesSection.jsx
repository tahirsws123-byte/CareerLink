import SectionContainer from "./SectionContainer.jsx";
import ChipsBlock from "./ChipsBlock.jsx";

export default function GamesSection() {
  return (
    <SectionContainer bg="bg-warm">
      <ChipsBlock
        title="Keep your mind sharp with games"
        subtitle="Take a break and reconnect with your network through your daily games."
        chips={[
          "Pinpoint",
          "Zip",
          "Mini Sudoku",
          "Queens",
          "Tango",
          "Crossclimb",
        ]}
        ctaLabel="See all games"
      />
    </SectionContainer>
  );
}