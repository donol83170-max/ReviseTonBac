require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

// ─── Base de données SQLite ────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'purchases.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_hash TEXT NOT NULL,
    produit_ids TEXT NOT NULL,
    payment_intent_id TEXT UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_hash TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS otp_rate_limit (
    email_hash TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    window_start INTEGER NOT NULL
  );
`);

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function checkRateLimit(emailHash) {
  const now = Date.now();
  const WINDOW = 60 * 60 * 1000; // 1 heure
  const MAX = 3;

  const row = db.prepare('SELECT * FROM otp_rate_limit WHERE email_hash = ?').get(emailHash);

  if (!row) {
    db.prepare('INSERT INTO otp_rate_limit (email_hash, attempts, window_start) VALUES (?, 1, ?)').run(emailHash, now);
    return true;
  }

  if (now - row.window_start > WINDOW) {
    db.prepare('UPDATE otp_rate_limit SET attempts = 1, window_start = ? WHERE email_hash = ?').run(now, emailHash);
    return true;
  }

  if (row.attempts >= MAX) return false;

  db.prepare('UPDATE otp_rate_limit SET attempts = attempts + 1 WHERE email_hash = ?').run(emailHash);
  return true;
}

// ─── Nodemailer ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTPEmail(email, otp) {
  await transporter.sendMail({
    from: `"ReviseTonBac" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Ton code de restauration ReviseTonBac',
    text: `Ton code de restauration : ${otp}\n\nCe code est valable 15 minutes. Ne le communique à personne.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:2rem;background:#1a1a1a;color:#f5f2eb;border-radius:16px;">
        <h2 style="color:#d94f3d;margin-bottom:1rem;">ReviseTonBac</h2>
        <p>Voici ton code pour restaurer ton accès :</p>
        <div style="font-size:2.5rem;font-weight:bold;letter-spacing:.4rem;text-align:center;padding:1.5rem;background:#2a2a2a;border-radius:12px;margin:1.5rem 0;">
          ${otp}
        </div>
        <p style="color:rgba(255,255,255,.5);font-size:.85rem;">Ce code est valable <strong>15 minutes</strong>. Ne le communique à personne.</p>
      </div>
    `,
  });
}

// ─── Persistance achats ───────────────────────────────────────────────────────
function savePurchase(paymentIntentId, produitId, emailHash) {
  const existing = db.prepare('SELECT * FROM purchases WHERE payment_intent_id = ?').get(paymentIntentId);
  if (existing) return;

  db.prepare('INSERT INTO purchases (email_hash, produit_ids, payment_intent_id, created_at) VALUES (?, ?, ?, ?)')
    .run(emailHash, JSON.stringify([produitId]), paymentIntentId, Date.now());
}

function getPurchasesByEmailHash(emailHash) {
  const rows = db.prepare('SELECT produit_ids FROM purchases WHERE email_hash = ?').all(emailHash);
  const all = [];
  for (const row of rows) {
    for (const id of JSON.parse(row.produit_ids)) {
      if (!all.includes(id)) all.push(id);
    }
  }
  return all;
}

// ─── App Express ──────────────────────────────────────────────────────────────
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
  'ma-geo':          { nom: "Géométrie dans l'espace",     prix: 499,  matiere: 'maths' },
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
  const { produitId, email } = req.body;
  const produit = PRODUITS[produitId];

  if (!produit) {
    return res.status(400).json({ error: `Produit introuvable : ${produitId}` });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: produit.prix,
      currency: 'eur',
      receipt_email: email,
      metadata: {
        produitId,
        produitNom: produit.nom,
        matiere: produit.matiere,
        emailHash: hashEmail(email),
      },
      description: `ReviseTonBac — ${produit.nom}`,
    });

    res.json({ clientSecret: paymentIntent.client_secret, produit });
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
      const { produitId, produitNom, emailHash } = paymentIntent.metadata;
      console.log(`✅ Paiement confirmé — ${produitNom} — ${paymentIntent.amount / 100}€`);

      if (emailHash) savePurchase(paymentIntent.id, produitId, emailHash);

      res.json({
        success: true,
        produitId,
        message: `Accès débloqué : ${produitNom}`,
      });
    } else {
      res.status(400).json({ success: false, message: 'Paiement non confirmé.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Demander un OTP de restauration ─────────────────────────────────────────
app.post('/request-restore', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  const emailHash = hashEmail(email);

  // Vérifier que cet email a bien des achats
  const achats = getPurchasesByEmailHash(emailHash);
  if (achats.length === 0) {
    // Réponse intentionnellement vague pour ne pas divulguer si l'email existe
    return res.json({ success: true });
  }

  // Rate limiting
  if (!checkRateLimit(emailHash)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 1 heure.' });
  }

  // Invalider les anciens OTP
  db.prepare('UPDATE otp_codes SET used = 1 WHERE email_hash = ? AND used = 0').run(emailHash);

  // Générer et stocker le nouvel OTP
  const otp = generateOTP();
  const expires_at = Date.now() + 15 * 60 * 1000; // 15 min
  db.prepare('INSERT INTO otp_codes (email_hash, otp, expires_at) VALUES (?, ?, ?)').run(emailHash, otp, expires_at);

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: "Erreur d'envoi d'e-mail. Contacte le support." });
  }

  res.json({ success: true });
});

// ─── Vérifier l'OTP et restaurer l'accès ─────────────────────────────────────
app.post('/verify-restore', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'E-mail et code requis.' });
  }

  const emailHash = hashEmail(email);
  const now = Date.now();

  const row = db.prepare(
    'SELECT * FROM otp_codes WHERE email_hash = ? AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1'
  ).get(emailHash, now);

  if (!row || row.otp !== otp.trim()) {
    return res.status(401).json({ error: 'Code invalide ou expiré.' });
  }

  // Invalider l'OTP
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id);

  const produitIds = getPurchasesByEmailHash(emailHash);
  res.json({ success: true, produitIds });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ReviseTonBac démarré sur http://localhost:${PORT}`);
});
