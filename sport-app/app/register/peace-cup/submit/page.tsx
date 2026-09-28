import SubmitFlow from "@/components/SubmitFlow";

export default function PeaceCupSubmitPage() {
  return (
    <SubmitFlow
      tournamentSlug="peace-cup"
      tournamentName="The Hon. Olumoh-Ajegunle Peace Cup"
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
      reviewRoute="/register/peace-cup/review"
      confirmationRoute="/register/peace-cup/confirmation"
      requireProofOfAge={false}
      includeHeight={false}
    />
  );
}
