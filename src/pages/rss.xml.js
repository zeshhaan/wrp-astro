import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getLocalizedBlogPosts } from '../i18n/content';

export const prerender = true;

export async function GET(context) {
	const posts = await getLocalizedBlogPosts('en');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/blog/${post.id}/`,
		})),
		customData: `<language>en-ae</language>`,
	});
}
