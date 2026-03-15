const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5500' }));
app.use(express.json());

// Servir les fichiers statiques du frontend (optionnel)
app.use(express.static('../'));

// ===== PRIX STRIPE =====
// Remplace ces IDs par ceux de ton dashboard Stripe
const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_MONTHLY_ID_HERE',
  annual:  process.env.STRIPE_PRICE_ANNUAL  || 'price_ANNUAL_ID_HERE',
};

// ===== CRÉER UNE SESSION DE PAIEMENT =====
app.post('/api/create-checkout-session', async (req, res) => {
  const { plan } = req.body;

  if (!PRICES[plan]) {
    return res.status(400).json({ error: 'Plan invalide' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5500'}/pages/succes.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL || 'http://localhost:5500'}/#tarifs`,
      locale: 'fr',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
  }
});

// ===== WEBHOOK STRIPE (événements post-paiement) =====
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log(`✅ Paiement réussi — Session: ${session.id}`);
      // TODO: activer l'accès premium pour l'utilisateur (BDD)
      break;

    case 'customer.subscription.deleted':
      console.log(`❌ Abonnement annulé — ${event.data.object.id}`);
      // TODO: désactiver l'accès premium
      break;

    default:
      console.log(`Événement reçu: ${event.type}`);
  }

  res.json({ received: true });
});

// ===== VÉRIFIER LE STATUT D'ABONNEMENT =====
app.get('/api/subscription-status', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id requis' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    });
    res.json({
      status: session.payment_status,
      subscription: session.subscription?.status,
      customer: session.customer,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur ReviseTonBac lancé sur http://localhost:${PORT}`);
});
