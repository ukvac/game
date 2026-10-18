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
  const paymentReferenceElement = document.getElementById("payment-reference");
  const paymentDescriptionElement = document.getElementById("payment-description");
  const paymentAmountElement = document.getElementById("payment-amount");
  const checkoutFooterElement = document.getElementById("checkout-footer-note");
  const orderParameters = new URLSearchParams(window.location.search);

  function orderValue(name, fallback) {
    const value = orderParameters.get(name);
    return value && value.trim() ? value.trim() : fallback;
  }

  const paymentReference = orderValue("reference", paymentReferenceElement.textContent.trim());
  const paymentDescription = orderValue("description", paymentDescriptionElement.textContent.trim());
  const paymentAmount = orderValue("amount", paymentAmountElement.textContent.trim());
  const checkoutFooter = orderValue("footer", checkoutFooterElement.textContent.trim());

  paymentReferenceElement.textContent = paymentReference;
  paymentDescriptionElement.textContent = paymentDescription;
  paymentAmountElement.textContent = paymentAmount;
  checkoutFooterElement.textContent = checkoutFooter;
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
    const originControl = event.target.closest("[data-return-origin]");
    if (originControl) {
      window.history.go(-2);
      return;
    }

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
    const cardholderName = document.getElementById("cardholder").value.trim();
    document.body.classList.toggle("showing-failure", !successful);
    resultView.className = "result-card" + (successful ? " successful" : " unsuccessful");
    if (successful) {
      const paymentDate = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London"
      }).format(new Date());
      resultView.innerHTML =
        '<div class="successful-layout">' +
          '<section class="success-banner" aria-labelledby="success-heading">' +
            '<h1 id="success-heading">Payment successful</h1>' +
            '<p>Reference number</p>' +
            '<strong>' + escapeHtml(paymentReference) + "</strong>" +
          "</section>" +
          '<dl class="success-details">' +
            "<div><dt>Date of payment</dt><dd>" + escapeHtml(paymentDate) + "</dd></div>" +
            "<div><dt>Name</dt><dd>" + escapeHtml(cardholderName) + "</dd></div>" +
            "<div><dt>Description</dt><dd>" + escapeHtml(paymentDescription) + "</dd></div>" +
            "<div><dt>Fee paid</dt><dd>" + escapeHtml(paymentAmount) + "</dd></div>" +
          "</dl>" +
          '<div class="result-actions">' +
            '<button class="primary-button" type="button" data-return-origin>Continue</button>' +
          "</div>" +
        "</div>";
    } else {
      resultView.innerHTML =
        '<div class="unsuccessful-layout">' +
          '<div class="failure-service-intro"><strong>BETA</strong><span>This is a new service.</span></div>' +
          '<nav class="failure-journey" aria-label="Application progress">' +
            "<ol>" +
              "<li>1. Start</li>" +
              "<li>2. Application</li>" +
              "<li>3. Documents</li>" +
              "<li>4. Declaration</li>" +
              '<li class="current" aria-current="step">5. <strong>Pay</strong></li>' +
              "<li>6. Further actions</li>" +
            "</ol>" +
          "</nav>" +
          '<div class="failure-page-content">' +
            '<button class="failure-back" type="button" data-history-back><span aria-hidden="true">◀</span> Back</button>' +
            "<h1>Your payment</h1>" +
            '<section class="failure-message" aria-labelledby="failure-details-heading">' +
              '<h2 id="failure-details-heading">Your payment details</h2>' +
              "<p>There has been a problem with your payment. Select your payment type again and re-enter your details to proceed.</p>" +
              "<p>If this problem persists, please contact the support team.</p>" +
            "</section>" +
            '<section class="failure-payment-details" aria-labelledby="failure-paying-heading">' +
              '<h2 id="failure-paying-heading">You are paying</h2>' +
              '<p class="failure-payment-line"><span>' + escapeHtml(paymentAmount) + '</span><span aria-hidden="true"> – </span><span>' + escapeHtml(paymentDescription) + "</span></p>" +
              '<p class="failure-name">Name: <strong>' + escapeHtml(cardholderName) + "</strong></p>" +
              '<p class="failure-reference">Payment reference: <strong>' + escapeHtml(paymentReference) + "</strong></p>" +
              '<p class="failure-total"><strong>' + escapeHtml(paymentAmount) + " in total</strong></p>" +
            "</section>" +
            '<div class="result-actions">' +
              '<button class="secondary-button" type="button" id="try-again">Try again</button>' +
              '<button class="primary-button" type="button" data-return-origin>Continue</button>' +
            "</div>" +
          "</div>" +
        "</div>";
    }

    checkoutView.hidden = true;
    processingView.hidden = true;
    resultView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    resultView.querySelector("h1").setAttribute("tabindex", "-1");
    resultView.querySelector("h1").focus({ preventScroll: true });

    const tryAgain = document.getElementById("try-again");
    if (tryAgain) {
      tryAgain.addEventListener("click", function () {
        document.body.classList.remove("showing-failure");
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
