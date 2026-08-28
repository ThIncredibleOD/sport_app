import StaffFlow from "@/components/StaffFlow";

export default function SecondaryCupMedicsPage() {
  return (
    <StaffFlow
      role="medics"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Football League"
      backRoute="/register/secondary-cup/assistant-coach"
      nextRoute="/register/secondary-cup/players"
      nextLabel="Continue to Players"
    />
  );
}
