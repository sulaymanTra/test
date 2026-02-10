const express = require("express")
const router = express.Router()
const dotenv = require("dotenv").config()
const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
router.use(express.json());

// Variables stored in the .env file of the route of the project
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');


// Retrieves an OAuth access token from PayPal. Use token for subsequent API calls
async function getAccessToken() {
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

/*
Set pre-transaction Context for PayPal risk servers. this is a requirement for some merchants in high risk verticals.
https://developer.paypal.com/limited-release/raas/how-to/integrate-express-checkout/rest-api/
*/
async function setTransactionContext() {

}

// Endpoint for requesting an id token with or without customer id
router.post('/id_token', async (req, res) => {
  const target_customer_id = req.body.target_customer_id;
  const formData = new URLSearchParams();
  formData.append('grant_type', 'client_credentials');
  formData.append('response_type', 'id_token');
  if (target_customer_id) {
    formData.append('target_customer_id', target_customer_id);
  }

  fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  })
    .then(response => response.json())
    .then((data) => {
      res.status(200).json({
        success: true,
        id_token: data.id_token
      });
    })
    .catch(error => res.status(500).json({ success: false, error: error.message }))
});

// Endpoint for requesting a setup token for a new customer
router.post('/setup_token', async (req, res) => {
  try {
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const accessToken = await getAccessToken();
    const requestBody = {
      payment_source: {
        paypal: {
          description: 'A description of the payment to the customer',
          usage_pattern: 'IMMEDIATE',
          permit_multiple_payment_tokens: 'false',
          usage_type: 'MERCHANT',
          customer_type: 'CONSUMER',
          experience_context: {
            brand_name: 'EdCorp',
            return_url: 'http://localhost:3000',
            cancel_url: 'http://localhost:3000',
            shipping_preferences: 'NO_SHIPPING',
            vault_instruction: 'ON_PAYER_APPROVAL',
            app_switch_preference: {
              launch_paypal_app: true
            }
          }
        }
      }
    };

    const response = await fetch('https://api-m.sandbox.paypal.com/v3/vault/setup-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': requestId
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PayPal API Error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to create setup token',
        details: errorData
      });
    }

    const data = await response.json();
    res.json({ token: data.id });

  } catch (error) {
    console.error('Error creating PayPal setup token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Endpoint for converting enriched setup token to vaulted payment method
router.post('/vault_payment_token', async (req, res) => {
  try {
    const { setup_token } = req.body;
    const accessToken = await getAccessToken();
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestBody = {
      payment_source: {
        token: {
          id: setup_token,
          type: "SETUP_TOKEN"
        }
      }
    };

    const response = await fetch('https://api-m.sandbox.paypal.com/v3/vault/payment-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': requestId
      },
      body: JSON.stringify(requestBody)
    });


    const data = await response.json();
    res.json({ data });

  } catch (error) {
    console.error('Error vaulting payment token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Endpoint for creating order for returning customer flows
router.post('/create_order', async (req, res) => {
  try {
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const accessToken = await getAccessToken();
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "GBP",
            value: '50.00'
          },
          description: "Purchase from Your Store"
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            locale: "en-GB",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: "https://yourdomain.com/success",
            cancel_url: "https://yourdomain.com/cancel"
          }
        }
      }
    };

    const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'PayPal-Request-Id': requestId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();
    res.json({ orderId: orderData.id })

  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint for capturing orders for returning customer flows
router.post('/capture_order', async (req, res) => {
  const orderId = req.body.orderId;

  try {
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }

    const accessToken = await getAccessToken();
    const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${req.body.orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      const errorMessage = captureData.details?.[0]?.description ||
        captureData.message ||
        'Failed to capture order';

      return res.status(captureResponse.status).json({
        success: false,
        error: errorMessage,
        error_details: captureData.details || null,
        debug_id: captureData.debug_id || null
      });
    }

    // Check capture status
    const captureStatus = captureData.status;
    const isSuccessful = captureStatus === 'COMPLETED';

    // Extract useful information from the capture response
    const captureDetails = {
      success: isSuccessful,
      orderId: captureData.id,
      status: captureStatus,
      payment_status: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status,
      transaction_id: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      amount: {
        value: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
        currency: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code
      },
      payer: {
        email: captureData.payer?.email_address,
        payer_id: captureData.payer?.payer_id,
        name: `${captureData.payer?.name?.given_name || ''} ${captureData.payer?.name?.surname || ''}`.trim()
      },
      capture_time: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.create_time,
      data: captureData // Include full response for debugging
    };

    // Log successful capture (you might want to save this to your database)
    console.log(`Order ${orderId} captured successfully. Transaction ID: ${captureDetails.transaction_id}`);

    res.status(200).json(captureDetails);

  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      orderId: req.body.orderId
    });
  }
});

module.exports = router
