import rss from '@astrojs/rss';
import { t } from '../../i18n/translations';
import { getLocalizedBlogPosts } from '../../i18n/content';

export const prerender = true;

export async function GET(context) {
	const posts = await getLocalizedBlogPosts('ar');
	return rss({
		title: t('ar', 'site.title'),
		description: t('ar', 'site.description'),
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/ar/blog/${post.id.replace(/^ar\//, '')}/`,
		})),
		customData: `<language>ar-ae</language>`,
	});
}
