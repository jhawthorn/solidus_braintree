//= require "vendor/braintree"

SolidusBraintree = {
  getFrontendStyles: function(){
    /* Emulation of inherited attributes through an iframe */
    var $source = $('.braintree-hosted-field');
    return {
      input: {
        "font-family": $source.css("font-family"),
        "font-size": $source.css("font-size"),
        "color": $source.css("color"),
      }
    };
  }
}

Spree.routes.payment_client_token_api = Spree.pathFor("api/payment_client_token")

var braintreeDropinIntegration;
var cardSelector = "#payment-method-fields";
var paymentId;

var getClientToken = function(onSuccess) {
  return Spree.ajax({
    url: Spree.routes.payment_client_token_api,
    type: "POST",
    data: {
      payment_method_id: paymentId
    },
    error: function(xhr, status) {
      // If it fails it means the payment method was not a Braintree payment method
      if (braintreeDropinIntegration) {
        braintreeDropinIntegration.teardown();
        braintreeDropinIntegration = null;
      }
    },
    success: function(data) {
      onSuccess(data);
    }
  });
};

var initializeBraintree = function(data) {
  $("#card_expiry").on("keyup", function() {
    // We need to format the braintree expiration without spaces
    $("#braintree_expiration_date").val($(this).val().replace(/ /g,''));
  });

  braintree.setup(data.client_token, "custom", {
    id: "checkout_form_payment",
    hostedFields: {
      styles: SolidusBraintree.getFrontendStyles(),
      number: {
        selector: "#braintree_card_number"
      },
      cvv: {
        selector: "#braintree_card_code"
      },
      expirationDate: {
        selector: "#braintree_card_expiry"
      }
    },
    paypal: {
      container: "#braintree_paypal_container",
      onSuccess: function() {
        $(".braintree-cc-input").hide();
      },
      onCancelled: function() {
        $(".braintree-cc-input").show();
      }
    },
    onReady: function (integration) {
      $('.braintree-spinner').hide();
      $('.braintree-paypal-input, .braintree-cc-input').show();
      braintreeDropinIntegration = integration;
    },
    onError: function(type, message) {
      show_flash("error", message);
    },
    onPaymentMethodReceived: function(obj) {
      $("#payment_method_nonce").val(obj.nonce);
      $("#checkout_form_payment").submit();
      return;
    }
  });
};

var updateBraintree = function() {
  $('.braintree-spinner').show();
  $('.braintree-paypal-input, .braintree-cc-input').hide();
  getClientToken(initializeBraintree);
};

$(document).ready(function() {
  if ($(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").length) {
    $(cardSelector).find("input[type=radio][name='order[payments_attributes][][payment_method_id]']").on("change", function() {
      paymentId = $(this).val();
      updateBraintree();
    });
    // Attempt to initialize braintree
    paymentId = $("form input[type=radio][name='order[payments_attributes][][payment_method_id]']:checked").val();
    updateBraintree();
  }
});
