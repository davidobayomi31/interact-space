# Do later

Things we agreed to build, but not yet. Don't build them until someone picks one up.

## Onboarding flow (6 steps)

From Nuel's message on Oct 14. **Not built yet.** The current `/welcome` onboarding stays as it is for now.

### Step 1: Welcome and intent
- Welcome the person to Interact Space and explain in one line what it's for.
- Ask why they're here (pick one or more): find community, find work or hire, grow a business, share their voice, meet people, discover what's happening nearby.
- Their answer shapes everything after onboarding (see "After onboarding" below).

### Step 2: Profile type
- Ask what kind of profile this is: an individual, a creator or professional, a business or service provider, or an organisation or community leader.
- The profile type decides which fields come next and how the profile looks to others.

### Step 3: Location
- Ask for their city and area (starting with Lagos and other Nigerian cities).
- Make privacy clear and in their control: exact area, city only, or hidden.
- Location drives My City, local communities, nearby events and Quick Jobs.

### Step 4: Interests
- Let them pick interests from clear categories (tech, business, food, fashion, faith, sport, music, photography, and so on).
- Allow a few free-text interests of their own.
- Suggest communities and people from these choices.

### Step 5: Participation
- Ask how they want to take part: join communities, post and share, attend events, offer skills or services (Quick Jobs), hire for jobs, or mostly browse for now.
- If they offer skills, ask which job categories, so job alerts work from day one.
- Offer a first community or two to join right there (one tap).

### Step 6: Account setup and safety
- Confirm name, handle and photo.
- Contact details and verification: email or phone, and optional ID verification (explain the "Verified" badge and what it unlocks).
- Safety settings: who can message them, who can see their location, notification choices.
- Point to the community Charter and how to report something.

### After onboarding: personalisation rules
- **Home** opens on what matches their intent: someone looking for work sees jobs first, someone looking for community sees communities and events first, a business sees Community partners and tools to post.
- **Suggestions** (communities, people, events, jobs) come from interests, location and participation choices. Each one says why it was suggested.
- **Quick Jobs** alerts follow the categories they said they can do.
- **My City** uses their chosen city and area, at the privacy level they picked.
- **Profile type** decides the profile layout (for example, a business profile shows services and contact; a creator profile shows a portfolio).
- Everything can be changed later in Settings. Onboarding choices are a starting point, not a lock-in.
- Anyone who skips a step still gets a sensible default (trending in Lagos), clearly labelled as such.

> Note: this was written down from the summary of Nuel's message we have. Check it against his original Oct 14 message before building, and add anything that's missing.

## Backend (paused Oct 18)

David asked to pause backend work and do UI only for now.

- **Favorites on the server.** Favorites are saved in the browser only (`src/favorites.js`), so they don't follow someone to another device and are lost if browser data is cleared. Move them to a `favorites` table with `GET/POST/DELETE /api/favorites`, include them in the data export, and delete them with the account.
- **Making accounts real.** Sign-up, sign-in and the Postgres database already work in production. What's still simulated: ID verification (instant badge), ad payment (demo checkout), and there is no email verification or "forgot password" yet (both need an email service).

## Payments (Nuel, Oct 27)

Nuel sent 14 payment screens (see NUEL-FEEDBACK-OCT24-27.md, section J). Settings → Payments lists them as coming soon. **Not built.** It needs a payment provider (Paystack or Flutterwave for Nigeria), a merchant account and the legal side settled first.

- Wallet: balance, add funds ($10 / $25 / $50 / $100 or a custom amount), withdraw, transactions, cards
- Payment methods: card, bank transfer, mobile money (MTN, Airtel), Apple Pay, Google Pay, wallet balance
- Confirm payment and a payment-success screen
- Business promotion plans: Basic $5 (3 days), Standard $15 (7 days), Premium $30 (14 days). This replaces the demo ad checkout
- Personal Premium: $4.99/month or yearly (save 20%)
- VOIDAJ ID card designs: Standard (free), Premium $2.99, Custom $4.99
- VOIDAJ Trips: book a seat, then pay
- Quick Job payment: the money is held until the job is done (escrow), plus a platform fee
- Event tickets: Regular, VIP, Group (4+)
- Support a creator: one-time or monthly
- In-app badge purchases
- Transaction history: all, payments, payouts

## Photos for job categories (Oct 27)

Quick Jobs categories show a photo where one fits from public/images. Plumbing, cleaning, carpentry, appliance repair and auto repair still use a coloured icon tile until they get real photos.

## "That unique profile stuff" (Nuel, Oct 25)

David is checking with Nuel what he meant. It may be the Identity Builder preview at /vision.
