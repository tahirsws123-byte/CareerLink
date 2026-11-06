import mongoose from 'mongoose';

let connectionPromise;

const connectdb = async () => {
    if (!process.env.MONGO_URI?.trim()) {
        throw new Error(
            "MONGO_URI is missing. Add a valid MongoDB connection string to server/.env.",
        );
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (mongoose.connection.readyState !== 2 || !connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_URI)
            .then(({ connection }) => {
                console.log(`MongoDB connected ${connection.name}`);
                return connection;
            })
            .catch((error) => {
                connectionPromise = undefined;
                console.error("MongoDB connection failed");
                console.error(error.message);
                throw error;
            });
    }

    return connectionPromise;
}

export default connectdb

// const connectdb = async () => {
//   try {
//     const connection = await mongoose.connect(process.env.MONGO_URI);

//     console.log("MongoDB database:", connection.connection.name);
//     console.log("MongoDB host:", connection.connection.host);
//   } catch (error) {
//     console.log("MongoDB connection failed");
//     console.log(error.message);
//     process.exit(1);
//   }
// };

// export default connectdb;