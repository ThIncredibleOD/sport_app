import StaffFlow from "@/components/StaffFlow";

export default function PeaceCupMedicsPage() {
  return (
    <StaffFlow
      role="medics"
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
      backRoute="/register/peace-cup/assistant-coach"
      nextRoute="/register/peace-cup/players"
      nextLabel="Continue to Players"
    />
  );
}
