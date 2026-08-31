import path from "node:path";
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone", allowedDevOrigins: ["10.77.90.249", "192.168.64.2"], turbopack: { root: path.join(__dirname) }, experimental: { proxyClientMaxBodySize: "30mb" } };
export default nextConfig;
