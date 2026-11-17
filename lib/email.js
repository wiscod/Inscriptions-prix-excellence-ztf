/*
 * Accusé de réception envoyé au candidat qui a donné un e-mail, via l'API Resend (https://resend.com).
 * Variables d'environnement Vercel :
 *   RESEND_API_KEY  clé d'API Resend ; sans elle, aucun e-mail n'est envoyé ;
 *   EMAIL_FROM      expéditeur, ex. « Prix d'Excellence ZTF <candidatures@excellenceawardsztf.com> »
 *                   (le domaine doit être vérifié chez Resend).
 */
import "../maquettes/shared/ztf-lists.js";

const L = globalThis.ZTF_LISTS;
const label = (list, key) => (list.find((x) => x[0] === key) || [key, key])[1];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function content(d, code) {
  const f = d.fields, name = `${f.first_name} ${f.last_name}`.trim(), level = label(L.levels, f.level);
  if (f.lang === "en") {
    return {
      subject: `ZTF Excellence Award: application ${d.id} received`,
      text: `Hello ${name},\n\nWe have received your application for the ZTF Excellence Award.\n\nApplication number: ${d.id}\nIdentifier: ${code}\nSchool: ${f.institution_name}\nLevel: ${level}\n\nKeep your identifier private: it lets you download your application form again on the application site. You must print this form and bring it to your interview.\n\nZacharias Tanee Fomum Foundation`,
    };
  }
  return {
    subject: `Prix d'Excellence ZTF : dossier ${d.id} reçu`,
    text: `Bonjour ${name},\n\nNous avons bien reçu votre candidature au Prix d'Excellence ZTF.\n\nNuméro de dossier : ${d.id}\nIdentifiant : ${code}\nÉcole : ${f.institution_name}\nNiveau : ${level}\n\nGardez votre identifiant pour vous : il permet de retélécharger votre fiche de candidature sur le site. Vous devez imprimer cette fiche et l'apporter à votre audition.\n\nFondation Zacharias Tanee Fomum`,
  };
}

export async function sendConfirmation(d, code) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!d.fields.email) return { status: "sans_email" };
  if (!key || !from) return { status: "non_configure" };
  const { subject, text } = content(d, code);
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
