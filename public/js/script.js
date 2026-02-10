// practical example of the guide mentioned here:
// https://developer.paypal.com/docs/checkout/save-payment-methods/purchase-later/js-sdk/paypal/

// Request a customer id token for use as a component in the PayPal JS SDK
fetch('/ppcp_api/id_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
})
    .then(response => response.json())
    .then(data => {
        console.log('id_token fetched.')
        const id_token = data.id_token;
        const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
        if (existingScript) {
            existingScript.remove();
        }

        // Start PayPal JavaScript SDK while passing new customer token id as component
        const script = document.createElement('script');
        const client_id = 'AcsTRn5GN9sdosRRuixP91uCTs7Dr0xUl4QnfEjvIJ-hwLDgOMznPDiChneAx281JjYHMINaGH7DpRZm';
        script.src = `https://www.paypal.com/sdk/js?client-id=${client_id}`;
        script.setAttribute('data-user-id-token', id_token);
        document.body.appendChild(script);

        script.onload = () => {
            console.log('PayPal SDK loaded with token');
            window.paypal.Buttons({
                
                fundingSource: paypal.FUNDING.PAYPAL,
                appSwitchWhenAvailable: true,
                
                // Request a vault setup token from the server
                createVaultSetupToken: async () => {
                    const response = await fetch('/ppcp_api/setup_token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    console.log('setup token created and sent to server')
                    return data.token;
                },
                
                // Send customer approved setup token to the server to be vaulted
                onApprove: async ({ vaultSetupToken }) => {
                    const response = await fetch('/ppcp_api/vault_payment_token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ setup_token: vaultSetupToken })
                    })
                    const result = await response.json();
                    document.getElementById('result-message').innerHTML =
                        `<pre style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; overflow-x: auto;">` +
                        JSON.stringify(result, null, 2) +
                        `</pre>`;
                },

                onError: (error) => {
                    console.error('PayPal Error:', error);
                }
            }).render("#paypal-button-container");
        };
    })
    .catch(error => console.error('Error:', error));