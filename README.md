# Smart Deals Server

Backend API server for the Smart Deals marketplace application. Built with Node.js, Express, MongoDB, and Firebase Admin SDK for authentication.

## 🚀 Features

- **RESTful API** for products, bids, and users management
- **Firebase Authentication** with token verification
- **JWT Token** generation and validation
- **MongoDB** database integration
- **CORS** enabled for cross-origin requests
- **Secure routes** with middleware authentication

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v14 or higher)
- MongoDB Atlas account
- Firebase project with Admin SDK credentials
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nozibuddowla/smart-deals-server.git
   cd smart-deals-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/smart_db?retryWrites=true&w=majority

   # Server Configuration
   PORT=5000

   # JWT Secret (generate a secure random string)
   JWT_SECRET=your_super_secret_jwt_key_here

   # Firebase Service Account (optional - if not using JSON file)
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
   ```

4. **Add Firebase Admin SDK credentials**
   
   Place your `smart-deals-firebase-admin-key.json` file in the project root, or use the `FIREBASE_SERVICE_ACCOUNT` environment variable.

## 🏃 Running the Server

### Development Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

### Production Mode
```bash
NODE_ENV=production npm start
```

## 📚 API Endpoints

### Users

#### Get All Users
```http
GET /users
```

#### Create New User
```http
POST /users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "photo": "https://..."
}
```

---

### Products

#### Get All Products
```http
GET /products
```

Query parameters:
- `email` (optional) - Filter by seller email

#### Get Recent Products
```http
GET /recent-products
```

Returns the 6 most recently added products.

#### Get Product by ID
```http
GET /products/:id
```

#### Create New Product
```http
POST /products
Content-Type: application/json

{
  "title": "Product Name",
  "category": "Electronics",
  "price_min": 100,
  "price_max": 150,
  "image": "https://...",
  "description": "Product description",
  "email": "seller@example.com",
  "seller_name": "Seller Name",
  "seller_image": "https://...",
  "seller_contact": "+1234567890",
  "location": "City, Country",
  "condition": "Used",
  "usage": "1 year",
  "status": "pending",
  "created_at": "2025-01-20T10:00:00Z"
}
```

#### Update Product
```http
PATCH /products/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 120
}
```

#### Delete Product (Protected)
```http
DELETE /products/:id
Authorization: Bearer <firebase_token>
```

---

### Bids

#### Get User Bids (Protected)
```http
GET /bids?email=user@example.com
Authorization: Bearer <firebase_token>
```

Returns all bids for the authenticated user with populated product details.

#### Get Bids for a Product (Protected)
```http
GET /products/bids/:productId
Authorization: Bearer <firebase_token>
```

#### Create New Bid
```http
POST /bids
Content-Type: application/json

{
  "product": "product_id",
  "buyer_name": "John Doe",
  "buyer_email": "buyer@example.com",
  "buyer_image": "https://...",
  "bid_price": 120,
  "buyer_contact": "+1234567890",
  "status": "pending"
}
```

#### Update Bid
```http
PATCH /bids/:id
Content-Type: application/json

{
  "buyer_name": "Updated Name",
  "bid_price": 130
}
```

#### Delete Bid
```http
DELETE /bids/:id
```

---

## 🔐 Authentication & Authorization

### Firebase Token Authentication

Protected routes require a Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

The server verifies the token using Firebase Admin SDK and extracts the user's email.

### JWT Token Authentication

Some routes use custom JWT tokens for additional validation:

```http
Authorization: Bearer <jwt_token>
```

---

## 📁 Project Structure

```
smart-deals-server/
├── index.js                          # Main server file
├── smart-deals-firebase-admin-key.json  # Firebase credentials
├── package.json                      # Dependencies
├── .env                             # Environment variables
├── .gitignore                       # Git ignore file
└── README.md                        # This file
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `PORT` | Server port (default: 5000) | No |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK credentials (JSON) | Optional* |

\* Either provide `FIREBASE_SERVICE_ACCOUNT` env var or place `smart-deals-firebase-admin-key.json` file in root.

---

## 🔄 Data Models

### Product Schema
```javascript
{
  title: String,
  category: String,
  price_min: Number,
  price_max: Number,
  image: String,
  description: String,
  email: String,
  seller_name: String,
  seller_image: String,
  seller_contact: String,
  location: String,
  condition: String,
  usage: String,
  status: String,
  created_at: ISODate
}
```

### Bid Schema
```javascript
{
  product: ObjectId (reference to Product),
  buyer_name: String,
  buyer_email: String,
  buyer_image: String,
  buyer_contact: String,
  bid_price: Number,
  status: String (pending/accepted/rejected)
}
```

### User Schema
```javascript
{
  email: String,
  name: String,
  photo: String
}
```

---

## 🚀 Deployment

### Deploy to Render

1. Push your code to GitHub
2. Connect your repository to Render
3. Add environment variables in Render dashboard
4. Deploy!

**Build Command:** `npm install`  
**Start Command:** `npm start`

---

## 🎉 Acknowledgments

- Firebase for authentication services
- MongoDB Atlas for database hosting
- Express.js community for excellent documentation
