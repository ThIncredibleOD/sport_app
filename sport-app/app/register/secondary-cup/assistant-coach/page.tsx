import StaffFlow from "@/components/StaffFlow";

export default function SecondaryCupAssistantCoachPage() {
  return (
    <StaffFlow
      role="assistant-coach"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Football League"
      backRoute="/register/secondary-cup/academy-squad"
      nextRoute="/register/secondary-cup/medics"
      nextLabel="Continue to Medics"
    />
  );
}
