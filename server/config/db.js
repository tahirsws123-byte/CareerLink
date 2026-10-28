import mongoose from 'mongoose';

const connectdb = async () => {
    if (!process.env.MONGO_URI?.trim()) {
        throw new Error(
            "MONGO_URI is missing. Add a valid MongoDB connection string to server/.env.",
        );
    }

    try{
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB conncted ${conn.connection.name}`)
    } catch (error){
        console.error("MongoDB connection failed");

        console.error(error.message);

        throw error;
    }
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