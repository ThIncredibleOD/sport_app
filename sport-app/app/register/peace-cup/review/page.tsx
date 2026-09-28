import RegistrationReview from "@/components/RegistrationReview";

export default function PeaceCupReviewPage() {
  return (
    <RegistrationReview
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
      tournamentName="The Hon. Olumoh-Ajegunle Peace Cup"
      editRoute="/register/peace-cup/players"
      submitRoute="/register/peace-cup/submit"
      requireProofOfAge={false}
    />
  );
}
