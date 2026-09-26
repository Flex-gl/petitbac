# Petit Bac Arena

Petit Bac Arena est une SPA mobile-first en JavaScript natif, servie par Vercel. Les salons et les scores sont partagés entre appareils grâce à Upstash Redis ; aucune simulation locale ne remplace les appels au serveur.

## Lancer en local

1. Installer Vercel CLI : `npm install --global vercel`
2. Lier le workspace à ton projet Vercel : `vercel link`
3. Ajouter `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` dans les variables d'environnement du projet.
4. Lancer `npm run dev`.

Les secrets sont disponibles dans la console Upstash, sous **REST API**. Sans ces deux variables, l'API répond explicitement avec une erreur de configuration ; le jeu ne passe pas en mode fictif.

## Déploiement

```sh
vercel link
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel --prod
```

Pour jouer en réseau, ouvre le site sur deux appareils ou deux fenêtres privées, crée une salle et rejoins-la avec son code.

## API

- `POST /api/game` : créer, rejoindre, démarrer, envoyer une grille, voter, discuter ou rejouer.
- `GET /api/game?code=ABC123&playerId=...` : lire l'état partagé et déclencher les transitions arrivées à échéance.
- `GET /api/scores` : lire le top 10 et les statistiques d'un joueur.

Les scores sont comptabilisés une seule fois par partie dans Redis. Les parties expirent après 24 heures. Le lexique français intégré couvre les réponses usuelles ; les contestations donnent aux joueurs le dernier mot sur les entrées rares.
