import type { NextConfig } from "next";

// The EC2 instance's public IP changes on every reboot, so it can't be
// hardcoded here. Discover it from the instance metadata service (IMDSv2)
// at dev-server startup instead; falls back to no extra origin when the
// metadata service isn't reachable (e.g. local development off EC2).
async function getEc2PublicIp(): Promise<string | null> {
  try {
    const tokenRes = await fetch("http://169.254.169.254/latest/api/token", {
      method: "PUT",
      headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
      signal: AbortSignal.timeout(1000),
    });
    const token = await tokenRes.text();
    const ipRes = await fetch("http://169.254.169.254/latest/meta-data/public-ipv4", {
      headers: { "X-aws-ec2-metadata-token": token },
      signal: AbortSignal.timeout(1000),
    });
    const ip = (await ipRes.text()).trim();
    return ip || null;
  } catch {
    return null;
  }
}

const nextConfig = async (): Promise<NextConfig> => {
  const ec2PublicIp = await getEc2PublicIp();
  return {
    // Docker 部署使用 standalone 模式，生成自包含的生产构建
    output: "standalone",
    // Allow the Next.js dev server (HMR + JS chunks) to be reached when the
    // site is accessed via the host's external IP instead of localhost.
    allowedDevOrigins: ec2PublicIp ? [ec2PublicIp] : [],
    // Client code calls the relative "/v1/*" path so no backend host is
    // baked into the bundle. Nginx already proxies that same-origin, but
    // this rewrite makes it work even when the frontend is hit directly
    // (e.g. port 3000) instead of through nginx on port 80.
    async rewrites() {
      return [
        {
          source: "/v1/:path*",
          destination: "http://web:8000/v1/:path*",
        },
      ];
    },
  };
};

export default nextConfig;
