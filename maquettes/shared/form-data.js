/*
 * Paramètres du formulaire de candidature — Prix d'Excellence ZTF (Cameroun).
 * Les listes officielles (niveaux, séries, domaines, catégories, établissements) sont dans ztf-lists.js,
 * reprises du formulaire officiel apply.excellenceawardsztf.com.
 */
window.ZTF_DATA = {
  edition: "2026-2027",
  schoolYear: "2025/2026",
  deadline: ["28 novembre 2026", "28 November 2026"],   // date communiquée par la Fondation (6e édition)
  contactEmail: "contact@excellenceawardsztf.com",
  whatsapp: "237656138785",   // support technique (même numéro que le formulaire officiel)
  minAge: 9,
  maxFileMB: 4,               // taille maximale par fichier (comme le formulaire officiel)
  maxFilesPerField: 10,
  motivationMax: 2000,

  genders: [["male", "Homme", "Male"], ["female", "Femme", "Female"]],

  /* Suggestions de villes (saisie libre) */
  cities: ["Yaoundé", "Douala", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Limbe", "Kumba", "Kribi", "Dschang", "Nkongsamba", "Edéa", "Foumban", "Mbalmayo", "Sangmélima", "Kousséri", "Mokolo", "Bafang", "Mbouda", "Tiko", "Batouri", "Meiganga", "Guider", "Yagoua", "Bafia", "Obala", "Soa", "Mbanga", "Loum", "Wum", "Kumbo", "Ndop", "Mamfe", "Nkambe"],

  phoneCodes: [
    { code: "+237", label: "🇨🇲 +237" }, { code: "+33", label: "🇫🇷 +33" }, { code: "+241", label: "🇬🇦 +241" },
    { code: "+235", label: "🇹🇩 +235" }, { code: "+236", label: "🇨🇫 +236" }, { code: "+240", label: "🇬🇶 +240" },
    { code: "+242", label: "🇨🇬 +242" }, { code: "+234", label: "🇳🇬 +234" }, { code: "+1", label: "🇺🇸 +1" }
  ],

  countryCodes: "AF ZA AL DZ DE AD AO AG SA AR AM AU AT AZ BS BH BD BB BE BZ BJ BT BY MM BO BA BW BR BN BG BF BI KH CM CA CV CL CN CY CO KM CG CD KR KP CR CI HR CU DK DJ DM EG AE EC ER ES EE SZ US ET FJ FI FR GA GM GE GH GR GD GT GN GQ GW GY HT HN HU IN ID IQ IR IE IS IL IT JM JP JO KZ KE KG KI KW LA LS LV LB LR LY LI LT LU MK MG MY MW MV ML MT MA MH MU MR MX FM MD MC MN ME MZ NA NR NP NI NE NG NO NZ OM UG UZ PK PW PS PA PG PY NL PE PH PL PT QA CF DO CZ RO GB RU RW KN SM VC LC SB SV WS ST SN RS SC SL SG SK SI SO SD SS LK SE CH SR SY TJ TZ TD TH TL TG TO TT TN TM TR TV UA UY VU VA VE VN YE ZM ZW".split(" ")
};
