import PaymentFlow from "@/components/PaymentFlow";

export default function SecondaryCupPaymentPage() {
  return (
    <PaymentFlow
      tournamentSlug="secondary-cup"
      tournamentName="The Nathaniel Idowu Secondary Cup"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Cup"
      reviewRoute="/register/secondary-cup/review"
      confirmationRoute="/register/secondary-cup/confirmation"
    />
  );
}
