/*
 * Comptes de l'administration, sessions et journal.
 *
 * Comptes : un fichier par personne dans le store Blob privé, comptes/<identifiant>.json
 *   { username, name, role, passHash, active, mustChange, version, createdAt, createdBy }
 * Rôles, du moins au plus étendu :
 *   lecteur        voit et télécharge les dossiers ;
 *   gestionnaire   en plus, supprime des dossiers ;
 *   administrateur en plus, crée, modifie et désactive les comptes, et lit le journal.
 * Premier accès : tant qu'aucun compte n'existe, l'identifiant « admin » avec le mot de passe
 * ADMIN_PASSWORD ouvre une session limitée à la création du premier administrateur. Ensuite, il est refusé.
 *
 * Sessions : jeton signé (HMAC-SHA256), valable 12 heures, envoyé dans l'en-tête Authorization.
 * Chaque requête relit le compte : un compte désactivé ou un mot de passe changé invalide les jetons existants.
 *
 * Journal : une entrée par fichier, journal/<horodatage>-<aléa>.json { at, user, action, target, detail }.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { deletePaths, fail, listAll, readJSON, safeEqual, writeJSON } from "./common.js";

const scryptAsync = promisify(scrypt);
export const ROLES = ["lecteur", "gestionnaire", "administrateur"];
export const ROLE_LABELS = { lecteur: "Lecteur", gestionnaire: "Gestionnaire", administrateur: "Administrateur" };
const SESSION_HOURS = 12;
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const MIN_PASSWORD = 10;

export const accountPath = (u) => `comptes/${u}.json`;
const rank = (role) => ROLES.indexOf(role);

/* ---------- Mots de passe ---------- */
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
async function checkPassword(pw, stored) {
  const [, salt, key] = String(stored || "").split("$");
  if (!salt || !key) return false;
  const got = await scryptAsync(pw, Buffer.from(salt, "base64"), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(key, "base64");
  return got.length === want.length && timingSafeEqual(got, want);
}
/** Mot de passe provisoire lisible, ex. « tavu-k7rm-pexa » (14 caractères). */
export function tempPassword() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const g = () => Array.from(randomBytes(4), (b) => a[b % a.length]).join("");
  return `${g()}-${g()}-${g()}`;
}

/* ---------- Jetons de session ---------- */
function sessionKey() {
  const base = process.env.SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update("ztf-session:" + base).digest();
}
const b64 = (s) => Buffer.from(s).toString("base64url");
export function makeToken(payload) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }));
  const sig = createHmac("sha256", sessionKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function readToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", sessionKey()).update(body).digest("base64url");
  if (!safeEqual(sig, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

/* ---------- Comptes ---------- */
export const readAccount = (u) => (USERNAME_RE.test(u) ? readJSON(accountPath(u)) : Promise.resolve(null));
export async function listAccounts() {
  const blobs = await listAll("comptes/");
  return (await Promise.all(blobs.map((b) => readJSON(b.pathname)))).filter(Boolean);
}
export const publicAccount = ({ passHash, ...rest }) => rest;
export const saveAccount = (a) => writeJSON(accountPath(a.username), a);

/** Ouverture de session. Renvoie { token, user } ou null. */
export async function login(username, password) {
  username = String(username || "").trim().toLowerCase();
  password = String(password || "");
  const accounts = await listAll("comptes/");
  if (!accounts.length) {
    const boot = process.env.ADMIN_PASSWORD;
    if (username === "admin" && boot && safeEqual(password, boot)) {
      const user = { username: "admin", name: "Premier accès", role: "administrateur", bootstrap: true };
      return { token: makeToken({ u: "admin", b: 1 }), user };
    }
    return null;
  }
  const a = await readAccount(username);
  if (!a || !a.active || !(await checkPassword(password, a.passHash))) return null;
  return { token: makeToken({ u: a.username, v: a.version }), user: publicAccount(a) };
}

/**
 * Vérifie la session et le rôle minimal. Renvoie { user } ou une Response d'erreur.
 * options.allowMustChange : laisse passer un compte qui doit encore changer son mot de passe.
 * options.allowBootstrap  : laisse passer la session de premier accès.
 */
export async function requireUser(req, minRole = "lecteur", options = {}) {
  const p = readToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!p) return { error: fail("Session expirée ou invalide : reconnectez-vous.", 401) };
  if (p.b) {
    if (!options.allowBootstrap || (await listAll("comptes/")).length) return { error: fail("Session de premier accès terminée : reconnectez-vous avec votre compte.", 401) };
    return { user: { username: "admin", name: "Premier accès", role: "administrateur", bootstrap: true } };
  }
  const a = await readAccount(p.u);
  if (!a || !a.active || a.version !== p.v) return { error: fail("Session expirée ou compte désactivé : reconnectez-vous.", 401) };
  if (a.mustChange && !options.allowMustChange) return { error: fail("Choisissez d'abord un nouveau mot de passe.", 403) };
  if (rank(a.role) < rank(minRole)) return { error: fail("Votre rôle ne permet pas cette action.", 403) };
  return { user: publicAccount(a) };
}

/* ---------- Journal ---------- */
export async function logEvent(user, action, target = "", detail = "") {
  const at = new Date().toISOString();
  const key = `journal/${at.replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}.json`;
  try { await writeJSON(key, { at, user: user ? user.username : "", action, target, detail }); }
  catch (e) { console.error("Journal : écriture impossible", e); }
}
export async function readJournal(limit = 300) {
  const blobs = (await listAll("journal/")).map((b) => b.pathname).sort().reverse().slice(0, limit);
  return (await Promise.all(blobs.map((p) => readJSON(p)))).filter(Boolean);
}
export const removeAccountFile = (u) => deletePaths([accountPath(u)]);
