(function () {
  "use strict";

  const form = document.getElementById("payment-form");
  const checkoutView = document.getElementById("checkout-view");
  const processingView = document.getElementById("processing-view");
  const resultView = document.getElementById("result-view");
  const orderToggle = document.querySelector(".order-toggle");
  const orderContent = document.getElementById("order-content");
  const cardNumber = document.getElementById("card-number");
  const expiry = document.getElementById("expiry");
  const securityCode = document.getElementById("security-code");
  const paymentReference = document.getElementById("payment-reference").textContent.trim();
  const paymentDescription = document.getElementById("payment-description").textContent.trim();
  const processingDelays = {
    success: 7000,
    unsuccessful: 45000
  };

  function digitsOnly(value) {
    return value.replace(/\D/g, "");
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }

  document.addEventListener("click", function (event) {
    const backControl = event.target.closest("[data-history-back]");
    if (backControl) window.history.back();
  });

  cardNumber.addEventListener("input", function () {
    const digits = digitsOnly(cardNumber.value).slice(0, 19);
    cardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim();
  });

  expiry.addEventListener("input", function () {
    const digits = digitsOnly(expiry.value).slice(0, 4);
    expiry.value = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
  });

  securityCode.addEventListener("input", function () {
    securityCode.value = digitsOnly(securityCode.value).slice(0, 4);
  });

  orderToggle.addEventListener("click", function () {
    const expanded = orderToggle.getAttribute("aria-expanded") === "true";
    orderToggle.setAttribute("aria-expanded", String(!expanded));
    orderContent.hidden = expanded;
  });

  function setError(input, message) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
    document.getElementById(input.id + "-error").textContent = message;
  }

  function validate() {
    let valid = true;
    const cardholder = document.getElementById("cardholder");

    const cardDigits = digitsOnly(cardNumber.value);
    if (cardDigits.length < 12 || cardDigits.length > 19) {
      setError(cardNumber, "Enter 12 to 19 digits.");
      valid = false;
    } else {
      setError(cardNumber, "");
    }

    if (!cardholder.value.trim()) {
      setError(cardholder, "Enter the cardholder name.");
      valid = false;
    } else {
      setError(cardholder, "");
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry.value)) {
      setError(expiry, "Enter a date in MM/YY format.");
      valid = false;
    } else {
      setError(expiry, "");
    }

    if (!/^\d{3,4}$/.test(securityCode.value)) {
      setError(securityCode, "Enter 3 or 4 digits.");
      valid = false;
    } else {
      setError(securityCode, "");
    }

    return valid;
  }

  function showResult(result) {
    const successful = result === "success";
    resultView.className = "result-card" + (successful ? "" : " unsuccessful");
    resultView.innerHTML =
      '<div class="result-icon" aria-hidden="true">' + (successful ? "✓" : "×") + "</div>" +
      "<h1>Payment " + (successful ? "successful" : "unsuccessful") + "</h1>" +
      "<p>" +
        (successful
          ? "The demonstration journey has completed successfully."
          : "The demonstration payment was not approved. No charge has been made.") +
      "</p>" +
      '<dl class="result-summary">' +
        "<div><dt>Reference</dt><dd>" + escapeHtml(paymentReference) + "</dd></div>" +
        "<div><dt>Description</dt><dd>" + escapeHtml(paymentDescription) + "</dd></div>" +
        "<div><dt>Status</dt><dd>" + (successful ? "Successful" : "Unsuccessful") + "</dd></div>" +
      "</dl>" +
      '<div class="result-actions">' +
        (successful
          ? '<button class="primary-button" type="button" data-history-back>Return</button>'
          : '<button class="primary-button" type="button" id="try-again">Try again</button><button class="secondary-button" type="button" data-history-back>Cancel payment</button>') +
      "</div>";

    checkoutView.hidden = true;
    processingView.hidden = true;
    resultView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    resultView.querySelector("h1").setAttribute("tabindex", "-1");
    resultView.querySelector("h1").focus();

    const tryAgain = document.getElementById("try-again");
    if (tryAgain) {
      tryAgain.addEventListener("click", function () {
        resultView.hidden = true;
        checkoutView.hidden = false;
        document.getElementById("pay-button").focus();
      });
    }
  }

  function setCheckoutControlsDisabled(disabled) {
    checkoutView.querySelectorAll("button, input").forEach(function (control) {
      control.disabled = disabled;
    });

    document.querySelectorAll('.atht-radio').forEach(function (control) {
      control.disabled = disabled;
    });
  }

  function showProcessing() {
    setCheckoutControlsDisabled(true);
    checkoutView.hidden = true;
    resultView.hidden = true;
    processingView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validate()) {
      const invalid = form.querySelector('[aria-invalid="true"]');
      if (invalid) invalid.focus();
      return;
    }

    const selectedResult = document.querySelector('input[name="demo-result"]:checked');
    const result = selectedResult && selectedResult.value === "success" ? "success" : "unsuccessful";

    showProcessing();
    window.setTimeout(function () {
      setCheckoutControlsDisabled(false);
      showResult(result);
    }, processingDelays[result]);
  });
})();
