import StaffFlow from "@/components/StaffFlow";

export default function PeaceCupTeamManagerPage() {
  return (
    <StaffFlow
      role="team-manager"
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
      backRoute="/register/peace-cup/account-profile"
      nextRoute="/register/peace-cup/academy-squad"
      nextLabel="Continue to Head Coach"
    />
  );
}
