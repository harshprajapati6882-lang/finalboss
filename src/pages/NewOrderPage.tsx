<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order - Order Management System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 10px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h1 {
            font-size: 22px;
            font-weight: 600;
        }

        .back-button {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            font-size: 14px;
        }

        .back-button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }

        .form-container {
            padding: 20px 25px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-group.half-width {
            grid-column: span 2;
        }

        label {
            font-weight: 600;
            margin-bottom: 4px;
            color: #333;
            font-size: 13px;
        }

        input[type="text"],
        input[type="number"],
        input[type="date"],
        select,
        textarea {
            padding: 8px 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 13px;
            transition: all 0.3s ease;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        input[type="text"]:focus,
        input[type="number"]:focus,
        input[type="date"]:focus,
        select:focus,
        textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        textarea {
            resize: vertical;
            min-height: 60px;
        }

        .items-section {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 12px;
        }

        .items-section h3 {
            color: #667eea;
            margin-bottom: 12px;
            font-size: 16px;
        }

        .item-entry {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
            gap: 10px;
            margin-bottom: 10px;
            align-items: end;
        }

        .item-entry input,
        .item-entry select {
            padding: 8px 10px;
            font-size: 13px;
        }

        .add-item-btn,
        .remove-item-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 13px;
        }

        .add-item-btn {
            background: #667eea;
            color: white;
            margin-top: 10px;
        }

        .add-item-btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .remove-item-btn {
            background: #ff4757;
            color: white;
            padding: 8px 12px;
        }

        .remove-item-btn:hover {
            background: #ee5a6f;
        }

        .summary-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
            padding: 15px;
            background: #f0f4ff;
            border-radius: 12px;
        }

        .summary-item {
            display: flex;
            flex-direction: column;
        }

        .summary-item label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        }

        .summary-item .value {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
        }

        .payment-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 15px 0;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .checkbox-group label {
            margin: 0;
            cursor: pointer;
            font-size: 13px;
        }

        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #e0e0e0;
        }

        .submit-btn,
        .reset-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .submit-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .reset-btn {
            background: #f1f3f5;
            color: #495057;
        }

        .reset-btn:hover {
            background: #e9ecef;
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }

            .form-group.half-width {
                grid-column: span 1;
            }

            .item-entry {
                grid-template-columns: 1fr;
            }

            .summary-section,
            .payment-section {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Create New Order</h1>
            <a href="dashboard.html" class="back-button">← Back to Dashboard</a>
        </div>

        <form id="orderForm" class="form-container">
            <!-- Customer Information -->
            <div class="form-grid">
                <div class="form-group">
                    <label for="customerName">Customer Name *</label>
                    <input type="text" id="customerName" required>
                </div>

                <div class="form-group">
                    <label for="mobileNumber">Mobile Number *</label>
                    <input type="text" id="mobileNumber" required>
                </div>

                <div class="form-group">
                    <label for="orderDate">Order Date *</label>
                    <input type="date" id="orderDate" required>
                </div>

                <div class="form-group">
                    <label for="deliveryDate">Delivery Date *</label>
                    <input type="date" id="deliveryDate" required>
                </div>

                <div class="form-group">
                    <label for="trialDate">Trial Date</label>
                    <input type="date" id="trialDate">
                </div>

                <div class="form-group">
                    <label for="urgency">Urgency</label>
                    <select id="urgency">
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Very Urgent">Very Urgent</option>
                    </select>
                </div>

                <div class="form-group full-width">
                    <label for="address">Address</label>
                    <textarea id="address" rows="2"></textarea>
                </div>
            </div>

            <!-- Items Section -->
            <div class="items-section">
                <h3>Order Items</h3>
                <div id="itemsContainer">
                    <div class="item-entry">
                        <div>
                            <label>Item Description *</label>
                            <input type="text" class="item-description" required>
                        </div>
                        <div>
                            <label>Quantity *</label>
                            <input type="number" class="item-quantity" min="1" value="1" required>
                        </div>
                        <div>
                            <label>Unit</label>
                            <select class="item-unit">
                                <option value="Pieces">Pieces</option>
                                <option value="Meters">Meters</option>
                                <option value="Sets">Sets</option>
                            </select>
                        </div>
                        <div>
                            <label>Rate *</label>
                            <input type="number" class="item-rate" min="0" step="0.01" required>
                        </div>
                        <div>
                            <label>Amount</label>
                            <input type="number" class="item-amount" readonly>
                        </div>
                        <div>
                            <label>&nbsp;</label>
                            <button type="button" class="remove-item-btn" onclick="removeItem(this)">✕</button>
                        </div>
                    </div>
                </div>
                <button type="button" class="add-item-btn" onclick="addItem()">+ Add Item</button>
            </div>

            <!-- Summary Section -->
            <div class="summary-section">
                <div class="summary-item">
                    <label>Total Amount</label>
                    <div class="value" id="totalAmount">₹0.00</div>
                </div>
                <div class="summary-item">
                    <label>Advance Paid</label>
                    <div class="value" id="advancePaidDisplay">₹0.00</div>
                </div>
                <div class="summary-item">
                    <label>Balance Due</label>
                    <div class="value" id="balanceDue">₹0.00</div>
                </div>
            </div>

            <!-- Payment Section -->
            <div class="payment-section">
                <div class="form-group">
                    <label for="advancePaid">Advance Payment</label>
                    <input type="number" id="advancePaid" min="0" step="0.01" value="0">
                </div>

                <div class="form-group">
                    <label for="paymentMethod">Payment Method</label>
                    <select id="paymentMethod">
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                    </select>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="measurementDone">
                    <label for="measurementDone">Measurement Completed</label>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="readyToDeliver">
                    <label for="readyToDeliver">Ready to Deliver</label>
                </div>
            </div>

            <!-- Notes -->
            <div class="form-group full-width">
                <label for="notes">Additional Notes</label>
                <textarea id="notes" rows="2"></textarea>
            </div>

            <!-- Buttons -->
            <div class="button-group">
                <button type="submit" class="submit-btn">💾 Save Order</button>
                <button type="reset" class="reset-btn">🔄 Reset Form</button>
            </div>
        </form>
    </div>

    <script>
        // Set default dates
        document.getElementById('orderDate').valueAsDate = new Date();
        let deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 7);
        document.getElementById('deliveryDate').valueAsDate = deliveryDate;

        // Add item functionality
        function addItem() {
            const container = document.getElementById('itemsContainer');
            const newItem = container.firstElementChild.cloneNode(true);
            
            // Clear values
            newItem.querySelectorAll('input').forEach(input => {
                if (input.classList.contains('item-quantity')) {
                    input.value = 1;
                } else {
                    input.value = '';
                }
            });
            
            container.appendChild(newItem);
            attachItemListeners(newItem);
        }

        // Remove item functionality
        function removeItem(button) {
            const container = document.getElementById('itemsContainer');
            if (container.children.length > 1) {
                button.closest('.item-entry').remove();
                calculateTotals();
            } else {
                alert('At least one item is required!');
            }
        }

        // Attach listeners to item inputs
        function attachItemListeners(item) {
            const quantity = item.querySelector('.item-quantity');
            const rate = item.querySelector('.item-rate');
            const amount = item.querySelector('.item-amount');

            function updateAmount() {
                const qty = parseFloat(quantity.value) || 0;
                const rateVal = parseFloat(rate.value) || 0;
                amount.value = (qty * rateVal).toFixed(2);
                calculateTotals();
            }

            quantity.addEventListener('input', updateAmount);
            rate.addEventListener('input', updateAmount);
        }

        // Calculate totals
        function calculateTotals() {
            let total = 0;
            document.querySelectorAll('.item-amount').forEach(input => {
                total += parseFloat(input.value) || 0;
            });

            const advance = parseFloat(document.getElementById('advancePaid').value) || 0;
            const balance = total - advance;

            document.getElementById('totalAmount').textContent = '₹' + total.toFixed(2);
            document.getElementById('advancePaidDisplay').textContent = '₹' + advance.toFixed(2);
            document.getElementById('balanceDue').textContent = '₹' + balance.toFixed(2);
        }

        // Initialize listeners
        document.querySelectorAll('.item-entry').forEach(item => {
            attachItemListeners(item);
        });

        document.getElementById('advancePaid').addEventListener('input', calculateTotals);

        // Form submission
        document.getElementById('orderForm').addEventListener('submit', function(e) {
            e.preventDefault();

            // Collect items
            const items = [];
            document.querySelectorAll('.item-entry').forEach(entry => {
                items.push({
                    description: entry.querySelector('.item-description').value,
                    quantity: entry.querySelector('.item-quantity').value,
                    unit: entry.querySelector('.item-unit').value,
                    rate: entry.querySelector('.item-rate').value,
                    amount: entry.querySelector('.item-amount').value
                });
            });

            // Create order object
            const order = {
                id: Date.now(),
                customerName: document.getElementById('customerName').value,
                mobileNumber: document.getElementById('mobileNumber').value,
                orderDate: document.getElementById('orderDate').value,
                deliveryDate: document.getElementById('deliveryDate').value,
                trialDate: document.getElementById('trialDate').value,
                urgency: document.getElementById('urgency').value,
                address: document.getElementById('address').value,
                items: items,
                totalAmount: document.getElementById('totalAmount').textContent,
                advancePaid: document.getElementById('advancePaid').value,
                balanceDue: document.getElementById('balanceDue').textContent,
                paymentMethod: document.getElementById('paymentMethod').value,
                measurementDone: document.getElementById('measurementDone').checked,
                readyToDeliver: document.getElementById('readyToDeliver').checked,
                notes: document.getElementById('notes').value,
                status: 'Pending'
            };

            // Save to localStorage
            let orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));

            alert('✅ Order created successfully!');
            window.location.href = 'dashboard.html';
        });
    </script>
</body>
</html>
