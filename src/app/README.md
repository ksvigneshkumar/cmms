# App Routing Directory (`src/app/`)

This directory contains the Next.js App Router structure. Next.js uses file-system based routing where folders define routes and `page.js` files define the UI for those routes.

## Folder Structure

- **`(dashboard)/`**: This is a Route Group. It allows us to apply a shared layout (`layout.js`) to all routes inside it (like `/dashboard`, `/assets`, `/work-orders`) without affecting the URL structure.
- **`admin/`**: Contains administrative routes (if any).
- **`auth/`**: Contains authentication routes like login, signup, and update-password.
- **`globals.css`**: The global Tailwind CSS file.
- **`layout.js`**: The Root Layout that wraps the entire application (HTML and body tags).
- **`page.js`**: The landing/home page of the application (typically redirects to login or dashboard).
