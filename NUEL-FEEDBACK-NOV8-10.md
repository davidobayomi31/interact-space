# Nuel's feedback, Nov 8 – 10

From the WhatsApp chat with Nuel after the Oct 29 – Nov 3 round (see NUEL-FEEDBACK-OCT29-NOV3.md). The "Business on VOIDAJ" image was opened full size.

The project is now called **VOIDAJ** everywhere in the code and docs. "Interact Space" is left only in the signed agreements, in a database migration that renames old titles, and in an earlier feedback note that quotes the old sign-in page.

## Done on localhost

| # | Nuel said | What changed |
|---|---|---|
| 1 | Nov 8: "You can remove trips as it may not come soon"; Nov 10: "Remove organization and remove trips" | Trip and Organization are gone from Add Hub. Ride share is gone from My City, and Trips is gone from My Stash. |
| 2 | Nov 10: "Please let's remove companion for now" | The Companion button, its drawer, and "Ask the Companion" in Settings are hidden. Onboarding still guides people but no longer calls itself the Companion. The server's companion and its tests are kept, so it can come back. |
| 3 | Nov 10: "And remove voice", "Remove vis" | These are one feature: Voices / VIS. The Voice row in Add Hub, the VIS tabs on your profile, and the `/v/…` and `/voices/…` pages are all hidden. **Voice messages in Chat are a different thing and are still there.** |
| 4 | Nov 9: "Include google and apple signin" | The sign-in page has **Continue with Google** and **Continue with Apple**. An existing email account gets linked rather than duplicated. Google or Apple accounts can add a password later in Settings. Each button says "Not set up yet" until its keys are added (see `.env.example`). |
| 5 | Nov 10: "for the theme I would like that if it's not white then it has to be black. The purple violet and all that is for the name and logo" | Light mode is white and dark mode is black. Buttons, tabs and chips are black on white or white on black. The blue → violet colours appear only on the VOIDAJ wordmark and the VJ mark. Green (verified), red (alerts) and amber (ratings, For Sale) keep their colour because they carry meaning. The overrides are in `src/mono.css`. |
| 6 | Nov 8: "Business on VOIDAJ — Simplified" mockup: "This is my vision… so you can design around it" | Built from the mockup: **Create Business** (logo, name, category, description, location) and **Explore Businesses** (search, a featured business, category chips, cards, with promoted ones first). Each **business page** has a cover, logo, verified tick, Chat, Follow, and Posts · About · Reviews. Posts are filtered by Properties / Services / Products / Offers. **Listings** have a photo, price, For Sale or For Rent, area, Enquire and Save. **Promote Post** has goal, audience, 3 / 7 / 14 days, ₦5,000 / ₦15,000 / ₦30,000 and an estimated reach (₦15,000 for 7 days gives 8,000–25,000). It ends on **Promotion Live!** with views and enquiries. Enquiries go through Chat with a "Re:" card for the listing, and they reach the owner even if they only take messages from connections. Owners see page views, enquiries and followers. Businesses also appear in Add Hub, Home ("Promoted near you" and a Business shortcut), My City (Businesses in your city) and Explore. Five sample businesses are seeded, including Akinyede Estates from the mockup. |

## Questions to answer Nuel

- **Promotions are free for now.** Payments aren't live, so Promote Post says during the beta that you won't be charged. Is that OK, or should promoting wait for payments?
- **Verified businesses:** the tick is a flag an admin sets. How should a business earn it?
- **The links he "sent to your number"** (Nov 10, 5:44 AM) weren't in this WhatsApp chat. They may be in SMS or iMessage; they haven't been looked at.
- **Meeting:** he asked to meet on Friday, and you said yes.

## Not done here

- Google and Apple keys. Google needs an OAuth client in Google Cloud. Apple needs a paid Apple Developer account and only works on https (voidaj.com, not localhost). The steps are in `.env.example`.
- Payments for promotions, and for Gift and Buy badges.
- Saving a listing still uses the in-browser Stash, like other saves.
