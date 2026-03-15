const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5500' }));
app.use(express.json());
app.use(express.static('../'));

// ===== CATALOGUE DES PRIX (à remplir avec tes Price IDs Stripe) =====
const PRICES = {
  // Thèmes Français — 1,99€ chacun
  theme_theatre:       process.env.PRICE_THEME_THEATRE,
  theme_poesie:        process.env.PRICE_THEME_POESIE,
  theme_argumentation: process.env.PRICE_THEME_ARGUMENTATION,
  theme_commentaire:   process.env.PRICE_THEME_COMMENTAIRE,
  theme_dissertation:  process.env.PRICE_THEME_DISSERTATION,

  // Thèmes Maths — 1,99€ chacun
  theme_derivees:      process.env.PRICE_THEME_DERIVEES,
  theme_integrales:    process.env.PRICE_THEME_INTEGRALES,
  theme_probas:        process.env.PRICE_THEME_PROBAS,
  theme_log_exp:       process.env.PRICE_THEME_LOG_EXP,
  theme_geometrie:     process.env.PRICE_THEME_GEOMETRIE,
  theme_complexes:     process.env.PRICE_THEME_COMPLEXES,

  // Packs — paiement unique
  pack_francais:       process.env.PRICE_PACK_FRANCAIS,   // 5,99€
  pack_maths:          process.env.PRICE_PACK_MATHS,       // 5,99€
  pack_complet:        process.env.PRICE_PACK_COMPLET,     // 14,99€
};

// ===== CRÉER UNE SESSION DE PAIEMENT =====
app.post('/api/create-checkout-session', async (req, res) => {
  const { plan } = req.body;
  const priceId = PRICES[plan];

  if (!priceId) {
    return res.status(400).json({ error: `Plan inconnu : ${plan}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',                        // paiement unique
      line_items: [{ price: priceId, quantity: 1 }],
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

// ===== WEBHOOK — confirmation de paiement =====
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`✅ Paiement reçu — ${session.id} — ${session.amount_total / 100}€`);
    // TODO: enregistrer l'achat en base de données et débloquer l'accès
  }

  res.json({ received: true });
});

// ===== VÉRIFIER UN PAIEMENT =====
app.get('/api/payment-status', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id requis' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({
      status: session.payment_status,      // 'paid' si réussi
      customer: session.customer_details,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur ReviseTonBac lancé sur http://localhost:${PORT}`);
});
