async function switchRole(url, updateHistory = true) {
  try {
    // โหลด HTML ของ Role ใหม่ แล้วแทนเฉพาะการ์ดสมัครสมาชิก
    const response = await fetch(url, {
      headers: { 'X-Requested-With': 'fetch' }
    });

    if (!response.ok) throw new Error('Unable to load role form');

    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, 'text/html');
    const nextCard = nextDocument.querySelector('.register-card');
    const currentCard = document.querySelector('.register-card');

    if (!nextCard || !currentCard) throw new Error('Role form is missing');

    currentCard.replaceWith(nextCard);
    document.title = nextDocument.title;

    if (updateHistory) history.pushState({}, '', url);
  } catch {
    window.location.assign(url);
  }
}

function togglePassword(button) {
  // ปุ่มแต่ละช่องเก็บ id ของ input ไว้ใน data-for
  const input = document.getElementById(button.dataset.for);
  const shouldShowPassword = input.type === 'password';

  input.type = shouldShowPassword ? 'text' : 'password';
  button.classList.toggle('is-visible', shouldShowPassword);
  button.setAttribute(
    'aria-label',
    shouldShowPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'
  );
}

document.addEventListener('click', (event) => {
  const roleLink = event.target.closest('[data-role-switch]');

  if (roleLink) {
    event.preventDefault();

    if (!roleLink.classList.contains('active')) {
      switchRole(roleLink.href);
    }

    return;
  }

  const passwordButton = event.target.closest('.toggle-password');
  if (passwordButton) togglePassword(passwordButton);
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'register-form') return;

  // ตรวจซ้ำฝั่งหน้าเว็บเพื่อแจ้งทันที; Controller จะตรวจอีกครั้งบน Server
  const { password, confirmPassword } = event.target.elements;
  if (!password || !confirmPassword) return;

  if (password.value !== confirmPassword.value) {
    event.preventDefault();
    confirmPassword.setCustomValidity('รหัสผ่านไม่ตรงกัน');
    confirmPassword.reportValidity();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'confirmPassword') {
    event.target.setCustomValidity('');
  }
});

window.addEventListener('popstate', () => {
  // รองรับปุ่ม Back/Forward ของ Browser หลังสลับประเภทบัญชี
  switchRole(window.location.href, false);
});
