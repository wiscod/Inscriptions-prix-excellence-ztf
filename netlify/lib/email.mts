/*
 * Accusé de réception envoyé au candidat, via l'API Resend (https://resend.com).
 * Variables d'environnement Netlify :
 *   RESEND_API_KEY  clé d'API Resend (secrète) ; sans elle, aucun e-mail n'est envoyé ;
 *   EMAIL_FROM      expéditeur, ex. « Prix d'Excellence ZTF <candidatures@excellenceawardsztf.com> »
 *                   (le domaine doit être vérifié chez Resend).
 */
import type { Dossier } from "./common.mts";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function content(d: Dossier) {
  const f = d.fields, name = `${f.first_name} ${f.last_name}`.trim(), en = f.lang === "en";
  const files = d.files.length;
  if (en) {
    return {
      subject: `ZTF Excellence Award: application ${d.id} received`,
      text: `Hello ${name},\n\nWe have received your application for the ZTF Excellence Award.\n\nApplication number: ${d.id}\nInstitution: ${f.institution_name}\nLevel / class: ${f.level}\nFiles received: ${files}\n\nKeep this number: you will need it if you contact us.\n\nZacharias Tanee Fomum Foundation\ncontact@excellenceawardsztf.com`,
    };
  }
  return {
    subject: `Prix d'Excellence ZTF : dossier ${d.id} reçu`,
    text: `Bonjour ${name},\n\nNous avons bien reçu votre candidature au Prix d'Excellence ZTF.\n\nNuméro de dossier : ${d.id}\nÉtablissement : ${f.institution_name}\nNiveau / classe : ${f.level}\nFichiers reçus : ${files}\n\nConservez ce numéro : il vous sera demandé si vous nous contactez.\n\nFondation Zacharias Tanee Fomum\ncontact@excellenceawardsztf.com`,
  };
}

export async function sendConfirmation(d: Dossier): Promise<Dossier["email"]> {
  const key = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("EMAIL_FROM");
  if (!key || !from) return { status: "non_configure" };
  const { subject, text } = content(d);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [d.fields.email], subject, text, html: `<pre style="font:15px/1.5 system-ui,sans-serif;white-space:pre-wrap">${esc(text)}</pre>` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { status: "echec", detail: `${res.status} ${(await res.text()).slice(0, 200)}` };
    return { status: "envoye" };
  } catch (e) {
    return { status: "echec", detail: String(e).slice(0, 200) };
  }
}
