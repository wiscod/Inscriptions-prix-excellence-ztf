/*
 * Données du formulaire de candidature — Prix d'Excellence ZTF
 * Listes reprises À L'IDENTIQUE du formulaire de référence
 * https://africaexcellenceawards.org/candidature
 * (seules les données de démonstration — villes, établissements — sont adaptées au Cameroun).
 */
window.ZTF_DATA = {
  edition: "2026-2027",
  schoolYear: "2025-2026",
  deadline: "[date à définir]",
  contactEmail: "contact@excellenceawardsztf.com",

  civilities: ["M.", "Mme", "Mlle"],

  levels: ["BAC+1", "BAC+2", "BAC+3", "BAC+4", "BAC+5", "Post-BAC+5", "Autre"],

  institutionCategories: [
    { category: "Grandes Écoles", sub: ["École de commerce / management (CGE)", "École d'ingénieurs (CTI)", "École normale supérieure (ENS)", "Institut d'études politiques (IEP / Sciences Po)", "École d'architecture (ENSA)", "École d'art et de design (Beaux-Arts, ENSAD, etc.)", "École vétérinaire (ENV)", "École militaire (Saint-Cyr, Polytechnique, Navale, etc.)", "École de journalisme reconnue (CFJ, ESJ, CUEJ, etc.)", "Autre grande école"] },
    { category: "Universités (Facultés)", sub: ["Sciences et technologies (maths, informatique, physique, etc.)", "Lettres, langues et sciences humaines", "Psychologie", "Droit et science politique", "Économie et gestion", "Information et communication", "Arts et arts du spectacle", "STAPS", "Sciences de l'éducation", "Théologie", "IAE (Institut d'administration des entreprises)", "IPAG (Institut de préparation à l'administration générale)", "Autre filière universitaire"] },
    { category: "Études de Santé", sub: ["Médecine", "Pharmacie", "Odontologie (dentaire)", "Maïeutique (sage-femme)", "Kinésithérapie", "Soins infirmiers (IFSI)", "Orthophonie", "Orthoptie", "Ergothérapie", "Psychomotricité", "Audioprothèse", "Manipulateur en électroradiologie", "Pédicurie-podologie", "Autre formation paramédicale"] },
    { category: "Classes Préparatoires aux Grandes Écoles (CPGE)", sub: ["Scientifique — MPSI / MP", "Scientifique — PCSI / PC", "Scientifique — PTSI / PT", "Scientifique — BCPST", "Scientifique — TSI", "Scientifique — MP2I / MPI", "Économique et commerciale — ECG", "Littéraire — A/L (Ulm)", "Littéraire — B/L (Lyon / LSH)", "Littéraire — Chartes", "Littéraire — Saint-Cyr Lettres", "Autre CPGE"] },
    { category: "BTS / BUT / Formations technologiques courtes", sub: ["BTS — Tertiaire (commerce, compta, gestion, etc.)", "BTS — Industriel (électrotechnique, mécanique, etc.)", "BTS — Agricole", "BTS — Hôtellerie-restauration / Tourisme", "BTS — Arts appliqués / DN MADE / DSAA", "Autre BTS", "BUT — Tertiaire (GEA, TC, Info-Com, etc.)", "BUT — Informatique / Statistique (STID)", "BUT — Industriel (GMP, GEII, MP, etc.)", "BUT — Biologie / Chimie", "BUT — Carrières sociales / juridiques", "Autre BUT"] },
    { category: "Écoles privées d'enseignement supérieur", sub: ["Commerce / management (hors CGE)", "Informatique / numérique (42, etc.)", "Communication / marketing / publicité", "Mode / luxe", "Cinéma / audiovisuel / animation 3D / jeux vidéo", "Musique / spectacle vivant", "Design / graphisme", "Tourisme / hôtellerie", "Autre école privée"] },
    { category: "Formations du secteur social", sub: ["Éducateur spécialisé (DEES)", "Assistant de service social (DEASS)", "Éducateur de jeunes enfants (DEEJE)", "Conseiller en économie sociale et familiale (DECESF)", "Moniteur-éducateur", "Autre formation sociale (IRTS, etc.)"] },
    { category: "Écoles de la fonction publique", sub: ["INSP (ex-ENA)", "ENM (École nationale de la magistrature)", "INET / IRA / ENSP", "Autre école de la fonction publique"] },
    { category: "CNAM / Formation continue", sub: ["CNAM (Conservatoire national des arts et métiers)", "CFA (Centre de formation d'apprentis)", "GRETA / autre organisme de formation continue"] },
    { category: "Autres établissements ou formations", sub: ["À préciser"] }
  ],

  fieldsOfStudy: ["Non applicable", "Littérature", "Philosophie", "Histoire", "Langues étrangères", "Anthropologie", "Archéologie", "Arts (arts visuels, arts du spectacle)", "Linguistique", "Théologie", "Administration publique", "Psychologie", "Sociologie", "Science politique", "Économie", "Démographie", "Communication", "Gestion des ressources humaines", "Études urbaines", "Astronomie", "Biologie", "Géologie", "Géographie", "Science de l'environnement", "Météorologie", "Mathématiques", "Physique", "Chimie", "Statistiques", "Génie aérospatial", "Génie civil", "Génie mécanique", "Génie électrique", "Génie des matériaux", "Informatique et génie logiciel", "Réseaux & Télécom", "Intelligence Artificielle", "Ingénierie biomédicale", "Logistique et Transport", "Architecture", "Génie Chimique", "Génie de Procédés", "Génie Énergétique", "Génie Minéral", "Génie Minier", "Génie Contrôle et Instrumentation", "Génie Électromécanique", "Médecine", "Pharmacie", "Odontologie (dentaire)", "Maïeutique (sage-femme)", "Kinésithérapie", "Soins infirmiers", "Orthophonie", "Orthoptie", "Ergothérapie", "Psychomotricité", "Audioprothèse", "Manipulateur en électroradiologie", "Pédicurie-podologie", "Santé publique", "Sciences biomédicales", "Analyses médicales", "Enseignement", "Éducation spéciale", "Psychopédagogie", "Administration scolaire", "Comptabilité", "Finance", "Marketing", "Gestion", "Commerce international", "Entrepreneuriat", "Design graphique", "Arts plastiques", "Mode", "Cinéma et photographie", "Agronomie", "Écologie", "Foresterie", "Génie agricole", "Horticulture", "Sciences de l'eau", "Sciences alimentaires", "Droit civil", "Droit pénal", "Droit international", "Droit des affaires", "Droits de l'homme", "Études de sécurité", "Géopolitique", "Stratégie militaire", "Défense et sécurité nationale"]
    .sort(function (a, b) { return a === "Non applicable" ? -1 : b === "Non applicable" ? 1 : a.localeCompare(b, "fr"); }),

  /* Données de démonstration (dans le site réel : recherche en base / géocodage) */
  cities: ["Yaoundé", "Douala", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Limbe", "Kumba", "Kribi", "Dschang", "Nkongsamba", "Edéa", "Foumban", "Mbalmayo", "Sangmélima", "Kousséri", "Mokolo", "Bafang", "Mbouda", "Tiko", "Batouri", "Meiganga", "Guider", "Yagoua", "Bafia", "Obala", "Soa", "Mbanga", "Loum", "Wum", "Kumbo"],
  schools: ["Université de Yaoundé I", "Université de Yaoundé II", "Université de Douala", "Université de Dschang", "Université de Buea", "Université de Ngaoundéré", "Université de Maroua", "Université de Bamenda", "Université de Bertoua", "Université d'Ebolowa", "Université de Garoua", "École Nationale Supérieure Polytechnique de Yaoundé", "École Normale Supérieure de Yaoundé", "ESSEC Douala", "IRIC", "ENAM", "Faculté de Médecine et des Sciences Biomédicales", "Université Catholique d'Afrique Centrale"],

  phoneCodes: [
    { code: "+237", label: "🇨🇲 +237" }, { code: "+33", label: "🇫🇷 +33" }, { code: "+241", label: "🇬🇦 +241" },
    { code: "+235", label: "🇹🇩 +235" }, { code: "+236", label: "🇨🇫 +236" }, { code: "+240", label: "🇬🇶 +240" },
    { code: "+242", label: "🇨🇬 +242" }, { code: "+234", label: "🇳🇬 +234" }, { code: "+1", label: "🇺🇸 +1" }
  ],

  countryCodes: "AF ZA AL DZ DE AD AO AG SA AR AM AU AT AZ BS BH BD BB BE BZ BJ BT BY MM BO BA BW BR BN BG BF BI KH CM CA CV CL CN CY CO KM CG CD KR KP CR CI HR CU DK DJ DM EG AE EC ER ES EE SZ US ET FJ FI FR GA GM GE GH GR GD GT GN GQ GW GY HT HN HU IN ID IQ IR IE IS IL IT JM JP JO KZ KE KG KI KW LA LS LV LB LR LY LI LT LU MK MG MY MW MV ML MT MA MH MU MR MX FM MD MC MN ME MZ NA NR NP NI NE NG NO NZ OM UG UZ PK PW PS PA PG PY NL PE PH PL PT QA CF DO CZ RO GB RU RW KN SM VC LC SB SV WS ST SN RS SC SL SG SK SI SO SD SS LK SE CH SR SY TJ TZ TD TH TL TG TO TT TN TM TR TV UA UY VU VA VE VN YE ZM ZW".split(" ")
};
