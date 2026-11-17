/*
 * Contrôle côté serveur des champs du formulaire (mêmes règles que le navigateur,
 * qu'on ne peut pas croire sur parole). Renvoie les champs nettoyés ou la liste des erreurs.
 */
const MIN_AGE = 9;
const ADULT_AGE = 18;
const NO_GCE = "Aucun pour l'instant";

const SHORT = ["civility", "last_name", "first_name", "nationality", "nationality_name", "birth_date", "city", "phone_code", "phone", "email",
  "subsystem", "cycle", "institution_category", "institution_subcategory", "institution_name", "field_of_study", "level",
  "average", "ranking", "cohort_size", "guardian_relation", "guardian_name", "guardian_phone_code", "guardian_phone", "guardian_email", "gce_exam", "lang"];
const LONG: Record<string, number> = { additional_notes: 3000, gce_results: 500 };
const FLAGS = ["average_not_provided", "ranking_not_provided", "cohort_size_not_provided", "guardian_consent"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function age(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const b = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getUTCFullYear() - b.getUTCFullYear();
  const md = n.getUTCMonth() - b.getUTCMonth();
  if (md < 0 || (md === 0 && n.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

function phoneOk(code: string, num: string) {
  const d = num.replace(/\D/g, "");
  if (!/^\+\d{1,4}$/.test(code)) return false;
  return code === "+237" ? /^[62]\d{8}$/.test(d) : /^\d{6,14}$/.test(d);
}

export function validateFields(input: Record<string, unknown>) {
  const f: Record<string, string | boolean> = {};
  const errors: string[] = [];
  for (const k of SHORT) f[k] = String(input[k] ?? "").trim().slice(0, 200);
  for (const [k, max] of Object.entries(LONG)) f[k] = String(input[k] ?? "").trim().slice(0, max);
  for (const k of FLAGS) f[k] = input[k] === true;

  const req = (k: string) => { if (!f[k]) errors.push(`${k}: obligatoire`); };
  ["civility", "last_name", "first_name", "nationality", "birth_date", "city", "phone_code", "phone", "email",
    "subsystem", "cycle", "institution_category", "institution_subcategory", "institution_name", "field_of_study", "level"].forEach(req);

  if (f.email && !EMAIL_RE.test(f.email as string)) errors.push("email: invalide");
  if (f.phone && !phoneOk(f.phone_code as string, f.phone as string)) errors.push("phone: invalide");
  if (f.nationality && !/^[A-Z]{2}$/.test(f.nationality as string)) errors.push("nationality: invalide");
  if (!["francophone", "anglophone"].includes(f.subsystem as string)) errors.push("subsystem: invalide");
  if (!["secondary", "higher"].includes(f.cycle as string)) errors.push("cycle: invalide");
  if (!["fr", "en"].includes(f.lang as string)) f.lang = "fr";

  const a = age(f.birth_date as string);
  if (a === null) errors.push("birth_date: invalide");
  else if (a < MIN_AGE) errors.push(`birth_date: moins de ${MIN_AGE} ans`);
  const minor = a !== null && a < ADULT_AGE;
  f.is_minor = minor;

  if (f.level !== "Post-BAC+5") f.average_not_provided = false;
  if (!f.average && !f.average_not_provided) errors.push("average: obligatoire");
  if (!f.ranking && !f.ranking_not_provided) errors.push("ranking: valeur ou « Non communiqué »");
  if (!f.cohort_size && !f.cohort_size_not_provided) errors.push("cohort_size: valeur ou « Non communiqué »");

  if (minor) {
    ["guardian_relation", "guardian_name", "guardian_phone_code", "guardian_phone"].forEach(req);
    if (f.guardian_phone && !phoneOk(f.guardian_phone_code as string, f.guardian_phone as string)) errors.push("guardian_phone: invalide");
    if (f.guardian_email && !EMAIL_RE.test(f.guardian_email as string)) errors.push("guardian_email: invalide");
    if (!f.guardian_consent) errors.push("guardian_consent: obligatoire");
  } else {
    for (const k of ["guardian_relation", "guardian_name", "guardian_phone_code", "guardian_phone", "guardian_email"]) f[k] = "";
    f.guardian_consent = false;
  }

  if (f.cycle === "secondary" && f.subsystem === "anglophone") {
    req("gce_exam");
    if (f.gce_exam && f.gce_exam !== NO_GCE) req("gce_results");
    else f.gce_results = "";
  } else { f.gce_exam = ""; f.gce_results = ""; }

  return { fields: f, errors };
}
