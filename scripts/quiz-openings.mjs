let serial = 0;

function q(categorie, difficulte, question, answer, wrongs, explication = '') {
  serial += 1;
  const options = [...wrongs];
  options.splice(serial % 4, 0, answer);
  return {
    id: `e${serial}`,
    categorie,
    difficulte,
    question,
    reponse_correcte: answer,
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    explication,
    actif: 1
  };
}

const culture = [
  q('Culture africaine', 'facile', 'Quel empire d’Afrique de l’Ouest est lié à « Mansa Musa » ?', 'Le Mali', ['Le Ghana antique', 'Le Songhaï', 'Le Kanem-Bornou'], 'Mansa Musa, souverain du Mali au XIVe siècle, est célèbre pour son pèlerinage à La Mecque.'),
  q('Culture africaine', 'moyen', 'Quelle ville du Mali abrite d’anciens manuscrits et une université médiévale ?', 'Tombouctou', ['Gao', 'Djenné', 'Ségou'], 'Tombouctou fut un grand centre du savoir en Afrique de l’Ouest.'),
  q('Culture africaine', 'facile', 'Quel instrument à cordes est associé aux griots mandingues ?', 'La kora', ['Le balafon', 'Le djembe', 'La sanza'], 'La kora est une harpe-luth d’Afrique de l’Ouest.'),
  q('Culture africaine', 'facile', 'De quelle région vient le « djembe » ?', 'Afrique de l’Ouest', ['Afrique australe', 'Maghreb', 'Corne de l’Afrique'], 'Le djembe est un tambour en calice joué en Afrique de l’Ouest.'),
  q('Culture africaine', 'moyen', 'Quel écrivain nigérian a publié « Things Fall Apart » ?', 'Chinua Achebe', ['Wole Soyinka', 'Ngugi wa Thiong’o', 'Léopold Sédar Senghor'], 'Le roman d’Achebe, paru en 1958, raconte la vie d’Okonkwo.'),
  q('Culture africaine', 'difficile', 'Quel écrivain nigérian a reçu le prix Nobel de littérature en 1986 ?', 'Wole Soyinka', ['Chinua Achebe', 'Naguib Mahfouz', 'Nadine Gordimer'], 'Soyinka est le premier Africain noir lauréat de ce Nobel.'),
  q('Culture africaine', 'moyen', 'Quelle Kenyane a reçu le prix Nobel de la paix pour son travail sur les arbres ?', 'Wangari Maathai', ['Ellen Johnson Sirleaf', 'Graça Machel', 'Miriam Makeba'], 'Wangari Maathai a fondé le Mouvement de la ceinture verte.'),
  q('Culture africaine', 'facile', 'Quel musicien nigérian est le grand nom de l’afrobeat ?', 'Fela Kuti', ['Youssou N’Dour', 'Salif Keita', 'Manu Dibango'], 'Fela Kuti mêlait jazz, highlife et critique politique.'),
  q('Culture africaine', 'facile', 'Le tissu « kente » est d’abord lié à quel peuple ?', 'Les Ashanti', ['Les Zoulous', 'Les Masaï', 'Les Touaregs'], 'Le kente est un tissu royal akan, tissé au Ghana.'),
  q('Culture africaine', 'moyen', 'Les bronzes de « Benin City » viennent de quel pays actuel ?', 'Le Nigeria', ['Le Bénin', 'Le Ghana', 'Le Cameroun'], 'Le royaume du Bénin historique se trouve dans le Nigeria d’aujourd’hui.'),
  q('Culture africaine', 'facile', 'Où se trouve le siège de l’Union africaine ?', 'Addis-Abeba', ['Nairobi', 'Dakar', 'Le Caire'], 'L’Union africaine siège dans la capitale de l’Éthiopie.'),
  q('Culture africaine', 'moyen', 'Quel site de pierre, au Zimbabwe, a donné son nom au pays ?', 'Le Grand Zimbabwe', ['Lalibela', 'Aksoum', 'Carthage'], 'Les ruines du Grand Zimbabwe datent du Moyen Âge.'),
  q('Culture africaine', 'facile', 'Quel désert couvre une grande part de l’Afrique du Nord ?', 'Le Sahara', ['Le Kalahari', 'Le Namib', 'Le Danakil'], 'Le Sahara est le plus grand désert chaud du monde.'),
  q('Culture africaine', 'facile', 'Quel fleuve est le plus long d’Afrique ?', 'Le Nil', ['Le Congo', 'Le Niger', 'Le Zambèze'], 'Le Nil traverse notamment l’Ouganda, le Soudan et l’Égypte.'),
  q('Culture africaine', 'facile', 'Dans quel pays culmine le « Kilimandjaro » ?', 'La Tanzanie', ['Le Kenya', 'L’Éthiopie', 'L’Ouganda'], 'Le Kilimandjaro est le plus haut sommet d’Afrique.'),
  q('Culture africaine', 'moyen', 'Les chutes Victoria se trouvent entre quels pays ?', 'La Zambie et le Zimbabwe', ['L’Afrique du Sud et le Lesotho', 'Le Kenya et la Tanzanie', 'Le Mali et le Niger'], 'Les chutes sont sur le Zambèze, à la frontière des deux pays.'),
  q('Culture africaine', 'facile', 'Quelle langue créole à base malgache et austronésienne parle-t-on à « Madagascar » ?', 'Le malgache', ['Le swahili', 'Le lingala', 'L’amharique'], 'Le malgache est la langue nationale de Madagascar.'),
  q('Culture africaine', 'moyen', 'Quel royaume antique d’Afrique du Nord est lié à « Hannibal » ?', 'Carthage', ['Aksoum', 'Koush', 'Numidie'], 'Hannibal était un général carthaginois.'),
  q('Culture africaine', 'facile', 'Nelson Mandela a été président de quel pays ?', 'L’Afrique du Sud', ['Le Zimbabwe', 'La Namibie', 'Le Botswana'], 'Il est devenu président en 1994, après l’apartheid.'),
  q('Culture africaine', 'moyen', 'Comment appelle-t-on les conteurs-historiens d’Afrique de l’Ouest ?', 'Les griots', ['Les marabouts', 'Les sangomas', 'Les ras'], 'Le griot garde la mémoire des familles et des royaumes.'),
  q('Culture africaine', 'difficile', 'Quel empire d’Afrique de l’Ouest a succédé au Mali et eu pour centre « Gao » ?', 'Le Songhaï', ['Le Ghana antique', 'Le Kanem', 'Le Monomotapa'], 'L’empire songhaï domine la région aux XVe et XVIe siècles.'),
  q('Culture africaine', 'facile', 'Les pyramides de Gizeh se trouvent dans quel pays ?', 'L’Égypte', ['Le Soudan', 'La Libye', 'L’Éthiopie'], 'Le plateau de Gizeh est près du Caire.'),
  q('Culture africaine', 'moyen', 'Quel parc, partagé par le Kenya et la Tanzanie, est célèbre pour la grande migration ?', 'Le Serengeti et le Masaï Mara', ['Le Kruger', 'Le parc de la Comoé', 'Le delta de l’Okavango'], 'Les gnous traversent chaque année le Mara et le Serengeti.'),
  q('Culture africaine', 'facile', 'Quelle mer borde l’Afrique à l’est, entre le continent et la péninsule arabique ?', 'La mer Rouge', ['La mer Méditerranée', 'Le golfe de Guinée', 'La mer Noire'], 'La mer Rouge sépare l’Afrique de l’Arabie.'),
  q('Culture africaine', 'moyen', 'Les églises creusées dans le roc de « Lalibela » sont dans quel pays ?', 'L’Éthiopie', ['L’Érythrée', 'L’Égypte', 'Le Mali'], 'Lalibela est un haut lieu du christianisme éthiopien.')
];

const rdc = [
  q('RDC', 'facile', 'Quelle est la capitale de la « RDC » ?', 'Kinshasa', ['Lubumbashi', 'Kisangani', 'Goma'], 'Kinshasa est la capitale politique et la plus grande ville du pays.'),
  q('RDC', 'facile', 'De quel pays la RDC a-t-elle pris son indépendance en 1960 ?', 'La Belgique', ['La France', 'Le Portugal', 'Le Royaume-Uni'], 'L’indépendance est proclamée le 30 juin 1960.'),
  q('RDC', 'facile', 'Qui est le premier Premier ministre de la RDC indépendante ?', 'Patrice Lumumba', ['Joseph Kasa-Vubu', 'Mobutu Sese Seko', 'Laurent-Désiré Kabila'], 'Lumumba dirige le premier gouvernement, Kasa-Vubu est le premier président.'),
  q('RDC', 'moyen', 'Comment s’appelait le pays entre 1971 et 1997 ?', 'Le Zaïre', ['Le Congo belge', 'Le Katanga', 'Le Congo-Brazzaville'], 'Mobutu rebaptise le pays Zaïre en 1971.'),
  q('RDC', 'facile', 'Quelle est la monnaie de la RDC ?', 'Le franc congolais', ['Le franc CFA', 'Le shilling', 'Le kwacha'], 'Le franc congolais a remplacé le nouveau zaïre.'),
  q('RDC', 'facile', 'Quel fleuve donne son nom au pays voisin et traverse la RDC ?', 'Le Congo', ['Le Nil', 'Le Zambèze', 'Le Niger'], 'Le fleuve Congo est le plus profond du monde.'),
  q('RDC', 'moyen', 'Quel animal forestier, cousin de la girafe, ne vit à l’état sauvage qu’en RDC ?', 'L’okapi', ['Le bonobo', 'Le bongo', 'Le pangolin'], 'L’okapi vit dans la forêt de l’Ituri.'),
  q('RDC', 'moyen', 'Quel grand singe n’existe à l’état sauvage qu’en RDC ?', 'Le bonobo', ['Le chimpanzé', 'Le gorille de montagne', 'L’orang-outan'], 'Le bonobo vit au sud du fleuve Congo.'),
  q('RDC', 'facile', 'Dans quelle ville de l’est se trouve le lac Kivu ?', 'Goma', ['Kisangani', 'Matadi', 'Mbandaka'], 'Goma est le chef-lieu du Nord-Kivu, au bord du lac Kivu.'),
  q('RDC', 'facile', 'Quelle grande ville minière est le chef-lieu du Haut-Katanga ?', 'Lubumbashi', ['Kolwezi', 'Likasi', 'Kalemie'], 'Lubumbashi est la principale ville du sud minier.'),
  q('RDC', 'moyen', 'Quel parc national de l’est protège des gorilles de montagne ?', 'Le parc des Virunga', ['Le parc de la Garamba', 'Le parc de la Salonga', 'Le parc des Kundelungu'], 'Les Virunga sont le plus ancien parc national d’Afrique, créé en 1925.'),
  q('RDC', 'facile', 'Quelle langue européenne est la langue officielle de la RDC ?', 'Le français', ['Le portugais', 'L’anglais', 'Le néerlandais'], 'Le français est la langue officielle, aux côtés de quatre langues nationales.'),
  q('RDC', 'moyen', 'Laquelle de ces langues est une langue nationale de la RDC ?', 'Le lingala', ['Le wolof', 'Le haoussa', 'L’afrikaans'], 'Les langues nationales sont le lingala, le kikongo, le swahili et le tshiluba.'),
  q('RDC', 'moyen', 'Quel port maritime relie la RDC à l’océan Atlantique ?', 'Matadi', ['Boma', 'Moanda', 'Banana'], 'Matadi, sur le fleuve Congo, est le principal port du pays.'),
  q('RDC', 'difficile', 'Quel lac partagé avec la Tanzanie borde le Tanganyika ?', 'Le lac Tanganyika', ['Le lac Kivu', 'Le lac Albert', 'Le lac Mai-Ndombe'], 'Le Tanganyika est l’un des plus grands lacs d’Afrique.'),
  q('RDC', 'moyen', 'Qui prend Kinshasa en 1997 et met fin au régime de Mobutu ?', 'Laurent-Désiré Kabila', ['Joseph Kabila', 'Patrice Lumumba', 'Moïse Tshombe'], 'Laurent-Désiré Kabila devient président en mai 1997.'),
  q('RDC', 'facile', 'Le cuivre et le cobalt sont surtout extraits dans quelle région ?', 'Le Katanga', ['L’Équateur', 'Le Kongo-Central', 'Le Mai-Ndombe'], 'Le Haut-Katanga et le Lualaba forment le cœur minier.'),
  q('RDC', 'moyen', 'Quel élargissement du fleuve, près de Kinshasa, porte le nom de Pool Malebo ?', 'Le Stanley Pool', ['Le lac Kivu', 'Les chutes Livingstone', 'Le lac Tumba'], 'Le Pool Malebo s’étend entre Kinshasa et Brazzaville.'),
  q('RDC', 'facile', 'Quelle ville est face à Kinshasa, de l’autre côté du fleuve ?', 'Brazzaville', ['Libreville', 'Luanda', 'Bangui'], 'Les deux capitales sont les plus proches du monde, séparées par le Congo.'),
  q('RDC', 'difficile', 'Combien de provinces la RDC compte-t-elle depuis le découpage de 2015 ?', '26', ['11', '16', '24'], 'Les 11 anciennes provinces ont été subdivisées en 26.'),
  q('RDC', 'moyen', 'Quel est le chef-lieu du Nord-Kivu ?', 'Goma', ['Bukavu', 'Bunia', 'Butembo'], 'Goma administre la province du Nord-Kivu.'),
  q('RDC', 'moyen', 'Quel est le chef-lieu du Sud-Kivu ?', 'Bukavu', ['Goma', 'Uvira', 'Kalemie'], 'Bukavu est au sud du lac Kivu.'),
  q('RDC', 'moyen', 'Quel est le chef-lieu de la Tshopo ?', 'Kisangani', ['Isiro', 'Kindu', 'Lisala'], 'Kisangani se trouve au bord du fleuve Congo.'),
  q('RDC', 'facile', 'Quel club de Lubumbashi est l’un des plus titrés d’Afrique ?', 'Le TP Mazembe', ['L’AS Vita Club', 'Le DCMP', 'Sanga Balende'], 'Le Tout Puissant Mazembe a remporté plusieurs Ligues des champions.'),
  q('RDC', 'moyen', 'Les barrages d’Inga sont construits sur quel fleuve ?', 'Le Congo', ['Le Kasaï', 'L’Ubangi', 'Le Lualaba seul'], 'Inga se trouve en aval de Kinshasa, dans le Kongo-Central.')
];

const chefs = [
  ['Kongo-Central', 'Matadi'],
  ['Kwango', 'Kenge'],
  ['Kwilu', 'Bandundu'],
  ['Kasaï', 'Tshikapa'],
  ['Kasaï-Central', 'Kananga'],
  ['Kasaï-Oriental', 'Mbuji-Mayi'],
  ['Ituri', 'Bunia'],
  ['Haut-Katanga', 'Lubumbashi'],
  ['Lualaba', 'Kolwezi'],
  ['Équateur', 'Mbandaka'],
  ['Sud-Ubangi', 'Gemena'],
  ['Nord-Ubangi', 'Gbadolite'],
  ['Tanganyika', 'Kalemie'],
  ['Maniema', 'Kindu']
];
const chefVilles = chefs.map(([, ville]) => ville);
for (const [province, ville] of chefs) {
  const wrongs = chefVilles.filter(name => name !== ville).slice(0, 3);
  rdc.push(q('RDC', 'difficile', `Quel est le chef-lieu de la province « ${province} » ?`, ville, wrongs, `${ville} est le chef-lieu du ${province}.`));
}

const animaux = [
  q('Animaux', 'facile', 'Quel est le plus grand animal terrestre ?', 'L’éléphant d’Afrique', ['Le rhinocéros', 'L’hippopotame', 'La girafe'], 'L’éléphant de savane est le plus lourd des animaux terrestres.'),
  q('Animaux', 'facile', 'Quel animal terrestre court le plus vite ?', 'Le guépard', ['Le lion', 'L’autruche', 'Le springbok'], 'Le guépard peut dépasser 100 km/h sur une courte distance.'),
  q('Animaux', 'facile', 'Quel animal a le cou le plus long ?', 'La girafe', ['L’autruche', 'Le gnou', 'Le dromadaire'], 'La girafe atteint les feuilles hautes de la savane.'),
  q('Animaux', 'facile', 'Quel oiseau, incapable de voler, est le plus grand du monde ?', 'L’autruche', ['L’émeu', 'Le casoar', 'Le manchot'], 'L’autruche vit dans les savanes d’Afrique.'),
  q('Animaux', 'facile', 'Où vivent les lémuriens à l’état sauvage ?', 'Madagascar', ['Les Comores', 'Le Kenya', 'Le Sénégal'], 'Presque tous les lémuriens sont endémiques de Madagascar.'),
  q('Animaux', 'moyen', 'Quel manchot vit sur les côtes d’Afrique australe ?', 'Le manchot du Cap', ['Le manchot empereur', 'Le manchot royal', 'Le manchot Adélie'], 'Le manchot du Cap niche en Afrique du Sud et en Namibie.'),
  q('Animaux', 'facile', 'Quel grand singe partage son nom avec un pays du golfe de Guinée ?', 'Le gorille', ['Le chimpanzé', 'Le babouin', 'Le drill'], 'Des gorilles vivent notamment au Gabon, au Congo et en RDC.'),
  q('Animaux', 'moyen', 'Quel félin, contrairement au lion, chasse surtout seul ?', 'Le léopard', ['Le guépard', 'La hyène', 'Le lycaon'], 'Le léopard est solitaire et hisse souvent ses proies dans les arbres.'),
  q('Animaux', 'facile', 'Quel mammifère d’Afrique passe une grande partie de la journée dans l’eau ?', 'L’hippopotame', ['Le buffle', 'Le phacochère', 'Le céphalophe'], 'L’hippopotame sort surtout la nuit pour brouter.'),
  q('Animaux', 'moyen', 'Quel reptile du Nil est l’un des plus grands crocodiles ?', 'Le crocodile du Nil', ['Le gavial', 'L’alligator', 'Le caïman noir'], 'Le crocodile du Nil vit dans une grande partie de l’Afrique.'),
  q('Animaux', 'facile', 'Quel rongeur des savanes monte la garde en groupe ?', 'Le suricate', ['Le ratel', 'Le daman', 'L’oryctérope'], 'Les suricates se relaient pour surveiller les prédateurs.'),
  q('Animaux', 'moyen', 'Quel mammifère à écailles est parmi les plus braconnés au monde ?', 'Le pangolin', ['L’oryctérope', 'Le potamochère', 'Le tenrec'], 'Le pangolin se roule en boule quand il est menacé.'),
  q('Animaux', 'facile', 'Quel oiseau gris, très doué pour imiter la voix, vient d’Afrique ?', 'Le perroquet gris du Gabon', ['L’ara', 'Le cacatoès', 'La perruche ondulée'], 'Le gris du Gabon est célèbre pour son imitation.'),
  q('Animaux', 'moyen', 'Quel petit renard du Sahara a de très grandes oreilles ?', 'Le fennec', ['Le chacal', 'Le lycaon', 'Le caracal'], 'Les oreilles du fennec évacuent la chaleur.'),
  q('Animaux', 'facile', 'Quel herbivore porte une ou deux cornes sur le museau ?', 'Le rhinocéros', ['L’hippopotame', 'Le buffle', 'Le gnou'], 'L’Afrique compte le rhinocéros noir et le rhinocéros blanc.'),
  q('Animaux', 'moyen', 'Quel oiseau de proie africain marche au sol et chasse les serpents ?', 'Le serpentaire', ['Le vautour', 'Le calao', 'Le marabout'], 'Le messager sagittaire, ou serpentaire, a de longues pattes.'),
  q('Animaux', 'facile', 'Quel poisson d’eau douce géant vit dans le Nil et les grands lacs ?', 'La perche du Nil', ['Le capitaine', 'Le tilapia', 'Le poisson-chat'], 'La perche du Nil a beaucoup modifié le lac Victoria.'),
  q('Animaux', 'difficile', 'Quel mammifère insectivore creuse avec de puissantes griffes et un long museau ?', 'L’oryctérope', ['Le pangolin', 'Le ratel', 'Le daman'], 'L’oryctérope, ou aardvark, mange surtout des termites.'),
  q('Animaux', 'facile', 'Les rayures servent de camouflage à quel animal ?', 'Le zèbre', ['Le gnou', 'L’oryx', 'Le bubale'], 'Chaque zèbre a un dessin de rayures différent.'),
  q('Animaux', 'moyen', 'Quel serpent africain, très rapide, est redouté pour son venin ?', 'Le mamba noir', ['Le python de Séba', 'La vipère heurtante', 'Le cobra royal'], 'Le mamba noir vit en Afrique subsaharienne.'),
  q('Animaux', 'facile', 'Quel animal de bât est adapté au désert grâce à sa bosse ?', 'Le dromadaire', ['Le chameau de Bactriane', 'L’âne', 'Le zébu'], 'Le dromadaire n’a qu’une bosse. Le chameau de Bactriane en a deux.'),
  q('Animaux', 'moyen', 'Dans quel pays d’Afrique les gorilles de montagne sont-ils suivis dans les Virunga ?', 'La RDC, le Rwanda et l’Ouganda', ['Le Kenya seul', 'La Tanzanie seule', 'Le Cameroun'], 'Le massif des Virunga est partagé par ces trois pays.'),
  q('Animaux', 'facile', 'Quel insecte construit de hautes termitières dans la savane ?', 'Le termite', ['La fourmi magnan', 'L’abeille', 'Le bousier'], 'Les termitières peuvent dépasser plusieurs mètres.'),
  q('Animaux', 'moyen', 'Quel mustélidé africain a la réputation de ne reculer devant presque rien ?', 'Le ratel', ['La genette', 'Le zorille', 'La civette'], 'Le ratel, ou honey badger, mange même des proies venimeuses.'),
  q('Animaux', 'facile', 'Quel grand ruminant forme d’immenses troupeaux lors de la migration ?', 'Le gnou', ['Le buffle', 'L’éland', 'Le koudou'], 'Les gnous traversent le Serengeti et le Masaï Mara.')
];

const religions = [
  q('Religions', 'facile', 'Dans la Bible, quel est le premier livre ?', 'La Genèse', ['L’Exode', 'Les Psaumes', 'L’Évangile selon Jean'], 'La Genèse ouvre la Bible et raconte la création.'),
  q('Religions', 'facile', 'Dans la Bible, qui conduit le peuple hors d’Égypte ?', 'Moïse', ['Abraham', 'David', 'Noé'], 'Le livre de l’Exode raconte la sortie d’Égypte.'),
  q('Religions', 'facile', 'Dans la Bible, qui affronte le géant Goliath ?', 'David', ['Samson', 'Salomon', 'Josué'], 'David, encore jeune berger, affronte Goliath.'),
  q('Religions', 'facile', 'Dans la Bible, qui construit une arche avant le déluge ?', 'Noé', ['Abraham', 'Job', 'Jonas'], 'Noé fait entrer dans l’arche sa famille et les animaux.'),
  q('Religions', 'moyen', 'Dans la Bible, sur quelle montagne Moïse reçoit-il les tables de la Loi ?', 'Le Sinaï', ['Le Carmel', 'Le Thabor', 'Le Nébo'], 'La tradition biblique situe le don de la Loi au mont Sinaï.'),
  q('Religions', 'facile', 'Dans les Évangiles, dans quelle ville Jésus naît-il ?', 'Bethléem', ['Nazareth', 'Jérusalem', 'Capharnaüm'], 'Bethléem est en Judée. Nazareth est la ville où il grandit.'),
  q('Religions', 'facile', 'Combien d’apôtres Jésus choisit-il dans les Évangiles ?', 'Douze', ['Sept', 'Dix', 'Soixante-dix'], 'Les douze accompagnent Jésus pendant son ministère.'),
  q('Religions', 'moyen', 'Quel livre de la Bible réunit surtout des cantiques attribués à David ?', 'Les Psaumes', ['Les Proverbes', 'Le Cantique des cantiques', 'L’Ecclésiaste'], 'Le Psautier est le livre de prières et de chants.'),
  q('Religions', 'facile', 'Dans la Bible, quel prophète est jeté à la mer et avalé par un grand poisson ?', 'Jonas', ['Élie', 'Jérémie', 'Daniel'], 'Le livre de Jonas raconte cet épisode.'),
  q('Religions', 'moyen', 'Dans la Bible, qui demande la sagesse et fait bâtir le Temple de Jérusalem ?', 'Salomon', ['David', 'Saül', 'Ezéchias'], 'David prépare le projet, Salomon construit le Temple.'),
  q('Religions', 'facile', 'Le Coran a été reçu, selon l’islam, par quel prophète ?', 'Muhammad', ['Ibrahim', 'Moussa', 'Issa'], 'Les musulmans reconnaissent Muhammad comme le dernier prophète.'),
  q('Religions', 'facile', 'Comment s’appelle la première sourate du Coran ?', 'Al-Fatiha', ['Al-Baqara', 'Ya-Sin', 'Al-Ikhlas'], 'Al-Fatiha, « l’Ouverture », se récite dans la prière.'),
  q('Religions', 'moyen', 'Combien de sourates compte le Coran ?', '114', ['99', '30', '40'], 'Le Coran est divisé en 114 sourates.'),
  q('Religions', 'facile', 'En quelle langue le Coran a-t-il été révélé ?', 'L’arabe', ['L’hébreu', 'L’araméen', 'Le persan'], 'Le texte coranique est en arabe.'),
  q('Religions', 'facile', 'Quel mois les musulmans jeûnent-ils du lever au coucher du soleil ?', 'Ramadan', ['Rajab', 'Shawwal', 'Mouharram'], 'Le jeûne du Ramadan est l’un des cinq piliers.'),
  q('Religions', 'facile', 'Vers quelle ville se fait le pèlerinage du hajj ?', 'La Mecque', ['Médine', 'Jérusalem', 'Damas'], 'Le hajj a pour centre la Kaaba, à La Mecque.'),
  q('Religions', 'moyen', 'Quel ange est associé, dans l’islam, à la transmission du Coran ?', 'Jibril', ['Mikail', 'Israfil', 'Azrail'], 'Jibril est le nom arabe de Gabriel.'),
  q('Religions', 'moyen', 'La profession de foi musulmane s’appelle :', 'La shahada', ['La salat', 'La zakat', 'Le sawm'], 'La shahada atteste qu’il n’y a de dieu qu’Allah et que Muhammad est son messager.'),
  q('Religions', 'facile', 'La Torah correspond, dans la Bible, à quels livres ?', 'Les cinq premiers', ['Les seuls Évangiles', 'Les Psaumes seuls', 'Les livres des Prophètes seuls'], 'Genèse, Exode, Lévitique, Nombres et Deutéronome forment le Pentateuque.'),
  q('Religions', 'moyen', 'Comment s’appelle le premier livre de la Torah en hébreu ?', 'Béréchit', ['Chémot', 'Vayikra', 'Devarim'], 'Béréchit signifie « Au commencement », comme la Genèse.'),
  q('Religions', 'facile', 'Dans le judaïsme, quel jour est le shabbat ?', 'Le septième jour', ['Le premier jour', 'Le vendredi seulement', 'La pleine lune'], 'Le shabbat commence le vendredi soir et dure jusqu’au samedi soir.'),
  q('Religions', 'moyen', 'Quelle fête juive rappelle la sortie d’Égypte ?', 'Pessa’h', ['Yom Kippour', 'Souccot', 'Pourim'], 'Pessa’h, la Pâque juive, commémore l’Exode.'),
  q('Religions', 'facile', 'En quelle langue la Torah a-t-elle été écrite ?', 'L’hébreu', ['L’arabe', 'Le grec', 'Le latin'], 'Le texte de la Torah est en hébreu.'),
  q('Religions', 'moyen', 'Dans la Torah, avec qui l’alliance de la circoncision est-elle conclue ?', 'Abraham', ['Noé', 'Moïse', 'David'], 'Le récit se trouve dans la Genèse.'),
  q('Religions', 'difficile', 'Quel verset de la Torah interdit de cuire un chevreau dans le lait de sa mère ?', 'Un commandement de l’Exode', ['Un psaume de David', 'Une parole de Salomon', 'Une parabole de Jésus'], 'Ce verset est à l’origine des règles qui séparent viande et lait.'),
  q('Religions', 'facile', 'Quel livre saint le judaïsme, le christianisme et l’islam reconnaissent-ils tous comme lié à Moïse ?', 'La Torah', ['Le Nouveau Testament seul', 'Les Védas', 'Le Tripitaka'], 'Moïse, Moussa dans le Coran, est une figure commune aux trois traditions.')
];

const enigmes = [
  q('Énigmes', 'facile', 'Plus on m’enlève, plus je grandis. Qui suis-je ?', 'Un trou', ['Une ombre', 'Une dette', 'Une racine'], 'Chaque pelletée creuse le trou et l’agrandit.'),
  q('Énigmes', 'facile', 'Je cours sans avoir de jambes. Qui suis-je ?', 'Une rivière', ['Le vent', 'Une horloge', 'Une ombre'], 'L’eau d’une rivière court sans jambes.'),
  q('Énigmes', 'facile', 'J’ai des dents, mais je ne mange pas. Qui suis-je ?', 'Un peigne', ['Une scie', 'Une fourchette', 'Un râteau'], 'Les dents du peigne servent à démêler, pas à manger.'),
  q('Énigmes', 'moyen', 'Blanc à l’entrée, vert au milieu, rouge à la sortie. Qui suis-je ?', 'Un radis', ['Une tomate', 'Une pastèque', 'Un poivron'], 'Le radis est blanc, puis vert, puis rouge.'),
  q('Énigmes', 'facile', 'Je suis toujours devant toi, mais tu ne me vois jamais. Qui suis-je ?', 'L’avenir', ['L’air', 'Le silence', 'Ton dos'], 'L’avenir est devant nous sans être visible.'),
  q('Énigmes', 'facile', 'Je monte et je descends sans me déplacer. Qui suis-je ?', 'Un escalier', ['Un ascenseur', 'La marée', 'Un yo-yo'], 'Les marches restent en place pendant qu’on monte.'),
  q('Énigmes', 'moyen', 'Plus on me prend, plus on en laisse derrière soi. Qui suis-je ?', 'Des empreintes', ['Du temps', 'Des photos', 'Des miettes'], 'Chaque pas prend appui et laisse une empreinte.'),
  q('Énigmes', 'facile', 'J’ai un cou, mais pas de tête. Qui suis-je ?', 'Une bouteille', ['Une guitare', 'Une lampe', 'Une chemise'], 'On parle du goulot, le cou de la bouteille.'),
  q('Énigmes', 'facile', 'J’ai des clés, mais je n’ouvre aucune porte. Qui suis-je ?', 'Un piano', ['Une carte', 'Un clavier d’ordinateur', 'Un trousseau peint'], 'Les touches du piano s’appellent aussi des clés.'),
  q('Énigmes', 'moyen', 'Je peux remplir une pièce sans prendre de place. Qui suis-je ?', 'La lumière', ['Le silence', 'Une idée', 'Le froid'], 'La lumière éclaire la pièce sans l’encombrer.'),
  q('Énigmes', 'facile', 'Je commence la nuit et je finis le matin. Qui suis-je ?', 'La lettre N', ['La lune', 'Le rêve', 'Le coq'], 'Le mot « nuit » commence par N, « matin » finit par N.'),
  q('Énigmes', 'moyen', 'Plus il y en a, moins on voit. Qui suis-je ?', 'Le brouillard', ['Les bougies', 'Les fenêtres', 'Les miroirs'], 'Le brouillard cache ce qui est devant soi.'),
  q('Énigmes', 'facile', 'On me prend avant de m’obtenir. Qui suis-je ?', 'Une photo', ['Un rhume', 'Un train', 'Une promesse'], 'On « prend » une photo, puis on l’obtient.'),
  q('Énigmes', 'moyen', 'J’ai des aiguilles, mais je ne couds pas. Qui suis-je ?', 'Une horloge', ['Un sapin', 'Un hérisson', 'Une boussole'], 'Les aiguilles de l’horloge montrent l’heure.'),
  q('Énigmes', 'facile', 'Tout le monde me possède, et les autres s’en servent plus que moi. Qui suis-je ?', 'Mon nom', ['Mon ombre', 'Ma voix', 'Mon reflet'], 'Ce sont les autres qui prononcent le plus souvent notre nom.'),
  q('Énigmes', 'difficile', 'Je suis chaud quand on me sort, et frais quand on me mange trop tard. De quel aliment parle ce jeu de mots ?', 'Le pain', ['La soupe', 'Le fromage', 'Le thé'], 'On dit d’un pain qu’il est frais, et il sort chaud du four.'),
  q('Énigmes', 'moyen', 'Qu’est-ce qui tourne toute la journée sans avancer d’un pas ?', 'Une aiguille d’horloge', ['Une roue', 'La Terre', 'Un ventilateur'], 'L’aiguille tourne sur place.'),
  q('Énigmes', 'facile', 'Plus je sèche, plus je suis mouillée. Qui suis-je ?', 'Une serviette', ['Une éponge', 'La rosée', 'Une larme'], 'La serviette sèche ce qu’elle touche et devient mouillée.')
];

const sport = [
  q('Sport', 'facile', 'Quel pays a accueilli la Coupe du monde de football en 2010 ?', 'L’Afrique du Sud', ['Le Maroc', 'L’Égypte', 'Le Nigeria'], 'C’était la première Coupe du monde organisée en Afrique.'),
  q('Sport', 'facile', 'Comment s’appelle la coupe d’Afrique des nations de football ?', 'La CAN', ['La CAF', 'La COSAFA', 'La BAL'], 'La CAN est organisée par la Confédération africaine de football.'),
  q('Sport', 'moyen', 'Quel Libérien a reçu le Ballon d’or en 1995 ?', 'George Weah', ['Samuel Eto’o', 'Didier Drogba', 'Roger Milla'], 'George Weah est le premier Ballon d’or africain.'),
  q('Sport', 'facile', 'De quel pays vient « Didier Drogba » ?', 'La Côte d’Ivoire', ['Le Ghana', 'Le Sénégal', 'Le Cameroun'], 'Drogba a porté le maillot des Éléphants.'),
  q('Sport', 'facile', 'De quel pays vient « Samuel Eto’o » ?', 'Le Cameroun', ['Le Nigeria', 'Le Gabon', 'Le Mali'], 'Eto’o est une figure des Lions indomptables.'),
  q('Sport', 'moyen', 'Quel surnom porte l’équipe nationale du Cameroun ?', 'Les Lions indomptables', ['Les Super Eagles', 'Les Léopards', 'Les Éléphants'], 'Le Nigeria est les Super Eagles, la RDC les Léopards.'),
  q('Sport', 'facile', 'Quel surnom porte l’équipe nationale de la RDC ?', 'Les Léopards', ['Les Éléphants', 'Les Lions de la Téranga', 'Les Indomptables'], 'Les Léopards représentent la République démocratique du Congo.'),
  q('Sport', 'moyen', 'Quel Éthiopien a gagné le marathon olympique de Rome en 1960 pieds nus ?', 'Abebe Bikila', ['Haile Gebrselassie', 'Eliud Kipchoge', 'Kenenisa Bekele'], 'Bikila court une partie de la course sans chaussures.'),
  q('Sport', 'facile', 'Dans quelle ville congolaise évolue le TP Mazembe ?', 'Lubumbashi', ['Kinshasa', 'Goma', 'Kisangani'], 'Le club est surnommé les Corbeaux de Lubumbashi.'),
  q('Sport', 'moyen', 'Quel club de Kinshasa est l’un des grands du football congolais avec Mazembe ?', 'L’AS Vita Club', ['Le DC Motema Pembe', 'Sanga Balende', 'Le FC Saint-Éloi'], 'Vita Club joue à Kinshasa. Mazembe joue à Lubumbashi.')
];

const histoire = [
  q('Histoire & Culture', 'moyen', 'En quelle année la plupart des pays d’Afrique francophone deviennent-ils indépendants ?', '1960', ['1958', '1975', '1945'], '1960 est souvent appelée l’année des indépendances africaines.'),
  q('Histoire & Culture', 'facile', 'Quel océan borde l’Afrique à l’ouest ?', 'L’Atlantique', ['L’Indien', 'Le Pacifique', 'L’Arctique'], 'La côte ouest africaine donne sur l’Atlantique.'),
  q('Histoire & Culture', 'moyen', 'Quel détroit sépare l’Afrique de l’Europe ?', 'Gibraltar', ['Le Bosphore', 'Ormuz', 'Malacca'], 'Le détroit de Gibraltar relie l’Atlantique et la Méditerranée.'),
  q('Histoire & Culture', 'facile', 'Quel canal égyptien relie la Méditerranée à la mer Rouge ?', 'Suez', ['Panama', 'Corinthe', 'Kiel'], 'Le canal de Suez évite le contournement de l’Afrique.'),
  q('Histoire & Culture', 'moyen', 'Quelle chaîne de montagnes traverse le Maroc, l’Algérie et la Tunisie ?', 'L’Atlas', ['Le Drakensberg', 'Le Ruwenzori', 'Le Fouta-Djalon'], 'L’Atlas borde le Sahara au nord.'),
  q('Histoire & Culture', 'facile', 'Quel est le plus grand pays d’Afrique par la superficie ?', 'L’Algérie', ['La RDC', 'Le Soudan', 'La Libye'], 'L’Algérie devance la RDC, deuxième pays du continent.'),
  q('Histoire & Culture', 'difficile', 'Quelle cité-État de l’actuelle Éthiopie a laissé des obélisques ?', 'Aksoum', ['Lalibela', 'Harar', 'Gondar'], 'Le royaume d’Aksoum commerce autrefois jusqu’à la mer Rouge.'),
  q('Histoire & Culture', 'moyen', 'Qui a été le premier président de l’Afrique du Sud élu au suffrage universel ?', 'Nelson Mandela', ['Thabo Mbeki', ['Frederik de Klerk', 'Desmond Tutu'][0], 'Desmond Tutu'], 'L’élection a lieu en 1994.')
];

export const openings = [...culture, ...rdc, ...animaux, ...religions, ...enigmes, ...sport, ...histoire];
