const express = require('express');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '2mb' }));

const allowedColumns = new Set([
  'short_description',
  'long_description',
  'specifications',
  'ingredients',
  'nutrition',
  'features',
  'faqs',
  'size_guide',
  'regulatory_info',
  'disclaimer',
  'box_contents',
  'meta_title',
  'meta_description',
  'meta_keywords',
  'schema_json',
  'images',
]);

const jsonColumns = new Set([
  'specifications',
  'nutrition',
  'features',
  'faqs',
  'box_contents',
  'schema_json',
  'images',
]);

function getValidEntries(body) {
  return Object.entries(body).filter(
    ([key, value]) => allowedColumns.has(key) && value !== null && value !== undefined
  );
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/pdp/:productId', async (req, res) => {
  const { productId } = req.params;
  const validEntries = getValidEntries(req.body);

  if (!validEntries.length) {
    return res.status(400).json({ ok: false, error: 'Provide at least one non-null SEO field' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM pdp_seo_content WHERE product_id = ? LIMIT 1',
      [productId]
    );
    if (existing.length) {
      return res.status(409).json({ ok: false, error: 'Product already exists. Use PATCH to update.' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }

  const columns = ['product_id', ...validEntries.map(([key]) => key)];
  const values = [
    productId,
    ...validEntries.map(([key, value]) => (jsonColumns.has(key) ? JSON.stringify(value) : value)),
  ];
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `
    INSERT INTO pdp_seo_content (${columns.join(', ')})
    VALUES (${placeholders})
  `;

  try {
    await pool.query(sql, values);
    res.status(201).json({ ok: true, product_id: productId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/pdp/:productId', async (req, res) => {
  const { productId } = req.params;
  const validEntries = getValidEntries(req.body);

  if (!validEntries.length) {
    return res.status(400).json({ ok: false, error: 'Provide at least one non-null SEO field' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM pdp_seo_content WHERE product_id = ? LIMIT 1',
      [productId]
    );
    if (!existing.length) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    const setClause = validEntries.map(([key]) => `${key} = ?`).join(', ');
    const values = validEntries.map(([key, value]) => (jsonColumns.has(key) ? JSON.stringify(value) : value));
    values.push(productId);
    await pool.query(`UPDATE pdp_seo_content SET ${setClause} WHERE product_id = ?`, values);
    res.json({ ok: true, product_id: productId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/pdp/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM pdp_seo_content WHERE product_id = ? LIMIT 1', [productId]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    const nonNullData = Object.fromEntries(
      Object.entries(rows[0]).filter(([, value]) => value !== null)
    );
    res.json({ ok: true, data: nonNullData });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/pdp/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM pdp_seo_content WHERE product_id = ?', [productId]);
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    res.json({ ok: true, product_id: productId, deleted: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`SEO backend running on port ${port}`);
});

module.exports = { app, server };
