# WRP measurement

The goal is to learn which sources and pages produce enquiries, then compare
those enquiries with actual bookings. A click is not a conversation; an enquiry
is not a booking. GA4 cannot identify someone who reads Google reviews and walks
into the studio without leaving a linked enquiry or booking record.

## Events owned by this site

| Event | Trigger | method | form_id |
| --- | --- | --- | --- |
| phone_click | Telephone or WRP phone short-link click | phone | unset |
| whatsapp_click | WhatsApp or WRP WhatsApp short-link click | whatsapp | unset |
| generate_lead | Saved Studio hero action response | contact_form | hero |
| generate_lead | Successful existing homepage contact API response | contact_form | homepage |
| generate_lead | Successful existing or Studio contact-page API response | contact_form | contact_page |
| generate_lead | Saved Studio configurator action response | contact_form | configurator |
| generate_lead | WRP Tally form submission from tally.so | tally_popup | tally_popup |

Only event, method and the allowlisted form_id are pushed. Native `wrp:lead`
events must specify one of `hero`, `homepage`, `contact_page` or `configurator`
in `detail.form`; unknown values are ignored. Tally always uses the literal
`tally_popup` after verifying the message origin and configured form ID. Do not
send names, phone numbers, email, messages, Tally answers or prefilled WhatsApp
text to GA4. Contact clicks set form_id to null, clearing GTM's retained value
from any preceding lead. These changes preserve existing event names and methods.

The one-page configurator and the Studio homepage form send to the same
`quote` Astro Action as the hero form, and generate a lead event only when the
action answers `saved: true`. Worker Previews and Design Lab pages answer
`saved: false` (the form shows its preview note), so they never count. Rejected
requests, missing results, honeypot responses and WhatsApp handoffs never
generate the event either. The `homepage` value identifies both the existing
homepage forms and the Studio homepage form.

A popup appearing or opening the contact options is not a lead. Tally's browser
event confirms a Tally submission, not successful delivery of its webhook/email.
D1 is the operational lead record; browser analytics can miss submissions due to
blockers or departure. Native forms reject repeated submits while a request is
pending. The shared analytics listener is installed once across client-side
navigation. No additional form-submit or server-side GA4 event is added: do not
map GA4's automatic `form_submit` to `generate_lead`, as that can double-count and
include rejected forms. Browser events are not an exactly-once lead ledger;
repeated Tally messages or subsequent accepted submissions may count separately.

## Required form breakdown setup

The source emits form_id, but a dataLayer push alone does not forward it to GA4.
Before relying on the form breakdown:

1. Create a GTM Data Layer Variable named `DLV - form_id` using data-layer key
   `form_id` (version 2, no default value).
2. Add event parameter `form_id` = `{{DLV - form_id}}` to the existing WRP GA4
   event tag. Keep `method` and its existing event trigger unchanged; do not
   create a second conversion tag.
3. Register an event-scoped GA4 custom dimension such as **WRP form** with event
   parameter `form_id`, then use it to break down `generate_lead` reports.
4. Verify the five allowed values, no value on phone/WhatsApp events, and no
   events for rejected or demo submissions in GTM Preview and GA4 DebugView.

Treat the dashboard setup as separate from a source deployment. Existing
historical events cannot acquire this new parameter retroactively. Operational
first/latest-source attribution remains in the lead record and is not copied
into the GA4 payload.

## Live configuration

1. Google Analytics property `wrpdetailing.ae` uses web stream ID `15730942506`
   and measurement ID `G-DJ561RSC78`.
2. GTM container `GTM-WCQ2VMWM` loads the Google tag on Initialization - All
   Pages. Its GA4 event tag uses the Event variable, the `DLV - method` data
   layer variable, and custom-event trigger
   `^(phone_click|whatsapp_click|generate_lead)$`.
3. GA4 enhanced measurement owns initial and browser-history page views for
   Astro's ClientRouter. Do not add a separate GTM History Change page-view tag;
   overlapping strategies produce duplicate page views.
4. Clarity already loads in BaseLayout. Do not also install it in GTM. Moving it
   is optional and needs a coordinated removal of the current loader.
5. Check the site's privacy/consent configuration against the tags you enable.
   No consent-management implementation is included in this change.
6. After a production deployment, verify initial and browser-history page views,
   phone/WhatsApp clicks, accepted and rejected contact forms, and Tally
   submission in GTM Preview and GA4 DebugView. A dataLayer push alone does not
   prove GA4 received anything. Localhost and Workers preview URLs deliberately
   do not send analytics. Never broaden the committed hostname list.

## Google Business Profile and bookings

Use this URL for the profile's website link:

https://wrpdetailing.ae/?utm_source=google&utm_medium=organic&utm_campaign=google_business_profile&utm_content=website

If adding a separate appointment link to the contact page, use the same source,
medium and campaign with utm_content=appointment. Do not add UTMs to internal
website links. GA4 already understands campaign parameters; no custom attribution
cookie or source guessing is needed for GA4 source-to-enquiry reports. Do not
push the preserved operational fields back into GA4 as campaign parameters;
that can replace Analytics' own source classification.

Link WRP's Business Profile under GA4 Admin > Product links > Google Business
Profile links to see aggregate profile metrics. A call count is a call-button
click, and a directions request is not proof of a visit. Bookings in GBP require
a supported booking provider; adding GA4 does not create a booking integration.

Start with acquisition by campaign, landing page and generate_lead, with phone
and WhatsApp clicks as separate intent measures. Each lead notification now
contains signed `Booked` and `Lost` links. Opening one only shows a confirmation
page; the confirming POST records the first outcome and timestamp in D1. Repeat
clicks and the opposite action cannot overwrite it.

The site preserves a versioned attribution record for 90 days in first-party
browser storage and attaches it to both website contact submissions and Tally
quote requests. It contains:

- first touch: the first landing source, medium, campaign, page and external
  referring hostname;
- latest source: the most recent campaign or external referral before the lead;
- no names, contact details, full referring URLs or advertising click IDs.

Direct returns do not erase a known latest source. Values are parsed, bounded and
normalized again at the API boundary before D1 storage. This record belongs to
the operational lead and can later be copied or linked to a booking. It must not
be treated as proof that a review, direction request or untracked conversation
caused the sale.

Apply `migrations/0004_add_lead_attribution.sql` before deploying the matching
application code. The Tally form must contain its conventional `originPage`
hidden field and a custom field named `attribution`. Tally fills `originPage`
from the host page automatically; the widget passes only the versioned
attribution record through `Tally.openPopup()`. The form ID is read from the
shared `TALLY_FORM_ID` configuration, which can be overridden with
`PUBLIC_TALLY_FORM_ID` for preview builds.

Apply `migrations/0005_add_lead_outcomes.sql` and configure the Worker secret
`LEAD_OUTCOME_SIGNING_SECRET` before deploying outcome links. Tokens contain
only the lead table, numeric id, outcome and a 90-day expiry; they contain no
customer fields. The action route is standalone, sends nothing to GA4, is not
an admin dashboard, and returns `no-store`/`noindex` headers.

Run the aggregate-only operational report without exporting customer data:

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler d1 execute wrp-contact-forms \
  --remote --file=reports/queries/booked-leads-by-attribution.sql
```

The result groups booked leads separately by first-touch and latest-touch
source/medium. `unknown` means that lead had no accepted attribution record.

Clarity can be connected to GA4 for recordings and behavioral investigation.
Do not use Clarity identifiers to join anonymous sessions to lead PII; D1 is the
durable lead record and GA4/Clarity remain aggregate analytics tools.

Astro 6.4.8 supports the lifecycle and inline-script behavior used here. Astro 7
is available, but its Vite 8/compiler and official-integration changes make it a
separate framework upgrade rather than a dependency of attribution preservation.

## References

- [Campaign URL parameters](https://support.google.com/analytics/answer/10917952)
- [Business Profile in GA4](https://support.google.com/analytics/answer/16930347)
- [Business Profile performance metric definitions](https://support.google.com/business/answer/9918094)
- [Single-page application measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Tally event contract](https://developers.tally.so/widgets/events)
- [Tally popup API](https://developers.tally.so/widgets/popups)
- [GA4 traffic-source scopes](https://support.google.com/analytics/answer/11080067)
- [GTM data-layer persistence](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [Clarity client API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api)
- [Astro client-router script behavior](https://docs.astro.build/en/guides/view-transitions/#script-behavior-with-view-transitions)
- [Astro 7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)
