import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Keep blog collection for reference/future use
const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

// WRP Services collection
const services = defineCollection({
	loader: glob({ base: './src/content/services', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		subtitle: z.string(),
		description: z.string(),
		heroImage: z.string(),
		price: z.number().optional(),
		// Main description section
		mainHeading: z.string().optional(),
		mainDescription1: z.string().optional(),
		mainDescription2: z.string().optional(),
		mainImage: z.string().optional(),
		// Icon features (4 features with icons)
		iconFeatures: z.array(z.object({
			icon: z.string(), // lucide icon name
			title: z.string(),
			description: z.string(),
		})).optional(),
		// Packages with badges
		packagesHeading: z.string().optional(),
		packagesSubheading: z.string().optional(),
		packages: z.array(z.object({
			name: z.string(),
			price: z.number(),
			badge: z.string().optional(), // "RECOMMENDED", "BEST VALUE", etc.
			features: z.array(z.string()),
		})).optional(),
		// Additional content section (service-specific)
		additionalSection: z.object({
			heading: z.string(),
			subheading: z.string().optional(),
			cards: z.array(z.object({
				title: z.string(),
				description: z.string(),
				solution: z.string().optional(),
			})),
		}).optional(),
		// Process steps
		processHeading: z.string().optional(),
		processSubheading: z.string().optional(),
		process: z.array(z.object({
			step: z.number(),
			title: z.string(),
			description: z.string(),
		})).optional(),
		// Benefits (if additional section isn't used)
		benefits: z.array(z.object({
			title: z.string(),
			description: z.string(),
		})).optional(),
		// FAQs
		faqs: z.array(z.object({
			question: z.string(),
			answer: z.string(),
		})),
		// Final CTA customization
		ctaHeading: z.string().optional(),
		ctaDescription: z.string().optional(),
	}),
});

export const collections = { blog, services };
