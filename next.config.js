/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/student', destination: '/app', permanent: true },
      { source: '/planner', destination: '/plan/week', permanent: true },
      { source: '/grocery', destination: '/plan/groceries', permanent: true },
      { source: '/pantry', destination: '/plan/pantry', permanent: true },
      { source: '/spending', destination: '/plan/budget', permanent: true },
      { source: '/browse', destination: '/discover', permanent: true },
      { source: '/meals', destination: '/library/created', permanent: true },
      { source: '/account', destination: '/settings/profile', permanent: true },
    ];
  },
};
module.exports = nextConfig;

