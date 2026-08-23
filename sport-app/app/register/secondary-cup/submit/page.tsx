import SubmitFlow from "@/components/SubmitFlow";

export default function SecondaryCupSubmitPage() {
  return (
    <SubmitFlow
      tournamentSlug="secondary-cup"
      tournamentName="The Nathaniel Idowu Secondary Cup"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Cup"
      reviewRoute="/register/secondary-cup/review"
      confirmationRoute="/register/secondary-cup/confirmation"
    />
  );
}
