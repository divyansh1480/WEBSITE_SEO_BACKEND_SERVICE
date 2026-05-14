process.env.PORT = '3011';
const { server } = require('./server');

async function run() {
  const base = 'http://127.0.0.1:3011';

  const post = await fetch(`${base}/api/pdp/TST-001`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ short_description: 'Test product', meta_title: 'Test Meta' }),
  });
  const postBody = await post.text();

  const get = await fetch(`${base}/api/pdp/TST-001`);
  const getBody = await get.text();

  const patch = await fetch(`${base}/api/pdp/TST-001`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features: ['Fast shipping', 'COD available'] }),
  });
  const patchBody = await patch.text();

  const del = await fetch(`${base}/api/pdp/TST-001`, { method: 'DELETE' });
  const delBody = await del.text();

  console.log('POST', post.status, postBody);
  console.log('GET', get.status, getBody);
  console.log('PATCH', patch.status, patchBody);
  console.log('DELETE', del.status, delBody);
}

run()
  .catch((err) => {
    console.error('API test failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
  });
