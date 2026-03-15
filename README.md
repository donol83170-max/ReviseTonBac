# 📚 ReviseTonBac

Plateforme de révisions pour le Baccalauréat — fiches de cours, QCM interactifs et contenu premium via Stripe.

## Structure

```
ReviseTonBac/
├── index.html              # Page d'accueil
├── css/
│   ├── style.css           # Styles globaux
│   └── themes.css          # Styles des fiches de cours
├── js/
│   ├── main.js             # Animations & interactions
│   └── qcm.js              # Moteur de QCM interactif
├── pages/
│   ├── francais.html       # Page Français
│   └── maths.html          # Page Maths
├── themes/
│   ├── francais/
│   │   └── roman.html      # ✦ GRATUIT — Le roman et le récit
│   └── maths/
│       └── suites.html     # ✦ GRATUIT — Suites numériques
└── backend/
    ├── server.js           # Serveur Express + Stripe
    ├── package.json
    └── .env.example
```

## Lancer le projet en local

```bash
git clone https://github.com/donol83170-max/ReviseTonBac.git
cd ReviseTonBac
```

Ouvre `index.html` dans le navigateur (ou utilise Live Server dans VS Code).

## Lancer le backend Stripe

```bash
cd backend
cp .env.example .env
# Remplis .env avec tes clés Stripe
npm install
npm run dev
```

## Configuration Stripe

1. Crée un compte sur [stripe.com](https://stripe.com)
2. Dans le dashboard, crée deux produits (mensuel 4,99€ et annuel 29,99€)
3. Copie les Price IDs dans ton fichier `.env`
4. Pour les webhooks en local : `stripe listen --forward-to localhost:3000/api/webhook`
