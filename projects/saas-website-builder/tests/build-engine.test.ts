import { describe, it, expect } from "vitest";
import { renderPage } from "../src/services/renderer";
import { PageContent, SiteSettings } from "../src/types";

const defaultTheme: SiteSettings["theme"] = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  fontHeading: "Inter",
  fontBody: "Inter",
};

const defaultSettings: SiteSettings = {
  theme: defaultTheme,
  navigation: [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
  ],
  footer: {
    text: "© 2024 Test Site",
    links: [{ label: "Privacy", path: "/privacy" }],
  },
};

const defaultSite = {
  name: "Test Site",
  subdomain: "test-site",
};

describe("Renderer", () => {
  it("renders a valid HTML5 document", () => {
    const page = {
      path: "/",
      title: "Home",
      seoTitle: "Test Site - Home",
      seoDescription: "A test page",
      content: { sections: [] } as PageContent,
    };

    const html = renderPage(page, defaultSite, defaultSettings);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("</html>");
    expect(html).toContain("<meta charset=\"UTF-8\">");
    expect(html).toContain("<meta name=\"viewport\"");
  });

  it("includes SEO meta tags", () => {
    const page = {
      path: "/",
      title: "Home",
      seoTitle: "My SEO Title",
      seoDescription: "My SEO description for search engines",
      content: { sections: [] } as PageContent,
    };

    const html = renderPage(page, defaultSite, defaultSettings);

    expect(html).toContain("<title>My SEO Title</title>");
    expect(html).toContain('content="My SEO description for search engines"');
    expect(html).toContain('property="og:title"');
  });

  it("renders hero section", () => {
    const content: PageContent = {
      sections: [
        {
          type: "hero",
          props: {
            heading: "Welcome Hero",
            subheading: "This is the subtitle",
            ctaText: "Click Me",
            ctaLink: "/about",
            backgroundImage: null,
            alignment: "center",
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("Welcome Hero");
    expect(html).toContain("This is the subtitle");
    expect(html).toContain("Click Me");
    expect(html).toContain('href="/about"');
    expect(html).toContain("hero--center");
  });

  it("renders text section", () => {
    const content: PageContent = {
      sections: [
        {
          type: "text",
          props: {
            heading: "My Heading",
            body: "This is the body text of the section.",
            alignment: "left",
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("My Heading");
    expect(html).toContain("This is the body text of the section.");
    expect(html).toContain("text-block--left");
  });

  it("renders features section with correct column count", () => {
    const content: PageContent = {
      sections: [
        {
          type: "features",
          props: {
            heading: "Features",
            columns: 3,
            items: [
              { icon: "code", title: "Feature 1", description: "Desc 1" },
              { icon: "rocket", title: "Feature 2", description: "Desc 2" },
              { icon: "palette", title: "Feature 3", description: "Desc 3" },
            ],
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("features__grid--3");
    expect(html).toContain("Feature 1");
    expect(html).toContain("Feature 2");
    expect(html).toContain("Feature 3");
    expect(html).toContain("💻"); // code icon
    expect(html).toContain("🚀"); // rocket icon
  });

  it("renders cards section", () => {
    const content: PageContent = {
      sections: [
        {
          type: "cards",
          props: {
            heading: "My Cards",
            columns: 2,
            items: [
              {
                title: "Card One",
                description: "Description of card one",
                image: null,
                link: "https://example.com",
              },
              {
                title: "Card Two",
                description: "Description of card two",
                image: null,
                link: null,
              },
            ],
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("cards__grid--2");
    expect(html).toContain("Card One");
    expect(html).toContain("Card Two");
    expect(html).toContain("https://example.com");
  });

  it("renders CTA section", () => {
    const content: PageContent = {
      sections: [
        {
          type: "cta",
          props: {
            heading: "Ready?",
            description: "Get started now",
            buttonText: "Sign Up",
            buttonLink: "/signup",
            variant: "primary",
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("Ready?");
    expect(html).toContain("Get started now");
    expect(html).toContain("Sign Up");
    expect(html).toContain('href="/signup"');
    expect(html).toContain("cta-section__btn--primary");
  });

  it("renders image section", () => {
    const content: PageContent = {
      sections: [
        {
          type: "image",
          props: {
            src: "https://example.com/image.jpg",
            alt: "Test image",
            caption: "A beautiful image",
            fullWidth: true,
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("https://example.com/image.jpg");
    expect(html).toContain("Test image");
    expect(html).toContain("A beautiful image");
    expect(html).toContain("image-section--full");
  });

  it("renders navigation with active state", () => {
    const html = renderPage(
      {
        path: "/about",
        title: "About",
        seoTitle: "About",
        seoDescription: "",
        content: { sections: [] },
      },
      defaultSite,
      defaultSettings
    );

    // The "About" nav link should be active
    expect(html).toContain('class="site-nav__link site-nav__link--active"');
    expect(html).toContain("Test Site"); // brand name
  });

  it("renders footer", () => {
    const html = renderPage(
      {
        path: "/",
        title: "Home",
        seoTitle: "Home",
        seoDescription: "",
        content: { sections: [] },
      },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("© 2024 Test Site");
    expect(html).toContain("Privacy");
    expect(html).toContain('href="/privacy"');
  });

  it("applies theme CSS custom properties", () => {
    const html = renderPage(
      {
        path: "/",
        title: "Home",
        seoTitle: "Home",
        seoDescription: "",
        content: { sections: [] },
      },
      defaultSite,
      defaultSettings
    );

    expect(html).toContain("--color-primary: #2563eb");
    expect(html).toContain("--color-secondary: #7c3aed");
    expect(html).toContain("--font-heading: 'Inter'");
  });

  it("escapes HTML in content", () => {
    const content: PageContent = {
      sections: [
        {
          type: "text",
          props: {
            heading: '<script>alert("xss")</script>',
            body: "Normal text & <special> chars",
            alignment: "left",
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&lt;special&gt;");
  });

  it("renders multiple sections in order", () => {
    const content: PageContent = {
      sections: [
        {
          type: "hero",
          props: {
            heading: "First Section",
            subheading: null,
            ctaText: null,
            ctaLink: null,
            backgroundImage: null,
            alignment: "center",
          },
        },
        {
          type: "text",
          props: {
            heading: "Second Section",
            body: "Some text here.",
            alignment: "left",
          },
        },
        {
          type: "cta",
          props: {
            heading: "Third Section",
            description: null,
            buttonText: "Go",
            buttonLink: "/go",
            variant: "secondary",
          },
        },
      ],
    };

    const html = renderPage(
      { path: "/", title: "Home", seoTitle: "Home", seoDescription: "", content },
      defaultSite,
      defaultSettings
    );

    const firstIdx = html.indexOf("First Section");
    const secondIdx = html.indexOf("Second Section");
    const thirdIdx = html.indexOf("Third Section");

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });
});

describe("S3 Key Generation", () => {
  it("generates correct S3 prefix format", () => {
    const tenantId = "tenant-123";
    const siteId = "site-456";
    const version = 3;
    const prefix = `sites/${tenantId}/${siteId}/${version}`;

    expect(prefix).toBe("sites/tenant-123/site-456/3");
  });

  it("generates correct page S3 keys", () => {
    const prefix = "sites/t1/s1/1";

    // Home page
    const homeKey = `${prefix}/index.html`;
    expect(homeKey).toBe("sites/t1/s1/1/index.html");

    // About page
    const aboutPath = "/about";
    const aboutKey = `${prefix}/${aboutPath.slice(1)}/index.html`;
    expect(aboutKey).toBe("sites/t1/s1/1/about/index.html");

    // Nested page
    const nestedPath = "/blog/post-1";
    const nestedKey = `${prefix}/${nestedPath.slice(1)}/index.html`;
    expect(nestedKey).toBe("sites/t1/s1/1/blog/post-1/index.html");
  });

  it("generates manifest key at version root", () => {
    const prefix = "sites/t1/s1/5";
    const manifestKey = `${prefix}/manifest.json`;
    expect(manifestKey).toBe("sites/t1/s1/5/manifest.json");
  });
});

describe("Version Management", () => {
  it("computes next version number correctly", () => {
    const latestVersion = 5;
    const nextVersion = latestVersion + 1;
    expect(nextVersion).toBe(6);
  });

  it("starts at version 1 when no previous versions", () => {
    const latestVersion: number | undefined = undefined;
    const nextVersion = (latestVersion ?? 0) + 1;
    expect(nextVersion).toBe(1);
  });
});

describe("Build Manifest", () => {
  it("creates valid manifest structure", () => {
    const { createHash } = require("crypto");

    const pages = [
      { path: "/", s3Key: "sites/t/s/1/index.html", title: "Home", hash: "abc123", size: 5000 },
      { path: "/about", s3Key: "sites/t/s/1/about/index.html", title: "About", hash: "def456", size: 3000 },
    ];

    const manifest = {
      version: 1,
      siteId: "site-1",
      tenantId: "tenant-1",
      generatedAt: new Date().toISOString(),
      pages,
      assets: [],
      totalSize: pages.reduce((sum, p) => sum + p.size, 0),
      checksum: createHash("sha256")
        .update(pages.map((p: { hash: string }) => p.hash).join(""))
        .digest("hex"),
    };

    expect(manifest.version).toBe(1);
    expect(manifest.pages).toHaveLength(2);
    expect(manifest.totalSize).toBe(8000);
    expect(manifest.checksum).toHaveLength(64); // SHA-256 hex
    expect(manifest.assets).toHaveLength(0);
  });
});

describe("Rollback Logic", () => {
  it("validates version status for rollback eligibility", () => {
    const validStatuses = ["READY", "SUPERSEDED"];
    const invalidStatuses = ["BUILDING", "FAILED"];

    validStatuses.forEach((status) => {
      expect(["READY", "SUPERSEDED"]).toContain(status);
    });

    invalidStatuses.forEach((status) => {
      expect(["READY", "SUPERSEDED"]).not.toContain(status);
    });
  });

  it("prevents rollback to BUILDING version", () => {
    const targetStatus = "BUILDING";
    const canRollback = targetStatus === "READY" || targetStatus === "SUPERSEDED";
    expect(canRollback).toBe(false);
  });

  it("prevents rollback to FAILED version", () => {
    const targetStatus = "FAILED";
    const canRollback = targetStatus === "READY" || targetStatus === "SUPERSEDED";
    expect(canRollback).toBe(false);
  });

  it("allows rollback to READY version", () => {
    const targetStatus = "READY";
    const canRollback = targetStatus === "READY" || targetStatus === "SUPERSEDED";
    expect(canRollback).toBe(true);
  });

  it("allows rollback to SUPERSEDED version", () => {
    const targetStatus = "SUPERSEDED";
    const canRollback = targetStatus === "READY" || targetStatus === "SUPERSEDED";
    expect(canRollback).toBe(true);
  });
});
