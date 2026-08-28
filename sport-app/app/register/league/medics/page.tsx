import StaffFlow from "@/components/StaffFlow";

export default function LeagueMedicsPage() {
  return (
    <StaffFlow
      role="medics"
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
      backRoute="/register/league/assistant-coach"
      nextRoute="/register/league/players"
      nextLabel="Continue to Players"
    />
  );
}
