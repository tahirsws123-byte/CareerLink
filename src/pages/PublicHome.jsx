import PublicHeader from "../components/public-home/PublicHeader.jsx";
import HeroSection from "../components/public-home/HeroSection.jsx";
import TopicChipsSection from "../components/public-home/TopicChipsSection.jsx";
import JobsSection from "../components/public-home/JobsSection.jsx";
import PostJobSection from "../components/public-home/PostJobSection.jsx";
import SoftwareSection from "../components/public-home/SoftwareSection.jsx";
import GamesSection from "../components/public-home/GamesSection.jsx";
import OpenToWorkSection from "../components/public-home/OpenToWorkSection.jsx";
import CommunityCards from "../components/public-home/CommunityCards.jsx";
import LinkedInForSection from "../components/public-home/LinkedInForSection.jsx";
import VideoSection from "../components/public-home/VideoSection.jsx";
import FinalCTA from "../components/public-home/FinalCTA.jsx";
import PublicFooter from "../components/public-home/PublicFooter.jsx";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <PublicHeader />

      <main>
        <HeroSection />
        <TopicChipsSection />
        <JobsSection />
        <PostJobSection />
        <SoftwareSection />
        <GamesSection />
        <OpenToWorkSection />
        <CommunityCards />
        <LinkedInForSection />
        <VideoSection />
        <FinalCTA />
      </main>

      <PublicFooter />
    </div>
  );
}