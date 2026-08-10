import PaymentFlow from "@/components/PaymentFlow";

export default function LeaguePaymentPage() {
  return (
    <PaymentFlow
      tournamentSlug="u16-league"
      tournamentName="The Nathaniel Idowu Under 16 Football League"
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
      reviewRoute="/register/league/review"
      confirmationRoute="/register/league/confirmation"
    />
  );
}
