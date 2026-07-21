/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Dende's card/list data ships as raw .tsv files, imported as text.
    config.module.rules.push({ test: /\.tsv$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
