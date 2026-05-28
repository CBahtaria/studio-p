# Studio P — API Reference

Base URL: `https://<your-ref>.supabase.co`

All requests require the `apikey: <VITE_SUPABASE_ANON_KEY>` header.
Authenticated requests additionally require `Authorization: Bearer <access_token>`.

---

## Edge Functions

### POST /functions/v1/validate-booking

Validates and creates a booking. Runs 4 parallel checks: state validation, security audit, DB write, RLS verification.

**Request**
```json
{
  "service":   "01",
  "date":      "2026-06-15",
  "time":      "14:00",
  "clientId":  "uuid-of-authenticated-user",
  "email":     "client@example.com",
  "phone":     "+268 7600 0000",
  "notes":     "Prefer low taper"
}
```

**Response 201**
```json
{
  "approved":     true,
  "bookingId":    "BK-X7K3M2",
  "confidence":   99,
  "scheduledAt":  "2026-06-15T14:00:00.000Z"
}
```

**Response 400**
```json
{ "approved": false, "reason": "Service not found or unavailable" }
```

**Response 409**
```json
{ "approved": false, "reason": "Time slot is already booked" }
```

**Response 429**
```json
{ "approved": false, "reason": "Daily booking limit reached (max 5 per day)" }
```

---

### POST /functions/v1/send-notification

Sends booking notification via email (Resend) and/or WhatsApp.

**Request**
```json
{
  "bookingId": "BK-X7K3M2",
  "type":      "confirmation"
}
```

`type`: `"confirmation"` | `"reminder"` | `"cancellation"`

**Response 200**
```json
{
  "sent":        true,
  "emailSent":   true,
  "whatsappUrl": "https://wa.me/26876000000?text=..."
}
```

---

## REST API (Supabase Auto-generated)

### profiles

| Method | Path                     | Auth     | Description              |
|--------|--------------------------|----------|--------------------------|
| GET    | `/rest/v1/profiles?id=eq.{id}` | Bearer | Get own profile    |
| PATCH  | `/rest/v1/profiles?id=eq.{id}` | Bearer | Update own profile |

**Profile object**
```json
{
  "id":           "uuid",
  "name":         "Sipho Dlamini",
  "email":        "sipho@example.com",
  "role":         "viewer",
  "member_tier":  "silver",
  "visit_count":  7,
  "preferences":  { "themeId": "midnight", "fontSize": "md", "animations": true }
}
```

### bookings

| Method | Path                              | Auth     | Description              |
|--------|-----------------------------------|----------|--------------------------|
| GET    | `/rest/v1/bookings?client_id=eq.{id}` | Bearer | Own bookings        |
| GET    | `/rest/v1/bookings`               | Bearer (admin/editor) | All bookings |
| PATCH  | `/rest/v1/bookings?id=eq.{id}`    | Bearer   | Cancel own pending booking |

**Booking object**
```json
{
  "id":           "BK-X7K3M2",
  "client_id":    "uuid",
  "client_name":  "Sipho Dlamini",
  "service":      "Signature Fade",
  "barber":       "P. Dlamini",
  "scheduled_at": "2026-06-15T14:00:00+02:00",
  "status":       "confirmed",
  "price_swl":    12000
}
```

### services

| Method | Path              | Auth  | Description          |
|--------|-------------------|-------|----------------------|
| GET    | `/rest/v1/services?active=eq.true` | None | All active services |

### gallery_items

| Method | Path                       | Auth     | Description              |
|--------|----------------------------|----------|--------------------------|
| GET    | `/rest/v1/gallery_items?approved=eq.true` | None | Public gallery |
| POST   | `/rest/v1/gallery_items`   | Bearer   | Upload (pending approval)|

---

## Auth (Supabase GoTrue)

All endpoints at `<SUPABASE_URL>/auth/v1/`

| Action          | Endpoint                    | Body                                    |
|-----------------|-----------------------------|-----------------------------------------|
| Sign Up         | POST `/signup`              | `{ email, password, data: { name } }`   |
| Sign In         | POST `/token?grant_type=password` | `{ email, password }`             |
| Sign Out        | POST `/logout`              | —                                       |
| Refresh Token   | POST `/token?grant_type=refresh_token` | `{ refresh_token }`          |
| Resend Verify   | POST `/resend`              | `{ type: "signup", email }`             |
| Reset Password  | POST `/recover`             | `{ email }`                             |
| Google OAuth    | GET `/authorize?provider=google` | —                                  |
| Apple OAuth     | GET `/authorize?provider=apple`  | —                                  |

---

## Rate Limits

| Endpoint         | Limit            | Window   |
|------------------|------------------|----------|
| Auth sign-in     | 5 attempts / IP  | 15 min   |
| Auth sign-up     | 3 attempts / IP  | 1 hour   |
| Booking create   | 5 bookings / user| 24 hours |
| API (general)    | 60 requests / IP | 1 min    |
