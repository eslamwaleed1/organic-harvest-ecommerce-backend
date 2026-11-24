# Organic Harvest Backend

## Architecture

The backend follows an N-layered architecture. HTTP concerns, business
orchestration, and persistence are separated so that routes and controllers are
not tied directly to database queries or to a particular frontend.

1. **API and routing** — `routes/` maps REST endpoints to controllers and
   attaches authentication/authorization middleware.
2. **Presentation/controllers** — `controllers/` validates request context,
   calls services, and translates results and errors into HTTP responses.
3. **Business services** — `services/` coordinates application workflows such
   as authentication, orders, products, and Stripe payments.
4. **Data access and persistence** — `daos/` provides database operations;
   `models/` defines persisted records; `config/` contains database setup.
5. **Cross-cutting concerns** — `middlewares/` and `utils/` hold shared request
   processing, authentication, and helper behavior.

The request flow is generally:

`HTTP request -> route/middleware -> controller -> service -> DAO/model -> database`

The API is a JSON REST interface, so a web, mobile, or other client can use it
by following its endpoint contracts and authentication/CORS requirements.

MongoDB with Mongoose is the current persistence implementation. The layer
boundaries limit database-specific code to the persistence components, making a
different DBMS practical to integrate: implement the corresponding DAO and
model behavior while preserving service and API contracts. A migration would
also need to adapt database-specific helpers, such as transaction/session use,
where they are called by services.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the required values:
   - `MONGODB_URI` — MongoDB connection string.
   - `JWT_SECRET` — secret used to sign authentication tokens.
   - `FRONTEND_URL` — frontend origin used for Stripe redirects and account
     links (for local development, `http://localhost:5173`).
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` — Stripe API and webhook
     credentials when using payments.
   - `SMTP_USER` and `SMTP_PASS` — email delivery credentials.
   - `GOOGLE_CLIENT_ID` — Google OAuth client ID.
   - `NODE_ENV` — set to `production` for the deployed service.
3. Start the development server with `npm run dev`, or run `npm start`.

The server uses the `PORT` environment variable when provided and otherwise
listens on port `5000`.

## Stripe webhooks

Configure the Stripe webhook endpoint at
`/api/payments/webhook` and subscribe it to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired`. Set
the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
