/* ================================================
   OPL Synergy — Main JavaScript
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ================================================
  // 1. NAV SCROLL SHADOW
  // ================================================
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ================================================
  // 2. MOBILE HAMBURGER MENU
  // ================================================
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const backdrop   = document.getElementById('nav-backdrop');

  const openMenu = () => {
    mobileMenu.classList.add('open');
    hamburger.classList.add('open');
    backdrop && backdrop.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    backdrop && backdrop.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    // Close on mobile link click
    mobileMenu.querySelectorAll('.nav__mobile-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on backdrop click
    backdrop && backdrop.addEventListener('click', closeMenu);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
  }

  // ================================================
  // 3. PROJECT FILTER TABS
  // ================================================
  const filterBtns = document.querySelectorAll('.filter-tabs__btn');
  const projectsList = document.getElementById('projects-list');

  if (filterBtns.length && projectsList) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Update active tab
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Filter project cards
        const cards = projectsList.querySelectorAll('.project-card');

        if (filter === 'all') {
          projectsList.classList.add('show-all');
          cards.forEach(card => {
            card.classList.remove('show');
            card.style.opacity = '0';
          });
          setTimeout(() => {
            cards.forEach(card => {
              card.style.opacity = '';
            });
          }, 10);
        } else {
          projectsList.classList.remove('show-all');
          cards.forEach(card => {
            if (card.dataset.category === filter) {
              card.classList.add('show');
            } else {
              card.classList.remove('show');
            }
          });
        }
      });
    });
  }

  // ================================================
  // 4. SCROLL FADE-IN ANIMATIONS
  // ================================================
  const fadeElements = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    fadeElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    fadeElements.forEach(el => el.classList.add('visible'));
  }

  // ================================================
  // 5. CONTACT FORM HANDLING — EmailJS + Anti-Spam
  // ================================================
  // Anti-spam layers applied:
  //   [1] Honeypot   — hidden field bots fill, humans never see
  //   [2] Time gate  — rejects submissions under 3 seconds (bots are instant)
  //   [3] Rate limit — max 3 submissions per session, 60s cooldown between sends
  //   [4] Content filter — blocks common spam keywords
  //   [5] reCAPTCHA v3 — invisible Google score check (score < 0.5 blocked)
  //
  // reCAPTCHA v3 SETUP (free):
  //   1. Go to https://www.google.com/recaptcha/admin/create
  //   2. Choose reCAPTCHA v3, add your domain
  //   3. Copy the SITE KEY and paste below
  //   4. Copy the SECRET KEY → add to EmailJS template as a check, or use a
  //      backend endpoint to verify (optional but recommended)
  // ================================================

  const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY'; // ← paste your v3 site key

  const EMAILJS_CONFIG = {
    publicKey:   'TgaWcTLrDvzM_AS2J',
    serviceId:   'service_cxj7zoa',
    templateId:  'template_q2fof0c',
  };

  // Rate limit state
  const RATE_LIMIT    = { max: 3, cooldownMs: 60_000 };
  let   submitCount   = 0;
  let   lastSubmitAt  = 0;

  // Spam keyword blocklist
  const SPAM_KEYWORDS = [
    'casino', 'lottery', 'winner', 'click here', 'free money',
    'crypto', 'bitcoin', 'make money fast', 'earn $', 'viagra',
    'cialis', 'porn', 'sex', 'nude', 'loan offer', 'cheap meds',
  ];

  const contactForm = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');
  const formSubmit  = document.getElementById('form-submit');
  const formError   = document.getElementById('form-error');

  // Track when the form first became visible (time gate)
  let formLoadTime = Date.now();

  if (contactForm) {

    // Initialise EmailJS
    if (typeof emailjs !== 'undefined') {
      emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    }

    const showError = (msg) => {
      if (!formError) return;
      formError.textContent = msg;
      formError.classList.add('visible');
      formError.style.display = 'block';
      formSubmit.disabled = false;
      formSubmit.textContent = 'Submit Inquiry →';
    };

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (formError) formError.classList.remove('visible');

      // ── [1] Honeypot check ──────────────────────────
      const honeypot = contactForm.querySelector('#website');
      if (honeypot && honeypot.value.trim() !== '') {
        // Bot filled the hidden field — silently discard
        contactForm.querySelectorAll('.form__row, .form__group').forEach(el => el.style.display = 'none');
        formSubmit.style.display = 'none';
        if (formSuccess) { formSuccess.classList.add('visible'); formSuccess.style.display = 'block'; }
        return;
      }

      // ── [2] Time gate (< 3 seconds = bot) ──────────
      const elapsed = (Date.now() - formLoadTime) / 1000;
      if (elapsed < 3) {
        showError('Submission too fast. Please review your message and try again.');
        return;
      }

      // ── [3] Rate limiting ───────────────────────────
      const now = Date.now();
      if (submitCount >= RATE_LIMIT.max) {
        const wait = Math.ceil((RATE_LIMIT.cooldownMs - (now - lastSubmitAt)) / 1000);
        if (now - lastSubmitAt < RATE_LIMIT.cooldownMs) {
          showError(`Too many submissions. Please wait ${wait} seconds before trying again.`);
          return;
        } else {
          submitCount = 0; // reset after cooldown
        }
      }

      // ── Field validation ────────────────────────────
      const requiredFields = contactForm.querySelectorAll('[required]');
      let isValid = true;
      requiredFields.forEach(field => {
        field.style.borderColor = '';
        if (!field.value.trim()) { field.style.borderColor = '#C0392B'; isValid = false; }
      });
      const emailField = contactForm.querySelector('#email');
      if (emailField?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.style.borderColor = '#C0392B'; isValid = false;
      }
      if (!isValid) return;

      // ── [4] Spam keyword filter ─────────────────────
      const messageText = (contactForm.querySelector('#message')?.value || '').toLowerCase();
      const firstNameText = (contactForm.querySelector('#first-name')?.value || '').toLowerCase();
      const combinedText  = messageText + ' ' + firstNameText;
      const isSpam = SPAM_KEYWORDS.some(kw => combinedText.includes(kw));
      if (isSpam) {
        showError('Your message was flagged as spam. Please contact us directly at enquiries@oplsynergy.com');
        return;
      }

      // ── [5] reCAPTCHA v3 ────────────────────────────
      formSubmit.disabled = true;
      formSubmit.textContent = 'Verifying…';

      let recaptchaToken = '';
      try {
        if (typeof grecaptcha !== 'undefined' && RECAPTCHA_SITE_KEY !== 'YOUR_RECAPTCHA_SITE_KEY') {
          recaptchaToken = await new Promise((resolve, reject) => {
            grecaptcha.ready(() => {
              grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'contact_submit' })
                .then(resolve).catch(reject);
            });
          });
        }
      } catch (err) {
        console.warn('reCAPTCHA unavailable, proceeding without it.');
      }

      formSubmit.textContent = 'Sending…';

      // ── Send via EmailJS ────────────────────────────
      const templateParams = {
        from_first:       contactForm.querySelector('#first-name')?.value.trim() || '',
        from_last:        contactForm.querySelector('#last-name')?.value.trim()  || '',
        from_email:       contactForm.querySelector('#email')?.value.trim()      || '',
        from_phone:       contactForm.querySelector('#phone')?.value.trim()      || '',
        inquiry_type:     contactForm.querySelector('#inquiry-type')?.value      || '',
        message:          contactForm.querySelector('#message')?.value.trim()    || '',
        reply_to:         contactForm.querySelector('#email')?.value.trim()      || '',
        recaptcha_token:  recaptchaToken,
      };

      try {
        if (typeof emailjs === 'undefined') throw new Error('EmailJS SDK not loaded.');

        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);

        // Update rate limit counters on success
        submitCount++;
        lastSubmitAt = Date.now();

        // Success state
        contactForm.querySelectorAll('.form__row, .form__group').forEach(el => el.style.display = 'none');
        formSubmit.style.display = 'none';
        if (formSuccess) { formSuccess.classList.add('visible'); formSuccess.style.display = 'block'; }

      } catch (err) {
        console.error('EmailJS error:', err);
        showError('Sorry, something went wrong. Please email us directly at enquiries@oplsynergy.com');
      }
    });

    // Live validation — clear red border on input
    contactForm.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('input', () => {
        if (field.value.trim()) field.style.borderColor = '';
      });
    });
  }

  // ================================================
  // 7. LIGHTBOX GALLERY
  // ================================================
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev  = document.getElementById('lightbox-prev');
  const lightboxNext  = document.getElementById('lightbox-next');
  const lightboxCount = document.getElementById('lightbox-counter');
  const galleryItems  = Array.from(document.querySelectorAll('.gallery-item'));

  if (lightbox && galleryItems.length) {

    let currentIndex = 0;

    const openLightbox = (index) => {
      currentIndex = index;
      const img = galleryItems[index].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCount.textContent = `${index + 1} / ${galleryItems.length}`;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      lightboxImg.focus();
    };

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    };

    const showPrev = () => {
      currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
      const img = galleryItems[currentIndex].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCount.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    };

    const showNext = () => {
      currentIndex = (currentIndex + 1) % galleryItems.length;
      const img = galleryItems[currentIndex].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCount.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    };

    // Open on gallery item click
    galleryItems.forEach((item, i) => {
      item.addEventListener('click', () => openLightbox(i));
    });

    // Close button
    lightboxClose.addEventListener('click', closeLightbox);

    // Click backdrop to close
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Prev / Next buttons
    lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   showPrev();
      if (e.key === 'ArrowRight')  showNext();
    });
  }

  // ================================================
  // 6. SMOOTH SCROLL for anchor links
  // ================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    });
  });

});
