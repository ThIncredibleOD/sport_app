import SubmitFlow from "@/components/SubmitFlow";

export default function UnityCupSubmitPage() {
  return (
    <SubmitFlow
      tournamentSlug="unity-cup"
      tournamentName="The Nathaniel Idowu Unity Cup"
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Cup"
      reviewRoute="/register/unity-cup/review"
      confirmationRoute="/register/unity-cup/confirmation"
    />
  );
}
