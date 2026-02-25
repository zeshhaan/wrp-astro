import reviewsData from '../../data/google-reviews.json';

export interface Review {
  reviewId: string;
  reviewerName: string;
  reviewerInfo: string;
  profilePhoto: string;
  profileLink: string;
  stars: number;
  date: string;
  text: string;
  images: string[];
  localImages: string[];
  localAvatar: string;
  likes: number;
  ownerResponse: string;
  ownerResponseDate: string;
  serviceTags: string[];
  highlightQuote: string;
  featured: boolean;
}

export interface ReviewBusiness {
  name: string;
  rating: number;
  totalReviews: number;
  address: string;
  phone: string;
  website: string;
  category: string;
}

export function getAllReviews(): Review[] {
  return reviewsData.reviews as Review[];
}

export function getBusiness(): ReviewBusiness {
  return reviewsData.business as ReviewBusiness;
}

/** Marketing-friendly review count (rounded up to nearest 10+) */
export function getDisplayCount(): string {
  const total = getBusiness().totalReviews;
  const rounded = Math.ceil(total / 10) * 10;
  return `${rounded}+`;
}

export function getReviewsWithImages(): Review[] {
  return getAllReviews().filter(r => r.localImages && r.localImages.length > 0);
}

export function getReviewsForService(serviceSlug: string): Review[] {
  const serviceReviews = getAllReviews().filter(r =>
    r.serviceTags?.includes(serviceSlug)
  );
  // If fewer than 2 service-specific reviews, supplement with top generic ones
  if (serviceReviews.length < 2) {
    const generic = getAllReviews()
      .filter(r => r.text.length > 100 && !serviceReviews.includes(r))
      .slice(0, 3 - serviceReviews.length);
    return [...serviceReviews, ...generic];
  }
  return serviceReviews;
}

export function getFeaturedReviews(): Review[] {
  return getAllReviews().filter(r => r.featured);
}

/** Pick the single best review for a given service (for blade inserts) */
export function getBestReviewForService(serviceSlug: string): Review | undefined {
  const reviews = getReviewsForService(serviceSlug);
  // Prefer one with images and a highlight quote
  return reviews.find(r => r.localImages?.length > 0 && r.highlightQuote)
    || reviews.find(r => r.highlightQuote)
    || reviews[0];
}

const serviceNameMap: Record<string, string> = {
  'ceramic-coating': 'ceramic coating',
  'paint-protection-film': 'paint protection film (PPF)',
  'polish': 'car polish and paint correction',
  'window-film': 'window tinting',
  'premium-car-wash': 'premium car wash and detailing',
  'leather-upholstery': 'leather and upholstery',
  'car-mats': 'custom car floor mats',
  'graphene-coating': 'graphene coating',
};

/** Build descriptive alt text for review images (SEO + AI-friendly) */
export function getReviewImageAlt(review: Review, photoIndex: number): string {
  const services = review.serviceTags
    ?.map(tag => serviceNameMap[tag] || tag.replace(/-/g, ' '))
    .join(' and ') || 'car detailing';
  const total = review.localImages?.length || 1;
  return `${review.reviewerName}'s vehicle after ${services} at WRP Dubai — verified customer review photo ${photoIndex + 1} of ${total}`;
}

/** Get reviews suitable for marquee display (compact, with text) */
export function getMarqueeReviews(): Review[] {
  return getAllReviews().filter(r => r.text.length > 50);
}

/** Top reviews for schema.org structured data */
export function getSchemaReviews(count = 10): Review[] {
  const scored = getAllReviews()
    .filter(r => r.text.length > 50)
    .map(r => ({
      review: r,
      score: (r.localImages?.length > 0 ? 3 : 0)
        + (r.likes || 0) * 2
        + Math.min(r.text.length / 200, 5)
        + (r.highlightQuote ? 2 : 0),
    }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.review);
}
