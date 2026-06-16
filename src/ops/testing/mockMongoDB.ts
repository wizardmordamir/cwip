import { mock } from 'bun:test';

/**
 * Decoupled MongoDB mock utility.
 * Targets the official 'mongodb' package to intercept all database calls.
 */
export const mockMongoDB = () => {
  // 1. Define the low-level Collection mocks
  const mockCollection = {
    updateOne: mock().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    insertOne: mock().mockResolvedValue({ acknowledged: true, insertedId: 'mock-id' }),
    findOne: mock().mockResolvedValue(null),
    find: mock().mockReturnValue({
      toArray: mock().mockResolvedValue([]),
      limit: mock().mockReturnThis(),
      sort: mock().mockReturnThis(),
      project: mock().mockReturnThis(),
    }),
    deleteOne: mock().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    deleteMany: mock().mockResolvedValue({ acknowledged: true, deletedCount: 0 }),
    countDocuments: mock().mockResolvedValue(0),
    aggregate: mock().mockReturnValue({
      toArray: mock().mockResolvedValue([]),
    }),
  };

  // 2. Define the Database mock
  const mockDb = {
    collection: mock().mockReturnValue(mockCollection),
    admin: mock().mockReturnThis(),
    command: mock().mockResolvedValue({ ok: 1 }),
  };

  // 3. Define the Client mock
  const mockClient = {
    connect: mock().mockResolvedValue(null),
    db: mock().mockReturnValue(mockDb),
    close: mock().mockResolvedValue(undefined),
    on: mock().mockReturnThis(),
  };

  // 4. Intercept the 'mongodb' package globally within the test runner
  mock.module('mongodb', () => ({
    MongoClient: mock().mockImplementation(() => mockClient),
    // Re-export constants/types if your app uses them
    ObjectId: class {
      toString() {
        return 'mock-object-id';
      }
    },
    ReadPreference: {},
  }));

  return { mockClient, mockDb, mockCollection };
};
