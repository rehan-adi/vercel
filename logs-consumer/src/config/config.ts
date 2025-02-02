import env from 'dotenv';

env.config();

interface Config {
    MONGODB_URI: string;
    DB_NAME: string;
}

export const config: Config = {
    MONGODB_URI: process.env.MONGO_URI as string,
    DB_NAME : process.env.DB_NAME as string,
};