# Digital Wallet System – Backend

This is the **Backend** for the Digital Wallet System built using **Node.js**, **Express.js**, **MongoDB**, and **TypeScript**.

## Features

- JWT-based authentication with user roles: admin, user, agent
- Secure password hashing with bcrypt
- Wallet auto-creation on registration
- Role-based access control
- Send money between users
- Agent cash-in and cash-out for any user
- View wallet and transaction history
- Admin controls for viewing users, wallets, transactions
- Admin can block/unblock wallets and approve/suspend agents
- Clean modular structure with Zod validation

## Technologies Used

- Node.js
- Express.js
- TypeScript
- MongoDB with Mongoose
- JWT (jsonwebtoken)
- bcrypt
- Zod
- CORS
- dotenv
- cookie-parser

## Project Structure

```
src/
├── config/
│   └── db.ts
├── middlewares/
│   └── auth.middlware.ts
├── modules/
│ ├── auth/
│ │ ├── auth.controller.ts
│ │ ├── auth.routes.ts
│ │ └── auth.validation.ts
│ ├── user/
│ │ ├── user.model.ts
│ │ ├── user.controller.ts
│ │ ├── user.routes.ts
│ │ └── user.validation.ts
│ ├── wallet/
│ │ ├── wallet.model.ts
│ │ ├── wallet.controller.ts
│ │ ├── wallet.routes.ts
│ │ └── wallet.validation.ts
│ └── transaction/
│ ├── transaction.model.ts
│ ├── transaction.controller.ts
│ ├── transaction.routes.ts
│ └── transaction.validation.ts
├── utils/
├── app.ts
└── .env

```

## Environment Variables

Create a `.env` file in the root with the following:

```env
PORT=5000
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/digital-wallet
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

## Installation & Running

```bash
npm install
npm run dev
```

The server will be running at `http://localhost:5000/`.

## API Endpoints

### Authentication

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| POST   | /api/auth/register | Register a user/agent |
| POST   | /api/auth/login    | Login and receive JWT |

### Wallet

| Method | Endpoint               | Description                     |
| ------ | ---------------------- | ------------------------------- |
| GET    | /api/wallets/me        | Get current user's wallet       |
| POST   | /api/wallets/add-money | Add money to wallet (user only) |
| POST   | /api/wallets/withdraw  | Withdraw money from wallet      |

### Transactions

| Method | Endpoint                   | Description                      |
| ------ | -------------------------- | -------------------------------- |
| POST   | /api/transactions/send     | Send money to another user       |
| GET    | /api/transactions/me       | Get own transaction history      |
| POST   | /api/transactions/cash-in  | Agent adds money to a user       |
| POST   | /api/transactions/cash-out | Agent withdraws from user wallet |

### Admin

| Method | Endpoint                            | Description                 |
| ------ | ----------------------------------- | --------------------------- |
| GET    | /api/admin/all                      | Get all users               |
| GET    | /api/admin/wallets                  | Get all wallets             |
| GET    | /api/admin/transactions             | Get all transactions        |
| PATCH  | /api/admin/wallets/\:walletId/block | Block or unblock a wallet   |
| PATCH  | /api/admin/agents/\:userId/approve  | Approve or suspend an agent |

## Developer

- Built by Tanzeem Siddique
