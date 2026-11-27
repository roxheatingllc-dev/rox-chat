/**
 * ROX Booking Widget v1.37 - "Try and get you in sooner" (no promise)
 *
 * v1.37 Changes (2026-11-27, server v2.364.0):
 *   - Jason: the red "Is your system not working at all?" box and its confirmation now say the
 *     office will call "to try and get you in sooner", not "to get you in sooner".
 *
 * v1.36 - "We emailed a link" when the email carries one
 *
 * v1.36 Changes (2026-11-26, server v2.353.0):
 *   - When the code text fails and the server emails the customer (the address
 *     on file — already verified), the email now carries a "Move my …
 *     appointment" link per appointment. The status reply says so
 *     (emailedLinks) and the code screen reads: "We couldn't reach your phone,
 *     so we emailed a link to r•••@gmail.com. Tap it to pick a new time — or
 *     enter the code from the email here."
 *   - Embed: booking-widget.js?v=36
 *
 * v1.35 - The code screen says what happened to the text
 *
 * v1.35 Changes (2026-11-26, server v2.351.0):
 *   - On 11/26 every code text to (720) 548-0200 failed at the carrier (30003)
 *     while the page said "We texted a 6-digit code". The server now checks
 *     delivery and falls back (backup number → email on file → office call).
 *     While the code screen is up the widget polls
 *     GET /api/booking/reschedule-code/status?sendId=… every 5 s for up to
 *     2.5 min and updates the message box in place (the code input is never
 *     re-rendered, so typing is not interrupted):
 *       retrying_backup → "Still sending… trying another number."
 *       emailed         → "We couldn't reach your phone, so we emailed your code to j•••@gmail.com."
 *       office_alerted  → "We couldn't reach your phone. Our office will call you shortly."
 *   - Embed: booking-widget.js?v=35
 *
 * v1.34 - Pick which appointment to move, right on the page
 *
 * v1.34 Changes (2026-11-26, server v2.347.0):
 *   - Jason: "It should pull up their next scheduled appointment and they can
 *     click which ones they want to reschedule." Phone → a 6-digit code texted
 *     to the mobile on file → the upcoming appointments (date, service, tech)
 *     → tap one → its calendar opens here (the existing reschedule mode, with
 *     that appointment's token). Appointments less than an hour away, or with
 *     no tech, say "please call us". Same form on the booking page box, the
 *     /reschedule page and the expired-link card.
 *
 * v1.33 - The /reschedule page is reschedule-only
 *
 * v1.33 Changes (2026-11-26):
 *   - Jason, on roxheating.com/reschedule: "it needs its own booking engine
 *     because this doesn't look like it's just for reschedule". Without a link
 *     code that page started the normal booking wizard. Now (path /reschedule,
 *     or data-mode="reschedule" on the container) it shows "Find your
 *     appointment": phone → text me a link. "Book a new appointment instead?"
 *     switches to the wizard. The expired/invalid-link card also offers a new
 *     link by text.
 *
 * v1.32 - "Need to reschedule an existing appointment?"
 *
 * v1.32 Changes (2026-11-26, server v2.346.0):
 *   - Jason: there was no reschedule link on the booking page. The first
 *     screen now has "Need to reschedule an existing appointment?" → phone →
 *     POST /api/booking/reschedule-link → the server texts the customer's
 *     personal reschedule link (this widget's reschedule mode) to the mobile
 *     number on file. The reply text is the server's, shown as-is.
 *
 * v1.31 - Air filter notice after a maintenance / service booking
 *
 * v1.31 Changes (2026-11-24):
 *   - Jason: after maintenance or service is scheduled the customer must be
 *     told to have an air filter ready — the tech changes it, ROX does not
 *     provide them. Shown on the success screen for maintenance and repair
 *     (not estimates or messages).
 *
 * v1.30 - 10+ yr maintenance: "Is your furnace not working?"
 *
 * v1.30 Changes (2026-11-24, server v2.343.0):
 *   - Rob Jaecks (11-yr furnace, Club maintenance) was shown Dec 23 and left.
 *     Jason: maintenance does not get same-day; ask "Is your furnace not
 *     working? You will need a service call and not maintenance". When
 *     /availability returns notWorkingCheck, the calendar shows that question.
 *     Yes → the server switches the booking to a service call (and drops the
 *     Club plan), the widget follows (serviceType 'repair', repair flow) and
 *     reloads the calendar, which then holds the same-day priority visit.
 *     No → the normal calendar (and the waitlist offer).
 *
 * v1.29 - The leave beacon says what they picked
 *
 * v1.29 Changes (2026-11-18, server v2.340.0):
 *   - The first funnel lines read "service=-" for a visitor who had picked a
 *     service: the widget only sends it to the server at the calendar. The
 *     leave beacon now carries serviceType and customerType too.
 *
 * v1.28 - Priority visit for 10+ yr systems; waitlist; where people leave
 *
 * v1.28 Changes (2026-11-18, server v2.339.0):
 *   - Jason: "10+-year-old system should never be offered such a far out date.
 *     They should be offered same-day booking just like AI voice would do."
 *     When /availability returns priorityVisit, the calendar holds ONE priority
 *     visit (the voice window: today 12–4, today 8–12, next business day 8–12;
 *     Monday from Saturday noon), with a banner saying the office will call to
 *     confirm the arrival time. It is booked unassigned, like voice.
 *   - waitlistOffer (maintenance / estimate, first opening 7+ days out): "Want
 *     us to call you if something opens sooner?" → POST /waitlist. The calendar
 *     stays usable to hold a spot.
 *   - The leave beacon now carries the current step, so the server can log
 *     where every visitor left ([BookingFunnel]).
 *
 * v1.27 - A down system is not shown a date a month away
 *
 * v1.27 Changes (2026-11-16, server v2.333.0):
 *   - Session 12d7ddcb (Mon 11/16 06:20): a repair on a 10+ year system was
 *     shown Dec 17 — 31 days out — as its first opening, and the customer left
 *     20 seconds later. Phone and chat hand a down system to the office
 *     instead (server v2.323.0, Kim). When /availability returns soonerHelp
 *     (a repair whose first opening is more than 3 days out) the calendar
 *     opens with "Our first opening online is Thu, Dec 17. Is your system not
 *     working at all?" and a "My system is down — call me" button. It posts
 *     /urgent-callback (urgent office alert; OPPORTUNITY CALL for 10+ yr) and
 *     shows when the office will call. The calendar stays available.
 *
 * v1.26 - The "ROX Install" tag answers the warranty question
 *
 * v1.26 Changes (2026-11-14, server v2.329.0):
 *   - Jason: the new "ROX Install" customer tag is how we know for sure ROX
 *     installed the equipment. /lookup-customer now returns roxInstallOnFile;
 *     a tagged customer who picks 0–2 years is not asked "Did ROX install
 *     it?" — the widget answers yes for them and goes to the warranty handoff.
 *
 * v1.25 - A member who is already scheduled is told so
 *
 * v1.25 Changes (2026-11-12, server v2.320.0):
 *   - Angela Brunow (Priority Comfort Club) booked a Fall Furnace tune-up here
 *     on 11/11 while her Club visit was already on the schedule for the next
 *     day. The server caught it at /confirm and alerted the office, but she was
 *     shown a normal confirmation. Now, when a member picks cooling / heating,
 *     /update-session returns existingClubVisit and the widget shows "You're
 *     already scheduled" (ALREADY_BOOKED) instead of the calendar, with three
 *     choices: that's all I needed / I need a different time (message to the
 *     office, pre-filled) / book another visit anyway (the old path, which the
 *     server still flags as a possible duplicate).
 *
 * v1.24 - What we already know is not asked
 *
 * v1.24 Changes (2026-10-17, server v2.266.0):
 *   - A known customer whose equipment age is on their HCP tags is not asked
 *     "How old is your system?" — the server's /lookup-customer now returns
 *     knownSystemAge ('3-10' or '10+'; never '0-2', which must still lead to
 *     the ROX-installed warranty question). Skipped once, going forward only;
 *     Back still shows the question.
 *   - A Priority Comfort Club member booking maintenance is not asked "Are you
 *     a Priority Comfort Club member?" — the lookup already knows. Straight to
 *     cooling / heating. (Scott Scheider and Samuel Larsen, members, left this
 *     page at the calendar on 10/16; the server now also shows members the
 *     Club page's technicians.)
 *
 * ROX Booking Widget v1.23 - The beacon actually arrives
 *
 * v1.23 Changes (2026-09-14):
 *   - 🔴 FIX: the abandon beacon was preflighted and dropped on unload. It
 *     sent a Blob typed application/json, which is not CORS-safelisted, so a
 *     cross-origin sendBeacon had to preflight — and the page died between the
 *     OPTIONS and the POST. Measured in the HTTP log: OPTIONS 204, no POST.
 *     Now sends a plain string (text/plain, safelisted, no preflight).
 *     REQUIRES routes/booking-routes.js to parse text/plain as JSON.
 *
 * ROX Booking Widget v1.22 - Leaving is reported when it happens
 *
 * v1.22 Changes (2026-09-14):
 *   - FIX: the abandon beacon was skipped for every customer whose name AND
 *     phone we held. The guard's comment reasons about the exit-capture modal;
 *     the code also cancelled the notification. Measured: a full run to the
 *     calendar produced no abandon line at all.
 *   - ADD: visibilitychange + pagehide leave detection, because beforeunload
 *     does not fire reliably on phones. A hide starts a 45s grace timer that
 *     returning cancels; a real departure skips the timer.
 *   - ADD: selectedSlot / selectedDate / issue are pushed when CHOSEN, not
 *     only at confirm, so an abandon alert can name the slot and the problem.
 *     Both rows existed in the office email template and were always blank.
 *   - REQUIRES rox-ai-answering v2.167.0, which stops deleting the session on
 *     /abandon. Deploy the server FIRST.
 *
 * ROX Booking Widget v1.21 - A lost session is rebuilt, not apologised for
 *
 * v1.21 Changes (2026-09-14):
 *          - api() now preserves the HTTP status and parsed body on the thrown
 *            Error, so a 404 is distinguishable from a 500.
 *          - recoverSession(): on a lost server-side session, open a new one
 *            and replay everything state.data still holds, then retry ONCE.
 *          - updateSession() no longer swallows a 404 silently.
 *          - confirmBooking() retries through the recovery; the server's
 *            v2.5.0 idempotency guard is what makes that safe.
 *          Real customer: Michael Connelly, 2026-09-14, session db6b595e —
 *          server restarted while he was on the calendar, and he got
 *          "Something went wrong. Please call us." twice.
 *          🔴 CACHE BUST: bump the WordPress embed to ?v=11.
 *
 * ROX Booking Widget v1.20 - The server decides the price, not the widget
 *
 * v1.20 Changes (2026-08-13):
 *   - FIX: getPricingBanner() no longer computes a fee. It renders
 *          `state.availability.visitFee`, resolved server-side by
 *          config/pricing.js in rox-ai-answering. This widget lives in a
 *          DIFFERENT git repo from the pricing rule, so its own copy of
 *          "if 10+ then $49 else $148" could not be updated when the rule
 *          changed -- and was not. Same pattern as weekendFee in v1.17.
 *   - FIX: "Not Sure" no longer submits '10+'. It shared a value with the
 *          "10+ Years" button, so an unknown age was priced at $49 and routed
 *          to a sales tech, and BOTH buttons highlighted when either was
 *          picked. Unknown now submits 'unknown' and prices at the standard
 *          fee (Jason 2026-08-13: never quote low and correct upward).
 *   - FIX: the "3-10 Years" button now reads "3-9 Years". The old labels
 *          overlapped at exactly ten, so a ten-year system was priced
 *          differently depending on which button the customer pressed.
 *   - CACHE: bump the WordPress embed to ?v=11.
 *
 * v1.19 Changes (2026-08-12):
 *
 * v1.19 Changes (2026-08-12):
 *   - ADD: STEPS.ESTIMATE_FOR — "What are you looking to get an estimate on?"
 *           with four options (Full HVAC System / Heat Pump Only / A/C Only /
 *           Furnace Only) that map to real HousecallPro Free Estimate price
 *           book items server-side. Placed BEFORE the calendar.
 *   - ADD: time-limited promo banner, sent by the server with its expiry
 *           already applied (config/estimate-options.js). The widget never
 *           decides whether a promo is live, so a banner announcing a deadline
 *           cannot outlive that deadline.
 *   - FIX: estimates no longer ask "How old is your system?", the Rox-installed
 *           question, or "Describe your issue". None of the three affect how an
 *           estimate is routed — every estimate goes to the 'sales' tag
 *           regardless — so they were questions whose answers were collected
 *           and then not used. Three fewer steps to a booked estimate.
 *   - FIX: the Review screen no longer renders an empty "System Age" row when
 *           there is no system age, and shows "Estimate For" instead.
 *   - REFACTOR: pathFor(serviceType, customerType) — the flow-name ternary was
 *           duplicated at three call sites; adding the estimate flow to two of
 *           three would have produced a customer who gets the estimate
 *           questions on the way in and the repair questions after a failed
 *           phone lookup.
 *   - Requires rox-ai-answering v2.41.9 (/start estimateConfig + estimateFor).
 *           Falls back to a static option list and no promo on an older server.
 *   - CACHE-BUST: bump the WordPress embed's ?v=N by one.
 *
 * v1.18 Changes (2026-08-12):
 *   - Tentative "office will confirm" slots are finally visible (see below).
 *
 * v1.18 Changes (2026-08-12):
 *   - FIX: tentative slots now render their .formatted label and a banner.
 *           When the routed tag has no bookable tech, the server synthesizes an
 *           office-callback window (booking-api.js
 *           synthesizeSalesBlockedTentativeDays) and marks each slot
 *           tentative:true. The widget rendered those exactly like real slots —
 *           a plain time range with nothing to indicate the appointment was not
 *           confirmed. A server-side code comment claimed this widget "renders
 *           .formatted directly"; it does not, and never did (shortLabel builds
 *           the label from start/end and only reaches .formatted inside a
 *           catch). So the "(office will confirm exact time)" disclosure that
 *           the whole tentative path depends on had never been shown to a
 *           customer. Found 2026-08-12 when the 'Sales' tag emptied and the
 *           path fired for the first time in production.
 *           Requires booking-api.js v2.41.8, which adds slot.tentative.
 *   - CACHE-BUST: bump the WordPress embed's ?v=N by one. Nothing in this
 *           build reaches customers until that edit is made.
 *
 * v1.17 Changes (2026-06-25):
 *   - FIX: the Saturday weekend-service-call fee shown on the calendar is no
 *           longer hardcoded $148. It now reads state.availability.weekendFee
 *           (the server sources it from weekend-handler.getWeekendFee(), the
 *           same dashboard-tunable value voice and chat use), falling back to
 *           148 only if an older server build omitted the field. Closes the
 *           last hardcoded-fee drift in the weekend-fee cross-channel gap.
 *           Requires the matching booking-api.js change that adds weekendFee to
 *           the /availability response, and a ?v= cache-bust on the embed.
 *
 * v1.16 Changes (2026-06-21):
 *   - FIX: Booking widget no longer computes the tech tag client-side and
 *           passes it as ?tag= to /availability. That client routing sent
 *           'service tech' for 0-2yr repairs — a tag that does NOT exist in
 *           config/tech-tags.js (the v2.21.10 SERVER fix was never mirrored
 *           into the widget), so those bookings silently pulled availability
 *           from ALL bookable employees instead of the service-tech filter.
 *           It also bypassed the heat-pump-router overrides (10+ AC/Furnace
 *           opportunity-call -> sales tech; heat-pump tag -> heat pump tech)
 *           that the server computes. loadAvailability() now pushes the
 *           routing-relevant fields to the session and calls /availability
 *           WITHOUT a tag, letting the server's determineTechTag (single
 *           source of truth, shared with voice/chat) decide. Collapses the
 *           'Tech tag selection' cross-channel danger-zone duplication.
 *   - FIX: goToStep() now fire-and-forget syncs the TRUE current step to the
 *           server so abandoned-booking emails report where the customer
 *           actually stopped. Previously only a few steps synced their step,
 *           so every calendar/contact/confirm abandon was mislabeled as
 *           'system_age' (the last step that happened to sync). Guarded on
 *           sessionId so it never fires in reschedule mode or before /start.
 *   - CACHE-BUST: embed bumped to ?v=16. Jason must update the WordPress
 *           embed to ?v=16 so customers fetch this build.
 *
 * v1.15 Changes (2026-06-05):
 *   - ADD: Out-of-area referral + city-save on the NEW-customer ADDRESS
 *           step (cross-channel parity with voice v2.22.71 and chat
 *           v2.22.73; booking was the last channel without it).
 *   - The widget now calls POST /api/booking/check-area when a new
 *           customer continues past the Service Address step. The engine
 *           owns the decision via the shared config/service-areas.js +
 *           config/referral-partner.js (single source of truth). Three
 *           outcomes the widget renders:
 *             1. inArea        -> proceed to Contact Info as before.
 *             2. cityServiced  -> "city-save": the typed city IS serviced
 *                                 but the zip isn't recognized for it (a
 *                                 mistyped zip). We DO NOT refer -- we
 *                                 trust the city, keep the customer on the
 *                                 Address step, and ask them to correct the
 *                                 zip. (Matches voice/chat.)
 *             3. confirmed OOA -> HARD GATE. Booking stops and the new
 *                                 REFERRAL screen offers GoodFellas Heating
 *                                 & Cooling. Yes shares the number; No is a
 *                                 polite close.
 *   - ADD: REFERRAL step + renderReferral() + checkServiceAreaOrRefer() +
 *           titleCaseCity() + handleAction cases referral-yes /
 *           referral-no / referral-fix-zip. REFERRAL is reached via
 *           goToStep() and is NOT part of any STEP_FLOW (like DECLINED /
 *           WARRANTY_HANDOFF).
 *   - CHANGE: validateStep() ADDRESS case no longer does the old local-set
 *           "click Continue again to proceed anyway" SOFT gate. The
 *           service-area decision now lives in checkServiceAreaOrRefer()
 *           (a /check-area server call), so a confirmed-out-of-area new
 *           customer is HARD-stopped + referred instead of booked anyway.
 *   - FIX: renderAddress() now displays state.error (it had no error slot,
 *           so out-of-area feedback was previously invisible on this step).
 *   - FAIL-OPEN: any /check-area network/engine error lets the customer
 *           proceed (never block a real booking on a transient bug) --
 *           mirrors the engine's own fail-open contract.
 *   - SCOPE: the message-flow zip gate (CONTACT_INFO) is intentionally
 *           UNCHANGED -- message flow forwards out-of-area leads to the
 *           office with an "OUT OF SERVICE AREA" tag (a referral there
 *           would be wrong). The local SERVICE_AREA_ZIPS set is now used
 *           ONLY by that message-flow gate; the authoritative area check
 *           is the server's /check-area.
 *   - CACHE-BUST: embed bumped to ?v=15 (the live WordPress embed was at
 *           ?v=14). Jason must update the WordPress embed to ?v=15 so
 *           customers fetch this v1.15 build instead of the cached v=14.
 *
 * v1.13 Changes (2026-05-04):
 *   - ADD: Short-link URL support. The dashboard's reschedule SMS now
 *           uses URLs like roxheating.com/reschedule?t=abc12345 (~46
 *           chars, single SMS segment) instead of the legacy
 *           ?token=<150-char-HMAC> form (~190 chars, two segments).
 *           Widget detects the ?t=<slug> param on mount and calls a
 *           new /api/reschedule/expand endpoint to swap the slug for
 *           the full token before proceeding. Backward compatible:
 *           legacy ?token=<HMAC> URLs skip the expand step entirely
 *           and go straight to /load like in v1.12.
 *   - ADD: getRescheduleSlugFromUrl() helper, parallels the existing
 *           getTokenFromUrl() so the URL-parsing surface is symmetric.
 *   - ADD: expandRescheduleSlug() helper, wraps the apiReschedule call
 *           and surfaces a clear error if the slug doesn't resolve.
 *           Slug-resolution failure (404, 503, anything else) maps to
 *           the same generic 'this link can't be used right now -- call
 *           us' fail card as a /load 401, since the customer experience
 *           is identical (broken/expired link).
 *
 * v1.12 Changes (2026-05-04):
 *   - ADD: Reschedule mode. When the widget mounts on a URL that has a
 *           ?token=... query parameter (the SMS deep link from the
 *           dashboard self-serve reschedule flow), the widget skips the
 *           entire booking wizard and renders a small calendar UI for
 *           the customer to pick a new time for an existing appointment.
 *   - ADD: 4 new STEPS constants — RESCHEDULE_LOAD, RESCHEDULE_CALENDAR,
 *           RESCHEDULE_SUCCESS, RESCHEDULE_FAIL — used only when in
 *           reschedule mode. They do NOT appear in any STEP_FLOW because
 *           reschedule mode bypasses the wizard's progress-bar concept.
 *   - ADD: apiReschedule() helper — parallels api()/apiGet() but hits
 *           /api/reschedule/* on the rox-chat proxy instead of /api/booking/*.
 *           Throws on non-2xx with err.status set so the caller can
 *           branch on the engine's HTTP status (401/410/409/502/503).
 *   - ADD: prewarmReschedule() — fire-and-forget call to /prewarm at
 *           mount time so the calendar's first render isn't waiting on
 *           14 sequential cold-cache fan-outs to Open-Meteo's archive
 *           API. Server returns 202 immediately. Failure is silent.
 *   - ADD: 5 failure-state cards. Per locked v2.12.0 design, statuses
 *           401/410-passed/500/502/503 ALL render the same generic
 *           "this link can't be used right now — please call (720)
 *           468-0689" card. ONLY 409 (slot taken between render and
 *           confirm) is special-cased into refetch + toast. ONLY the
 *           already-rescheduled state (returned from /load as
 *           state.alreadyRescheduled, NOT a 410 error) gets a special
 *           "you've moved this to <new date>" card with offer to move
 *           again.
 *   - ADD: TOAST UI. A small banner at the top of the calendar card
 *           that auto-dismisses after 5s. Used right now only for the
 *           409 "that time was just taken" case but written generically
 *           for any future ephemeral message.
 *   - ADD: Exit-intent and beforeunload abandonment listeners are
 *           SKIPPED in reschedule mode. The customer can always come
 *           back via the SMS link, so there's no abandon to capture.
 *
 * v1.11 Changes (2026-04-30):
 *   - FIX: Send firstName + lastName as separate fields to /update-session
 *           (after QUICK_INFO and inside confirmBooking) and to /message
 *           (submitMessage + exit-intent overlay). Previously only the
 *           combined `name` string was sent, so the server had no way to
 *           guarantee both halves were captured — if `state.data.name`
 *           somehow held only the first name (browser autofill quirk,
 *           empty lastName slipping past validation, or a stale cached
 *           v1.9 widget on a customer’s browser), the abandoned-booking
 *           email subject would read "Abandoned Booking — John" instead
 *           of "Abandoned Booking — John Smith". Server-side v2.7.4 now
 *           prefers `firstName + lastName` over the combined field; this
 *           widget version supplies them so the defensive resolution has
 *           the correct data to work with.
 *   - FIX: Exit-intent overlay click handler was passing a bare `name`
 *           identifier in the /message body. There is no local `name`
 *           variable in that scope — only `firstName`, `lastName`, and
 *           `phone` — so `name` resolved to `window.name` (the DOM
 *           window-name property, almost always an empty string). Every
 *           exit-intent message has been arriving at the office with
 *           `Name:` blank in the subject. Now passes
 *           `name: "${firstName} ${lastName}"` along with the explicit
 *           firstName/lastName fields.
 *
 * v1.10 Changes (2026-04-28):
 *   - FIX: Split single "Full Name" field into First Name + Last Name on
 *           three name-capture points: QUICK_INFO, CONTACT_INFO, and the
 *           exit-intent overlay. Previously, customers often typed only
 *           their first name into the single field — abandon emails ended
 *           up with subjects like "Abandoned Booking — Karen" instead of
 *           "Abandoned Booking — Karen Smith". The server-side subject
 *           template already uses the full name; the gap was that the
 *           form wasn't requiring both halves. Two separate inputs make
 *           the requirement obvious to the customer. state.data.name is
 *           still maintained as the single combined string "First Last"
 *           so server-side code that splits on whitespace (HCP customer
 *           creation, abandon email subject) continues to work unchanged.
 *
 * v1.9 Changes (2026-04-28):
 *   - ADD: TCPA consent checkbox on Confirm + Message steps. Existing
 *           customers and message-flow customers previously skipped the
 *           QUICK_INFO step where consent was first introduced, so they
 *           had no consent gate. Now blocked from submitting until the
 *           box is checked. State is shared via state.data._tcpaConsent
 *           so a customer who checked it on QUICK_INFO sees it pre-checked
 *           on Confirm — single click for new customers, single click
 *           for existing/message customers, no double-prompting either way.
 * 
 * Embed on any website:
 * <script>
 *   window.ROX_BOOKING_CONFIG = {
 *     serverUrl: "https://rox-chat-production.up.railway.app",
 *     theme: "rox-default",
 *     containerId: "rox-booking",
 *     companyName: "ROX Heating & Air",
 *     companyPhone: "(720) 468-0689"
 *   };
 * </script>
 * <div id="rox-booking"></div>
 * <script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js?v=12"></script>
 * 
 * v1.4 Changes:
 *   - FIX: Push name+phone to server after QUICK_INFO so abandon emails have contact info
 *   - ADD: Weather forecast temps on calendar days (Open-Meteo, 16-day, no API key)
 *   - ADD: Pricing banner on calendar (repair $148, maintenance $128, PCC, estimate free)
 *   - ADD: "Just to Confirm" messaging when contact info was already captured
 *   - FIX: Sort time slots chronologically after deduplication (renderCalendar)
 * 
 * Multi-tenant ready: pass tenantId in config for SaaS deployment
 */

(function() {
  'use strict';

  if (window.__ROX_BOOKING_INIT__) return;
  window.__ROX_BOOKING_INIT__ = true;

  const CONFIG = Object.assign({
    serverUrl: '',
    theme: 'rox-default',
    containerId: 'rox-booking',
    tenantId: 'rox-heating',
    companyName: 'ROX Heating & Air',
    companyPhone: '(720) 468-0689'
  }, window.ROX_BOOKING_CONFIG || {});

  const DEFAULT_THEME = {
    colors: {
      primary: '#F78C26',
      primaryHover: '#E07520',
      primaryLight: 'rgba(247,140,38,0.08)',
      primaryBorder: 'rgba(247,140,38,0.25)',
      bg: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#e8e8e8',
      text: '#1a1a1a',
      textSecondary: '#666666',
      textMuted: '#999999',
      inputBg: '#ffffff',
      inputBorder: '#d4d4d4',
      inputFocus: '#F78C26',
      successBg: '#f0fdf4',
      successBorder: '#86efac',
      successText: '#166534',
      errorBg: '#fef2f2',
      errorBorder: '#fca5a5',
      errorText: '#991b1b',
      calendarToday: 'rgba(247,140,38,0.12)',
      calendarAvailable: '#F78C26',
      calendarSelected: '#F78C26',
      calendarDisabled: '#e5e5e5',
      progressBg: '#e5e5e5',
      progressFill: '#F78C26',
      stepBtnBg: '#ffffff',
      stepBtnBorder: '#e5e5e5',
      stepBtnHoverBorder: '#F78C26',
      stepBtnHoverBg: 'rgba(247,140,38,0.04)',
      stepBtnActiveBg: '#F78C26',
      stepBtnActiveText: '#ffffff'
    },
    font: {
      family: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      importUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
    },
    borderRadius: 12,
    cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)'
  };

  let THEME = { ...DEFAULT_THEME };

  const STEPS = {
    SERVICE_TYPE: 'service_type',
    CUSTOMER_TYPE: 'customer_type',
    PHONE_LOOKUP: 'phone_lookup',
    QUICK_INFO: 'quick_info', // Name + phone early capture
    SYSTEM_AGE: 'system_age',
    CALENDAR: 'calendar',
    DESCRIBE_ISSUE: 'describe_issue',
    // v1.19 — free-estimate subject. Replaces SYSTEM_AGE + ROX_INSTALLED +
    // DESCRIBE_ISSUE for the estimate path; see STEP_FLOW.est_* below.
    ESTIMATE_FOR: 'estimate_for',
    ADDRESS: 'address',
    CONTACT_INFO: 'contact_info',
    CONFIRM: 'confirm',
    SUCCESS: 'success',
    MESSAGE: 'message',
    PCC_ASK: 'pcc_ask',
    PCC_TYPE: 'pcc_type',
    ROX_INSTALLED: 'rox_installed',
    WARRANTY_HANDOFF: 'warranty_handoff',
    DECLINED: 'declined',          // Shown when a service type is not supported
    REFERRAL: 'referral',          // v1.15 - out-of-area referral (GoodFellas). Reached via goToStep, not in any STEP_FLOW.
    ALREADY_BOOKED: 'already_booked', // v1.25 - member's Club visit is already scheduled. Reached via goToStep, not in any STEP_FLOW.
    // ── v1.12 RESCHEDULE MODE STEPS ─────────────────────
    // These four are NEVER part of any STEP_FLOW. They are only reached
    // via the URL ?token=... entry path in init(). The progress bar is
    // suppressed in reschedule mode (see render()).
    RESCHEDULE_LOAD: 'reschedule_load',
    RESCHEDULE_CALENDAR: 'reschedule_calendar',
    RESCHEDULE_SUCCESS: 'reschedule_success',
    RESCHEDULE_FAIL: 'reschedule_fail',
    RESCHEDULE_LOOKUP: 'reschedule_lookup'   // v1.33 — the /reschedule page with no link code
  };

  const STEP_FLOW = {
    new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.SYSTEM_AGE, STEPS.ROX_INSTALLED, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.SYSTEM_AGE, STEPS.ROX_INSTALLED, STEPS.CALENDAR, STEPS.DESCRIBE_ISSUE,
      STEPS.CONFIRM
    ],
    message_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.CONTACT_INFO,
      STEPS.MESSAGE, STEPS.SUCCESS
    ],
    message_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.MESSAGE, STEPS.SUCCESS
    ],
    pcc_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    pcc_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.PCC_ASK, STEPS.PCC_TYPE, STEPS.SYSTEM_AGE, STEPS.CALENDAR, STEPS.CONFIRM
    ],
    maint_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.PCC_ASK, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.DESCRIBE_ISSUE, STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    maint_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.PCC_ASK, STEPS.SYSTEM_AGE, STEPS.CALENDAR,
      STEPS.DESCRIBE_ISSUE, STEPS.CONFIRM
    ],
    // ── v1.19 — THE ESTIMATE PATH ────────────────────────────────────────
    // Estimates used to run on the `new` / `existing` flows, which meant a
    // customer asking to be quoted for a new system was asked how old their
    // current one is, whether ROX installed it, and to "describe your issue".
    //
    // None of those route an estimate: TECH_ROUTING.getTag sends every estimate
    // to the 'sales' tag regardless of age, and heat-pump-router returns no
    // override for estimates. Rox-installed drives the WARRANTY handoff, which
    // is meaningless for a replacement quote. So all three were questions whose
    // answers were collected and then not used — friction with no payoff.
    //
    // ESTIMATE_FOR sits BEFORE the calendar deliberately. What the customer
    // wants quoted is the one thing the comfort advisor actually needs, it is
    // the natural first question, and it is where the time-limited rebate
    // notice belongs — a deadline shown AFTER someone has already picked a date
    // has lost most of its point.
    est_new: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.QUICK_INFO,
      STEPS.ESTIMATE_FOR, STEPS.CALENDAR,
      STEPS.ADDRESS, STEPS.CONTACT_INFO, STEPS.CONFIRM
    ],
    est_existing: [
      STEPS.SERVICE_TYPE, STEPS.CUSTOMER_TYPE, STEPS.PHONE_LOOKUP,
      STEPS.ESTIMATE_FOR, STEPS.CALENDAR, STEPS.CONFIRM
    ]
  };

  /**
   * v1.19 — the ONE place a service type becomes a flow name.
   *
   * This ternary previously appeared at three separate call sites
   * (select-customer-type, select-pcc, switchToNewCustomer), each spelling out
   * `serviceType === 'maintenance' ? 'maint_x' : 'x'`. Adding the estimate flow
   * to two of three would have produced a customer who gets the estimate
   * questions on the way in and the repair questions after a failed phone
   * lookup. Centralised so that cannot happen.
   *
   * @param {string} serviceType  'repair' | 'estimate' | 'maintenance' | 'message'
   * @param {string} customerType 'new' | 'existing'
   * @returns {string} a key of STEP_FLOW
   */
  function pathFor(serviceType, customerType) {
    const existing = customerType === 'existing';
    if (serviceType === 'message')     return existing ? 'message_existing' : 'message_new';
    if (serviceType === 'maintenance') return existing ? 'maint_existing'   : 'maint_new';
    if (serviceType === 'estimate')    return existing ? 'est_existing'     : 'est_new';
    return existing ? 'existing' : 'new';
  }

  // Service area zip codes (Denver metro)
  const SERVICE_AREA_ZIPS = new Set([
    '80002','80003','80004','80005','80007','80010','80011','80012','80013','80014',
    '80015','80016','80017','80018','80019','80022','80045','80104','80108','80109',
    '80110','80111','80112','80113','80120','80121','80122','80123','80124','80125',
    '80126','80127','80128','80129','80130','80134','80138','80165','80166',
    '80202','80203','80204','80205','80206','80207','80208','80209','80210','80211',
    '80212','80214','80215','80216','80218','80219','80220','80221','80222','80223',
    '80224','80226','80227','80228','80230','80231','80232','80235','80236','80237',
    '80238','80239','80243','80244','80246','80247','80249'
  ]);

  let state = {
    sessionId: null,
    currentStep: STEPS.SERVICE_TYPE,
    path: null,
    data: {
      serviceType: null, customerType: null, systemAge: null,
      // v1.19 — free-estimate subject ('full_system' | 'heat_pump' | 'ac' |
      // 'furnace'). Server-validated; see config/estimate-options.js.
      estimateFor: null,
      selectedDate: null, selectedSlot: null, issue: '',
      name: '', phone: '', email: '', message: '',
      // v1.10 — name now collected as two separate fields. The combined
      // "First Last" string is mirrored into state.data.name on every
      // saveFormData() call so any code (server payloads, summaries,
      // back-compat) reading state.data.name keeps working unchanged.
      firstName: '', lastName: '',
      address: { street: '', city: '', state: 'CO', zip: '' },
      isPccMember: null,
      pccType: null, // 'cooling' or 'heating'
      _tcpaConsent: false, // TCPA/CTIA consent checkbox
      _addrSuggestions: [],
      _addrPicked: false,
      _addrLoading: false,
      _zipConfirmed: false,
      customer: null
    },
    availability: null, loading: false, error: null, confirmation: null,
    _weather: null,      // Map of YYYY-MM-DD → high temp in °F (from Open-Meteo)
    _isAfterHours: false, // Set at session start from server
    _isSunday: false,     // Set at session start from server
    // v1.14: Booking horizon (days ahead the calendar shows). Captured
    // from /start response. Falls back to 28 if the server is older
    // than v2.13.0 and didn't return the field.
    _bookingHorizonDays: 28,
    _declineMsg: null,    // Message shown on DECLINED step
    _declineOfferEstimate: false, // Whether to offer free estimate on decline screen
    // v1.15 - out-of-area referral state. _referral holds the text the
    // engine returned from /check-area ({ enabled, offerText, numberText });
    // _referralStage drives the REFERRAL screen ('offer' -> 'shared' | 'declined').
    _referral: null,
    _referralStage: null,
    _areaChecking: false, // re-entry guard while POST /check-area is in flight
    // ── v1.12 RESCHEDULE MODE STATE ─────────────────────
    // All reschedule-only state is _reschedule*-prefixed so it's clear
    // at a glance what belongs to the booking flow vs the reschedule
    // flow. None of these fields are touched by the booking wizard's
    // render functions.
    _rescheduleMode: false,        // True iff URL had ?token=... at mount time
    _rescheduleToken: null,        // The HMAC token from the URL (string)
    _rescheduleContext: null,      // Result of /load
    _rescheduleFailMode: null,     // 'generic' for 401/410-passed/500/502/503
    _rescheduleToast: null,        // Ephemeral message shown above calendar (e.g., 409)
    _rescheduleConfirmed: null,    // Result of /confirm — { jobId, newStartISO, newEndISO }
    _rescheduleToastTimer: null    // setTimeout handle so toasts auto-clear
  };

  // ============================================
  // API HELPERS
  // ============================================
  // v1.21 — the thrown Error now CARRIES THE STATUS CODE and the parsed body.
  // It used to collapse every non-2xx into a bare message, which is why a 404
  // "Session not found or expired" was indistinguishable from a 500 and the
  // customer got "Something went wrong. Please call us." either way. The
  // reschedule helper below has preserved status since v1.12; this brings the
  // booking path to parity so recoverSession() can branch on it.
  async function api(method, path, body = null) {
    const url = `${CONFIG.serverUrl}/api/booking${path}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const e = new Error(err.error || err.message || `Request failed: ${res.status}`);
      e.status = res.status;
      e.body = err;
      throw e;
    }
    return res.json();
  }

  async function apiGet(path, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${CONFIG.serverUrl}/api/booking${path}${query ? '?' + query : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  // ============================================
  // RESCHEDULE API HELPER (v1.12)
  // ============================================
  // Parallels api() / apiGet() but hits the rox-chat reschedule proxy at
  // /api/reschedule/*. The critical difference is that NON-2XX RESPONSES
  // PRESERVE THE ENGINE'S HTTP STATUS CODE on the thrown Error object, so
  // the caller can branch on err.status to distinguish:
  //   401 → token bad/missing/expired
  //   410 → appointment already passed
  //   409 → slot taken between render and confirm (refetch + toast)
  //   502 → HCP move failed
  //   503 → DB or availability service down
  //   500 → server bug
  // The standard api() helper above collapses all non-2xx into a generic
  // Error message; that's fine for the booking flow but useless for
  // reschedule, where 409 must be handled differently from 401.
  async function apiReschedule(method, path, body = null, queryParams = null) {
    let url = `${CONFIG.serverUrl}/api/reschedule${path}`;
    if (queryParams) {
      const qs = new URLSearchParams(queryParams).toString();
      if (qs) url += '?' + qs;
    }
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    // Read body whether 2xx or not — engine returns structured JSON on
    // errors too (e.g. { error: 'slot_taken' }) and the caller needs it.
    let json;
    try {
      json = await res.json();
    } catch (e) {
      json = { error: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      const err = new Error(json.error || json.message || `Request failed: ${res.status}`);
      err.status = res.status;     // <-- the bit booking api() drops
      err.body = json;
      throw err;
    }
    return json;
  }

  // ============================================
  // ADDRESS AUTOCOMPLETE (server-side Google Places)
  // ============================================
  let _addrTimer = null;

  // Update just the dropdown without rebuilding the whole DOM
  function updateAddrDropdown() {
    const wrap = root.querySelector('.rxb-addr-wrap');
    if (!wrap) return;

    // Remove existing dropdown
    const existing = wrap.querySelector('.rxb-addr-dropdown');
    if (existing) existing.remove();

    const suggestions = state._addrSuggestions || [];
    const showDropdown = suggestions.length > 0 && !state._addrPicked;

    if (state._addrLoading) {
      wrap.insertAdjacentHTML('beforeend', '<div class="rxb-addr-dropdown"><div class="rxb-addr-loading">Looking up address...</div></div>');
    } else if (showDropdown) {
      const html = '<div class="rxb-addr-dropdown">' + suggestions.map((s, i) =>
        `<div class="rxb-addr-item" data-action="pick-address" data-value="${i}"><span>${escapeHtml(s.mainText)}</span><small>${escapeHtml(s.secondaryText || '')}</small></div>`
      ).join('') + '</div>';
      wrap.insertAdjacentHTML('beforeend', html);
      // Attach click handlers to new dropdown items
      wrap.querySelectorAll('[data-action="pick-address"]').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent blur from firing before click
          handleAction({ currentTarget: el });
        });
      });
    }
  }

  async function fetchAddressSuggestions(query) {
    if (query.length < 3) { state._addrSuggestions = []; updateAddrDropdown(); return; }
    state._addrLoading = true; updateAddrDropdown();
    try {
      const url = `${CONFIG.serverUrl}/api/widget-config/address-suggest?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Suggest failed');
      const data = await res.json();
      state._addrSuggestions = data.suggestions || [];
      state._addrLoading = false;
      state._addrPicked = false;
      updateAddrDropdown();
    } catch (e) {
      state._addrSuggestions = [];
      state._addrLoading = false;
      updateAddrDropdown();
    }
  }
  async function fetchAddressDetails(placeId) {
    try {
      const url = `${CONFIG.serverUrl}/api/widget-config/address-details?placeId=${encodeURIComponent(placeId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Details failed');
      const data = await res.json();
      return data.address || null;
    } catch (e) { return null; }
  }

  // ============================================
  // THEME LOADER
  // ============================================
  async function loadTheme() {
    if (!CONFIG.serverUrl || !CONFIG.theme) return;
    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/themes/${CONFIG.theme}`);
      if (res.ok) {
        const themeData = await res.json();
        if (themeData.colors) {
          THEME.colors = Object.assign({}, DEFAULT_THEME.colors, {
            primary: themeData.colors.primary,
            primaryHover: themeData.colors.primaryHover,
            text: themeData.colors.botBubbleText || DEFAULT_THEME.colors.text,
            cardBg: themeData.colors.botBubbleBg || DEFAULT_THEME.colors.cardBg,
            inputBorder: themeData.colors.inputBorder || DEFAULT_THEME.colors.inputBorder,
            inputFocus: themeData.colors.inputFocusBorder || DEFAULT_THEME.colors.inputFocus
          });
          THEME.colors.primaryLight = hexToRgba(THEME.colors.primary, 0.08);
          THEME.colors.primaryBorder = hexToRgba(THEME.colors.primary, 0.25);
          THEME.colors.calendarAvailable = THEME.colors.primary;
          THEME.colors.calendarSelected = THEME.colors.primary;
          THEME.colors.calendarToday = hexToRgba(THEME.colors.primary, 0.12);
          THEME.colors.progressFill = THEME.colors.primary;
          THEME.colors.stepBtnHoverBorder = THEME.colors.primary;
          THEME.colors.stepBtnHoverBg = hexToRgba(THEME.colors.primary, 0.04);
          THEME.colors.stepBtnActiveBg = THEME.colors.primary;
        }
        if (themeData.font) {
          THEME.font = Object.assign({}, DEFAULT_THEME.font, themeData.font);
        }
        console.log('[ROX Booking] Theme loaded:', CONFIG.theme);
      }
    } catch (err) {
      console.warn('[ROX Booking] Theme load failed, using defaults:', err.message);
    }
  }

  function hexToRgba(hex, alpha) {
    if (!hex || hex.startsWith('rgba')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ============================================
  // CSS INJECTION
  // ============================================
  function injectStyles() {
    const C = THEME.colors;
    const F = THEME.font;
    const R = THEME.borderRadius;

    if (F.importUrl) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = F.importUrl;
      document.head.appendChild(link);
    }

    const style = document.createElement('style');
    style.textContent = `
      #rox-booking-root * { box-sizing: border-box; margin: 0; font-family: ${F.family}; }
      #rox-booking-root { max-width: 640px; margin: 0 auto; color: ${C.text}; line-height: 1.5; -webkit-font-smoothing: antialiased; }
      .rxb-header { text-align: center; margin-bottom: 28px; }
      .rxb-header h2 { font-size: 26px; font-weight: 700; color: ${C.text}; margin-bottom: 6px; letter-spacing: -0.3px; }
      .rxb-header p { font-size: 15px; color: ${C.textSecondary}; }
      .rxb-progress { display: flex; align-items: center; gap: 4px; margin-bottom: 32px; padding: 0 4px; }
      .rxb-progress-segment { flex: 1; height: 4px; border-radius: 2px; background: ${C.progressBg}; transition: background 0.4s ease; }
      .rxb-progress-segment.active { background: ${C.progressFill}; }
      .rxb-card { background: ${C.cardBg}; border: 1px solid ${C.cardBorder}; border-radius: ${R}px; padding: 32px 28px; box-shadow: ${THEME.cardShadow}; animation: rxbFadeIn 0.35s ease; }
      @keyframes rxbFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .rxb-card-title { font-size: 18px; font-weight: 600; color: ${C.text}; margin-bottom: 6px; }
      .rxb-card-subtitle { font-size: 14px; color: ${C.textSecondary}; margin-bottom: 24px; }
      .rxb-options { display: flex; flex-direction: column; gap: 10px; }
      .rxb-option-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px 20px; background: ${C.stepBtnBg}; border: 1.5px solid ${C.stepBtnBorder}; border-radius: ${R}px; cursor: pointer; text-align: left; font-size: 15px; font-weight: 500; color: ${C.text}; transition: all 0.2s ease; }
      .rxb-option-btn:hover { border-color: ${C.stepBtnHoverBorder}; background: ${C.stepBtnHoverBg}; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .rxb-option-btn.selected { border-color: ${C.primary}; background: ${C.primaryLight}; color: ${C.primary}; font-weight: 600; }
      .rxb-option-icon { font-size: 22px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: ${C.primaryLight}; border-radius: 10px; flex-shrink: 0; }
      .rxb-option-label { font-weight: 600; }
      .rxb-option-desc { font-size: 13px; color: ${C.textMuted}; font-weight: 400; margin-top: 2px; }
      .rxb-field { margin-bottom: 18px; }
      .rxb-label { display: block; font-size: 13px; font-weight: 600; color: ${C.textSecondary}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
      .rxb-input, .rxb-textarea { width: 100%; padding: 12px 16px; font-size: 15px; border: 1.5px solid ${C.inputBorder}; border-radius: ${R - 2}px; background: ${C.inputBg}; color: ${C.text}; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
      .rxb-input:focus, .rxb-textarea:focus { border-color: ${C.inputFocus}; box-shadow: 0 0 0 3px ${C.primaryLight}; }
      .rxb-input::placeholder, .rxb-textarea::placeholder { color: ${C.textMuted}; }
      .rxb-textarea { min-height: 100px; resize: vertical; font-family: ${F.family}; }
      .rxb-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 480px) { .rxb-input-row { grid-template-columns: 1fr; } }
      .rxb-calendar { margin-bottom: 20px; }
      .rxb-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
      .rxb-cal-title { font-size: 16px; font-weight: 600; }
      .rxb-cal-nav-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid ${C.cardBorder}; border-radius: 8px; background: ${C.cardBg}; cursor: pointer; font-size: 14px; color: ${C.textSecondary}; transition: all 0.15s ease; }
      .rxb-cal-nav-btn:hover { border-color: ${C.primary}; color: ${C.primary}; }
      .rxb-cal-nav-btn:disabled { opacity: 0.3; cursor: default; }
      .rxb-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
      .rxb-cal-dow { font-size: 11px; font-weight: 600; color: ${C.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0; }
      .rxb-cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; border-radius: 10px; border: none; background: transparent; color: ${C.textMuted}; cursor: default; transition: all 0.15s ease; gap: 1px; padding: 2px 0; }
      .rxb-cal-day .rxb-cal-temp { font-size: 9px; font-weight: 400; opacity: 0.7; line-height: 1; }
      .rxb-cal-day.empty { visibility: hidden; }
      .rxb-cal-day.today { background: ${C.calendarToday}; color: ${C.text}; }
      .rxb-cal-day.available { background: ${C.primaryLight}; color: ${C.primary}; font-weight: 600; cursor: pointer; }
      .rxb-cal-day.available:hover { background: ${C.primary}; color: #fff; transform: scale(1.08); }
      .rxb-cal-day.selected { background: ${C.calendarSelected}; color: #fff; font-weight: 700; box-shadow: 0 2px 8px ${hexToRgba(C.primary, 0.35)}; }
      .rxb-cal-day.past { opacity: 0.3; }
      .rxb-slots { margin-top: 20px; animation: rxbFadeIn 0.3s ease; }
      .rxb-slots-title { font-size: 14px; font-weight: 600; color: ${C.textSecondary}; margin-bottom: 12px; }
      .rxb-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
      .rxb-slot-btn { padding: 10px 12px; font-size: 14px; font-weight: 500; border: 1.5px solid ${C.cardBorder}; border-radius: ${R - 2}px; background: ${C.cardBg}; color: ${C.text}; cursor: pointer; text-align: center; transition: all 0.2s ease; }
      .rxb-slot-btn:hover { border-color: ${C.primary}; background: ${C.primaryLight}; color: ${C.primary}; }
      .rxb-slot-btn.selected { border-color: ${C.primary}; background: ${C.primary}; color: #fff; font-weight: 600; }
      .rxb-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid ${C.cardBorder}; }
      .rxb-back-btn { display: flex; align-items: center; gap: 6px; padding: 10px 18px; font-size: 14px; font-weight: 500; color: ${C.textSecondary}; background: transparent; border: 1px solid ${C.cardBorder}; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; }
      .rxb-back-btn:hover { border-color: ${C.primary}; color: ${C.primary}; }
      .rxb-next-btn { padding: 12px 28px; font-size: 15px; font-weight: 600; color: #fff; background: ${C.primary}; border: none; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px ${hexToRgba(C.primary, 0.3)}; }
      .rxb-next-btn:hover { background: ${C.primaryHover}; transform: translateY(-1px); box-shadow: 0 4px 12px ${hexToRgba(C.primary, 0.4)}; }
      .rxb-next-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
      .rxb-summary { border: 1px solid ${C.cardBorder}; border-radius: ${R - 2}px; overflow: hidden; }
      .rxb-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid ${C.cardBorder}; }
      .rxb-summary-row:last-child { border-bottom: none; }
      .rxb-summary-label { font-size: 13px; font-weight: 600; color: ${C.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; }
      .rxb-summary-value { font-size: 15px; font-weight: 500; color: ${C.text}; }
      .rxb-success { text-align: center; padding: 20px 0; }
      .rxb-success-icon { width: 64px; height: 64px; border-radius: 50%; background: ${C.successBg}; border: 2px solid ${C.successBorder}; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 20px; color: ${C.successText}; }
      .rxb-success h3 { font-size: 22px; font-weight: 700; color: ${C.text}; margin-bottom: 8px; }
      .rxb-success p { font-size: 15px; color: ${C.textSecondary}; margin-bottom: 4px; }
      .rxb-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; gap: 16px; }
      .rxb-spinner { width: 36px; height: 36px; border: 3px solid ${C.progressBg}; border-top-color: ${C.primary}; border-radius: 50%; animation: rxbSpin 0.8s linear infinite; }
      @keyframes rxbSpin { to { transform: rotate(360deg); } }
      .rxb-loading-text { font-size: 14px; color: ${C.textSecondary}; }
      .rxb-pricing-banner { padding: 14px 18px; border-radius: ${R - 2}px; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
      .rxb-pricing-banner.repair { background: #FFF7ED; border: 1px solid #FDBA74; color: #9A3412; }
      .rxb-pricing-banner.maintenance { background: #F0FDF4; border: 1px solid #86EFAC; color: #166534; }
      .rxb-pricing-banner.estimate { background: #EFF6FF; border: 1px solid #93C5FD; color: #1E40AF; }
      .rxb-pricing-banner strong { font-weight: 600; }
      .rxb-consent { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 14px 16px; background: ${C.primaryLight}; border: 1px solid ${C.primaryBorder}; border-radius: ${R - 2}px; cursor: pointer; }
      .rxb-consent input[type="checkbox"] { margin-top: 3px; width: 18px; height: 18px; flex-shrink: 0; accent-color: ${C.primary}; cursor: pointer; }
      .rxb-consent-text { font-size: 12px; line-height: 1.5; color: ${C.textSecondary}; }
      .rxb-error { padding: 14px 18px; background: ${C.errorBg}; border: 1px solid ${C.errorBorder}; border-radius: ${R - 2}px; color: ${C.errorText}; font-size: 14px; margin-bottom: 16px; }
      .rxb-customer-card { padding: 16px 20px; background: ${C.successBg}; border: 1px solid ${C.successBorder}; border-radius: ${R - 2}px; margin-bottom: 20px; }
      .rxb-customer-card h4 { font-size: 15px; font-weight: 600; color: ${C.successText}; margin-bottom: 4px; }
      .rxb-customer-card p { font-size: 13px; color: ${C.textSecondary}; }
      .rxb-addr-wrap { position: relative; }
      .rxb-addr-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: ${C.cardBg}; border: 1.5px solid ${C.primary}; border-top: none; border-radius: 0 0 ${R - 2}px ${R - 2}px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 50; overflow: hidden; }
      .rxb-addr-item { padding: 12px 16px; font-size: 14px; color: ${C.text}; cursor: pointer; border-bottom: 1px solid ${C.cardBorder}; transition: background 0.15s; }
      .rxb-addr-item:last-child { border-bottom: none; }
      .rxb-addr-item:hover { background: ${C.primaryLight}; color: ${C.primary}; }
      .rxb-addr-item small { display: block; font-size: 12px; color: ${C.textMuted}; margin-top: 2px; }
      .rxb-addr-loading { padding: 12px 16px; font-size: 13px; color: ${C.textMuted}; text-align: center; }
      /* ── v1.12 RESCHEDULE MODE STYLES ──────────────── */
      /* Toast: shows above the calendar after a 409 race-condition refetch.
         Auto-dismisses after 5s via setTimeout in showRescheduleToast(). */
      .rxb-toast { padding: 12px 16px; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: ${R - 2}px; color: #92400E; font-size: 14px; line-height: 1.5; margin-bottom: 16px; animation: rxbFadeIn 0.3s ease; display: flex; align-items: center; gap: 10px; }
      .rxb-toast-icon { font-size: 18px; flex-shrink: 0; }
      /* "Move from X to Y" header: appears at the top of the reschedule
         calendar so the customer can see what they're moving. */
      .rxb-from-card { background: ${C.primaryLight}; border: 1px solid ${C.primaryBorder}; border-radius: ${R - 2}px; padding: 16px 20px; margin-bottom: 20px; }
      .rxb-from-card h4 { font-size: 15px; font-weight: 600; color: ${C.text}; margin-bottom: 4px; }
      .rxb-from-card p { font-size: 14px; color: ${C.textSecondary}; line-height: 1.5; }
      .rxb-from-card strong { color: ${C.text}; font-weight: 600; }
      /* Side-by-side button row used on the "already rescheduled" card.
         Each button is full-width on mobile (single column), 50/50 on desktop. */
      .rxb-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
      @media (max-width: 480px) { .rxb-btn-row { grid-template-columns: 1fr; } }
      .rxb-btn-secondary { padding: 12px 24px; font-size: 15px; font-weight: 500; color: ${C.text}; background: ${C.cardBg}; border: 1.5px solid ${C.cardBorder}; border-radius: ${R - 2}px; cursor: pointer; transition: all 0.2s ease; }
      .rxb-btn-secondary:hover { border-color: ${C.primary}; color: ${C.primary}; }
      @media (max-width: 480px) { .rxb-card { padding: 24px 18px; } .rxb-header h2 { font-size: 22px; } .rxb-slots-grid { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // RENDER ENGINE
  // ============================================
  let root = null;

  function getStepIndex() {
    const flow = state.path ? STEP_FLOW[state.path] : STEP_FLOW.new;
    return flow.indexOf(state.currentStep);
  }

  function getTotalSteps() {
    const flow = state.path ? STEP_FLOW[state.path] : STEP_FLOW.new;
    return flow.length;
  }

  function render() {
    if (!root) return;
    let html = '';

    // ── v1.12 — header for reschedule mode is different, and we
    // suppress the booking wizard's progress bar (the reschedule flow
    // has only 2-3 steps total — load → calendar → done — and a
    // progress bar would feel oversized for that).
    if (state._rescheduleMode) {
      const rlSub = state.currentStep === STEPS.RESCHEDULE_LOOKUP ? 'Find your appointment and pick a new time' : 'Pick a new time that works for you';   // v1.33 / v1.34
      html += `<div class="rxb-header"><h2>Reschedule Your Appointment</h2><p>${rlSub}</p></div>`;
    } else {
      const stepIdx = getStepIndex();
      const totalSteps = getTotalSteps();
      const isMessage = state.data.serviceType === 'message';
      const headerTitle = isMessage ? 'Send a Message' : 'Book an Appointment';
      const headerSub = isMessage ? `Send a message to ${CONFIG.companyName}` : `Schedule your service with ${CONFIG.companyName}`;
      html += `<div class="rxb-header"><h2>${headerTitle}</h2><p>${headerSub}</p></div>`;
      if (state.currentStep !== STEPS.SUCCESS) {
        html += '<div class="rxb-progress">';
        for (let i = 0; i < totalSteps; i++) {
          html += `<div class="rxb-progress-segment${i <= stepIdx ? ' active' : ''}"></div>`;
        }
        html += '</div>';
      }
    }
    html += renderStep();
    root.innerHTML = html;
    attachEvents();
  }

  function renderStep() {
    switch (state.currentStep) {
      case STEPS.SERVICE_TYPE: return renderServiceType();
      case STEPS.CUSTOMER_TYPE: return renderCustomerType();
      case STEPS.PHONE_LOOKUP: return renderPhoneLookup();
      case STEPS.QUICK_INFO: return renderQuickInfo();
      case STEPS.SYSTEM_AGE: return renderSystemAge();
      case STEPS.ROX_INSTALLED: return renderRoxInstalled();
      case STEPS.WARRANTY_HANDOFF: return renderWarrantyHandoff();
      case STEPS.DECLINED: return renderDeclined();
      case STEPS.REFERRAL: return renderReferral();
      case STEPS.CALENDAR: return renderCalendar();
      case STEPS.DESCRIBE_ISSUE: return renderDescribeIssue();
      case STEPS.ESTIMATE_FOR: return renderEstimateFor();
      case STEPS.MESSAGE: return renderMessage();
      case STEPS.PCC_ASK: return renderPccAsk();
      case STEPS.PCC_TYPE: return renderPccType();
      case STEPS.ALREADY_BOOKED: return renderAlreadyBooked();
      case STEPS.ADDRESS: return renderAddress();
      case STEPS.CONTACT_INFO: return renderContactInfo();
      case STEPS.CONFIRM: return renderConfirm();
      case STEPS.SUCCESS: return renderSuccess();
      // v1.12 — reschedule mode steps
      case STEPS.RESCHEDULE_LOAD: return renderRescheduleLoad();
      case STEPS.RESCHEDULE_CALENDAR: return renderRescheduleCalendar();
      case STEPS.RESCHEDULE_SUCCESS: return renderRescheduleSuccess();
      case STEPS.RESCHEDULE_FAIL: return renderRescheduleFail();
      case STEPS.RESCHEDULE_LOOKUP: return renderRescheduleLookupPage();   // v1.33
      default: return '<p>Unknown step</p>';
    }
  }

  function renderServiceType() {
    const options = [
      { value: 'repair', icon: '\uD83D\uDD27', label: 'System Not Working', desc: 'Fix a broken or malfunctioning system' },
      { value: 'estimate', icon: '\uD83D\uDCCB', label: 'Free Estimate', desc: 'New installations only' },
      { value: 'maintenance', icon: '\uD83D\uDEE1\uFE0F', label: 'Maintenance', desc: 'Annual tune-up and system check' },
      { value: 'message', icon: '\uD83D\uDCE9', label: 'Send a Message', desc: 'Send a message or request to our office' }
    ];
    // After-hours banner — shown when the office is closed at the time the widget was opened.
    // The server detects this at /start and sends back isAfterHours + isSunday flags.
    const afterHoursHtml = state._isAfterHours
      ? `<div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:14px;color:#1E40AF;">\uD83C\uDF19 <strong>${state._isSunday ? "We're closed today" : "We're currently closed"}</strong> \u2014 but you can still book an appointment here and we'll confirm ${state._isSunday ? 'Monday morning' : 'first thing in the morning'}!</div>`
      : '';
    return `<div class="rxb-card"><div class="rxb-card-title">What do you need help with?</div><div class="rxb-card-subtitle">Select the service you're looking for</div>${afterHoursHtml}<div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.serviceType === o.value ? ' selected' : ''}" data-action="select-service" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderRescheduleLookup()}</div>`;
  }

  // v1.32 — "Need to reschedule an existing appointment?" (server v2.346.0). The
  // server texts the customer's personal reschedule link to the MOBILE NUMBER ON
  // FILE — never to the number typed here — and the link opens this widget in
  // reschedule mode. Lives on the first screen so nobody books a second visit
  // just to move the first one.
  function renderRescheduleLookup() {
    const C = THEME.colors;
    if (!state._rlOpen) {
      return `<div style="margin-top:18px;text-align:center"><button data-action="rl-open" style="background:none;border:none;color:${C.primary};font-size:14px;font-weight:600;cursor:pointer;text-decoration:underline">Need to reschedule an existing appointment?</button></div>`;
    }
    return `<div style="margin-top:18px;padding:16px;border:1px solid ${C.cardBorder};border-radius:10px;background:${C.stepBtnBg}">`
      + `<div style="font-size:15px;font-weight:700;margin-bottom:4px;color:${C.text}">Reschedule an existing appointment</div>`
      + `<div style="font-size:13px;margin-bottom:10px;color:${C.textSecondary}">Enter the phone number on your account. We'll text you a code, then show your appointments.</div>`
      + renderRescheduleLookupForm('')
      + `</div>`;
  }

  function renderCustomerType() {
    const options = [
      { value: 'existing', icon: '\uD83D\uDC64', label: 'Existing Customer', desc: "I've used ROX before" },
      { value: 'new', icon: '\uD83D\uDC4B', label: 'New Customer', desc: 'This is my first time' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Have you worked with us before?</div><div class="rxb-card-subtitle">This helps us look up your account</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.customerType === o.value ? ' selected' : ''}" data-action="select-customer-type" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  function renderPhoneLookup() {
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const customerHtml = state.data.customer ? `<div class="rxb-customer-card"><h4>\u2714 Welcome back, ${state.data.customer.firstName || state.data.name}!</h4><p>${state.data.customer.address ? `${state.data.customer.address.street}, ${state.data.customer.address.city}` : 'Account found'}</p></div>` : '';
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Looking up your account...</div></div></div>`;
    }
    return `<div class="rxb-card"><div class="rxb-card-title">Let's find your account</div><div class="rxb-card-subtitle">Enter the phone number on your account</div>${errorHtml}${customerHtml}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div>${!state.data.customer ? `<button class="rxb-next-btn" style="width:100%" data-action="lookup-phone" ${!state.data.phone || state.data.phone.length < 10 ? 'disabled' : ''}>Look Up Account</button>` : ''}${renderNav(true, !!state.data.customer)}</div>`;
  }

  function renderQuickInfo() {
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const consentHtml = `<label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label>`;
    // v1.10 — split into First Name + Last Name fields. Reuses the existing
    // .rxb-input-row 2-column grid (also used for City + Zip). Pre-fills
    // from firstName/lastName if set, OR from a previously-combined
    // state.data.name (split on the first whitespace). The split-on-load
    // matters when a customer lands here from a prior step that only knew
    // the combined name string.
    const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
    const ln = state.data.lastName  || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : '');
    const nameRow = `<div class="rxb-input-row">`
      + `<div class="rxb-field"><label class="rxb-label">First Name</label><input type="text" class="rxb-input" id="rxb-first-name" placeholder="John" value="${escapeHtml(fn)}" autocomplete="given-name"></div>`
      + `<div class="rxb-field"><label class="rxb-label">Last Name</label><input type="text" class="rxb-input" id="rxb-last-name" placeholder="Smith" value="${escapeHtml(ln)}" autocomplete="family-name"></div>`
      + `</div>`;
    return `<div class="rxb-card"><div class="rxb-card-title">Quick Info</div><div class="rxb-card-subtitle">In case we get disconnected, we'd love to be able to reach you</div>${errorHtml}${nameRow}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div>${consentHtml}${renderNav(true, true)}</div>`;
  }

  function renderSystemAge() {
    // v1.20: ranges are disjoint and 'Not Sure' has its own value. The bucket
    // token '3-10' is kept verbatim because tech routing, HCP notes and office
    // emails all key on that exact string server-side; only the LABEL changes.
    const options = [
      { value: '0-2', icon: '\uD83C\uDD95', label: '0\u20132 Years' },
      { value: '3-10', icon: '\u2705', label: '3\u20139 Years' },
      { value: '10+', icon: '\uD83D\uDD34', label: '10+ Years' },
      { value: 'unknown', icon: '\u2753', label: 'Not Sure' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">How old is your system?</div><div class="rxb-card-subtitle">This helps us send the right technician</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.systemAge === o.value ? ' selected' : ''}" data-action="select-age" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  // ============================================
  // ROX INSTALLED CHECK — renders after system_age for 0-2 year systems
  // ============================================
  function renderRoxInstalled() {
    const options = [
      { value: 'yes',      icon: '\u2705', label: 'Yes, ROX installed it' },
      { value: 'no',       icon: '\u274C', label: 'No' },
      { value: 'not-sure', icon: '\u2753', label: "I'm not sure" }
    ];
    return '<div class="rxb-card">'
      + '<div class="rxb-card-title">Was your system installed by ROX Heating & Air?</div>'
      + '<div class="rxb-card-subtitle">This helps us determine if your service may be covered under warranty</div>'
      + '<div class="rxb-options">'
      + options.map(o =>
          '<button class="rxb-option-btn" data-action="rox-installed" data-value="' + o.value + '">'
          + '<div class="rxb-option-icon">' + o.icon + '</div>'
          + '<div><div class="rxb-option-label">' + o.label + '</div></div>'
          + '</button>'
        ).join('')
      + '</div>'
      + renderNav(true, false)
      + '</div>';
  }

  function renderWarrantyHandoff() {
    return '<div class="rxb-card">'
      + '<div class="rxb-success">'
      + '<div class="rxb-success-icon" style="font-size:32px; background:none; border:none;">\uD83D\uDD27</div>'
      + '<h3>We\'ll Be in Touch!</h3>'
      + '<p>We have all of your information and our team will reach out to you as soon as possible.</p>'
      + '<p style="margin-top:16px; font-size:13px; color:' + THEME.colors.textMuted + '">'
      + 'Questions? Call us at <strong>' + CONFIG.companyPhone + '</strong></p>'
      + '</div>'
      + '</div>';
  }

  // ============================================
  // DECLINED STEP — shown when we can't service a request
  // e.g. duct cleaning, water heater 10+ years
  // If offerEstimate is true, customer can pivot to a free estimate.
  // ============================================
  function renderDeclined() {
    const msg = state._declineMsg || "Unfortunately we're unable to service this request at this time.";
    const C = THEME.colors;
    const offerHtml = state._declineOfferEstimate
      ? `<p style="margin-top:14px;font-size:14px;color:${C.textSecondary}">We can schedule a <strong>free estimate</strong> to discuss your replacement options!</p>`
        + `<button data-action="decline-estimate" style="margin-top:16px;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;background:${C.primary};border:none;border-radius:10px;cursor:pointer;width:100%">Schedule Free Estimate \u2192</button>`
        + `<div style="margin-top:10px"><button data-action="decline-restart" style="background:none;border:none;color:${C.textMuted};font-size:13px;cursor:pointer;padding:6px 0">No thanks, start over</button></div>`
      : `<p style="margin-top:16px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p>`
        + `<div style="margin-top:14px"><button data-action="decline-restart" style="background:none;border:none;color:${C.primary};font-size:13px;cursor:pointer;text-decoration:underline">\u2190 Start over</button></div>`;
    return `<div class="rxb-card"><div class="rxb-success">`
      + `<div class="rxb-success-icon" style="background:#FFF7ED;border-color:#FDBA74;color:#C2410C;font-size:26px;">\u26A0\uFE0F</div>`
      + `<h3 style="color:${C.text}">We're Sorry</h3>`
      + `<p style="color:${C.textSecondary}">${escapeHtml(msg)}</p>`
      + offerHtml
      + `</div></div>`;
  }

  // ============================================
  // REFERRAL STEP (v1.15) - out-of-area hard gate
  // ============================================
  // Shown only when /check-area returns a CONFIRMED out-of-area zip (zip
  // not serviced AND typed city not serviced). The booking flow is
  // hard-stopped here. We offer the partner's phone number (GoodFellas),
  // and share it ONLY after the customer taps Yes -- the engine's
  // offerText never contains the number; numberText does.
  //
  // Three stages via state._referralStage:
  //   'offer'    -> offer line + Yes / No + a "fix my zip" escape hatch
  //   'shared'   -> number line + polite close
  //   'declined' -> polite close
  function renderReferral() {
    const C = THEME.colors;
    const ref = state._referral || {};
    const stage = state._referralStage || 'offer';

    if (stage === 'shared') {
      const numberText = ref.numberText || ('Please call ' + CONFIG.companyPhone + ' and we can point you in the right direction.');
      return `<div class="rxb-card"><div class="rxb-success">`
        + `<div class="rxb-success-icon" style="font-size:30px;">\uD83D\uDCDE</div>`
        + `<h3 style="color:${C.text}">Here You Go</h3>`
        + `<p style="color:${C.textSecondary};line-height:1.6">${escapeHtml(numberText)}</p>`
        + `<p style="margin-top:18px;font-size:13px;color:${C.textMuted}">Thanks for thinking of ${escapeHtml(CONFIG.companyName)} \u2014 take care!</p>`
        + `</div></div>`;
    }

    if (stage === 'declined') {
      return `<div class="rxb-card"><div class="rxb-success">`
        + `<div class="rxb-success-icon" style="font-size:30px;">\uD83D\uDC4B</div>`
        + `<h3 style="color:${C.text}">No Problem</h3>`
        + `<p style="color:${C.textSecondary};line-height:1.6">Thanks for thinking of ${escapeHtml(CONFIG.companyName)}. If anything changes, we're always here.</p>`
        + `<p style="margin-top:18px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p>`
        + `</div></div>`;
    }

    // stage === 'offer'
    const offerText = ref.offerText || 'That address is outside our service area.';
    return `<div class="rxb-card">`
      + `<div class="rxb-card-title">Outside Our Service Area</div>`
      + `<div class="rxb-card-subtitle" style="margin-bottom:20px">${escapeHtml(offerText)}</div>`
      + `<div class="rxb-options">`
      +   `<button class="rxb-option-btn" data-action="referral-yes"><div class="rxb-option-icon">\uD83D\uDC4D</div><div><div class="rxb-option-label">Yes, share their number</div></div></button>`
      +   `<button class="rxb-option-btn" data-action="referral-no"><div class="rxb-option-icon">\u274C</div><div><div class="rxb-option-label">No thanks</div></div></button>`
      + `</div>`
      + `<div style="margin-top:16px;text-align:center"><button data-action="referral-fix-zip" style="background:none;border:none;color:${C.primary};font-size:13px;cursor:pointer;text-decoration:underline">\u2190 Wrong zip? Let me fix it</button></div>`
      + `</div>`;
  }

  // Called when customer taps Yes / No / Not Sure on the ROX installed step.
  // Yes  → POST /warranty-check → show WARRANTY_HANDOFF screen.
  // No / Not sure → proceed to calendar as normal.
  async function handleRoxInstalledAction(value) {
    state.data.roxInstalled = value;

    if (value === 'yes') {
      state.loading = true;
      state.error   = null;
      render();

      try {
        const result = await api('POST', '/warranty-check', {
          sessionId:   state.sessionId,
          roxInstalled: true,
          serviceType: state.data.serviceType,
          systemAge:   state.data.systemAge,
          issue:       state.data.issue       || '',
          name:        state.data.name        || '',
          phone:       state.data.phone       || '',
          email:       state.data.email       || ''
        });

        state.loading = false;

        if (result && result.warrantyHandoff) {
          goToStep(STEPS.WARRANTY_HANDOFF);
        } else {
          // Server says not a warranty — continue to calendar
          goToStep(STEPS.CALENDAR);
          loadAvailability();
        }
      } catch (err) {
        state.loading = false;
        state.error   = 'Something went wrong. Please try again or call ' + CONFIG.companyPhone;
        render();
      }
    } else {
      // Not ROX installed — proceed to calendar
      goToStep(STEPS.CALENDAR);
      loadAvailability();
    }
  }

  // ── Pricing banner for calendar step ──
  // v1.20: this function no longer knows any prices. The server resolves the
  // fee with config/pricing.js and sends it as `availability.visitFee`. Adding
  // an amount back into this file re-creates the drift it was written to end.
  function getPricingBanner() {
    const svc = state.data.serviceType;
    const isPcc = state.data.isPccMember;
    const visitFee = state.availability && state.availability.visitFee;

    if (svc === 'repair') {
      // Server-resolved. Falls back to a fee-free line rather than guessing a
      // number: an older server build that predates visitFee would otherwise
      // have this widget confidently quote a stale amount, which is the exact
      // failure being fixed. No banner beats a wrong price.
      if (visitFee && visitFee.text) {
        var feeLabel = visitFee.isFree
          ? 'No Charge For This Visit'
          : 'Service Call Fee: $' + visitFee.amount;
        return '<div class="rxb-pricing-banner repair"><strong>\uD83D\uDCB0 ' + feeLabel +
               '</strong><br>' + visitFee.text + '</div>';
      }
      return '<div class="rxb-pricing-banner repair"><strong>\uD83D\uDCB0 Service Call</strong><br>Your technician will confirm the service call fee when they schedule your visit.</div>';
    }
    if (svc === 'maintenance') {
      if (isPcc) {
        return '<div class="rxb-pricing-banner maintenance"><strong>\u2B50 PCC Member \u2014 No Charge!</strong><br>Your maintenance is included with your Priority Comfort Club membership.</div>';
      }
      return '<div class="rxb-pricing-banner maintenance"><strong>\uD83D\uDEE0\uFE0F Tune-Up Fee: $128</strong><br>One-time tune-up is $128. Ask about our <strong>Priority Comfort Club</strong> \u2014 just $149/year and includes 2 annual tune-ups (spring A/C + fall furnace).</div>';
    }
    if (svc === 'estimate') {
      return '<div class="rxb-pricing-banner estimate"><strong>\uD83D\uDCCA Estimates Are Always Free!</strong><br>No charge for your in-home estimate.</div>';
    }
    return '';
  }

  function renderCalendar() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Checking available times...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    if (!state.availability || state.availability.availableDays.length === 0) {
      const pricingHtml = getPricingBanner();
      return `<div class="rxb-card"><div class="rxb-card-title">Pick a Date & Time</div>${pricingHtml}${errorHtml}<div style="text-align:center; padding: 30px 0;"><p style="font-size: 16px; margin-bottom: 12px;">No available times found in the next 4 weeks.</p><p style="font-size: 14px; color: ${THEME.colors.textSecondary}; margin-bottom: 20px;">Please call us at <strong>${CONFIG.companyPhone}</strong> and we'll find a time that works.</p><button class="rxb-next-btn" style="width:100%" data-action="book-further-out">\uD83D\uDCE9 Send a Request for a Later Date</button></div>${renderNav(true, false)}</div>`;
    }

    // v1.27 — the customer asked the office to call: say when, and offer the calendar anyway.
    const sooner = state.availability.soonerHelp;
    if (state._soonerSent && !state._soonerShowCal) {
      const C = THEME.colors;
      const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
      return `<div class="rxb-card"><div class="rxb-success">`
        + `<div class="rxb-success-icon">\u2713</div>`
        + `<h3 style="color:${C.text}">We're On It${fn ? ', ' + escapeHtml(fn) : ''}!</h3>`
        + `<p style="color:${C.textSecondary}">${escapeHtml(state._soonerSent)}</p>`
        + `<p style="margin-top:12px;font-size:14px;color:${C.textSecondary}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong>.</p>`
        + `<div style="margin-top:12px"><button data-action="sooner-show-calendar" style="background:none;border:none;color:${C.textMuted};font-size:13px;cursor:pointer;text-decoration:underline">I'd still like to pick a date</button></div>`
        + `</div></div>`;
    }
    // v1.28 — the priority visit (10+ yr system down) and the waitlist.
    const prio = state.availability.priorityVisit;
    const prioHtml = prio
      ? `<div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#065F46;">`
        + `<div style="font-size:15px;font-weight:700;margin-bottom:6px;">\u26A1 Priority visit for your system</div>`
        + `<div style="font-size:14px;">Because your system is 10+ years old and not working, we've set aside a priority visit for <strong>${escapeHtml(prio.label || '')}</strong>. Pick it below \u2014 our office will call you to confirm your exact arrival time.</div>`
        + `</div>`
      : '';
    // v1.30 — 10+ yr maintenance: "Is your furnace not working?" (waitlist waits for the answer)
    const nw = state.availability.notWorkingCheck;
    const nwPending = !!nw && !state._nwAnswered;
    const nwHtml = nwPending
      ? `<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#7F1D1D;">`
        + `<div style="font-size:15px;font-weight:700;margin-bottom:6px;">${escapeHtml(nw.question || 'Is your system not working?')}</div>`
        + `<div style="font-size:14px;margin-bottom:12px;">${escapeHtml(nw.explain || '')}</div>`
        + `<button data-action="nw-yes" ${state._nwBusy ? 'disabled' : ''} style="width:100%;padding:12px 16px;font-size:15px;font-weight:700;color:#fff;background:#DC2626;border:none;border-radius:8px;cursor:pointer;margin-bottom:8px;">Yes \u2014 it's not working</button>`
        + `<button data-action="nw-no" ${state._nwBusy ? 'disabled' : ''} style="width:100%;padding:11px 16px;font-size:14px;font-weight:600;color:#7F1D1D;background:#fff;border:1px solid #FCA5A5;border-radius:8px;cursor:pointer;">No \u2014 it's working, I just need maintenance</button>`
        + `</div>`
      : '';
    const wait = nwPending ? null : state.availability.waitlistOffer;
    const waitHtml = wait
      ? (state._waitlistText
        ? `<div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:14px;color:#1E3A8A;">\u2713 ${escapeHtml(state._waitlistText)}</div>`
        : `<div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#1E3A8A;">`
          + `<div style="font-size:14px;margin-bottom:10px;">Our first opening online is <strong>${escapeHtml(wait.displayDate || '')}</strong>. Want us to call you if something opens up sooner?</div>`
          + `<button data-action="join-waitlist" style="width:100%;padding:11px 16px;font-size:14px;font-weight:700;color:#fff;background:#2563EB;border:none;border-radius:8px;cursor:pointer;">Yes \u2014 call me if something opens sooner</button>`
          + `<div style="font-size:12px;margin-top:8px;text-align:center;">You can still pick a date below to hold your spot.</div>`
          + `</div>`)
      : '';
    const soonerHtml = (sooner && !state._soonerSent)
      ? `<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#7F1D1D;">`
        + `<div style="font-size:15px;font-weight:700;margin-bottom:6px;">\uD83D\uDD25 Is your system not working at all?</div>`
        + `<div style="font-size:14px;margin-bottom:12px;">Our first opening online is <strong>${escapeHtml(sooner.displayDate || '')}</strong>. If you have no heat, no cooling, or a leaking water heater, don't wait \u2014 our office will call you to try and get you in sooner.</div>`
        + `<button data-action="sooner-call" style="width:100%;padding:12px 16px;font-size:15px;font-weight:700;color:#fff;background:#DC2626;border:none;border-radius:8px;cursor:pointer;">My system is down \u2014 call me</button>`
        + `<div style="font-size:12px;margin-top:8px;color:#991B1B;text-align:center;">Or pick a date below.</div>`
        + `</div>`
      : '';

    const availDates = new Set(state.availability.availableDays.map(d => d.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calMonth = state._calMonth || today.getMonth();
    const calYear = state._calYear || today.getFullYear();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let daysHtml = '';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { daysHtml += `<div class="rxb-cal-dow">${d}</div>`; });
    for (let i = 0; i < startDow; i++) { daysHtml += '<div class="rxb-cal-day empty"></div>'; }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const isAvail = availDates.has(dateStr);
      const isSelected = state.data.selectedDate === dateStr;
      let cls = 'rxb-cal-day';
      if (isPast) cls += ' past';
      if (isToday) cls += ' today';
      if (isAvail && !isPast) cls += ' available';
      if (isSelected) cls += ' selected';
      const clickable = isAvail && !isPast;
      const temp = state._weather && state._weather[dateStr];
      const tempHtml = temp ? `<span class="rxb-cal-temp">${temp}°</span>` : '';
      daysHtml += `<button class="${cls}" ${clickable ? `data-action="select-date" data-value="${dateStr}"` : 'disabled'}>${d}${tempHtml}</button>`;
    }

    // Time slots for selected date
    let slotsHtml = '';
    if (state.data.selectedDate) {
      const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
      if (dayData && dayData.slots.length > 0) {
        // Deduplicate: multiple techs may share the same time window
        const seen = new Set();
        const uniqueSlots = [];
        for (let i = 0; i < dayData.slots.length; i++) {
          const s = dayData.slots[i];
          if (!seen.has(s.start)) {
            seen.add(s.start);
            uniqueSlots.push({ ...s, originalIdx: i });
          }
        }

        // ── FIX v1.2: Sort slots chronologically so times display in order ──
        // Without this, slots from multiple techs display in arbitrary order
        uniqueSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

        // Saturday fee disclosure — match voice and chat channel behavior
        const isSaturdayRepair = dayData.dayOfWeek === 'Saturday' && state.data.serviceType === 'repair';
        // v1.17 — weekend fee is config-driven: read it from the /availability
        // response (server sources it from weekend-handler.getWeekendFee(), the
        // same dashboard-tunable value voice and chat use). Fall back to 148 if an
        // older server build didn't send it, so the note is never blank.
        const weekendFeeAmt = (state.availability && state.availability.weekendFee) || 148;
        const weekendFeeNote = 'Weekend service calls are billed at $' + weekendFeeAmt + ', waived if you proceed with repairs.';

        // \u2500\u2500 v1.18 \u2500 TENTATIVE ("office will confirm") SLOTS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        // The server sends slots with tentative:true when no bookable advisor
        // exists for the routed tag and it synthesized an office-callback
        // window instead of querying real availability (booking-api.js
        // synthesizeSalesBlockedTentativeDays). Those slots are NOT a firm
        // appointment and the customer has to be told so.
        //
        // Until v1.18 they were rendered by the ordinary path below, which
        // builds "6:00 AM - 11:00 AM" from start/end and never touches
        // .formatted. A server-side comment asserted the opposite, so the
        // "(office will confirm exact time)" text everyone believed was on
        // screen had never once been displayed. Read the flag, not the label.
        const isTentativeDay = uniqueSlots.some(s => s && s.tentative);
        const tentativeNote =
          'We\u2019ll call you to confirm the exact time. Picking a day here holds your place \u2014 '
          + 'it is not a confirmed appointment time yet.';

        const shortLabel = (s) => {
          // Tentative slots carry their own human label; the start/end times
          // are a placeholder window, not a real offer.
          if (s && s.tentative && s.formatted) return s.formatted;
          try {
            const st = new Date(s.start);
            const en = new Date(s.end);
            const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' });
            return fmt(st) + ' - ' + fmt(en);
          } catch (e) { return s.formatted; }
        };
        const tentativeBannerHtml = isTentativeDay
          ? `<div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:14px;color:#1E3A8A;"><strong>\uD83D\uDCDE We\u2019ll confirm this time with you</strong> \u2014 ${tentativeNote}</div>`
          : '';
        slotsHtml = `<div class="rxb-slots"><div class="rxb-slots-title">${isTentativeDay ? 'Requested day' : 'Available times'} for ${dayData.displayDate}</div>${tentativeBannerHtml}${isSaturdayRepair ? `<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:14px;color:#9A3412;"><strong>\uD83D\uDCC5 Weekend Service Call</strong> \u2014 ${weekendFeeNote}</div>` : ''}<div class="rxb-slots-grid">${uniqueSlots.map(s => `<button class="rxb-slot-btn${state.data.selectedSlot && state.data.selectedSlot.start === s.start ? ' selected' : ''}" data-action="select-slot" data-idx="${s.originalIdx}">${shortLabel(s)}</button>`).join('')}</div></div>`;
      }
    }

    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + state._bookingHorizonDays);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    const furtherOutHtml = `<div style="text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid ${THEME.colors.cardBorder};">${canNext ? `<button data-action="cal-next" style="display:inline-flex; align-items:center; gap:6px; padding:10px 24px; background:${THEME.colors.primaryLight}; border:1.5px solid ${THEME.colors.primaryBorder}; border-radius:8px; color:${THEME.colors.primary}; font-size:14px; font-weight:600; cursor:pointer; margin-bottom:12px; transition:all 0.2s ease;">View More Dates \u2192</button><br>` : ''}<button data-action="book-further-out" style="background:none; border:none; color:${THEME.colors.textMuted}; font-size:13px; cursor:pointer; padding:8px 0;">Need to book further out? Send us a request \u2192</button></div>`;
    const pricingHtml = getPricingBanner();
    return `<div class="rxb-card"><div class="rxb-card-title">Pick a Date & Time</div><div class="rxb-card-subtitle">Select an available day, then choose a time slot</div>${prioHtml}${nwHtml}${waitHtml}${soonerHtml}${pricingHtml}${errorHtml}<div class="rxb-calendar"><div class="rxb-cal-header"><button class="rxb-cal-nav-btn" data-action="cal-prev" ${!canPrev ? 'disabled' : ''}>\u2039</button><div class="rxb-cal-title">${monthName}</div><button class="rxb-cal-nav-btn" data-action="cal-next" ${!canNext ? 'disabled' : ''}>\u203A</button></div><div class="rxb-cal-grid">${daysHtml}</div></div>${slotsHtml}${furtherOutHtml}${renderNav(true, !!state.data.selectedSlot)}</div>`;
  }

  // ── v1.19 — ESTIMATE SUBJECT ─────────────────────────────────────────────
  // Static fallback list. The server sends the real one in /start's
  // `estimateConfig` (sourced from config/estimate-options.js); this is only
  // reached if /start failed or an older server build is deployed, so the step
  // renders something usable rather than an empty card. Values MUST match the
  // server's wire values — the server validates against its own list and drops
  // anything it does not recognise, so a drift here shows up as a booking with
  // no estimate subject rather than a wrong line item.
  const ESTIMATE_OPTIONS_FALLBACK = [
    { value: 'full_system', label: 'Full HVAC System', desc: 'Heat pump and furnace, or A/C and furnace', icon: '🏠' },
    { value: 'heat_pump',   label: 'Heat Pump Only',   desc: 'High-efficiency electric heating and cooling', icon: '♻️' },
    { value: 'ac',          label: 'A/C Only',         desc: 'Replace the air conditioner', icon: '❄️' },
    { value: 'furnace',     label: 'Furnace Only',     desc: 'Replace the furnace', icon: '🔥' }
  ];

  function getEstimateOptions() {
    const cfg = state._estimateConfig;
    return (cfg && Array.isArray(cfg.options) && cfg.options.length)
      ? cfg.options
      : ESTIMATE_OPTIONS_FALLBACK;
  }

  function renderEstimateFor() {
    const chosen = state.data.estimateFor;
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';

    // The promo comes from the server WITH its own expiry already applied —
    // config/estimate-options.js stops sending it once the date passes, so this
    // banner cannot outlive the deadline it announces. The widget never decides
    // whether a promo is live; it only renders what it was given.
    const promo = state._estimateConfig && state._estimateConfig.promo;
    const promoHtml = promo
      ? `<div style="background:#ECFDF5;border:1px solid #6EE7B7;border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:14px;color:#065F46;line-height:1.5">`
        + `<strong>⏰ ${escapeHtml(promo.headline)}</strong><br>${escapeHtml(promo.body)}</div>`
      : '';

    // Same markup as renderServiceType / renderCustomerType so this step
    // inherits the widget's existing option styling — no new CSS, and it can't
    // drift from the look of the other choice steps.
    const optionsHtml = getEstimateOptions().map(o =>
      `<button class="rxb-option-btn${chosen === o.value ? ' selected' : ''}" data-action="select-estimate-for" data-value="${escapeHtml(o.value)}">`
      + `<div class="rxb-option-icon">${o.icon || ''}</div>`
      + `<div><div class="rxb-option-label">${escapeHtml(o.label)}</div>`
      + `<div class="rxb-option-desc">${escapeHtml(o.desc || '')}</div></div>`
      + `</button>`
    ).join('');

    return `<div class="rxb-card">`
      + `<div class="rxb-card-title">What are you looking to get an estimate on?</div>`
      + `<div class="rxb-card-subtitle">So we send the right comfort advisor with the right information</div>`
      + `${errorHtml}${promoHtml}`
      + `<div class="rxb-options">${optionsHtml}</div>`
      + `${renderNav(true, !!chosen)}</div>`;
  }

  function renderDescribeIssue() {
    return `<div class="rxb-card"><div class="rxb-card-title">Describe Your Issue</div><div class="rxb-card-subtitle">Help our technician prepare for your visit</div><div class="rxb-field"><label class="rxb-label">What's going on?</label><textarea class="rxb-textarea" id="rxb-issue" placeholder="e.g., My AC is blowing warm air, making a loud noise, furnace won't turn on...">${state.data.issue || ''}</textarea></div>${renderNav(true, true)}</div>`;
  }

  function renderAddress() {
    const a = state.data.address;
    // v1.15 - surface state.error here (e.g. the city-save "please re-check
    // your zip" message). renderAddress previously had no error slot, so
    // out-of-area feedback on this step was invisible.
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    return `<div class="rxb-card"><div class="rxb-card-title">Service Address</div><div class="rxb-card-subtitle">Where should we send the technician?</div>${errorHtml}<div class="rxb-field"><label class="rxb-label">Street Address</label><div class="rxb-addr-wrap"><input type="text" class="rxb-input" id="rxb-street" placeholder="Start typing your address..." value="${escapeHtml(a.street)}" autocomplete="off"></div></div><div class="rxb-input-row"><div class="rxb-field"><label class="rxb-label">City</label><input type="text" class="rxb-input" id="rxb-city" placeholder="Denver" value="${escapeHtml(a.city)}" autocomplete="address-level2"></div><div class="rxb-field"><label class="rxb-label">Zip Code</label><input type="text" class="rxb-input" id="rxb-zip" placeholder="80202" value="${escapeHtml(a.zip)}" maxlength="5" autocomplete="postal-code"></div></div>${renderNav(true, true)}</div>`;
  }

  function renderContactInfo() {
    const isMessage = state.data.serviceType === 'message';
    // Detect if name + phone were already collected via QUICK_INFO step
    // If so, show "just to confirm" messaging instead of generic subtitle
    const hasEarlyCapture = !isMessage && state.data.name && state.data.phone;
    const title = hasEarlyCapture ? 'Just to Confirm' : 'Your Contact Info';
    const subtitle = isMessage ? 'So our office can follow up with you' : hasEarlyCapture ? "Please verify your information below so we're sure to have the right contact details." : 'So we can reach you about your appointment';
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const zipWarning = state._zipWarning ? `<div class="rxb-error" style="background: #FFFBE6; border-color: #FFD666; color: #7A6200;">I just want to verify — we don't currently service the ${state.data.address.zip} area. Is this zip correct?</div>` : '';
    let zipField = '';
    if (isMessage) {
      zipField = `<div class="rxb-field"><label class="rxb-label">Zip Code</label><input type="text" class="rxb-input" id="rxb-zip" placeholder="80202" value="${state.data.address.zip}" maxlength="5" autocomplete="postal-code"></div>`;
    }
    // v1.10 — split First Name + Last Name (same pattern as QUICK_INFO).
    // For existing customers coming from HCP lookup, state.data.name is
    // already "First Last" — split it on the first whitespace so both
    // fields pre-fill correctly.
    const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
    const ln = state.data.lastName  || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : '');
    const nameRow = `<div class="rxb-input-row">`
      + `<div class="rxb-field"><label class="rxb-label">First Name</label><input type="text" class="rxb-input" id="rxb-first-name" placeholder="John" value="${escapeHtml(fn)}" autocomplete="given-name"></div>`
      + `<div class="rxb-field"><label class="rxb-label">Last Name</label><input type="text" class="rxb-input" id="rxb-last-name" placeholder="Smith" value="${escapeHtml(ln)}" autocomplete="family-name"></div>`
      + `</div>`;
    return `<div class="rxb-card"><div class="rxb-card-title">${title}</div><div class="rxb-card-subtitle">${subtitle}</div>${errorHtml}${zipWarning}${nameRow}<div class="rxb-field"><label class="rxb-label">Phone Number</label><input type="tel" class="rxb-input" id="rxb-contact-phone" placeholder="(720) 555-1234" value="${formatPhone(state.data.phone)}" maxlength="14" autocomplete="tel"></div><div class="rxb-field"><label class="rxb-label">Email Address</label><input type="email" class="rxb-input" id="rxb-email" placeholder="john@example.com" value="${escapeHtml(state.data.email || '')}" autocomplete="email"></div>${zipField}${renderNav(true, true)}</div>`;
  }

  function renderMessage() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Sending your message...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    return `<div class="rxb-card"><div class="rxb-card-title">Your Message</div><div class="rxb-card-subtitle">What would you like to tell our office?</div>${errorHtml}<div class="rxb-field"><label class="rxb-label">Message</label><textarea class="rxb-textarea" id="rxb-message" placeholder="Type your message or request here..." style="min-height: 120px;">${state.data.message || ''}</textarea></div><label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="submit-message">Send Message \u2709</button></div></div>`;
  }

  function renderPccAsk() {
    const options = [
      { value: 'yes', icon: '\u2B50', label: 'Yes, I\'m a Member', desc: 'Schedule my included maintenance' },
      { value: 'no', icon: '\u274C', label: 'No', desc: 'Continue with regular maintenance' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Priority Comfort Club</div><div class="rxb-card-subtitle">Are you a Priority Comfort Club member?</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.isPccMember === (o.value === 'yes') ? ' selected' : ''}" data-action="select-pcc" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  function renderPccType() {
    const options = [
      { value: 'cooling', icon: '\u2744\uFE0F', label: 'Cooling (A/C)', desc: 'Air conditioner maintenance' },
      { value: 'heating', icon: '\uD83D\uDD25', label: 'Heating (Furnace)', desc: 'Furnace maintenance' }
    ];
    return `<div class="rxb-card"><div class="rxb-card-title">Which Maintenance?</div><div class="rxb-card-subtitle">Select the maintenance you'd like to schedule</div><div class="rxb-options">${options.map(o => `<button class="rxb-option-btn${state.data.pccType === o.value ? ' selected' : ''}" data-action="select-pcc-type" data-value="${o.value}"><div class="rxb-option-icon">${o.icon}</div><div><div class="rxb-option-label">${o.label}</div><div class="rxb-option-desc">${o.desc}</div></div></button>`).join('')}</div>${renderNav(true, false)}</div>`;
  }

  // v1.25 — the member's Club visit for this season is already on the schedule.
  function renderAlreadyBooked() {
    const C = THEME.colors;
    const v = state.data.existingClubVisit || {};
    const fn = state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : '');
    const what = state.data.pccType === 'cooling' ? 'A/C maintenance' : 'furnace maintenance';
    if (state._alreadyBookedDone) {
      return `<div class="rxb-card"><div class="rxb-success">`
        + `<div class="rxb-success-icon">\u2713</div>`
        + `<h3 style="color:${C.text}">See you then${fn ? ', ' + escapeHtml(fn) : ''}!</h3>`
        + `<p style="color:${C.textSecondary}">Your ${what} is on ${escapeHtml(v.whenText || 'the schedule')}. You'll get a reminder before the visit.</p>`
        + `<p style="margin-top:16px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p>`
        + `</div></div>`;
    }
    return `<div class="rxb-card"><div class="rxb-success">`
      + `<div class="rxb-success-icon">\u2B50</div>`
      + `<h3 style="color:${C.text}">You're Already Scheduled</h3>`
      + `<p style="color:${C.textSecondary}">Good news${fn ? ', ' + escapeHtml(fn) : ''}! Your Priority Comfort Club ${what} is already on our schedule for <strong>${escapeHtml(v.whenText || 'an upcoming date')}</strong>. There's nothing else you need to do.</p>`
      + `<button data-action="already-booked-done" style="margin-top:18px;padding:14px 28px;font-size:15px;font-weight:600;color:#fff;background:${C.primary};border:none;border-radius:10px;cursor:pointer;width:100%">Great, that's all I needed</button>`
      + `<button data-action="already-booked-change" style="margin-top:10px;padding:12px 24px;font-size:14px;font-weight:600;color:${C.primary};background:none;border:1px solid ${C.primary};border-radius:10px;cursor:pointer;width:100%">I need a different time</button>`
      + `<div style="margin-top:12px"><button data-action="already-booked-another" style="background:none;border:none;color:${C.textMuted};font-size:13px;cursor:pointer;text-decoration:underline">Book another visit anyway</button></div>`
      + `</div></div>`;
  }

  function renderConfirm() {
    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Confirming your appointment...</div></div></div>`;
    }
    const errorHtml = state.error ? `<div class="rxb-error">${state.error}</div>` : '';
    const d = state.data;
    const slotDay = state.availability?.availableDays?.find(day => day.date === d.selectedDate);
    const dateDisplay = slotDay ? slotDay.displayDate : d.selectedDate;
    const timeDisplay = d.selectedSlot?.formatted || '';
    const serviceLabels = { repair: 'System Not Working', estimate: 'Free Estimate', maintenance: 'Maintenance' };
    let serviceDisplay = serviceLabels[d.serviceType] || d.serviceType;
    if (d.isPccMember && d.pccType) {
      serviceDisplay = d.pccType === 'cooling' ? 'PCC A/C Maintenance (included)' : 'PCC Furnace Maintenance (included)';
    }
    const ageLabels = { '0-2': '0\u20132 Years', '3-10': '3\u201310 Years', '10+': '10+ Years' };
    // v1.19 \u2014 the estimate path no longer asks for system age, so this row has
    // to be conditional. Before this change it rendered unconditionally and
    // would have printed an empty "System Age" row for every estimate, since
    // `ageLabels[null] || null` is null.
    const ageRowHtml = d.systemAge
      ? `<div class="rxb-summary-row"><span class="rxb-summary-label">System Age</span><span class="rxb-summary-value">${ageLabels[d.systemAge] || d.systemAge}</span></div>`
      : '';
    // The estimate subject, shown by its human label rather than the wire value.
    const estOpt = d.estimateFor
      ? getEstimateOptions().find(o => o.value === d.estimateFor)
      : null;
    const estimateRowHtml = estOpt
      ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Estimate For</span><span class="rxb-summary-value">${escapeHtml(estOpt.label)}</span></div>`
      : '';
    let addressStr = '';
    if (d.address && d.address.street) { addressStr = `${d.address.street}, ${d.address.city}, ${d.address.state} ${d.address.zip}`; }
    else if (d.customer?.address) { const ca = d.customer.address; addressStr = `${ca.street}, ${ca.city}`; }

    return `<div class="rxb-card"><div class="rxb-card-title">Review & Confirm</div><div class="rxb-card-subtitle">Make sure everything looks right</div>${errorHtml}<div class="rxb-summary"><div class="rxb-summary-row"><span class="rxb-summary-label">Service</span><span class="rxb-summary-value">${serviceLabels[d.serviceType] || d.serviceType}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Date & Time</span><span class="rxb-summary-value">${dateDisplay} at ${timeDisplay}</span></div>${ageRowHtml}${estimateRowHtml}${(d.issue && !estOpt) ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Issue</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(d.issue)}</span></div>` : ''}<div class="rxb-summary-row"><span class="rxb-summary-label">Name</span><span class="rxb-summary-value">${escapeHtml(d.name)}</span></div>${d.phone ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Phone</span><span class="rxb-summary-value">${formatPhone(d.phone)}</span></div>` : ''}${addressStr ? `<div class="rxb-summary-row"><span class="rxb-summary-label">Address</span><span class="rxb-summary-value" style="max-width:60%">${escapeHtml(addressStr)}</span></div>` : ''}</div><label class="rxb-consent"><input type="checkbox" id="rxb-tcpa" ${state.data._tcpaConsent ? 'checked' : ''}><span class="rxb-consent-text">By submitting this form you consent to receive SMS and email messages from ${CONFIG.companyName} at the number and email provided. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span></label><div class="rxb-nav" style="border-top:none; margin-top:24px; padding-top:0;"><button class="rxb-back-btn" data-action="back">\u2190 Back</button><button class="rxb-next-btn" data-action="confirm-booking">Confirm Booking \u2714</button></div></div>`;
  }

  function renderSuccess() {
    const c = state.confirmation;
    // Message success
    if (c && c.type === 'message') {
      return `<div class="rxb-card"><div class="rxb-success"><div class="rxb-success-icon">\u2709</div><h3>Message Sent!</h3><p>Your message has been delivered to our office.</p><p style="margin-top:12px; font-size:14px; color:${THEME.colors.textSecondary}">Someone from our team will follow up with you soon.</p><p style="margin-top:24px; font-size:13px; color:${THEME.colors.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p></div></div>`;
    }
    // Booking success
    // v1.31 — maintenance and service calls: the customer supplies the air filter.
    const needsFilter = state.data.serviceType === 'maintenance' || state.data.serviceType === 'repair';
    const filterHtml = needsFilter
      ? `<div style="margin-top:20px;text-align:left;background:#FFFBEB;border:1px solid #FCD34D;border-radius:10px;padding:14px 16px;color:#78350F;">`
        + `<div style="font-size:15px;font-weight:700;margin-bottom:6px;">\uD83D\uDCCC Please have a new air filter ready</div>`
        + `<div style="font-size:14px;">Our technician will change your air filter during the visit, but we don\u2019t provide filters. Please have one on hand \u2014 the size is printed on the edge of your current filter.</div>`
        + `</div>`
      : '';
    return `<div class="rxb-card"><div class="rxb-success"><div class="rxb-success-icon">\u2714</div><h3>You're All Set!</h3><p>Your appointment has been confirmed.</p>${c ? `<div style="margin-top:20px; text-align:left;"><div class="rxb-summary"><div class="rxb-summary-row"><span class="rxb-summary-label">Service</span><span class="rxb-summary-value">${escapeHtml(c.service)}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Date</span><span class="rxb-summary-value">${escapeHtml(c.date)}</span></div><div class="rxb-summary-row"><span class="rxb-summary-label">Time</span><span class="rxb-summary-value">${escapeHtml(c.time)}</span></div></div></div>` : ''}${filterHtml}<p style="margin-top:24px; font-size:13px; color:${THEME.colors.textMuted}">Questions? Call us at <strong>${CONFIG.companyPhone}</strong></p></div></div>`;
  }

  function renderNav(showBack, showNext) {
    const isFirst = state.currentStep === STEPS.SERVICE_TYPE;
    return `<div class="rxb-nav">${showBack && !isFirst ? '<button class="rxb-back-btn" data-action="back">\u2190 Back</button>' : '<div></div>'}${showNext ? '<button class="rxb-next-btn" data-action="next">Continue \u2192</button>' : '<div></div>'}</div>`;
  }

  // ============================================================
  // RESCHEDULE MODE RENDER FUNCTIONS (v1.12)
  // ============================================================
  // Each renders one step in the reschedule flow. They all use the same
  // .rxb-card / .rxb-success / .rxb-error CSS classes as the booking
  // flow so visual consistency is preserved with no shared code coupling.

  /**
   * RESCHEDULE_LOAD step. Three sub-states:
   *   1. Initial loading (state.loading=true, no _rescheduleContext yet) → spinner
   *   2. Already-rescheduled (context.state.alreadyRescheduled=true) → special card
   *      with the new time + buttons "Pick a new time" / "No, keep this one"
   *   3. Briefly visible if context loaded but transitioning to RESCHEDULE_CALENDAR.
   *      Defensive fallback shows spinner.
   */
  function renderRescheduleLoad() {
    const C = THEME.colors;
    const officePhone = (state._rescheduleContext && state._rescheduleContext.config && state._rescheduleContext.config.officePhone) || CONFIG.companyPhone;

    if (state.loading || !state._rescheduleContext) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Loading your appointment...</div></div></div>`;
    }

    const ctx = state._rescheduleContext;
    const firstName = (ctx.customer && ctx.customer.firstName) || '';
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';

    // Already-rescheduled card. The token stays valid for 60 days so they
    // CAN move it again, but we want to make sure they know they already
    // moved it and don't accidentally re-pick the same time thinking it's
    // the original slot.
    if (ctx.state && ctx.state.alreadyRescheduled) {
      const newStartLabel = ctx.state.newScheduledStart
        ? formatRescheduleDateTime(ctx.state.newScheduledStart, tz)
        : 'your new time';
      const greeting = firstName ? `Hi ${escapeHtml(firstName)}!` : 'Hi there!';
      return `<div class="rxb-card">`
        + `<div class="rxb-card-title">${greeting}</div>`
        + `<div class="rxb-card-subtitle">You've already moved this appointment.</div>`
        + `<div class="rxb-from-card">`
        +   `<h4>Your appointment is currently scheduled for:</h4>`
        +   `<p><strong>${escapeHtml(newStartLabel)}</strong></p>`
        + `</div>`
        + `<p style="font-size:14px;color:${C.textSecondary};line-height:1.6">Need to change it again? You can pick another time below.</p>`
        + `<div class="rxb-btn-row">`
        +   `<button class="rxb-btn-secondary" data-action="reschedule-keep-current">No, keep this one</button>`
        +   `<button class="rxb-next-btn" data-action="reschedule-pick-new-time">Pick a new time</button>`
        + `</div>`
        + `<p style="margin-top:20px;font-size:13px;color:${C.textMuted};text-align:center">Questions? Call us at <strong>${officePhone}</strong></p>`
        + `</div>`;
    }

    // Defensive fallback — context loaded, not already-rescheduled, but
    // somehow still on RESCHEDULE_LOAD. loadRescheduleAvailability should
    // have moved us to RESCHEDULE_CALENDAR by now.
    return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Loading available times...</div></div></div>`;
  }

  /**
   * RESCHEDULE_CALENDAR step. Header card showing the original
   * appointment time + a calendar grid + slot grid + "Confirm New Time"
   * button. Reuses the same CSS classes as the booking calendar so styling
   * stays in lockstep, but the surrounding logic is reschedule-specific
   * (no pricing banner, no Saturday fee disclosure, no "book further out"
   * button, no progress bar).
   *
   * Toast: if state._rescheduleToast is set (e.g., after a 409 race
   * condition refetched availability), shown at the top of the card.
   * Auto-clears 5 seconds after it was shown via setTimeout.
   */
  function renderRescheduleCalendar() {
    const C = THEME.colors;

    if (state.loading) {
      return `<div class="rxb-card"><div class="rxb-loading"><div class="rxb-spinner"></div><div class="rxb-loading-text">Looking up available times...</div></div></div>`;
    }

    const ctx = state._rescheduleContext || {};
    const firstName = (ctx.customer && ctx.customer.firstName) || '';
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
    const currentStartISO = (ctx.appointment && ctx.appointment.currentStartISO) || (ctx.appointment && ctx.appointment.originalStartISO);
    const currentLabel = currentStartISO ? formatRescheduleDateTime(currentStartISO, tz) : 'your appointment';
    const greetingText = firstName ? `Hi ${escapeHtml(firstName)}, ` : '';

    const fromCardHtml = `<div class="rxb-from-card">`
      + `<h4>${greetingText}let's move your appointment.</h4>`
      + `<p>Currently scheduled for: <strong>${escapeHtml(currentLabel)}</strong></p>`
      + `</div>`;

    const toastHtml = state._rescheduleToast
      ? `<div class="rxb-toast"><span class="rxb-toast-icon">\u26A0\uFE0F</span><span>${escapeHtml(state._rescheduleToast)}</span></div>`
      : '';

    const errorHtml = state.error ? `<div class="rxb-error">${escapeHtml(state.error)}</div>` : '';

    if (!state.availability || !state.availability.availableDays || state.availability.availableDays.length === 0) {
      const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
      return `<div class="rxb-card">`
        + fromCardHtml
        + toastHtml
        + errorHtml
        + `<div style="text-align:center;padding:30px 0">`
        +   `<p style="font-size:16px;margin-bottom:12px">No available times found in the next ${(ctx.config && ctx.config.maxDaysAhead) || 30} days.</p>`
        +   `<p style="font-size:14px;color:${C.textSecondary}">Please call us at <strong>${officePhone}</strong> and we'll find a time that works.</p>`
        + `</div>`
        + `</div>`;
    }

    const availDates = new Set(state.availability.availableDays.map(d => d.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calMonth = (typeof state._calMonth === 'number') ? state._calMonth : today.getMonth();
    const calYear = (typeof state._calYear === 'number') ? state._calYear : today.getFullYear();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let daysHtml = '';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => { daysHtml += `<div class="rxb-cal-dow">${d}</div>`; });
    for (let i = 0; i < startDow; i++) { daysHtml += '<div class="rxb-cal-day empty"></div>'; }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const isAvail = availDates.has(dateStr);
      const isSelected = state.data.selectedDate === dateStr;
      let cls = 'rxb-cal-day';
      if (isPast) cls += ' past';
      if (isToday) cls += ' today';
      if (isAvail && !isPast) cls += ' available';
      if (isSelected) cls += ' selected';
      const clickable = isAvail && !isPast;
      daysHtml += `<button class="${cls}" ${clickable ? `data-action="select-date" data-value="${dateStr}"` : 'disabled'}>${d}</button>`;
    }

    let slotsHtml = '';
    if (state.data.selectedDate) {
      const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
      if (dayData && dayData.slots.length > 0) {
        const seen = new Set();
        const uniqueSlots = [];
        for (let i = 0; i < dayData.slots.length; i++) {
          const s = dayData.slots[i];
          const key = s.start instanceof Date ? s.start.toISOString() : String(s.start);
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSlots.push({ ...s, originalIdx: i });
          }
        }
        uniqueSlots.sort((a, b) => new Date(a.start) - new Date(b.start));
        const shortLabel = (s) => {
          try {
            const st = new Date(s.start);
            const en = new Date(s.end);
            const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
            return fmt(st) + ' - ' + fmt(en);
          } catch (e) { return s.formatted || ''; }
        };
        slotsHtml = `<div class="rxb-slots">`
          + `<div class="rxb-slots-title">Available times for ${dayData.displayDate}</div>`
          + `<div class="rxb-slots-grid">${uniqueSlots.map(s => {
              const selected = state.data.selectedSlot && state.data.selectedSlot.start && new Date(state.data.selectedSlot.start).getTime() === new Date(s.start).getTime();
              return `<button class="rxb-slot-btn${selected ? ' selected' : ''}" data-action="select-slot" data-idx="${s.originalIdx}">${shortLabel(s)}</button>`;
            }).join('')}</div>`
          + `</div>`;
      }
    }

    const maxDaysAhead = (ctx.config && ctx.config.maxDaysAhead) || 30;
    const canPrev = calMonth > today.getMonth() || calYear > today.getFullYear();
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + maxDaysAhead);
    const canNext = new Date(calYear, calMonth + 1, 1) <= maxDate;

    const canConfirm = !!state.data.selectedSlot;
    const confirmBtnHtml = `<div class="rxb-nav" style="border-top:none;margin-top:24px;padding-top:0">`
      + `<div></div>`
      + `<button class="rxb-next-btn" data-action="reschedule-confirm" ${canConfirm ? '' : 'disabled'}>Confirm New Time \u2714</button>`
      + `</div>`;

    return `<div class="rxb-card">`
      + fromCardHtml
      + toastHtml
      + errorHtml
      + `<div class="rxb-calendar">`
      +   `<div class="rxb-cal-header">`
      +     `<button class="rxb-cal-nav-btn" data-action="cal-prev" ${!canPrev ? 'disabled' : ''}>\u2039</button>`
      +     `<div class="rxb-cal-title">${monthName}</div>`
      +     `<button class="rxb-cal-nav-btn" data-action="cal-next" ${!canNext ? 'disabled' : ''}>\u203A</button>`
      +   `</div>`
      +   `<div class="rxb-cal-grid">${daysHtml}</div>`
      + `</div>`
      + slotsHtml
      + confirmBtnHtml
      + `</div>`;
  }

  /**
   * RESCHEDULE_SUCCESS — confirmation that the move succeeded.
   */
  function renderRescheduleSuccess() {
    const C = THEME.colors;
    const ctx = state._rescheduleContext || {};
    const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
    const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
    const conf = state._rescheduleConfirmed || {};
    const newStartISO = conf.newStartISO || '';
    const newLabel = newStartISO ? formatRescheduleDateTime(newStartISO, tz) : 'your new time';

    return `<div class="rxb-card">`
      + `<div class="rxb-success">`
      +   `<div class="rxb-success-icon">\u2714</div>`
      +   `<h3>You're All Set!</h3>`
      +   `<p>Your appointment has been moved to:</p>`
      +   `<p style="margin-top:12px;font-size:18px;font-weight:600;color:${C.text}">${escapeHtml(newLabel)}</p>`
      +   `<p style="margin-top:18px;font-size:14px;color:${C.textSecondary}">We've notified our office. There's nothing else you need to do.</p>`
      +   `<p style="margin-top:24px;font-size:13px;color:${C.textMuted}">Questions? Call us at <strong>${officePhone}</strong></p>`
      + `</div>`
      + `</div>`;
  }

  /**
   * RESCHEDULE_FAIL — generic "this link can't be used right now —
   * please call us" card. Shown for ALL of: 401 (token bad), 410-passed
   * (appointment already happened), 500 (server bug), 502 (HCP failure),
   * 503 (DB outage). The customer doesn't need to know the technical
   * reason — the only useful action is "call the office", same in
   * every case.
   *
   * 409 (slot taken) is NOT a fail card — it's handled inline as a toast
   * + refetch in confirmReschedule(). Already-rescheduled is NOT an
   * error — it's a state from /load, rendered by renderRescheduleLoad().
   */
  function renderRescheduleFail() {
    const C = THEME.colors;
    const ctx = state._rescheduleContext || {};
    const officePhone = (ctx.config && ctx.config.officePhone) || CONFIG.companyPhone;
    const telHref = officePhone.replace(/\D/g, '');

    return `<div class="rxb-card">`
      + `<div class="rxb-success">`
      +   `<div class="rxb-success-icon" style="background:#FFF7ED;border-color:#FDBA74;color:#C2410C;font-size:26px">\u26A0\uFE0F</div>`
      +   `<h3>We Can't Update This Online Right Now</h3>`
      +   `<p style="color:${C.textSecondary}">This link can't be used to reschedule at the moment.</p>`
      +   `<p style="margin-top:18px;font-size:15px;color:${C.text}">Please give us a call and we'll get you taken care of:</p>`
      +   `<p style="margin-top:8px;font-size:22px;font-weight:700;color:${C.primary}"><a href="tel:${telHref}" style="color:inherit;text-decoration:none">${officePhone}</a></p>`
      + `</div>`
      + `<div style="margin-top:22px;border-top:1px solid ${C.cardBorder};padding-top:18px">${renderRescheduleLookupForm('Or look up your appointments')}</div>`   // v1.33
      + `</div>`;
  }

  /**
   * v1.33 — Jason (11/26, on his phone at roxheating.com/reschedule): "it needs
   * its own booking engine because this doesn't look like it's just for
   * reschedule". With no link code, the /reschedule page used to start the
   * normal booking wizard. Now it is reschedule-only: phone → the server texts
   * the customer's personal link to the mobile on file → that link opens this
   * page in reschedule mode. A small link switches to booking a NEW visit.
   */
  function renderRescheduleLookupForm(title) {
    // v1.34 — three stages: phone → code (texted to the mobile on file) →
    // the customer's upcoming appointments; tapping one opens its calendar.
    const C = THEME.colors;
    const stage = state._rlStage || 'phone';
    const note = `<div id="rxb-rl-note">${rlNoteInner()}</div>`;   // v1.35 — updated in place by the delivery poll
    const head = title ? `<div style="font-size:15px;font-weight:700;margin-bottom:6px;color:${C.text}">${escapeHtml(title)}</div>` : '';
    const small = (action, label) => `<button data-action="${action}" style="background:none;border:none;color:${C.textSecondary};font-size:13px;cursor:pointer;text-decoration:underline;padding:6px 4px">${label}</button>`;
    if (stage === 'list') {
      const appts = state._rlAppts || [];
      const items = appts.map((a, i) => {
        const sub = [a.service, a.techName ? 'with ' + a.techName : ''].filter(Boolean).join(' \u00b7 ');
        if (!a.movable) {
          const why = a.why === 'too_soon' ? 'Less than an hour away \u2014 please call us to change it.' : 'Please call us to change this one.';
          return `<div class="rxb-option-btn" style="opacity:.65;cursor:default;display:block"><div class="rxb-option-label">${escapeHtml(a.whenText || '')}</div><div class="rxb-option-desc">${escapeHtml(sub)}</div><div class="rxb-option-desc" style="margin-top:4px">${why}</div></div>`;
        }
        return `<button class="rxb-option-btn" data-action="rl-pick" data-idx="${i}" style="display:block;text-align:left"><div class="rxb-option-label">${escapeHtml(a.whenText || '')}</div><div class="rxb-option-desc">${escapeHtml(sub)}</div><div style="margin-top:6px;font-size:13px;font-weight:600;color:${C.primary}">Reschedule this appointment \u2192</div></button>`;
      }).join('');
      const hi = state._rlFirstName ? `Hi ${escapeHtml(state._rlFirstName)}! ` : '';
      return head
        + `<div style="font-size:15px;font-weight:600;margin:14px 0 10px;color:${C.text}">${hi}Which appointment would you like to move?</div>`
        + `<div class="rxb-options">${items || `<div style="font-size:14px;color:${C.textSecondary}">No upcoming appointments found.</div>`}</div>`;
    }
    if (stage === 'code') {
      return head + note
        + `<label class="rxb-label" for="rxb-rl-code" style="margin-top:14px;display:block">6-digit code</label>`
        + `<input type="text" inputmode="numeric" pattern="[0-9]*" class="rxb-input" id="rxb-rl-code" placeholder="123456" value="${escapeHtml(state._rlCode || '')}" maxlength="6" autocomplete="one-time-code" style="letter-spacing:4px;font-size:20px;text-align:center">`
        + `<button class="rxb-next-btn" style="width:100%;margin-top:12px" data-action="rl-verify" ${state._rlBusy || !state._rlCode || state._rlCode.length !== 6 ? 'disabled' : ''}>${state._rlBusy ? 'Checking\u2026' : 'Show my appointments'}</button>`
        + `<div style="margin-top:8px;text-align:center">${small('rl-resend', 'Send a new code')}${small('rl-change', 'Use a different number')}</div>`;
    }
    return head
      + `<label class="rxb-label" for="rxb-rl-phone">Phone number on your account</label>`
      + `<input type="tel" class="rxb-input" id="rxb-rl-phone" placeholder="(720) 555-1234" value="${formatPhone(state._rlPhone || '')}" maxlength="14" autocomplete="tel">`
      + `<button class="rxb-next-btn" style="width:100%;margin-top:12px" data-action="rl-send" ${state._rlBusy || !state._rlPhone || state._rlPhone.length < 10 ? 'disabled' : ''}>${state._rlBusy ? 'Sending\u2026' : 'Text me a code'}</button>`
      + note;
  }

  // v1.35 — the message box under the code step: green (sent / emailed), amber
  // (still trying / the office will call), red (an error). Its own function so
  // the delivery poll can repaint just this box without re-rendering the input.
  function rlNoteInner() {
    const r = state._rlResult;
    if (!r) return '';
    const tone = r.tone || (r.ok ? 'ok' : 'err');
    const style = tone === 'ok' ? 'background:#ECFDF5;border:1px solid #6EE7B7;color:#065F46'
      : tone === 'warn' ? 'background:#FFFBEB;border:1px solid #FCD34D;color:#78350F'
      : 'background:#FEF2F2;border:1px solid #FCA5A5;color:#7F1D1D';
    return `<div style="margin-top:12px;padding:12px 14px;border-radius:8px;font-size:14px;text-align:left;${style}">${tone === 'ok' ? '\u2713 ' : ''}${escapeHtml(r.text || '')}</div>`;
  }

  // v1.35 — server v2.351.0 delivery fallback. After "Text me a code" the server
  // checks whether the text arrived and, if not, tries a backup number, then the
  // email on file, then has the office call. Poll its stage every 5 s for up to
  // 2.5 min while the code screen is up, and say what is happening — without
  // touching the code input (typing is never blocked).
  const RL_POLL_MS = 5000;
  const RL_POLL_MAX_MS = 150000;
  function rlDeliveryText(stage, maskedEmail, emailedLinks) {
    if (stage === 'retrying_backup') return { ok: false, tone: 'warn', text: 'Still sending\u2026 trying another number.' };
    // v1.36 — server v2.353.0: the email carries a link straight to the calendar (the address is verified).
    if (stage === 'emailed' && emailedLinks) return { ok: true, tone: 'ok', text: `We couldn't reach your phone, so we emailed a link to ${maskedEmail || 'the email on your account'}. Tap it to pick a new time \u2014 or enter the code from the email here.` };
    if (stage === 'emailed') return { ok: true, tone: 'ok', text: `We couldn't reach your phone, so we emailed your code to ${maskedEmail || 'the email on your account'}.` };
    if (stage === 'office_alerted') return { ok: false, tone: 'warn', text: "We couldn't reach your phone. Our office will call you shortly." };
    return null;
  }
  function stopRlPoll() {
    if (state._rlPollTimer) { clearTimeout(state._rlPollTimer); state._rlPollTimer = null; }
  }
  function startRlPoll(sendId) {
    stopRlPoll();
    if (!sendId) return;
    state._rlSendId = sendId;
    const startedAt = Date.now();
    const tick = async () => {
      state._rlPollTimer = null;
      if (state._rlSendId !== sendId || (state._rlStage || 'phone') !== 'code') return;   // left the code screen / sent a new code
      let st = null;
      try { st = await apiGet('/reschedule-code/status', { sendId }); } catch (_) { st = null; }
      if (state._rlSendId !== sendId || (state._rlStage || 'phone') !== 'code') return;
      const stage = st && st.stage;
      const msg = rlDeliveryText(stage, st && st.maskedEmail, !!(st && st.emailedLinks));
      if (msg && stage !== state._rlDeliveryStage) {
        state._rlDeliveryStage = stage;
        state._rlResult = msg;
        const box = root && root.querySelector('#rxb-rl-note');
        if (box) box.innerHTML = rlNoteInner();
      }
      const done = stage === 'delivered' || stage === 'unknown' || stage === 'emailed' || stage === 'office_alerted';
      if (!done && Date.now() - startedAt < RL_POLL_MAX_MS) state._rlPollTimer = setTimeout(tick, RL_POLL_MS);
    };
    state._rlPollTimer = setTimeout(tick, RL_POLL_MS);
  }

  function renderRescheduleLookupPage() {
    const C = THEME.colors;
    return `<div class="rxb-card">`
      + `<div class="rxb-card-title">Find your appointment</div>`
      + `<div class="rxb-card-subtitle">Enter the phone number on your account. We'll text you a code, then show your upcoming appointments so you can pick a new time with your same technician.</div>`
      + renderRescheduleLookupForm('')
      + `<p style="margin-top:20px;font-size:13px;color:${C.textSecondary};text-align:center">Prefer to talk? Call us at <a href="tel:${CONFIG.companyPhone.replace(/\D/g, '')}" style="color:${C.primary};font-weight:600;text-decoration:none">${CONFIG.companyPhone}</a></p>`
      + `<div style="margin-top:6px;text-align:center"><button data-action="rl-book-new" style="background:none;border:none;color:${C.textSecondary};font-size:13px;cursor:pointer;text-decoration:underline">Need to book a new appointment instead?</button></div>`
      + `</div>`;
  }

  /**
   * Format an ISO timestamp like "2026-05-06T15:00:00Z" into a friendly
   * "Wednesday, May 6 at 3:00 PM" string in the given timezone. Falls
   * back gracefully on bad input rather than showing "Invalid Date".
   */
  function formatRescheduleDateTime(iso, timezone) {
    try {
      const tz = timezone || 'America/Denver';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const dayPart = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: tz
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', timeZone: tz
      });
      return `${dayPart} at ${timePart}`;
    } catch (e) {
      console.warn('[ROX Booking] formatRescheduleDateTime failed:', e.message);
      return '';
    }
  }

  /**
   * Transform the engine's flat /availability slots array into the
   * { availableDays: [{date, displayDate, dayOfWeek, slots: [...]}] }
   * shape the calendar render function expects. Dedupes by start time
   * within each day and sorts slots chronologically.
   *
   * Engine input shape: { startISO, endISO, techId, techName, dateISO }
   */
  function groupRescheduleSlots(flatSlots, timezone) {
    const tz = timezone || 'America/Denver';
    const byDate = new Map();

    for (const s of (flatSlots || [])) {
      if (!s || !s.startISO || !s.dateISO) continue;
      if (!byDate.has(s.dateISO)) byDate.set(s.dateISO, new Map());
      const dayMap = byDate.get(s.dateISO);
      if (!dayMap.has(s.startISO)) {
        const startDate = new Date(s.startISO);
        const endDate = new Date(s.endISO);
        if (isNaN(startDate.getTime())) continue;
        const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
        const formatted = !isNaN(endDate.getTime()) ? `${fmt(startDate)} - ${fmt(endDate)}` : fmt(startDate);
        dayMap.set(s.startISO, {
          start: startDate,
          end: !isNaN(endDate.getTime()) ? endDate : startDate,
          formatted,
          techId: s.techId || null,
          techName: s.techName || null
        });
      }
    }

    const availableDays = [];
    for (const [dateISO, dayMap] of byDate) {
      const slots = Array.from(dayMap.values()).sort((a, b) => a.start - b.start);
      const dateObj = new Date(dateISO + 'T12:00:00Z');
      const displayDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: tz
      });
      const dayOfWeek = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', timeZone: tz
      });
      availableDays.push({ date: dateISO, displayDate, dayOfWeek, slots });
    }
    availableDays.sort((a, b) => a.date.localeCompare(b.date));
    return { availableDays };
  }

  /**
   * Show an ephemeral toast above the reschedule calendar. Auto-clears
   * after `durationMs` (default 5s). If a previous toast timer is still
   * running, it's cancelled so the new toast gets its own full duration.
   */
  function showRescheduleToast(message, durationMs) {
    const ms = typeof durationMs === 'number' ? durationMs : 5000;
    if (state._rescheduleToastTimer) {
      clearTimeout(state._rescheduleToastTimer);
      state._rescheduleToastTimer = null;
    }
    state._rescheduleToast = message;
    state._rescheduleToastTimer = setTimeout(() => {
      state._rescheduleToast = null;
      state._rescheduleToastTimer = null;
      // Re-render only if we're still on the calendar — if the user has
      // moved on to success/fail, the toast is irrelevant.
      if (state.currentStep === STEPS.RESCHEDULE_CALENDAR) render();
    }, ms);
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function attachEvents() {
    root.querySelectorAll('[data-action]').forEach(el => { el.addEventListener('click', handleAction); });
    const phoneInput = root.querySelector('#rxb-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        const digits = cleanPhoneDigits(e.target.value);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
        const btn = root.querySelector('[data-action="lookup-phone"]');
        if (btn) btn.disabled = digits.length < 10;
      });
    }
    const rlCode = root.querySelector('#rxb-rl-code');   // v1.34
    if (rlCode) {
      rlCode.addEventListener('input', (e) => {
        const digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
        state._rlCode = digits;
        e.target.value = digits;
        const btn = root.querySelector('[data-action="rl-verify"]');
        if (btn) btn.disabled = digits.length !== 6;
      });
    }
    const rlPhone = root.querySelector('#rxb-rl-phone');   // v1.32
    if (rlPhone) {
      rlPhone.addEventListener('input', (e) => {
        const digits = cleanPhoneDigits(e.target.value);
        state._rlPhone = digits;
        e.target.value = formatPhone(digits);
        const btn = root.querySelector('[data-action="rl-send"]');
        if (btn) btn.disabled = digits.length < 10;
      });
    }
    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) {
      contactPhone.addEventListener('input', (e) => {
        const digits = cleanPhoneDigits(e.target.value);
        state.data.phone = digits;
        e.target.value = formatPhone(digits);
      });
    }
    // Address autocomplete: debounced lookup on street field
    const streetInput = root.querySelector('#rxb-street');
    if (streetInput) {
      streetInput.addEventListener('input', (e) => {
        const val = e.target.value; // Do NOT trim — preserves spaces while typing
        state.data.address.street = val;
        state._addrPicked = false;
        if (_addrTimer) clearTimeout(_addrTimer);
        const trimmed = val.trim();
        if (trimmed.length < 3) { state._addrSuggestions = []; updateAddrDropdown(); return; }
        _addrTimer = setTimeout(() => fetchAddressSuggestions(trimmed), 350);
      });
      // Close dropdown on blur (after a short delay so clicks can register)
      streetInput.addEventListener('blur', () => {
        setTimeout(() => {
          state._addrSuggestions = [];
          state._addrLoading = false;
          updateAddrDropdown(); // Only update dropdown, not full render
        }, 250);
      });
    }
  }

  async function handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const value = e.currentTarget.dataset.value;
    switch (action) {
      case 'select-service':
        state.data.serviceType = value;
        // Clear PCC data when switching service type — prevents stale PCC flags
        // from creating jobs as estimates (or vice versa)
        if (value !== 'maintenance') {
          state.data.isPccMember = null;
          state.data.pccType = null;
        }
        goToStep(STEPS.CUSTOMER_TYPE);
        break;
      case 'select-customer-type':
        state.data.customerType = value;
        if (state.data.serviceType === 'message') {
          state.path = value === 'existing' ? 'message_existing' : 'message_new';
          if (value === 'existing') { goToStep(STEPS.PHONE_LOOKUP); } else { goToStep(STEPS.CONTACT_INFO); }
        } else if (value === 'existing') {
          state.path = pathFor(state.data.serviceType, 'existing');
          goToStep(STEPS.PHONE_LOOKUP);
        } else {
          // ALL new customers → QUICK_INFO first (name + phone)
          state.path = pathFor(state.data.serviceType, 'new');
          goToStep(STEPS.QUICK_INFO);
        }
        break;
      case 'lookup-phone':
        await lookupCustomer();
        break;
      case 'select-age':
        state.data.systemAge = value;
        await updateSession({ serviceType: state.data.serviceType, customerType: state.data.customerType, systemAge: value });
        // 0-2 year systems: ask if ROX installed before showing calendar
        // ROX installed = potential warranty = team handoff (no AI scheduling)
        if (value === '0-2' && state.data._roxInstallOnFile) {
          // v1.26 — the tag already says ROX installed it: no question.
          await handleRoxInstalledAction('yes');
        } else if (value === '0-2') {
          goToStep(STEPS.ROX_INSTALLED);
        } else {
          goToStep(STEPS.CALENDAR);
          loadAvailability();
        }
        break;
      case 'rox-installed':
        await handleRoxInstalledAction(value);
        break;
      case 'select-estimate-for':
        // v1.19 — record the estimate subject, push it to the server, then go
        // straight to the calendar. The server resolves the choice to a
        // HousecallPro price book UUID and sets the 'sales' tech tag; the
        // widget never sees or sends a UUID.
        //
        // updateSession is AWAITED, not fire-and-forget: loadAvailability()
        // reads session.data.techTag server-side, so racing the two would ask
        // for availability before the tag exists.
        state.data.estimateFor = value;
        await updateSession({
          serviceType:  'estimate',
          customerType: state.data.customerType,
          estimateFor:  value
        });
        goToStep(STEPS.CALENDAR);
        loadAvailability();
        break;
      case 'select-date':
        state.data.selectedDate = value;
        state.data.selectedSlot = null;
        render();
        break;
      case 'select-slot':
        const dayData = state.availability.availableDays.find(d => d.date === state.data.selectedDate);
        if (dayData) {
          const idx = parseInt(e.currentTarget.dataset.idx);
          state.data.selectedSlot = dayData.slots[idx];
          render();
          // v1.22 — push it NOW, not at confirm. If this customer walks away
          // from here, the office needs to know which slot they had chosen;
          // that is the whole content of the callback. Fire-and-forget: a
          // failed sync must never block the customer from continuing.
          updateSession({
            selectedDate: state.data.selectedDate,
            selectedSlot: state.data.selectedSlot
          });
        }
        break;
      case 'cal-prev':
        if (!state._calMonth && state._calMonth !== 0) { state._calMonth = new Date().getMonth(); state._calYear = new Date().getFullYear(); }
        state._calMonth--;
        if (state._calMonth < 0) { state._calMonth = 11; state._calYear--; }
        render();
        break;
      case 'cal-next':
        if (!state._calMonth && state._calMonth !== 0) { state._calMonth = new Date().getMonth(); state._calYear = new Date().getFullYear(); }
        state._calMonth++;
        if (state._calMonth > 11) { state._calMonth = 0; state._calYear++; }
        render();
        break;
      case 'back': goBack(); break;
      case 'next': await goNext(); break;
      case 'pick-address':
        const addrIdx = parseInt(value);
        const suggestion = state._addrSuggestions?.[addrIdx];
        if (suggestion?.placeId) {
          state._addrPicked = true;
          state._addrSuggestions = [];
          state._addrLoading = true;
          render();
          const details = await fetchAddressDetails(suggestion.placeId);
          state._addrLoading = false;
          if (details) {
            state.data.address.street = details.street;
            state.data.address.city = details.city || '';
            state.data.address.state = details.state || 'CO';
            state.data.address.zip = details.zip || '';
            console.log('[ROX Booking] Address auto-filled:', details.formatted || details.street);
          } else {
            state.data.address.street = suggestion.mainText || suggestion.description?.split(',')[0] || '';
          }
          render();
        }
        break;
      case 'decline-estimate':
        // Customer wants to pivot to a free estimate after service declined
        state.data.serviceType = 'estimate';
        state.data.issue = state.data.issue || 'Replacement estimate';
        state.availability = null; // reset so the right tech tag is used
        state._declineMsg = null;
        state._declineOfferEstimate = false;
        state.path = state.data.customerType === 'existing' ? 'existing' : 'new';
        goToStep(STEPS.CALENDAR);
        loadAvailability();
        break;
      case 'decline-restart':
        // Customer doesn't want the estimate — restart from service select
        state._declineMsg = null;
        state._declineOfferEstimate = false;
        state.data.serviceType = null;
        state.data.systemAge = null;
        state.data.issue = '';
        state.availability = null;
        goToStep(STEPS.SERVICE_TYPE);
        break;
      // ── v1.15 OUT-OF-AREA REFERRAL ACTIONS ──────────────────────────
      case 'referral-yes':
        // Share the partner number (engine-provided numberText). Booking is
        // already hard-stopped; this is a terminal, friendly close.
        state._referralStage = 'shared';
        render();
        break;
      case 'referral-no':
        state._referralStage = 'declined';
        render();
        break;
      case 'referral-fix-zip':
        // Customer realized the zip was wrong — let them correct it.
        state._referral = null;
        state._referralStage = null;
        state.data.address.zip = '';
        state.error = null;
        goToStep(STEPS.ADDRESS);
        break;
      case 'confirm-booking': await confirmBooking(); break;
      case 'submit-message': await submitMessage(); break;
      case 'select-pcc':
        if (value === 'yes') {
          state.data.isPccMember = true;
          state.path = state.data.customerType === 'existing' ? 'pcc_existing' : 'pcc_new';
          goToStep(STEPS.PCC_TYPE);
        } else {
          state.data.isPccMember = false;
          // Always a maintenance path here — PCC_ASK is only reachable from
          // maint_* / pcc_* — so ask pathFor for the maintenance flow directly
          // rather than re-deriving it from serviceType.
          state.path = pathFor('maintenance', state.data.customerType);
          goToStep(STEPS.SYSTEM_AGE);
        }
        break;
      case 'select-pcc-type':
        state.data.pccType = value; // 'cooling' or 'heating'
        state.data.issue = value === 'cooling'
          ? 'PCC Annual Maintenance - Cooling (A/C)'
          : 'PCC Annual Maintenance - Heating (Furnace)';
        {
          const _r = await updateSession({ serviceType: 'maintenance', customerType: state.data.customerType, pccType: value, isPccMember: true });
          // v1.25 — this season's Club visit is already booked: say so, don't open the calendar.
          if (_r && _r.existingClubVisit && _r.existingClubVisit.whenText) {
            state.data.existingClubVisit = _r.existingClubVisit;
            state._alreadyBookedDone = false;
            goToStep(STEPS.ALREADY_BOOKED);
            break;
          }
        }
        goToStep(STEPS.SYSTEM_AGE); // Ask system age for proper tech routing
        break;
      // ── v1.25 ALREADY-SCHEDULED ACTIONS ─────────────────────────
      case 'already-booked-done':
        state._alreadyBookedDone = true;
        render();
        break;
      case 'already-booked-change': {
        const _when = (state.data.existingClubVisit && state.data.existingClubVisit.whenText) || 'my scheduled date';
        state.data.serviceType = 'message';
        state.data.message = `I already have my Priority Comfort Club ${state.data.pccType === 'cooling' ? 'A/C' : 'furnace'} maintenance scheduled for ${_when}, but I need a different time. Please contact me to reschedule.`;
        state.path = state.data.customer ? 'message_existing' : 'message_new';
        goToStep(state.data.customer || (state.data.name && state.data.phone) ? STEPS.MESSAGE : STEPS.CONTACT_INFO);
        break;
      }
      case 'already-booked-another':
        await updateSession({ bookingAnotherClubVisit: true });
        goToStep(STEPS.SYSTEM_AGE);
        break;
      // ── v1.27 "MY SYSTEM IS DOWN — CALL ME" ─────────────────────
      case 'sooner-call': {
        if (state._soonerBusy) break;
        state._soonerBusy = true; state.error = null; render();
        try {
          const r = await api('POST', '/urgent-callback', { sessionId: state.sessionId, issue: state.data.issue || '' });
          state._soonerSent = (r && r.callbackText) || 'Our office will call you to try and get you in sooner.';
          state._soonerShowCal = false;
        } catch (err) {
          state.error = 'We could not send that. Please call us at ' + CONFIG.companyPhone + ' and we\u2019ll get you in as soon as we can.';
        }
        state._soonerBusy = false;
        render();
        break;
      }
      // ── v1.30 "IS YOUR FURNACE NOT WORKING?" (10+ yr maintenance) ─────
      case 'nw-yes': {
        if (state._nwBusy) break;
        state._nwBusy = true; state.error = null; render();
        // The server switches first (it checks this IS a maintenance booking and
        // clears the Club plan). Then the widget follows, because loadAvailability()
        // re-sends serviceType / pccType from this state.
        const r = await updateSession({ switchedFromMaintenance: true });
        state._nwBusy = false;
        if (!r) {
          state.error = 'Something went wrong. Please call us at ' + CONFIG.companyPhone + ' and we\u2019ll get you in as soon as we can.';
          render();
          break;
        }
        state._nwAnswered = true;
        state.data.serviceType = 'repair';
        state.data.pccType = null;
        if (/^PCC Annual Maintenance/.test(state.data.issue || '')) state.data.issue = '';   // they describe the problem next
        state.data.selectedDate = null; state.data.selectedSlot = null;
        state.path = pathFor('repair', state.data.customerType);
        state.availability = null;
        loadAvailability();
        break;
      }
      case 'nw-no':
        state._nwAnswered = true;
        render();
        break;
      // ── v1.32 "NEED TO RESCHEDULE AN EXISTING APPOINTMENT?" ─────
      case 'rl-book-new':   // v1.33 — from the reschedule-only page
        state._rescheduleMode = false;
        state._rlResult = null;
        state.currentStep = STEPS.SERVICE_TYPE;
        state.loading = true; render();
        try { await startSession(); } catch (_) { /* startSession reports its own errors */ }
        state.loading = false;
        render();
        break;
      case 'rl-open':
        state._rlOpen = true; state._rlResult = null;
        render();
        { const el = root.querySelector('#rxb-rl-phone'); if (el) el.focus(); }
        break;
      case 'rl-send':
      case 'rl-resend': {   // v1.34 — text a code to the mobile on file
        if (state._rlBusy || !state._rlPhone || state._rlPhone.length < 10) break;
        state._rlBusy = true; state._rlResult = null; render();
        try {
          const r = await api('POST', '/reschedule-start', { phone: state._rlPhone });
          state._rlResult = { ok: !!(r && r.ok), text: (r && r.text) || '' };
          if (r && r.ok) { state._rlStage = 'code'; state._rlCode = ''; state._rlDeliveryStage = null; startRlPoll(r.sendId || null); }   // v1.35
        } catch (err) {
          const t = err && err.body && err.body.text;
          state._rlResult = { ok: false, text: t || ('Something went wrong. Please call us at ' + CONFIG.companyPhone + '.') };
        }
        state._rlBusy = false;
        render();
        { const el = root.querySelector('#rxb-rl-code'); if (el) el.focus(); }
        break;
      }
      case 'rl-verify': {   // v1.34 — the code unlocks the appointments list
        if (state._rlBusy || !state._rlCode || state._rlCode.length !== 6) break;
        state._rlBusy = true; state._rlResult = null; render();
        try {
          const r = await api('POST', '/reschedule-verify', { phone: state._rlPhone, code: state._rlCode });
          if (r && r.ok) {
            stopRlPoll();   // v1.35
            state._rlStage = 'list';
            state._rlAppts = Array.isArray(r.appointments) ? r.appointments : [];
            state._rlFirstName = r.firstName || '';
          } else {
            state._rlResult = { ok: false, text: (r && r.text) || 'That code did not work.' };
          }
        } catch (err) {
          const t = err && err.body && err.body.text;
          state._rlResult = { ok: false, text: t || ('Something went wrong. Please call us at ' + CONFIG.companyPhone + '.') };
        }
        state._rlBusy = false;
        render();
        break;
      }
      case 'rl-change':
        stopRlPoll();   // v1.35
        state._rlStage = 'phone'; state._rlResult = null; state._rlCode = '';
        render();
        break;
      case 'rl-pick': {   // v1.34 — open the picked appointment's calendar in place
        const a = (state._rlAppts || [])[parseInt(e.currentTarget.dataset.idx, 10)];
        if (!a || !a.token) break;
        state._rescheduleMode = true;
        state._rescheduleToken = a.token;
        state._rescheduleContext = null;
        state._rescheduleFailMode = null;
        prewarmReschedule();
        loadReschedule();
        break;
      }
      case 'join-waitlist': {   // v1.28
        if (state._waitlistBusy) break;
        state._waitlistBusy = true; state.error = null; render();
        try {
          const r = await api('POST', '/waitlist', { sessionId: state.sessionId });
          state._waitlistText = (r && r.text) || "You're on the list! We'll call you if something sooner opens up.";
        } catch (err) {
          state.error = 'We could not add you to the list. Please call us at ' + CONFIG.companyPhone + '.';
        }
        state._waitlistBusy = false;
        render();
        break;
      }
      case 'sooner-show-calendar':
        state._soonerShowCal = true;
        render();
        break;
      case 'book-further-out':
        // Switch to message flow — pre-fill with scheduling request context
        state.data.serviceType = 'message';
        state.data.message = `I'd like to schedule ${state.data.issue || state.data.serviceType || 'an appointment'} for a date beyond the next 4 weeks. Please contact me to arrange a time.`;
        if (state.data.customer || (state.data.name && state.data.phone)) {
          // Already have contact info → go straight to message
          state.path = state.data.customer ? 'message_existing' : 'message_new';
          goToStep(STEPS.MESSAGE);
        } else {
          // Need contact info first
          state.path = 'message_new';
          goToStep(STEPS.CONTACT_INFO);
        }
        break;
      // ── v1.12 RESCHEDULE MODE ACTIONS ────────────────────────────
      case 'reschedule-pick-new-time':
        // Customer was on the "already rescheduled" card and chose to
        // change the time again. Clear any prior selections and load
        // availability fresh.
        state.data.selectedDate = null;
        state.data.selectedSlot = null;
        loadRescheduleAvailability();
        break;
      case 'reschedule-keep-current':
        // Customer was on the "already rescheduled" card and chose to
        // keep the existing rescheduled time. Reuse the success card
        // with the already-rescheduled timestamp so it reads as a clean
        // confirmation.
        if (state._rescheduleContext && state._rescheduleContext.state && state._rescheduleContext.state.newScheduledStart) {
          state._rescheduleConfirmed = {
            jobId: state._rescheduleContext.appointment ? state._rescheduleContext.appointment.jobId : null,
            newStartISO: state._rescheduleContext.state.newScheduledStart,
            newEndISO: null
          };
        }
        state.currentStep = STEPS.RESCHEDULE_SUCCESS;
        render();
        break;
      case 'reschedule-confirm':
        await confirmReschedule();
        break;
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================
  // v1.16 — fire-and-forget step sync. Records the TRUE current step on the
  // server (session.step) so abandoned-booking emails report where the
  // customer actually stopped. No `updates` payload — this only touches the
  // step. Guarded by the caller on sessionId so it never fires in reschedule
  // mode (no booking session) or before /start completes.
  function syncStep() {
    api('POST', '/update-session', { sessionId: state.sessionId, step: state.currentStep })
      .catch(() => { /* non-critical: step tracking only */ });
  }

  function goToStep(step) {
    // v1.24 — skip "How old is your system?" once when the age is on file.
    if (step === STEPS.SYSTEM_AGE && state.data._knownAge && !state._ageAutoSkipped) {
      state._ageAutoSkipped = true;
      state.data.systemAge = state.data._knownAge;
      state.currentStep = STEPS.CALENDAR;
      state.error = null;
      if (state.sessionId && !state._rescheduleMode) syncStep();
      render();
      const _after = () => loadAvailability();
      updateSession({ serviceType: state.data.serviceType, customerType: state.data.customerType, systemAge: state.data.systemAge })
        .then(_after, _after);
      return;
    }
    state.currentStep = step;
    state.error = null;
    if (state.sessionId && !state._rescheduleMode) syncStep();
    render();
  }

  function goBack() {
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (idx > 0) { state.currentStep = flow[idx - 1]; state.error = null; render(); }
  }

  async function goNext() {
    saveFormData();
    const flow = STEP_FLOW[state.path || 'new'];
    const idx = flow.indexOf(state.currentStep);
    if (!validateStep()) return;

    // Push name + phone to server immediately after QUICK_INFO
    // so abandon emails have contact info if customer leaves later.
    // v1.11 — also send firstName + lastName as separate fields so the
    // server-side abandon email can guarantee a full name in the subject
    // even if the combined `name` field somehow only holds the first half.
    if (state.currentStep === STEPS.QUICK_INFO) {
      updateSession({
        name:      state.data.name,
        firstName: state.data.firstName,
        lastName:  state.data.lastName,
        phone:     state.data.phone
      });
    }

    // Declined-service checks at DESCRIBE_ISSUE step
    // Client-side duct cleaning and server-side water heater 10+ decline
    if (state.currentStep === STEPS.DESCRIBE_ISSUE && state.data.issue) {
      const lower = state.data.issue.toLowerCase();

      // Duct cleaning (client-side — no server round-trip needed)
      if (/\b(duct\s*clean|air\s*duct\s*clean|ductwork\s*clean)\b/.test(lower) ||
          (lower.includes('clean') && lower.includes('duct'))) {
        state._declineMsg = "We don't offer duct cleaning services at this time. Please call " + CONFIG.companyPhone + " if you have questions.";
        state._declineOfferEstimate = false;
        goToStep(STEPS.DECLINED);
        return;
      }

      // Water heater 10+ yr repair (server-side — checks issue + systemAge together)
      if (state.data.serviceType === 'repair' && state.data.systemAge === '10+') {
        const result = await updateSession({ issue: state.data.issue });
        if (result && result.declined === 'water_heater_10plus') {
          state._declineMsg = result.declineMessage || "We're unable to service water heaters over 10 years old. Manufacturers recommend replacing them every 10\u201312 years.";
          state._declineOfferEstimate = result.offerEstimate || false;
          goToStep(STEPS.DECLINED);
          return;
        }
      }
    }

    // v1.15 — Out-of-area referral + city-save gate on the new-customer
    // Service Address step. The engine owns the decision (shared service
    // areas + referral partner). checkServiceAreaOrRefer() returns false
    // when it has taken over the flow (re-collecting a zip for a city-save,
    // or showing the REFERRAL screen), in which case we stop here and do
    // NOT advance to the next step.
    if (state.currentStep === STEPS.ADDRESS) {
      const proceed = await checkServiceAreaOrRefer();
      if (!proceed) return;
    }

    if (idx < flow.length - 1) {
      const nextStep = flow[idx + 1];
      state.currentStep = nextStep;
      state.error = null;
      if (nextStep === STEPS.CALENDAR && !state.availability) { loadAvailability(); }
      render();
    }
  }

  function saveFormData() {
    const issue = root.querySelector('#rxb-issue');
    if (issue) {
      const typed = issue.value.trim();
      // v1.22 — sync the issue text the first time it is captured, so an
      // abandon alert can say what was actually wrong instead of leaving the
      // office an empty Issue row.
      if (typed && typed !== state.data.issue) {
        state.data.issue = typed;
        updateSession({ issue: typed });
      } else {
        state.data.issue = typed;
      }
    }
    const message = root.querySelector('#rxb-message');
    if (message) state.data.message = message.value.trim();
    const street = root.querySelector('#rxb-street');
    if (street) state.data.address.street = street.value.trim();
    const city = root.querySelector('#rxb-city');
    if (city) state.data.address.city = city.value.trim();
    const zip = root.querySelector('#rxb-zip');
    if (zip) state.data.address.zip = zip.value.trim();
    // v1.10 — read First Name + Last Name from the split fields and combine
    // into state.data.name (preserved as a single string for back-compat with
    // server-side code that does data.name.split(' ')). Falls back to the old
    // #rxb-name selector for any code path that still uses the single field
    // (none in v1.10, but kept defensively).
    const firstNameEl = root.querySelector('#rxb-first-name');
    const lastNameEl  = root.querySelector('#rxb-last-name');
    if (firstNameEl) state.data.firstName = firstNameEl.value.trim();
    if (lastNameEl)  state.data.lastName  = lastNameEl.value.trim();
    if (firstNameEl || lastNameEl) {
      // Combine — handles edge case where only one half is filled in
      state.data.name = `${state.data.firstName} ${state.data.lastName}`.trim();
    }
    // Defensive fallback for any legacy single-field name input
    const name = root.querySelector('#rxb-name');
    if (name) state.data.name = name.value.trim();
    const email = root.querySelector('#rxb-email');
    if (email) state.data.email = email.value.trim();
    const contactPhone = root.querySelector('#rxb-contact-phone');
    if (contactPhone) state.data.phone = cleanPhoneDigits(contactPhone.value);
    const tcpa = root.querySelector('#rxb-tcpa');
    if (tcpa) state.data._tcpaConsent = tcpa.checked;
  }

  function validateStep() {
    switch (state.currentStep) {
      // v1.19 — the Continue button is already disabled until an option is
      // picked, but goNext() is also reachable from the Enter key, so the
      // choice is validated here too rather than relying on a disabled button.
      case STEPS.ESTIMATE_FOR:
        if (!state.data.estimateFor) {
          state.error = 'Please choose what you would like an estimate on.';
          render();
          return false;
        }
        return true;
      case STEPS.PHONE_LOOKUP:
        if (!state.data.customer && !state.data.phone) { state.error = 'Please enter your phone number.'; render(); return false; }
        return !!state.data.customer;
      case STEPS.QUICK_INFO:
        // v1.10 — validate first AND last name separately so customers
        // can't slip through with just a first name. Both must be at
        // least 1 character. Mirrors the HCP customer-creation contract
        // which expects both first_name and last_name.
        if (!state.data.firstName || state.data.firstName.trim().length < 1) { state.error = 'Please enter your first name.'; render(); return false; }
        if (!state.data.lastName  || state.data.lastName.trim().length  < 1) { state.error = 'Please enter your last name.';  render(); return false; }
        if (!state.data.phone || state.data.phone.length < 10) { state.error = 'Please enter a valid phone number.'; render(); return false; }
        if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return false; }
        return true;
      case STEPS.CALENDAR:
        if (!state.data.selectedSlot) { state.error = 'Please select a date and time slot.'; render(); return false; }
        return true;
      case STEPS.ADDRESS:
        if (!state.data.address.street || !state.data.address.city || !state.data.address.zip) { state.error = 'Please fill in your complete address.'; render(); return false; }
        if (state.data.address.zip.length < 5) { state.error = 'Please enter a valid 5-digit zip code.'; render(); return false; }
        // v1.15 - the service-area decision (in area / city-save / refer)
        // now happens in checkServiceAreaOrRefer() (a /check-area server
        // call) from goNext(), AFTER this validation passes. The old
        // local-set "click Continue again to proceed anyway" soft gate was
        // removed so a confirmed out-of-area new customer is hard-stopped
        // and referred instead of booked anyway.
        return true;
      case STEPS.CONTACT_INFO:
        // v1.10 — same first + last validation as QUICK_INFO. CONTACT_INFO
        // is reached by message-flow new customers (and as a confirmation
        // step for booking new customers), so the name fields must be
        // captured cleanly here too.
        if (!state.data.firstName || state.data.firstName.trim().length < 1) { state.error = 'Please enter your first name.'; render(); return false; }
        if (!state.data.lastName  || state.data.lastName.trim().length  < 1) { state.error = 'Please enter your last name.';  render(); return false; }
        if (!state.data.phone || state.data.phone.length < 10) { state.error = 'Please enter a valid phone number.'; render(); return false; }
        if (!state.data.email || !state.data.email.includes('@') || !state.data.email.includes('.')) { state.error = 'Please enter a valid email address.'; render(); return false; }
        // Message flow: validate zip on contact info
        if (state.data.serviceType === 'message') {
          if (!state.data.address.zip || state.data.address.zip.length < 5) { state.error = 'Please enter your 5-digit zip code.'; render(); return false; }
          if (!state.data._zipConfirmed && !SERVICE_AREA_ZIPS.has(state.data.address.zip)) {
            state._zipWarning = true;
            state.data._zipConfirmed = true;
            state.error = `We don't currently service the ${state.data.address.zip} area. If this zip code is correct, click Continue again. Otherwise, please update it.`;
            render(); return false;
          }
          state._zipWarning = false;
        }
        return true;
      case STEPS.MESSAGE:
        if (!state.data.message || state.data.message.length < 3) { state.error = 'Please enter your message.'; render(); return false; }
        return true;
      default: return true;
    }
  }

  // ============================================
  // API ACTIONS
  // ============================================
  async function startSession() {
    try {
      const result = await api('POST', '/start', { tenantId: CONFIG.tenantId });
      state.sessionId = result.sessionId;
      // Capture after-hours status so the widget can show a note
      state._isAfterHours = result.isAfterHours || false;
      state._isSunday     = result.isSunday     || false;
      // v1.14: Capture the booking horizon from /start. Older servers
      // that don't echo this field fall back to 28 (the historical
      // hardcoded value), keeping the widget functional during rollouts.
      state._bookingHorizonDays = result.bookingHorizonDays || 28;
      // v1.19: estimate options + any live promo, from config/estimate-options.js
      // server-side. Null on an older server build; getEstimateOptions() then
      // uses the static fallback list and no promo renders — which is the right
      // failure direction, since a promo names a deadline and must never be
      // shown from stale client-side data.
      state._estimateConfig = result.estimateConfig || null;
      console.log(`[ROX Booking] Session started: ${state.sessionId} (afterHours=${state._isAfterHours}, horizon=${state._bookingHorizonDays}d, estimateOptions=${state._estimateConfig ? state._estimateConfig.options.length : 'fallback'}, promo=${state._estimateConfig && state._estimateConfig.promo ? state._estimateConfig.promo.id : 'none'})`);
    } catch (err) { console.error('[ROX Booking] Failed to start session:', err.message); }
  }

  async function lookupCustomer() {
    state.loading = true; state.error = null; render();
    try {
      const result = await api('POST', '/lookup-customer', { sessionId: state.sessionId, phone: state.data.phone });
      state.loading = false;
      if (result.found) {
        state.data.customer = result.customer;
        state.data.name = result.customer.name || '';
        state.data.email = result.customer.email || '';
        if (result.customer.address) { state.data.address = result.customer.address; }
        // v1.24 — equipment age already on file (server v2.266.0)
        state.data._knownAge = result.knownSystemAge || null;
        // v1.26 — the "ROX Install" tag on the customer (server v2.329.0)
        state.data._roxInstallOnFile = result.roxInstallOnFile === true;
        // Message flow: skip straight to message
        if (state.data.serviceType === 'message') {
          goToStep(STEPS.MESSAGE);
          return;
        }
        // Maintenance existing: go to PCC question
        if (state.data.serviceType === 'maintenance') {
          // v1.24 — a member on file is not asked whether they are a member.
          if (result.isPccMember) {
            state.data.isPccMember = true;
            state.path = 'pcc_existing';
            goToStep(STEPS.PCC_TYPE);
            return;
          }
          goToStep(STEPS.PCC_ASK);
          return;
        }
        render();
      } else {
        // Not found → switch to new customer flow
        switchToNewCustomer("Sorry, we weren't able to locate that number. No worries — we'll get you set up!");
      }
    } catch (err) {
      state.loading = false;
      // API error → switch to new customer flow
      switchToNewCustomer("We had trouble looking up your account, but no worries — let's get you set up!");
    }
  }

  // Gracefully switch from existing → new customer when phone lookup fails
  function switchToNewCustomer(message) {
    state.data.customerType = 'new';
    state.loading = false;
    state.error = message;
    if (state.data.serviceType === 'message') {
      state.path = 'message_new';
      goToStep(STEPS.CONTACT_INFO);
    } else {
      // Go to QUICK_INFO — phone is pre-filled from lookup attempt, just need name
      state.path = pathFor(state.data.serviceType, 'new');
      goToStep(STEPS.QUICK_INFO);
    }
  }

  // Fetch 16-day forecast from Open-Meteo (free, no API key)
  // Denver coordinates: 39.74, -104.99
  // Fire-and-forget: weather is nice-to-have, not blocking
  async function loadWeather() {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.74&longitude=-104.99&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America/Denver&forecast_days=16');
      if (!res.ok) return;
      const data = await res.json();
      if (data.daily?.time && data.daily?.temperature_2m_max) {
        const weather = {};
        for (let i = 0; i < data.daily.time.length; i++) {
          weather[data.daily.time[i]] = Math.round(data.daily.temperature_2m_max[i]);
        }
        state._weather = weather;
        // Re-render if calendar is already showing
        if (state.currentStep === STEPS.CALENDAR && !state.loading) render();
      }
    } catch (e) {
      // Weather is optional — fail silently
      console.warn('[ROX Booking] Weather fetch failed:', e.message);
    }
  }

  async function loadAvailability() {
    state.loading = true; state.error = null; render();
    // Fetch weather in background (non-blocking)
    if (!state._weather) loadWeather();
    try {
      // v1.16 — Server-authoritative tech routing. The widget no longer
      // computes the tag client-side. We push the routing-relevant fields to
      // the session, then call /availability WITHOUT a ?tag so the server's
      // determineTechTag decides (single source of truth, shared with
      // voice/chat). This fixes the 0-2yr 'service tech' invalid-tag bug
      // (which silently pulled ALL employees) and activates the
      // heat-pump-router overrides (10+ AC/Furnace opportunity-call → sales
      // tech; heat-pump tag → heat pump tech) on the booking widget.
      await updateSession({
        serviceType:  state.data.serviceType,
        customerType: state.data.customerType,
        systemAge:    state.data.systemAge,
        pccType:      state.data.pccType || null,
        isPccMember:  state.data.isPccMember || false
      });
      const result = await apiGet('/availability', { sessionId: state.sessionId, days: String(state._bookingHorizonDays) });
      state.availability = result;
      state.loading = false;
      if (result.availableDays && result.availableDays.length > 0) {
        const firstDate = new Date(result.availableDays[0].date + 'T12:00:00');
        state._calMonth = firstDate.getMonth();
        state._calYear = firstDate.getFullYear();
      }
      render();
    } catch (err) { state.loading = false; state.error = 'Failed to load available times. Please try again or call ' + CONFIG.companyPhone; render(); }
  }

  // ============================================
  // v1.21 — SESSION RECOVERY
  // ============================================
  //
  // 🔴 THE CALL THAT PAID FOR THIS. Michael Connelly, 2026-09-14, session
  // db6b595e. He opened the widget at 16:13:37Z and was looking at the calendar
  // at 16:14:36Z. At 16:15:28Z the server restarted, and booking sessions lived
  // only in a server-side Map. His next two calls —
  //     POST /booking/update-session -> 404
  //     POST /booking/confirm        -> 404
  // — produced "Something went wrong. Please call us." He tried the whole flow
  // again at 16:20:11Z, hit 404/404 a second time, and phoned the office.
  //
  // 🔴 THE BROWSER NEVER LOST THE DATA. Every answer he gave was still sitting
  // in state.data — service type, system age, the slot he picked, his name,
  // phone, address, email. Only the SERVER forgot. So the honest response to a
  // lost session is not an apology and a phone number: it is to open a new
  // session, replay what we still hold, and carry on. The customer sees a
  // moment's pause, not an error.
  //
  // The server side (booking-api v2.163.0) now persists sessions to Redis, so
  // this path should rarely fire. It stays because the two defences answer
  // different failures: Redis being down, a session genuinely past its TTL, or
  // a customer who left the tab open over lunch. ONE attempt only — a recovery
  // that can itself fail into a recovery is a loop, and a loop on /confirm is
  // duplicate jobs.
  let _recoveringSession = false;

  function isLostSession(err) {
    return !!err && err.status === 404;
  }

  async function recoverSession() {
    if (_recoveringSession) return false;
    _recoveringSession = true;
    try {
      console.warn('[ROX Booking] Session lost server-side — rebuilding from what the browser still holds');
      const started = await api('POST', '/start', { tenantId: CONFIG.tenantId });
      if (!started || !started.sessionId) return false;
      const oldId = state.sessionId;
      state.sessionId = started.sessionId;

      // Replay everything the customer has already told us. Same field list the
      // confirm step sends, so a recovered session is indistinguishable from one
      // that never died.
      await api('POST', '/update-session', {
        sessionId: state.sessionId,
        step: state.currentStep,
        updates: {
          serviceType:  state.data.serviceType,
          customerType: state.data.customerType,
          systemAge:    state.data.systemAge,
          selectedDate: state.data.selectedDate,
          selectedSlot: state.data.selectedSlot,
          issue:        state.data.issue,
          name:         state.data.name,
          firstName:    state.data.firstName,
          lastName:     state.data.lastName,
          phone:        state.data.phone,
          email:        state.data.email,
          address:      state.data.address,
          isPccMember:  state.data.isPccMember || false,
          pccType:      state.data.pccType || null
        }
      });
      console.warn('[ROX Booking] Session rebuilt: ' + oldId + ' -> ' + state.sessionId);
      return true;
    } catch (err) {
      console.warn('[ROX Booking] Session recovery failed:', err.message);
      return false;
    } finally {
      _recoveringSession = false;
    }
  }

  async function updateSession(updates) {
    try {
      return await api('POST', '/update-session', { sessionId: state.sessionId, updates, step: state.currentStep });
    } catch (err) {
      // v1.21 — a 404 here used to be swallowed silently (a console.warn and
      // null), so the flow walked on with a session the server had never heard
      // of and only died later, on /confirm.
      if (isLostSession(err) && await recoverSession()) {
        try {
          return await api('POST', '/update-session', { sessionId: state.sessionId, updates, step: state.currentStep });
        } catch (retryErr) {
          console.warn('[ROX Booking] Session update failed after recovery:', retryErr.message);
          return null;
        }
      }
      console.warn('[ROX Booking] Session update failed:', err.message);
      return null;
    }
  }

  async function confirmBooking() {
    saveFormData();
    // v1.9 — TCPA consent gate. Must be checked before booking can
    // be submitted. New customers may have already checked this on
    // QUICK_INFO (state persists across steps); existing customers
    // and re-bookings see it for the first time on the Confirm step.
    if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return; }
    state.loading = true; state.error = null; render();
    try {
      // v1.11 — include firstName + lastName so the server can store them on
      // the session for use in the abandon email if the customer never reaches
      // the success screen but the session expires later.
      await updateSession({
        serviceType:  state.data.serviceType,
        customerType: state.data.customerType,
        systemAge:    state.data.systemAge,
        selectedDate: state.data.selectedDate,
        selectedSlot: state.data.selectedSlot,
        issue:        state.data.issue,
        name:         state.data.name,
        firstName:    state.data.firstName,
        lastName:     state.data.lastName,
        phone:        state.data.phone,
        email:        state.data.email,
        address:      state.data.address,
        isPccMember:  state.data.isPccMember || false,
        pccType:      state.data.pccType || null
      });
      // v1.21 — one retry through recoverSession() on a lost session. The
      // server's idempotency guard (booking-api v2.5.0) is what makes a retry
      // safe: a session that already confirmed returns the original result with
      // idempotent:true rather than creating a second job.
      let result;
      try {
        result = await api('POST', '/confirm', { sessionId: state.sessionId });
      } catch (err) {
        if (!isLostSession(err) || !(await recoverSession())) throw err;
        result = await api('POST', '/confirm', { sessionId: state.sessionId });
      }
      state.loading = false;
      if (result.success) { state.confirmation = result.confirmation; state.currentStep = STEPS.SUCCESS; render(); }
      else { state.error = result.message || 'Failed to confirm booking. Please call ' + CONFIG.companyPhone; render(); }
    } catch (err) { state.loading = false; state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone + ' to complete your booking.'; render(); }
  }

  async function submitMessage() {
    saveFormData();
    if (!state.data.message || state.data.message.length < 3) { state.error = 'Please enter your message.'; render(); return; }
    // v1.9 — TCPA consent gate. Same field as the Confirm flow; new
    // customers see it here on the Message step (they bypass QUICK_INFO
    // when sending a message instead of booking).
    if (!state.data._tcpaConsent) { state.error = 'Please check the consent box to continue.'; render(); return; }
    state.loading = true; state.error = null; render();
    try {
      // v1.11 — send firstName + lastName as separate fields so the
      // server's `/message` endpoint can guarantee a full name in the
      // email subject even if `name` somehow only has the first half.
      const result = await api('POST', '/message', {
        sessionId:    state.sessionId,
        name:         state.data.name,
        firstName:    state.data.firstName,
        lastName:     state.data.lastName,
        phone:        state.data.phone,
        email:        state.data.email,
        zip:          state.data.address.zip,
        message:      state.data.message,
        customerType: state.data.customerType,
        customerId:   state.data.customer?.id || null
      });
      state.loading = false;
      if (result.success) {
        state.confirmation = { type: 'message' };
        state.currentStep = STEPS.SUCCESS;
        render();
      } else {
        state.error = result.error || 'Failed to send message. Please call ' + CONFIG.companyPhone;
        render();
      }
    } catch (err) {
      state.loading = false;
      state.error = 'Something went wrong. Please call ' + CONFIG.companyPhone;
      render();
    }
  }

  // ============================================
  // SERVICE-AREA CHECK + REFERRAL (v1.15)
  // ============================================
  // Called from goNext() when a new customer continues past the Service
  // Address step. Delegates the in-area / city-save / confirmed-out-of-area
  // decision to the engine (POST /check-area -> shared config/service-areas.js
  // + config/referral-partner.js, the single source of truth across voice,
  // chat, and booking).
  //
  // Returns true  -> caller should advance to the next step (zip is serviced).
  // Returns false -> this function has taken over the flow; caller must stop:
  //                    - city-save -> stays on ADDRESS, asks to fix the zip
  //                    - confirmed out of area -> REFERRAL screen (or, if the
  //                      partner is disabled, a polite DECLINED close).
  //
  // Fail-open: any network/engine error proceeds with the booking (returns
  // true) so a real customer is never blocked by a transient bug -- mirrors
  // the engine's own fail-open contract on /check-area.
  async function checkServiceAreaOrRefer() {
    if (state._areaChecking) return false; // re-entry guard (double-click on Continue)
    const zip = (state.data.address.zip || '').trim();
    const city = (state.data.address.city || '').trim();

    state._areaChecking = true;
    state.error = null;

    let result;
    try {
      result = await api('POST', '/check-area', {
        sessionId: state.sessionId,
        zip: zip,
        city: city
      });
    } catch (err) {
      // Fail open -- never block a real booking on a transient error.
      console.warn('[ROX Booking] check-area failed (proceeding):', err.message);
      state._areaChecking = false;
      return true;
    }

    state._areaChecking = false;

    // 1. In service area -> proceed.
    if (result.inArea) {
      return true;
    }

    // 2. City-save -> the typed city IS serviced but the zip isn't recognized
    //    for it (mistyped zip). Trust the city, keep them on ADDRESS, and ask
    //    them to correct the zip. No referral. Clear the bad zip so the
    //    re-entry is unambiguous.
    if (result.cityServiced) {
      const cityLabel = titleCaseCity(result.matchedCity || city);
      state.data.address.zip = '';
      state.error = `Great news \u2014 we do service ${cityLabel}! That zip code doesn't look right for ${cityLabel} though. Could you double-check and re-enter your zip?`;
      render();
      return false; // stay on ADDRESS
    }

    // 3. Confirmed out of area -> referral (or a polite close if disabled).
    const ref = (result.referral && result.referral.enabled) ? result.referral : null;
    if (ref) {
      state._referral = ref;          // { enabled, offerText, numberText }
      state._referralStage = 'offer';
      goToStep(STEPS.REFERRAL);
    } else {
      // Partner disabled -- polite out-of-area close.
      state._declineMsg = "That address is outside our current service area. We're sorry we can't help this time!";
      state._declineOfferEstimate = false;
      goToStep(STEPS.DECLINED);
    }
    return false;
  }

  // Title-case a serviced-city name from the engine ("parker" -> "Parker",
  // "cherry hills village" -> "Cherry Hills Village") for friendly display.
  function titleCaseCity(s) {
    return String(s || '')
      .split(/\s+/)
      .map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; })
      .join(' ')
      .trim();
  }

  // ============================================
  // RESCHEDULE API ACTIONS (v1.12)
  // ============================================

  /**
   * Pull the ?token=<HMAC> from the page URL. Returns null if absent or
   * empty. Called once at init() to decide whether to enter reschedule
   * mode or run the booking wizard. v1.13: now ALSO checked alongside
   * getRescheduleSlugFromUrl() to support both the legacy long-token URL
   * form AND the new short-link ?t=<slug> form.
   */
  /**
   * v1.33 — is this the reschedule page? CONFIG.mode 'reschedule', the
   * /reschedule path (the SMS links' page), or data-mode="reschedule" on the
   * container.
   */
  function isReschedulePage() {
    try {
      if (CONFIG.mode === 'reschedule') return true;   // window.ROX_BOOKING_CONFIG = { mode: 'reschedule', ... }
      if (/^\/reschedule(?:\/|$)/i.test(window.location.pathname || '')) return true;
      const el = document.getElementById(CONFIG.containerId);
      return !!(el && el.dataset && el.dataset.mode === 'reschedule');
    } catch (e) { return false; }
  }

  function getTokenFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      return (token && token.length > 0) ? token : null;
    } catch (e) {
      console.warn('[ROX Booking] getTokenFromUrl failed:', e.message);
      return null;
    }
  }

  /**
   * v1.13: Pull the ?t=<slug> short-link param from the page URL. The
   * dashboard's reschedule SMS now uses URLs like
   *     roxheating.com/reschedule?t=abc12345
   * (~46 chars, fits in one SMS segment) instead of the v1.12
   * ?token=<HMAC> form (~190 chars, two segments). The slug must be
   * resolved to a full HMAC token via /api/reschedule/expand before the
   * rest of the reschedule flow can run -- see expandRescheduleSlug().
   *
   * Returns null if the param is absent or empty.
   */
  function getRescheduleSlugFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('t');
      return (slug && slug.length > 0) ? slug : null;
    } catch (e) {
      console.warn('[ROX Booking] getRescheduleSlugFromUrl failed:', e.message);
      return null;
    }
  }

  /**
   * v1.13: Resolve a short slug to its full HMAC token via the engine's
   * /api/reschedule/expand proxy. Returns the token string on success;
   * throws on failure so the caller can route the customer to the
   * generic fail card. Failure modes (per engine spec):
   *   400 missing_slug    -- shouldn't happen, we always pass slug
   *   404 not_found       -- slug doesn't exist (link tampered, hand-typed,
   *                          or row deleted by a future cleanup job)
   *   503 db_unavailable  -- Postgres outage
   * All three render the SAME 'call us' card -- customer doesn't need
   * to know which one fired.
   */
  async function expandRescheduleSlug(slug) {
    const result = await apiReschedule('GET', '/expand', null, { slug });
    if (!result || !result.token) {
      const err = new Error('expand returned no token');
      err.status = 500;
      err.body = { error: 'expand_no_token' };
      throw err;
    }
    return result.token;
  }

  /**
   * Fire-and-forget climatology prewarm. Runs at mount time so the
   * calendar's first /availability call doesn't pay the cold-cache cost
   * for 14+ Open-Meteo archive lookups. Server returns 202 immediately;
   * the actual work happens in the background. Failure is logged but
   * never propagated — prewarm is a pure optimization.
   */
  function prewarmReschedule() {
    try {
      // No await — we don't block the user on this. Use .catch so an
      // unhandled rejection doesn't surface in the browser console.
      apiReschedule('POST', '/prewarm', { daysAhead: 30 }).catch(err => {
        console.warn('[ROX Booking] Prewarm failed (non-fatal):', err.message || err);
      });
    } catch (e) {
      console.warn('[ROX Booking] Prewarm threw (non-fatal):', e.message);
    }
  }

  /**
   * Map an error from apiReschedule() to the right failure mode and
   * step. Per locked v2.12.0 design, statuses 401/410-passed/500/502/503
   * all render the SAME generic "call us" card — only 409 (slot taken)
   * gets special handling, and that's done inline at the call site
   * (confirmReschedule) rather than here.
   *
   * Logs the status + error code (without the token, which is in the
   * URL but never in our logs) so Railway logs can distinguish customer
   * issues from server issues.
   */
  function mapRescheduleErrorToFail(err) {
    const status = err && err.status;
    const code = err && err.body && (err.body.code || err.body.error);
    console.warn(`[ROX Booking] Reschedule failed: status=${status} code=${code} message=${err && err.message}`);
    state._rescheduleFailMode = 'generic';
    state.currentStep = STEPS.RESCHEDULE_FAIL;
    state.loading = false;
    render();
  }

  /**
   * Initial load. Verify the token via /load, populate context, then
   * either show the already-rescheduled card OR fetch availability and
   * render the calendar. Called once at mount time from init() when a
   * token is present.
   */
  async function loadReschedule() {
    state.loading = true;
    state.error = null;
    state.currentStep = STEPS.RESCHEDULE_LOAD;
    render();

    try {
      const result = await apiReschedule('GET', '/load', null, { token: state._rescheduleToken });
      state._rescheduleContext = result;
      state.loading = false;

      // Already-rescheduled state — show the special card. Customer can
      // tap "Pick a new time" to proceed (which will invoke
      // loadRescheduleAvailability) or "Keep this one" to confirm.
      if (result && result.state && result.state.alreadyRescheduled) {
        render();
        return;
      }

      // Normal path — fetch availability and switch to calendar.
      await loadRescheduleAvailability();
    } catch (err) {
      mapRescheduleErrorToFail(err);
    }
  }

  /**
   * Fetch eligible slots from /availability and render the calendar.
   * Also called when the customer taps "Pick a new time" from the
   * already-rescheduled card.
   */
  async function loadRescheduleAvailability() {
    state.loading = true;
    state.error = null;
    state.currentStep = STEPS.RESCHEDULE_CALENDAR;
    render();

    try {
      const ctx = state._rescheduleContext || {};
      const tz = (ctx.config && ctx.config.timezone) || 'America/Denver';
      const result = await apiReschedule('POST', '/availability', {
        token: state._rescheduleToken,
        daysAhead: (ctx.config && ctx.config.maxDaysAhead) || 30
      });

      // Transform engine's flat slots[] → calendar's grouped shape.
      state.availability = groupRescheduleSlots(result.slots || [], tz);
      state.loading = false;

      // Initialize calendar nav to the month of the first available day,
      // so the customer doesn't have to navigate forward to find slots.
      if (state.availability.availableDays.length > 0) {
        const firstDateISO = state.availability.availableDays[0].date;
        const firstDate = new Date(firstDateISO + 'T12:00:00');
        state._calMonth = firstDate.getMonth();
        state._calYear = firstDate.getFullYear();
      }
      render();
    } catch (err) {
      mapRescheduleErrorToFail(err);
    }
  }

  /**
   * Customer tapped "Confirm New Time". POST /confirm with the selected
   * slot's startISO. Three outcomes:
   *   200 → success card (state._rescheduleConfirmed populated)
   *   409 → slot taken between render and confirm. Show toast + refetch
   *         availability. Customer picks again. Token stays valid.
   *   anything else → fail card.
   */
  async function confirmReschedule() {
    if (!state.data.selectedSlot || !state.data.selectedSlot.start) {
      // Defensive — render should have disabled the button without a
      // selection, but if we somehow got here, show inline error.
      state.error = 'Please pick a time first.';
      render();
      return;
    }

    state.loading = true;
    state.error = null;
    render();

    // Selected slot's start could be a Date object (from groupRescheduleSlots)
    // or an ISO string — normalize to ISO for the wire.
    const startVal = state.data.selectedSlot.start;
    const slotStartISO = (startVal instanceof Date) ? startVal.toISOString() : String(startVal);

    try {
      const result = await apiReschedule('POST', '/confirm', {
        token: state._rescheduleToken,
        slotStartISO
      });

      // Success — record the confirmed appointment and switch to the
      // success card.
      state._rescheduleConfirmed = (result && result.appointment) ? result.appointment : { newStartISO: slotStartISO };
      state.loading = false;
      state.currentStep = STEPS.RESCHEDULE_SUCCESS;
      render();
    } catch (err) {
      // 409 — race-condition slot taken. Per locked design, refetch
      // availability and toast. The customer just picks another time.
      // We do NOT switch them to the fail card here.
      if (err && err.status === 409) {
        console.log('[ROX Booking] 409 slot taken — refetching availability');
        // Clear the selected slot so they have to pick fresh.
        state.data.selectedSlot = null;
        state.data.selectedDate = null;
        showRescheduleToast('That time was just taken — please pick another.');
        // loadRescheduleAvailability sets loading=true and renders, then
        // re-renders when slots come back. The toast is preserved on
        // those renders (state._rescheduleToast is its own field).
        await loadRescheduleAvailability();
        return;
      }

      // All other errors → generic fail card.
      mapRescheduleErrorToFail(err);
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  // Strip country code "1" from 11-digit numbers (autofill adds +1)
  function cleanPhoneDigits(raw) {
    let d = raw.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.substring(1);
    return d.substring(0, 10);
  }

  function formatPhone(digits) {
    if (!digits) return '';
    const d = cleanPhoneDigits(digits);
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================
  // INIT
  // ============================================
  async function init() {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) { console.error(`[ROX Booking] Container #${CONFIG.containerId} not found`); return; }
    root = document.createElement('div');
    root.id = 'rox-booking-root';
    container.appendChild(root);
    await loadTheme();
    injectStyles();

    // ── v1.12/v1.13 RESCHEDULE MODE BRANCH ────────────────────────────
    // Check for either ?token=<HMAC> (legacy v1.12, still supported) OR
    // ?t=<slug> (v1.13 short-link form) in the URL BEFORE calling
    // startSession(). If either is present, we're in reschedule mode and
    // skip the entire booking wizard: no /start session, no exit-intent
    // overlay, no abandon beacon. Token/slug is the only identity anchor
    // -- the customer can come back any time within the 60-day window
    // via the same SMS link.
    //
    // If a slug is present, we call /api/reschedule/expand first to
    // resolve it to a full token, then proceed exactly like the legacy
    // path. If both ?token= and ?t= are somehow present (shouldn't
    // happen but defensive), the long token wins because it bypasses
    // the extra round-trip to /expand.
    const rescheduleToken = getTokenFromUrl();
    const rescheduleSlug = rescheduleToken ? null : getRescheduleSlugFromUrl();

    if (rescheduleToken || rescheduleSlug) {
      console.log('[ROX Booking] Reschedule mode -- ' + (rescheduleToken ? 'token' : 'slug') + ' present in URL');
      state._rescheduleMode = true;

      if (rescheduleToken) {
        // Legacy v1.12 long-token URL -- proceed directly to /load.
        state._rescheduleToken = rescheduleToken;
        prewarmReschedule();
        loadReschedule();
      } else {
        // v1.13 short-link URL -- resolve slug to token first, THEN
        // proceed to /load. Show the loading spinner during the brief
        // expand round-trip so the customer doesn't see a blank screen.
        state.currentStep = STEPS.RESCHEDULE_LOAD;
        state.loading = true;
        render();
        // Fire prewarm in parallel with expand -- they're independent and
        // prewarm is fire-and-forget anyway, so doing both at once shaves
        // a few hundred ms off the cold-start path.
        prewarmReschedule();
        expandRescheduleSlug(rescheduleSlug)
          .then(function (token) {
            state._rescheduleToken = token;
            // loadReschedule() takes over from here -- it sets the step,
            // calls /load, populates context, and either renders the
            // calendar or the already-rescheduled card.
            loadReschedule();
          })
          .catch(function (err) {
            console.warn('[ROX Booking] Slug expand failed:', err && err.message);
            // Map any expand failure (404/503/network/etc) to the same
            // generic fail card the rest of the reschedule flow uses.
            // The customer experience is identical: 'this link can't
            // be used right now -- please call us'.
            state._rescheduleFailMode = 'generic';
            state.currentStep = STEPS.RESCHEDULE_FAIL;
            state.loading = false;
            render();
          });
      }
      return;
    }

    // ── v1.33 — the /reschedule page with NO link code: reschedule-only ──
    if (isReschedulePage()) {
      console.log('[ROX Booking] Reschedule page without a link code -- showing the find-your-appointment screen');
      state._rescheduleMode = true;
      state.currentStep = STEPS.RESCHEDULE_LOOKUP;
      render();
      return;
    }

    // ── BOOKING MODE (default) ─────────────────────────────────────────
    await startSession();
    render();

    // ============================================
    // EXIT-INTENT CAPTURE
    // Shows a modal when user tries to leave without providing contact info
    // ============================================
    let _exitShown = false;
    function showExitCapture() {
      if (_exitShown) return;
      if (state.currentStep === STEPS.SUCCESS || state.currentStep === STEPS.SERVICE_TYPE || state.currentStep === STEPS.CUSTOMER_TYPE) return;
      // Only show if we DON'T have both name + phone yet
      if (state.data.name && state.data.phone && state.data.phone.length >= 10) return;
      if (state.data.customer) return; // existing customer already identified
      _exitShown = true;

      const overlay = document.createElement('div');
      overlay.id = 'rxb-exit-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;">
          <div style="background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
            <div style="font-size:32px;margin-bottom:12px;">\uD83D\uDCDE</div>
            <h3 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Before you go!</h3>
            <p style="margin:0 0 20px;font-size:14px;color:#666;">Leave your info and our office will reach out to help you get scheduled.</p>
            <input type="text" id="rxb-exit-first-name" placeholder="First name" autocomplete="given-name" value="${escapeHtml(state.data.firstName || (state.data.name ? state.data.name.split(/\s+/)[0] : ''))}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;box-sizing:border-box;">
            <input type="text" id="rxb-exit-last-name" placeholder="Last name" autocomplete="family-name" value="${escapeHtml(state.data.lastName || (state.data.name ? state.data.name.split(/\s+/).slice(1).join(' ') : ''))}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px;box-sizing:border-box;">
            <input type="tel" id="rxb-exit-phone" placeholder="Phone number" value="${state.data.phone ? formatPhone(state.data.phone) : ''}" maxlength="14" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;font-size:14px;box-sizing:border-box;">
            <button id="rxb-exit-submit" style="width:100%;padding:14px;background:${THEME.colors.primary};color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:10px;">Have Us Call You</button>
            <button id="rxb-exit-close" style="width:100%;padding:10px;background:none;border:none;color:#999;font-size:13px;cursor:pointer;">No thanks, I'll call later</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#rxb-exit-submit').addEventListener('click', async () => {
        // v1.10 — exit-intent overlay now collects First Name + Last Name
        // separately. Validation requires both to be non-empty so the
        // resulting abandon/follow-up email subject reliably has the full
        // name. Both fields turn red on validation failure.
        const firstNameEl = overlay.querySelector('#rxb-exit-first-name');
        const lastNameEl  = overlay.querySelector('#rxb-exit-last-name');
        const phoneEl     = overlay.querySelector('#rxb-exit-phone');
        const firstName = firstNameEl.value.trim();
        const lastName  = lastNameEl.value.trim();
        const phone     = phoneEl.value.replace(/\D/g, '');
        if (!firstName || !lastName || phone.length < 10) {
          firstNameEl.style.borderColor = !firstName        ? '#e74c3c' : '#ddd';
          lastNameEl.style.borderColor  = !lastName         ? '#e74c3c' : '#ddd';
          phoneEl.style.borderColor     = phone.length < 10 ? '#e74c3c' : '#ddd';
          return;
        }
        // Save to state — combine first+last into the back-compat name field
        const fullName = `${firstName} ${lastName}`.trim();
        state.data.firstName = firstName;
        state.data.lastName  = lastName;
        state.data.name      = fullName;
        state.data.phone = phone;
        // Send message to office.
        // v1.11 — explicit `name: fullName` (was a bare `name` identifier
        // that resolved to `window.name`, almost always an empty string).
        // Also send firstName/lastName separately so the server's /message
        // endpoint can show the full name in the email subject reliably.
        try {
          await api('POST', '/message', {
            sessionId:    state.sessionId,
            name:         fullName,
            firstName,
            lastName,
            phone,
            email:        state.data.email || '',
            zip:          state.data.address?.zip || '',
            message:      'Customer was browsing the booking page and left before completing. Please follow up.',
            customerType: state.data.customerType || 'new',
            customerId:   state.data.customer?.id || null
          });
        } catch (e) { console.error('[ROX Booking] Exit capture send failed:', e.message); }
        overlay.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;"><div style="background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;"><div style="font-size:32px;margin-bottom:12px;">\u2705</div><h3 style="margin:0 0 8px;">Got it!</h3><p style="color:#666;font-size:14px;">Someone from our team will reach out shortly.</p></div></div>';
        setTimeout(() => overlay.remove(), 3000);
      });

      overlay.querySelector('#rxb-exit-close').addEventListener('click', () => overlay.remove());
    }

    // Mouse leaves viewport (desktop) — exit intent
    document.addEventListener('mouseout', (e) => {
      if (e.clientY <= 0 && !_exitShown) showExitCapture();
    });

    // ═══════════════════════════════════════════════════════════════════
    // v1.22 — ABANDONMENT IS SIGNALLED WHEN THE PAGE GOES AWAY, NOT 30
    // MINUTES LATER.
    //
    // 🔴 THE BUG THIS REPLACES. The old handler read:
    //
    //     if (!_exitShown && state.data.name && state.data.phone) return;
    //
    // sitting ABOVE the sendBeacon. The comment ("already have info") is
    // reasoning about whether to show the exit-capture modal; the code also
    // cancelled the NOTIFICATION. So the beacon fired only for customers we
    // knew nothing useful about — and hasBookingAbandonData() on the server
    // then dropped most of those. The two guards cancelled each other out, and
    // every customer who got past Quick Info abandoned in total silence until
    // the 30-minute TTL sweeper noticed. Measured 2026-09-14: a full run to the
    // calendar produced no abandon line at all.
    //
    // 🔴 WHY visibilitychange AND NOT JUST beforeunload. beforeunload does not
    // fire reliably on phones — iOS Safari frequently never sends it when a tab
    // is backgrounded or the app is switched away. visibilitychange is the one
    // signal a phone reliably sends. It is also the reason the SERVER no longer
    // deletes the session on /abandon (v2.167.0): this fires when a customer
    // merely glances at a text, and forgetting their session there would 404
    // them on return — the v2.163.0 failure, re-introduced on every mobile
    // customer.
    //
    // 🔴 WHY THE GRACE DELAY. An app-switch is not an abandonment. Firing the
    // instant the page hides would alert the office about most mobile
    // customers mid-booking, who then book anyway — and an office that learns
    // to ignore the alert is worse than no alert. So a hide starts a timer and
    // coming back cancels it. A REAL departure (pagehide / beforeunload) skips
    // the timer entirely, because there is nothing left to come back to.
    //
    // Background timers are throttled by browsers, so the grace window is a
    // floor, not a promise. That is fine: it is bounded by the 30-minute
    // sweeper either way, and 45 seconds reads as instant to a person watching
    // a channel.
    // ═══════════════════════════════════════════════════════════════════
    const ABANDON_GRACE_MS = (CONFIG.abandonGraceMs != null)
      ? Number(CONFIG.abandonGraceMs) : 45000;
    let _abandonTimer = null;
    let _abandonSignalled = false;

    function signalAbandon(reason) {
      if (_abandonSignalled) return;
      if (!state.sessionId || state.currentStep === STEPS.SUCCESS) return;
      _abandonSignalled = true;
      const payload = JSON.stringify({ sessionId: state.sessionId, reason: reason, step: state.currentStep,   // v1.28 — where they left
        serviceType: state.data.serviceType || '', customerType: state.data.customerType || '' });          // v1.29 — what they picked before leaving
      // 🔴 v1.23 — A STRING, NOT A TYPED BLOB, AND THE REASON IS CORS.
      //
      // sendBeacon with `new Blob([json], { type: 'application/json' })` is a
      // cross-origin request with a content type that is NOT CORS-safelisted,
      // so the browser must preflight it. During unload the OPTIONS goes out
      // and the page dies before the POST follows. MEASURED in rox-chat's HTTP
      // log, 2026-09-14:
      //
      //     19:23:40  OPTIONS /api/booking/abandon  204     (no POST)
      //     19:24:09  OPTIONS /api/booking/abandon  204     (no POST, a real
      //                                                      customer on Android)
      //     19:24:30  OPTIONS + POST 200   (same call from a page NOT unloading)
      //
      // sendBeacon returns true in every one of those cases — it reports that
      // the browser QUEUED the request, never that it arrived. So this failed
      // silently on both ends.
      //
      // A plain string sends Content-Type text/plain;charset=UTF-8, which IS
      // safelisted: no preflight, no second round trip, nothing to lose the
      // race with unload. The route parses text/plain as JSON to match.
      //
      // This was ALWAYS broken — the Blob predates v1.22. Fixing the inverted
      // guard alone only moved the failure one layer down.
      try {
        navigator.sendBeacon(`${CONFIG.serverUrl}/api/booking/abandon`, payload);
      } catch (_) { /* a failed beacon must never break the page */ }
    }

    function cancelAbandonTimer() {
      if (_abandonTimer) { clearTimeout(_abandonTimer); _abandonTimer = null; }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        cancelAbandonTimer();
        _abandonTimer = setTimeout(() => signalAbandon('hidden'), ABANDON_GRACE_MS);
      } else {
        cancelAbandonTimer();
      }
    });

    // A real departure. No grace — they are not coming back to this page.
    window.addEventListener('pagehide', () => { cancelAbandonTimer(); signalAbandon('unload'); });
    window.addEventListener('beforeunload', () => { cancelAbandonTimer(); signalAbandon('unload'); });

    console.log('[ROX Booking] Widget initialized');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();

