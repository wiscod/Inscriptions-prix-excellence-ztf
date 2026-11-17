/*
 * Données du formulaire de candidature — Prix d'Excellence ZTF (Cameroun)
 *
 * Champs, ordre et libellés repris du formulaire de référence
 * https://africaexcellenceawards.org/candidature, avec les adaptations validées :
 *  - listes d'établissements adaptées au système éducatif camerounais ;
 *  - ouvert au secondaire (6e → Terminale, Form 1 → Upper Sixth) ET au supérieur ;
 *  - sous-système francophone / anglophone (résultats GCE pour les anglophones du secondaire) ;
 *  - parent ou tuteur obligatoire pour les moins de 18 ans ;
 *  - site bilingue français / anglais.
 *
 * Chaque élément de liste est une paire [français, anglais] ; la valeur enregistrée est le libellé français.
 */
window.ZTF_DATA = {
  edition: "2026-2027",
  schoolYear: "2025-2026",
  deadline: ["[date à définir]", "[date to be set]"],
  contactEmail: "contact@excellenceawardsztf.com",
  minAge: 9,       // un élève de 6e a 10-11 ans ; marge de sécurité
  adultAge: 18,    // en dessous : parent ou tuteur obligatoire
  maxFileMB: 10,         // taille maximale par fichier
  maxFilesPerField: 10,  // nombre maximal de fichiers par champ de dépôt

  civilities: [["M.", "Mr"], ["Mme", "Mrs"], ["Mlle", "Miss"]],

  guardianRelations: [["Père", "Father"], ["Mère", "Mother"], ["Tuteur légal", "Legal guardian"], ["Autre membre de la famille", "Other relative"]],

  categories: [
    /* ---------- Enseignement secondaire ---------- */
    { fr: "Enseignement secondaire général", en: "General secondary education", cycle: "secondary", sub: [
      ["Lycée ou CES public", "Government high school / secondary school"],
      ["Lycée bilingue public", "Government bilingual high school"],
      ["Établissement privé catholique", "Catholic mission school"],
      ["Établissement privé protestant (presbytérien, baptiste, EEC…)", "Protestant mission school (Presbyterian, Baptist, EEC…)"],
      ["Établissement privé islamique", "Islamic private school"],
      ["Établissement privé laïc", "Lay private school"]] },
    { fr: "Enseignement secondaire technique et professionnel", en: "Technical and vocational secondary education", cycle: "secondary", sub: [
      ["Lycée technique ou CETIC public (industriel)", "Government technical high school / college (industrial)"],
      ["Lycée technique ou CETIC public (commercial)", "Government technical high school / college (commercial)"],
      ["Lycée agricole", "Agricultural high school"],
      ["Établissement technique privé confessionnel", "Mission technical school"],
      ["Établissement technique privé laïc", "Lay private technical school"]] },

    /* ---------- Enseignement supérieur ---------- */
    { fr: "Universités d'État (facultés)", en: "State universities (faculties)", cycle: "higher", sub: [
      ["Sciences", "Science"],
      ["Arts, lettres et sciences humaines", "Arts, letters and social sciences"],
      ["Sciences juridiques et politiques", "Law and political science"],
      ["Sciences économiques et de gestion", "Economics and management"],
      ["Médecine et sciences biomédicales", "Medicine and biomedical sciences"],
      ["Agronomie et sciences agricoles", "Agronomy and agricultural sciences"],
      ["Sciences de l'éducation", "Education"],
      ["Ingénierie et technologie", "Engineering and technology"],
      ["Autre faculté", "Other faculty"]] },
    { fr: "Grandes écoles publiques", en: "Public grandes écoles", cycle: "higher", sub: [
      ["École d'ingénieurs (ENSP, ENSPD, FGI, ENSAI, ENSTP…)", "Engineering school (ENSP, ENSPD, FGI, ENSAI, ENSTP…)"],
      ["École normale supérieure (ENS, ENSET)", "Higher teacher training college (ENS, ENSET)"],
      ["Administration, magistrature, diplomatie (ENAM, IRIC)", "Administration, magistracy, diplomacy (ENAM, IRIC)"],
      ["Journalisme et communication (ESSTIC)", "Journalism and communication (ESSTIC)"],
      ["Commerce et gestion (ESSEC)", "Business and management (ESSEC)"],
      ["Statistique et économie appliquée (ISSEA, IFORD)", "Statistics and applied economics (ISSEA, IFORD)"],
      ["Agronomie et médecine vétérinaire (FASA, ESMV)", "Agronomy and veterinary medicine (FASA, ESMV)"],
      ["Autre grande école", "Other grande école"]] },
    { fr: "Instituts universitaires de technologie (IUT)", en: "University institutes of technology (IUT)", cycle: "higher", sub: [
      ["Génie industriel et maintenance", "Industrial engineering and maintenance"],
      ["Génie informatique et télécommunications", "Computer engineering and telecommunications"],
      ["Génie civil", "Civil engineering"],
      ["Gestion, commerce, banque", "Management, business, banking"],
      ["Génie biologique et agroalimentaire", "Biological and food engineering"],
      ["Autre spécialité", "Other speciality"]] },
    { fr: "Études de santé", en: "Health studies", cycle: "higher", sub: [
      ["Médecine", "Medicine"], ["Pharmacie", "Pharmacy"], ["Odontologie (dentaire)", "Dentistry"],
      ["Sciences infirmières", "Nursing"], ["Maïeutique (sage-femme)", "Midwifery"],
      ["Techniques médico-sanitaires (laboratoire, imagerie…)", "Medical technology (laboratory, imaging…)"],
      ["Autre formation paramédicale", "Other paramedical training"]] },
    { fr: "Universités privées et confessionnelles", en: "Private and faith-based universities", cycle: "higher", sub: [
      ["Sciences et technologies", "Science and technology"],
      ["Lettres, langues et sciences humaines", "Arts, languages and social sciences"],
      ["Droit et science politique", "Law and political science"],
      ["Économie et gestion", "Economics and management"],
      ["Santé", "Health"],
      ["Théologie", "Theology"],
      ["Autre filière", "Other programme"]] },
    { fr: "Instituts privés d'enseignement supérieur (IPES)", en: "Private higher education institutes (IPES)", cycle: "higher", sub: [
      ["BTS", "BTS"], ["HND", "HND"], ["Licence / Bachelor", "Licence / Bachelor's degree"],
      ["Master", "Master's degree"], ["Cycle ingénieur", "Engineering degree"], ["Autre diplôme", "Other qualification"]] },
    { fr: "Écoles professionnelles et de la fonction publique", en: "Professional and civil-service schools", cycle: "higher", sub: [
      ["École normale d'instituteurs (ENIEG, ENIET)", "Primary teacher training college (ENIEG, ENIET)"],
      ["Écoles militaires et de police (EMIA…)", "Military and police schools (EMIA…)"],
      ["Douanes, impôts, trésor", "Customs, taxation, treasury"],
      ["Travaux publics, postes et télécommunications", "Public works, posts and telecommunications"],
      ["Autre école professionnelle", "Other professional school"]] },
    { fr: "Autres établissements ou formations", en: "Other institutions or programmes", cycle: "higher", sub: [
      ["À préciser", "To be specified"]] }
  ],

  levels: {
    francophone: [["6e", "6e"], ["5e", "5e"], ["4e", "4e"], ["3e", "3e"], ["Seconde", "Seconde"], ["Première", "Première"], ["Terminale", "Terminale"]],
    anglophone: [["Form 1", "Form 1"], ["Form 2", "Form 2"], ["Form 3", "Form 3"], ["Form 4", "Form 4"], ["Form 5", "Form 5"], ["Lower Sixth", "Lower Sixth"], ["Upper Sixth", "Upper Sixth"]],
    higher: [["BAC+1", "BAC+1 (year 1)"], ["BAC+2", "BAC+2 (year 2)"], ["BAC+3", "BAC+3 (year 3)"], ["BAC+4", "BAC+4 (year 4)"], ["BAC+5", "BAC+5 (year 5)"], ["Post-BAC+5", "Post-BAC+5 (PhD…)"], ["Autre", "Other"]]
  },

  /* Série (francophone) ou filière (anglophone) — remplace « Domaine d'études » au secondaire */
  series: {
    francophone: [
      ["Non applicable (premier cycle)", "Not applicable (first cycle)"],
      ["A (Lettres – Langues – Philosophie)", "A (Letters – Languages – Philosophy)"],
      ["C (Mathématiques – Sciences physiques)", "C (Mathematics – Physical sciences)"],
      ["D (Mathématiques – Sciences de la vie et de la Terre)", "D (Mathematics – Life and Earth sciences)"],
      ["E (Mathématiques – Techniques)", "E (Mathematics – Technology)"],
      ["TI (Technologies de l'information)", "TI (Information technology)"],
      ["Technique industrielle (F, MEM, ELEQ…)", "Industrial technology (F, MEM, ELEQ…)"],
      ["Technique commerciale (ACA, ACC, CG, SES…)", "Commercial studies (ACA, ACC, CG, SES…)"],
      ["Agricole", "Agricultural"],
      ["Autre série", "Other series"]],
    anglophone: [
      ["Non applicable (Form 1 à Form 3)", "Not applicable (Form 1 to Form 3)"],
      ["Arts", "Arts"],
      ["Sciences", "Science"],
      ["Commerce", "Commercial"],
      ["Technique", "Technical"],
      ["Autre filière", "Other stream"]]
  },

  gceExams: [["Aucun pour l'instant", "None yet"], ["GCE O Level", "GCE O Level"], ["GCE A Level", "GCE A Level"]],

  /* Domaines d'études (supérieur) — liste de la référence, traduite */
  fieldsOfStudy: [
    ["Non applicable", "Not applicable"], ["Littérature", "Literature"], ["Philosophie", "Philosophy"], ["Histoire", "History"],
    ["Langues étrangères", "Foreign languages"], ["Anthropologie", "Anthropology"], ["Archéologie", "Archaeology"],
    ["Arts (arts visuels, arts du spectacle)", "Arts (visual and performing arts)"], ["Linguistique", "Linguistics"], ["Théologie", "Theology"],
    ["Administration publique", "Public administration"], ["Psychologie", "Psychology"], ["Sociologie", "Sociology"],
    ["Science politique", "Political science"], ["Économie", "Economics"], ["Démographie", "Demography"], ["Communication", "Communication"],
    ["Gestion des ressources humaines", "Human resource management"], ["Études urbaines", "Urban studies"], ["Astronomie", "Astronomy"],
    ["Biologie", "Biology"], ["Géologie", "Geology"], ["Géographie", "Geography"], ["Science de l'environnement", "Environmental science"],
    ["Météorologie", "Meteorology"], ["Mathématiques", "Mathematics"], ["Physique", "Physics"], ["Chimie", "Chemistry"],
    ["Statistiques", "Statistics"], ["Génie aérospatial", "Aerospace engineering"], ["Génie civil", "Civil engineering"],
    ["Génie mécanique", "Mechanical engineering"], ["Génie électrique", "Electrical engineering"], ["Génie des matériaux", "Materials engineering"],
    ["Informatique et génie logiciel", "Computer science and software engineering"], ["Réseaux & Télécom", "Networks & telecommunications"],
    ["Intelligence Artificielle", "Artificial intelligence"], ["Ingénierie biomédicale", "Biomedical engineering"],
    ["Logistique et Transport", "Logistics and transport"], ["Architecture", "Architecture"], ["Génie Chimique", "Chemical engineering"],
    ["Génie de Procédés", "Process engineering"], ["Génie Énergétique", "Energy engineering"], ["Génie Minéral", "Mineral engineering"],
    ["Génie Minier", "Mining engineering"], ["Génie Contrôle et Instrumentation", "Control and instrumentation engineering"],
    ["Génie Électromécanique", "Electromechanical engineering"], ["Médecine", "Medicine"], ["Pharmacie", "Pharmacy"],
    ["Odontologie (dentaire)", "Dentistry"], ["Maïeutique (sage-femme)", "Midwifery"], ["Kinésithérapie", "Physiotherapy"],
    ["Soins infirmiers", "Nursing"], ["Orthophonie", "Speech therapy"], ["Orthoptie", "Orthoptics"], ["Ergothérapie", "Occupational therapy"],
    ["Psychomotricité", "Psychomotor therapy"], ["Audioprothèse", "Hearing-aid audiology"],
    ["Manipulateur en électroradiologie", "Medical imaging technology"], ["Pédicurie-podologie", "Podiatry"], ["Santé publique", "Public health"],
    ["Sciences biomédicales", "Biomedical sciences"], ["Analyses médicales", "Medical laboratory science"], ["Enseignement", "Teaching"],
    ["Éducation spéciale", "Special education"], ["Psychopédagogie", "Educational psychology"], ["Administration scolaire", "School administration"],
    ["Comptabilité", "Accounting"], ["Finance", "Finance"], ["Marketing", "Marketing"], ["Gestion", "Management"],
    ["Commerce international", "International trade"], ["Entrepreneuriat", "Entrepreneurship"], ["Design graphique", "Graphic design"],
    ["Arts plastiques", "Fine arts"], ["Mode", "Fashion"], ["Cinéma et photographie", "Film and photography"], ["Agronomie", "Agronomy"],
    ["Écologie", "Ecology"], ["Foresterie", "Forestry"], ["Génie agricole", "Agricultural engineering"], ["Horticulture", "Horticulture"],
    ["Sciences de l'eau", "Water sciences"], ["Sciences alimentaires", "Food science"], ["Droit civil", "Civil law"], ["Droit pénal", "Criminal law"],
    ["Droit international", "International law"], ["Droit des affaires", "Business law"], ["Droits de l'homme", "Human rights"],
    ["Études de sécurité", "Security studies"], ["Géopolitique", "Geopolitics"], ["Stratégie militaire", "Military strategy"],
    ["Défense et sécurité nationale", "National defence and security"]
  ],

  /* Données de démonstration (dans le site réel : recherche en base) */
  cities: ["Yaoundé", "Douala", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Limbe", "Kumba", "Kribi", "Dschang", "Nkongsamba", "Edéa", "Foumban", "Mbalmayo", "Sangmélima", "Kousséri", "Mokolo", "Bafang", "Mbouda", "Tiko", "Batouri", "Meiganga", "Guider", "Yagoua", "Bafia", "Obala", "Soa", "Mbanga", "Loum", "Wum", "Kumbo", "Ndop", "Mamfe", "Nkambe"],
  schools: {
    secondary: ["Lycée Général Leclerc (Yaoundé)", "Lycée Bilingue d'Etoug-Ebé (Yaoundé)", "Collège Vogt (Yaoundé)", "Collège de la Retraite (Yaoundé)", "Lycée Joss (Douala)", "Lycée Bilingue de Bonabéri (Douala)", "Collège Libermann (Douala)", "Lycée Technique de Douala-Koumassi", "Lycée Classique et Moderne de Bafoussam", "Lycée Classique de Ngaoundéré", "Lycée de Garoua", "Lycée de Maroua", "GBHS Molyko (Buea)", "Bishop Rogan College (Buea)", "Saker Baptist College (Limbe)", "Sacred Heart College Mankon (Bamenda)", "Presbyterian Secondary School Mankon (Bamenda)", "Our Lady of Lourdes College Mankon (Bamenda)", "GTHS Kumba"],
    higher: ["Université de Yaoundé I", "Université de Yaoundé II", "Université de Douala", "Université de Dschang", "University of Buea", "Université de Ngaoundéré", "Université de Maroua", "University of Bamenda", "Université de Bertoua", "Université d'Ebolowa", "Université de Garoua", "École Nationale Supérieure Polytechnique de Yaoundé", "École Normale Supérieure de Yaoundé", "ENSET de Douala", "ESSEC Douala", "ESSTIC", "IRIC", "ENAM", "ISSEA", "IUT de Douala", "IUT Fotso Victor de Bandjoun", "IUT de Ngaoundéré", "Faculté de Médecine et des Sciences Biomédicales", "Université Catholique d'Afrique Centrale", "Catholic University Institute of Buea", "Université Protestante d'Afrique Centrale"]
  },

  phoneCodes: [
    { code: "+237", label: "🇨🇲 +237" }, { code: "+33", label: "🇫🇷 +33" }, { code: "+241", label: "🇬🇦 +241" },
    { code: "+235", label: "🇹🇩 +235" }, { code: "+236", label: "🇨🇫 +236" }, { code: "+240", label: "🇬🇶 +240" },
    { code: "+242", label: "🇨🇬 +242" }, { code: "+234", label: "🇳🇬 +234" }, { code: "+1", label: "🇺🇸 +1" }
  ],

  countryCodes: "AF ZA AL DZ DE AD AO AG SA AR AM AU AT AZ BS BH BD BB BE BZ BJ BT BY MM BO BA BW BR BN BG BF BI KH CM CA CV CL CN CY CO KM CG CD KR KP CR CI HR CU DK DJ DM EG AE EC ER ES EE SZ US ET FJ FI FR GA GM GE GH GR GD GT GN GQ GW GY HT HN HU IN ID IQ IR IE IS IL IT JM JP JO KZ KE KG KI KW LA LS LV LB LR LY LI LT LU MK MG MY MW MV ML MT MA MH MU MR MX FM MD MC MN ME MZ NA NR NP NI NE NG NO NZ OM UG UZ PK PW PS PA PG PY NL PE PH PL PT QA CF DO CZ RO GB RU RW KN SM VC LC SB SV WS ST SN RS SC SL SG SK SI SO SD SS LK SE CH SR SY TJ TZ TD TH TL TG TO TT TN TM TR TV UA UY VU VA VE VN YE ZM ZW".split(" ")
};
