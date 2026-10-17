(function () {
  "use strict";

  const order = {
    reference: document.getElementById("selection-reference").textContent.trim(),
    description: document.getElementById("selection-description").textContent.trim(),
    amount: document.getElementById("selection-amount").textContent.trim()
  };

  document.querySelectorAll("[data-payment-link]").forEach(function (link) {
    const destination = new URL(link.getAttribute("href"), window.location.href);
    Object.keys(order).forEach(function (key) {
      destination.searchParams.set(key, order[key]);
    });
    link.href = destination.href;
  });
})();
