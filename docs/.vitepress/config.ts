import { defineConfig } from "vitepress";

const sidebar = [
  {
    text: "Welcome",
    collapsed: true,
    items: [
      { text: "Introduction", link: "/welcome/introduction" },
      { text: "Features", link: "/welcome/features" },
      { text: "Screenshots", link: "/welcome/screenshots" },
      { text: "Quick Start", link: "/quick-start" },
    ],
  },
  {
    text: "User Guides",
    collapsed: true,
    items: [
      { text: "Dashboard", link: "/user-guides/dashboard" },
      { text: "Students", link: "/user-guides/students" },
      { text: "Locations", link: "/user-guides/locations" },
      { text: "Classes & Schedule", link: "/user-guides/classes" },
      { text: "Attendance & Check-in", link: "/user-guides/attendance" },
      { text: "Belts & Gradings", link: "/user-guides/belts" },
      { text: "Importing History", link: "/user-guides/importing-history" },
      { text: "Memberships & Payments", link: "/user-guides/memberships" },
      { text: "Communication", link: "/user-guides/communication" },
      { text: "Trials & Leads", link: "/user-guides/trials" },
      { text: "Member Portal", link: "/user-guides/member-portal" },
      { text: "RBAC & Roles", link: "/user-guides/rbac" },
    ],
  },
  {
    text: "Configuration",
    collapsed: true,
    items: [
      { text: "Admin Overview", link: "/configuration/overview" },
      { text: "General", link: "/configuration/general" },
      { text: "Appearance", link: "/configuration/appearance" },
      { text: "Storage", link: "/configuration/storage" },
      { text: "Memberships", link: "/configuration/memberships" },
      { text: "Communication", link: "/configuration/communication" },
      { text: "Email", link: "/configuration/email" },
      { text: "Templates", link: "/configuration/templates" },
      { text: "Email Log", link: "/configuration/email-log" },
      { text: "Users & Roles", link: "/configuration/users-roles" },
      { text: "Rate Limits", link: "/configuration/rate-limits" },
      { text: "Audit Log", link: "/configuration/audit" },
      { text: "Scheduling", link: "/configuration/scheduling" },
    ],
  },
  {
    text: "Deployment",
    collapsed: true,
    items: [
      { text: "Docker Compose", link: "/deployment/docker" },
      { text: "Lite Mode (Embedded)", link: "/deployment/lite" },
      { text: "Reverse Proxy", link: "/deployment/reverse-proxy" },
      { text: "Backups", link: "/deployment/backups" },
    ],
  },
  {
    text: "Advanced",
    collapsed: true,
    items: [
      { text: "Cron & Scheduler", link: "/advanced/cron" },
      { text: "Security", link: "/advanced/security" },
      { text: "Dual-Mode Database", link: "/advanced/dual-mode-database" },
    ],
  },
  {
    text: "FAQ",
    link: "/faq",
  },
];

export default defineConfig({
  title: "Mitch‑Dojo",
  description:
    "Open-source, self-hosted dojo management — students, classes, attendance, belts, memberships, and communication",
  lang: "en-US",
  srcDir: ".",
  base: "/",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
    ["meta", { name: "theme-color", content: "#dc2626" }],
  ],

  themeConfig: {
    logo: "/favicon.svg",
    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      {
        text: "GitHub",
        link: "https://github.com/mitchelljfranklin/mitch-dojo",
      },
    ],

    sidebar,

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mitchelljfranklin/mitch-dojo",
      },
    ],

    editLink: {
      pattern:
        "https://github.com/mitchelljfranklin/mitch-dojo/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: [2, 3],

    footer: {
      message: "Open-source, self-hosted dojo management software.",
    },
  },

  vite: {
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
