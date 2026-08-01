import { supabase } from '../supabase';

export interface PlayerInput {
  full_name: string;
  dob: string;
  nationality: string;
  position: string;
  consent_form: File;
  proof_of_age: File;
}

export interface RegistrationInput {
  tournament_slug: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  academy_name: string;
  coach_full_name: string;
  coach_dob: string;
  coach_nationality: string;
  team_logo?: File; // Optional or required team profile picture
  players: PlayerInput[];
}

// 1. Submit Registration, Upload Team Logo & Player Documents
export async function submitRegistration(data: RegistrationInput) {
  // Get Tournament ID from slug
  const { data: tournament, error: tourneyError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', data.tournament_slug)
    .single();

  if (tourneyError || !tournament) throw new Error("Invalid tournament selected.");

  let teamLogoUrl = '';

  // Upload Team Logo
  if (data.team_logo) {
    const logoPath = `logos/${Date.now()}_${data.team_logo.name}`;
    const { error: logoErr } = await supabase.storage
      .from('team-logos')
      .upload(logoPath, data.team_logo);

    if (logoErr) throw logoErr;
    teamLogoUrl = supabase.storage.from('team-logos').getPublicUrl(logoPath).data.publicUrl;
  }

  // Insert main registration record
  const { data: reg, error: regError } = await supabase
    .from('registrations')
    .insert([{
      tournament_id: tournament.id,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      academy_name: data.academy_name,
      team_logo_url: teamLogoUrl, // Saves team logo URL
      coach_full_name: data.coach_full_name,
      coach_dob: data.coach_dob,
      coach_nationality: data.coach_nationality,
      payment_status: 'pending_upload'
    }])
    .select()
    .single();

  if (regError) throw regError;

  // Upload player files and create DB records for EVERY player
  for (const player of data.players) {
    const consentPath = `${reg.id}/${Date.now()}_consent_${player.consent_form.name}`;
    const { error: consentErr } = await supabase.storage
      .from('consent-forms')
      .upload(consentPath, player.consent_form);
    if (consentErr) throw consentErr;

    const agePath = `${reg.id}/${Date.now()}_age_${player.proof_of_age.name}`;
    const { error: ageErr } = await supabase.storage
      .from('proof-of-age')
      .upload(agePath, player.proof_of_age);
    if (ageErr) throw ageErr;

    const consentUrl = supabase.storage.from('consent-forms').getPublicUrl(consentPath).data.publicUrl;
    const proofOfAgeUrl = supabase.storage.from('proof-of-age').getPublicUrl(agePath).data.publicUrl;

    const { error: playerErr } = await supabase
      .from('players')
      .insert([{
        registration_id: reg.id,
        full_name: player.full_name,
        dob: player.dob,
        nationality: player.nationality,
        position: player.position,
        consent_form_url: consentUrl,
        proof_of_age_url: proofOfAgeUrl
      }]);

    if (playerErr) throw playerErr;
  }

  return reg;
}

// 2. Upload Payment Receipt & Update Status
export async function uploadPaymentReceipt(registrationId: string, receiptFile: File) {
  const filePath = `${registrationId}/${Date.now()}_receipt_${receiptFile.name}`;

  const { error: uploadErr } = await supabase.storage
    .from('receipts')
    .upload(filePath, receiptFile);

  if (uploadErr) throw uploadErr;

  const receiptUrl = supabase.storage.from('receipts').getPublicUrl(filePath).data.publicUrl;

  const { data, error: updateErr } = await supabase
    .from('registrations')
    .update({
      payment_receipt_url: receiptUrl,
      payment_status: 'pending_verification'
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return data;
}