function initializePayPal() {
    fetch('/ppcp_api/id_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_customer_id: 'fpQIroiYPJ' })
    })
        .then(response => response.json())
        .then(data => {
            console.log('id_token fetched.');
            const id_token = data.id_token;
            const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
            if (existingScript) {
                existingScript.remove();
            }
            document.getElementById('result-message').textContent = '';
            document.getElementById('paypal-button-container').style.display = 'block';
            const script = document.createElement('script');
            const client_id = 'AcsTRn5GN9sdosRRuixP91uCTs7Dr0xUl4QnfEjvIJ-hwLDgOMznPDiChneAx281JjYHMINaGH7DpRZm';
            script.src = `https://www.paypal.com/sdk/js?client-id=${client_id}&disable-funding=card&enable-funding=paylater&buyer-country=GB&components=messages,buttons&currency=GBP`;
            script.setAttribute('data-user-id-token', id_token);
            document.body.appendChild(script);

            script.onload = () => {
                console.log('PayPal SDK loaded with token');
                window.paypal.Buttons({

                    // Request an order to be created on your server and sent back to client
                    createOrder: async () => {
                        const response = await fetch('/ppcp_api/create_order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                        });
                        const data = await response.json();
                        console.log(`order created: ${data.orderId}`);
                        return data.orderId;
                    },

                    // After order is approved, send orderId to server for capture
                    onApprove: async (data) => {
                        try {
                            const response = await fetch('/ppcp_api/capture_order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: data.orderID })
                            });
                            const captureDetails = await response.json();
                            document.getElementById('result-message').innerHTML =
                                `<pre style="white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; max-width: 100%; overflow-x: auto;">` +
                                JSON.stringify(captureDetails, null, 2) +
                                `</pre>`;
                        } catch (error) {
                            console.error('Error capturing order:', error);
                            document.getElementById('result-message').textContent = 'Error capturing order. Please check console.';
                        }
                    },

                    // Recommended to store all client error messages along with relevant information
                    onError: (error) => {
                        console.error('PayPal Error:', error);
                        document.getElementById('result-message').textContent = 'PayPal error occurred. Please check console.';
                    }
                }).render("#paypal-button-container");
            };

            script.onerror = () => {
                console.error('Failed to load PayPal SDK');
                document.getElementById('result-message').textContent = 'Failed to load PayPal SDK. Please try again.';
            };
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('result-message').textContent = 'Error fetching token. Please check console.';
            document.getElementById('tokenForm').style.display = 'block';
        });
}

initializePayPal();