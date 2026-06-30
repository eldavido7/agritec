# AgriTec

AgriTec is a multi-app agricultural marketplace with a shared backend.

Current apps in this repo:

- `agritec-api` - Next.js API backend with Prisma and PostgreSQL
- `agritec-admin` - admin operations dashboard
- `agritec-seller` - seller/farmer dashboard
- `agritec-logistics` - logistics company dashboard
- `agritec_mobile` - Flutter buyer app

The system now includes:

- multivendor checkout with one buyer payment and seller-level order groups
- logistics-company-owned coverage and pricing
- buyer logistics selection per seller group, plus one-company-for-all when eligible
- logistics-managed delivery progression with status history
- admin-managed logistics verification and support assignment workflow
- seller wallet and payout flow through Paystack
- buyer, seller, admin, and logistics notifications
- buyer-seller chat and admin-handled support chat

## Repo Layout

```text
agritec/
  .github/workflows/                  GitHub Actions, including support cron
  agritec-api/                        Backend API, Prisma schema, seed, Paystack, Cloudinary, Firebase Admin
  agritec-admin/                      Admin dashboard
  agritec-seller/                     Seller dashboard
  agritec-logistics/                  Logistics dashboard
  agritec_mobile/                     Flutter buyer app
  README.md
```

## Current Product Scope

### Buyer

Buyers use only the Flutter app.

They can:

- browse as guest
- browse cached marketplace data offline after the app snapshot hydrates
- sign up, sign in, reset password
- manage wishlist, cart, profile, and delivery addresses
- checkout through Paystack
- select logistics company per seller group during checkout
- see order details, logistics company, and delivery timeline
- chat with sellers
- chat with support
- receive push and in-app notifications

### Seller

Sellers use only the seller dashboard.

They can:

- manage products, variants, optional product descriptions, and Cloudinary product images
- manage seller discounts
- view only their seller order groups
- view assigned logistics company and delivery timeline
- manage bank account and request payout of full available balance
- access seller-support conversations
- receive notifications

Important seller restrictions:

- sellers do not manage delivery pricing or coverage
- sellers do not perform normal delivery status updates
- seller APIs must not expose buyer email or phone
- seller must add a complete farm/pickup location before creating or activating products

### Admin

Admins use only the admin dashboard.

They can:

- manage sellers, buyers, admins, payouts, audit logs, and platform settings
- review products in read-only mode
- create admin-assisted orders
- manage logistics companies: review, verify, suspend, reactivate, inspect coverage and pricing
- view logistics assignment and timelines on orders
- manage support assignment workflow
- retain cancellation/refund exception authority

### Logistics Company

Logistics companies use only the logistics dashboard.

They can:

- sign up
- sign in only after admin verification
- manage own profile, pricing, and coverage
- view only deliveries assigned to their company
- update delivery statuses with optional notes
- view notifications

Important logistics restrictions:

- no product, buyer, seller, payout, or platform-settings management
- no GPS tracking
- delivery tracking is status-based only

## Architecture Summary

### Orders

- buyer checkout creates one `ParentOrder`
- each seller gets one `SellerOrderGroup`
- buyer pays once for the parent order
- each seller group can have a different logistics company
- each seller group stores logistics snapshots and delivery geography snapshots
- each seller group has status history rows

Current seller-group statuses:

- `PENDING`
- `CONFIRMED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`
- `REFUNDED`

### Inventory

- checkout initialization does not deduct inventory
- successful payment reserves inventory
- delivery permanently deducts inventory and clears reservation
- cancellation/refund before delivery releases reservation
- variant inventory is used when a variant exists

### Logistics Pricing and Coverage

Shipping is now logistics-company-driven.

Coverage model:

- `NATIONWIDE`
- `REGIONAL`

MVP eligibility rule:

- verified, active nationwide companies are eligible broadly
- verified, active regional companies are eligible when buyer delivery state matches their configured coverage
- seller pickup location is stored and returned for future route-based pricing

Pricing model:

- nationwide company: one nationwide pricing row
- regional company: pricing rows per covered state
- all LGAs/cities under a selected state inherit that state pricing for MVP

One-company-for-all behavior:

- if one logistics company is eligible for every seller group in checkout, buyer/admin can apply it to all groups
- shipping is combined once and allocated back to groups
- quote responses label this as `LOGISTICS_COMBINED`

Legacy `ShippingSettings` still exists in the backend as fallback/legacy data, but it is no longer the main shipping configuration model.

### Support / Chat

Buyer-seller chat remains unchanged.

Admin-handled support conversations now include:

- buyer-support
- seller-support

Support workflow includes:

- assigned / unassigned queue state
- active / resolved lifecycle state
- claim, assign, reassign, resolve, reopen
- internal admin-only notes
- timeout-based reassignment
- one-time auto acknowledgement for unassigned conversations
- protected cron sweep endpoint

### Mobile Marketplace Snapshot / Offline

Buyer marketplace browsing is snapshot-first.

The Flutter app hydrates a cached marketplace snapshot containing:

- categories
- sellers
- products
- product descriptions
- product variants
- applicable product discount metadata

Browse surfaces should read from that snapshot first:

- home
- catalog
- product details
- seller details
- sellers list
- wishlist

These browsing pages should not add ad hoc per-page marketplace fetches unless the snapshot model is intentionally being expanded.

Transactional or user-specific flows stay live:

- cart sync
- checkout and logistics eligibility
- orders
- notifications
- chat
- payment verification

## Main Backend Models

Key Prisma models include:

- `User`
- `BuyerProfile`
- `SellerProfile`
- `LogisticsCompanyProfile`
- `Product`
- `ProductVariant`
- `Category`
- `Discount`
- `Cart`
- `CartItem`
- `WishlistItem`
- `ParentOrder`
- `SellerOrderGroup`
- `OrderItem`
- `OrderAddressSnapshot`
- `OrderGroupStatusHistory`
- `Payment`
- `Refund`
- `SellerWallet`
- `WalletTransaction`
- `SellerBankAccount`
- `WithdrawalRequest`
- `Conversation`
- `ConversationParticipant`
- `Message`
- `MessageAttachment`
- `SupportConversationAssignment`
- `SupportInternalComment`
- `Notification`
- `DeviceToken`
- `AuditLog`
- `InventoryMovement`
- `PlatformSettings`
- `ShippingSettings`
- `CommissionSettings`
- `PayoutSettings`
- `LogisticsPricingSetting`
- `LogisticsCoverageArea`

## Prerequisites

Install:

- Node.js 20+
- npm
- Flutter SDK compatible with the project
- Android Studio / Android SDK for Android builds
- Xcode for iOS builds on macOS
- PostgreSQL
- Firebase project for mobile push notifications
- Paystack account for payments/transfers/refunds
- Cloudinary account
- Google Maps API keys

## First-Time Setup

### 1. Clone and install

From the repo root:

```bash
cd agritec-api
npm install

cd ../agritec-admin
npm install

cd ../agritec-seller
npm install

cd ../agritec-logistics
npm install

cd ../agritec_mobile
flutter pub get
```

### 2. Create environment files

Do not commit real secrets.

#### `agritec-api/.env`

Create `agritec-api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"

APP_URL="http://localhost:3000"
ADMIN_APP_URL="http://localhost:3001"
SELLER_APP_URL="http://localhost:3002"
LOGISTICS_APP_URL="http://localhost:3003"
BUYER_APP_URL="agritec://auth/reset-password"
MARKETPLACE_NAME="AgriTec"

PAYSTACK_SECRET_KEY="sk_test_or_live_xxx"
PAYSTACK_CALLBACK_URL="http://localhost:3000/api/paystack/callback"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# optional alternative to the three Firebase vars above
# FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

CRON_SECRET="replace-with-a-long-random-secret"
```

Notes:

- `JWT_SECRET` is required for all authenticated API access
- `PAYSTACK_SECRET_KEY` is server-side only
- `CRON_SECRET` protects both cron endpoints
- email sending is best-effort; failures should not block business actions

#### `agritec-admin/.env`

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

#### `agritec-seller/.env`

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-browser-google-maps-key"
```

The seller Google Maps key is used for seller location selection. Enable Maps JavaScript API and Places API.

#### `agritec-logistics/.env`

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

### 3. Mobile setup

The buyer app needs Firebase and Google Maps setup outside normal `.env` files.

#### Firebase

These files are intentionally account-specific and should not be committed:

```text
agritec_mobile/android/app/google-services.json
agritec_mobile/lib/firebase_options.dart
```

Setup:

1. Create or select a Firebase project.
2. Register the Android app package:

```text
com.agritec.marketplace
```

3. Put `google-services.json` here:

```text
agritec_mobile/android/app/google-services.json
```

4. Install FlutterFire CLI:

```bash
dart pub global activate flutterfire_cli
```

5. From `agritec_mobile` run:

```bash
flutterfire configure
```

6. Confirm it creates:

```text
agritec_mobile/lib/firebase_options.dart
```

#### Google Maps

Add your Android key to:

```text
agritec_mobile/android/local.properties
```

Example:

```properties
GOOGLE_MAPS_ANDROID_API_KEY=your-android-google-maps-key
```

For production, restrict Maps keys to the correct app package, bundle ID, and signing fingerprints.

#### Mobile API base URL

The mobile app now supports a Flutter compile-time override for its API base URL:

- [agritec_mobile/lib/core/api/mobile_api.dart](/abs/path/C:/Users/awarr/Desktop/agritec/agritec_mobile/lib/core/api/mobile_api.dart:5)

Primary override:

```text
MOBILE_API_BASE_URL
```

Default fallback:

```text
https://agritec-api.vercel.app
```

Example local run override:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.0.2.2:3000
```

Notes:

- use `10.0.2.2` for Android emulator talking to a backend on your host machine
- use your machine's LAN IP for a physical device
- use your deployed API domain for staging/production builds
- if you do not pass `MOBILE_API_BASE_URL`, the app falls back to `https://agritec-api.vercel.app`

### 4. Database setup

This project does not use Prisma migrations in the normal workflow.

From `agritec-api`:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

If you change the Prisma schema later, the normal flow is still:

```bash
npx prisma generate
npx prisma db push
```

Not:

```bash
npx prisma migrate dev
```

## Seeded Demo Accounts

The seed creates useful local test accounts.

Admin:

- `admin@agritec.com` / `admin123`

Buyer:

- `demo@agritec.app` / `Demo@1234`

Sellers:

- `kingsley@farm.com` / `kingsley123`
- `amina@farm.com` / `amina123`

Logistics:

- pending verification: `pending@greenhaul.ng` / `greenhaul123`
- verified nationwide: `ops@naijafreight.ng` / `naijafreight123`
- verified regional: `dispatch@northfield.ng` / `northfield123`

These are for local/dev use only.

## Running Locally

Suggested local ports:

- API: `3000`
- Admin: `3001`
- Seller: `3002`
- Logistics: `3003`

### API

```bash
cd agritec-api
npm run dev
```

### Admin dashboard

```bash
cd agritec-admin
npm run dev -- --port 3001
```

### Seller dashboard

```bash
cd agritec-seller
npm run dev -- --port 3002
```

### Logistics dashboard

```bash
cd agritec-logistics
npm run dev -- --port 3003
```

### Buyer mobile app

```bash
cd agritec_mobile
flutter run
```

To target a different API:

```bash
flutter run --dart-define=MOBILE_API_BASE_URL=http://10.0.2.2:3000
```

Before `flutter run`, make sure these exist locally:

```text
agritec_mobile/android/app/google-services.json
agritec_mobile/lib/firebase_options.dart
agritec_mobile/android/local.properties
```

For a physical device, replace `http://10.0.2.2:3000` with your machine's LAN URL or deployed API URL.

If you only want static validation for mobile, use:

```bash
flutter analyze
```

Marketplace browsing in the mobile app now uses a cached snapshot-first model. On first launch after install or cache reset, let the app hydrate once online so home, catalog, product details, seller details, sellers list, and wishlist have local marketplace data available afterward.

## Validation Commands

### Backend

```bash
cd agritec-api
npm run build
```

### Admin

```bash
cd agritec-admin
npm run build
```

### Seller

```bash
cd agritec-seller
npm run build
```

### Logistics

```bash
cd agritec-logistics
npm run build
```

### Mobile

```bash
cd agritec_mobile
flutter analyze
```

## Deploying a Fork

### API deployment

Your deployed backend must include:

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_URL`
- `ADMIN_APP_URL`
- `SELLER_APP_URL`
- `LOGISTICS_APP_URL`
- `BUYER_APP_URL`
- `MARKETPLACE_NAME`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- either `FIREBASE_SERVICE_ACCOUNT` or the three Firebase Admin vars
- `CRON_SECRET`

Also configure Paystack with your deployed API URLs:

```text
Webhook URL:  https://your-api-domain.com/api/paystack/webhook
Callback URL: https://your-api-domain.com/api/paystack/callback
```

### Web app deployments

Each web frontend should point at the deployed API:

`agritec-admin/.env`

```env
NEXT_PUBLIC_API_BASE_URL="https://your-api-domain.com"
```

`agritec-seller/.env`

```env
NEXT_PUBLIC_API_BASE_URL="https://your-api-domain.com"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-browser-google-maps-key"
```

`agritec-logistics/.env`

```env
NEXT_PUBLIC_API_BASE_URL="https://your-api-domain.com"
```

### Mobile production configuration

For a fork, you must also regenerate and own:

- Firebase project
- `google-services.json`
- `firebase_options.dart`
- Google Maps mobile keys
- optionally `MOBILE_API_BASE_URL` passed via `--dart-define` in your run/build pipeline
- mobile deep-link / callback behavior testing against your API
- an initial online marketplace snapshot refresh before relying on offline browse behavior

## Scheduled Jobs

There are currently two cron-style backend endpoints:

- `GET/POST /api/cron/weekly-payouts`
- `GET/POST /api/cron/support-conversations`

Both are protected with:

```text
Authorization: Bearer <CRON_SECRET>
```

### Support conversations scheduler

This repo uses GitHub Actions for the support sweep, not Vercel cron.

Workflow:

- [.github/workflows/support-conversations-cron.yml](/abs/path/C:/Users/awarr/Desktop/agritec/.github/workflows/support-conversations-cron.yml:1)

Required GitHub repository secrets:

- `API_BASE_URL`
- `CRON_SECRET`

Expected values:

- `API_BASE_URL=https://your-api-domain.com`
- `CRON_SECRET=<same value used in agritec-api deployment>`

The workflow:

- runs every 5 minutes
- also supports manual `workflow_dispatch`
- calls `${API_BASE_URL}/api/cron/support-conversations`
- sends `Authorization: Bearer ${CRON_SECRET}`
- fails on non-2xx responses

### Weekly payouts scheduler

The weekly payout endpoint is present and protected, but how you invoke it in production is up to your deployment setup.

If you add an external scheduler for it, use the same `Authorization: Bearer <CRON_SECRET>` pattern.

## Cloudinary Rules

Product images:

- folder: `agritec/products`
- store both `secureUrl` and `publicId`

Chat attachments:

- folder: `agritec/chats`
- supported types: images and PDFs
- store `secureUrl`, `publicId`, and `mimeType`

Important rule:

- delete or replace exact assets by stored `publicId`
- never derive Cloudinary public IDs from URLs
- never bulk-delete folders

## Payments, Refunds, and Payouts

### Payments

Buyer and admin-assisted checkout both:

1. build a backend quote
2. create a pending order/payment
3. initialize Paystack server-side
4. verify payment through callback/webhook/status check

### Refunds

- `CANCELLED` means fulfillment stopped
- `REFUNDED` means Paystack confirmed refund completion
- logistics cancellation of a paid seller group starts refund workflow
- final refunded state is system/Paystack-managed, not a manual admin shortcut

### Seller payouts

- seller earnings go to pending balance after successful payment
- delivered seller groups move earnings to available balance
- seller can request payout of full available balance only
- admin approves/rejects/finalizes transfer flow

There is no finalized logistics-wallet payout model in this codebase yet.

## Common Local Test Flow

1. Start `agritec-api`
2. Start `agritec-admin`
3. Start `agritec-seller`
4. Start `agritec-logistics`
5. Run the buyer mobile app
6. Sign in with seeded accounts
7. Verify logistics company sign-in:
   - pending company should be blocked
   - verified companies should succeed
8. Add products from multiple sellers to cart in mobile
9. Choose logistics per seller group, or one company for all eligible groups
10. Initialize payment
11. Confirm order appears:
   - buyer sees full order
   - each seller sees only their group
   - admin sees logistics assignment and timeline
   - logistics sees only assigned deliveries
12. Update delivery statuses from the logistics dashboard
13. Confirm status history and notifications propagate
14. Test buyer-support and seller-support assignment flow

## Git and Secret Hygiene

Do not commit:

- `.env` files
- database credentials
- Paystack secrets
- Gmail app password
- Firebase Admin credentials
- `agritec_mobile/android/app/google-services.json`
- `agritec_mobile/lib/firebase_options.dart`
- local signing keys

## Notes for Contributors

- inspect the existing app/store patterns before adding new flows
- use backend/API-backed state in Zustand or Riverpod instead of component-local fetch sprawl
- this repo currently uses `prisma db push`, not Prisma migrations
- support scheduling already has a repo-level GitHub Actions pattern; reuse it
- mobile static verification should use `flutter analyze`
- buyer marketplace pages should prefer the cached home snapshot over one-off product/seller detail fetches
