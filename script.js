const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
const year = document.getElementById("year");
const leadForm = document.getElementById("leadForm");
const formMsg = document.getElementById("formMsg");

if (menuBtn && mainNav) {
  menuBtn.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
}

if (year) {
  year.textContent = new Date().getFullYear();
}

if (leadForm && formMsg) {
  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("name")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();

    if (!name || !phone) {
      formMsg.textContent = "Iltimos, ism va telefon raqamni kiriting.";
      return;
    }

    formMsg.textContent = "Rahmat! So'rovingiz qabul qilindi. Tez orada bog'lanamiz.";
    leadForm.reset();
  });
}
