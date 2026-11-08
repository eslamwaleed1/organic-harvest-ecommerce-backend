import mongoose, {isValidObjectId} from "mongoose";

export function validateId(id) {
    return isValidObjectId(id)
}

export function constructDatabaseId(id) {
    return new mongoose.Types.ObjectId(id).toString()
}

export async function startDatabaseSession() {
    return await mongoose.startSession();
}

export const requireObjectId = (value, fieldName) => {
    
    if (!isValidObjectId(value)) {
        const error = new Error(`${fieldName} must be a valid ID`);
        error.name = "ValidationError";
        throw error;
    }
};

