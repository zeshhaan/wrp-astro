# WRP Dubai - Priority SEO Tasks

**Created:** November 3, 2025
**Reference:** SEO_IMPLEMENTATION_PLAN.md

---

## 🔴 PRIORITY 1: DO NOW (Highest Impact, Low Effort)

**Estimated Time:** 4-6 hours
**SEO Impact:** Immediate rich results, star ratings in search

### Task 1.1: Enhance Homepage Schema
**File:** `src/components/Schema.astro`

**What to add:**
- ✅ WebSite schema (separate from LocalBusiness)
- ✅ AggregateRating (5.0 stars, 3 reviews)
- ✅ Review schemas (3 testimonials from homepage)
- ✅ Logo as ImageObject with dimensions
- ✅ Multiple images array
- ✅ Expand areaServed: Dubai, Sharjah, Ajman, Abu Dhabi
- ✅ Add Google Maps link to sameAs array
- ✅ Use dual type: ["LocalBusiness", "AutomotiveBusiness"]

**Expected Result:** ⭐⭐⭐⭐⭐ stars appear in Google search results

---

### Task 1.2: Add Service Schema to Service Pages
**File:** Create `src/components/ServiceSchema.astro`

**What to include:**
- Service type and name
- Provider (WRP Dubai)
- Area served
- Pricing range from packages
- Offers structure

**Apply to:** All 5 service pages

**Expected Result:** Service pages get rich snippets with pricing

---

### Task 1.3: Add Robots Meta Tag Control
**File:** `src/layouts/BaseLayout.astro`

**What to add:**
- robots prop (default: "index, follow")
- Enhanced googlebot directives
- max-snippet, max-image-preview controls

**Expected Result:** Better control over search appearance

---

## 🟡 PRIORITY 2: DO NEXT (Good Impact, Medium Effort)

**Estimated Time:** 8-10 hours
**SEO Impact:** Better navigation, brand recognition

### Task 2.1: Create Breadcrumb Component
**File:** Create `src/components/Breadcrumbs.astro`

**Features:**
- Visual breadcrumbs (clickable navigation)
- BreadcrumbList schema (JSON-LD)
- Responsive styling (sharp corners)

**Add to:**
- Service pages: Home > Services > [Service Name]
- Portfolio: Home > Portfolio
- About: Home > About
- Contact: Home > Contact

**Expected Result:** Breadcrumbs show in Google search results

---

### Task 2.2: Create WRP Brand Pages
**Files:**
- `src/pages/wrap.astro`
- `src/pages/reinforce.astro`
- `src/pages/protect.astro`

**Each page includes:**
- Hero explaining the concept
- 600-800 words content
- Related services cards
- 3-4 FAQs with FAQPage schema
- CTA section
- Internal links to service pages

**Expected Result:**
- Capture "WRP meaning" searches
- Build brand authority
- Create natural internal linking hubs

---

### Task 2.3: Add ContactPage & AboutPage Schemas
**Files:**
- `src/pages/contact-us.astro` - Add ContactPage schema
- `src/pages/more-about-wrp.astro` - Add AboutPage + Organization schema

**Expected Result:** Better structured data coverage

---

## 🟢 PRIORITY 3: DO LATER (Future Enhancement)

**Estimated Time:** 20+ hours
**SEO Impact:** Long-term traffic growth

### Task 3.1: Geographic Meta Tags
Add to BaseLayout when includeGeoTags prop is true:
- geo.region, geo.position, ICBM coordinates
- Low priority - minimal impact

### Task 3.2: Programmatic Pages - Tier 1
**20 pages:** Service + Location
- `/ceramic-coating-in-dubai`
- `/ppf-in-sharjah`
- etc.

**Later phase** - requires content strategy

### Task 3.3: Programmatic Pages - Tier 2
**240 pages:** Service + Location + Brand
- Much later - need to prove Tier 1 value first

---

## ⚡ QUICK WINS (Do These First!)

**Today (2-3 hours):**
1. ✅ Update Schema.astro with WebSite + Reviews + AggregateRating
2. ✅ Create ServiceSchema.astro component
3. ✅ Add Service schema to all 5 service pages

**This Week (4-6 hours):**
4. ✅ Create Breadcrumbs component
5. ✅ Add breadcrumbs to service pages
6. ✅ Add robots meta control to BaseLayout
7. ✅ Test with Google Rich Results Tool

**Next Week (6-8 hours):**
8. ✅ Create /wrap page
9. ✅ Create /reinforce page
10. ✅ Create /protect page
11. ✅ Add ContactPage schema
12. ✅ Add AboutPage schema

---

## 📊 Impact vs Effort Matrix

| Task | SEO Impact | Effort | Do When |
|------|-----------|--------|---------|
| Reviews + Rating Schema | ⭐⭐⭐⭐⭐ | 1 hour | 🔴 NOW |
| WebSite Schema | ⭐⭐⭐⭐ | 30 min | 🔴 NOW |
| Service Schema | ⭐⭐⭐⭐ | 2 hours | 🔴 NOW |
| Breadcrumbs | ⭐⭐⭐ | 2 hours | 🟡 NEXT |
| WRP Brand Pages | ⭐⭐⭐ | 6 hours | 🟡 NEXT |
| Robots Meta Control | ⭐⭐ | 1 hour | 🟡 NEXT |
| ContactPage Schema | ⭐⭐ | 30 min | 🟢 LATER |
| Geographic Meta Tags | ⭐ | 30 min | 🟢 LATER |
| Programmatic Tier 1 | ⭐⭐⭐⭐ | 20 hours | 🟢 LATER |
| Programmatic Tier 2 | ⭐⭐⭐ | 40 hours | 🟢 MUCH LATER |

---

## 🎯 Recommended Starting Point

**Start with Priority 1 tasks in this order:**

1. **Reviews + AggregateRating** (1 hour)
   - Biggest visual impact in search results
   - Uses existing testimonial data
   - Immediate implementation

2. **WebSite Schema** (30 min)
   - Ensures "WRP Dubai" site name consistency
   - Simple addition to homepage

3. **Service Schema** (2 hours)
   - Adds pricing info to search results
   - Reusable component for all services
   - Good ROI

4. **Test Everything** (1 hour)
   - Google Rich Results Test
   - Schema validator
   - Search Console check

**Total Time:** ~4.5 hours
**Expected Result:** Star ratings + enhanced snippets in search within 1-2 weeks

---

## ✅ Success Checklist

After completing Priority 1:
- [ ] Homepage shows 5-star rating in Google search
- [ ] Service pages have enhanced snippets with pricing
- [ ] Site name "WRP Dubai" displays consistently
- [ ] 0 schema validation errors
- [ ] Rich results eligible in Search Console

After completing Priority 2:
- [ ] Breadcrumbs display in search results
- [ ] /wrap, /reinforce, /protect pages indexed
- [ ] Brand recognition improves
- [ ] More internal linking paths

---

**Next Action:** Begin with Priority 1, Task 1.1 (Reviews + Rating)
