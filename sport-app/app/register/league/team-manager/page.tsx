import StaffFlow from "@/components/StaffFlow";

export default function LeagueTeamManagerPage() {
  return (
    <StaffFlow
      role="team-manager"
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
      backRoute="/register/league/account-profile"
      nextRoute="/register/league/academy-squad"
      nextLabel="Continue to Head Coach"
    />
  );
}
