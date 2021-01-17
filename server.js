const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
// const connectDB = require('./config/db');

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION...//\\');
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require('./app');

const db = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Mongodb connection successful! ...');
  } catch (err) {
    console.error(err.message);
    //exit process with failure

    process.exit(1);
  }
};

// connected database
connectDB();

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJEXTION...//\\');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
