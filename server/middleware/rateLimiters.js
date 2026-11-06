import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const RATE_LIMIT_COLLECTION = "apiRateLimits";
const RATE_LIMIT_KEY_SECRET = process.env.JWT_SECRET;

export class MongoRateLimitStore {
  localKeys = false;

  constructor({ getCollection = async () => {
    const connection = await mongoose.connection.asPromise();
    return connection.db.collection(RATE_LIMIT_COLLECTION);
  } } = {}) {
    this.collectionFactory = getCollection;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async getCollection() {
    if (!this.collectionPromise) {
      this.collectionPromise = this.collectionFactory().then(async (collection) => {
        await collection.createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, name: "rate_limit_expiry" },
        );
        return collection;
      }).catch((error) => {
        this.collectionPromise = null;
        throw error;
      });
    }

    return this.collectionPromise;
  }

  async increment(key) {
    const collection = await this.getCollection();
    const now = new Date();
    const nextResetTime = new Date(now.getTime() + this.windowMs);
    const result = await collection.findOneAndUpdate(
      { _id: key },
      [{
        $set: {
          totalHits: {
            $cond: [
              { $gt: ["$resetTime", now] },
              { $add: [{ $ifNull: ["$totalHits", 0] }, 1] },
              1,
            ],
          },
          resetTime: {
            $cond: [
              { $gt: ["$resetTime", now] },
              "$resetTime",
              nextResetTime,
            ],
          },
          expiresAt: {
            $cond: [
              { $gt: ["$resetTime", now] },
              "$expiresAt",
              nextResetTime,
            ],
          },
        },
      }],
      { upsert: true, returnDocument: "after" },
    );
    const record = result?.value || result;
    return {
      totalHits: record.totalHits,
      resetTime: record.resetTime,
    };
  }

  async decrement(key) {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: key, resetTime: { $gt: new Date() }, totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } },
    );
  }

  async resetKey(key) {
    const collection = await this.getCollection();
    await collection.deleteOne({ _id: key });
  }

  async resetAll() {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }
}

export const createApiRateLimiter = ({
  prefix,
  limit,
  windowMs,
  identity = "ip",
  skipSuccessfulRequests = false,
  store = new MongoRateLimitStore(),
}) => rateLimit({
  windowMs,
  limit,
  store,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests,
  keyGenerator(request) {
    const identityValue = identity === "user"
      ? request.user?._id?.toString()
      : ipKeyGenerator(request.ip);

    if (!identityValue) {
      throw new Error(`Missing ${identity} for ${prefix} rate limit`);
    }

    const key = `${prefix}:${identityValue}`;
    return RATE_LIMIT_KEY_SECRET
      ? createHmac("sha256", RATE_LIMIT_KEY_SECRET).update(key).digest("hex")
      : key;
  },
  handler(_request, response) {
    response.status(429).json({
      message: "Too many requests. Please try again later.",
    });
  },
});

const minutes = (value) => value * 60 * 1000;

export const registrationRateLimit = createApiRateLimiter({
  prefix: "registration",
  limit: 5,
  windowMs: 60 * minutes(60),
});

export const loginRateLimit = createApiRateLimiter({
  prefix: "login",
  limit: 10,
  windowMs: minutes(15),
  skipSuccessfulRequests: true,
});

export const passwordResetRequestRateLimit = createApiRateLimiter({
  prefix: "password-reset-request",
  limit: 5,
  windowMs: minutes(15),
});

export const passwordResetConfirmRateLimit = createApiRateLimiter({
  prefix: "password-reset-confirm",
  limit: 10,
  windowMs: minutes(15),
});

export const googleAuthRateLimit = createApiRateLimiter({
  prefix: "google-auth",
  limit: 20,
  windowMs: minutes(15),
});

export const securityCodeRateLimit = createApiRateLimiter({
  prefix: "security-code",
  limit: 5,
  windowMs: minutes(15),
  identity: "user",
});

export const securityConfirmRateLimit = createApiRateLimiter({
  prefix: "security-confirm",
  limit: 10,
  windowMs: minutes(15),
  identity: "user",
});

export const passwordChangeRateLimit = createApiRateLimiter({
  prefix: "password-change",
  limit: 5,
  windowMs: 60 * minutes(60),
  identity: "user",
});

export const searchRateLimit = createApiRateLimiter({
  prefix: "search",
  limit: 90,
  windowMs: minutes(1),
  identity: "user",
});

export const userSearchRateLimit = createApiRateLimiter({
  prefix: "user-search",
  limit: 90,
  windowMs: minutes(1),
  identity: "user",
});

export const uploadRateLimit = createApiRateLimiter({
  prefix: "uploads",
  limit: 30,
  windowMs: 60 * minutes(60),
  identity: "user",
});
