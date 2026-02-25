import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// WRP Blog collection
const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.string().optional(),
			category: z.enum(['guide', 'news', 'update', 'event', 'listicle']).default('guide'),
			tags: z.array(z.string()).default([]),
			author: z.string().default('WRP Dubai'),
			readingTime: z.number().optional(),
			featured: z.boolean().default(false),
			relatedServices: z.array(z.enum([
				'ceramic-coating',
				'paint-protection-film',
				'polish',
				'window-film',
				'premium-car-wash',
				'leather-upholstery',
				'car-mats',
				'graphene-coating',
			])).default([]),
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
		mainImageAlt: z.string().optional(),
		// Icon features (4 features with icons)
		iconFeatures: z.array(z.object({
			icon: z.string(), // lucide icon name
			title: z.string(),
			description: z.string(),
		})).optional(),
		// Pricing display
		startingPrice: z.number().optional(), // "Starting from" price shown on page
		showPackages: z.boolean().default(false), // Show full package breakdown (e.g. car wash)
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
				image: z.string().optional(),
				imageAlt: z.string().optional(),
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

// Portfolio collection
const portfolio = defineCollection({
	loader: glob({ base: './src/content/portfolio', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		subtitle: z.string(),
		vehicle: z.object({
			make: z.string(),
			model: z.string(),
			year: z.number(),
		}),
		services: z.array(z.string()),
		heroImage: z.string(),
		gallery: z.array(z.string()),
		description: z.string(),
		completionDate: z.coerce.date(),
		featured: z.boolean().default(false),
	}),
});

export const collections = { blog, services, portfolio };
