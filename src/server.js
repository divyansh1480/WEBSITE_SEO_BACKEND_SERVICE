const express = require('express');
const path = require('path');
const { marked } = require('marked');
const pool = require('./db');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const products = require('./pdp-preview/data/products');
const { renderPage } = require('./pdp-preview/components/pdp-template');

const app = express();
app.use(express.json({ limit: '2mb' }));

const readLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

const globalLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

app.use(globalLimiter);
app.use(['GET', 'HEAD'], readLimiter);
app.use(['POST', 'PATCH', 'DELETE'], writeLimiter);

// API key middleware for write operations
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

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
  'slug',
  'canonical_url',
  'availability',
  'breadcrumb_jsonld',
]);

const jsonColumns = new Set([
  'specifications',
  'nutrition',
  'features',
  'faqs',
  'box_contents',
  'schema_json',
  'images',
  'breadcrumb_jsonld',
]);

function getValidEntries(body) {
  return Object.entries(body).filter(
    ([key, value]) => allowedColumns.has(key) && value !== null && value !== undefined
  );
}

// ── PDP Preview Routes (test only — static data, no DB) ──────────────────────
app.get('/pdp-preview', (req, res) => {
  const first = products[0];
  res.redirect(`/pdp-preview/${first.product_id}`);
});

app.get('/pdp-preview/:productId', (req, res) => {
  const product = products.find((p) => String(p.product_id) === req.params.productId);
  if (!product) return res.status(404).send('Product not found in test data');
  res.send(renderPage(product, products));
});
// ─────────────────────────────────────────────────────────────────────────────

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

// Website-facing PDP SEO endpoint
// Returns only SEO-relevant fields. Price & availability are intentionally
// excluded — website must merge live values from product API before rendering.
app.get('/api/seo/pdp/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT
        product_id, slug, canonical_url,
        meta_title, meta_description, meta_keywords,
        short_description, long_description,
        specifications, features, faqs,
        size_guide, regulatory_info, disclaimer, box_contents,
        schema_json, breadcrumb_jsonld, images
       FROM pdp_seo_content WHERE product_id = ? LIMIT 1`,
      [productId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'No SEO data found for this product' });
    const data = Object.fromEntries(Object.entries(rows[0]).filter(([, v]) => v !== null));
    res.json({ ok: true, data });
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

// ── Category Sync & Tree Routes ───────────────────────────────────────────────

function buildCategorySlug(name, id) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-c' + id;
}

function flattenCategories(categories, level, parentId, l0Id) {
  const rows = [];
  for (const cat of categories) {
    const slug = buildCategorySlug(cat.name, cat.id);
    rows.push({ id: cat.id, name: cat.name, slug, level, parent_id: parentId, l0_id: l0Id });
    if (cat.childes && cat.childes.length) {
      const childLevel = level === 'L0' ? 'L1' : 'L2';
      const childL0 = l0Id || cat.id;
      rows.push(...flattenCategories(cat.childes, childLevel, cat.id, childL0));
    }
  }
  return rows;
}

app.post('/api/sync-categories', requireApiKey, async (req, res) => {
  const categories = req.body;
  if (!Array.isArray(categories) || !categories.length) {
    return res.status(400).json({ ok: false, error: 'Provide an array of categories' });
  }
  const rows = flattenCategories(categories, 'L0', null, null);
  try {
    for (const row of rows) {
      await pool.query(
        `INSERT INTO categories (id, name, slug, level, parent_id, l0_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), level=VALUES(level),
           parent_id=VALUES(parent_id), l0_id=VALUES(l0_id), updated_at=CURRENT_TIMESTAMP`,
        [row.id, row.name, row.slug, row.level, row.parent_id || null, row.l0_id || null]
      );
    }
    res.json({ ok: true, synced: rows.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY level, name');
    res.json({ ok: true, categories: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/categories/l0', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, slug FROM categories WHERE level='L0' ORDER BY name");
    res.json({ ok: true, categories: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/categories/:parentId/children', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, level FROM categories WHERE parent_id = ? ORDER BY name',
      [req.params.parentId]
    );
    res.json({ ok: true, categories: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── PLP SEO Block Routes ──────────────────────────────────────────────────────

app.get('/admin/plp', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-plp.html'));
});

app.post('/api/plp/:categoryId', requireApiKey, async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const { markdown_content } = req.body;
  if (!markdown_content || !markdown_content.trim()) {
    return res.status(400).json({ ok: false, error: 'markdown_content is required' });
  }
  try {
    const [cat] = await pool.query('SELECT slug FROM categories WHERE id = ? LIMIT 1', [categoryId]);
    if (!cat.length) return res.status(404).json({ ok: false, error: 'Category not found. Sync categories first.' });
    const [existing] = await pool.query('SELECT id FROM plp_seo_blocks WHERE category_id = ? LIMIT 1', [categoryId]);
    if (existing.length) return res.status(409).json({ ok: false, error: 'SEO block already exists. Use PATCH to update.' });
    await pool.query(
      'INSERT INTO plp_seo_blocks (category_id, category_slug, markdown_content) VALUES (?, ?, ?)',
      [categoryId, cat[0].slug, markdown_content]
    );
    res.status(201).json({ ok: true, category_id: categoryId, category_slug: cat[0].slug });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/plp/:categoryId', requireApiKey, async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const { markdown_content } = req.body;
  if (!markdown_content || !markdown_content.trim()) {
    return res.status(400).json({ ok: false, error: 'markdown_content is required' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE plp_seo_blocks SET markdown_content = ? WHERE category_id = ?',
      [markdown_content, categoryId]
    );
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'SEO block not found. Use POST to create.' });
    res.json({ ok: true, category_id: categoryId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Frontend calls this with the slug from the URL e.g. GET /api/plp/slug/fashion-c4
app.get('/api/plp/slug/:categorySlug', async (req, res) => {
  const { categorySlug } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT p.*, c.name FROM plp_seo_blocks p JOIN categories c ON c.id = p.category_id WHERE p.category_slug = ? LIMIT 1',
      [categorySlug]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'No SEO block found for this category' });
    const row = rows[0];
    res.json({
      ok: true,
      category_id: row.category_id,
      category_slug: row.category_slug,
      category_name: row.name,
      html: marked(row.markdown_content),
      updated_at: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/plp/:categoryId', async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  try {
    const [rows] = await pool.query(
      'SELECT p.*, c.name FROM plp_seo_blocks p JOIN categories c ON c.id = p.category_id WHERE p.category_id = ? LIMIT 1',
      [categoryId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'No SEO block found' });
    const row = rows[0];
    res.json({
      ok: true,
      category_id: row.category_id,
      category_slug: row.category_slug,
      category_name: row.name,
      markdown: row.markdown_content,
      html: marked(row.markdown_content),
      updated_at: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/plp/:categoryId', requireApiKey, async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  try {
    const [result] = await pool.query('DELETE FROM plp_seo_blocks WHERE category_id = ?', [categoryId]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: 'SEO block not found' });
    res.json({ ok: true, category_id: categoryId, deleted: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/plp', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.category_id, p.category_slug, c.name, c.level, p.updated_at
       FROM plp_seo_blocks p JOIN categories c ON c.id = p.category_id
       ORDER BY p.updated_at DESC`
    );
    res.json({ ok: true, blocks: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`SEO backend running on port ${port}`);
});

module.exports = { app, server };
