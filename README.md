# AgriTec Multivendor Marketplace

AgriTec is a multivendor agricultural marketplace made up of four coordinated applications:

- `agritec-api` - Next.js API backend with Prisma/PostgreSQL.
- `agritec-seller` - Seller/farmer web dashboard.
- `agritec-admin` - Admin operations dashboard.
- `agritec_mobile` - Flutter buyer mobile app.

The system is designed around one shared backend. Buyers use the mobile app, sellers use the seller dashboard, and admins use the admin dashboard.

## Core Marketplace Rules

- Buyers can browse as guests, but must sign in for wishlist, addresses, checkout, orders, chat, and account notifications.
- Sellers manage their own products, variants, discounts, wallet, payout requests, messages, notifications, analytics, and farm/profile settings.
- Admins manage sellers, buyers, assisted orders, order status updates, payouts, analytics, messages/support, audit logs, admin users, and platform settings.
- Admins have read-only/contextual access to seller products for moderation and assisted order creation. Admins do not own or directly manage products.
- Delivery/logistics is platform-controlled, not seller-controlled.
- Checkout is multivendor: one parent order/payment can contain multiple seller order groups.
- Each seller order group has its own fulfillment status.
- Seller earnings are credited after successful payment as pending wallet balance, then released to available balance when that seller group is delivered/completed.
- Product/order/payment/wallet values are stored as integer money values on the backend.

## Repository Structure

```text
agritec/
  agritec-api/       Backend API, Prisma schema, Paystack, Cloudinary, Firebase Admin
  agritec-seller/    Seller dashboard, Zustand stores, product/discount/wallet/settings UI
  agritec-admin/     Admin dashboard, Zustand stores, operations and platform settings UI
  agritec_mobile/    Flutter buyer app, Riverpod state, caching, FCM, maps, checkout
```

## Backend Overview (`agritec-api`)

The API is a Next.js app using Prisma and PostgreSQL. It exposes endpoints for:

- Auth: buyer, seller, admin sign-in/sign-up, password reset, session lookup, password change.
- Marketplace reads: products, sellers, platform categories, platform settings.
- Buyer flows: cart, wishlist, addresses, profile, checkout quote/init, orders.
- Seller flows: products, discounts, order groups view, wallet, payouts, bank account verification, profile.
- Admin flows: sellers, buyers, products read-only, orders, assisted orders, order-group status updates, payouts, admins, settings, audit logs, conversations.
- Payments: Paystack initialize, callback, verify, webhook, payment status polling.
- Notifications: database notifications, read/read-all, FCM device token registration.
- Chat: buyer-seller, buyer-support, seller-support/admin support conversations.
- Uploads: signed Cloudinary uploads for product/chat media.
- Cron: protected weekly payout endpoint.

### Important Backend Models

Key Prisma models include:

- `User`, `BuyerProfile`, `SellerProfile`
- `Product`, `ProductVariant`, `Category`, `Discount`
- `Cart`, `CartItem`, `WishlistItem`
- `ParentOrder`, `SellerOrderGroup`, `OrderItem`, `Payment`, `OrderAddressSnapshot`
- `SellerWallet`, `WalletTransaction`, `SellerBankAccount`, `WithdrawalRequest`
- `Conversation`, `ConversationParticipant`, `Message`, `MessageAttachment`
- `Notification`, `DeviceToken`, `AuditLog`
- `PlatformSettings`, `ShippingSettings`, `CommissionSettings`, `PayoutSettings`

## Shipping and Logistics

Shipping is platform-wide and calculated server-side.

Product logistics fields:

- `salesUnit`
- `packageType`
- `unitWeightKg`
- optional `unitLengthCm`, `unitWidthCm`, `unitHeightCm`

If all dimensions are present and valid:

```text
volumetricWeightKg = (length * width * height) / volumetricDivisor
unitChargeableWeightKg = max(unitWeightKg, volumetricWeightKg)
```

If any dimension is missing or invalid:

```text
unitChargeableWeightKg = unitWeightKg
```

Shipping settings use a minimum-fee plus additional-weight-unit model:

```text
if totalChargeableWeightKg <= weightUnitSizeKg:
  shippingFee = minimumFee
else:
  shippingUnits = ceil(totalChargeableWeightKg / weightUnitSizeKg)
  shippingFee = minimumFee + ((shippingUnits - 1) * additionalUnitFee)
```

Abuja/FCT and outside-Abuja pricing are configured separately in admin settings.

## Payments and Payouts

Paystack is used server-side. The mobile app and dashboards must never contain the Paystack secret key.

Payment flow:

1. Buyer/admin calls checkout initialize endpoint.
2. Backend recalculates totals and creates a pending parent order/payment.
3. Backend initializes Paystack with a backend callback URL.
4. User completes payment on Paystack.
5. Backend callback/webhook verifies transaction server-side.
6. Backend marks payment/order paid idempotently.
7. Successful payment reserves inventory so it is no longer purchasable by other buyers.
8. Inventory is permanently deducted only when each seller order group is delivered/completed.
9. If a paid seller order group is cancelled/refunded before delivery, the reservation is released and stock becomes available again.
10. Seller earnings are credited to pending wallet balance.

Payout flow:

- Sellers verify bank account through backend Paystack endpoints.
- Backend stores Paystack transfer recipient code.
- Sellers can request payout of full available balance only.
- Admin approval initiates Paystack transfer.
- Weekly automatic payouts use a protected cron endpoint.

## Chat and Notifications

Chat is REST-based for MVP:

- Sender posts message to backend.
- Backend stores message, updates conversation timestamp, and creates receiver notifications.
- UI uses optimistic send plus polling for near-real-time updates.
- Push notification delivery uses Firebase Cloud Messaging where a device token exists.
- Web users also receive backend-driven email alerts for new chat messages when the recipient is a seller or admin/support user, throttled to at most one email per recipient per conversation every 30 minutes.
- Chat attachments support images and PDF documents only.
- Chat attachments are local-first in the UI and upload only when the message is actually sent.
- Chat media is uploaded to the Cloudinary `agritec/chats` folder.
- Unread chat badges and notification-driven refresh keep chat state current across the dashboards and mobile app.

Conversation visibility is participant-scoped. Buyer-seller messages are only visible to the buyer and seller involved. Admins see only admin/support conversations where an admin is a participant.

## Prerequisites

Install:

- Node.js 20+ recommended
- npm
- Flutter SDK matching the project SDK constraints
- Android Studio / Android SDK for Android builds
- Xcode for iOS builds on macOS
- PostgreSQL database, local or hosted
- Firebase project for mobile push notifications
- Paystack account for payments/transfers
- Cloudinary account for image uploads
- Google Maps API key for maps and places

## Environment Files

Each app has its own environment/configuration. Do not commit real secrets.

### `agritec-api/.env`

Create `agritec-api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"

# App URLs used by auth emails and redirects
APP_URL="http://localhost:3000"
SELLER_APP_URL="http://localhost:3001"
BUYER_APP_URL="agritec://auth/reset-password"
MARKETPLACE_NAME="Agritec"

# Paystack
PAYSTACK_SECRET_KEY="sk_test_or_live_xxx"
PAYSTACK_CALLBACK_URL="https://your-api-domain.com/api/paystack/callback"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email via Gmail app password
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"

# Firebase Admin - option A: separate env vars
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Admin - option B: full service account JSON string
# FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Weekly payout cron protection
CRON_SECRET="replace-with-a-long-random-secret"
```

Paystack dashboard URLs:

```text
Webhook URL:  https://your-api-domain.com/api/paystack/webhook
Callback URL: https://your-api-domain.com/api/paystack/callback
```

For the deployed API currently used by this workspace:

```text
Webhook URL:  https://agritec-api.vercel.app/api/paystack/webhook
Callback URL: https://agritec-api.vercel.app/api/paystack/callback
```

### `agritec-seller/.env`

Create `agritec-seller/.env`:

```env
NEXT_PUBLIC_API_BASE_URL="https://agritec-api.vercel.app"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-browser-google-maps-key"
```

The Google key is used for seller farm location search/picker. For production, restrict it to the seller dashboard domain and enable Maps JavaScript API and Places API.

### `agritec-admin/.env`

Create `agritec-admin/.env`:

```env
NEXT_PUBLIC_API_BASE_URL="https://agritec-api.vercel.app"
```

### `agritec_mobile` Firebase and Local Android Config

The mobile app intentionally ignores account-specific Firebase files:

```text
agritec_mobile/android/app/google-services.json
agritec_mobile/lib/firebase_options.dart
```

These should not be committed. Anyone cloning the repo must generate their own Firebase files.

Recommended setup:

1. Create or select a Firebase project.
2. Add Android app package:

```text
com.agritec.marketplace
```

3. Download `google-services.json` and place it at:

```text
agritec_mobile/android/app/google-services.json
```

4. Install FlutterFire CLI:

```bash
dart pub global activate flutterfire_cli
```

5. From `agritec_mobile`, run:

```bash
flutterfire configure
```

6. Confirm it creates:

```text
agritec_mobile/lib/firebase_options.dart
```

7. Add Google Maps Android key to `agritec_mobile/android/local.properties`:

```properties
GOOGLE_MAPS_ANDROID_API_KEY=your-android-google-maps-key
```

For production, restrict the Android Google Maps key to the app package and signing certificate SHA-1/SHA-256.

The mobile app API base URL is currently set in:

```text
agritec_mobile/lib/core/api/mobile_api.dart
```

Default:

```dart
const mobileApiBaseUrl = 'https://agritec-api.vercel.app';
```

## Installation

From the root folder, install dependencies for each JavaScript app:

```bash
cd agritec-api
npm install

cd ../agritec-seller
npm install

cd ../agritec-admin
npm install
```

For the mobile app:

```bash
cd ../agritec_mobile
flutter pub get
```

## Database Setup

From `agritec-api`:

```bash
npx prisma generate
npx prisma db push
npm run seed
```

This project currently uses `prisma db push`, not migrations.

The seed is intended to create baseline demo data such as:

- one admin user
- demo sellers
- one demo buyer
- platform categories/settings
- demo products

Money-generating records such as real orders, wallet transactions, and payouts should be created through actual app flows.

## Running Locally

### API

```bash
cd agritec-api
npm run dev
```

Default Next.js dev URL:

```text
http://localhost:3000
```

If another app is using port `3000`, Next will offer another port. Update frontend env URLs accordingly if testing locally.

### Seller Dashboard

```bash
cd agritec-seller
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env` to either the deployed API or your local API.

### Admin Dashboard

```bash
cd agritec-admin
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env` to either the deployed API or your local API.

### Buyer Mobile App

```bash
cd agritec_mobile
flutter run
```

Before running, make sure these exist locally:

```text
android/app/google-services.json
lib/firebase_options.dart
android/local.properties with GOOGLE_MAPS_ANDROID_API_KEY
```

## Validation Commands

Backend:

```bash
cd agritec-api
npm run build
npx tsc --noEmit --incremental false
```

Seller dashboard:

```bash
cd agritec-seller
npm run build
npx tsc --noEmit --incremental false
```

Admin dashboard:

```bash
cd agritec-admin
npm run build
npx tsc --noEmit --incremental false
```

Buyer mobile app:

```bash
cd agritec_mobile
flutter analyze
```

## Demo/User Flow Checklist

A typical MVP test pass:

1. Start API.
2. Sign in to seller dashboard.
3. Create products with logistics metadata and optional variants.
4. Create seller discounts.
5. Verify seller bank account if testing payouts.
6. Sign in to admin dashboard.
7. Review sellers, buyers, platform settings, and assisted order flow.
8. Run mobile app as guest and confirm browsing works.
9. Sign in as buyer.
10. Add address with map pin.
11. Add products from multiple sellers to cart.
12. Checkout once and pay once through Paystack.
13. Confirm parent order with seller groups appears in buyer orders.
14. Confirm seller sees their order group.
15. Confirm admin can update seller group status.
16. Confirm buyer receives notification/email for order status changes.
17. Confirm wallet pending/available/payout behavior after status changes.
18. Confirm buyer-seller and buyer/admin-support chat notifications work.
19. Confirm chat attachments accept images/PDFs only, show local preview first, and upload only on send.

## Git and Secret Hygiene

Do not commit:

- `.env` files
- Firebase Admin service account JSON
- `agritec_mobile/android/app/google-services.json`
- `agritec_mobile/lib/firebase_options.dart`
- local build artifacts
- platform signing keys

Firebase web/mobile API keys in generated client config are not the same as private Firebase Admin credentials, but this project still ignores generated Firebase files because they are account-specific and should be regenerated per owner/fork.

## Deployment Notes

Backend deployment must include:

- all `agritec-api` environment variables
- PostgreSQL connection string
- Paystack webhook and callback configured to the deployed API domain
- Firebase Admin credentials in env vars
- Cloudinary credentials
- Gmail app password or replacement email provider credentials
- seller/admin dashboard URLs (SELLER_APP_URL, ADMIN_APP_URL) for chat email deep links
- `CRON_SECRET` if using weekly payouts

Frontend deployments must include:

- `NEXT_PUBLIC_API_BASE_URL` pointing to the deployed API
- seller dashboard Google Maps key where needed

Mobile production builds must include:

- regenerated Firebase files for the owner project
- Android/iOS app IDs registered in Firebase
- Google Maps keys restricted to package/bundle IDs and signing certificates
- Paystack callback/deep-link flow tested on a real device

## Current MVP Status

The MVP covers the full marketplace loop:

- buyer browsing, cart, checkout, orders, chat, notifications
- seller product/discount/settings/wallet/order visibility
- admin seller/buyer/order/payout/settings/audit/support operations
- backend multivendor order/payment/wallet/shipping/notification foundation




