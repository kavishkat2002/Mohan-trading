const express = require('express');
const router = express.Router();
const db = require('../db');

// Get financial overview
router.get('/overview', async (req, res) => {
  try {
    // Today's Sales
    const todaySales = await db.query("SELECT SUM(selling_price) as total FROM vehicle_sales WHERE sale_date = CURRENT_DATE");
    // Monthly Sales
    const monthSales = await db.query("SELECT SUM(selling_price) as total FROM vehicle_sales WHERE sale_date >= date_trunc('month', CURRENT_DATE)");
    
    // Total Expenses
    const expenses = await db.query("SELECT SUM(amount) as total FROM expenses");
    
    // Cash & Bank (summarized from cash_flow)
    const balances = await db.query("SELECT account, SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END) as balance FROM cash_flow GROUP BY account");
    
    res.json({
      todaySales: todaySales.rows[0].total || 0,
      monthSales: monthSales.rows[0].total || 0,
      totalExpenses: expenses.rows[0].total || 0,
      balances: balances.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Records
router.get('/expenses', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM expenses ORDER BY date DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/expenses', async (req, res) => {
  const { category, amount, description, date, account } = req.body;
  const amountVal = amount === "" || amount === undefined ? 0 : amount;
  const dateVal = date === "" || date === undefined ? new Date() : date;
  
  try {
    const { rows } = await db.query(
      "INSERT INTO expenses (category, amount, description, date) VALUES ($1, $2, $3, $4) RETURNING *",
      [category, amountVal, description, dateVal]
    );
    // Also record in cash flow
    await db.query(
      "INSERT INTO cash_flow (type, account, amount, description, date) VALUES ('Expense', $1, $2, $3, $4)",
      [account || 'Cash', amountVal, `Expense: ${category} - ${description}`, dateVal]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sales', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT vs.*, v.brand, v.purchase_price, v.transport_cost, v.repair_cost, v.registration_fee 
      FROM vehicle_sales vs 
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id 
      ORDER BY vs.sale_date DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sales', async (req, res) => {
  const { vehicle_id, lead_id, selling_price, sale_date, payment_method, account } = req.body;
  const vehicleIdVal = vehicle_id === "" || vehicle_id === undefined ? null : parseInt(vehicle_id, 10);
  const leadIdVal = lead_id === "" || lead_id === undefined ? null : parseInt(lead_id, 10);
  const sellingPriceVal = selling_price === "" || selling_price === undefined ? 0 : parseFloat(selling_price);
  const saleDateVal = sale_date === "" || sale_date === undefined ? new Date() : sale_date;
  const paymentMethodVal = payment_method || account || 'Bank';

  try {
    const { rows } = await db.query(
      "INSERT INTO vehicle_sales (vehicle_id, lead_id, selling_price, sale_date, payment_method) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [vehicleIdVal, leadIdVal, sellingPriceVal, saleDateVal, paymentMethodVal]
    );
    // Mark car as stock = 0
    if (vehicleIdVal) {
      await db.query("UPDATE vehicles SET stock = stock - 1 WHERE id = $1", [vehicleIdVal]);
    }
    // Record in cash flow
    await db.query(
      "INSERT INTO cash_flow (type, account, amount, description, date) VALUES ('Income', $1, $2, $3, $4)",
      [account || 'Bank', sellingPriceVal, `Vehicle Sale #${rows[0].id}`, saleDateVal]
    );

    // Sync lead status to 'Closed Deal' and notify the assigned agent
    if (leadIdVal) {
      const leadRes = await db.query("SELECT name, assigned_to FROM leads WHERE id = $1", [leadIdVal]);
      const lead = leadRes.rows[0];
      if (lead) {
        await db.query("UPDATE leads SET status = 'Closed Deal', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [leadIdVal]);
        if (lead.assigned_to) {
          await db.query(
            "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
            [lead.assigned_to, `🎉 Deal Closed! Vehicle sale recorded for lead: ${lead.name}.`]
          );
        }
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /finance/expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /finance/sales/:id
router.delete('/sales/:id', async (req, res) => {
  try {
    // Restore vehicle stock, revert lead status, and remove cash_flow entry
    const sale = await db.query('SELECT vehicle_id, lead_id, payment_method, selling_price FROM vehicle_sales WHERE id = $1', [req.params.id]);
    if (sale.rows.length > 0) {
      const { vehicle_id, lead_id, payment_method, selling_price } = sale.rows[0];
      if (vehicle_id) {
        await db.query('UPDATE vehicles SET stock = stock + 1 WHERE id = $1', [vehicle_id]);
      }
      if (lead_id) {
        await db.query("UPDATE leads SET status = 'Negotiating', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [lead_id]);
      }
      // Remove the matching cash flow income entry
      await db.query(
        "DELETE FROM cash_flow WHERE type = 'Income' AND description = $1 AND amount = $2 AND account = $3",
        [`Vehicle Sale #${req.params.id}`, selling_price, payment_method || 'Bank']
      );
    }
    await db.query('DELETE FROM vehicle_sales WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /finance/reset — wipes all financial data (admin/owner only)
router.delete('/reset', async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET_FINANCIAL_DATA') {
    return res.status(400).json({ error: 'Invalid confirmation token' });
  }
  try {
    // Restore vehicle stock for all sold vehicles first
    await db.query(`
      UPDATE vehicles v
      SET stock = stock + subq.sold_count
      FROM (
        SELECT vehicle_id, COUNT(*) as sold_count FROM vehicle_sales GROUP BY vehicle_id
      ) subq
      WHERE v.id = subq.vehicle_id
    `);
    // Clear all financial tables
    await db.query('TRUNCATE TABLE vehicle_sales, expenses, cash_flow RESTART IDENTITY CASCADE');
    res.json({ success: true, message: 'All financial data has been reset.' });
  } catch (err) {
    console.error('[Finance Reset Error]', err);
    res.status(500).json({ error: 'Server error during reset' });
  }
});

module.exports = router;
