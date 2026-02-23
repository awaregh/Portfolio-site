// ── Structured Page Content (from visual editor) ────────────────────

export interface HeroSectionProps {
  heading: string;
  subheading?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  backgroundImage?: string | null;
  alignment: "left" | "center" | "right";
}

export interface TextSectionProps {
  heading?: string | null;
  body: string;
  alignment: "left" | "center" | "right";
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesSectionProps {
  heading?: string | null;
  columns: 2 | 3 | 4;
  items: FeatureItem[];
}

export interface CardItem {
  title: string;
  description: string;
  image?: string | null;
  link?: string | null;
}

export interface CardsSectionProps {
  heading?: string | null;
  columns: 2 | 3 | 4;
  items: CardItem[];
}

export interface ImageSectionProps {
  src: string;
  alt: string;
  caption?: string | null;
  fullWidth: boolean;
}

export interface CtaSectionProps {
  heading: string;
  description?: string | null;
  buttonText: string;
  buttonLink: string;
  variant: "primary" | "secondary" | "outline";
}

export type ContentSection =
  | { type: "hero"; props: HeroSectionProps }
  | { type: "text"; props: TextSectionProps }
  | { type: "features"; props: FeaturesSectionProps }
  | { type: "cards"; props: CardsSectionProps }
  | { type: "image"; props: ImageSectionProps }
  | { type: "cta"; props: CtaSectionProps };

export interface PageContent {
  sections: ContentSection[];
}

// ── Site Settings ────────────────────────────────────────────────────

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface NavigationItem {
  label: string;
  path: string;
}

export interface FooterSettings {
  text: string;
  links: NavigationItem[];
}

export interface SiteSettings {
  theme: ThemeSettings;
  navigation: NavigationItem[];
  footer?: FooterSettings;
}

// ── Build Manifest ───────────────────────────────────────────────────

export interface ManifestPage {
  path: string;
  s3Key: string;
  title: string;
  hash: string;
  size: number;
}

export interface ManifestAsset {
  fileName: string;
  s3Key: string;
  contentType: string;
  hash: string;
  size: number;
}

export interface BuildManifest {
  version: number;
  siteId: string;
  tenantId: string;
  generatedAt: string;
  pages: ManifestPage[];
  assets: ManifestAsset[];
  totalSize: number;
  checksum: string;
}

// ── Deployment Status ────────────────────────────────────────────────

export enum DeploymentStatus {
  BUILDING = "BUILDING",
  READY = "READY",
  FAILED = "FAILED",
  SUPERSEDED = "SUPERSEDED",
}

// ── Auth / Request Context ───────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}
