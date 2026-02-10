# PayPal vaulted payment flows
A simple Nodejs server using the PayPal REST API and client-side PayPal JavaScript SDK. The Demo shows how a customers PayPal payment method can be stored and used for future purchases using the v3 vaulted payment flow. It also shows a returning customer present flow and how a stored PayPal payment method can be used for a one-click checkout experience.

The developer documentation for this flow can be viewed from [this link on the paypal developer website](https://developer.paypal.com/docs/checkout/save-payment-methods/purchase-later/js-sdk/paypal/).

This is a proof of concept demo and should not be used directly in a production environment.

## Setup instructions
Install the packages from the package-json file by typing into terminal:
```
npm install
```

Create a .env file in the route of your project folder with your PPCP credentials in it, [following this guide](https://developer.paypal.com/api/rest/#link-getclientidandclientsecret). See example below:

```
PAYPAL_CLIENT_ID='YOUR CLIENT ID GOES HERE'
PAYPAL_CLIENT_SECRET='YOUR CLIENT SECRET GOES HERE'
MERCHANT_ID='MERCHANT ID FOR your sandbox business account'
```

## Start the server
Start the server by typing into terminal:
```
node server.js
```

## Testing
Testing in the PayPal sandbox environment can be done by creating test Sandbox personal and business accounts as described here in the [official developer documentation here](https://developer.paypal.com/tools/sandbox/accounts/).
1. First, visit the index page at http://localhost:8000 and click the new customer button.
2. From new_customer.html page, click the PayPal button and login to your personal sandbox account.
3. After logging into your account and agreeing to have your payment method stored with the merchant, return to the index.html webpage.
4. Click the returning customer flow button.
5. Click the PayPal button to complete a one-click buying experience and see the server response for the successful capture of the payment.
   

## Disclaimer
This repository is for illustrative purposes only and shouldn't be used directly in a live environment.
