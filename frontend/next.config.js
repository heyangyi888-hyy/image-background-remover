/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["antd", "@ant-design/icons", "@clerk/nextjs"],
};

module.exports = nextConfig;
