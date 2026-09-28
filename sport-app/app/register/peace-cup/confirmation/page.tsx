import RegistrationConfirmation from "@/components/RegistrationConfirmation";

export default async function PeaceCupConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string; pdf?: string }>;
}) {
  const { reg, pdf } = await searchParams;
  return (
    <RegistrationConfirmation
      regId={reg ?? ""}
      pdfUrl={pdf ?? ""}
      tournamentName="The Hon. Olumoh-Ajegunle Peace Cup"
      logoSrc="/peace-cup.png"
      logoAlt="The Hon. Olumoh-Ajegunle Peace Cup"
    />
  );
}
