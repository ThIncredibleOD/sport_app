import StaffFlow from "@/components/StaffFlow";

export default function PeaceCupAssistantCoachPage() {
  return (
    <StaffFlow
      role="assistant-coach"
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
      backRoute="/register/peace-cup/academy-squad"
      nextRoute="/register/peace-cup/players"
      nextLabel="Continue to Players"
    />
  );
}
