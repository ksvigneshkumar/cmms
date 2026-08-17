# CMMS Web Application

This is a responsive Computerized Maintenance Management System (CMMS) built with [Next.js](https://nextjs.org).

## Project Structure

For developers onboarding to this project, here is a quick overview of the folder structure to help you understand where files are located:

```text
cmms/
├── scripts/
│   └── database/      # Database seeding, migration, and setup scripts (.sql & .js)
├── src/
│   ├── app/           # Next.js App Router (Pages & Layouts)
│   │   ├── (dashboard)/ # Protected dashboard routes and global layout
│   │   ├── admin/     # Admin-specific routes
│   │   └── auth/      # Authentication routes (login, update-password)
│   ├── components/    # Reusable React components
│   │   └── layout/    # Structural shell components (Sidebar, TopNav, Mobile Context)
│   └── lib/           # Utilities and Integrations
│       ├── supabase.js# Supabase client configuration
│       └── utils.js   # Helper functions (e.g., Tailwind class merging)
└── public/            # Static assets like images and fonts
```
*Note: You can find additional `README.md` files inside `src/app`, `src/components`, and `src/lib` for more specific details.*

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
