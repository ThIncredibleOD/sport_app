import RegistrationConfirmation from "@/components/RegistrationConfirmation";

export default async function SecondaryCupConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string; pdf?: string }>;
}) {
  const { reg, pdf } = await searchParams;
  return (
    <RegistrationConfirmation
      regId={reg ?? ""}
      pdfUrl={pdf ?? ""}
      tournamentName="The Nathaniel Idowu Secondary Cup"
      logoSrc="/secondary.png"
      logoAlt="The Nathaniel Idowu Secondary Cup"
    />
  );
}
