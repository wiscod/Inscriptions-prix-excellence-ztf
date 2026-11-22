/*
 * Administration : une seule fonction pour toutes les adresses /api/admin/… (vercel.json les y redirige
 * avec ?route=…), afin de rester sous la limite de fonctions de l'offre gratuite de Vercel.
 *
 *   POST   login                     ouverture de session { username, password }
 *   GET    me                        compte connecté
 *   POST   password                  changer son mot de passe { current, next }
 *   GET    dossiers?offset&limit     liste des dossiers                       (lecteur)
 *   GET    dossiers/:id              un dossier                               (lecteur)
 *   DELETE dossiers/:id              suppression définitive                   (gestionnaire)
 *   GET    files/:id/:field/:index   une pièce jointe                         (lecteur)
 *   POST   events                    noter une action faite dans le navigateur, ex. export CSV (lecteur)
 *   GET    accounts                  liste des comptes                        (administrateur)
 *   POST   accounts                  créer un compte                          (administrateur, ou premier accès)
 *   POST   accounts/:username        { action: reset | disable | enable | role, role }   (administrateur)
 *   GET    journal                   dernières actions                        (administrateur)
 */
import {
  ID_RE, MIME, chunkPath, deletePaths, fail, json, listAll, lookupPath, pendingPath, readJSON, readStream, recordPath,
} from "../lib/common.js";
import {
  MIN_PASSWORD, ROLES, ROLE_LABELS, USERNAME_RE, hashPassword, listAccounts, logEvent, login, makeToken, publicAccount,
  readAccount, readJournal, requireUser, saveAccount, tempPassword,
} from "../lib/auth.js";

const strip = ({ uploadTokenHash, lookupHash, ...rest }) => rest;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function body(req) { try { return await req.json(); } catch { return {}; } }

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const route = (url.searchParams.get("route") || url.pathname.replace(/^\/api\/admin\/?/, "")).replace(/^\/+|\/+$/g, "");
    const seg = route.split("/").filter(Boolean).map(decodeURIComponent);
    const m = req.method;
    try {
      /* ---------- Session ---------- */
      if (seg[0] === "login" && m === "POST") {
        const b = await body(req);
        const res = await login(b.username, b.password);
        if (!res) {
          await wait(700); // ralentit les essais de mots de passe
          await logEvent({ username: String(b.username || "").slice(0, 40) }, "connexion refusée");
          return fail("Identifiant ou mot de passe incorrect.", 401);
        }
        await logEvent(res.user, res.user.bootstrap ? "premier accès" : "connexion");
        return json(res);
      }
      if (seg[0] === "me" && m === "GET") {
        const r = await requireUser(req, "lecteur", { allowMustChange: true, allowBootstrap: true });
        return r.error || json({ user: r.user });
      }
      if (seg[0] === "password" && m === "POST") {
        const r = await requireUser(req, "lecteur", { allowMustChange: true });
        if (r.error) return r.error;
        const b = await body(req);
        const a = await readAccount(r.user.username);
        if (!(await login(a.username, b.current))) return fail("Mot de passe actuel incorrect.", 400);
        if (String(b.next || "").length < MIN_PASSWORD) return fail(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`, 400);
        a.passHash = await hashPassword(String(b.next));
        a.mustChange = false;
        a.version = (a.version || 0) + 1;
        await saveAccount(a);
        await logEvent(r.user, "mot de passe changé");
        return json({ token: makeToken({ u: a.username, v: a.version }), user: publicAccount(a) });
      }

      /* ---------- Dossiers ---------- */
      if (seg[0] === "dossiers") {
        const id = seg[1];
        if (!id) {
          if (m !== "GET") return fail("Méthode non autorisée.", 405);
          const r = await requireUser(req, "lecteur"); if (r.error) return r.error;
          const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
          const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
          const paths = (await listAll("candidatures/")).map((b) => b.pathname).sort().reverse();
          const items = (await Promise.all(paths.slice(offset, offset + limit).map((p) => readJSON(p)))).filter(Boolean).map(strip);
          return json({ total: paths.length, offset, limit, items });
        }
        if (!ID_RE.test(id)) return fail("Numéro de dossier invalide.", 400);
        if (m === "DELETE") {
          const r = await requireUser(req, "gestionnaire"); if (r.error) return r.error;
          const d = await readJSON(recordPath(id));
          if (!d) return fail("Dossier introuvable (supprimé ou inexistant).", 410);
          const chunks = (await listAll(`fichiers/${id}/`)).map((b) => b.pathname);
          await deletePaths([...chunks, pendingPath(id), ...(d.lookupHash ? [lookupPath(d.lookupHash)] : []), recordPath(id)]);
          await logEvent(r.user, "dossier supprimé", id, `${d.fields.first_name} ${d.fields.last_name}`);
          return json({ deleted: id, chunks: chunks.length });
        }
        if (m !== "GET") return fail("Méthode non autorisée.", 405);
        const r = await requireUser(req, "lecteur"); if (r.error) return r.error;
        const d = await readJSON(recordPath(id));
        if (!d) return fail("Dossier introuvable (supprimé ou inexistant).", 410);
        await logEvent(r.user, "dossier consulté", id, `${d.fields.first_name} ${d.fields.last_name}`);
        return json(strip(d));
      }

      if (seg[0] === "files" && m === "GET") {
        const r = await requireUser(req, "lecteur"); if (r.error) return r.error;
        const [, id, field] = seg, index = Number(seg[3]);
        if (!ID_RE.test(id || "")) return fail("Numéro de dossier invalide.", 400);
        const d = await readJSON(recordPath(id));
        const entry = d && d.files.find((f) => f.field === field && f.index === index);
        if (!entry) return fail("Fichier introuvable.", 410);
        await logEvent(r.user, "fichier téléchargé", id, entry.name);
        let c = 0, reader = null;
        const stream = new ReadableStream({
          async pull(ctrl) {
            for (;;) {
              if (!reader) {
                if (c >= entry.chunks) { ctrl.close(); return; }
                const s = await readStream(chunkPath(id, field, index, c++));
                if (!s) { ctrl.error(new Error("Morceau manquant")); return; }
                reader = s.getReader();
              }
              const { value, done } = await reader.read();
              if (done) { reader = null; continue; }
              ctrl.enqueue(value); return;
            }
          },
        });
        return new Response(stream, { headers: {
          "content-type": MIME[entry.ext] || "application/octet-stream", "content-length": String(entry.size),
          "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(entry.name)}`, "cache-control": "no-store",
        } });
      }

      if (seg[0] === "events" && m === "POST") {
        const r = await requireUser(req, "lecteur"); if (r.error) return r.error;
        const b = await body(req);
        if (!["export CSV"].includes(b.action)) return fail("Action inconnue.", 400);
        await logEvent(r.user, b.action, "", String(b.detail || "").slice(0, 200));
        return json({ ok: true });
      }

      /* ---------- Comptes ---------- */
      if (seg[0] === "accounts") {
        const target = seg[1];
        if (!target && m === "GET") {
          const r = await requireUser(req, "administrateur"); if (r.error) return r.error;
          return json({ accounts: (await listAccounts()).map(publicAccount).sort((a, b) => a.username.localeCompare(b.username)), roles: ROLE_LABELS });
        }
        if (!target && m === "POST") {
          const r = await requireUser(req, "administrateur", { allowBootstrap: true }); if (r.error) return r.error;
          const b = await body(req);
          const username = String(b.username || "").trim().toLowerCase(), name = String(b.name || "").trim().slice(0, 80);
          const role = r.user.bootstrap ? "administrateur" : b.role;
          if (!USERNAME_RE.test(username)) return fail("Identifiant : 3 à 32 caractères, lettres minuscules, chiffres, point, tiret ou trait bas.", 400);
          if (!name) return fail("Nom obligatoire.", 400);
          if (!ROLES.includes(role)) return fail("Rôle inconnu.", 400);
          if (await readAccount(username)) return fail("Cet identifiant existe déjà.", 409);
          // Premier accès : l'administrateur choisit lui-même son mot de passe ; sinon, mot de passe provisoire.
          let password = String(b.password || ""), mustChange = false;
          if (r.user.bootstrap) { if (password.length < MIN_PASSWORD) return fail(`Mot de passe : au moins ${MIN_PASSWORD} caractères.`, 400); }
          else { password = tempPassword(); mustChange = true; }
          const a = { username, name, role, passHash: await hashPassword(password), active: true, mustChange, version: 1,
            createdAt: new Date().toISOString(), createdBy: r.user.username };
          await saveAccount(a);
          await logEvent(r.user, "compte créé", username, `${name} · ${ROLE_LABELS[role]}`);
          return json({ account: publicAccount(a), tempPassword: mustChange ? password : undefined }, 201);
        }
        if (target && m === "POST") {
          const r = await requireUser(req, "administrateur"); if (r.error) return r.error;
          const a = await readAccount(target);
          if (!a) return fail("Compte introuvable.", 404);
          const b = await body(req);
          const others = (await listAccounts()).filter((x) => x.username !== a.username && x.active && x.role === "administrateur");
          const losesAdmin = a.role === "administrateur" && ((b.action === "disable") || (b.action === "role" && b.role !== "administrateur"));
          if (losesAdmin && !others.length) return fail("Il doit rester au moins un administrateur actif.", 400);
          if (b.action === "disable" && a.username === r.user.username) return fail("Vous ne pouvez pas désactiver votre propre compte.", 400);
          let temp;
          if (b.action === "reset") { temp = tempPassword(); a.passHash = await hashPassword(temp); a.mustChange = true; }
          else if (b.action === "disable") a.active = false;
          else if (b.action === "enable") a.active = true;
          else if (b.action === "role") { if (!ROLES.includes(b.role)) return fail("Rôle inconnu.", 400); a.role = b.role; }
          else return fail("Action inconnue.", 400);
          a.version = (a.version || 0) + 1; // ferme les sessions ouvertes de ce compte
          await saveAccount(a);
          const label = { reset: "mot de passe réinitialisé", disable: "compte désactivé", enable: "compte réactivé", role: "rôle modifié" }[b.action];
          await logEvent(r.user, label, a.username, b.action === "role" ? ROLE_LABELS[a.role] : "");
          return json({ account: publicAccount(a), tempPassword: temp });
        }
        return fail("Méthode non autorisée.", 405);
      }

      if (seg[0] === "journal" && m === "GET") {
        const r = await requireUser(req, "administrateur"); if (r.error) return r.error;
        return json({ events: await readJournal(Math.min(1000, Number(url.searchParams.get("limit")) || 300)) });
      }

      return fail("Adresse inconnue.", 400);
    } catch (e) {
      console.error(e);
      return fail("Erreur du serveur.", 500);
    }
  },
};
