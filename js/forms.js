/* Web3Forms handler — covers footer newsletter + prayer form */

const WEB3FORMS_KEY = '72d0662c-9651-4126-99ad-229cfb4e6680';

async function submitForm(form, successMsg, errorMsg) {
  const data = new FormData(form);
  data.set('access_key', WEB3FORMS_KEY);

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: data,
    });
    const json = await res.json();

    if (json.success) {
      form.reset();
      showMessage(form, successMsg, 'success');
    } else {
      showMessage(form, errorMsg, 'error');
    }
  } catch {
    showMessage(form, errorMsg, 'error');
  }
}

function showMessage(form, text, type) {
  let msg = form.nextElementSibling;
  if (!msg || !msg.classList.contains('formMessage')) {
    msg = document.createElement('p');
    msg.className = 'formMessage';
    form.after(msg);
  }
  msg.textContent = text;
  msg.dataset.type = type;
  setTimeout(() => msg.remove(), 6000);
}

document.addEventListener('DOMContentLoaded', () => {
  const newsletter = document.getElementById('footerNewsletterForm');
  if (newsletter) {
    newsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(
        newsletter,
        'Thank you! You\'ve been subscribed.',
        'Something went wrong. Please try again.'
      );
    });
  }

  const prayer = document.getElementById('prayerForm');
  if (prayer) {
    prayer.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(
        prayer,
        'Your prayer request has been received. We will be praying for you.',
        'Something went wrong. Please try again.'
      );
    });
  }
});
