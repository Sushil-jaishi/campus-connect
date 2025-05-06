import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { User } from "../models/user.model.js";

// Admin user details
const adminUser = {
  username: "admin",
  email: "admin@example.com",
  name: "Administrator",
  password: "admin123",
  role: "Admin"
};

async function seedAdmin() {
  try {
    // Connect to the database
    console.log("Connecting to database...");
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("Database connection successful");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminUser.email },
        { username: adminUser.username }
      ]
    });

    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Role: ${existingAdmin.role}`);
      
      // Update role to Admin if it's not already
      if (existingAdmin.role !== "Admin") {
        existingAdmin.role = "Admin";
        await existingAdmin.save();
        console.log("User role updated to Admin!");
      }
    } else {
      // Create admin user directly - password hashing is handled by the model's pre-save hook
      const newAdmin = await User.create(adminUser);
      
      console.log("Admin user created successfully!");
      console.log(`Email: ${adminUser.email}`);
      console.log(`Username: ${adminUser.username}`);
      console.log(`Password: ${adminUser.password} (please change this after first login)`);
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  } finally {
    // Disconnect from the database
    await mongoose.disconnect();
    console.log("Database connection closed");
    process.exit(0);
  }
}

// Run the seed function
seedAdmin(); 