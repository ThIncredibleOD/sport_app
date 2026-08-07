import RegistrationConfirmation from "@/components/RegistrationConfirmation";

export default async function UnityCupConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string; pdf?: string }>;
}) {
  const { reg, pdf } = await searchParams;
  return (
    <RegistrationConfirmation
      regId={reg ?? ""}
      pdfUrl={pdf ?? ""}
      tournamentName="The Nathaniel Idowu Unity Cup"
      logoSrc="/unity.png"
      logoAlt="The Nathaniel Idowu Unity Cup"
    />
  );
}
