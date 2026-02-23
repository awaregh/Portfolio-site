import { PrismaClient, UserRole, TenantPlan } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      plan: TenantPlan.PRO,
      settings: {
        maxSites: 10,
        maxPagesPerSite: 50,
        allowCustomDomains: true,
      },
    },
  });

  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id})`);

  const passwordHash = await bcrypt.hash("demo-password-123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@demo-agency.com" },
    update: {},
    create: {
      email: "admin@demo-agency.com",
      passwordHash,
      name: "Demo Admin",
      role: UserRole.ADMIN,
      tenantId: tenant.id,
    },
  });

  console.log(`  ✓ User: ${user.email} (${user.role})`);

  const site = await prisma.site.upsert({
    where: { subdomain: "demo-portfolio" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Portfolio",
      slug: "portfolio",
      subdomain: "demo-portfolio",
      settings: {
        theme: {
          primaryColor: "#2563eb",
          secondaryColor: "#7c3aed",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          fontHeading: "Inter",
          fontBody: "Inter",
        },
        navigation: [
          { label: "Home", path: "/" },
          { label: "About", path: "/about" },
          { label: "Contact", path: "/contact" },
        ],
        footer: {
          text: "© 2024 Demo Portfolio. All rights reserved.",
          links: [
            { label: "Privacy", path: "/privacy" },
            { label: "Terms", path: "/terms" },
          ],
        },
      },
    },
  });

  console.log(`  ✓ Site: ${site.name} (subdomain: ${site.subdomain})`);

  const homeContent = {
    sections: [
      {
        type: "hero",
        props: {
          heading: "Welcome to My Portfolio",
          subheading:
            "I build beautiful, performant web experiences that delight users and drive results.",
          ctaText: "View My Work",
          ctaLink: "/about",
          backgroundImage: null,
          alignment: "center",
        },
      },
      {
        type: "features",
        props: {
          heading: "What I Do",
          columns: 3,
          items: [
            {
              icon: "code",
              title: "Web Development",
              description:
                "Full-stack development with modern frameworks and best practices.",
            },
            {
              icon: "palette",
              title: "UI/UX Design",
              description:
                "User-centered design that balances aesthetics with usability.",
            },
            {
              icon: "rocket",
              title: "Performance",
              description:
                "Optimized applications that load fast and run smoothly.",
            },
          ],
        },
      },
      {
        type: "text",
        props: {
          heading: "My Approach",
          body: "I believe in writing clean, maintainable code that stands the test of time. Every project starts with understanding the problem, designing a thoughtful solution, and executing with precision.",
          alignment: "left",
        },
      },
    ],
  };

  const aboutContent = {
    sections: [
      {
        type: "hero",
        props: {
          heading: "About Me",
          subheading:
            "A passionate developer with 8+ years of experience building for the web.",
          ctaText: null,
          ctaLink: null,
          backgroundImage: null,
          alignment: "center",
        },
      },
      {
        type: "text",
        props: {
          heading: "Background",
          body: "I started my journey as a self-taught developer, building small websites for local businesses. Over the years, I've grown into a full-stack engineer working with startups and enterprises alike. I specialize in TypeScript, React, Node.js, and cloud infrastructure.",
          alignment: "left",
        },
      },
      {
        type: "cards",
        props: {
          heading: "Experience",
          columns: 2,
          items: [
            {
              title: "Senior Engineer at TechCorp",
              description:
                "Led a team of 5 engineers building a SaaS platform serving 50k+ users. Reduced page load times by 60% and improved deployment frequency from weekly to daily.",
              image: null,
              link: null,
            },
            {
              title: "Full-Stack Developer at StartupXYZ",
              description:
                "Built the core product from scratch, handling everything from database design to frontend implementation. Grew the platform from 0 to 10k users.",
              image: null,
              link: null,
            },
          ],
        },
      },
    ],
  };

  const contactContent = {
    sections: [
      {
        type: "hero",
        props: {
          heading: "Get In Touch",
          subheading:
            "I'd love to hear about your project. Let's build something great together.",
          ctaText: null,
          ctaLink: null,
          backgroundImage: null,
          alignment: "center",
        },
      },
      {
        type: "text",
        props: {
          heading: "Contact Information",
          body: "Feel free to reach out via email at hello@example.com or connect with me on LinkedIn. I typically respond within 24 hours.",
          alignment: "center",
        },
      },
      {
        type: "cta",
        props: {
          heading: "Ready to Start?",
          description:
            "Let's discuss your project and see how I can help bring your vision to life.",
          buttonText: "Send Email",
          buttonLink: "mailto:hello@example.com",
          variant: "primary",
        },
      },
    ],
  };

  const pages = [
    {
      path: "/",
      title: "Home",
      content: homeContent,
      seoTitle: "Demo Portfolio - Web Developer & Designer",
      seoDescription:
        "Portfolio of a full-stack web developer specializing in modern web experiences.",
      sortOrder: 0,
    },
    {
      path: "/about",
      title: "About",
      content: aboutContent,
      seoTitle: "About - Demo Portfolio",
      seoDescription:
        "Learn about my background, skills, and experience in web development.",
      sortOrder: 1,
    },
    {
      path: "/contact",
      title: "Contact",
      content: contactContent,
      seoTitle: "Contact - Demo Portfolio",
      seoDescription: "Get in touch to discuss your next web project.",
      sortOrder: 2,
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: {
        siteId_path: { siteId: site.id, path: page.path },
      },
      update: { content: page.content },
      create: {
        siteId: site.id,
        ...page,
      },
    });
    console.log(`  ✓ Page: ${page.title} (${page.path})`);
  }

  console.log("\n✅ Seeding complete!");
  console.log("\nDemo credentials:");
  console.log("  Email: admin@demo-agency.com");
  console.log("  Password: demo-password-123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
