import {
  PageContent,
  SiteSettings,
  ContentSection,
  HeroSectionProps,
  TextSectionProps,
  FeaturesSectionProps,
  CardsSectionProps,
  ImageSectionProps,
  CtaSectionProps,
  NavigationItem,
} from "../types";

interface PageData {
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: PageContent;
}

interface SiteData {
  name: string;
  subdomain: string;
}

/**
 * Renders a full HTML page from structured JSON content.
 */
export function renderPage(page: PageData, site: SiteData, settings: SiteSettings): string {
  const theme = settings.theme ?? {
    primaryColor: "#2563eb",
    secondaryColor: "#7c3aed",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    fontHeading: "Inter",
    fontBody: "Inter",
  };

  const navigation = settings.navigation ?? [];
  const footer = settings.footer;
  const sections = page.content?.sections ?? [];

  const renderedSections = sections.map((s) => renderSection(s, theme)).join("\n");
  const navHtml = renderNavigation(navigation, site.name, theme, page.path);
  const footerHtml = footer ? renderFooter(footer.text, footer.links, theme) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.seoTitle || page.title)}</title>
  <meta name="description" content="${escapeHtml(page.seoDescription || "")}">
  <meta property="og:title" content="${escapeHtml(page.seoTitle || page.title)}">
  <meta property="og:description" content="${escapeHtml(page.seoDescription || "")}">
  <meta property="og:type" content="website">
  <meta name="generator" content="SaaS Website Builder">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontHeading)}:wght@400;600;700&family=${encodeURIComponent(theme.fontBody)}:wght@400;500&display=swap" rel="stylesheet">
  <style>
    ${generateCSS(theme)}
  </style>
</head>
<body>
  ${navHtml}
  <main>
    ${renderedSections}
  </main>
  ${footerHtml}
</body>
</html>`;
}

function generateCSS(theme: SiteSettings["theme"]): string {
  return `
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --color-primary: ${theme.primaryColor};
      --color-secondary: ${theme.secondaryColor};
      --color-bg: ${theme.backgroundColor};
      --color-text: ${theme.textColor};
      --font-heading: '${theme.fontHeading}', system-ui, sans-serif;
      --font-body: '${theme.fontBody}', system-ui, sans-serif;
    }
    body {
      font-family: var(--font-body);
      color: var(--color-text);
      background-color: var(--color-bg);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); line-height: 1.2; }
    a { color: var(--color-primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; display: block; }

    /* Navigation */
    .site-nav {
      display: flex; align-items: center; justify-content: space-between;
      max-width: 1200px; margin: 0 auto; padding: 1rem 2rem;
    }
    .site-nav__brand { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--color-text); }
    .site-nav__links { display: flex; gap: 1.5rem; list-style: none; }
    .site-nav__link { color: var(--color-text); font-size: 0.95rem; opacity: 0.8; transition: opacity 0.2s; }
    .site-nav__link:hover, .site-nav__link--active { opacity: 1; text-decoration: none; }
    .site-nav__link--active { font-weight: 600; border-bottom: 2px solid var(--color-primary); }
    .site-header { border-bottom: 1px solid #e5e7eb; }

    /* Sections */
    .section { padding: 4rem 2rem; }
    .section__inner { max-width: 1200px; margin: 0 auto; }
    .section__heading {
      font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem;
    }

    /* Hero */
    .hero {
      text-align: center; padding: 6rem 2rem;
      background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
      color: #fff;
    }
    .hero--left { text-align: left; }
    .hero--right { text-align: right; }
    .hero__heading { font-size: 3rem; font-weight: 700; margin-bottom: 1rem; }
    .hero__subheading { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; max-width: 600px; }
    .hero--center .hero__subheading { margin-left: auto; margin-right: auto; }
    .hero__cta {
      display: inline-block; padding: 0.75rem 2rem; font-size: 1rem; font-weight: 600;
      background: #fff; color: var(--color-primary); border-radius: 0.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .hero__cta:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-decoration: none; }

    /* Text block */
    .text-block__body { font-size: 1.1rem; line-height: 1.8; max-width: 800px; }
    .text-block--center { text-align: center; }
    .text-block--center .text-block__body { margin: 0 auto; }
    .text-block--right { text-align: right; }
    .text-block--right .text-block__body { margin-left: auto; }

    /* Feature grid */
    .features__grid { display: grid; gap: 2rem; }
    .features__grid--2 { grid-template-columns: repeat(2, 1fr); }
    .features__grid--3 { grid-template-columns: repeat(3, 1fr); }
    .features__grid--4 { grid-template-columns: repeat(4, 1fr); }
    .feature-card { padding: 2rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; }
    .feature-card__icon { font-size: 2rem; margin-bottom: 1rem; }
    .feature-card__title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    .feature-card__desc { font-size: 0.95rem; opacity: 0.8; line-height: 1.6; }

    /* Cards */
    .cards__grid { display: grid; gap: 2rem; }
    .cards__grid--2 { grid-template-columns: repeat(2, 1fr); }
    .cards__grid--3 { grid-template-columns: repeat(3, 1fr); }
    .cards__grid--4 { grid-template-columns: repeat(4, 1fr); }
    .card { border: 1px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; }
    .card__image { width: 100%; height: 200px; object-fit: cover; }
    .card__body { padding: 1.5rem; }
    .card__title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .card__desc { font-size: 0.95rem; opacity: 0.8; line-height: 1.6; }

    /* Image */
    .image-section { text-align: center; }
    .image-section__img { border-radius: 0.5rem; margin: 0 auto; }
    .image-section--full .image-section__img { width: 100%; border-radius: 0; }
    .image-section__caption { margin-top: 0.75rem; font-size: 0.9rem; opacity: 0.7; }

    /* CTA */
    .cta-section { text-align: center; padding: 4rem 2rem; background: #f9fafb; border-radius: 1rem; }
    .cta-section__heading { font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; }
    .cta-section__desc { font-size: 1.1rem; opacity: 0.8; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
    .cta-section__btn {
      display: inline-block; padding: 0.875rem 2.5rem; font-size: 1rem; font-weight: 600;
      border-radius: 0.5rem; transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-section__btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-decoration: none; }
    .cta-section__btn--primary { background: var(--color-primary); color: #fff; }
    .cta-section__btn--secondary { background: var(--color-secondary); color: #fff; }
    .cta-section__btn--outline { border: 2px solid var(--color-primary); color: var(--color-primary); background: transparent; }

    /* Footer */
    .site-footer { border-top: 1px solid #e5e7eb; padding: 2rem; text-align: center; font-size: 0.9rem; opacity: 0.7; }
    .site-footer__links { display: flex; justify-content: center; gap: 1.5rem; margin-top: 0.75rem; list-style: none; }

    /* Responsive */
    @media (max-width: 768px) {
      .hero__heading { font-size: 2rem; }
      .hero__subheading { font-size: 1rem; }
      .features__grid--3, .features__grid--4, .cards__grid--3, .cards__grid--4 { grid-template-columns: repeat(2, 1fr); }
      .site-nav { flex-direction: column; gap: 1rem; }
      .section { padding: 3rem 1rem; }
    }
    @media (max-width: 480px) {
      .features__grid--2, .features__grid--3, .features__grid--4,
      .cards__grid--2, .cards__grid--3, .cards__grid--4 { grid-template-columns: 1fr; }
    }
  `.trim();
}

function renderNavigation(
  items: NavigationItem[],
  siteName: string,
  _theme: SiteSettings["theme"],
  currentPath: string
): string {
  if (items.length === 0) return "";

  const links = items
    .map((item) => {
      const active = item.path === currentPath ? " site-nav__link--active" : "";
      return `<li><a href="${escapeHtml(item.path)}" class="site-nav__link${active}">${escapeHtml(item.label)}</a></li>`;
    })
    .join("\n          ");

  return `
  <header class="site-header">
    <nav class="site-nav">
      <a href="/" class="site-nav__brand">${escapeHtml(siteName)}</a>
      <ul class="site-nav__links">
          ${links}
      </ul>
    </nav>
  </header>`;
}

function renderFooter(text: string, links: NavigationItem[], _theme: SiteSettings["theme"]): string {
  const linkItems = links
    .map((l) => `<li><a href="${escapeHtml(l.path)}">${escapeHtml(l.label)}</a></li>`)
    .join("\n          ");

  return `
  <footer class="site-footer">
    <p>${escapeHtml(text)}</p>
    ${links.length > 0 ? `<ul class="site-footer__links">\n          ${linkItems}\n      </ul>` : ""}
  </footer>`;
}

function renderSection(section: ContentSection, theme: SiteSettings["theme"]): string {
  switch (section.type) {
    case "hero":
      return renderHero(section.props);
    case "text":
      return renderText(section.props);
    case "features":
      return renderFeatures(section.props);
    case "cards":
      return renderCards(section.props);
    case "image":
      return renderImage(section.props);
    case "cta":
      return renderCta(section.props, theme);
    default:
      return `<!-- Unknown section type -->`;
  }
}

function renderHero(props: HeroSectionProps): string {
  const alignClass = `hero--${props.alignment || "center"}`;
  const bgStyle = props.backgroundImage
    ? ` style="background-image: url('${escapeHtml(props.backgroundImage)}'); background-size: cover; background-position: center;"`
    : "";

  const ctaHtml = props.ctaText && props.ctaLink
    ? `\n      <a href="${escapeHtml(props.ctaLink)}" class="hero__cta">${escapeHtml(props.ctaText)}</a>`
    : "";

  return `
    <section class="hero ${alignClass}"${bgStyle}>
      <div class="section__inner">
        <h1 class="hero__heading">${escapeHtml(props.heading)}</h1>
        ${props.subheading ? `<p class="hero__subheading">${escapeHtml(props.subheading)}</p>` : ""}${ctaHtml}
      </div>
    </section>`;
}

function renderText(props: TextSectionProps): string {
  const alignClass = `text-block--${props.alignment || "left"}`;

  return `
    <section class="section text-block ${alignClass}">
      <div class="section__inner">
        ${props.heading ? `<h2 class="section__heading">${escapeHtml(props.heading)}</h2>` : ""}
        <p class="text-block__body">${escapeHtml(props.body)}</p>
      </div>
    </section>`;
}

function renderFeatures(props: FeaturesSectionProps): string {
  const columns = props.columns || 3;
  const items = (props.items || [])
    .map(
      (item) => `
        <div class="feature-card">
          <div class="feature-card__icon">${getIconEmoji(item.icon)}</div>
          <h3 class="feature-card__title">${escapeHtml(item.title)}</h3>
          <p class="feature-card__desc">${escapeHtml(item.description)}</p>
        </div>`
    )
    .join("\n");

  return `
    <section class="section">
      <div class="section__inner">
        ${props.heading ? `<h2 class="section__heading">${escapeHtml(props.heading)}</h2>` : ""}
        <div class="features__grid features__grid--${columns}">
          ${items}
        </div>
      </div>
    </section>`;
}

function renderCards(props: CardsSectionProps): string {
  const columns = props.columns || 2;
  const items = (props.items || [])
    .map(
      (item) => `
        <div class="card">
          ${item.image ? `<img class="card__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">` : ""}
          <div class="card__body">
            <h3 class="card__title">${item.link ? `<a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
            <p class="card__desc">${escapeHtml(item.description)}</p>
          </div>
        </div>`
    )
    .join("\n");

  return `
    <section class="section">
      <div class="section__inner">
        ${props.heading ? `<h2 class="section__heading">${escapeHtml(props.heading)}</h2>` : ""}
        <div class="cards__grid cards__grid--${columns}">
          ${items}
        </div>
      </div>
    </section>`;
}

function renderImage(props: ImageSectionProps): string {
  const fullClass = props.fullWidth ? " image-section--full" : "";

  return `
    <section class="section image-section${fullClass}">
      <div class="section__inner">
        <img class="image-section__img" src="${escapeHtml(props.src)}" alt="${escapeHtml(props.alt)}">
        ${props.caption ? `<p class="image-section__caption">${escapeHtml(props.caption)}</p>` : ""}
      </div>
    </section>`;
}

function renderCta(props: CtaSectionProps, _theme: SiteSettings["theme"]): string {
  const variant = props.variant || "primary";

  return `
    <section class="section">
      <div class="section__inner cta-section">
        <h2 class="cta-section__heading">${escapeHtml(props.heading)}</h2>
        ${props.description ? `<p class="cta-section__desc">${escapeHtml(props.description)}</p>` : ""}
        <a href="${escapeHtml(props.buttonLink)}" class="cta-section__btn cta-section__btn--${variant}">${escapeHtml(props.buttonText)}</a>
      </div>
    </section>`;
}

function getIconEmoji(iconName: string): string {
  const icons: Record<string, string> = {
    code: "💻",
    palette: "🎨",
    rocket: "🚀",
    star: "⭐",
    shield: "🛡️",
    zap: "⚡",
    heart: "❤️",
    globe: "🌍",
    mail: "✉️",
    phone: "📱",
    settings: "⚙️",
    check: "✅",
    chart: "📊",
    lock: "🔒",
    cloud: "☁️",
    users: "👥",
  };
  return icons[iconName] || "📌";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
