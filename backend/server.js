require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

  // Packs
  'pack-francais':   { nom: 'Pack Français complet',  prix: 1499, matiere: 'francais' },
  'pack-maths':      { nom: 'Pack Maths complet',      prix: 1799, matiere: 'maths'    },
  'pack-total':      { nom: 'Pack Total ReviseTonBac', prix: 3499, matiere: 'all'      },
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
      // TODO: enregistrer en base de données pour un accès permanent

      res.json({
        success: true,
        produitId,
        message: `Accès débloqué : ${paymentIntent.metadata.produitNom}`,
      });
    } else {
      res.status(400).json({ success: false, message: 'Paiement non confirmé.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ReviseTonBac démarré sur http://localhost:${PORT}`);
});
