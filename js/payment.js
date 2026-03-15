// payment.js — Stripe Elements (front-end)

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : '';  // même domaine en production

let stripe = null;
let elements = null;
let currentProduitId = null;

// ─── Initialisation de Stripe ─────────────────────────────────────────────────
async function initStripe() {
  try {
    const res = await fetch(`${BACKEND_URL}/config`);
    const { publicKey } = await res.json();
    stripe = Stripe(publicKey);
  } catch (err) {
    console.error('Stripe init error:', err);
  }
}

// ─── Ouvrir la modale de paiement ─────────────────────────────────────────────
async function ouvrirPaiement(produitId) {
  currentProduitId = produitId;

  document.getElementById('payment-modal').classList.remove('hidden');
  document.getElementById('payment-form-container').innerHTML =
    '<div class="payment-loading">Chargement du paiement…</div>';

  try {
    const res = await fetch(`${BACKEND_URL}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produitId }),
    });
    const { clientSecret, produit } = await res.json();

    document.getElementById('payment-product-name').textContent = produit.nom;
    document.getElementById('payment-product-price').textContent =
      (produit.prix / 100).toFixed(2).replace('.', ',') + ' €';

    elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
    const paymentElement = elements.create('payment');

    document.getElementById('payment-form-container').innerHTML = `
      <div id="stripe-element"></div>
      <div id="payment-error" class="payment-error hidden"></div>
      <button id="pay-btn" class="btn-primary pay-btn" onclick="confirmerPaiement()">
        Payer ${(produit.prix / 100).toFixed(2).replace('.', ',')} €
      </button>
    `;

    paymentElement.mount('#stripe-element');
  } catch (err) {
    document.getElementById('payment-form-container').innerHTML =
      `<p class="payment-error">Erreur : ${err.message}</p>`;
  }
}

// ─── Confirmer le paiement ────────────────────────────────────────────────────
async function confirmerPaiement() {
  const btn = document.getElementById('pay-btn');
  btn.disabled = true;
  btn.textContent = 'Traitement…';

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    redirect: 'if_required',
  });

  if (error) {
    const errEl = document.getElementById('payment-error');
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Réessayer';
    return;
  }

  if (paymentIntent.status === 'succeeded') {
    const res = await fetch(`${BACKEND_URL}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
    });
    const data = await res.json();
    if (data.success) afficherSucces(data.produitId);
  }
}

// ─── Afficher le succès et sauvegarder en localStorage ────────────────────────
function afficherSucces(produitId) {
  const achats = JSON.parse(localStorage.getItem('rsb_achats') || '[]');
  if (!achats.includes(produitId)) achats.push(produitId);
  localStorage.setItem('rsb_achats', JSON.stringify(achats));

  document.getElementById('payment-form-container').innerHTML = `
    <div class="payment-success">
      <div class="success-icon">✅</div>
      <h3>Paiement réussi !</h3>
      <p>Ton thème est maintenant débloqué.</p>
      <button class="btn-primary" onclick="fermerModal(); location.reload();">
        Accéder au contenu →
      </button>
    </div>
  `;
}

// ─── Fermer la modale ─────────────────────────────────────────────────────────
function fermerModal() {
  document.getElementById('payment-modal').classList.add('hidden');
  currentProduitId = null;
}

// ─── Vérifier si un thème est débloqué ───────────────────────────────────────
function estDebloque(produitId) {
  const achats = JSON.parse(localStorage.getItem('rsb_achats') || '[]');
  if (achats.includes(produitId)) return true;
  if (produitId.startsWith('fr-') && achats.includes('pack-francais')) return true;
  if (produitId.startsWith('ma-') && achats.includes('pack-maths')) return true;
  if (achats.includes('pack-total')) return true;
  return false;
}

// ─── Apparence Stripe Elements ────────────────────────────────────────────────
function stripeAppearance() {
  return {
    theme: 'night',
    variables: {
      colorPrimary: '#d94f3d',
      colorBackground: '#1a1a1a',
      colorText: '#f5f2eb',
      colorDanger: '#ef4444',
      fontFamily: 'DM Sans, sans-serif',
      borderRadius: '10px',
    },
  };
}

// ─── Init au chargement ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initStripe);
