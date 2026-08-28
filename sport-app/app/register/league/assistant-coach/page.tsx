import StaffFlow from "@/components/StaffFlow";

export default function LeagueAssistantCoachPage() {
  return (
    <StaffFlow
      role="assistant-coach"
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
      backRoute="/register/league/academy-squad"
      nextRoute="/register/league/medics"
      nextLabel="Continue to Medics"
    />
  );
}
