import StaffFlow from "@/components/StaffFlow";

export default function UnityCupAssistantCoachPage() {
  return (
    <StaffFlow
      role="assistant-coach"
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Cup"
      backRoute="/register/unity-cup/academy-squad"
      nextRoute="/register/unity-cup/medics"
      nextLabel="Continue to Medics"
    />
  );
}
