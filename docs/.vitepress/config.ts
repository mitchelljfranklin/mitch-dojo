import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "en-US",
  title: "Mitch-Dojo",
  description: "Open-source, self-hosted dojo management software",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture" },
    ],
    sidebar: [
      {
        text: "Getting started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Deployment", link: "/deployment" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Architecture", link: "/architecture" }],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/" }],
  },
});
