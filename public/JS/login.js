const passwordToggle = document.querySelector('.password-toggle');

// สลับการมองเห็นรหัสผ่าน และอัปเดตคำอธิบายสำหรับ screen reader
passwordToggle?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const passwordInput = document.querySelector('#password');
  const shouldShowPassword = passwordInput.type === 'password';

  passwordInput.type = shouldShowPassword ? 'text' : 'password';
  button.classList.toggle('is-visible', shouldShowPassword);
  button.setAttribute(
    'aria-label',
    shouldShowPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'
  );
});
