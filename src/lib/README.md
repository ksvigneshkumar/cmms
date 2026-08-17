# Library and Utilities (`src/lib/`)

This directory contains utility functions and third-party library configurations.

## Files

- **`supabase.js`**: Initializes and exports the Supabase client used for database queries and authentication. It automatically selects the standard client or the Service Role (admin) client depending on the environment context (Server vs Client).
- **`utils.js`**: Contains general utility functions, such as the `cn` function which merges Tailwind CSS classes conditionally using `clsx` and `tailwind-merge`.
