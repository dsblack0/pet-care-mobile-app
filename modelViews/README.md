# Controller-only integration handoff (November 2026)

**No views or existing `models/` files were changed in this revision.** Controller code lives in `modelViews/`; trusted Firebase Functions are in `functions/`. The old `src/lib/inviteData.ts` screen adapter was intentionally not changed: it still expects the previous auto-email flow. **It must be updated when you provide the missing views.** Until then, it cannot display/share the newly generated token, and its resend action bypasses the new revoke/create flow.

## Final decisions

- Login: Firebase email/password; registration sends verification email. `refreshEmailVerification()` refreshes the Firebase user. A verified email is required to accept an invitation.
- Invitations: owner enters a specific email; `inviteMember(petId, email)` calls `createPetInvitation` and returns a **one-time visible token**. UI later calls `shareInvitation(token, httpsOrigin?)` to share via native share sheet. **No automatic invitation email or SMS.** The recipient must sign up/log in with the exact invited verified email. `acceptInvitation(token)` calls trusted `acceptPetInvitation`, which checks email, expiration, revocation, and atomic membership creation. `revokeInvitation` revokes an outstanding invitation.
- Links: without an HTTPS domain, `invitationLink(token)` produces a development/app deep link and requires the app to be installed. For people who install afterward, provide a code-entry fallback or an HTTPS landing page. Expo Router views for this are not present.
- Reminders: `remindFamilyMember(petId, recipientId)` is a one-tap **predefined** family-to-family push request. No scheduling, local reminder, or custom message. 60-second sender/recipient/pet cooldown. Backend enqueues a nudge, and `deliverPetNudge` submits it to Expo push. Submission does not guarantee device delivery.
- Memories: optional `GeoPoint` from current location, manually entered coordinates, or geocoded address. Human-readable address is **not stored** in existing model.
- Challenges/rewards: existing model definitions retained. **Important:** `unlockReward` in the prior controller directly wrote a reward without validating points; this revision disables that unsafe action until a trusted reward-unlock backend exists.

## Deployment / configuration (not done here)

1. Enable Email/Password Firebase Authentication in Firebase Console. `firebaseConfig.ts` was left untouched as requested; configure native persistent Auth with AsyncStorage before production. `modelViews/core.ts` calls `getAuth()`.
2. Run `npm install` and `npm run build` under `functions/` then deploy the functions using Firebase CLI. This package is provided as source only; no deployment was attempted. Functions require a Firebase project on an eligible billing plan. Ensure your Firebase CLI points to the intended project.
3. **Firestore Security Rules are mandatory.** Deny direct client writes to `invitations`, `nudges`, `nudgeCooldowns`, and `userPets` except carefully controlled owner onboarding. Only trusted Admin SDK functions should grant memberships or accept invitations. Restrict `pushTokens` read/write to their authenticated owner; prohibit client reads of invitation tokens/hashes and unauthorized pet/family data. `pendingInvitations` must only be readable by the pet owner. Existing project rules were not supplied; do not deploy without reviewing them.
4. Configure EAS project ID, Android notification channel and FCM credentials, iOS APNs credentials, device permissions, and production development builds for Expo push. Call `registerPushToken()` after sign-in and on token rotation; call `unregisterPushToken()` before logout if appropriate. Add delivery receipt processing and retry policies for production.
5. Set up an HTTPS domain + Universal Links/App Links for a polished install flow; otherwise use app-specific links with an invitation-code fallback. No automatic deferred deep linking is provided.
6. Replace hardcoded `CURRENT_USER_ID` across screens and old adapters **when views are supplied**. No view files were edited now.
7. Migration: legacy `userPets` documents use arbitrary IDs, while new memberships use `${petId}_${uid}`. The backend queries existing memberships before adding, but production migrations/deduplication and stricter concurrency guarantees should be considered.
8. Test real sign-up, email verification, wrong-email rejection, token replay, expiration, revocation, membership permissions, and push delivery on real devices.

## Entry points

- `authController`: `register`, `login`, `logout`, `resetPassword`, `requestEmailVerification`, `refreshEmailVerification`, `observeAuth`
- `invitationController`: `inviteMember`, `invitationLink`, `shareInvitation`, `acceptInvitation`, `pendingInvitations`, `revokeInvitation`
- `notificationController`: `registerPushToken`, `unregisterPushToken`, `remindFamilyMember`
- Other existing controllers: family, pet, preferences, memory, location, challenges.

## Known missing views / model gaps

Auth login/register/verification, invite link acceptance/code-entry, preference editing, optional memory location picker; integration of existing family remind and invite buttons. No model changes are required for the selected invitation and nudge flows. Existing `Invitation.deliveryStatus` remains `pending` because sharing is user-mediated; it does **not** mean email delivery. `Memory.location` lacks a display label. `Challenge` is defined in `src/types/firestore.ts`, not `models/challenges.ts`.
