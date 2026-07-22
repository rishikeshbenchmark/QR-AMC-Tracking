## What this changes

<!-- One or two sentences. What can a user do after this that they couldn't before? -->

## How I tested it

<!-- Not "it builds". What did you actually click, and what did you see? -->

## Checklist

Tick only what you have genuinely verified. An honest unticked box is useful;
a dishonest tick costs someone else an afternoon.

- [ ] Every read filters **both** `company_id` and `is_deleted`
- [ ] Input is zod-validated at the boundary, before the controller runs
- [ ] `requirePermission(...)` is on every non-public route
- [ ] No `password_hash` or `cost_price` can reach any DTO I added
- [ ] Multi-row writes are wrapped in a transaction
- [ ] An audit row is written for every mutation
- [ ] Loading, error, empty and success states all render (frontend)
- [ ] No `TODO`s, no placeholders, no commented-out code
- [ ] No `any`; types derive from the zod schema
- [ ] I did **not** create or edit a Prisma migration

## Anything you want a second opinion on?

<!-- Genuinely fine to say "I wasn't sure about X". Better here than in review. -->
