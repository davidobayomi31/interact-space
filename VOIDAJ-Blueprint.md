# VOIDAJ — Platform Structure & Feature Blueprint

_From Nuel (WhatsApp), transcribed. The aim: build VOIDAJ as one connected system, not features that run separately. Nuel wants it used as the reference for development._

## 1. Main platform navigation
- **Home**: the user's personalised space. Feed, posts, recommended content and people, community activity, events, jobs, hubs, announcements and relevant local activity. It pulls from across VOIDAJ instead of standing on its own.
- **Explore**: universal discovery and search across people, profiles, communities, groups, businesses, organizations, jobs, services, events, hubs, posts and places. The goal is for users to be able to find almost anything on VOIDAJ.
- **My City**: the local and community side. Local activity, events, communities, jobs, businesses, services, hubs, local posts, local announcements and local requests or offers. It ties into location-based features.
- **Quick Jobs**: work and services. Find, post, nearby, apply, my applications, my posted jobs, workers and service providers, job status, job history, reviews and ratings, saved jobs. It connects with profiles, chat, verification, location and notifications.
- **Add Hub**: one place to create things instead of separate creation flows. Users can add posts, communities, groups, events, businesses, organizations, services, jobs and other approved hubs or resources. What counts as a "Hub" can be refined later.

## 2. Profile
More than a social profile: it represents the user's identity and activity. Profile info, picture, username, bio, location, verification, posts, communities, groups, events, jobs, hubs, connections, activity, reviews and reputation, saved items, VOIDAJ ID/Card and profile sharing. It should show activity and influence without getting complicated.

## 3. VOIDAJ ID / Digital Card
**One feature**, not two. A shareable digital identity tied to the profile: name, image, username, profile link, verification status, QR code, share option and relevant identity info. Sharing someone's card should lead back to their VOIDAJ profile.

## 4. Chat
A **universal communication system** covering person↔person, customer↔worker, job poster↔applicant, community↔member, business↔customer, organization↔person, event organizer↔attendee, and group conversations. Conversations should reference whatever started them (e.g. Quick Jobs → Job → Contact Worker → Chat). One strong messaging system reused everywhere.

## 5. Communities
A major part of VOIDAJ: profile, members, posts, groups, events, announcements, rules, settings, management and moderation. They connect with profiles, events, chat, My City and the map.

## 6. Moderate (working name)
For people who create or manage communities. Summaries: active groups, communities and events, member activity, reports, content needing attention, moderation actions and community stats. **It doesn't need to be in the main navigation.** It lives inside the community or group's management area.

## 7. Events
Connected across VOIDAJ: communities, groups, businesses, organizations, profiles, My City and the map. Functions: discover, create, join, invite, event info, event chat, reminders and attendance or activity.

## 8. Map
A **visual/aesthetic discovery layer**, not a major standalone section. It shows events, jobs, hubs, My City activity, communities and, where it fits, businesses and services. Principle: *the Map shows the activity visually; the data belongs to the feature* (Map → Event marker → Event page). No separate event system inside the map.

## 9. Notifications
One universal system: messages, job responses and applications, community activity, event reminders, profile activity, mentions, hub activity, verification updates, moderation alerts and system announcements.

## 10. Settings
Reached from the profile or account area.
- **Account**: personal info, username, email or phone, password, account management
- **Privacy**: profile visibility, location visibility, messaging permissions, who can contact you
- **Security**: login security, 2FA, devices, login history
- **Notifications**: push, email, jobs, community, events, messages
- **Preferences**: language, location, accessibility, content preferences
- **Help & Support**: help, report a problem, contact support
- **Data**: data controls, download data, deactivate or delete account

## 11. Trust, Safety & Verification
Platform-wide, covering profiles, jobs, communities, businesses, organizations and hubs. Identity verification, reporting, blocking, account security, community rules, moderation, reputation and reviews, and safety controls.

## 12. Cross-use systems (especially important to Nuel)
Don't build separate versions of the same function for each section.
- **Profile**: connects with almost everything
- **Chat**: jobs, communities, events, businesses, profiles and organizations
- **Search**: people, jobs, communities, events, hubs, businesses and posts
- **Location**: My City, jobs, events, hubs and communities
- **Notifications**: the whole platform
- **Verification**: profiles, jobs, businesses, communities and so on
- **Reviews/Reputation**: workers, services, businesses, profiles and jobs
- **Sharing**: profiles, ID/Card, posts, events, hubs and communities

## 13. Simple user navigation
Main nav: **HOME | EXPLORE | MY CITY | QUICK JOBS | ADD HUB**
Global: **Notifications | Chat | Profile**
Inside Profile: My Profile, Communities, Events, My Jobs, My Hubs, VOIDAJ ID/Card, Activity, Saved, Settings.

## 14. Main development principle
**Build shared systems that multiple features can use**: one system each for profiles, chat, search, notifications, verification (works for different kinds of users and entities) and location (supports My City, Jobs, Events, Hubs and the Map). The result should feel like one connected platform.

## 15. Overall concept
People → Profiles / VOIDAJ ID → Communities / Groups → Jobs / Services → Events / Activities → Hubs → My City → Explore → Chat / Communication → Map / Visual Discovery → Trust / Verification / Moderation. All of them talk to each other through shared systems. Keep it flexible so new features can be added without rebuilding.

---
**Follow-up chat:** You asked whether to add this or whether it was already done. Nuel said you'd already started and this is how it should be arranged. Today you asked if anything should change. Nuel replied "Not really, just need arrangements and some placements," then at 1:25 PM: "Big topic we have to talk on — Security."
