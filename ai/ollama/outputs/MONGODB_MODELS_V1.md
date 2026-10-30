-- MONGODB_MODELS_V1 --

-- User Model
users: {
  _id: ObjectId,
  username: String,
  email: String,
  password: String,
  roles: Array,
  created_at: Date,
  updated_at: Date,
  remember_token: String
}
-- User Indices
users: {username: 1, email: 1, created_at: 1, updated_at: 1}
-- User Relationships
users: {
  companies: [company_id: ObjectId],
  products: [product_id: ObjectId],
  leads: [lead_id: ObjectId]
}

-- Company Model
companies: {
  _id: ObjectId,
  name: String,
  email: String,
  users: [user_id: ObjectId],
  created_at: Date,
  updated_at: Date
}
-- Company Indices
companies: {name: 1, email: 1, created_at: 1, updated_at: 1}
-- Company Relationships
companies: {
  users: [user_id: ObjectId],
  products: [product_id: ObjectId]
}

-- Product Model
products: {
  _id: ObjectId,
  name: String,
  price: Number,
  category_id: ObjectId,
  description: String,
  created_at: Date,
  updated_at: Date,
  stores: [store_id: ObjectId]
}
-- Product Indices
products: {name: 1, price: 1, category_id: 1, created_at: 1, updated_at: 1}
-- Product Relationships
products: {
  category: [category_id: ObjectId]
}

-- Category Model
categories: {
  _id: ObjectId,
  name: String,
  parent_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- Category Indices
categories: {name: 1, created_at: 1, updated_at: 1}
-- Category Relationships
categories: {
  parent: [parent_id: ObjectId],
  children: [child_id: ObjectId]
}

-- Store Model
stores: {
  _id: ObjectId,
  name: String,
  address: String,
  city: String,
  latitude: Number,
  longitude: Number,
  created_at: Date,
  updated_at: Date,
  leads: [lead_id: ObjectId]
}
-- Store Indices
stores: {name: 1, city: 1, created_at: 1, updated_at: 1}
-- Store Relationships
stores: {
  leads: [lead_id: ObjectId],
  products: [product_id: ObjectId]
}

-- Lead Model
leads: {
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  product_id: ObjectId,
  status: String,
  created_at: Date,
  updated_at: Date
}
-- Lead Indices
leads: {user_id: 1, company_id: 1, product_id: 1, created_at: 1, updated_at: 1}
-- Lead Relationships
leads: {
  user: [user_id: ObjectId],
  company: [company_id: ObjectId],
  product: [product_id: ObjectId]
}

-- Campaign Model
campaigns: {
  _id: ObjectId,
  name: String,
  description: String,
  start_date: Date,
  end_date: Date,
  target_audience: String,
  created_at: Date,
  updated_at: Date
}
-- Campaign Indices
campaigns: {name: 1, start_date: 1, end_date: 1, created_at: 1, updated_at: 1}
-- Campaign Relationships
campaigns: {}

-- Subscription Model
subscriptions: {
  _id: ObjectId,
  user_id: ObjectId,
  campaign_id: ObjectId,
  start_date: Date,
  end_date: Date,
  status: String,
  created_at: Date,
  updated_at: Date
}
-- Subscription Indices
subscriptions: {user_id: 1, campaign_id: 1, start_date: 1, end_date: 1, created_at: 1, updated_at: 1}
-- Subscription Relationships
subscriptions: {
  user: [user_id: ObjectId],
  campaign: [campaign_id: ObjectId]
}

-- Payment Model
payments: {
  _id: ObjectId,
  subscription_id: ObjectId,
  amount: Number,
  currency: String,
  created_at: Date,
  updated_at: Date
}
-- Payment Indices
payments: {subscription_id: 1, created_at: 1, updated_at: 1}
-- Payment Relationships
payments: {
  subscription: [subscription_id: ObjectId]
}

-- Owner Memory Model
owner_memory: {
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  product_id: ObjectId,
  lead_id: ObjectId,
  campaign_id: ObjectId,
  payment_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- Owner Memory Indices
owner_memory: {user_id: 1, company_id: 1, product_id: 1, lead_id: 1, campaign_id: 1, payment_id: 1, created_at: 1, updated_at: 1}
-- Owner Memory Relationships
owner_memory: {
  user: [user_id: ObjectId],
  company: [company_id: ObjectId],
  product: [product_id: ObjectId],
  lead: [lead_id: ObjectId],
  campaign: [campaign_id: ObjectId],
  payment: [payment_id: ObjectId]
}

-- Project Memory Model
project_memory: {
  _id: ObjectId,
  project_id: ObjectId,
  user_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- Project Memory Indices
project_memory: {project_id: 1, user_id: 1, created_at: 1, updated_at: 1}
-- Project Memory Relationships
project_memory: {
  user: [user_id: ObjectId]
}

-- User Memory Model
user_memory: {
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  product_id: ObjectId,
  lead_id: ObjectId,
  campaign_id: ObjectId,
  payment_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- User Memory Indices
user_memory: {user_id: 1, company_id: 1, product_id: 1, lead_id: 1, campaign_id: 1, payment_id: 1, created_at: 1, updated_at: 1}
-- User Memory Relationships
user_memory: {
  user: [user_id: ObjectId],
  company: [company_id: ObjectId],
  product: [product_id: ObjectId],
  lead: [lead_id: ObjectId],
  campaign: [campaign_id: ObjectId],
  payment: [payment_id: ObjectId]
}

-- Company Memory Model
company_memory: {
  _id: ObjectId,
  company_id: ObjectId,
  user_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- Company Memory Indices
company_memory: {company_id: 1, user_id: 1, created_at: 1, updated_at: 1}
-- Company Memory Relationships
company_memory: {
  user: [user_id: ObjectId]
}

-- AI Memory Model
ai_memory: {
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  product_id: ObjectId,
  lead_id: ObjectId,
  campaign_id: ObjectId,
  payment_id: ObjectId,
  created_at: Date,
  updated_at: Date
}
-- AI Memory Indices
ai_memory: {user_id: 1, company_id: 1, product_id: 1, lead_id: 1, campaign_id: 1, payment_id: 1, created_at: 1, updated_at: 1}
-- AI Memory Relationships
ai_memory: {
  user: [user_id: ObjectId],
  company: [company_id: ObjectId],
  product: [product_id: ObjectId],
  lead: [lead_id: ObjectId],
  campaign: [campaign_id: ObjectId],
  payment: [payment_id: ObjectId]
}

-- Audit Log Model
audit_logs: {
  _id: ObjectId,
  user_id: ObjectId,
  operation: String,
  field: String,
  old_value: String,
  new_value: String,
  created_at: Date,
  updated_at: Date
}
-- Audit Log Indices
audit_logs: {user_id: 1, operation: 1, field: 1, created_at: 1, updated_at: 1}
-- Audit Log Relationships
audit_logs: {
  user: [user_id: ObjectId]
}


