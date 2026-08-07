import RegistrationReview from "@/components/RegistrationReview";

export default function UnityCupReviewPage() {
  return (
    <RegistrationReview
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Football League"
      tournamentName="The Nathaniel Idowu Unity Cup"
      editRoute="/register/unity-cup/players"
      paymentRoute="/register/unity-cup/payment"
    />
  );
}
