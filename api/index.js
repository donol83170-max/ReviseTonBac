require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ─── Base de données PostgreSQL (Neon) ────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Initialisation du schéma (idempotent)
pool.query(`
  CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    email_hash TEXT NOT NULL,
    produit_ids TEXT NOT NULL,
    payment_intent_id TEXT UNIQUE,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    email_hash TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    used INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS otp_rate_limit (
    email_hash TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    window_start BIGINT NOT NULL
  );
`).catch(console.error);

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

async function checkRateLimit(emailHash) {
  const now = Date.now();
  const WINDOW = 60 * 60 * 1000; // 1 heure
  const MAX = 3;

  const { rows } = await pool.query('SELECT * FROM otp_rate_limit WHERE email_hash = $1', [emailHash]);
  const row = rows[0];

  if (!row) {
    await pool.query('INSERT INTO otp_rate_limit (email_hash, attempts, window_start) VALUES ($1, 1, $2)', [emailHash, now]);
    return true;
  }

  if (now - Number(row.window_start) > WINDOW) {
    await pool.query('UPDATE otp_rate_limit SET attempts = 1, window_start = $1 WHERE email_hash = $2', [now, emailHash]);
    return true;
  }

  if (row.attempts >= MAX) return false;

  await pool.query('UPDATE otp_rate_limit SET attempts = attempts + 1 WHERE email_hash = $1', [emailHash]);
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
async function savePurchase(paymentIntentId, produitId, emailHash) {
  const { rows } = await pool.query('SELECT id FROM purchases WHERE payment_intent_id = $1', [paymentIntentId]);
  if (rows.length > 0) return;

  await pool.query(
    'INSERT INTO purchases (email_hash, produit_ids, payment_intent_id, created_at) VALUES ($1, $2, $3, $4)',
    [emailHash, JSON.stringify([produitId]), paymentIntentId, Date.now()]
  );
}

async function getPurchasesByEmailHash(emailHash) {
  const { rows } = await pool.query('SELECT produit_ids FROM purchases WHERE email_hash = $1', [emailHash]);
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      "frame-src": ["'self'", "https://js.stripe.com"],
      "connect-src": ["'self'", "https://api.stripe.com", process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
  },
}));

// ⚠️ WEBHOOK — doit être déclaré AVANT express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET manquant');
    return res.status(500).end();
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { produitId, produitNom, emailHash } = pi.metadata;

    if (produitId && emailHash) {
      await savePurchase(pi.id, produitId, emailHash);
      console.log(`✅ Webhook — accès débloqué : ${produitNom} (${pi.amount / 100}€)`);
    } else {
      console.warn('⚠️ Webhook reçu sans produitId ou emailHash dans metadata');
    }
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '100kb' }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));

// ─── Catalogue des produits ───────────────────────────────────────────────────
const PRODUITS = {
  'fr-poesie':       { nom: 'La poésie',              prix: 499,  matiere: 'francais' },
  'fr-theatre':      { nom: 'Le théâtre',              prix: 499,  matiere: 'francais' },
  'fr-idees':        { nom: "La littérature d'idées",  prix: 499,  matiere: 'francais' },
  'fr-commentaire':  { nom: 'Méthode commentaire',     prix: 499,  matiere: 'francais' },
  'fr-dissertation': { nom: 'Méthode dissertation',    prix: 499,  matiere: 'francais' },
  'ma-derivation':   { nom: 'Dérivation & fonctions',     prix: 499,  matiere: 'maths' },
  'ma-integration':  { nom: 'Intégration',                prix: 499,  matiere: 'maths' },
  'ma-probas':       { nom: 'Probabilités & stats',        prix: 499,  matiere: 'maths' },
  'ma-geo':          { nom: "Géométrie dans l'espace",     prix: 499,  matiere: 'maths' },
  'ma-log':          { nom: 'Logarithme & exponentielle',  prix: 499,  matiere: 'maths' },
  'hg-guerre-froide':  { nom: 'La guerre froide',       prix: 499, matiere: 'histoire-geo' },
  'hg-decolonisation': { nom: 'La décolonisation',      prix: 499, matiere: 'histoire-geo' },
  'hg-monde-1991':     { nom: 'Le monde depuis 1991',   prix: 499, matiere: 'histoire-geo' },
  'hg-france-1945':    { nom: 'La France depuis 1945',  prix: 499, matiere: 'histoire-geo' },
  'hg-mondialisation': { nom: 'La mondialisation',      prix: 499, matiere: 'histoire-geo' },
  'pack-francais':      { nom: 'Pack Français complet',      prix: 1499, matiere: 'francais'     },
  'pack-maths':         { nom: 'Pack Maths complet',          prix: 1799, matiere: 'maths'        },
  'pack-histoire-geo':  { nom: 'Pack Histoire-Géo complet',   prix: 1499, matiere: 'histoire-geo' },
  'pack-total':         { nom: 'Pack Total ReviseTonBac',      prix: 3499, matiere: 'all'          },
};

const THEME_FILES = {
  'fr-roman': 'francais/roman.html',
  'fr-poesie': 'francais/poesie.html',
  'fr-theatre': 'francais/theatre.html',
  'fr-idees': 'francais/idees.html',
  'fr-commentaire': 'francais/commentaire.html',
  'fr-dissertation': 'francais/dissertation.html',
  'ma-derivation': 'maths/derivation.html',
  'ma-integration': 'maths/integration.html',
  'ma-probas': 'maths/probas.html',
  'ma-geo': 'maths/geo.html',
  'ma-log': 'maths/log.html',
  'ma-suites': 'maths/suites.html',
  'hg-guerre-froide': 'histoire-geo/guerre-froide.html',
  'hg-decolonisation': 'histoire-geo/decolonisation.html',
  'hg-monde-1991': 'histoire-geo/monde-1991.html',
  'hg-france-1945': 'histoire-geo/france-1945.html',
  'hg-mondialisation': 'histoire-geo/mondialisation.html',
  'hg-sgm': 'histoire-geo/sgm.html',
};

const COURSES_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/courses.private.json'), 'utf8'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/config', (req, res) => {
  res.json({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

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

app.post('/request-restore', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  }

  const emailHash = hashEmail(email);

  const achats = await getPurchasesByEmailHash(emailHash);
  if (achats.length === 0) {
    return res.json({ success: true });
  }

  if (!await checkRateLimit(emailHash)) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessaie dans 1 heure.' });
  }

  await pool.query('UPDATE otp_codes SET used = 1 WHERE email_hash = $1 AND used = 0', [emailHash]);

  const otp = generateOTP();
  const expires_at = Date.now() + 15 * 60 * 1000;
  await pool.query('INSERT INTO otp_codes (email_hash, otp, expires_at) VALUES ($1, $2, $3)', [emailHash, otp, expires_at]);

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: "Erreur d'envoi d'e-mail. Contacte le support." });
  }

  res.json({ success: true });
});

app.post('/verify-restore', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'E-mail et code requis.' });
  }

  const emailHash = hashEmail(email);
  const now = Date.now();

  const { rows } = await pool.query(
    'SELECT * FROM otp_codes WHERE email_hash = $1 AND used = 0 AND expires_at > $2 ORDER BY id DESC LIMIT 1',
    [emailHash, now]
  );
  const row = rows[0];

  if (!row || row.otp !== otp.trim()) {
    return res.status(401).json({ error: 'Code invalide ou expiré.' });
  }

  await pool.query('UPDATE otp_codes SET used = 1 WHERE id = $1', [row.id]);

  const produitIds = await getPurchasesByEmailHash(emailHash);
  res.json({ success: true, produitIds });
});

app.post('/api/course/:produitId', async (req, res) => {
  const { produitId } = req.params;
  const email = req.body.email;
  const isAdmin = req.headers['x-admin-rtb'] === '1';

  const FREE_TOPICS = ['ma-suites', 'fr-roman', 'hg-sgm'];
  const isFree = FREE_TOPICS.includes(produitId);

  const filePath = THEME_FILES[produitId];
  if (!filePath) return res.status(404).json({ error: 'Cours non trouvé' });

  const protectedDir = path.resolve(__dirname, '../backend/protected_themes');
  const fullPath = path.resolve(protectedDir, filePath);

  if (!fullPath.startsWith(protectedDir)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  if (isAdmin || isFree) {
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Fichier physique introuvable' });
    return res.send(fs.readFileSync(fullPath, 'utf8'));
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(401).json({ error: 'Identification requise.' });
  }

  const emailHash = hashEmail(email);
  const achats = await getPurchasesByEmailHash(emailHash);

  const accessible =
    achats.includes(produitId) ||
    (produitId.startsWith('fr-') && achats.includes('pack-francais')) ||
    (produitId.startsWith('ma-') && achats.includes('pack-maths')) ||
    (produitId.startsWith('hg-') && achats.includes('pack-histoire-geo')) ||
    achats.includes('pack-total');

  if (!accessible) {
    return res.status(403).json({ error: 'Accès non autorisé. Veuillez acheter ce thème.' });
  }

  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Fichier physique introuvable' });

  res.send(fs.readFileSync(fullPath, 'utf8'));
});

module.exports = app;
