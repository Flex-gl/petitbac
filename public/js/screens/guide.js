import { icon, shell } from '../ui.js';

const GAMES = [
  { id: 'petitbac', title: 'Petit Bac', cover: '/covers/petitbac.jpg', line: 'Une lettre, des catégories, une correction en commun.' },
  { id: 'inter', title: 'INTER', cover: '/covers/inter.jpg', line: 'Des cartes, une enseigne, des effets qui s’additionnent.' },
  { id: 'quiz', title: 'Quiz Battle', cover: '/covers/quiz.jpg', line: 'La même question, quatre réponses, le serveur compte.' }
];

const ARTICLES = {
  petitbac: {
    rules: {
      title: 'Règles du Petit Bac',
      kicker: 'Lettres',
      html: `<p class="sheet-copy">Le Petit Bac se joue à plusieurs, en manches. L’hôte prépare la salle. Une lettre tombe. Chacun cherche un mot par catégorie avant la fin du temps. Ensuite l’hôte corrige, et les autres peuvent contester.</p>
      <h2>La salle</h2>
      <ol class="rules-list">
        <li>Il faut au moins deux joueurs. L’hôte crée la salle et partage le code ou le lien.</li>
        <li>Avant le départ, l’hôte choisit au moins deux catégories, la durée d’une manche et le nombre de manches.</li>
        <li>Une personne qui arrive après le début ne rejoint pas la manche en cours.</li>
      </ol>
      <h2>La manche</h2>
      <ol class="rules-list">
        <li>Une lettre est tirée. Chaque mot doit commencer par cette lettre.</li>
        <li>Tu remplis une réponse par catégorie, puis tu valides ta grille. Tu passes alors en attente.</li>
        <li>La correction commence quand tout le monde a validé, ou quand le temps est écoulé.</li>
        <li>Une case vide est manquée. Elle vaut 0 et n’est pas corrigée.</li>
      </ol>
      <h2>La correction et les points</h2>
      <ol class="rules-list">
        <li>L’hôte voit chaque réponse, joueur après joueur. Tout le salon voit la même correction.</li>
        <li>L’hôte accepte ou refuse. Les autres peuvent contester pendant le délai affiché.</li>
        <li>S’il y a contestation, chacun vote. La majorité tranche.</li>
        <li>Une réponse acceptée et unique vaut 2 points. La même réponse chez plusieurs joueurs vaut 1 point pour chacun.</li>
        <li>Une réponse refusée, hors lettre ou vide vaut 0.</li>
        <li>Les manches s’additionnent. À la fin, le classement de la partie est enregistré dans le classement général.</li>
      </ol>`
    },
    play: {
      title: 'Guide du Petit Bac',
      kicker: 'Première partie',
      html: `<p class="sheet-copy">Tu n’as jamais joué. Voici le chemin, du hall jusqu’au score, sans rien supposer.</p>
      <h2>Ouvrir une partie</h2>
      <ol class="rules-list">
        <li>Sur le hall, ouvre Lettres, puis Petit Bac.</li>
        <li>Pour inviter, touche Créer une partie. Écris ton pseudo, coche au moins deux catégories, choisis le temps et le nombre de manches.</li>
        <li>Le code de la salle s’affiche. Envoie le lien, ou dicte le code.</li>
        <li>Pour entrer chez quelqu’un, touche Rejoindre une salle, écris ton pseudo et le code. Si tu as ouvert un lien, le code est déjà là : il ne reste que le pseudo.</li>
      </ol>
      <h2>Jouer la manche</h2>
      <ol class="rules-list">
        <li>Quand la lettre apparaît, écris un mot par catégorie. Le mot doit commencer par cette lettre.</li>
        <li>Tu peux corriger tes cases tant que tu n’as pas validé.</li>
        <li>Valide avant la fin du temps. Si le temps tombe avant, les cases encore vides comptent comme manquées.</li>
        <li>Attends les autres. La correction ne démarre pas dans ton coin.</li>
      </ol>
      <h2>La correction</h2>
      <ol class="rules-list">
        <li>Si tu es l’hôte, accepte une réponse juste et refuse une réponse fausse ou hors sujet.</li>
        <li>Si tu n’es pas l’hôte, regarde la correction. Conteste seulement si tu n’es pas d’accord.</li>
        <li>Après la dernière manche, le classement s’affiche et tes points rejoignent le tableau général.</li>
        <li>Quitter la salle ferme cette partie sur ton appareil. Elle ne revient pas dans un bouton Reprendre.</li>
      </ol>`
    }
  },
  inter: {
    rules: {
      title: 'Règles d’INTER',
      kicker: 'Cartes',
      html: `<p class="sheet-copy">INTER se joue avec un jeu de 54 cartes : 52 cartes et 2 jokers. On pose une carte de la même enseigne ou de la même valeur que le centre. Les effets viennent ensuite. Le 2, le 10 et l’as ne sont pas des cartes libres.</p>
      <h2>La donne</h2>
      <ol class="rules-list">
        <li>Chacun reçoit 4 cartes. Une carte est retournée au centre. Le reste forme la pioche.</li>
        <li>Si la carte du centre est un 2, un 10 ou un joker, le joueur qui devait commencer la ramasse tout de suite, puis c’est au suivant de jouer.</li>
        <li>Si la carte du centre est un 8, le joueur qui commence choisit une valeur qu’il a encore en main. Cette valeur devient obligatoire.</li>
        <li>Après une manche, rien ne repart seul. L’hôte choisit d’en lancer une autre, ou de clore la partie.</li>
      </ol>
      <h2>Ce qui se pose</h2>
      <ol class="rules-list">
        <li>Une carte normale se pose sur la même enseigne ou la même valeur.</li>
        <li>Un clic pose tout le paquet de la même valeur que tu peux jouer, sauf le joker : un seul joker par clic.</li>
        <li>Quand plusieurs cartes de la même valeur tombent ensemble, celle du dessus inverse la couleur et l’enseigne du centre.</li>
        <li>Le 8 se pose sur tout, sauf si une valeur a déjà été demandée et que tu ne poses pas un 8 ou un joker. Tu demandes alors une valeur que tu as encore en main.</li>
        <li>Le joker ignore le centre. Après un joker, le joueur suivant peut poser n’importe quelle carte. Si le centre est un joker, ou si le jeu est libre, toute carte est permise, une fois les cartes de pénalité ramassées.</li>
        <li>Valet, dame et roi n’ont pas d’effet. Ils suivent l’enseigne ou la valeur.</li>
      </ol>
      <h2>Les effets</h2>
      <ol class="rules-list">
        <li>As : même enseigne ou même valeur. Il bloque autant de joueurs que d’as posés. À deux, la main revient à celui qui a posé l’as.</li>
        <li>2 : même enseigne ou même valeur. Le suivant reçoit 2 cartes tout de suite et passe. Plusieurs 2 s’additionnent.</li>
        <li>10 : même enseigne ou même valeur. Le suivant reçoit 4 cartes tout de suite et passe. Plusieurs 10 s’additionnent.</li>
        <li>Joker : le suivant reçoit 5 cartes et passe. On joue ensuite celui d’après, qui peut poser ce qu’il veut. À deux, la main revient à celui qui a posé le joker, et il peut jouer n’importe quelle carte.</li>
        <li>Un 2, un 10 ou un as ne sert pas à échapper à la valeur demandée par un 8.</li>
        <li>Les cartes de pénalité sont ramassées toutes seules. Personne ne les pose à la main.</li>
      </ol>
      <h2>Le tour, INTER et le score</h2>
      <ol class="rules-list">
        <li>Tu peux piocher même si tu as une carte jouable. Une seule pioche par tour : ensuite tu poses ou tu passes.</li>
        <li>Si la pioche est vide, la défausse est mélangée, sauf la carte visible.</li>
        <li>À une carte, annonce INTER. La manche s’arrête quand un joueur n’a plus de carte.</li>
        <li>On compte les cartes restantes. As : 1. Huit : 25. Valet, dame, roi : 10. Joker : 50. Les autres cartes valent leur chiffre. Le total le plus bas gagne.</li>
        <li>Le joker rouge sourit, le noir non. Les deux sont signés Del'hiver. Ils se jouent de la même façon.</li>
      </ol>`
    },
    play: {
      title: 'Guide d’INTER',
      kicker: 'Première partie',
      html: `<p class="sheet-copy">INTER est un jeu de cartes. Tu peux jouer contre des amis, ou seul contre Poséidon.</p>
      <h2>Choisir la table</h2>
      <ol class="rules-list">
        <li>Sur le hall, ouvre Cartes, puis INTER.</li>
        <li>Jouer contre Poséidon lance tout de suite une partie contre l’intelligence du jeu. Tu choisis ensuite le niveau quand l’écran le demande.</li>
        <li>Créer un salon prépare une table privée. Partage le lien ou le code.</li>
        <li>Rejoindre une salle demande ton pseudo et le code. Un lien d’invitation ne demande que le pseudo.</li>
      </ol>
      <h2>Un tour</h2>
      <ol class="rules-list">
        <li>Regarde la carte au centre. Pose une carte de la même enseigne, ou de la même valeur.</li>
        <li>Si tu as plusieurs cartes de cette valeur, un clic les pose ensemble. Le joker, lui, part seul.</li>
        <li>Si tu ne veux pas poser, ou si tu n’as rien, pioche une carte. Tu ne pioches qu’une fois, puis tu poses ou tu passes.</li>
        <li>Lis l’effet affiché. Un 2, un 10, un as ou un joker peut faire piocher le suivant et lui faire sauter le tour.</li>
        <li>Quand il te reste une carte, le jeu te demande d’annoncer INTER.</li>
      </ol>
      <h2>La fin</h2>
      <ol class="rules-list">
        <li>La manche s’arrête dès qu’un joueur n’a plus de carte.</li>
        <li>Les cartes encore en main donnent des points. Le plus petit total gagne.</li>
        <li>L’hôte peut lancer une autre manche avec les mêmes joueurs, ou clore.</li>
        <li>Quitter la table ne la laisse pas en bouton Reprendre. Une actualisation pendant la partie, elle, te ramène si la manche est encore en cours.</li>
      </ol>`
    }
  },
  quiz: {
    rules: {
      title: 'Règles de Quiz Battle',
      kicker: 'Questions',
      html: `<p class="sheet-copy">Quiz Battle pose les mêmes questions à tout le monde. Quatre réponses, une seule est juste. Chacun a son temps en entier. Ta réponse passe au vert ou au rouge, puis ta question suivante arrive.</p>
      <h2>La salle</h2>
      <ol class="rules-list">
        <li>Tu peux jouer seul. Ton score, ton record et ta réussite sont gardés. Ce n’est pas une victoire au classement.</li>
        <li>Un salon accueille jusqu’à vingt joueurs. L’hôte peut aussi lancer la partie seul, puis les autres ne rejoignent plus une fois que c’est parti.</li>
        <li>L’hôte choisit le nombre de questions, de 5 à 30, la catégorie, la difficulté et le temps : 5, 10, 15, 20 ou 30 secondes.</li>
        <li>Les questions viennent de la banque du serveur. Une même question ne revient pas dans la partie. Celles déjà vues sont écartées tant qu’il en reste d’autres.</li>
      </ol>
      <h2>La question</h2>
      <ol class="rules-list">
        <li>Tout le monde voit la même question et les mêmes quatre réponses, A, B, C et D.</li>
        <li>Tu ne changes plus une réponse envoyée.</li>
        <li>Le temps affiché suit le serveur. Une réponse encore dans le court délai après la fin peut compter. Après, elle est refusée.</li>
        <li>Dès que tu choisis, ta case passe au vert ou au rouge. Ta question suivante arrive, avec un temps neuf.</li>
        <li>À plusieurs, la réponse de quelqu’un ne fait pas passer ta question. Tes secondes restent à toi, jusqu’au bout du temps ou jusqu’à ton choix.</li>
        <li>Seul, tu peux quitter ou recommencer pendant la partie. À plusieurs, la partie continue jusqu’au bout.</li>
      </ol>
      <h2>Les points</h2>
      <ol class="rules-list">
        <li>Une bonne réponse immédiate vaut 100 points. Une bonne réponse au dernier instant vaut 60. Entre les deux, le score descend avec le temps.</li>
        <li>Une erreur vaut 0. Un silence vaut 0.</li>
        <li>Le détail des réussites et des erreurs n’apparaît qu’à la fin, et seulement pour tes propres réponses.</li>
        <li>À plusieurs, le classement s’affiche d’abord. Chacun peut ensuite ouvrir ses réponses.</li>
        <li>À la fin, l’hôte peut demander une revanche : mêmes joueurs, autres questions.</li>
        <li>Dans un salon de plusieurs joueurs, les premiers au score sont les vainqueurs. À égalité, ils partagent la victoire. Seul, l’écran montre ton résultat, sans victoire de classement.</li>
      </ol>`
    },
    play: {
      title: 'Guide de Quiz Battle',
      kicker: 'Première partie',
      html: `<p class="sheet-copy">Quiz Battle se lance en quelques touches. Voici le chemin si tu découvres le jeu.</p>
      <h2>Seul</h2>
      <ol class="rules-list">
        <li>Sur le hall, ouvre Questions, puis Quiz Battle.</li>
        <li>Touche Jouer seul. Écris ton pseudo.</li>
        <li>Choisis le nombre de questions, la difficulté, la catégorie et le temps. Tu peux laisser Toutes.</li>
        <li>Touche Commencer. La première question arrive tout de suite. Il n’y a pas d’attente d’un adversaire.</li>
      </ol>
      <h2>À plusieurs</h2>
      <ol class="rules-list">
        <li>Touche Créer un salon. Règle les mêmes choix, plus le nombre maximum de joueurs.</li>
        <li>Dans le salon, invite avec le lien. Tes amis écrivent leur pseudo et entrent.</li>
        <li>Quand tu es prêt, touche Commencer la partie. S’il n’y a que toi, le bouton dit Jouer seul.</li>
        <li>Pour entrer dans le salon de quelqu’un, touche Rejoindre une salle, ou ouvre son lien.</li>
      </ol>
      <h2>Répondre</h2>
      <ol class="rules-list">
        <li>Lis la question. Touche une des quatre réponses. Plus tu es rapide et juste, plus tu marques.</li>
        <li>La case choisie passe au vert ou au rouge, et ta question suivante arrive. À plusieurs, les autres gardent la leur et tout leur temps.</li>
        <li>À la fin, le classement s’affiche. Mes réponses montre où tu as réussi et où tu t’es trompé.</li>
        <li>Seul, Recommencer relance d’autres questions. Quitter sort sans laisser un bouton Reprendre.</li>
      </ol>`
    }
  }
};

export function guideCatalogScreen() {
  const cards = GAMES.map(game => `<article class="guide-card"><div class="game-cover"><img src="${game.cover}" alt=""></div><h2>${game.title}</h2><p>${game.line}</p><div class="guide-actions"><button class="btn btn-primary" data-action="guide-open" data-game="${game.id}" data-kind="rules">${icon('rules', 16)}Règles</button><button class="btn btn-secondary" data-action="guide-open" data-game="${game.id}" data-kind="play">${icon('spark', 16)}Guide</button></div></article>`).join('');
  const content = `<div class="page-head"><button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button><div><div class="eyebrow">Catalogue</div><h1>Règles et guides</h1><p>Les règles disent ce qui compte. Le guide explique comment jouer la première fois.</p></div></div><div class="guide-grid">${cards}</div>`;
  return shell(content, { active: 'rules', wide: true });
}

export function guideArticleScreen(gameId, kind) {
  const game = ARTICLES[gameId] || ARTICLES.petitbac;
  const article = game[kind] || game.rules;
  const content = `<div class="page-head"><button class="back-btn" data-action="back" aria-label="Retour">${icon('back')}</button><div><div class="eyebrow">${article.kicker}</div><h1>${article.title}</h1></div></div><article class="guide-prose">${article.html}</article>`;
  return shell(content, { active: 'rules', wide: true });
}

export function petitbacRulesHtml() { return ARTICLES.petitbac.rules.html; }
export function interRulesHtml() { return ARTICLES.inter.rules.html; }
export function quizRulesHtml() { return ARTICLES.quiz.rules.html; }
