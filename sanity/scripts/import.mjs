import { createClient } from '@sanity/client';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { randomBytes } from 'crypto';

const TOKEN = process.env.SANITY_TOKEN;
if (!TOKEN) {
  console.error('Missing SANITY_TOKEN. Run: SANITY_TOKEN=your_token node scripts/import.mjs');
  process.exit(1);
}

const client = createClient({
  projectId: 'rbmtiv02',
  dataset: 'production',
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

const key = () => randomBytes(6).toString('hex');

// ─── YouTube URL → embed URL ──────────────────────────────────────────────────
function toEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

// ─── Strip HTML to plain text ─────────────────────────────────────────────────
function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Simple HTML → Portable Text blocks ──────────────────────────────────────
function htmlToBlocks(html = '') {
  const blocks = [];
  if (!html.trim()) return blocks;

  // Normalise self-closing br
  html = html.replace(/<br\s*\/?>/gi, '\n');

  const blockRe = /<(p|blockquote|h[1-6]|ol|ul|li)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[3];

    let style = 'normal';
    if (tag === 'blockquote') style = 'blockquote';
    else if (tag === 'h2') style = 'h2';
    else if (tag === 'h3') style = 'h3';
    else if (tag === 'h4') style = 'h4';
    else if (tag === 'h5') style = 'h5';

    const children = inlineSpans(inner);
    const text = children.map(s => s.text).join('').trim();
    if (!text) continue;

    blocks.push({
      _type: 'block',
      _key: key(),
      style,
      markDefs: [],
      children,
    });
  }

  // Fallback: if regex found nothing, store as single plain block
  if (blocks.length === 0) {
    const text = stripHtml(html);
    if (text) {
      blocks.push({
        _type: 'block',
        _key: key(),
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: key(), text, marks: [] }],
      });
    }
  }

  return blocks;
}

function inlineSpans(html = '') {
  const spans = [];
  const marks = [];
  // Split on strong / em / a open+close tags
  const parts = html.split(/(<\/?(?:strong|b|em|i)>)/gi);
  for (const part of parts) {
    if (/^<(strong|b)>$/i.test(part)) { marks.push('strong'); continue; }
    if (/^<\/(strong|b)>$/i.test(part)) { const i = marks.lastIndexOf('strong'); if (i > -1) marks.splice(i, 1); continue; }
    if (/^<(em|i)>$/i.test(part)) { marks.push('em'); continue; }
    if (/^<\/(em|i)>$/i.test(part)) { const i = marks.lastIndexOf('em'); if (i > -1) marks.splice(i, 1); continue; }
    const text = stripHtml(part);
    if (text) spans.push({ _type: 'span', _key: key(), text, marks: [...marks] });
  }
  return spans.length ? spans : [{ _type: 'span', _key: key(), text: '', marks: [] }];
}

// ─── Upload image from URL → Sanity asset reference ──────────────────────────
const uploadedImages = new Map(); // cache URL → asset ref to avoid duplicate uploads

async function uploadImage(url) {
  if (!url) return null;
  if (uploadedImages.has(url)) return uploadedImages.get(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'image.jpg';
    const asset = await client.assets.upload('image', buffer, { filename });
    const ref = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
    uploadedImages.set(url, ref);
    return ref;
  } catch (err) {
    console.warn(`  ⚠ Image upload failed (${url.slice(-40)}): ${err.message}`);
    return null;
  }
}

// ─── Parse CSV ────────────────────────────────────────────────────────────────
function loadCsv(path) {
  const raw = readFileSync(path, 'utf8');
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

// ─── Import devotionals ───────────────────────────────────────────────────────
async function importDevotionals(csvPath) {
  console.log('\n── Devotionals ──────────────────────────────────────');
  const rows = loadCsv(csvPath);
  console.log(`  ${rows.length} records found`);

  for (const row of rows) {
    const slug = row['Slug']?.trim();
    const title = row['Name']?.trim();
    if (!slug || !title) continue;

    process.stdout.write(`  • ${title.slice(0, 60)} … `);

    const image = await uploadImage(row['Main Image']);
    const body = htmlToBlocks(row['Main Content'] || '');
    const excerpt = stripHtml(row['Main Content'] || '').slice(0, 300);

    await client.createOrReplace({
      _type: 'devotional',
      _id: `devotional-${slug}`,
      title,
      slug: { _type: 'slug', current: slug },
      publishedAt: new Date(row['Published On']).toISOString(),
      ...(image && { image }),
      excerpt,
      body,
      author: 'Corville Peters',
    });

    console.log('✓');
  }
}

// ─── Import resources ─────────────────────────────────────────────────────────
async function importResources(csvPath) {
  console.log('\n── Resources ────────────────────────────────────────');
  const rows = loadCsv(csvPath);
  console.log(`  ${rows.length} records found`);

  for (const row of rows) {
    const slug = row['Slug']?.trim();
    const title = row['Name']?.trim();
    if (!slug || !title) continue;

    process.stdout.write(`  • ${title.slice(0, 60)} … `);

    const image = await uploadImage(row['Main Image']);
    const body = htmlToBlocks(row['Main Content'] || '');
    const excerpt = stripHtml(row['Main Content'] || '').slice(0, 300);

    await client.createOrReplace({
      _type: 'resource',
      _id: `resource-${slug}`,
      title,
      slug: { _type: 'slug', current: slug },
      publishedAt: new Date(row['Published On']).toISOString(),
      category: 'article',
      ...(image && { image }),
      excerpt,
      body,
    });

    console.log('✓');
  }
}

// ─── Import videos ────────────────────────────────────────────────────────────
async function importVideos(csvPath) {
  console.log('\n── Videos ───────────────────────────────────────────');
  const rows = loadCsv(csvPath);
  console.log(`  ${rows.length} records found`);

  for (const row of rows) {
    const slug = row['Slug']?.trim();
    const title = row['Name']?.trim();
    if (!slug || !title) continue;

    process.stdout.write(`  • ${title.slice(0, 60)} … `);

    const thumbnail = await uploadImage(row['Image']);
    const videoUrl = toEmbedUrl(row['Video URL']?.trim());

    await client.createOrReplace({
      _type: 'video',
      _id: `video-${slug}`,
      title,
      slug: { _type: 'slug', current: slug },
      publishedAt: new Date(row['Published On']).toISOString(),
      ...(videoUrl && { videoUrl }),
      ...(thumbnail && { thumbnail }),
      ...(row['Summary'] && { description: row['Summary'].trim() }),
    });

    console.log('✓');
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
const base = '/Users/joelpaolo/Downloads';

try {
  await importDevotionals(`${base}/Devotionals.csv`);
  await importResources(`${base}/Resources.csv`);
  await importVideos(`${base}/Videos.csv`);
  console.log('\n✅ Import complete!\n');
} catch (err) {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
}
