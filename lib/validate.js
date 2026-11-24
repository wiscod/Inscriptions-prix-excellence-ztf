/*
 * Contrôle côté serveur des champs du formulaire (mêmes règles que le navigateur,
 * qu'on ne peut pas croire sur parole). Les listes autorisées sont les listes officielles ZTF.
 * Renvoie les champs nettoyés et la liste des erreurs.
 */
import "../maquettes/shared/ztf-lists.js";

const L = globalThis.ZTF_LISTS;
const MIN_AGE = 9;
const MOTIVATION_MAX = 2000;
const keys = (list) => new Set(list.map((x) => x[0]));
const LEVELS = keys(L.levels), SERIES = keys(L.series), FIELDS = keys(L.fields), CATEGORIES = keys(L.categories);
const SECONDARY_CATEGORIES = new Set(L.secondaryCategories);
const HIGHER_LEVELS = new Set(L.levelGroups.higher);
const SECONDARY_LEVELS = new Set([...L.levelGroups.secondary_fr, ...L.levelGroups.secondary_en]);
const NO_FIELD_LEVELS = new Set(L.noFieldLevels);
const SCHOOLS = new Map(L.schools.map((s) => [s[0], s]));

const SHORT = ["gender", "last_name", "first_name", "nationality", "nationality_name", "birth_date", "city", "phone_code", "phone", "email",
  "institution_category", "institution_name", "school_id", "level", "field_of_study", "field_of_study_other", "average", "lang"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function age(iso) {
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

function phoneOk(code, num) {
  const d = num.replace(/\D/g, "");
  if (!/^\+\d{1,4}$/.test(code)) return false;
  return code === "+237" ? /^[62]\d{8}$/.test(d) : /^\d{6,14}$/.test(d);
}

export function validateFields(input) {
  const f = {};
  const errors = [];
  for (const k of SHORT) f[k] = String(input[k] ?? "").trim().slice(0, 200);
  f.motivation = String(input.motivation ?? "").trim().slice(0, MOTIVATION_MAX);
  f.average_not_provided = input.average_not_provided === true;

  const req = (k) => { if (!f[k]) errors.push(`${k}: obligatoire`); };
  ["gender", "last_name", "first_name", "nationality", "birth_date", "phone_code", "phone",
    "institution_category", "institution_name", "level", "field_of_study"].forEach(req);

  if (f.gender && !["male", "female"].includes(f.gender)) errors.push("gender: invalide");
  if (f.email && !EMAIL_RE.test(f.email)) errors.push("email: invalide");
  if (f.phone && !phoneOk(f.phone_code, f.phone)) errors.push("phone: invalide");
  if (f.nationality && !/^[A-Z]{2}$/.test(f.nationality)) errors.push("nationality: invalide");
  if (!["fr", "en"].includes(f.lang)) f.lang = "fr";

  const a = age(f.birth_date);
  if (a === null) errors.push("birth_date: invalide");
  else if (a < MIN_AGE) errors.push(`birth_date: moins de ${MIN_AGE} ans`);

  // Catégorie d'établissement → cycle ; le niveau doit appartenir au même cycle.
  if (f.institution_category && !CATEGORIES.has(f.institution_category)) errors.push("institution_category: invalide");
  f.cycle = SECONDARY_CATEGORIES.has(f.institution_category) ? "secondary" : "higher";
  if (f.level && !LEVELS.has(f.level)) errors.push("level: invalide");
  else if (f.level && (f.cycle === "secondary" ? !SECONDARY_LEVELS.has(f.level) : !HIGHER_LEVELS.has(f.level))) errors.push("level: ne correspond pas à la catégorie d'établissement");

  // Domaine / série selon le niveau (mêmes règles que le formulaire officiel).
  if (f.level && f.field_of_study) {
    const ok = NO_FIELD_LEVELS.has(f.level) ? f.field_of_study === "NA"
      : HIGHER_LEVELS.has(f.level) ? FIELDS.has(f.field_of_study) || f.field_of_study === "Other" : SERIES.has(f.field_of_study);
    if (!ok) errors.push("field_of_study: ne correspond pas au niveau");
  }
  // « Autre » domaine d'études (pages par école) : le candidat le précise en texte libre.
  if (f.field_of_study === "Other") { if (!f.field_of_study_other) errors.push("field_of_study_other: obligatoire"); }
  else f.field_of_study_other = "";

  // École : identifiant de la liste officielle si elle y figure, sinon nouvel établissement à vérifier.
  const known = f.school_id ? SCHOOLS.get(f.school_id) : null;
  if (known && known[2] === f.institution_category) f.institution_name = known[1];
  else f.school_id = "";
  f.school_is_new = !f.school_id;

  if (f.level !== "PhD") f.average_not_provided = false;
  if (!f.average && !f.average_not_provided) errors.push("average: obligatoire");

  return { fields: f, errors };
}
