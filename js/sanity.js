/* Sanity CMS client — vanilla JS, no bundler required
   Project: rbmtiv02 | Dataset: production
*/

const SANITY = {
  projectId: 'rbmtiv02',
  dataset: 'production',
  apiVersion: '2024-01-01',
};

async function sanityFetch(query, params = {}) {
  const searchParams = new URLSearchParams({ query });
  Object.entries(params).forEach(([k, v]) => searchParams.set(`$${k}`, JSON.stringify(v)));

  const url = `https://${SANITY.projectId}.api.sanity.io/v${SANITY.apiVersion}/data/query/${SANITY.dataset}?${searchParams}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity fetch failed: ${res.status}`);
  const json = await res.json();
  return json.result;
}

function sanityImageUrl(ref, width = 800) {
  if (!ref) return '';
  // ref format: image-{id}-{dimensions}-{format}
  const [, id, dimensions, format] = ref.split('-');
  return `https://cdn.sanity.io/images/${SANITY.projectId}/${SANITY.dataset}/${id}-${dimensions}.${format}?w=${width}&auto=format`;
}

/* ===== QUERIES ===== */

const QUERIES = {
  videos: `*[_type == "video"] | order(publishedAt desc) {
    _id, title, slug, publishedAt,
    "thumbnail": thumbnail.asset._ref,
    videoUrl
  }`,

  videoBySlug: `*[_type == "video" && slug.current == $slug][0] {
    _id, title, publishedAt, videoUrl,
    "thumbnail": thumbnail.asset._ref,
    body
  }`,

  otherVideos: `*[_type == "video" && slug.current != $slug] | order(publishedAt desc) [0..5] {
    _id, title, slug,
    "thumbnail": thumbnail.asset._ref
  }`,

  devotionals: `*[_type == "devotional"] | order(publishedAt desc) {
    _id, title, slug, publishedAt,
    "image": image.asset._ref
  }`,

  devotionalBySlug: `*[_type == "devotional" && slug.current == $slug][0] {
    _id, title, publishedAt,
    "image": image.asset._ref,
    body
  }`,

  resources: `*[_type == "resource"] | order(publishedAt desc) {
    _id, title, slug, publishedAt, category,
    "image": image.asset._ref
  }`,

  articles: `*[_type == "resource" && category == "article"] | order(publishedAt desc) [0..6] {
    _id, title, slug
  }`,

  resourceBySlug: `*[_type == "resource" && slug.current == $slug][0] {
    _id, title, publishedAt, category,
    "image": image.asset._ref,
    body
  }`,
};

/* ===== RENDER HELPERS ===== */

function renderVideoCard(video) {
  const thumb = video.thumbnail
    ? sanityImageUrl(video.thumbnail, 600)
    : 'images/Resources.jpg';
  const slug = video.slug?.current || '#';
  return `
    <a href="/detail-video.html?slug=${slug}" class="cmsCard">
      <div class="cmsCardThumb">
        <img src="${thumb}" alt="${video.title}" loading="lazy">
      </div>
      <p class="cmsCardTitle">${video.title}</p>
    </a>`;
}

function renderDevotionalCard(item) {
  const img = item.image
    ? sanityImageUrl(item.image, 600)
    : 'images/Resources.jpg';
  const slug = item.slug?.current || '#';
  return `
    <a href="/detail-devotional.html?slug=${slug}" class="cmsCard">
      <div class="cmsCardThumb">
        <img src="${img}" alt="${item.title}" loading="lazy">
      </div>
      <p class="cmsCardTitle">${item.title}</p>
    </a>`;
}

function renderResourceCard(item) {
  const img = item.image
    ? sanityImageUrl(item.image, 600)
    : 'images/Resources.jpg';
  const slug = item.slug?.current || '#';
  return `
    <a href="/detail-story.html?slug=${slug}" class="cmsCard">
      <div class="cmsCardThumb">
        <img src="${img}" alt="${item.title}" loading="lazy">
      </div>
      <p class="cmsCardTitle">${item.title}</p>
    </a>`;
}

function renderArticleLink(item) {
  const slug = item.slug?.current || '#';
  return `
    <div class="resourcesArticleItem">
      <a href="/detail-story.html?slug=${slug}" class="resourcesArticleLink">${item.title}</a>
    </div>`;
}

function renderEmptyState(container, message = 'No items found.') {
  container.innerHTML = `<p class="cmsEmpty">${message}</p>`;
}

function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get('slug');
}

/* Portable Text renderer (plain text fallback for body blocks) */
function portableTextToHtml(blocks = []) {
  return blocks.map(block => {
    if (block._type !== 'block' || !block.children) return '';
    const text = block.children.map(span => span.text).join('');
    const style = block.style || 'normal';
    if (style === 'h1') return `<h1>${text}</h1>`;
    if (style === 'h2') return `<h2>${text}</h2>`;
    if (style === 'h3') return `<h3>${text}</h3>`;
    if (style === 'h4') return `<h4>${text}</h4>`;
    if (style === 'blockquote') return `<blockquote>${text}</blockquote>`;
    return `<p>${text}</p>`;
  }).join('\n');
}
