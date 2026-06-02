function renderSpecifications(specs) {
  const labels = {
    brand: 'Brand',
    type: 'Type',
    weight: 'Weight',
    weight_limit: 'Weight Limit',
    dimensions: 'Dimensions',
    material: 'Material',
    color: 'Color',
    country_of_origin: 'Country of Origin',
    ean_upc_code: 'EAN / UPC Code',
    mpn: 'MPN',
    shelf_life: 'Shelf Life',
  };

  return Object.entries(specs)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(
      ([k, v]) => `
      <div class="spec-item">
        <p class="spec-label">${labels[k] || k}</p>
        <p class="spec-value">${v}</p>
      </div>`
    )
    .join('');
}

function renderFeatures(features) {
  if (!features || features.length === 0) return '';
  return `
    <section class="pdp-section" id="features">
      <h2 class="section-title">Key Features</h2>
      <ul class="features-list">
        ${features.map((f) => `<li>${f}</li>`).join('')}
      </ul>
    </section>`;
}

function renderFAQs(faqs, productName) {
  if (!faqs || faqs.length === 0) return '';

  const schemaItems = faqs
    .map(
      (faq) => `{
      "@type": "Question",
      "name": "${faq.question.replace(/"/g, '\\"')}",
      "acceptedAnswer": { "@type": "Answer", "text": "${faq.answer.replace(/"/g, '\\"')}" }
    }`
    )
    .join(',');

  const faqSchema = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [${schemaItems}]
    }
    </script>`;

  const faqItems = faqs
    .map(
      (faq, i) => `
      <div class="faq-item">
        <button class="faq-question" onclick="toggleFaq(${i})" aria-expanded="false" aria-controls="faq-answer-${i}">
          <span>${faq.question}</span>
          <span class="faq-icon" id="faq-icon-${i}">+</span>
        </button>
        <div class="faq-answer" id="faq-answer-${i}" hidden>
          <p>${faq.answer}</p>
        </div>
      </div>`
    )
    .join('');

  return `
    ${faqSchema}
    <section class="pdp-section" id="faqs">
      <h2 class="section-title">Frequently Asked Questions</h2>
      <div class="faq-list">${faqItems}</div>
    </section>`;
}

function renderWhatsInTheBox(items) {
  if (!items || items.length === 0) return '';
  return `
    <section class="pdp-section" id="box-contents">
      <h2 class="section-title">What's in the Box</h2>
      <ul class="box-list">
        ${items.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </section>`;
}

function renderDisclaimer(disclaimer) {
  if (!disclaimer) return '';
  return `
    <section class="pdp-section disclaimer-section" id="disclaimer">
      <h2 class="section-title">Disclaimer</h2>
      <p class="disclaimer-text">${disclaimer}</p>
    </section>`;
}

function renderProductSchema(product) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description,
    brand: { '@type': 'Brand', name: product.brand },
    mpn: product.specifications?.mpn || undefined,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'OZI.in' },
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

function renderPage(product, allProducts) {
  const longDescParagraphs = product.long_description
    .split('\n\n')
    .filter(Boolean)
    .map((p) => `<p>${p.trim()}</p>`)
    .join('');

  const productListItems = allProducts
    .map(
      (p) => `
      <a href="/pdp-preview/${p.product_id}" class="product-card ${p.product_id == product.product_id ? 'active' : ''}">
        <span class="product-card-brand">${p.brand}</span>
        <span class="product-card-name">${p.name}</span>
        <span class="product-card-cat">${p.category}</span>
      </a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${product.seo.meta_title}</title>
  <meta name="description" content="${product.seo.meta_description}" />
  ${renderProductSchema(product)}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --mauve: #7c3d9e;
      --mauve-light: #f3eaf8;
      --mauve-mid: #e0c8f0;
      --gray-800: #1a1a2e;
      --gray-600: #4a4a6a;
      --gray-500: #6b6b8a;
      --gray-200: #e8e8f0;
      --gray-100: #f5f5fa;
      --green: #22a760;
      --green-light: #e8f8ef;
      --orange: #f59e0b;
      --white: #ffffff;
      --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    body {
      font-family: var(--font);
      background: var(--gray-100);
      color: var(--gray-800);
      min-height: 100vh;
    }

    /* ── Top Nav ── */
    .top-nav {
      background: var(--white);
      border-bottom: 1px solid var(--gray-200);
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .nav-logo { font-size: 22px; font-weight: 800; color: var(--mauve); letter-spacing: -0.5px; }
    .nav-logo span { color: var(--gray-800); }
    .nav-delivery {
      font-size: 12px;
      font-weight: 600;
      background: var(--green-light);
      color: var(--green);
      padding: 4px 10px;
      border-radius: 20px;
    }
    .nav-breadcrumb {
      font-size: 12px;
      color: var(--gray-500);
    }
    .nav-breadcrumb a { color: var(--mauve); text-decoration: none; }

    /* ── Layout ── */
    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 0;
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px 16px;
      gap: 20px;
    }

    /* ── Sidebar ── */
    .sidebar {
      position: sticky;
      top: 72px;
      height: fit-content;
      background: var(--white);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--gray-200);
    }
    .sidebar-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--gray-500);
      margin-bottom: 12px;
    }
    .product-card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      margin-bottom: 6px;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .product-card:hover { background: var(--mauve-light); border-color: var(--mauve-mid); }
    .product-card.active { background: var(--mauve-light); border-color: var(--mauve); }
    .product-card-brand { font-size: 10px; font-weight: 700; color: var(--mauve); text-transform: uppercase; }
    .product-card-name { font-size: 12px; font-weight: 600; color: var(--gray-800); line-height: 1.4; }
    .product-card-cat {
      font-size: 10px;
      color: var(--gray-500);
      background: var(--gray-100);
      width: fit-content;
      padding: 1px 6px;
      border-radius: 10px;
      margin-top: 2px;
    }

    /* ── Main Content ── */
    .main-content { min-width: 0; }

    /* ── Primary Section ── */
    .primary-section {
      background: var(--white);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--gray-200);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 16px;
    }

    .product-image-placeholder {
      background: linear-gradient(135deg, var(--mauve-light) 0%, var(--mauve-mid) 100%);
      border-radius: 12px;
      aspect-ratio: 4/3;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 8px;
      color: var(--mauve);
      font-size: 13px;
      font-weight: 600;
    }
    .product-image-placeholder .img-icon { font-size: 48px; opacity: 0.4; }

    .product-info { display: flex; flex-direction: column; gap: 10px; }
    .product-brand { font-size: 13px; font-weight: 700; color: var(--mauve); text-transform: uppercase; letter-spacing: 0.3px; }
    .product-name { font-size: 18px; font-weight: 700; color: var(--gray-800); line-height: 1.4; }
    .product-short-desc { font-size: 13px; color: var(--gray-600); line-height: 1.6; }

    .delivery-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--green-light);
      color: var(--green);
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      width: fit-content;
    }

    .category-badge {
      display: inline-flex;
      background: var(--mauve-light);
      color: var(--mauve);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      width: fit-content;
    }

    .add-to-cart-btn {
      background: var(--mauve);
      color: var(--white);
      font-size: 14px;
      font-weight: 700;
      padding: 14px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      letter-spacing: 0.5px;
      width: 100%;
      margin-top: 8px;
      transition: background 0.15s;
    }
    .add-to-cart-btn:hover { background: #6a3388; }

    /* ── Content Sections ── */
    .pdp-section {
      background: var(--white);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--gray-200);
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--gray-800);
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--mauve-light);
    }

    /* Long description */
    .long-desc p { font-size: 14px; color: var(--gray-600); line-height: 1.8; margin-bottom: 12px; }
    .long-desc p:last-child { margin-bottom: 0; }

    /* Specs grid */
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .spec-item {}
    .spec-label { font-size: 11px; font-weight: 700; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; }
    .spec-value { font-size: 13px; font-weight: 600; color: var(--gray-800); }

    /* Features */
    .features-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .features-list li {
      font-size: 14px;
      color: var(--gray-600);
      padding-left: 22px;
      position: relative;
      line-height: 1.5;
    }
    .features-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--green);
      font-weight: 700;
    }

    /* FAQs */
    .faq-list { display: flex; flex-direction: column; gap: 8px; }
    .faq-item { border: 1px solid var(--gray-200); border-radius: 10px; overflow: hidden; }
    .faq-question {
      width: 100%;
      background: var(--gray-100);
      border: none;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--gray-800);
      cursor: pointer;
      text-align: left;
      gap: 12px;
      transition: background 0.15s;
    }
    .faq-question:hover { background: var(--mauve-light); }
    .faq-question[aria-expanded="true"] { background: var(--mauve-light); color: var(--mauve); }
    .faq-icon { font-size: 20px; font-weight: 300; flex-shrink: 0; color: var(--mauve); transition: transform 0.2s; }
    .faq-answer { padding: 14px 16px; background: var(--white); }
    .faq-answer p { font-size: 14px; color: var(--gray-600); line-height: 1.7; }

    /* Box contents */
    .box-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .box-list li {
      font-size: 14px;
      color: var(--gray-600);
      padding: 10px 14px;
      background: var(--gray-100);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .box-list li::before { content: '📦'; font-size: 16px; }

    /* Disclaimer */
    .disclaimer-section { background: #fffbeb; border-color: #fcd34d; }
    .disclaimer-text { font-size: 13px; color: #78350f; line-height: 1.7; }

    /* SEO meta preview */
    .seo-preview-section {
      background: var(--white);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--gray-200);
      margin-bottom: 16px;
    }
    .seo-preview-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--gray-800);
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--mauve-light);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .seo-badge {
      background: var(--mauve);
      color: var(--white);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }
    .google-preview {
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      padding: 16px;
      background: var(--white);
    }
    .google-url { font-size: 12px; color: #202124; margin-bottom: 2px; }
    .google-title { font-size: 18px; color: #1a0dab; margin-bottom: 4px; font-weight: 400; line-height: 1.3; }
    .google-title:hover { text-decoration: underline; cursor: pointer; }
    .google-desc { font-size: 13px; color: #4d5156; line-height: 1.5; }

    /* Responsive */
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; display: flex; flex-wrap: wrap; gap: 8px; }
      .sidebar .product-card { width: calc(50% - 4px); }
      .primary-section { grid-template-columns: 1fr; }
      .specs-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .specs-grid { grid-template-columns: 1fr 1fr; }
      .sidebar .product-card { width: 100%; }
    }
  </style>
</head>
<body>

  <!-- Top Nav -->
  <nav class="top-nav">
    <div class="nav-logo">OZI<span>.in</span></div>
    <span class="nav-breadcrumb">
      <a href="/pdp-preview">All Products</a> / ${product.category} / ${product.brand}
    </span>
    <span class="nav-delivery">⚡ 60-Min Delivery</span>
  </nav>

  <div class="layout">

    <!-- Sidebar: product switcher -->
    <aside class="sidebar">
      <p class="sidebar-title">Test Products</p>
      ${productListItems}
    </aside>

    <!-- Main PDP content -->
    <main class="main-content">

      <!-- Primary Section -->
      <div class="primary-section">
        <div class="product-image-placeholder">
          <span class="img-icon">🖼</span>
          <span>Product Image</span>
        </div>
        <div class="product-info">
          <span class="product-brand">${product.brand}</span>
          <span class="category-badge">${product.category}</span>
          <h1 class="product-name">${product.name}</h1>
          <p class="product-short-desc">${product.short_description}</p>
          <div class="delivery-badge">⚡ 60-Minute Delivery</div>
          <button class="add-to-cart-btn">ADD TO CART</button>
        </div>
      </div>

      <!-- Long Description -->
      <section class="pdp-section" id="description">
        <h2 class="section-title">Product Description</h2>
        <div class="long-desc">${longDescParagraphs}</div>
      </section>

      <!-- Specifications -->
      <section class="pdp-section" id="specifications">
        <h2 class="section-title">Product Specifications</h2>
        <div class="specs-grid">${renderSpecifications(product.specifications)}</div>
      </section>

      <!-- Features (category-specific) -->
      ${renderFeatures(product.features)}

      <!-- FAQs with schema markup (category-specific) -->
      ${renderFAQs(product.faqs, product.name)}

      <!-- What's in the box (category-specific) -->
      ${renderWhatsInTheBox(product.whats_in_the_box)}

      <!-- Disclaimer -->
      ${renderDisclaimer(
        product.disclaimer ||
          'Product color may slightly vary due to photographic lighting sources or your device\'s display settings. Always consult your pediatrician before use for infants under 12 months.'
      )}

      <!-- SEO Metadata Preview (dev/test helper) -->
      <div class="seo-preview-section">
        <h2 class="seo-preview-title">Google Search Preview <span class="seo-badge">SEO</span></h2>
        <div class="google-preview">
          <p class="google-url">ozi.in › ${product.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')} › ${product.product_id}</p>
          <p class="google-title">${product.seo.meta_title}</p>
          <p class="google-desc">${product.seo.meta_description}</p>
        </div>
      </div>

    </main>
  </div>

  <script>
    function toggleFaq(index) {
      const answer = document.getElementById('faq-answer-' + index);
      const icon = document.getElementById('faq-icon-' + index);
      const button = answer.previousElementSibling;
      const isHidden = answer.hidden;
      answer.hidden = !isHidden;
      icon.textContent = isHidden ? '−' : '+';
      button.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    }
  </script>

</body>
</html>`;
}

module.exports = { renderPage };
