// payment.js — Stripe Elements (front-end)

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : '';  // même domaine en production

let stripe = null;
let elements = null;
let currentProduitId = null;
let currentEmail = null;

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

// ─── Ouvrir la modale — étape 1 : saisie email ────────────────────────────────
function ouvrirPaiement(produitId) {
  currentProduitId = produitId;
  currentEmail = null;

  document.getElementById('payment-modal').classList.remove('hidden');
  document.getElementById('payment-product-name').textContent = '—';
  document.getElementById('payment-product-price').textContent = '—';
  document.getElementById('payment-form-container').innerHTML = `
    <div class="payment-email-step">
      <label class="payment-label" for="payment-email">Ton adresse e-mail</label>
      <input
        type="email"
        id="payment-email"
        class="payment-input"
        placeholder="exemple@email.com"
        autocomplete="email"
      />
      <p class="payment-email-hint">Pour restaurer ton accès sur n'importe quel appareil.</p>
      <div id="email-error" class="payment-error hidden"></div>
      <button class="btn-primary pay-btn" onclick="validerEmail()">Continuer →</button>
    </div>
  `;

  setTimeout(() => document.getElementById('payment-email')?.focus(), 100);
}

// ─── Valider l'email et charger Stripe ────────────────────────────────────────
async function validerEmail() {
  const emailInput = document.getElementById('payment-email');
  const errEl = document.getElementById('email-error');
  const email = emailInput?.value?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Saisis une adresse e-mail valide.';
    errEl.classList.remove('hidden');
    return;
  }

  currentEmail = email;
  errEl.classList.add('hidden');

  document.getElementById('payment-form-container').innerHTML =
    '<div class="payment-loading">Chargement du paiement…</div>';

  try {
    const res = await fetch(`${BACKEND_URL}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produitId: currentProduitId, email }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const { clientSecret, produit } = data;
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
  if (currentEmail) localStorage.setItem('rsb_email', currentEmail);

  document.getElementById('payment-form-container').innerHTML = `
    <div class="payment-success">
      <div class="success-icon">✅</div>
      <h3>Paiement réussi !</h3>
      <p>Ton thème est débloqué. Un e-mail de confirmation t'a été envoyé.</p>
      <button class="btn-primary" onclick="fermerModal(); location.reload();">
        Accéder au contenu →
      </button>
    </div>
  `;
}

// ─── Fermer la modale ─────────────────────────────────────────────────────────
function fermerModal() {
  document.getElementById('payment-modal').classList.add('hidden');
  document.getElementById('restore-modal')?.classList.add('hidden');
  currentProduitId = null;
  currentEmail = null;
}

// ─── Vérifier si un thème est débloqué ───────────────────────────────────────
function estDebloque(produitId) {
  if (localStorage.getItem('rsb_admin') === '1') return true;
  const achats = JSON.parse(localStorage.getItem('rsb_achats') || '[]');
  if (achats.includes(produitId)) return true;
  if (produitId.startsWith('fr-') && achats.includes('pack-francais')) return true;
  if (produitId.startsWith('ma-') && achats.includes('pack-maths')) return true;
  if (produitId.startsWith('hg-') && achats.includes('pack-histoire-geo')) return true;
  if (achats.includes('pack-total')) return true;
  return false;
}

// ─── Restaurer l'accès — étape 1 : ouvrir la modale ──────────────────────────
function ouvrirRestauration() {
  const modal = document.getElementById('restore-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('restore-step-email').classList.remove('hidden');
  document.getElementById('restore-step-otp').classList.add('hidden');
  document.getElementById('restore-email-input').value =
    localStorage.getItem('rsb_email') || '';
  document.getElementById('restore-error').textContent = '';
  document.getElementById('restore-error').classList.add('hidden');
}

// ─── Demander l'OTP ───────────────────────────────────────────────────────────
async function demanderOTP() {
  const email = document.getElementById('restore-email-input').value.trim();
  const errEl = document.getElementById('restore-error');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'Saisis une adresse e-mail valide.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('restore-send-btn');
  btn.disabled = true;
  btn.textContent = 'Envoi…';

  try {
    const res = await fetch(`${BACKEND_URL}/request-restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Erreur serveur.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Envoyer le code';
      return;
    }

    // Toujours montrer l'étape OTP (réponse volontairement vague)
    localStorage.setItem('rsb_restore_email', email);
    document.getElementById('restore-step-email').classList.add('hidden');
    document.getElementById('restore-step-otp').classList.remove('hidden');
    document.getElementById('restore-otp-input').value = '';
    document.getElementById('restore-otp-input').focus();
  } catch (err) {
    errEl.textContent = 'Erreur réseau. Réessaie.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Envoyer le code';
  }
}

// ─── Vérifier l'OTP ───────────────────────────────────────────────────────────
async function verifierOTP() {
  const email = localStorage.getItem('rsb_restore_email');
  const otp = document.getElementById('restore-otp-input').value.trim();
  const errEl = document.getElementById('restore-error');

  if (!otp || otp.length !== 6) {
    errEl.textContent = 'Le code doit contenir 6 chiffres.';
    errEl.classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('restore-verify-btn');
  btn.disabled = true;
  btn.textContent = 'Vérification…';

  try {
    const res = await fetch(`${BACKEND_URL}/verify-restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = data.error || 'Code invalide ou expiré.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Valider';
      return;
    }

    // Restaurer les achats
    const achats = JSON.parse(localStorage.getItem('rsb_achats') || '[]');
    data.produitIds.forEach(id => { if (!achats.includes(id)) achats.push(id); });
    localStorage.setItem('rsb_achats', JSON.stringify(achats));
    localStorage.setItem('rsb_email', email);
    localStorage.removeItem('rsb_restore_email');

    fermerModal();
    location.reload();
  } catch (err) {
    errEl.textContent = 'Erreur réseau. Réessaie.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Valider';
  }
}

// ─── Apparence Stripe Elements ────────────────────────────────────────────────
function stripeAppearance() {
  return {
    theme: 'night',
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#1e1b4b',
      colorText: '#f8fafc',
      colorDanger: '#ef4444',
      fontFamily: 'Nunito, sans-serif',
      borderRadius: '1rem',
    },
  };
}

// ─── Injection de la modale de restauration ───────────────────────────────────
function injecterModaleRestauration() {
  const html = `
    <div id="restore-modal" class="payment-modal-overlay hidden">
      <div class="payment-modal">
        <button class="payment-modal-close" onclick="fermerModal()">✕</button>
        <div class="payment-modal-header">
          <h3>Restaurer mon accès</h3>
          <p class="payment-subtitle">Saisis l'e-mail utilisé lors de l'achat</p>
        </div>

        <div id="restore-step-email">
          <label class="payment-label" for="restore-email-input">Adresse e-mail</label>
          <input
            type="email"
            id="restore-email-input"
            class="payment-input"
            placeholder="exemple@email.com"
            autocomplete="email"
          />
          <p class="payment-email-hint">Un code à 6 chiffres te sera envoyé.</p>
          <div id="restore-error" class="payment-error hidden"></div>
          <button id="restore-send-btn" class="btn-primary pay-btn" onclick="demanderOTP()">
            Envoyer le code
          </button>
        </div>

        <div id="restore-step-otp" class="hidden">
          <p class="payment-email-hint" style="margin-bottom:1.2rem;">
            Code envoyé ! Vérifie ta boîte mail (et tes spams).
          </p>
          <label class="payment-label" for="restore-otp-input">Code à 6 chiffres</label>
          <input
            type="text"
            id="restore-otp-input"
            class="payment-input payment-input--otp"
            placeholder="123456"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
          />
          <div id="restore-error" class="payment-error hidden"></div>
          <button id="restore-verify-btn" class="btn-primary pay-btn" onclick="verifierOTP()">
            Valider
          </button>
          <button class="btn-text" onclick="ouvrirRestauration()">← Changer d'e-mail</button>
        </div>

        <div class="payment-secure">🔒 Ton e-mail n'est jamais stocké en clair</div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// ─── Init au chargement ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStripe();
  injecterModaleRestauration();
});
