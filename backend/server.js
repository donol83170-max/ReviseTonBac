require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// ─── Base de données SQLite ────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'purchases.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    token TEXT PRIMARY KEY,
    produit_ids TEXT NOT NULL,
    payment_intent_id TEXT UNIQUE,
    created_at INTEGER NOT NULL
  )
`);

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function savePurchase(paymentIntentId, produitId) {
  const existing = db.prepare('SELECT * FROM purchases WHERE payment_intent_id = ?').get(paymentIntentId);
  if (existing) return existing.token;

  const token = generateToken();
  db.prepare('INSERT INTO purchases (token, produit_ids, payment_intent_id, created_at) VALUES (?, ?, ?, ?)')
    .run(token, JSON.stringify([produitId]), paymentIntentId, Date.now());
  return token;
}

function getPurchasesByToken(token) {
  const row = db.prepare('SELECT produit_ids FROM purchases WHERE token = ?').get(token);
  if (!row) return null;
  return JSON.parse(row.produit_ids);
}

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.static('../'));

// ─── Catalogue des produits ───────────────────────────────────────────────────
const PRODUITS = {
  // Thèmes Français — 4,99€ = 499 centimes
  'fr-poesie':       { nom: 'La poésie',              prix: 499,  matiere: 'francais' },
  'fr-theatre':      { nom: 'Le théâtre',              prix: 499,  matiere: 'francais' },
  'fr-idees':        { nom: "La littérature d'idées",  prix: 499,  matiere: 'francais' },
  'fr-commentaire':  { nom: 'Méthode commentaire',     prix: 499,  matiere: 'francais' },
  'fr-dissertation': { nom: 'Méthode dissertation',    prix: 499,  matiere: 'francais' },

  // Thèmes Maths — 4,99€ = 499 centimes
  'ma-derivation':   { nom: 'Dérivation & fonctions',     prix: 499,  matiere: 'maths' },
  'ma-integration':  { nom: 'Intégration',                prix: 499,  matiere: 'maths' },
  'ma-probas':       { nom: 'Probabilités & stats',        prix: 499,  matiere: 'maths' },
  'ma-geo':          { nom: 'Géométrie dans l\'espace',    prix: 499,  matiere: 'maths' },
  'ma-log':          { nom: 'Logarithme & exponentielle',  prix: 499,  matiere: 'maths' },

  // Thèmes Histoire-Géo — 4,99€ = 499 centimes
  'hg-guerre-froide':  { nom: 'La guerre froide',       prix: 499, matiere: 'histoire-geo' },
  'hg-decolonisation': { nom: 'La décolonisation',      prix: 499, matiere: 'histoire-geo' },
  'hg-monde-1991':     { nom: 'Le monde depuis 1991',   prix: 499, matiere: 'histoire-geo' },
  'hg-france-1945':    { nom: 'La France depuis 1945',  prix: 499, matiere: 'histoire-geo' },
  'hg-mondialisation': { nom: 'La mondialisation',      prix: 499, matiere: 'histoire-geo' },

  // Packs
  'pack-francais':      { nom: 'Pack Français complet',      prix: 1499, matiere: 'francais'     },
  'pack-maths':         { nom: 'Pack Maths complet',          prix: 1799, matiere: 'maths'        },
  'pack-histoire-geo':  { nom: 'Pack Histoire-Géo complet',   prix: 1499, matiere: 'histoire-geo' },
  'pack-total':         { nom: 'Pack Total ReviseTonBac',      prix: 3499, matiere: 'all'          },
};

// ─── Clé publique Stripe pour le frontend ─────────────────────────────────────
app.get('/config', (req, res) => {
  res.json({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

// ─── Créer un PaymentIntent ───────────────────────────────────────────────────
app.post('/create-payment-intent', async (req, res) => {
  const { produitId } = req.body;
  const produit = PRODUITS[produitId];

  if (!produit) {
    return res.status(400).json({ error: `Produit introuvable : ${produitId}` });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: produit.prix,
      currency: 'eur',
      metadata: {
        produitId,
        produitNom: produit.nom,
        matiere: produit.matiere,
      },
      description: `ReviseTonBac — ${produit.nom}`,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      produit,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Confirmer le paiement ────────────────────────────────────────────────────
app.post('/confirm-payment', async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const produitId = paymentIntent.metadata.produitId;
      console.log(`✅ Paiement confirmé — ${paymentIntent.metadata.produitNom} — ${paymentIntent.amount / 100}€`);
      const token = savePurchase(paymentIntent.id, produitId);

      res.json({
        success: true,
        produitId,
        token,
        message: `Accès débloqué : ${paymentIntent.metadata.produitNom}`,
      });
    } else {
      res.status(400).json({ success: false, message: 'Paiement non confirmé.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Restaurer l'accès via token ──────────────────────────────────────────────
app.post('/restore-access', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  const produitIds = getPurchasesByToken(token.trim());
  if (!produitIds) return res.status(404).json({ error: 'Token invalide ou introuvable.' });

  res.json({ success: true, produitIds });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ReviseTonBac démarré sur http://localhost:${PORT}`);
});
