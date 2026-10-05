/**
 * =========================================================================
 * STORE HUB Authentication JavaScript (auth.js - Standalone Client Version)
 * Manages 5-step R-Mail registration wizard & login system
 * =========================================================================
 */

const StoreHubAuth = (function () {
  const signupData = {
    rmail: '',
    first_name: '',
    last_name: '',
    day: '',
    month: '',
    year: '',
    password: '',
    confirm_password: '',
    uid: ''
  };

  let currentStep = 1;
  let rmailCheckTimeout = null;

  function initSignupWizard() {
    showStep(1);

    const rmailInput = document.getElementById('signup-rmail');
    if (rmailInput) {
      rmailInput.addEventListener('input', (e) => {
        handleRMailInput(e.target.value);
      });
    }

    const passInput = document.getElementById('signup-password');
    if (passInput) {
      passInput.addEventListener('input', (e) => {
        evaluatePasswordStrength(e.target.value);
      });
    }
  }

  function showStep(stepNumber) {
    currentStep = stepNumber;
    document.querySelectorAll('.wizard-step-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    const activePanel = document.getElementById(`step-${stepNumber}-panel`);
    if (activePanel) {
      activePanel.style.display = 'block';
    }

    document.querySelectorAll('.step-indicator-item').forEach((dot, idx) => {
      if (idx + 1 === stepNumber) {
        dot.classList.add('active');
        dot.classList.remove('completed');
      } else if (idx + 1 < stepNumber) {
        dot.classList.remove('active');
        dot.classList.add('completed');
      } else {
        dot.classList.remove('active', 'completed');
      }
    });
  }

  function handleRMailInput(val) {
    const feedback = document.getElementById('rmail-feedback');
    const nextBtn = document.getElementById('step-1-next-btn');
    if (!feedback) return;

    clearTimeout(rmailCheckTimeout);

    let cleanVal = val.trim();
    if (!cleanVal) {
      feedback.textContent = '';
      feedback.style.color = 'var(--text-muted)';
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    if (!cleanVal.includes('@')) {
      feedback.textContent = 'Will be formatted as: ' + cleanVal + '@storage.hub';
      feedback.style.color = 'var(--text-muted)';
    }

    rmailCheckTimeout = setTimeout(async () => {
      let fullRMail = cleanVal;
      if (!fullRMail.includes('@')) {
        fullRMail += '@storage.hub';
      }

      if (!/^[a-zA-Z0-9._%+-]+@storage\.hub$/i.test(fullRMail)) {
        feedback.textContent = 'Invalid R-Mail format. Must be username@storage.hub';
        feedback.style.color = 'var(--danger)';
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      try {
        const res = await fetch(`/api/auth/check-rmail?rmail=${encodeURIComponent(fullRMail)}`);
        const data = await res.json();

        if (data.available) {
          feedback.textContent = 'R-Mail available ✓';
          feedback.style.color = 'var(--success)';
          signupData.rmail = fullRMail;
          if (nextBtn) nextBtn.disabled = false;
        } else {
          feedback.textContent = data.message || 'R-Mail is already in use.';
          feedback.style.color = 'var(--danger)';
          if (nextBtn) nextBtn.disabled = true;
        }
      } catch (err) {
        feedback.textContent = 'Unable to check availability.';
        feedback.style.color = 'var(--danger)';
      }
    }, 300);
  }

  function validateStep1() {
    const rmailInput = document.getElementById('signup-rmail');
    let rmail = rmailInput.value.trim();
    if (!rmail.includes('@')) rmail += '@storage.hub';

    if (!signupData.rmail || signupData.rmail !== rmail) {
      StoreHubApp.showToast('Please choose an available R-Mail address', 'error');
      return;
    }
    showStep(2);
  }

  function validateStep2() {
    const firstName = document.getElementById('signup-firstname').value.trim();
    const lastName = document.getElementById('signup-lastname').value.trim();

    if (!firstName || !lastName) {
      StoreHubApp.showToast('First Name and Last Name are required', 'error');
      return;
    }

    signupData.first_name = firstName;
    signupData.last_name = lastName;
    showStep(3);
  }

  function validateStep3() {
    const day = document.getElementById('signup-dob-day').value.trim();
    const month = document.getElementById('signup-dob-month').value.trim();
    const year = document.getElementById('signup-dob-year').value.trim();

    const d = parseInt(day, 10);
    const y = parseInt(year, 10);

    if (!day || !month || !year || isNaN(d) || isNaN(y) || d < 1 || d > 31 || y < 1920 || y > 2026) {
      StoreHubApp.showToast('Please enter a valid Date of Birth', 'error');
      return;
    }

    signupData.day = day;
    signupData.month = month;
    signupData.year = year;
    signupData.date_of_birth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    showStep(4);
  }

  function evaluatePasswordStrength(password) {
    const meter = document.getElementById('password-strength-bar');
    const text = document.getElementById('password-strength-text');
    if (!meter || !text) return;

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let strengthLabel = 'Too weak';
    let color = 'var(--danger)';
    let width = '20%';

    if (score === 2) {
      strengthLabel = 'Fair';
      color = 'var(--warning)';
      width = '45%';
    } else if (score === 3 || score === 4) {
      strengthLabel = 'Good';
      color = '#38bdf8';
      width = '75%';
    } else if (score >= 5) {
      strengthLabel = 'Strong ✓';
      color = 'var(--success)';
      width = '100%';
    }

    meter.style.width = width;
    meter.style.backgroundColor = color;
    text.textContent = `Strength: ${strengthLabel}`;
    text.style.color = color;
  }

  async function validateStep4AndSubmit() {
    const pass = document.getElementById('signup-password').value;
    const confirmPass = document.getElementById('signup-confirm-password').value;

    if (!pass || pass.length < 6) {
      StoreHubApp.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (pass !== confirmPass) {
      StoreHubApp.showToast('Passwords do not match', 'error');
      return;
    }

    signupData.password = pass;

    const submitBtn = document.getElementById('step-4-next-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rmail: signupData.rmail,
          first_name: signupData.first_name,
          last_name: signupData.last_name,
          date_of_birth: signupData.date_of_birth,
          password: signupData.password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        StoreHubApp.showToast(data.error || 'Account creation failed', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Next';
        }
        return;
      }

      localStorage.setItem('storehub_token', data.token);

      document.getElementById('complete-fullname').textContent = `${data.user.first_name} ${data.user.last_name}`;
      document.getElementById('complete-rmail').textContent = data.user.rmail;
      document.getElementById('complete-uid').textContent = data.user.uid;
      document.getElementById('complete-storage').textContent = '5 GB';

      showStep(5);
      StoreHubApp.showToast('Account successfully created! 5 GB free storage allocated.', 'success');
    } catch (err) {
      StoreHubApp.showToast('Error during registration.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Next';
      }
    }
  }

  function continueToDashboard() {
    window.location.href = 'dashboard.html';
  }

  function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rmail = document.getElementById('login-rmail').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit-btn');

      if (!rmail || !password) {
        StoreHubApp.showToast('Please enter your R-Mail and password', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rmail, password })
        });

        const data = await res.json();
        if (!res.ok) {
          StoreHubApp.showToast(data.error || 'Incorrect R-Mail or password', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log In';
          return;
        }

        localStorage.setItem('storehub_token', data.token);
        StoreHubApp.showToast('Welcome back, ' + data.user.first_name + '!', 'success');

        setTimeout(() => {
          if (data.user.role === 'OWNER') {
            window.location.href = 'owner.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        }, 500);
      } catch (err) {
        StoreHubApp.showToast('Login request failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }
    });

    const forgotBtn = document.getElementById('forgot-password-btn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const rmail = document.getElementById('login-rmail').value.trim();
        if (!rmail) {
          StoreHubApp.showToast('Enter your R-Mail address above, then click Forgot password.', 'warning');
          return;
        }
        handleForgotPassword(rmail);
      });
    }
  }

  async function handleForgotPassword(rmail) {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmail })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message + '\nAccount UID: ' + (data.account_uid || 'Verified'));
      } else {
        StoreHubApp.showToast(data.error || 'Password recovery error', 'error');
      }
    } catch (e) {
      StoreHubApp.showToast('Password recovery failed', 'error');
    }
  }

  return {
    initSignupWizard,
    validateStep1,
    validateStep2,
    validateStep3,
    validateStep4AndSubmit,
    continueToDashboard,
    initLoginForm
  };
})();
