import RegistrationReview from "@/components/RegistrationReview";

export default function SecondaryCupReviewPage() {
  return (
    <RegistrationReview
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Football League"
      tournamentName="The Nathaniel Idowu Secondary Cup"
      editRoute="/register/secondary-cup/players"
      paymentRoute="/register/secondary-cup/payment"
    />
  );
}
