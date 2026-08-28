import StaffFlow from "@/components/StaffFlow";

export default function UnityCupTeamManagerPage() {
  return (
    <StaffFlow
      role="team-manager"
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Cup"
      backRoute="/register/unity-cup/account-profile"
      nextRoute="/register/unity-cup/academy-squad"
      nextLabel="Continue to Head Coach"
    />
  );
}
