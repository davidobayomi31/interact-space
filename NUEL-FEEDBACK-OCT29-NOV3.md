# Nuel's feedback, Oct 29 – Nov 3

From the WhatsApp chat with Nuel after the Oct 24–27 round (see NUEL-FEEDBACK-OCT24-27.md). Every image was opened full size.

## Done on localhost

| # | Nuel said | What changed |
|---|---|---|
| 1 | Music VIS tab on Mariam's profile: "I don't know if you worked on this area properly" | VIS tabs are now a labelled switcher ("Your VIS: different sides of you, each with its own @handle"). A picked VIS gets a header card (name, @handle, who sees it, View as others / Copy link / Edit), its sections in a card, and a "Make Music fuller" list of sections it could add. |
| 2 | Job offers list: "Only the person that posted can see offers right?" | **Answer: yes.** The server sends the offers list only to the poster (`serializeJob`). Nothing changed. |
| 3 | Job chat: "Show read and delivered sign" | Each of your messages shows its time and ticks: one grey tick while sending, two grey once delivered, two blue once read. An open chat checks every 5 s, so ticks turn blue without a refresh. |
| 4 | Messages filter chips cut off under the open chat: "Something wrong here?" | On computers the chips wrap onto a second line. On phones they stay one swipeable row that fades at the edge. |
| 5 | "New citizen of VOIDAJ": "When this goes what comes next? Do you need a suggestion?" | Citizen levels: New Citizen → Resident (25 pts) → Neighbour (80) → Local Voice (200) → Community Pillar (450) → City Icon (900). Points come from posts, takes, sparks, looms, communities, hosting events and quick jobs. The default title follows the level. **The names are a suggestion for Nuel to confirm or rename** (`LEVELS` in server/db.js). |
| 6 | Event card: "When I tap on this I would like it to show details about it and the organizers" | New page `/event/:id` with the cover, date, time, place, description, #tags, organisers (host plus the community's staff, each with Message), who's going, and Join / Share. Every event card on the site now opens it. |
| 7 | Post with "@femi" circled: "Can we have either hash tags or ours can be ^" | `#tags` and `@names` in posts and takes are links. A #tag opens `/tag/:tag` with every post that uses it. An @name opens that member's profile. |
| 8 | Phone mockup set: "we can use like, share, comment, save and re-share" | Covered by item 9. |
| 9 | Complete App Visual Mockup v2.0 + Engagement System: "We are looking to add these adjustments" | **Spark**: tap to react, or hold / use the arrow to pick Spark, Insight, Support, Fire or Relate. Old likes carry over as Sparks. **Take**: comments are now Takes ("Share your take…"). **Loom**: spread a post to your feed (Public or your city), into a community, to someone in Chat, or outside VOIDAJ. A Loom shows the original inside it. **Stash**: save into All Stash, Jobs & Opportunities, Events, Businesses, Trips or Ideas & Inspiration. Saved is now **My Stash** with those collections. **Badging**: `/badges` with My Badges (plus your level), Discover (every badge and how to earn it), and Create (name + 8 styles). Badge details let you show or hide a badge on your profile. Gift and Buy say "coming soon" until payments are live. The profile gets the level bar, its badges, and My Stash · My Badges · VOIDAJ ID buttons. |
| 10 | Desktop Concepts / Web Desktop Experience: "Was there a way possible to have this kinda set up for laptop" | Home on laptops follows the recommended **Hybrid** concept (C). The feed is in the middle. The right column now starts with **Your Space** (you, connections, communities, badges, level) and **My City** (map card with pins, events and jobs counts, View map), then Happening in your city, people and jobs. The composer has Photo · Video · Event · Opportunity buttons. |

## Questions to answer Nuel

- **"Do you also need to subscribe to activate the location basis?"** No. My City's map uses OpenFreeMap and NASA tiles, which are free and need no key. Location is the city on each profile.
- Item 5: does he want different level names?

## Not done here

- Gift and Buy badges need payments.
- Stash collections are kept in the browser, like Saved was, so they don't follow you to another device yet.
- On Nov 3 (Tuesday) an account email and password were sent in this chat in plain text. Nothing here uses them. Change that password and share it through a password manager instead, because it now sits in WhatsApp history on both phones.
