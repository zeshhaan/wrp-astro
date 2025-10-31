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
		packages: z.array(z.object({
			name: z.string(),
			price: z.number(),
			duration: z.string().optional(),
			features: z.array(z.string()),
		})).optional(),
		benefits: z.array(z.string()).optional(),
		process: z.array(z.object({
			step: z.number(),
			title: z.string(),
			description: z.string(),
		})).optional(),
		faqs: z.array(z.object({
			question: z.string(),
			answer: z.string(),
		})),
	}),
});

export const collections = { blog, services };
