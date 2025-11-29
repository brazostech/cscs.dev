[![Netlify Status](https://api.netlify.com/api/v1/badges/2dcb81d1-35ab-4001-bf99-7deb67c5496a/deploy-status)](https://app.netlify.com/projects/cscsdev/deploys)
[![CI](https://github.com/The-Read-Onlys/cscs.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/The-Read-Onlys/cscs.dev/actions/workflows/ci.yml)

# College Station Computer Science (CSCS)

A community website for the local tech community in the Bryan-College Station area. Features a blog, newsletter signup, and event information.

## Tech Stack

- **[Astro](https://astro.build)** - Static site generator with React integration
- **[React 19](https://react.dev)** - Interactive components
- **[Tailwind CSS v4](https://tailwindcss.com)** - Utility-first styling
- **[Catalyst UI Kit](https://catalyst.tailwindui.com)** - Headless UI component library

## Getting Started

To get started with development, you'll need Podman and Podman Compose installed.

1.  **Start the Development Environment:**

    Run the following command to build the container images and start the development services (frontend and backend):

    ```bash
    podman-compose up --build -d
    ```

    - The frontend application will be accessible at `http://localhost:4321`. It supports hot-reloading: any changes you make to the source code on your host machine will automatically refresh in the browser.
    - The backend (PocketBase) will be accessible at `http://localhost:8090`.

2.  **Stop the Development Environment:**

    To stop and remove the running containers, use:

    ```bash
    podman-compose down
    ```

## Project Structure

```
/
├── src/
│   ├── pages/              # Routes (/, /blog, /blog/[slug])
│   ├── components/         # React and Astro components
│   │   ├── catalyst/       # Catalyst UI Kit components (28 files)
│   │   ├── Header.tsx      # Site navigation
│   │   ├── Hero.tsx        # Landing page hero
│   │   ├── Newsletter.tsx  # Email signup form
│   │   └── Footer.tsx      # Site footer
│   ├── content/
│   │   └── blog/           # Blog posts (Markdown)
│   ├── layouts/
│   │   └── Layout.astro    # Base HTML layout
│   └── styles/
│       └── global.css      # Tailwind imports
├── catalyst-ui-kit/        # Original Catalyst source files
└── public/                 # Static assets
```

## Using Catalyst UI Kit

The site uses [Catalyst UI Kit](https://catalyst.tailwindui.com), a collection of beautiful, accessible UI components built with Headless UI and Tailwind CSS.

### Available Components

All Catalyst components are in `src/components/catalyst/`:

- **Form Elements**: Button, Input, Textarea, Select, Checkbox, Radio, Switch, Combobox, Listbox
- **Layout**: Divider, Heading, Text, Badge, Avatar
- **Navigation**: Navbar, Sidebar, Pagination, Link
- **Feedback**: Alert, Dialog
- **Data Display**: Table, Description List, Fieldset

### Using Components

Import components from the catalyst directory:

```tsx
import { Button } from "./catalyst/button";
import { Input } from "./catalyst/input";
import { Heading, Subheading } from "./catalyst/heading";
import { Text } from "./catalyst/text";

export default function MyComponent() {
  return (
    <div>
      <Heading>Welcome</Heading>
      <Text>This is a paragraph of text.</Text>
      <Input type="email" placeholder="Enter email" />
      <Button color="indigo">Subscribe</Button>
    </div>
  );
}
```

### Documentation

Full documentation for all components: **[catalyst.tailwindui.com/docs](https://catalyst.tailwindui.com/docs)**

The documentation includes:

- Component APIs and props
- Usage examples
- Accessibility features
- Styling customization

### Customizing Components

The Catalyst components are source files in `src/components/catalyst/`, not npm packages. This means you can:

1. **Modify directly** - Edit component files to customize behavior or styling
2. **Extend components** - Create wrapper components with custom props
3. **Add variants** - Extend color schemes or add new button styles
4. **Change defaults** - Adjust sizing, spacing, or other defaults

Example customization:

```tsx
// Wrap a Catalyst component with custom defaults
import { Button as CatalystButton } from "./catalyst/button";

export function PrimaryButton(props) {
  return <CatalystButton color="indigo" {...props} />;
}
```

The original source files are preserved in `catalyst-ui-kit/` for reference.

## Adding Content

### Blog Posts

Create a new Markdown file in `src/content/blog/`:

```markdown
---
title: "Your Post Title"
description: "Brief description for SEO and previews"
pubDate: 2025-01-23
author: "Your Name"
tags: ["typescript", "tutorial"]
---

Your blog content here in Markdown...
```

The post will automatically appear at `/blog/your-filename` after running the dev server or build.

### Pages

Create a new `.astro` file in `src/pages/` for new routes:

```astro
---
import Layout from "../layouts/Layout.astro";
import Header from "../components/Header";
import Footer from "../components/Footer";
---

<Layout title="Page Title">
  <Header client:load />
  <!-- Your page content -->
  <Footer />
</Layout>
```

## Styling

The site uses Tailwind CSS v4 with a consistent design system:

- **Colors**: zinc (neutrals), indigo (accent)
- **Dark mode**: Automatic via `prefers-color-scheme`
- **Typography**: Tailwind Typography plugin for blog content
- **Responsive**: Mobile-first with sm/lg breakpoints

All Catalyst components include dark mode support by default.

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Catalyst UI Kit Docs](https://catalyst.tailwindui.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Headless UI](https://headlessui.dev)
