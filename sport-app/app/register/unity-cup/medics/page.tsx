import StaffFlow from "@/components/StaffFlow";

export default function UnityCupMedicsPage() {
  return (
    <StaffFlow
      role="medics"
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Cup"
      backRoute="/register/unity-cup/assistant-coach"
      nextRoute="/register/unity-cup/players"
      nextLabel="Continue to Players"
    />
  );
}
