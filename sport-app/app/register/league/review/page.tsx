import RegistrationReview from "@/components/RegistrationReview";

export default function LeagueReviewPage() {
  return (
    <RegistrationReview
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
      tournamentName="The Nathaniel Idowu Under 16 Football League"
      editRoute="/register/league/players"
      submitRoute="/register/league/submit"
    />
  );
}
