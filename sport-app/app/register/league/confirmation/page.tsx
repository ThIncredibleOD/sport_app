import RegistrationConfirmation from "@/components/RegistrationConfirmation";

export default async function LeagueConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string; pdf?: string }>;
}) {
  const { reg, pdf } = await searchParams;
  return (
    <RegistrationConfirmation
      regId={reg ?? ""}
      pdfUrl={pdf ?? ""}
      tournamentName="The Nathaniel Idowu Under 16 Football League"
      logoSrc="/under1.png"
      logoAlt="The Nathaniel Idowu Under 16 Football League"
    />
  );
}
