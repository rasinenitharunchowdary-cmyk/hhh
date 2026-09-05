# SupportFlow Customer Support Dashboard

Responsive React + Vite customer support dashboard built for the REST API integration task.

## Features

- Ticket list with ID, customer, subject, priority, status, created date, assigned agent and actions
- Search by ticket ID, customer name and subject
- Combined status and priority filtering
- Ticket detail modal
- Create, edit and delete ticket flows
- Pagination
- Responsive desktop/mobile UI
- DummyJSON REST API integration
- Netlify production configuration with SPA redirect

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Netlify uses `npm run build` and publishes the `dist` directory via `netlify.toml`.
