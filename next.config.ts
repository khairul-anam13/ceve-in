import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["puppeteer-core", "docx"],
  // Bawaan 1 MB terlalu kecil untuk foto dari HP. Foto dikecilkan di browser, batas ini jaring pengaman.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default config;
