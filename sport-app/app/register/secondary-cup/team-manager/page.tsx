import StaffFlow from "@/components/StaffFlow";

export default function SecondaryCupTeamManagerPage() {
  return (
    <StaffFlow
      role="team-manager"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Football League"
      backRoute="/register/secondary-cup/account-profile"
      nextRoute="/register/secondary-cup/academy-squad"
      nextLabel="Continue to Head Coach"
    />
  );
}
