# Cold Room Temperature Dashboard - Web Frontend

This is the React frontend for the Cold Storage Room temperature telemetry system. It is built using **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Getting Started

### Prerequisites
Make sure you have Node.js (version 18 or newer) installed.

### Setup & Run Commands

Run the following commands in your terminal to set up and run the frontend:

#### 1. Navigate to the web folder
If you are at the workspace root, change directory into the web app folder:
```bash
cd apps/web
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Run the local development server
This starts Vite's development server with hot module replacement (HMR).
```bash
npm run dev
```
By default, the server will run on `http://localhost:5173`. Open this URL in your web browser.

#### 4. Run unit tests
Executes Vitest to verify all components, filters, and rendering:
```bash
npm run test
```

#### 5. Build for production
Generates optimized static assets in the `dist` folder:
```bash
npm run build
```

---

## Technical Features Implemented
- **Vibrant Industrial Theme**: Sleek, high-contrast dark palette with dynamic glowing badges and indicators.
- **SSE Live Stream**: Reconnecting indicators for live Server-Sent Events, falling back to polling on socket/connection failure.
- **IP Address Security allowlist Gate**: Premium simulated "403 Forbidden" network blocked screen with custom security logs.
- **Role-Based operations Lock**: Administrator dashboard actions locked and blurred for "Viewer" roles.
- **Custom Virtualized Logs Table**: Zero-dependency virtual table for scrollable logs history, yielding maximum performance.
- **Dynamic Charting**: Recharts AreaChart with status-specific colored lines and area gradient fills.
- **Robust Exception interception**: ErrorBoundary component catching React runtime crashes.
